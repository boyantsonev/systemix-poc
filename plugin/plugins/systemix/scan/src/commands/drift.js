/**
 * drift.js — `systemix drift <sub>`
 *
 * The sacred-timeline substrate: deterministic drift snapshots any instance
 * can accumulate (no LLM — the /drift-report skill remains the deep audit).
 *
 *   systemix drift scan [dir…] [--dirs a,b] [--dry-run] [--json] [--triggered-by ci]
 *   systemix drift history [--last 10] [--json]
 *
 * What a scan counts. Hits are REGEX HITS, not verdicts: `critical` = raw color
 * literals (hex, rgb/hsl/oklch calls), `warnings` = raw px values. They are not
 * cross-referenced against tokens — `systemix audit counters` and the
 * /design-audit skill do the finer classification.
 *
 * A hex literal is `#` + 3, 4, 6 or 8 hex digits, ended by anything but a letter,
 * digit or `-`. An underscore does not count as part of a word here, because in a
 * Tailwind arbitrary value it stands for a space: `shadow-[0_0_#ff0000_inset]`,
 * `border-[1px_solid_#ddd]` and `bg-[linear-gradient(to_right,#fff_0%,#000_100%)]`
 * hold colours. Text of that shape is NOT counted when it is not a colour:
 *   - an HTML entity            `&#123;`  `&#x1F600;`
 *   - glued to a letter/digit   `a#abc`
 *   - an svg/css id reference   `url(#a)`  `url("#a")`  `url( '#a' )`  `url(\"#a\")`
 *   - a fragment link           `href="#top"`  `xlink:href='#icon'`  `href={'#top'}`  `href: "#top"`  `"href": "#top"`
 *   - an issue number           a 3-4 digit decimal right after an issue word:
 *                               `fixes #1234`  `see #123`  `PR #12`  `TODO(#123)`
 *                               (fix/fixes/fixed, close*, resolve*, see, ref/refs, pr,
 *                               pull, issue/issues, bug/bugs, ticket/tickets, todo,
 *                               fixme; any case)
 * It IS still counted although it is not a colour, because a regex cannot tell
 * it from one without parsing the language (known false positives, never silent):
 *   - an issue number with no issue word before it: `#123`, `(#1234)`, and the
 *     second number of `fixes #12, #123`
 *   - an element id that happens to be hex digits, in a selector or a fragment
 *     that is not an href: `#add`  `#bad`  `to="#fade"`  `querySelector('#abc')`
 *   - hex text inside comments and strings (the tally counts literals, not declarations)
 *
 * Which files. The canonical token source is resolved (design/tokens.css →
 * systemix.config.yaml design.source → a css file design/ names canonical → the
 * css file with the most custom properties) and EXEMPTED — a token file is made
 * of the values it defines. Tests, `.d.ts` and generated files are not audited,
 * and neither is a file over 64 MB (not source) or an unreadable one — both are
 * reported under `skipped`, never counted as clean. A folder named build, out,
 * vendor, reference or generated is not walked either; one that holds source files
 * is listed under `skippedDirs` (and warned about), never dropped silently. See lib/design-source.js;
 * `systemix audit counters` uses the same population. (The counters read files
 * through a 5 MB cap of their own; this scanner has none below 64 MB, since one
 * regex pass is linear.)
 *
 * Which folders. Positional arguments and `--dirs` (either `--dirs a,b` or
 * `--dirs=a,b`, repeatable) are unioned; with neither, the default list is
 * scanned. A folder may also be a single file. Folders outside the project root
 * are refused, and a missing folder you named is reported, not ignored.
 *
 * The score. 100 × (1 − (files with a color hit + ½ × files with only px hits)
 * ÷ files audited), rounded half up. It is a clean-file share, so it cannot
 * saturate at 0 the way a per-hit penalty does, and it stays comparable between
 * repos of different size. Snapshots written before this formula carry no
 * `scoreFormula` field; their scores (100 − 2·critical − ½·warnings, floored at
 * 0, or scripts/drift-report.ts's own) are not comparable with the new ones.
 *
 * Snapshot shape matches .systemix/drift-history.json as read by the local
 * app and the POC dashboard: { runAt, triggeredBy, score, critical, warnings,
 * componentsAudited, topOffenders[] } — rolling window of 90 — plus the
 * additive fields { filesWithDrift, scoreFormula, tokenSource, dirs }.
 *
 * Read-only mode. `--dry-run` computes and prints exactly what a scan would, and
 * writes nothing — the audit skills use it. `--json` prints the scan result as
 * the only thing on stdout (warnings and errors go to stderr).
 *
 * Exit code. 0 on success; 1 when nothing could be audited, an argument is
 * wrong (an unknown flag or a stray positional is refused by `history` as well as
 * `scan`), or the snapshot could not be written. A history file that exists but
 * cannot be parsed is never overwritten.
 *
 * Untrusted trees. Every file is read through readBounded() (regular files only,
 * at most the cap; a FIFO or a symlink to /dev/zero is refused, not read), a history
 * file that is a symlink leaving the project is neither shown nor replaced, and a
 * `.systemix` symlink that leaves the project is never written through.
 *
 * Concurrent scans. The history is appended under a lock file
 * (.systemix/drift-history.json.lock, created with O_EXCL, held for milliseconds),
 * so overlapping scans all land. A lock older than 30 s is a dead holder's and is
 * taken over; one held for 10 s makes the scan fail with the file to remove.
 *
 * Dependency-free on purpose: `drift` must run in a checkout where nothing else
 * in the CLI's dependency tree is installed.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { DEFAULT_DIRS, MAX_READ_BYTES, escapesBySymlink, population, readBounded, resolveTokenSource } = require("../lib/design-source");

const MAX_SNAPSHOTS = 90;
const MAX_SCAN_BYTES = 64 * 1024 * 1024;
const TOP_OFFENDERS = 5;
const SCORE_FORMULA = "clean-files/1";
const RESULT_SCHEMA = "systemix.drift-scan/1";
const HISTORY_REL = ".systemix/drift-history.json";
const LOCK_WAIT_MS = 10000;
const LOCK_STALE_MS = 30000;
const LOCK_RETRY_MS = 15;

// critical: raw color literals · warnings: raw px values
// The hex regex is assembled from named parts; what each part excludes is the list in the header.
// Every quantifier in a lookbehind is a single character class, so matching stays linear.
const HEX_DIGITS = "(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})";
// '#' preceded by: an entity's '&' or a letter/digit (NOT '_': it is a space inside a Tailwind arbitrary
// value) · url( with optional space and quote (a backslash-escaped quote too) · href= / href: / "href": with
// optional space, '{' and quote
const NOT_AFTER = "(?<![&A-Za-z0-9]|url\\(\\s*\\\\?[\"']?|href[\"']?\\s*[=:][\\s{]*\\\\?[\"'`]?)";
// an issue word, optional separators, then the '#' just consumed
const ISSUE_WORD = "\\b(?:fix(?:e[sd])?|close[sd]?|resolve[sd]?|see|refs?|pr|pull|issues?|bugs?|tickets?|todo|fixme)[\\s:(]*#";
// '#' + digits is skipped only when BOTH hold: an issue word precedes it and it is a 3-4 digit decimal
// (the lengths a hex can have that an issue number reaches); the case-insensitive flag is for the words
const HEX_RE = new RegExp(`${NOT_AFTER}#(?:(?<!${ISSUE_WORD})|(?!\\d{3,4}(?![A-Za-z0-9-])))${HEX_DIGITS}(?![A-Za-z0-9-])`, "gi");
const COLOR_FN_RE = /\b(?:rgba?|hsla?|oklch)\(/g;
const PX_RE = /\b\d+px\b/g;
// Exported for readers that must agree with the scanner. Global regexes: use them
// with matchAll/replace, not exec/test, or lastIndex leaks between calls.
const PATTERNS = { HEX_RE, COLOR_FN_RE, PX_RE };

const count = (text, re) => {
  let n = 0;
  for (const _ of text.matchAll(re)) n++; // eslint-disable-line no-unused-vars
  return n;
};

/** Colour hits (`c`) and px hits (`w`) in one file's text. */
function countHits(text) {
  return { c: count(text, HEX_RE) + count(text, COLOR_FN_RE), w: count(text, PX_RE) };
}

/**
 * The clean-file score, in integer arithmetic so a .5 never depends on float
 * rounding: round-half-up of 100 × (audited − colourFiles − pxOnlyFiles/2) ÷ audited.
 * @returns {number|null} 0..100, or null when nothing was audited
 */
function cleanFileScore(audited, colourFiles, pxOnlyFiles) {
  if (!audited) return null;
  const dirtyDoubled = 2 * colourFiles + pxOnlyFiles; // doubled so a half file stays an integer
  const scaled = (2 * audited - dirtyDoubled) * 50; // = 100 × (audited − dirtyDoubled / 2)
  const score = Math.floor((2 * scaled + audited) / (2 * audited));
  return Math.max(0, Math.min(100, score));
}

const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const unique = (list) => [...new Set(list)];

const describeLimit = (bytes) => (bytes >= 1024 * 1024 ? `${Math.round(bytes / 1024 / 1024)} MB` : `${bytes} bytes`);

/** One audited file's text, or why it was not read ({skipped}); regular files only, never more than maxBytes. */
function readForScan(abs, maxBytes) {
  const r = readBounded(abs, maxBytes);
  if (r.text !== undefined) return { text: r.text };
  return { skipped: r.skipped === "over" ? `over ${describeLimit(maxBytes)}` : r.skipped === "not-a-file" ? "not a regular file" : "unreadable" };
}

/**
 * Scan the audited population for raw color and px literals.
 * @param {string} root
 * @param {string[]} [dirs] defaults to the standard scan list
 * @param {{maxBytes?: number, readFile?: (abs:string, rel:string) => ({text:string}|{skipped:string})}} [opts]
 *   files larger than maxBytes are skipped (default 64 MB); readFile replaces the scanner's own reader, and
 *   tokenSource / population hand over what the caller has resolved and listed already, so the counters
 *   neither read the files twice nor resolve the token source twice
 * @returns {{score:number|null, scoreFormula:string, critical:number, warnings:number,
 *   componentsAudited:number, filesWithDrift:number, topOffenders:string[],
 *   perFile:{file:string,c:number,w:number}[], tokenSource:string|null, tokenSourceVia:string,
 *   dirs:string[], missingDirs:string[], rejectedDirs:string[], skippedDirs:string[], skipped:{file:string,reason:string}[],
 *   population:{census:number,tests:number,declarations:number,audited:number,scanned:number,tokenSourceInCensus:boolean}}}
 */
function scanProject(root, dirs = DEFAULT_DIRS, { maxBytes = MAX_SCAN_BYTES, readFile = null, tokenSource: resolved = null, population: listed = null } = {}) {
  root = path.resolve(root);
  const wanted = (Array.isArray(dirs) ? dirs : [dirs]).filter((d) => typeof d === "string" && d.trim());
  const scope = wanted.length ? wanted : DEFAULT_DIRS;
  const tokenSource = resolved ?? resolveTokenSource(root, scope);
  const pop = listed ?? population(root, scope, tokenSource);
  let critical = 0;
  let warnings = 0;
  let colorFiles = 0;
  let pxOnlyFiles = 0;
  let scanned = 0;
  const perFile = [];
  const skipped = [];
  for (const { abs, rel } of pop.audited) {
    const read = readFile ? readFile(abs, rel) : readForScan(abs, maxBytes);
    if (read.skipped) {
      skipped.push({ file: rel, reason: read.skipped });
      continue;
    }
    scanned++;
    const { c, w } = countHits(read.text);
    if (c || w) perFile.push({ file: rel, c, w });
    if (c) colorFiles++;
    else if (w) pxOnlyFiles++;
    critical += c;
    warnings += w;
  }
  perFile.sort((a, b) => b.c + b.w - (a.c + a.w) || byString(a.file, b.file));
  return {
    score: cleanFileScore(scanned, colorFiles, pxOnlyFiles),
    scoreFormula: SCORE_FORMULA,
    critical,
    warnings,
    componentsAudited: scanned,
    filesWithDrift: perFile.length,
    topOffenders: perFile.slice(0, TOP_OFFENDERS).map((f) => f.file),
    perFile,
    tokenSource: tokenSource.rel,
    tokenSourceVia: tokenSource.via,
    dirs: unique(pop.dirs),
    missingDirs: unique(pop.missingDirs),
    rejectedDirs: unique(pop.rejectedDirs),
    skippedDirs: pop.skippedDirs,
    skipped,
    population: {
      census: pop.census.length,
      tests: pop.tests.length,
      declarations: pop.declarations.length,
      audited: pop.audited.length,
      scanned,
      tokenSourceInCensus: pop.tokenSourceInCensus,
    },
  };
}

// ── history file ─────────────────────────────────────────────────────────────

function historyPath(root) {
  return path.join(root, ".systemix", "drift-history.json");
}

/**
 * Parse the history file. `problem` is set when the file exists but cannot be
 * trusted (unreadable, not JSON, wrong shape) — a writer must not replace it.
 * A missing or empty file is simply an empty history.
 */
function loadHistory(root) {
  const file = historyPath(root);
  // a history file (or a .systemix folder) that is a symlink leaving the project is not this project's history
  if (escapesBySymlink(root, file)) return { snapshots: [], extra: {}, problem: "is a symlink that resolves outside the project" };
  const read = readBounded(file, MAX_READ_BYTES);
  if (read.text === undefined) {
    if (read.code === "ENOENT") return { snapshots: [], extra: {}, problem: null };
    const why = read.skipped === "over" ? `is over ${MAX_READ_BYTES / 1024 / 1024} MB` : read.skipped === "not-a-file" ? "is not a regular file" : `could not be read (${read.code ?? "error"})`;
    return { snapshots: [], extra: {}, problem: why };
  }
  const text = read.text.replace(/^\uFEFF/, "");
  if (!text.trim()) return { snapshots: [], extra: {}, problem: null };
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return { snapshots: [], extra: {}, problem: "is not valid JSON" };
  }
  if (Array.isArray(raw)) return { snapshots: raw, extra: {}, problem: null };
  if (raw && typeof raw === "object") {
    const { snapshots = [], ...extra } = raw;
    if (Array.isArray(snapshots)) return { snapshots, extra, problem: null };
    return { snapshots: [], extra: {}, problem: "has a `snapshots` field that is not a list" };
  }
  return { snapshots: [], extra: {}, problem: "is not a snapshot list" };
}

/** Snapshots in .systemix/drift-history.json (a bare list and `{snapshots}` are both read). */
function readHistory(root) {
  return { snapshots: loadHistory(root).snapshots };
}

const sleepMs = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Remove a lock whose holder died (older than LOCK_STALE_MS). True when it was removed. */
function removeIfStale(lock) {
  try {
    if (Date.now() - fs.statSync(lock).mtimeMs <= LOCK_STALE_MS) return false;
    fs.rmSync(lock, { force: true });
    return true;
  } catch {
    return false; // released meanwhile, or not ours to remove: the caller waits and retries
  }
}

/**
 * Run `fn` holding an exclusive lock file next to the history file, so two scans
 * that overlap (CI jobs, a watcher and a human) append one after the other instead
 * of both reading the same list and the second write dropping the first snapshot.
 * The lock is created with O_EXCL and held for milliseconds. A lock older than
 * LOCK_STALE_MS belongs to a process that died and is taken over; a lock that stays
 * for LOCK_WAIT_MS throws, naming the file to remove.
 */
function withHistoryLock(file, fn) {
  const lock = `${file}.lock`;
  const started = Date.now();
  let fd;
  for (;;) {
    try {
      fd = fs.openSync(lock, "wx");
      break;
    } catch (e) {
      if (!e || e.code !== "EEXIST") throw e;
    }
    if (Date.now() - started > LOCK_WAIT_MS) {
      throw new Error(`${HISTORY_REL} is locked by another drift scan (${path.basename(lock)}) — remove that file if no scan is running`);
    }
    if (!removeIfStale(lock)) sleepMs(LOCK_RETRY_MS);
  }
  try {
    return fn();
  } finally {
    try { fs.closeSync(fd); } catch { /* nothing to close */ }
    try { fs.rmSync(lock, { force: true }); } catch { /* best effort */ }
  }
}

/**
 * Append a snapshot (rolling window of 90). Throws instead of overwriting a
 * history file it cannot parse. Written atomically, under a lock so overlapping
 * scans all land; other top-level keys of an object-shaped file are kept.
 * @returns {number} snapshots in the file afterwards
 */
function appendSnapshot(root, snapshot) {
  const file = historyPath(root);
  const dir = path.dirname(file);
  // never write through a .systemix symlink that leaves the project (a hostile repo could aim it at any folder)
  let st = null;
  try { st = fs.lstatSync(dir); } catch { /* not there yet */ }
  if (st && st.isSymbolicLink() && (escapesBySymlink(root, dir) || !fs.existsSync(dir))) {
    throw new Error(".systemix is a symbolic link that leaves the project (or points nowhere) — not writing the history through it; remove the link");
  }
  fs.mkdirSync(dir, { recursive: true });
  return withHistoryLock(file, () => {
    const loaded = loadHistory(root);
    if (loaded.problem) throw new Error(`${HISTORY_REL} ${loaded.problem} — not overwriting it; fix or remove the file`);
    const snapshots = [...loaded.snapshots, snapshot];
    const kept = snapshots.length > MAX_SNAPSHOTS ? snapshots.slice(-MAX_SNAPSHOTS) : snapshots;
    const tmp = `${file}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(tmp, JSON.stringify({ ...loaded.extra, snapshots: kept }, null, 2) + "\n", { flag: "wx" });
      fs.renameSync(tmp, file);
    } catch (e) {
      try { fs.rmSync(tmp, { force: true }); } catch { /* best effort */ }
      throw e;
    }
    return kept.length;
  });
}

// ── arguments ────────────────────────────────────────────────────────────────

/**
 * Split arguments into flags and positionals. A value flag takes `--flag value`
 * or `--flag=value`; the value may not itself start with `--`. Everything after a
 * bare `--` is positional. Single-dash arguments other than -h are unknown flags.
 */
function parseFlags(args, { valueFlags = [], boolFlags = [] }) {
  const out = { values: {}, bools: new Set(), positional: [], unknown: [], errors: [], help: false };
  const takesValue = new Set(valueFlags);
  const isBool = new Set(boolFlags);
  for (let i = 0; i < args.length; i++) {
    const a = String(args[i]);
    if (a === "--") {
      out.positional.push(...args.slice(i + 1).map(String));
      break;
    }
    if (a === "-h" || a === "--help") {
      out.help = true;
      continue;
    }
    if (!a.startsWith("-") || a === "-") {
      out.positional.push(a);
      continue;
    }
    const eq = a.startsWith("--") ? a.indexOf("=") : -1;
    const name = eq === -1 ? a : a.slice(0, eq);
    if (takesValue.has(name)) {
      let value = eq === -1 ? undefined : a.slice(eq + 1);
      if (value === undefined && i + 1 < args.length && !String(args[i + 1]).startsWith("--")) value = String(args[++i]);
      if (value === undefined || !value.trim()) out.errors.push(`${name} needs a value`);
      else (out.values[name] ??= []).push(value.trim());
    } else if (isBool.has(name)) {
      if (eq !== -1) out.errors.push(`${name} does not take a value`);
      else out.bools.add(name);
    } else {
      out.unknown.push(a);
    }
  }
  return out;
}

const splitList = (values) => values.flatMap((v) => v.split(",")).map((s) => s.trim()).filter(Boolean);

const USAGE = [
  "",
  "  Usage: npx @getsystemix/cli drift scan [dir…] [--dirs src,app] [--dry-run] [--json] [--triggered-by ci]",
  "         npx @getsystemix/cli drift history [--last 10] [--json]",
  "",
  "    scan      count raw color literals (critical) and raw px values (warnings) in the audited",
  "              files and append a snapshot to .systemix/drift-history.json",
  "      dir…               folders or files to scan, relative to the project root",
  `                         (default: ${DEFAULT_DIRS.join(" ")})`,
  "      --dirs a,b         the same, comma-separated; may be repeated",
  "      --dry-run          compute and print, write no snapshot",
  "      --json             print the scan result as JSON, and nothing else on stdout",
  "      --triggered-by x   label stored on the snapshot (default: cli)",
  "    history   print the most recent snapshots (--last N, --json)",
  "",
].join("\n");

function fail(message) {
  console.error(`\n  ✗  ${message}`);
  process.exitCode = 1;
}

// ── scan ─────────────────────────────────────────────────────────────────────

function whyNothing(result, requested) {
  const p = result.population;
  if (!result.dirs.length) {
    return `none of the folders exist inside this project: ${requested.join(", ")}`;
  }
  if (!p.census) return `no source files (ts, tsx, js, jsx, css, vue, svelte) under: ${result.dirs.join(", ")}`;
  const parts = [];
  if (p.tests) parts.push(`${p.tests} test${p.tests === 1 ? "" : "s"}`);
  if (p.declarations) parts.push(`${p.declarations} .d.ts`);
  if (p.tokenSourceInCensus) parts.push("the token source");
  if (result.skipped.length) parts.push(`${result.skipped.length} skipped (too large or unreadable)`);
  return `${p.census} source file${p.census === 1 ? "" : "s"} under ${result.dirs.join(", ")}, all excluded (${parts.join(", ") || "none audited"})`;
}

function printScan(snapshot, result, { dryRun, total }) {
  const head = dryRun
    ? `drift scan (dry run, no snapshot written)`
    : `drift snapshot #${total}`;
  console.log(`\n  ✓  ${head} — score ${snapshot.score} (${snapshot.critical} critical, ${snapshot.warnings} warnings; ${snapshot.filesWithDrift} of ${snapshot.componentsAudited} files have drift)`);
  console.log(`     scanned: ${snapshot.dirs.join(", ")}`);
  console.log(snapshot.tokenSource
    ? `     token source (exempt): ${snapshot.tokenSource} (via ${result.tokenSourceVia})`
    : "     token source: none found — no file is exempted");
  if (snapshot.topOffenders.length) {
    console.log("     top offenders:");
    for (const f of snapshot.topOffenders) console.log(`       - ${f}`);
  }
  if (!dryRun) console.log("     view the timeline: npx @getsystemix/cli app → Timeline");
  console.log();
}

function scanCommand(root, args, opts) {
  const parsed = parseFlags(args, { valueFlags: ["--dirs", "--triggered-by"], boolFlags: ["--dry-run", "--json"] });
  if (parsed.help) {
    console.log(USAGE);
    return null;
  }
  const problems = [...parsed.errors, ...parsed.unknown.map((f) => `unknown flag ${f}`)];
  if (problems.length) {
    for (const p of problems) fail(p);
    console.error("     (drift scan appends to a timeline, so it refuses arguments it does not understand — see --help)\n");
    return null;
  }

  const json = parsed.bools.has("--json");
  const dryRun = parsed.bools.has("--dry-run");
  const triggeredBy = (parsed.values["--triggered-by"] ?? ["cli"]).slice(-1)[0];
  const requested = unique([...splitList(parsed.values["--dirs"] ?? []), ...splitList(parsed.positional)]);
  const explicit = requested.length > 0;
  const result = scanProject(root, explicit ? requested : DEFAULT_DIRS);

  // a folder you named that is not there is worth a warning; the default list mostly is not
  if (explicit) {
    for (const d of result.missingDirs) console.warn(`  !  ${d} not found — skipped`);
    for (const d of result.rejectedDirs) console.warn(`  !  ${d} is outside the project root — skipped`);
  }
  if (result.skippedDirs.length) {
    const shown = result.skippedDirs.slice(0, 3).join(", ");
    console.warn(`  !  ${result.skippedDirs.length} folder${result.skippedDirs.length === 1 ? "" : "s"} skipped by name, not audited (build, out, vendor, reference, generated): ${shown}${result.skippedDirs.length > 3 ? ", …" : ""}`);
  }
  if (result.skipped.length) {
    const shown = result.skipped.slice(0, 3).map((s) => `${s.file} (${s.reason})`).join(", ");
    console.warn(`  !  ${result.skipped.length} file${result.skipped.length === 1 ? "" : "s"} not scanned: ${shown}${result.skipped.length > 3 ? ", …" : ""}`);
  }

  // --json: the scan facts plus how the run ended, as the only thing on stdout
  const emit = ({ ok, error, snapshot = null, snapshotNumber = null }) => {
    if (!json) return;
    const head = { schema: RESULT_SCHEMA, ok, ...(error ? { error } : {}), dryRun, snapshotWritten: snapshotNumber !== null, snapshotNumber };
    console.log(JSON.stringify({ ...head, ...result, snapshot }, null, 2));
  };

  if (result.componentsAudited === 0) {
    const error = `nothing to audit — ${whyNothing(result, explicit ? requested : DEFAULT_DIRS)}`;
    fail(error);
    console.error("     pass the folders that hold your UI: drift scan src  (or --dirs src,app)\n");
    emit({ ok: false, error });
    return null;
  }

  const snapshot = {
    runAt: (opts.now instanceof Date ? opts.now : new Date()).toISOString(),
    triggeredBy,
    score: result.score,
    critical: result.critical,
    warnings: result.warnings,
    componentsAudited: result.componentsAudited,
    topOffenders: result.topOffenders,
    filesWithDrift: result.filesWithDrift,
    scoreFormula: SCORE_FORMULA,
    tokenSource: result.tokenSource,
    dirs: result.dirs,
  };

  let total = null;
  if (!dryRun) {
    try {
      total = appendSnapshot(root, snapshot);
    } catch (e) {
      fail(e.message);
      console.error();
      emit({ ok: false, error: e.message });
      return null;
    }
  }

  if (json) emit({ ok: true, snapshot: dryRun ? null : snapshot, snapshotNumber: total });
  else printScan(snapshot, result, { dryRun, total });
  return snapshot;
}

// ── history ──────────────────────────────────────────────────────────────────

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
// a hand-edited or older snapshot may lack a field or hold the wrong type: show "-", never "undefined" or "[object Object]"
const text = (v) => (typeof v === "string" && v.trim() ? v : "-");
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? String(v) : "-");

function historyCommand(root, args) {
  const parsed = parseFlags(args, { valueFlags: ["--last"], boolFlags: ["--json"] });
  if (parsed.help) {
    console.log(USAGE);
    return null;
  }
  let last = 10;
  const lastValue = (parsed.values["--last"] ?? []).slice(-1)[0];
  if (lastValue !== undefined) {
    if (!/^\d+$/.test(lastValue) || Number(lastValue) < 1) parsed.errors.push(`--last needs a positive whole number, got "${lastValue}"`);
    else last = Number(lastValue);
  }
  // a typo such as `--lst 3` must not quietly show the default window
  const problems = [
    ...parsed.errors,
    ...parsed.unknown.map((f) => `unknown flag ${f}`),
    ...parsed.positional.map((p) => `unexpected argument ${p} (drift history takes only --last N and --json)`),
  ];
  if (problems.length) {
    for (const p of problems) fail(p);
    console.error("     (see --help)\n");
    return null;
  }

  const json = parsed.bools.has("--json");
  const loaded = loadHistory(root);
  if (loaded.problem) console.warn(`  !  ${HISTORY_REL} ${loaded.problem} — showing nothing from it`);
  const snapshots = loaded.snapshots.filter(isObject);
  const shown = snapshots.slice(-last);

  if (json) {
    console.log(JSON.stringify(shown, null, 2));
    return shown;
  }
  if (!snapshots.length) {
    console.log("\n  -  no drift history yet — run: npx @getsystemix/cli drift scan\n");
    return [];
  }

  // scores from different formulas share one timeline; mark the ones that predate clean-files/1
  const mixed = shown.some((s) => s.scoreFormula) && shown.some((s) => !s.scoreFormula);
  console.log();
  for (const s of shown) {
    console.log(`  ${text(s.runAt)}  score ${num(s.score).padStart(3)}  critical ${num(s.critical)}  warnings ${num(s.warnings)}  (${text(s.triggeredBy)})${mixed && !s.scoreFormula ? " *" : ""}`);
  }
  if (mixed) console.log("\n  * no scoreFormula: written before the clean-files score, so not comparable with the others");
  console.log();
  return shown;
}

async function drift(args = [], opts = {}) {
  const root = path.resolve(opts.projectRoot ?? process.cwd());
  const sub = args[0];

  if (sub === "scan") return scanCommand(root, args.slice(1), opts);
  if (sub === "history") return historyCommand(root, args.slice(1));

  if (sub !== undefined && !["help", "--help", "-h"].includes(sub)) {
    fail(`unknown drift subcommand: ${sub}`);
  }
  console.log(USAGE);
  return null;
}

module.exports = {
  drift,
  scanProject,
  appendSnapshot,
  readHistory,
  countHits,
  cleanFileScore,
  parseFlags,
  splitList,
  PATTERNS,
  SCORE_FORMULA,
};
