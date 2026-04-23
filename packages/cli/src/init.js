const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const {
  detectClients,
  registerServer,
} = require("./installers/mcp-server-registrar");

const SKILLS_DIR = path.join(os.homedir(), ".claude", "skills");
const USER_CONFIG_PATH = path.join(os.homedir(), ".systemix", "config.json");
const CLAUDE_JSON_PATH = path.join(os.homedir(), ".claude.json");

// The 15 skills from the figma-to-code pipeline
const ALL_SKILLS = [
  "figma",
  "tokens",
  "component",
  "storybook",
  "deploy",
  "sync-to-figma",
  "figma-push",
  "figma-inspect",
  "sync",
  "design-to-code",
  "drift-report",
  "apply-theme",
  "connect",
  "check-parity",
  "deploy-annotate",
];

const GITIGNORE_ENTRIES = [
  ".systemix/handoffs/",
  ".systemix/cache/",
  ".systemix/runs/",
];

// Storage tier options
const STORAGE_TIERS = [
  { key: "1", label: "Local files", value: "local" },
  { key: "2", label: "Git-tracked", value: "git-tracked" },
  { key: "3", label: "Supabase", value: "supabase" },
];

function createPrompt() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (question) =>
    new Promise((resolve) => rl.question(question, resolve));

  const close = () => rl.close();

  return { ask, close };
}

/**
 * Extract the Figma file key from a URL or bare key.
 * Handles:
 *   https://www.figma.com/design/<fileKey>/...
 *   https://www.figma.com/file/<fileKey>/...
 *   bare key (no slashes, no "figma.com")
 */
function extractFileKey(input) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Bare key — no slashes
  if (!trimmed.includes("/")) return trimmed;

  // URL patterns
  const match = trimmed.match(
    /figma\.com\/(?:design|file|proto|board)\/([A-Za-z0-9_-]+)/
  );
  if (match) return match[1];

  return null;
}

/**
 * Check whether Official Figma MCP and figma-console-mcp are present in ~/.claude.json.
 * Returns { figmaMcp: bool, figmaConsoleMcp: bool }
 */
function detectMcpConfig() {
  const result = { figmaMcp: false, figmaConsoleMcp: false };

  if (!fs.existsSync(CLAUDE_JSON_PATH)) return result;

  let config;
  try {
    config = JSON.parse(fs.readFileSync(CLAUDE_JSON_PATH, "utf8"));
  } catch {
    return result;
  }

  // Collect all MCP server keys from every possible location in ~/.claude.json
  const mcpKeys = [];

  // Top-level mcpServers
  if (config.mcpServers && typeof config.mcpServers === "object") {
    mcpKeys.push(...Object.keys(config.mcpServers));
  }

  // Nested under projects / globalShortcuts / etc.
  // claude.json can have { projects: { <path>: { mcpServers: {...} } } }
  if (config.projects && typeof config.projects === "object") {
    for (const proj of Object.values(config.projects)) {
      if (proj && proj.mcpServers) {
        mcpKeys.push(...Object.keys(proj.mcpServers));
      }
    }
  }

  const allKeys = mcpKeys.join(" ").toLowerCase();

  // Official Figma MCP — key typically contains "figma" but NOT "console"
  result.figmaMcp = mcpKeys.some(
    (k) =>
      k.toLowerCase().includes("figma") &&
      !k.toLowerCase().includes("console") &&
      !k.toLowerCase().includes("figma-console")
  );

  // figma-console-mcp — key contains "console" or "figma-console"
  result.figmaConsoleMcp = mcpKeys.some(
    (k) =>
      k.toLowerCase().includes("figma-console") ||
      k.toLowerCase().includes("figma_console")
  );

  return result;
}

/**
 * Ensure GITIGNORE_ENTRIES are present in .gitignore.
 * Returns array of entries that were added (empty if all already present).
 */
function ensureGitignore(projectRoot) {
  const gitignorePath = path.join(projectRoot, ".gitignore");

  let existing = "";
  if (fs.existsSync(gitignorePath)) {
    existing = fs.readFileSync(gitignorePath, "utf8");
  }

  const missing = GITIGNORE_ENTRIES.filter((entry) => {
    // Check for the entry as a standalone line (with or without trailing newline)
    return !existing.split("\n").some((line) => line.trim() === entry.trim());
  });

  if (missing.length > 0) {
    const toAppend =
      (existing.endsWith("\n") || existing === "" ? "" : "\n") +
      "# systemix runtime dirs (generated at runtime, not committed)\n" +
      missing.join("\n") +
      "\n";
    fs.appendFileSync(gitignorePath, toAppend, "utf8");
  }

  return missing;
}

/**
 * Install all 15 skills from the bundled figma-to-code pipeline.
 */
function installAllSkills() {
  const pipelinesDir = path.join(__dirname, "..", "pipelines");
  const pipelineDir = path.join(pipelinesDir, "figma-to-code");
  const skillsSource = path.join(pipelineDir, "skills");

  if (!fs.existsSync(skillsSource)) {
    console.log(
      "  ⚠  Skills source not found — skipping install. Run `npx systemix add figma-to-code` manually."
    );
    return;
  }

  fs.mkdirSync(SKILLS_DIR, { recursive: true });

  for (const skill of ALL_SKILLS) {
    const src = path.join(skillsSource, skill);
    const dest = path.join(SKILLS_DIR, skill);

    if (!fs.existsSync(src)) {
      console.log(`  -  ${skill.padEnd(20)} (source missing, skipped)`);
      continue;
    }

    copyDir(src, dest);
    console.log(`  ✓  ${skill.padEnd(20)} → ~/.claude/skills/${skill}/`);
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

async function init() {
  const projectRoot = process.cwd();
  const systemixDir = path.join(projectRoot, ".systemix");
  const { ask, close } = createPrompt();

  console.log("\n  systemix init — interactive setup wizard\n");

  // ── Step 1: Figma file URL ────────────────────────────────────────────────
  let fileKey = null;
  while (!fileKey) {
    const figmaInput = await ask(
      "  (1/6) Figma file URL (or bare file key): "
    );
    fileKey = extractFileKey(figmaInput);
    if (!fileKey) {
      console.log(
        "  ✗  Could not extract a file key. Paste the full Figma URL or the bare key.\n"
      );
    }
  }
  console.log(`  ✓  File key: ${fileKey}\n`);

  // ── Step 2: Storage tier ──────────────────────────────────────────────────
  console.log("  (2/6) Storage tier:");
  STORAGE_TIERS.forEach((t) =>
    console.log(`    (${t.key}) ${t.label}`)
  );
  const tierInput = await ask("  Choice [2]: ");
  const selectedTier =
    STORAGE_TIERS.find((t) => t.key === tierInput.trim()) ||
    STORAGE_TIERS[1]; // default: git-tracked
  console.log(`  ✓  Storage: ${selectedTier.label}\n`);

  // ── Step 3: MCP check ─────────────────────────────────────────────────────
  console.log("  (3/6) Checking MCP configuration in ~/.claude.json ...");
  const mcp = detectMcpConfig();

  if (!mcp.figmaMcp) {
    console.log(
      "  ⚠  Official Figma MCP not detected. Add it in ~/.claude.json under mcpServers.\n" +
        "     See: https://www.npmjs.com/package/@anthropic-ai/figma-mcp"
    );
  } else {
    console.log("  ✓  Official Figma MCP detected");
  }

  if (!mcp.figmaConsoleMcp) {
    console.log(
      "  ⚠  figma-console-mcp not detected. Required for write-back skills (/sync-to-figma, /figma-push).\n" +
        "     See: https://www.npmjs.com/package/figma-console-mcp"
    );
  } else {
    console.log("  ✓  figma-console-mcp detected");
  }

  console.log();

  // ── Step 4: Install skills ────────────────────────────────────────────────
  const installAns = await ask(
    `  (4/6) Install all ${ALL_SKILLS.length} skills to ~/.claude/skills/? [Y/n]: `
  );
  const doInstall =
    installAns.trim() === "" || installAns.trim().toLowerCase() === "y";

  if (doInstall) {
    console.log(`\n  Installing ${ALL_SKILLS.length} skills...\n`);
    installAllSkills();
    console.log();
  } else {
    console.log(
      "  Skipped. Run `npx systemix add figma-to-code` to install later.\n"
    );
  }

  // ── Step 5: .gitignore ────────────────────────────────────────────────────
  console.log("  (5/6) Verifying .gitignore ...");
  const added = ensureGitignore(projectRoot);
  if (added.length === 0) {
    console.log("  ✓  .gitignore already up to date\n");
  } else {
    console.log(`  ✓  Added to .gitignore: ${added.join(", ")}\n`);
  }

  // ── Step 6: Register systemix-mcp ────────────────────────────────────────
  console.log("  (6/6) Registering systemix-mcp server...");
  const clients = detectClients();
  const detectedClients = clients.filter(c => c.exists);

  if (detectedClients.length === 0) {
    console.log("  ⚠  No MCP clients detected. Add the following to your client's mcpServers config manually:\n");
    console.log(
      '     "systemix-mcp": {\n' +
      '       "command": "node",\n' +
      '       "args": ["./packages/mcp-server/dist/index.js", "--project-root", "."]\n' +
      "     }\n"
    );
  } else {
    const updated = [];
    for (const client of detectedClients) {
      registerServer(client.configPath);
      updated.push(client.name);
    }
    if (updated.length > 0) {
      console.log(`  ✓  Updated: ${updated.join(", ")}\n`);
    }
  }

  // ── Write outputs ─────────────────────────────────────────────────────────
  close();

  fs.mkdirSync(systemixDir, { recursive: true });

  // .systemix/project-context.json
  const projectContextPath = path.join(systemixDir, "project-context.json");
  const projectContext = { fileKey };
  fs.writeFileSync(projectContextPath, JSON.stringify(projectContext, null, 2) + "\n", "utf8");

  // .systemix/systemix.json — preserve existing content if present, only update figma block
  const systemixJsonPath = path.join(systemixDir, "systemix.json");
  let systemixJson = {};
  if (fs.existsSync(systemixJsonPath)) {
    try {
      systemixJson = JSON.parse(fs.readFileSync(systemixJsonPath, "utf8"));
    } catch {
      // ignore parse errors — start fresh
    }
  }
  systemixJson.figma = {
    fileKey,
    fileUrl: `https://www.figma.com/design/${fileKey}`,
    modeIds: systemixJson.figma?.modeIds ?? null,
    variableIds: systemixJson.figma?.variableIds ?? null,
  };
  fs.writeFileSync(systemixJsonPath, JSON.stringify(systemixJson, null, 2) + "\n", "utf8");

  // ~/.systemix/config.json — first time only
  const userConfigDir = path.join(os.homedir(), ".systemix");
  if (!fs.existsSync(USER_CONFIG_PATH)) {
    fs.mkdirSync(userConfigDir, { recursive: true });
    const userConfig = {
      storageMode: selectedTier.value,
      defaultBrand: "default",
    };
    fs.writeFileSync(USER_CONFIG_PATH, JSON.stringify(userConfig, null, 2) + "\n", "utf8");
    console.log("  ✓  Created ~/.systemix/config.json");
  } else {
    console.log("  ✓  ~/.systemix/config.json already exists — skipped");
  }

  console.log("  ✓  Wrote .systemix/project-context.json");
  console.log("  ✓  Wrote .systemix/systemix.json");

  console.log(
    '\n  All done. Run `npx systemix doctor` to verify your setup.\n'
  );
}

module.exports = { init };
