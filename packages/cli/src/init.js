"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const {
  detectClients,
  registerServer,
} = require("./installers/mcp-server-registrar");

const PIPELINES_DIR  = path.join(__dirname, "..", "pipelines");
const SKILLS_DIR     = path.join(os.homedir(), ".claude", "skills");
const USER_CONFIG    = path.join(os.homedir(), ".systemix", "config.json");

const GITIGNORE_ENTRIES = [
  ".systemix/handoffs/",
  ".systemix/cache/",
  ".systemix/runs/",
];

// ── helpers ───────────────────────────────────────────────────────────────────

function createPrompt() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((res) => rl.question(q, res));
  const close = () => rl.close();
  return { ask, close };
}

function extractFileKey(input) {
  const s = input.trim();
  if (!s) return null;
  if (!s.includes("/")) return s;
  const m = s.match(/figma\.com\/(?:design|file|proto|board)\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

function ensureGitignore(projectRoot) {
  const p = path.join(projectRoot, ".gitignore");
  let text = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  const missing = GITIGNORE_ENTRIES.filter(
    (e) => !text.split("\n").some((l) => l.trim() === e.trim())
  );
  if (missing.length === 0) return;
  if (text.length && !text.endsWith("\n")) text += "\n";
  text += "# systemix runtime dirs\n" + missing.join("\n") + "\n";
  fs.writeFileSync(p, text, "utf8");
}

function installPipeline(name) {
  const dir = path.join(PIPELINES_DIR, name);
  if (!fs.existsSync(dir)) {
    console.log(`  ⚠  Pipeline "${name}" not found — skipping.`);
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const skillsSrc = path.join(dir, "skills");
  fs.mkdirSync(SKILLS_DIR, { recursive: true });
  for (const skill of manifest.skills) {
    const src  = path.join(skillsSrc, skill);
    const dest = path.join(SKILLS_DIR, skill);
    if (!fs.existsSync(src)) { console.log(`  -  ${skill.padEnd(20)} (missing, skipped)`); continue; }
    copyDir(src, dest);
    console.log(`  ✓  ${skill.padEnd(20)} → ~/.claude/skills/${skill}/`);
  }
}

function scaffoldContracts(projectRoot, includeHypothesisExample) {
  const dirs = ["contract/tokens", "contract/components", "contract/hypotheses"];
  for (const d of dirs) {
    fs.mkdirSync(path.join(projectRoot, d), { recursive: true });
    console.log(`  ✓  ${d}/`);
  }

  if (includeHypothesisExample) {
    const examplePath = path.join(projectRoot, "contract", "hypotheses", "example-hypothesis.mdx");
    if (!fs.existsSync(examplePath)) {
      const today = new Date().toISOString().slice(0, 10);
      const content = [
        "---",
        "type: hypothesis",
        `id: "example-hypothesis"`,
        `section: "onboarding"`,
        `hypothesis: "Replace this with your experiment hypothesis"`,
        "icp: null",
        "status: running",
        `created: "${today}"`,
        "variants:",
        `  control: "Current experience"`,
        `  treatment: "Proposed change"`,
        "result: null",
        "decision: null",
        "confidence: null",
        "evidence-posthog: null",
        "---",
        "",
        "Add your experiment rationale here. What change are you testing,",
        "who are you testing it with, and what metric will tell you it worked?",
        "",
      ].join("\n");
      fs.writeFileSync(examplePath, content, "utf8");
      console.log("  ✓  contract/hypotheses/example-hypothesis.mdx (starter)");
    }
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function init() {
  const projectRoot = process.cwd();
  const systemixDir = path.join(projectRoot, ".systemix");
  const { ask, close } = createPrompt();

  console.log("\n  systemix init — 2-minute setup\n");

  // ── Step 1: Workflow selection ────────────────────────────────────────────
  console.log("  (1/4) Which workflow do you want?\n");
  console.log("    (1) design-system          Figma ↔ code token sync, drift detection, parity");
  console.log("    (2) hypothesis-validation  ship → measure → learn loop (PostHog)");
  console.log("    (3) both                   full setup [default]\n");
  const wfAns = (await ask("  Choice [3]: ")).trim() || "3";
  const doDesign  = wfAns === "1" || wfAns === "3";
  const doHypo    = wfAns === "2" || wfAns === "3";

  console.log();

  // ── Step 2: Figma file URL (design-system only) ───────────────────────────
  let fileKey = null;
  if (doDesign) {
    let raw = "";
    while (!fileKey) {
      raw = await ask("  (2a) Figma file URL or key (or press Enter to skip): ");
      if (!raw.trim()) { console.log("  -  Skipped. Set later in .systemix/project-context.json\n"); break; }
      fileKey = extractFileKey(raw);
      if (!fileKey) console.log("  ✗  Couldn't read a file key — paste the full Figma URL or bare key.\n");
    }
    if (fileKey) console.log(`  ✓  File key: ${fileKey}\n`);
  }

  // ── Step 3: PostHog key (hypothesis-validation only) ─────────────────────
  let posthogKey = null;
  if (doHypo) {
    const phAns = await ask("  (2b) PostHog API key (or press Enter to skip): ");
    posthogKey = phAns.trim() || null;
    if (posthogKey) console.log("  ✓  PostHog key saved\n");
    else            console.log("  -  Skipped. Set POSTHOG_API_KEY env var when you're ready.\n");
  }

  // ── Step 4: Figma access token ────────────────────────────────────────────
  let figmaToken = null;
  if (doDesign) {
    console.log("  (3/4) Figma Personal Access Token — needed for /sync-to-figma and /drift-report");
    console.log("        Get one at figma.com → Account → Security → Personal access tokens");
    const ftAns = await ask("  FIGMA_ACCESS_TOKEN (or press Enter to skip): ");
    figmaToken = ftAns.trim() || null;
    if (figmaToken) console.log("  ✓  Token saved to ~/.systemix/config.json\n");
    else            console.log("  -  Skipped. Set FIGMA_ACCESS_TOKEN env var before using sync skills.\n");
  }

  // ── Step 5: Install skills ────────────────────────────────────────────────
  console.log("  (4/4) Installing skills...\n");
  if (doDesign)  installPipeline("design-system");
  if (doHypo)    installPipeline("hypothesis-validation");
  console.log();

  // ── Contract scaffold ─────────────────────────────────────────────────────
  console.log("  Setting up contract/ directories...\n");
  scaffoldContracts(projectRoot, doHypo);
  console.log();

  // ── Register MCP server ───────────────────────────────────────────────────
  console.log("  Registering systemix-mcp...\n");
  const clients = detectClients().filter((c) => c.exists);
  if (clients.length === 0) {
    console.log("  ⚠  No MCP client config found. Add this to your Claude Code ~/.claude.json manually:\n");
    console.log('     "systemix-mcp": {');
    console.log('       "command": "node",');
    console.log('       "args": ["./packages/mcp-server/dist/index.js", "--project-root", "."]');
    console.log("     }\n");
  } else {
    for (const client of clients) {
      registerServer(client.configPath);
    }
    console.log();
  }

  // ── .gitignore ────────────────────────────────────────────────────────────
  ensureGitignore(projectRoot);
  console.log("  ✓  .gitignore updated");

  // ── Write config files ────────────────────────────────────────────────────
  close();

  fs.mkdirSync(systemixDir, { recursive: true });

  if (fileKey) {
    const ctx = { fileKey };
    fs.writeFileSync(path.join(systemixDir, "project-context.json"), JSON.stringify(ctx, null, 2) + "\n", "utf8");
    let sx = {};
    const sxPath = path.join(systemixDir, "systemix.json");
    if (fs.existsSync(sxPath)) { try { sx = JSON.parse(fs.readFileSync(sxPath, "utf8")); } catch {} }
    sx.figma = { fileKey, fileUrl: `https://www.figma.com/design/${fileKey}`, modeIds: sx.figma?.modeIds ?? null, variableIds: sx.figma?.variableIds ?? null };
    fs.writeFileSync(sxPath, JSON.stringify(sx, null, 2) + "\n", "utf8");
  }

  const userConfigDir = path.join(os.homedir(), ".systemix");
  fs.mkdirSync(userConfigDir, { recursive: true });
  let cfg = {};
  if (fs.existsSync(USER_CONFIG)) { try { cfg = JSON.parse(fs.readFileSync(USER_CONFIG, "utf8")); } catch {} }
  if (figmaToken)  cfg.figmaToken  = figmaToken;
  if (posthogKey)  cfg.posthogKey  = posthogKey;
  fs.writeFileSync(USER_CONFIG, JSON.stringify(cfg, null, 2) + "\n", "utf8");

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log("\n  All done. Restart Claude Code, then:\n");
  if (doDesign) {
    const figmaHint = fileKey
      ? `https://www.figma.com/design/${fileKey}`
      : "[your-figma-url]";
    console.log(`    design-system         /figma ${figmaHint}`);
    console.log(`                          /drift-report`);
  }
  if (doHypo) {
    console.log(`    hypothesis-validation /init-experiment <experiment-id>`);
  }
  console.log(`    watcher (Hermes)      npx systemix watch`);
  console.log(`    dashboard             http://localhost:3001/design-system`);
  console.log();
  console.log("  Run `npx systemix doctor` to verify all dependencies.\n");
}

module.exports = { init };
