/**
 * systemix sync — BAST-76 (--dry-run estimator) + BAST-77 (scope narrowing flags)
 *                 BAST-79 (--schedule flag, F-05)
 *
 * Usage:
 *   npx systemix sync [options]
 *
 * Options:
 *   --dry-run              Estimate token cost without executing (F-01)
 *   --node <name>          Target a single component by name (F-02)
 *   --page <name>          Target a specific Figma page (F-02)
 *   --only <type>          Only sync 'tokens' | 'components' | 'styles' (F-02)
 *   --incremental          Only sync nodes changed since last run (F-02)
 *   --budget <n>           Abort if estimated token cost exceeds N (F-02)
 *   --file <key>           Figma file key (overrides project-context.json)
 *   --schedule <when>      Defer this run to an off-peak window (F-05)
 *   --help                 Show help
 */

"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ── Token estimate baselines (hardcoded; real calibration is BAST-76 estimator.ts) ──
const ESTIMATE = {
  figmaRead: 4200,      // range 4,000–8,000; +500 per 10 bridge tokens
  tokenDiff: 2800,      // range 2,000–4,000
  componentSync: 8100,  // range 5,000–12,000
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse CLI args into an options object.
 * Supports flags like --dry-run, --node button, --only tokens, --budget 10000, etc.
 */
function parseArgs(args) {
  const opts = {
    dryRun: false,
    node: null,
    page: null,
    only: null,       // 'tokens' | 'components' | 'styles'
    incremental: false,
    budget: null,
    file: null,
    schedule: null,   // schedule arg string e.g. "weekly Mon 06:00" | "auto" (F-05)
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case "--dry-run":    opts.dryRun = true; break;
      case "--incremental": opts.incremental = true; break;
      case "--help": case "-h": opts.help = true; break;
      case "--node":
        opts.node = args[++i] || null;
        break;
      case "--page":
        opts.page = args[++i] || null;
        break;
      case "--only":
        opts.only = args[++i] || null;
        break;
      case "--budget":
        opts.budget = parseInt(args[++i], 10) || null;
        break;
      case "--file":
        opts.file = args[++i] || null;
        break;
      case "--schedule":
        opts.schedule = args[++i] || "auto";
        break;
      default:
        // ignore unknown flags silently
        break;
    }
  }

  return opts;
}

/** Format a number with thousands separators: 15100 → "15,100" */
function fmt(n) {
  return n.toLocaleString("en-US");
}

/** Pad a string to a fixed width (left-aligned). */
function pad(str, width) {
  return str.length >= width ? str : str + " ".repeat(width - str.length);
}

/**
 * Parse YAML frontmatter from a SKILL.md string.
 * Returns an object of key→value pairs found between the first two `---` lines.
 */
function parseSkillFrontmatter(content) {
  const lines = content.split("\n");
  if (lines[0].trim() !== "---") return {};

  const endIdx = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (endIdx === -1) return {};

  const fm = {};
  for (let i = 1; i < endIdx; i++) {
    const match = lines[i].match(/^(\w[\w-]*):\s*(.*)/);
    if (match) fm[match[1]] = match[2].trim();
  }
  return fm;
}

/**
 * Scan ~/.claude/skills/ for SKILL.md files and warn about any that are missing
 * a `version` field in their frontmatter.
 */
function checkSkillVersions() {
  const os = require("os");
  const skillsRoot = path.join(os.homedir(), ".claude", "skills");
  if (!fs.existsSync(skillsRoot)) return;

  let dirs;
  try {
    dirs = fs.readdirSync(skillsRoot).filter(d => {
      return fs.statSync(path.join(skillsRoot, d)).isDirectory();
    });
  } catch {
    return;
  }

  for (const dir of dirs) {
    const skillMdPath = path.join(skillsRoot, dir, "SKILL.md");
    if (!fs.existsSync(skillMdPath)) continue;

    let content;
    try {
      content = fs.readFileSync(skillMdPath, "utf8");
    } catch {
      continue;
    }

    const fm = parseSkillFrontmatter(content);
    const name = fm.name || dir;

    if (!fm.version) {
      console.warn(`\u26a0 skill ${name} has no version field \u2014 run npx systemix update to upgrade`);
    }
  }
}

/** Read .systemix/project-context.json and return fileKey (or null). */
function readFileKey(overrideKey) {
  if (overrideKey) return overrideKey;

  const ctxPath = path.join(process.cwd(), ".systemix", "project-context.json");
  if (!fs.existsSync(ctxPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(ctxPath, "utf8"));
    // Support both { fileKey: "..." } and { figma: { fileKey: "..." } }
    return raw.figma?.fileKey || raw.fileKey || null;
  } catch {
    return null;
  }
}

/** Count tokens in bridge.json and return { count, ageHours }. */
function readBridgeInfo() {
  const bridgePath = path.join(process.cwd(), ".systemix", "tokens.bridge.json");
  if (!fs.existsSync(bridgePath)) return { count: 0, ageHours: null };

  try {
    const stat = fs.statSync(bridgePath);
    const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);

    const raw = JSON.parse(fs.readFileSync(bridgePath, "utf8"));

    // Count all leaf token entries across all collections
    let count = 0;
    function countTokens(obj) {
      if (typeof obj !== "object" || obj === null) return;
      for (const val of Object.values(obj)) {
        if (typeof val === "object" && val !== null) {
          // Leaf token has a { value, ... } or { hex, ... } shape
          if ("value" in val || "hex" in val || "rgba" in val) {
            count++;
          } else {
            countTokens(val);
          }
        }
      }
    }
    countTokens(raw);

    return { count, ageHours };
  } catch {
    return { count: 0, ageHours: null };
  }
}

/**
 * Check cache directory and return { exists, fileCount, ageHours }.
 * Cache is "fresh" if youngest file is < 24 h old.
 */
function readCacheInfo() {
  const cacheDir = path.join(process.cwd(), ".systemix", "cache");
  if (!fs.existsSync(cacheDir)) return { exists: false, fileCount: 0, ageHours: null };

  let files = [];
  try {
    files = fs.readdirSync(cacheDir).filter(f => {
      const full = path.join(cacheDir, f);
      return fs.statSync(full).isFile();
    });
  } catch {
    return { exists: true, fileCount: 0, ageHours: null };
  }

  if (files.length === 0) return { exists: true, fileCount: 0, ageHours: null };

  const mtimes = files.map(f => fs.statSync(path.join(cacheDir, f)).mtimeMs);
  const newestMs = Math.max(...mtimes);
  const ageHours = (Date.now() - newestMs) / (1000 * 60 * 60);

  return { exists: true, fileCount: files.length, ageHours };
}

/**
 * Check .systemix/runs/ for existing run files.
 * Returns { hasRuns, lastRunDate } where lastRunDate is a Date or null.
 */
function readRunsInfo() {
  const runsDir = path.join(process.cwd(), ".systemix", "runs");
  if (!fs.existsSync(runsDir)) return { hasRuns: false, lastRunDate: null };

  let files = [];
  try {
    files = fs.readdirSync(runsDir).filter(f => {
      const full = path.join(runsDir, f);
      return fs.statSync(full).isFile();
    });
  } catch {
    return { hasRuns: false, lastRunDate: null };
  }

  if (files.length === 0) return { hasRuns: false, lastRunDate: null };

  const mtimes = files.map(f => fs.statSync(path.join(runsDir, f)).mtimeMs);
  const latestMs = Math.max(...mtimes);
  return { hasRuns: true, lastRunDate: new Date(latestMs) };
}

/** Format a Date as YYYY-MM-DD. */
function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Ask a yes/no question via readline. Returns true for 'y', false otherwise.
 * Times out after timeoutMs and returns false.
 */
function askYesNo(question, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    const timer = setTimeout(() => {
      rl.close();
      console.log("N"); // echo the default
      resolve(false);
    }, timeoutMs);

    rl.question(question, (answer) => {
      clearTimeout(timer);
      rl.close();
      resolve(answer.trim().toLowerCase() === "y");
    });
  });
}

// ── Core logic ────────────────────────────────────────────────────────────────

/**
 * Build the token estimate table based on flags + filesystem state.
 * Returns { lines: string[], total: number, cacheHitPct: number|null }
 */
function buildEstimate(opts, bridgeInfo, cacheInfo) {
  const rows = [];

  // Skill 1 — Figma Read
  // +500 per 10 tokens in bridge.json
  const extraFigmaRead = Math.floor(bridgeInfo.count / 10) * 500;
  const figmaReadEst = ESTIMATE.figmaRead + extraFigmaRead;
  rows.push({ label: "Skill 1 · Figma Read", tokens: figmaReadEst });

  // Skill 2 — Token Diff (always included)
  rows.push({ label: "Skill 2 · Token Diff", tokens: ESTIMATE.tokenDiff });

  // Skill 3 — Component Sync (skip if --only tokens)
  if (opts.only !== "tokens") {
    rows.push({ label: "Skill 3 · Component Sync", tokens: ESTIMATE.componentSync });
  }

  const total = rows.reduce((sum, r) => sum + r.tokens, 0);

  // Cache hit ratio — only show if cache is fresh (<24h)
  let cacheHitPct = null;
  if (cacheInfo.exists && cacheInfo.ageHours !== null && cacheInfo.ageHours < 24) {
    // Heuristic: fileCount / 10 → hit ratio (capped at 99%)
    cacheHitPct = Math.min(99, Math.round(cacheInfo.fileCount / 10 * 100));
  }

  return { rows, total, cacheHitPct };
}

/** Print the dry-run estimate table to stdout. */
function printEstimate(fileKey, rows, total, cacheHitPct, opts) {
  const divider = "────────────────────────────────────";
  const labelWidth = 30;

  console.log(`\nTokenGuard Estimate — ${fileKey || "(no fileKey)"}`);
  console.log(divider);

  for (const row of rows) {
    console.log(`${pad(row.label, labelWidth)}  ~${fmt(row.tokens)} tokens`);
  }

  console.log(divider);
  console.log(`${pad("Total Estimate", labelWidth)}  ~${fmt(total)} tokens`);

  if (cacheHitPct !== null) {
    // Estimate tokens saved: (total / (1 - hitPct/100) - total)
    const savedEst = Math.round(total * (cacheHitPct / (100 - cacheHitPct)));
    console.log(`Cache hit ratio           ${cacheHitPct}%  (saved ~${fmt(savedEst)} tokens)`);
  }

  console.log();
}

/** Print scope summary based on narrowing flags. */
function printScope(opts) {
  const parts = [];
  if (opts.node) parts.push(`node=${opts.node}`);
  if (opts.page) parts.push(`page=${opts.page}`);
  if (opts.only) parts.push(`${opts.only} only`);

  if (parts.length > 0) {
    console.log(`Scope: ${parts.join(", ")}`);
  }
}

/** Print incremental mode status. */
function printIncremental(opts, runsInfo) {
  if (!opts.incremental) return;

  if (runsInfo.hasRuns && runsInfo.lastRunDate) {
    console.log(`Incremental mode: syncing only nodes changed since ${formatDate(runsInfo.lastRunDate)}`);
  } else {
    console.log("First run — full sync scope");
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

const SYNC_HELP = `
  systemix sync — orchestrate the full design<->code sync loop

  Usage:
    npx systemix sync [options]

  Options:
    --dry-run              Estimate token cost without executing (F-01)
    --node <name>          Target a single component by name (F-02)
    --page <name>          Target a specific Figma page (F-02)
    --only <type>          Only sync 'tokens' | 'components' | 'styles' (F-02)
    --incremental          Only sync nodes changed since last run (F-02)
    --budget <n>           Abort if estimated token cost exceeds N (F-02)
    --file <key>           Figma file key (overrides project-context.json)
    --schedule <when>      Defer to an off-peak window (F-05)
    --help                 Show help

  Schedule formats:
    auto                   Next window outside 13:00–19:00 GMT
    "tonight 22:00"        One-time at 22:00 local time tonight
    "tomorrow 03:00"       One-time at 03:00 tomorrow
    "weekly Mon 06:00"     Recurring every Monday at 06:00

  Examples:
    npx systemix sync --dry-run
    npx systemix sync --dry-run --only tokens
    npx systemix sync --node button-primary --page Components
    npx systemix sync --incremental --budget 20000
    npx systemix sync --file h1m7dfFILe1wGSfxwQ6U02 --dry-run
    npx systemix sync --schedule "weekly Mon 06:00" --incremental
    npx systemix sync --schedule auto
`;

async function sync(args = []) {
  const opts = parseArgs(args);

  if (opts.help) {
    console.log(SYNC_HELP);
    return;
  }

  // ── Skill version check — warn if any installed skill is missing a version field ──
  checkSkillVersions();

  // ── --schedule flag (F-05) — defer this run rather than executing now ──────
  if (opts.schedule) {
    const { handleScheduleFlag } = require("./schedule");
    handleScheduleFlag(opts.schedule, args);
    return;
  }

  const fileKey = readFileKey(opts.file);
  const bridgeInfo = readBridgeInfo();
  const cacheInfo = readCacheInfo();
  const runsInfo = readRunsInfo();

  // ── Scope output (always shown when narrowing flags are set) ────────────────
  printScope(opts);

  // ── Incremental mode notice ─────────────────────────────────────────────────
  printIncremental(opts, runsInfo);

  // ── Build estimate (needed for --dry-run AND --budget) ──────────────────────
  const needsEstimate = opts.dryRun || opts.budget !== null;

  if (!needsEstimate) {
    // No dry-run, no budget check — stub message for live execution
    console.log("\nStarting sync... (live execution not yet implemented — run skills manually)");
    return;
  }

  const { rows, total, cacheHitPct } = buildEstimate(opts, bridgeInfo, cacheInfo);

  // ── --budget guard ──────────────────────────────────────────────────────────
  if (opts.budget !== null && total > opts.budget) {
    console.error(
      `\nEstimated cost (~${fmt(total)} tokens) exceeds budget (${fmt(opts.budget)} tokens). Aborting.`
    );
    process.exit(1);
  }

  // ── --dry-run output ────────────────────────────────────────────────────────
  if (opts.dryRun) {
    printEstimate(fileKey, rows, total, cacheHitPct, opts);

    const proceed = await askYesNo("Proceed? [y/N] ");
    if (proceed) {
      console.log("\nStarting sync... (live execution not yet implemented — run skills manually)");
    } else {
      console.log("Aborted.");
    }
    return;
  }

  // Budget passed but no dry-run — proceed
  console.log(`\nBudget check passed (~${fmt(total)} tokens <= ${fmt(opts.budget)} tokens). Starting sync...`);
  console.log("(live execution not yet implemented — run skills manually)");
}

module.exports = { sync };
