"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

const mcpRegistrar = require("./installers/mcp-server-registrar");
const layout = require("./lib/layout");

const PIPELINES_DIR = path.join(__dirname, "..", "pipelines");
const TEMPLATES_DIR = path.join(__dirname, "..", "templates");
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

const CLAUDE_MD_START = "<!-- systemix:start -->";
const CLAUDE_MD_END   = "<!-- systemix:end -->";

// Vendor the loop orchestrator into the repo's root CLAUDE.md (what Claude Code
// auto-loads). Idempotent and non-clobbering: a managed marker block is appended
// once; any existing client CLAUDE.md content is preserved above it.
function ensureClaudeMd(projectRoot) {
  const p = path.join(projectRoot, "CLAUDE.md");
  const body = fs.readFileSync(path.join(TEMPLATES_DIR, "CLAUDE.md"), "utf8").trim();
  const block = `${CLAUDE_MD_START}\n${body}\n${CLAUDE_MD_END}\n`;

  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, block, "utf8");
    console.log("  ✓  CLAUDE.md (Systemix loop orchestrator)");
    return;
  }
  const text = fs.readFileSync(p, "utf8");
  if (text.includes(CLAUDE_MD_START)) {
    console.log("  -  CLAUDE.md — Systemix block present, left as-is");
    return;
  }
  const sep = text.length && !text.endsWith("\n") ? "\n\n" : "\n";
  fs.writeFileSync(p, text + sep + block, "utf8");
  console.log("  ✓  CLAUDE.md — appended Systemix loop block (your content preserved)");
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

function scaffoldExperiments(projectRoot, includeMeta) {
  // Vendor the loop (the core): experiments/<id>.mdx, LEARNINGS.md (the synthesized
  // memory close-experiment writes to), and goals/. General — not design-bound.
  copyDir(path.join(TEMPLATES_DIR, "experiments"), layout.abs(projectRoot).experiments);
  console.log(`  ✓  ${layout.rel.experiments}/  (the loop: <id>.mdx, LEARNINGS.md, goals/)`);

  if (includeMeta) {
    fs.mkdirSync(layout.abs(projectRoot).meta, { recursive: true });
    console.log(`  ✓  ${layout.rel.meta}/  (self-improvement audit)`);
  }
}

function scaffoldDesign(projectRoot) {
  // Vendor the design/ substrate (optional): DESIGN.md, guardrails.mdx, tokens.css.
  copyDir(path.join(TEMPLATES_DIR, "design"), layout.abs(projectRoot).design);
  console.log(`  ✓  ${layout.rel.design}/  (DESIGN.md, guardrails.mdx, tokens.css)`);
}

// Build systemix.config.yaml — the instance topology (committed; no secrets). See ADR-008.
function buildConfigYaml({ surfaces, designSource, signals, autonomy, hermesTier = 0, siMode }) {
  const L = [];
  L.push("# systemix.config.yaml — your instance topology. Committed; contains NO secrets.");
  L.push("# Secrets (Figma/PostHog keys) live in ~/.systemix/config.json or env vars.");
  L.push("# Edit by hand or re-run `npx systemix init` to regenerate.");
  L.push("version: 1");
  L.push("surfaces:");
  for (const s of surfaces) L.push(`  - ${s}`);
  if (surfaces.length === 0) L.push("  []");
  L.push("design:");
  L.push(`  source: ${designSource || "none"}   # 'design' (scaffolded) · a path to an existing DS · 'none' (loop only)`);
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
    L.push(`  meta_contract: ${layout.rel.metaContract}`);
    L.push("  audit_window_days: 90");
  }
  L.push("trust:");
  L.push("  orchestrator_tier: 0   # Ghost Mode at init — never executes autonomously without config");
  L.push("  hermes_tier: 0   # ghost-at-init — every instance starts safe; raising the dial is a queued decision (the covenant)");
  return L.join("\n") + "\n";
}

// ── main ──────────────────────────────────────────────────────────────────────

async function init(opts = {}) {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const systemixDir = path.join(projectRoot, ".systemix");
  const { ask, close } = opts.prompt
    ?? (opts.defaults ? { ask: async () => "", close() {} } : createPrompt());
  const detectClients = opts.detectClients ?? mcpRegistrar.detectClients;
  const registerServer = opts.registerServer ?? mcpRegistrar.registerServer;
  const userConfigPath = path.join(opts.homeDir ?? os.homedir(), ".systemix", "config.json");

  console.log("\n  systemix init — 2-minute setup\n");

  // ── Q1/4: Design system — the loop is always installed; design is optional ──
  console.log("  (1/4) Design system — the validation loop is always set up.\n");
  console.log("        How do you want the (optional) design substrate?\n");
  console.log("    (1) scaffold   a fresh code-first design/ (DESIGN.md, tokens, guardrails) [default]");
  console.log("    (2) existing   point at an existing design system (you'll give a path)");
  console.log("    (3) none       loop only — no design substrate\n");
  const dsAns = (await ask("  Choice [1]: ")).trim() || "1";
  const designMode = { "1": "scaffold", "2": "existing", "3": "none" }[dsAns] || "scaffold";
  const doDesign = designMode !== "none";
  const doHypo   = true;  // the loop is the core — always installed (v6)

  const surfaces = [];
  if (doDesign) surfaces.push("design-system");
  surfaces.push("landing", "onboarding");  // the loop's measured surfaces

  console.log();

  // ── Q2/4: Signals — what can Hermes read? (credentials gathered here) ──────
  console.log("  (2/4) Signals — what can Hermes read?\n");

  let designSource = null;
  if (designMode === "existing") {
    const dsRaw = await ask("  Path to your existing design system (e.g. ../my-ds or packages/ds): ");
    designSource = dsRaw.trim() || null;
    if (designSource) console.log(`  ✓  Design source: ${designSource}`);
    else              console.log("  -  Skipped. Set design.source in systemix.config.yaml before using design skills.");
  } else if (designMode === "scaffold") {
    designSource = layout.rel.design;  // the local scaffolded substrate
  }

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
  {
    // the loop always measures — PostHog is relevant regardless of the design choice
    const phAns = await ask("  PostHog API key (or press Enter to skip): ");
    posthogKey = phAns.trim() || null;
    if (posthogKey) console.log("  ✓  PostHog key saved");
    else            console.log("  -  Skipped. Set POSTHOG_API_KEY env var when you're ready.");
  }

  const signals = {
    posthog: { enabled: true,     poll_interval_sec: 300 },  // the loop always measures
    vercel:  { enabled: true },                   // deploy timing for measurement windows
    figma:   { enabled: doDesign },
    social:  { enabled: false },                  // opt-in later
  };

  console.log();

  // ── Q3/4: Autonomy — one dial, three levels (keyed on the trust tier) ──────
  console.log("  (3/4) Autonomy — how much should the engine do on its own?\n");
  console.log("    (1) ghost        proposes everything → you approve every write [default, safest]");
  console.log("    (2) assisted     writes low-risk changes; proposes the rest");
  console.log("    (3) autonomous   writes most changes; still proposes goals\n");
  const autAns = (await ask("  Choice [1]: ")).trim() || "1";
  const [autonomy, hermesTier] =
    { "1": ["ghost", 0], "2": ["assisted", 1], "3": ["autonomous", 2] }[autAns] || ["ghost", 0];
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
  installPipeline("hypothesis-validation", projectSkillsDir);  // the loop — always
  if (doDesign) installPipeline("design-system", projectSkillsDir);
  console.log();

  // ── Scaffold the loop (always) + the design substrate (when scaffolding) ──
  console.log("  Setting up experiments/ (the loop)...\n");
  scaffoldExperiments(projectRoot, siMode !== "off");
  if (designMode === "scaffold") {
    scaffoldDesign(projectRoot);
  } else if (designMode === "existing") {
    console.log(`  -  design/: using your existing design system${designSource ? ` at ${designSource}` : " (set design.source later)"}`);
  } else {
    console.log("  -  design/: skipped (loop only)");
  }
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

  ensureClaudeMd(projectRoot);

  // ── Write config files ────────────────────────────────────────────────────
  close();

  fs.mkdirSync(systemixDir, { recursive: true });

  // systemix.config.yaml — the instance topology (committed, no secrets). ADR-008.
  const configYamlPath = path.join(projectRoot, "systemix.config.yaml");
  if (fs.existsSync(configYamlPath) && !opts.reconfigure) {
    console.log("  -  systemix.config.yaml exists — left as-is (re-run with --reconfigure to overwrite)");
  } else {
    fs.writeFileSync(configYamlPath, buildConfigYaml({ surfaces, designSource, signals, autonomy, hermesTier, siMode }), "utf8");
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

  const userConfigDir = path.dirname(userConfigPath);
  fs.mkdirSync(userConfigDir, { recursive: true });
  let cfg = {};
  if (fs.existsSync(userConfigPath)) { try { cfg = JSON.parse(fs.readFileSync(userConfigPath, "utf8")); } catch {} }
  if (figmaToken)  cfg.figmaToken  = figmaToken;
  if (posthogKey)  cfg.posthogKey  = posthogKey;
  fs.writeFileSync(userConfigPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");

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
  console.log(`    the loop              experiments/ — LEARNINGS.md is the synthesized memory`);
  if (doDesign) {
    console.log(`    design substrate      ${designMode === "existing" ? (designSource ?? "(set design.source)") : "design/DESIGN.md"}`);
  }
  console.log();
  console.log("  Commit experiments/ + .claude/skills/ + systemix.config.yaml (and design/ if scaffolded) so the instance is reproducible in CI.");
  console.log("  Run `npx systemix doctor` to verify all dependencies.\n");
}

module.exports = { init };
