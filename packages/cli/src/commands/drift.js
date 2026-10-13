/**
 * drift.js — `systemix drift <sub>`
 *
 * The sacred-timeline substrate: deterministic drift snapshots any instance
 * can accumulate (no LLM — the /drift-report skill remains the deep audit).
 *
 *   systemix drift scan [dir…] [--dirs a,b] [--triggered-by ci]   scan + append a snapshot
 *   systemix drift history [--last 10]                            print recent snapshots
 *
 * What a scan counts. Hits are REGEX HITS, not verdicts: `critical` = raw color
 * literals (hex, rgb/hsl/oklch calls), `warnings` = raw px values. They are not
 * cross-referenced against tokens — `systemix audit counters` and the
 * /design-audit skill do the finer classification.
 *
 * Which files. The canonical token source is resolved (design/tokens.css →
 * systemix.config.yaml design.source → a css file design/ names canonical → the
 * css file with the most custom properties) and EXEMPTED — a token file is made
 * of the values it defines. Tests, `.d.ts` and generated files are not audited.
 * See lib/design-source.js; `systemix audit counters` uses the same population.
 *
 * The score. 100 × (1 − (files with a color hit + ½ × files with only px hits)
 * ÷ files audited), rounded. It is a clean-file share, so it cannot saturate at
 * 0 the way a per-hit penalty does, and it stays comparable between repos of
 * different size. Snapshots written before this formula carry no `scoreFormula`
 * field; their scores (100 − 2·critical − ½·warnings, floored at 0) are not
 * comparable with the new ones.
 *
 * Snapshot shape matches .systemix/drift-history.json as read by the local
 * app and the POC dashboard: { runAt, triggeredBy, score, critical, warnings,
 * componentsAudited, topOffenders[] } — rolling window of 90 — plus the
 * additive fields { filesWithDrift, scoreFormula, tokenSource, dirs }.
 *
 * Dependency-free on purpose: `drift` must run in a checkout where nothing else
 * in the CLI's dependency tree is installed.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { DEFAULT_DIRS, population, resolveTokenSource } = require("../lib/design-source");

const MAX_SNAPSHOTS = 90;
const SCORE_FORMULA = "clean-files/1";
const VALUE_FLAGS = new Set(["--dirs", "--triggered-by"]);

// critical: raw color literals · warnings: raw px values
// Hex: 3/4/6/8 digits only, never an HTML entity (&#123;) or an svg id ref (url(#abc)).
const HEX_RE = /(?<![&\w]|url\()#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/g;
const COLOR_FN_RE = /\b(?:rgba?|hsla?|oklch)\(/g;
const PX_RE = /\b\d+px\b/g;

const count = (text, re) => {
  let n = 0;
  for (const _ of text.matchAll(re)) n++; // eslint-disable-line no-unused-vars
  return n;
};

/**
 * Scan the audited population for raw color and px literals.
 * @param {string} root
 * @param {string[]} [dirs] defaults to the standard scan list
 * @returns {{score:number|null, critical:number, warnings:number, componentsAudited:number,
 *   filesWithDrift:number, topOffenders:string[], perFile:{file:string,c:number,w:number}[],
 *   tokenSource:string|null, tokenSourceVia:string, dirs:string[], missingDirs:string[]}}
 */
function scanProject(root, dirs = DEFAULT_DIRS) {
  const tokenSource = resolveTokenSource(root, dirs);
  const pop = population(root, dirs, tokenSource);
  let critical = 0;
  let warnings = 0;
  let colorFiles = 0;
  let pxOnlyFiles = 0;
  const perFile = [];
  for (const { abs, rel } of pop.audited) {
    let text;
    try {
      text = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const c = count(text, HEX_RE) + count(text, COLOR_FN_RE);
    const w = count(text, PX_RE);
    if (c || w) perFile.push({ file: rel, c, w });
    if (c) colorFiles++;
    else if (w) pxOnlyFiles++;
    critical += c;
    warnings += w;
  }
  perFile.sort((a, b) => b.c + b.w - (a.c + a.w) || (a.file < b.file ? -1 : 1));
  const audited = pop.audited.length;
  const score = audited
    ? Math.max(0, Math.min(100, Math.round(100 * (1 - (colorFiles + pxOnlyFiles / 2) / audited))))
    : null;
  return {
    score,
    critical,
    warnings,
    componentsAudited: audited,
    filesWithDrift: perFile.length,
    topOffenders: perFile.slice(0, 5).map((f) => f.file),
    perFile,
    tokenSource: tokenSource.rel,
    tokenSourceVia: tokenSource.via,
    dirs: pop.dirs,
    missingDirs: pop.missingDirs,
  };
}

function historyPath(root) {
  return path.join(root, ".systemix", "drift-history.json");
}

function readHistory(root) {
  try {
    const raw = JSON.parse(fs.readFileSync(historyPath(root), "utf8"));
    return Array.isArray(raw) ? { snapshots: raw } : { snapshots: raw.snapshots ?? [] };
  } catch {
    return { snapshots: [] };
  }
}

function appendSnapshot(root, snapshot) {
  const data = readHistory(root);
  data.snapshots.push(snapshot);
  if (data.snapshots.length > MAX_SNAPSHOTS) data.snapshots = data.snapshots.slice(-MAX_SNAPSHOTS);
  const file = historyPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(tmp, file);
  return data.snapshots.length;
}

function argOf(args, name, fallback) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

/** Split `scan` arguments into flags and positional dirs (`drift scan src lib`). */
function parseScanArgs(args) {
  const positional = [];
  const unknown = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      if (VALUE_FLAGS.has(a)) i++; // its value is not a positional
      else unknown.push(a);
    } else {
      positional.push(...a.split(",").map((s) => s.trim()).filter(Boolean));
    }
  }
  return { positional, unknown };
}

async function drift(args = [], opts = {}) {
  const root = opts.projectRoot ?? process.cwd();
  const sub = args[0];

  if (sub === "scan") {
    const rest = args.slice(1);
    const { positional, unknown } = parseScanArgs(rest);
    for (const flag of unknown) console.warn(`  !  ignoring unknown flag ${flag}`);
    const fromFlag = argOf(rest, "--dirs", "")
      .split(",").map((s) => s.trim()).filter(Boolean);
    const requested = [...new Set([...fromFlag, ...positional])];
    const result = scanProject(root, requested.length ? requested : DEFAULT_DIRS);

    for (const d of result.missingDirs) console.warn(`  !  ${d} not found — skipped`);
    if (result.componentsAudited === 0) {
      console.error(`\n  ✗  nothing to audit — no source files under: ${(requested.length ? requested : DEFAULT_DIRS).join(", ")}`);
      console.error("     pass the folders that hold your UI: drift scan src  (or --dirs src,app)\n");
      process.exitCode = 1;
      return null;
    }

    const { perFile, missingDirs, tokenSourceVia, ...scan } = result; // eslint-disable-line no-unused-vars
    const snapshot = {
      runAt: (opts.now ?? new Date()).toISOString(),
      triggeredBy: argOf(rest, "--triggered-by", "cli"),
      score: scan.score,
      critical: scan.critical,
      warnings: scan.warnings,
      componentsAudited: scan.componentsAudited,
      topOffenders: scan.topOffenders,
      filesWithDrift: scan.filesWithDrift,
      scoreFormula: SCORE_FORMULA,
      tokenSource: scan.tokenSource,
      dirs: scan.dirs,
    };
    const total = appendSnapshot(root, snapshot);
    console.log(`\n  ✓  drift snapshot #${total} — score ${snapshot.score} (${snapshot.critical} critical, ${snapshot.warnings} warnings; ${snapshot.filesWithDrift} of ${snapshot.componentsAudited} files have drift)`);
    console.log(`     scanned: ${snapshot.dirs.join(", ")}`);
    console.log(snapshot.tokenSource
      ? `     token source (exempt): ${snapshot.tokenSource} — ${tokenSourceVia}`
      : "     token source: none found — no file is exempted");
    if (snapshot.topOffenders.length) {
      console.log("     top offenders:");
      for (const f of snapshot.topOffenders) console.log(`       - ${f}`);
    }
    console.log("     view the timeline: npx @getsystemix/cli app → Timeline\n");
    return snapshot;
  }

  if (sub === "history") {
    const last = Number(argOf(args, "--last", 10));
    const { snapshots } = readHistory(root);
    if (!snapshots.length) {
      console.log("\n  -  no drift history yet — run: npx @getsystemix/cli drift scan\n");
      return [];
    }
    console.log();
    for (const s of snapshots.slice(-last)) {
      console.log(`  ${s.runAt}  score ${String(s.score).padStart(3)}  critical ${s.critical}  warnings ${s.warnings}  (${s.triggeredBy})`);
    }
    console.log();
    return snapshots.slice(-last);
  }

  console.log("\n  Usage: npx @getsystemix/cli drift scan [dir…] [--dirs src,app] [--triggered-by ci]");
  console.log("         npx @getsystemix/cli drift history [--last 10]\n");
  return null;
}

module.exports = { drift, scanProject, appendSnapshot, readHistory, SCORE_FORMULA };
