const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const PIPELINES_DIR = path.join(__dirname, "..", "pipelines");
const SKILLS_DIR = path.join(os.homedir(), ".claude", "skills");

const {
  detectClients,
  isRegistered,
  registerProxy,
  previewChanges,
  confirm,
} = require("./installers/mcp-registrar");

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
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

function listAvailable() {
  if (!fs.existsSync(PIPELINES_DIR)) return [];
  return fs.readdirSync(PIPELINES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => {
      const manifest = path.join(PIPELINES_DIR, e.name, "manifest.json");
      const meta = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, "utf8")) : {};
      return { name: e.name, displayName: meta.displayName || e.name, description: meta.description || "", skills: meta.skills || [] };
    });
}

// ── TokenGuard install ────────────────────────────────────────────────────────

/**
 * Ensure a line exists in .gitignore. Appends it if missing.
 * @param {string} gitignorePath
 * @param {string} line
 */
function ensureGitignore(gitignorePath, line) {
  let content = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, "utf8")
    : "";

  if (content.split("\n").some(l => l.trim() === line.trim())) return; // already present

  if (content.length > 0 && !content.endsWith("\n")) content += "\n";
  content += line + "\n";
  fs.writeFileSync(gitignorePath, content, "utf8");
}

/**
 * Install the TokenGuard pipeline:
 *   1. Detect MCP clients
 *   2. Preview changes
 *   3. Confirm
 *   4. Register proxy
 *   5. Init .systemix/cache/ + .systemix/runs/
 *   6. Update .gitignore
 */
async function addTokenGuard() {
  const projectRoot = process.cwd();

  console.log("\nInstalling TokenGuard...\n");

  // 1. Detect clients
  const clients = detectClients();
  if (clients.length === 0) {
    console.log("  ⚠ No MCP clients detected. Skipping proxy registration.\n");
  } else {
    console.log("  Detected MCP clients:\n");
    clients.forEach(c => {
      const found = c.exists ? "config found" : "config not found (will create)";
      console.log(`    ${c.name.padEnd(20)} ${found}`);
    });
    console.log();

    // 2. Preview changes for each client
    const registrable = clients.filter(c => !isRegistered(c.configPath));
    if (registrable.length === 0) {
      console.log("  All clients already have 'figma-optimized' registered.\n");
    } else {
      console.log("  Preview of changes:\n");
      registrable.forEach(c => {
        console.log(`  [${c.name}]`);
        console.log(previewChanges(c.configPath, projectRoot));
        console.log();
      });

      // 3. Confirm
      const ok = await confirm("  Register proxy in all listed clients? [y/N] ");
      if (!ok) {
        console.log("\n  Aborted.\n");
        return;
      }

      // 4. Register
      console.log();
      registrable.forEach(c => registerProxy(c.configPath, projectRoot));
      console.log();
    }
  }

  // 5. Init directories
  const cacheDir = path.join(projectRoot, ".systemix", "cache");
  const runsDir  = path.join(projectRoot, ".systemix", "runs");
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.mkdirSync(runsDir,  { recursive: true });
  console.log("  ✓ Initialised .systemix/cache/");
  console.log("  ✓ Initialised .systemix/runs/");

  // 6. .gitignore
  const gitignorePath = path.join(projectRoot, ".gitignore");
  ensureGitignore(gitignorePath, ".systemix/cache/");
  ensureGitignore(gitignorePath, ".systemix/runs/");
  console.log("  ✓ .gitignore updated (.systemix/cache/ and .systemix/runs/)");

  console.log("\n✓ TokenGuard installed");
  console.log("✓ Run 'systemix token-guard status' to verify\n");
}

// ── Workflow aliases ──────────────────────────────────────────────────────────

const WORKFLOW_ALIASES = {
  'figma':        'figma-to-code',
  'figma-to-code':'figma-to-code',
  'tokens':       'figma-to-code',
  'token-guard':  'token-guard',
  'guard':        'token-guard',
};

// ── Workflow install ──────────────────────────────────────────────────────────

async function add(workflowName) {
  // Resolve alias first
  const resolved = workflowName ? (WORKFLOW_ALIASES[workflowName] || workflowName) : workflowName;

  // Special case: token-guard is not a file-based workflow
  if (resolved === "token-guard") {
    await addTokenGuard();
    return;
  }

  if (!resolved) {
    const available = listAvailable();
    console.log("\nAvailable workflows:\n");
    available.forEach(p => {
      const aliases = Object.entries(WORKFLOW_ALIASES)
        .filter(([alias, target]) => target === p.name && alias !== p.name)
        .map(([alias]) => alias);
      const aliasSuffix = aliases.length ? `  (alias: ${aliases.join(", ")})` : "";
      console.log(`  ${p.name.padEnd(24)} ${p.description}${aliasSuffix}`);
    });
    console.log(`  ${"token-guard".padEnd(24)} MCP proxy auto-register + token cache layer  (alias: guard)`);
    console.log(`\nUsage: npx systemix add <workflow>\n`);
    return;
  }

  const pipelineDir = path.join(PIPELINES_DIR, resolved);
  if (!fs.existsSync(pipelineDir)) {
    console.error(`\n✗ Workflow "${workflowName}" not found.\n`);
    console.log("Run `npx systemix add` to see available workflows.\n");
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(pipelineDir, "manifest.json"), "utf8"));
  const skillsSource = path.join(pipelineDir, "skills");

  console.log(`\nInstalling ${manifest.displayName} (${manifest.skills.length} skills)\n`);

  const conflicts = [];
  for (const skill of manifest.skills) {
    const dest = path.join(SKILLS_DIR, skill);
    if (fs.existsSync(dest)) conflicts.push(skill);
  }

  if (conflicts.length > 0) {
    console.log(`  ⚠ These skills already exist: ${conflicts.join(", ")}`);
    const ans = await prompt("  Overwrite? [y/N] ");
    if (ans.toLowerCase() !== "y") {
      console.log("\nAborted.\n");
      return;
    }
  }

  fs.mkdirSync(SKILLS_DIR, { recursive: true });

  for (const skill of manifest.skills) {
    const src = path.join(skillsSource, skill);
    const dest = path.join(SKILLS_DIR, skill);
    copyDir(src, dest);
    console.log(`  ✓ ${skill.padEnd(16)} → ~/.claude/skills/${skill}/`);
  }

  console.log(`\n✓ Workflow installed. Start Claude Code and run:\n`);
  console.log(`  ${manifest.startWith}\n`);

  if (manifest.requires) {
    console.log("Requires:");
    if (manifest.requires.mcp?.length) console.log(`  MCP: ${manifest.requires.mcp.join(", ")}`);
    if (manifest.requires.tools?.length) console.log(`  Tools: ${manifest.requires.tools.join(", ")}`);
    console.log();
  }
}

module.exports = { add, listAvailable };
