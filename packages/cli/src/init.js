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

// Copy a template tree WITHOUT clobbering: a file that already exists is left
// as-is, so re-running init (even with --reconfigure) never erases the user's
// learnings, goals, tokens, guardrails or edited skills. Returns every template
// file in copy order as { file, kept }.
function copyDir(src, dest, results = []) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, results);
    else if (fs.existsSync(d)) results.push({ file: d, kept: true });
    else { fs.copyFileSync(s, d); results.push({ file: d, kept: false }); }
  }
  return results;
}

// Scaffold a template tree into the repo. A fresh scaffold prints one summary
// line; a re-run reports each file it added and each one it left alone.
function scaffoldTree(projectRoot, src, dest, summary) {
  const results = copyDir(src, dest);
  if (results.every((r) => !r.kept)) {
    console.log(`  ✓  ${summary}`);
    return;
  }
  for (const { file, kept } of results) {
    const rel = path.relative(projectRoot, file);
    console.log(kept ? `  -  ${rel} exists — left as-is` : `  ✓  ${rel}`);
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
  let keptAny = false;
  for (const skill of manifest.skills) {
    const src  = path.join(skillsSrc, skill);
    const dest = path.join(skillsDir, skill);
    if (!fs.existsSync(src)) { console.log(`  -  ${skill.padEnd(20)} (missing, skipped)`); continue; }
    const results = copyDir(src, dest);
    const kept = results.filter((r) => r.kept).length;
    keptAny = keptAny || kept > 0;
    if (kept === 0) console.log(`  ✓  ${skill.padEnd(20)} → .claude/skills/${skill}/`);
    else if (kept === results.length) console.log(`  -  ${skill.padEnd(20)} exists — left as-is`);
    else console.log(`  ✓  ${skill.padEnd(20)} → .claude/skills/${skill}/  (existing files left as-is)`);
  }
  return keptAny;
}

function scaffoldExperiments(projectRoot, includeMeta) {
  // Vendor the loop (the core): experiments/<id>.mdx, LEARNINGS.md (the synthesized
  // memory close-experiment writes to), and goals/. General — not design-bound.
  scaffoldTree(projectRoot, path.join(TEMPLATES_DIR, "experiments"), layout.abs(projectRoot).experiments,
    `${layout.rel.experiments}/  (the loop: <id>.mdx, LEARNINGS.md, goals/)`);

  if (includeMeta) {
    fs.mkdirSync(layout.abs(projectRoot).meta, { recursive: true });
    console.log(`  ✓  ${layout.rel.meta}/  (self-improvement audit)`);
  }
}

// Vendor the engine's weekly generate-stage cron (.github/workflows/). Skips if
// the file already exists — never clobbers a customized workflow.
function scaffoldEngineWorkflow(projectRoot) {
  const dest = path.join(projectRoot, ".github", "workflows", "systemix-engine.yml");
  if (fs.existsSync(dest)) {
    console.log("  -  .github/workflows/systemix-engine.yml exists — left as-is");
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(TEMPLATES_DIR, "github", "systemix-engine.yml"), dest);
  console.log("  ✓  .github/workflows/systemix-engine.yml  (weekly propose-only engine cron)");
}

function scaffoldDesign(projectRoot) {
  // Vendor the design/ substrate (optional): DESIGN.md, guardrails.mdx, tokens.css.
  scaffoldTree(projectRoot, path.join(TEMPLATES_DIR, "design"), layout.abs(projectRoot).design,
    `${layout.rel.design}/  (DESIGN.md, guardrails.mdx, tokens.css)`);
}

// Build systemix.config.yaml — the instance topology (committed; no secrets). See ADR-008.
function buildConfigYaml({ surfaces, designSource, signals, autonomy, hermesTier = 0, siMode, context = null }) {
  const L = [];
  L.push("# systemix.config.yaml — your instance topology. Committed; contains NO secrets.");
  L.push("# Secrets (Figma/PostHog keys) live in ~/.systemix/config.json or env vars.");
  L.push("# Edit by hand or re-run `npx @getsystemix/cli init` to regenerate.");
  L.push("version: 1");
  L.push("surfaces:");
  for (const s of surfaces) L.push(`  - ${s}`);
  if (surfaces.length === 0) L.push("  []");
  L.push("design:");
  L.push(`  source: ${designSource || "none"}   # 'design' (scaffolded) · a path to an existing DS · 'none' (loop only)`);
  L.push("context:");
  L.push("  # why this design system exists — read by the engine (propose) and the local app's Home");
  L.push(`  product: ${context?.product ? JSON.stringify(context.product) : '""   # TODO: what product/service does it serve?'}`);
  L.push(`  icp: ${context?.icp ? JSON.stringify(context.icp) : '""   # TODO: who is it for?'}`);
  if (context?.problems?.length) {
    L.push("  problems:");
    for (const p of context.problems) L.push(`    - ${JSON.stringify(p)}`);
  } else {
    L.push("  problems: []   # e.g. [drift, no-docs, slow-prototyping, agent-chaos, multi-platform]");
  }
  L.push(`  use_case: ${context?.use_case ?? "all"}   # product-ui · marketing · research-prototypes · agent-ui · all`);
  L.push("app:");
  L.push("  preview:");
  L.push('    url: ""   # your dev server for component previews in `npx @getsystemix/cli app` (e.g. http://localhost:3000)');
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
  L.push("  engine: claude-code   # engine = Claude Code (ADR-019); no local model");
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

// ── context → substrate mirrors ───────────────────────────────────────────────

/** Mirror the init context answers into the scaffolded design/DESIGN.md frontmatter. */
function mirrorContextIntoDesign(projectRoot, context) {
  if (!context || (!context.icp && !context.product)) return;
  const designMd = path.join(projectRoot, layout.rel.design, "DESIGN.md");
  if (!fs.existsSync(designMd)) return;
  let md = fs.readFileSync(designMd, "utf8");
  if (context.icp) md = md.replace(/^icp: .*$/m, `icp: ${JSON.stringify(context.icp)}`);
  if (context.product) md = md.replace(/^description: .*$/m, `description: ${JSON.stringify(context.product)}`);
  fs.writeFileSync(designMd, md, "utf8");
}

/** Seed one goal from the top design problem — humans give goals; this just turns their stated pain into the first one. */
function seedGoalFromContext(projectRoot, context) {
  const problem = context?.problems?.[0];
  if (!problem) return;
  const slug = problem.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "design-problem";
  const goalPath = path.join(projectRoot, "experiments", "goals", `fix-${slug}.mdx`);
  if (fs.existsSync(goalPath)) return;
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "---",
    "type: goal",
    `id: fix-${slug}`,
    `title: ${JSON.stringify(`Fix: ${problem}`)}`,
    "order: 1",
    `given: ${context.product ? JSON.stringify(context.product) : "null"}`,
    "goal-type: surface",
    `icp: ${context.icp ? JSON.stringify(context.icp) : "null"}`,
    "status: active",
    "success-criteria: null   # TODO: how will you know this is fixed?",
    "kill-if: null",
    `created: ${today}`,
    "---",
    "",
    `# Fix: ${problem}`,
    "",
    "Seeded from your init context (the top design problem you named). Refine the",
    "success criteria, then let the engine propose experiments against it.",
    "",
  ];
  fs.mkdirSync(path.dirname(goalPath), { recursive: true });
  fs.writeFileSync(goalPath, lines.join("\n"), "utf8");
  console.log(`  ✓  experiments/goals/fix-${slug}.mdx  (seeded from your top design problem)`);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function init(opts = {}) {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const systemixDir = path.join(projectRoot, ".systemix");
  const { ask, close } = opts.prompt
    ?? (opts.defaults ? { ask: async () => "", close() {} } : createPrompt());
  const detectClients = opts.detectClients ?? mcpRegistrar.detectClients;
  const registerServer = opts.registerServer ?? mcpRegistrar.registerServer;
  const globalMcp = opts.globalMcp ?? false;  // repo-scoped by default; opt in to write the global Claude Desktop config
  const forceMcp  = opts.forceMcp  ?? false;  // overwrite an existing systemix-mcp entry pointing at another project
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

  // ── Context — why does this design system exist? ───────────────────────────
  // Captured last so scripted/default runs stay sequence-compatible; every
  // question is skippable. Feeds the engine (propose digest), the local app's
  // Home, and the /document + /init-experiment skills.
  console.log("  Context — why does this design system exist? (Enter skips any question)\n");
  const ctxProduct = ((await ask("  What product/service does it serve? (one line): ")) || "").trim() || null;
  const ctxIcp     = ((await ask("  Who is it for — the ICP? (one line): ")) || "").trim() || null;
  const ctxProblemsRaw = ((await ask("  Design problems today (comma-sep — e.g. drift, no-docs, slow-prototyping, agent-chaos, multi-platform): ")) || "").trim();
  const ctxProblems = ctxProblemsRaw ? ctxProblemsRaw.split(",").map(s => s.trim()).filter(Boolean) : [];
  console.log("\n  What is the design system expected to do?");
  console.log("    (1) ship product UI  (2) marketing surfaces  (3) research prototypes  (4) agent-generated UI  (5) all\n");
  const ucAns = ((await ask("  Choice [5]: ")) || "").trim() || "5";
  const ctxUseCase = { "1": "product-ui", "2": "marketing", "3": "research-prototypes", "4": "agent-ui", "5": "all" }[ucAns] || "all";
  const context = { product: ctxProduct, icp: ctxIcp, problems: ctxProblems, use_case: ctxUseCase };
  if (ctxProduct || ctxIcp || ctxProblems.length) console.log("\n  ✓  Context captured — the engine and the local app read it from systemix.config.yaml");
  else console.log("\n  -  Skipped. Add it under `context:` in systemix.config.yaml (or re-run init --reconfigure) — the engine reasons from it.");
  console.log();

  // ── Install skills (project-scoped) ───────────────────────────────────────
  const projectSkillsDir = projectSkillsDirFor(projectRoot);
  console.log("  Installing skills into .claude/skills/ ...\n");
  let keptSkills = installPipeline("hypothesis-validation", projectSkillsDir);  // the loop — always
  if (doDesign) keptSkills = installPipeline("design-system", projectSkillsDir) || keptSkills;
  // A skill can carry the loop's own edits (skill-update appends Past Decisions),
  // so init never refreshes one — `skills sync` is the explicit, dry-runnable update.
  if (keptSkills) {
    console.log("     Existing skills were left as-is. Preview a refresh with: npx @getsystemix/cli skills sync --dry-run" +
      (doDesign ? " [--pipeline design-system]" : ""));
  }
  console.log();

  // ── Scaffold the loop (always) + the design substrate (when scaffolding) ──
  console.log("  Setting up experiments/ (the loop)...\n");
  scaffoldExperiments(projectRoot, siMode !== "off");
  seedGoalFromContext(projectRoot, context);
  scaffoldEngineWorkflow(projectRoot);
  if (designMode === "scaffold") {
    const freshDesignMd = !fs.existsSync(layout.abs(projectRoot).designFile);
    scaffoldDesign(projectRoot);
    // Mirror context only into a DESIGN.md this run created — an existing one is the user's.
    if (freshDesignMd) mirrorContextIntoDesign(projectRoot, context);
  } else if (designMode === "existing") {
    console.log(`  -  design/: using your existing design system${designSource ? ` at ${designSource}` : " (set design.source later)"}`);
  } else {
    console.log("  -  design/: skipped (loop only)");
  }
  console.log();

  // ── Register MCP server ───────────────────────────────────────────────────
  // Prefer repo-scoped clients. The global Claude Desktop config is opt-in
  // (--global-mcp) so a stray `init` in a scratch dir can't silently repoint an
  // existing global registration.
  console.log("  Registering systemix-mcp...\n");
  const existingClients = detectClients().filter((c) => c.exists);
  const clients = existingClients.filter((c) => globalMcp || c.name !== "Claude Desktop");
  const skippedGlobal = !globalMcp && existingClients.some((c) => c.name === "Claude Desktop");
  if (clients.length === 0) {
    console.log("  ⚠  No MCP client config found. Add this to your Claude Code ~/.claude.json manually:\n");
    console.log('     "systemix-mcp": {');
    console.log('       "command": "node",');
    console.log('       "args": ["./packages/mcp-server/dist/index.js", "--project-root", "."]');
    console.log("     }\n");
  } else {
    for (const client of clients) {
      registerServer(client.configPath, { force: forceMcp, projectRoot });
    }
    console.log();
  }
  if (skippedGlobal) {
    console.log("  -  Claude Desktop (global) left untouched. Register it there with: systemix mcp register --global\n");
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
    fs.writeFileSync(configYamlPath, buildConfigYaml({ surfaces, designSource, signals, autonomy, hermesTier, siMode, context }), "utf8");
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
  console.log(`    local app             npx @getsystemix/cli app   (docs · tokens · experiments · HITL queue)`);
  console.log(`    the loop              experiments/ — LEARNINGS.md is the synthesized memory`);
  if (doDesign) {
    console.log(`    design substrate      ${designMode === "existing" ? (designSource ?? "(set design.source)") : "design/DESIGN.md"}`);
  }
  console.log();
  console.log("  Commit experiments/ + .claude/skills/ + systemix.config.yaml (and design/ if scaffolded) so the instance is reproducible in CI.");
  console.log("  The scheduled engine needs two GitHub repo secrets: POSTHOG_API_KEY +");
  console.log("  POSTHOG_PROJECT_ID (evidence) and ANTHROPIC_API_KEY (the weekly propose");
  console.log("  cron in .github/workflows/systemix-engine.yml) — without them the runs skip gracefully.");
  console.log("  Run `npx @getsystemix/cli doctor` to verify all dependencies.\n");
}

module.exports = { init };
