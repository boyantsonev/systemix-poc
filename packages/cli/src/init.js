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
const USER_CONFIG    = path.join(os.homedir(), ".systemix", "config.json");
// Skills install project-scoped (.claude/skills/ in the client repo), not globally.
// The instance is self-contained and CI-reproducible. See ADR-008.
const projectSkillsDirFor = (root) => path.join(root, ".claude", "skills");

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

function installPipeline(name, skillsDir) {
  const dir = path.join(PIPELINES_DIR, name);
  if (!fs.existsSync(dir)) {
    console.log(`  ⚠  Pipeline "${name}" not found — skipping.`);
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
  const skillsSrc = path.join(dir, "skills");
  fs.mkdirSync(skillsDir, { recursive: true });
  for (const skill of manifest.skills) {
    const src  = path.join(skillsSrc, skill);
    const dest = path.join(skillsDir, skill);
    if (!fs.existsSync(src)) { console.log(`  -  ${skill.padEnd(20)} (missing, skipped)`); continue; }
    copyDir(src, dest);
    console.log(`  ✓  ${skill.padEnd(20)} → .claude/skills/${skill}/`);
  }
}

function scaffoldContracts(projectRoot, includeHypothesisExample, includeMeta) {
  const dirs = ["contract/tokens", "contract/components", "contract/hypotheses"];
  if (includeMeta) dirs.push("contract/meta");
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

// Build systemix.config.yaml — the instance topology (committed; no secrets). See ADR-008.
function buildConfigYaml({ surfaces, signals, autonomy, siMode }) {
  const L = [];
  L.push("# systemix.config.yaml — your instance topology. Committed; contains NO secrets.");
  L.push("# Secrets (Figma/PostHog keys) live in ~/.systemix/config.json or env vars.");
  L.push("# Edit by hand or re-run `npx systemix init` to regenerate.");
  L.push("version: 1");
  L.push("surfaces:");
  for (const s of surfaces) L.push(`  - ${s}`);
  if (surfaces.length === 0) L.push("  []");
  L.push("signals:");
  L.push("  posthog:");
  L.push(`    enabled: ${signals.posthog.enabled}`);
  L.push(`    poll_interval_sec: ${signals.posthog.poll_interval_sec}`);
  L.push("  vercel:");
  L.push(`    enabled: ${signals.vercel.enabled}`);
  L.push("  figma:");
  L.push(`    enabled: ${signals.figma.enabled}`);
  L.push("  social:");
  L.push(`    enabled: ${signals.social.enabled}`);
  L.push("hermes:");
  L.push("  model: hermes3");
  L.push("  endpoint: http://localhost:11434");
  L.push(`  autonomy: ${autonomy}`);
  L.push("  thresholds:");
  L.push("    high: 0.85");
  L.push("    medium: 0.55");
  L.push("self_improvement:");
  L.push(`  mode: ${siMode}`);
  if (siMode !== "off") {
    L.push("  meta_contract: contract/meta/hermes-accuracy.mdx");
    L.push("  audit_window_days: 90");
  }
  L.push("trust:");
  L.push("  orchestrator_tier: 0   # Ghost Mode at init — never executes autonomously without config");
  L.push("  hermes_tier: 0");
  return L.join("\n") + "\n";
}

// ── main ──────────────────────────────────────────────────────────────────────

async function init(opts = {}) {
  const projectRoot = process.cwd();
  const systemixDir = path.join(projectRoot, ".systemix");
  // --defaults answers every prompt with its default ("" → default/skip
  // everywhere) — used by CI and the onboarding acceptance test.
  const { ask, close } = opts.defaults
    ? { ask: async () => "", close() {} }
    : createPrompt();

  console.log("\n  systemix init — 2-minute setup\n");

  // ── Q1/4: Surfaces — what are you validating? ─────────────────────────────
  console.log("  (1/4) Surfaces — what are you validating?\n");
  console.log("    (1) design-system          Figma ↔ code token sync, drift detection, parity");
  console.log("    (2) hypothesis-validation  ship → measure → learn loop (PostHog)");
  console.log("    (3) both                   full setup [default]\n");
  const wfAns = (await ask("  Choice [3]: ")).trim() || "3";
  const doDesign  = wfAns === "1" || wfAns === "3";
  const doHypo    = wfAns === "2" || wfAns === "3";

  const surfaces = [];
  if (doDesign) surfaces.push("design-system");
  if (doHypo)   surfaces.push("landing", "onboarding");

  console.log();

  // ── Q2/4: Signals — what can Hermes read? (credentials gathered here) ──────
  console.log("  (2/4) Signals — what can Hermes read?\n");

  let fileKey = null;
  if (doDesign) {
    let raw = "";
    while (!fileKey) {
      raw = await ask("  Figma file URL or key (or press Enter to skip): ");
      if (!raw.trim()) { console.log("  -  Skipped. Set later in .systemix/project-context.json\n"); break; }
      fileKey = extractFileKey(raw);
      if (!fileKey) console.log("  ✗  Couldn't read a file key — paste the full Figma URL or bare key.\n");
    }
    if (fileKey) console.log(`  ✓  File key: ${fileKey}`);
  }

  let figmaToken = null;
  if (doDesign) {
    console.log("  Figma Personal Access Token — needed for /sync-to-figma and /drift-report");
    console.log("    (figma.com → Account → Security → Personal access tokens)");
    const ftAns = await ask("  FIGMA_ACCESS_TOKEN (or press Enter to skip): ");
    figmaToken = ftAns.trim() || null;
    if (figmaToken) console.log("  ✓  Token saved to ~/.systemix/config.json");
    else            console.log("  -  Skipped. Set FIGMA_ACCESS_TOKEN env var before using sync skills.");
  }

  let posthogKey = null;
  if (doHypo) {
    const phAns = await ask("  PostHog API key (or press Enter to skip): ");
    posthogKey = phAns.trim() || null;
    if (posthogKey) console.log("  ✓  PostHog key saved");
    else            console.log("  -  Skipped. Set POSTHOG_API_KEY env var when you're ready.");
  }

  const signals = {
    posthog: { enabled: doHypo,   poll_interval_sec: 300 },
    vercel:  { enabled: doHypo },                 // deploy timing for measurement windows
    figma:   { enabled: doDesign },
    social:  { enabled: false },                  // opt-in later
  };

  console.log();

  // ── Q3/4: Autonomy — how much does Hermes decide alone? ───────────────────
  console.log("  (3/4) Autonomy — how much should Hermes decide on its own?\n");
  console.log("    (1) conservative  every decision → HITL queue");
  console.log("    (2) balanced      high-confidence writes directly; else queue a card [default]");
  console.log("    (3) progressive   writes unless confidence is low\n");
  const autAns = (await ask("  Choice [2]: ")).trim() || "2";
  const autonomy = { "1": "conservative", "2": "balanced", "3": "progressive" }[autAns] || "balanced";
  console.log();

  // ── Q4/4: Self-improvement — should Systemix tune itself? ──────────────────
  console.log("  (4/4) Self-improvement — should Hermes audit its own accuracy?\n");
  console.log("    (1) off      fixed thresholds, never self-adjusts");
  console.log("    (2) audit    log hit-rate to a meta-contract, change nothing [default]");
  console.log("    (3) tuning   propose threshold changes as HITL cards");
  console.log("    (4) auto     adjust within preset bounds, log every change\n");
  const siAns = (await ask("  Choice [2]: ")).trim() || "2";
  const siMode = { "1": "off", "2": "audit", "3": "tuning", "4": "auto" }[siAns] || "audit";
  console.log();

  // ── Install skills (project-scoped) ───────────────────────────────────────
  const projectSkillsDir = projectSkillsDirFor(projectRoot);
  console.log("  Installing skills into .claude/skills/ ...\n");
  if (doDesign)  installPipeline("design-system", projectSkillsDir);
  if (doHypo)    installPipeline("hypothesis-validation", projectSkillsDir);
  console.log();

  // ── Contract scaffold ─────────────────────────────────────────────────────
  console.log("  Setting up contract/ directories...\n");
  scaffoldContracts(projectRoot, doHypo, siMode !== "off");
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

  // systemix.config.yaml — the instance topology (committed, no secrets). ADR-008.
  const configYamlPath = path.join(projectRoot, "systemix.config.yaml");
  if (fs.existsSync(configYamlPath) && !opts.reconfigure) {
    console.log("  -  systemix.config.yaml exists — left as-is (re-run with --reconfigure to overwrite)");
  } else {
    fs.writeFileSync(configYamlPath, buildConfigYaml({ surfaces, signals, autonomy, siMode }), "utf8");
    console.log(`  ✓  systemix.config.yaml${opts.reconfigure ? " (reconfigured)" : ""}`);
  }

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
  console.log("\n  Instance ready. Skills live in this repo's .claude/skills/ —");
  console.log("  Claude Code picks them up automatically when run from here. Then:\n");
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
  console.log(`    config                systemix.config.yaml (your topology)`);
  console.log(`    watcher (Hermes)      npx systemix watch`);
  console.log(`    home                  http://localhost:3001/config`);
  console.log();
  console.log("  Commit .claude/skills/ + systemix.config.yaml so the instance is reproducible in CI.");
  console.log("  Run `npx systemix doctor` to verify all dependencies.\n");
}

module.exports = { init };
