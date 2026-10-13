"use strict";

/**
 * habit.js — drift-tooling habit: is anything in the repo MEASURING drift, how
 * recently, and is it wired to run? Facts only; whether that is "a habit" is for
 * the reader. Every age is measured to the HEAD commit date (ctx.git.commitDate),
 * never to today, so the same commit always reports the same number.
 *
 * Age rule (pinned): days = (UTC calendar date of HEAD commit) − (UTC calendar
 * date of the event). Calendar days, not 24-hour spans, so 23:59 and 00:01 the
 * next day are 1 day apart. Negative means the event is after HEAD (an
 * uncommitted snapshot). No git history → age is null, not "since today".
 *
 * Case rules (pinned): every `drift` text search is case-INsensitive substring
 * (so Drift, DRIFT and drift-report all hit). Exit-statement searches are
 * case-sensitive code patterns; the exit-zero CLAIM search (prose) is not.
 *
 * Counter ids (API — keep stable):
 *   habit.snapshots.file_exists          .systemix/drift-history.json is present
 *   habit.snapshots.count                snapshot entries (array or {snapshots} shape)
 *   habit.snapshots.distinct_days        distinct UTC days with >= 1 snapshot
 *   habit.snapshots.first_run_at         earliest runAt (UTC ISO)
 *   habit.snapshots.last_run_at          newest runAt (UTC ISO)
 *   habit.snapshots.last_age_days        newest snapshot → HEAD commit date, calendar days
 *   habit.snapshots.last_score|critical|warnings|files_audited   fields of the newest snapshot
 *   habit.snapshots.last_triggered_by    triggeredBy of the newest snapshot
 *   habit.snapshots.last_score_formula   scoreFormula of the newest snapshot (null = pre-formula snapshot)
 *   habit.workflows.files                workflow files (.github/workflows/*.yml|yaml)
 *   habit.workflows.drift_mentions       "drift" matches across workflow files
 *   habit.workflows.files_mentioning_drift
 *   habit.workflows.drift_noncomment_lines   lines with "drift" that are not whole-line # comments
 *   habit.npm_scripts.drift              root package.json scripts whose name or command mentions drift
 *   habit.scripts.drift_files            scripts/*drift* files
 *   habit.drift_script.nonzero_exit_statements   exit statements in those files whose status is not the literal 0 (forms below)
 *   habit.drift_script.exits_nonzero     at least one such statement
 *   habit.drift_script.exit_zero_claims  lines claiming exit 0 / "not a gate"
 *   habit.drift_script.exclude_patterns  entries of an EXCLUDE-named array in those files
 *   habit.drift_script.exclusions_not_named_in_guardrails   of those, not mentioned in design/guardrails.mdx
 *   habit.config.design_keys             leaf keys under `design:` in systemix.config.yaml
 *   habit.config.design_source           design.source value
 *
 * Exit statements recognised (text search, case-sensitive, nothing is run):
 *   process.exit(x), process.exitCode = x, Deno.exit(x), sys.exit(x), os._exit(x),
 *   exit(x) / quit(x), SystemExit(x), and shell `exit N` / `exit $var` / `exit "$var"`
 *   at the start of a command: line start, or after ; & | ( ) { } then else do.
 *   "Not the literal 0" means: anything but 0 / an empty call. A bare `exit` /
 *   `exit()` (status = the last command's) and a thrown error are not detected.
 *
 * Nothing here executes a repo-supplied regex or script: the exclusion patterns
 * are read as text only. The scan of an EXCLUDE array runs to its closing bracket
 * with no length cap; a declaration that starts inside an array already scanned
 * is part of that array and is skipped. A regex literal is read at most
 * MAX_REGEX_LITERAL characters long (a longer one is "other"), so a line built
 * to make the reader re-scan it from every item (`,/[\\]` repeated, where the
 * class never closes) costs a fixed amount per item: the whole scan stays linear
 * in the file size. An array that never closes is reported in a note (its count
 * is then a lower bound).
 *
 * Nothing here reads through a symlink that leaves the repo (the context refuses
 * it, see context.js): such a path reads as absent, with a note.
 */

const path = require("path");
const { counter, byString } = require("./counter");
const { DAY_MS, ISO_RE, isPlainObject, isoDay, isoToMs, sortedByKey, utcDay } = require("./util");

const GROUP = "habit";
const HISTORY_FILE = ".systemix/drift-history.json";
const WORKFLOWS_DIR = ".github/workflows";
const GUARDRAILS_FILE = "design/guardrails.mdx";

const DRIFT_RE = /drift/gi;
const DRIFT_ANY_RE = /drift/i;
const SCRIPT_EXTS = new Set(["", ".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".jsx", ".tsx", ".sh", ".bash", ".zsh", ".py", ".rb"]);
// an exit whose status is not the literal 0: JS/TS/Deno/Python exit calls, process.exitCode =, shell `exit N` / `exit $var`
const NONZERO_EXIT_RE =
  /\bprocess\.exit\(\s*(?!0\s*\))[^\s)]|\bprocess\.exitCode\s*=\s*(?!0\b)[^\s;]|\b(?:Deno|sys)\.exit\(\s*(?!0\s*\))[^\s)]|\bos\._exit\(\s*(?!0\s*\))[^\s)]|(?<![\w.$])(?:exit|quit)\(\s*(?!0\s*\))[^\s)]|\bSystemExit\(\s*(?!0\s*\))[^\s)]|(?:^[ \t]*|[;&|(){}][ \t]*|\b(?:then|else|do)[ \t]+)exit[ \t]+(?:0*[1-9]\d*\b|["']?\$)/gm;
const EXIT_ZERO_CLAIM_RE = /\bexit code 0\b|\bexits? 0\b|\bnot a gate\b/i;
const EXCLUDE_DECL_RE = /\b(?:const|let|var)\s+(\w{0,60}EXCLUDE\w{0,60})\s*(?::[^=\n]{1,80})?=\s*\[/gi;
const MIN_NAMED_LEN = 3;

// ── helpers ─────────────────────────────────────────────────────────────────

const finiteOrNull = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function loadHistory(ctx) {
  if (!ctx.exists(HISTORY_FILE)) {
    const left = ctx.leftRepoNotes([HISTORY_FILE]);
    return { exists: false, entries: [], malformed: 0, shape: null, problem: left.length ? left[0] : `${HISTORY_FILE} not found` };
  }
  let raw;
  try {
    raw = JSON.parse(ctx.read(HISTORY_FILE));
  } catch {
    return { exists: true, entries: [], malformed: 0, shape: null, problem: `${HISTORY_FILE} is not valid JSON (or is over 5 MB)` };
  }
  let list = null;
  let shape = null;
  if (Array.isArray(raw)) { list = raw; shape = "array"; }
  else if (isPlainObject(raw) && Array.isArray(raw.snapshots)) { list = raw.snapshots; shape = "snapshots"; }
  if (!list) return { exists: true, entries: [], malformed: 0, shape: null, problem: `${HISTORY_FILE} has an unrecognised shape: expected an array or {"snapshots": []}` };
  const entries = list.filter(isPlainObject);
  return { exists: true, entries, malformed: list.length - entries.length, shape, problem: null };
}

/** Direct children of `dir` (one path level below it) from a recursive listTree result. */
const directChildren = (files, dir) => files.filter((f) => f.rel.split("/").length === dir.split("/").length + 1);

function flattenKeys(value, prefix, out, depth = 0) {
  if (isPlainObject(value) && depth < 12) {
    for (const k of Object.keys(value).sort(byString)) flattenKeys(value[k], prefix ? `${prefix}.${k}` : k, out, depth + 1);
  } else if (value !== null && value !== undefined) {
    out.push(prefix);
  }
}

// ── drift-script exclusion arrays (read as text, never evaluated) ───────────

const MAX_REGEX_LITERAL = 500;

/** A /regex/flags literal starting at text[i], at most MAX_REGEX_LITERAL characters long, or null. */
function readRegexLiteral(text, i, end) {
  const limit = Math.min(end, i + 1 + MAX_REGEX_LITERAL);
  let j = i + 1;
  let inClass = false;
  for (; j < limit; j++) {
    const ch = text[j];
    if (ch === "\n") return null;
    if (ch === "\\") { j++; continue; }
    if (ch === "[") inClass = true;
    else if (ch === "]") inClass = false;
    else if (ch === "/" && !inClass) break;
  }
  if (j >= limit || text[j] !== "/" || j === i + 1) return null;
  let k = j + 1;
  while (k < end && /[a-z]/.test(text[k])) k++;
  return { source: text.slice(i + 1, j), end: k };
}

/** End index (exclusive) of the quoted string opening at text[i]. */
function skipQuoted(text, i, limit) {
  const quote = text[i];
  let j = i + 1;
  while (j < limit && text[j] !== quote) j += text[j] === "\\" ? 2 : 1;
  return Math.min(j + 1, limit);
}

/**
 * The top-level items of the array literal whose first element starts at
 * `from`: regex literals and plain strings. Anything else counts as "other".
 * Scans to the closing bracket or the end of the text (no length cap) and says
 * where it stopped (`end`, exclusive) and whether the bracket closed.
 */
function scanArray(text, from) {
  const limit = text.length;
  const items = [];
  let other = 0;
  let depth = 1;
  let atItemStart = true;
  let i = from;
  while (i < limit && depth > 0) {
    const c = text[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") { i++; continue; }
    if (c === "/" && text[i + 1] === "/") {
      const e = text.indexOf("\n", i);
      i = e === -1 ? limit : e + 1;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const e = text.indexOf("*/", i + 2);
      i = e === -1 ? limit : e + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const end = skipQuoted(text, i, limit);
      if (depth === 1 && atItemStart) {
        const body = text.slice(i + 1, end - 1);
        if (c === "`" && body.includes("${")) other++;
        else items.push({ kind: "string", value: body });
      }
      if (depth === 1) atItemStart = false;
      i = end;
      continue;
    }
    if (c === "/" && depth === 1 && atItemStart) {
      const lit = readRegexLiteral(text, i, limit);
      if (lit) {
        items.push({ kind: "regex", value: lit.source });
        atItemStart = false;
        i = lit.end;
        continue;
      }
    }
    if (c === "[" || c === "(" || c === "{") {
      if (depth === 1 && atItemStart) other++;
      depth++;
      atItemStart = false;
    } else if (c === "]" || c === ")" || c === "}") {
      depth--;
    } else if (c === ",") {
      if (depth === 1) atItemStart = true;
    } else if (depth === 1 && atItemStart) {
      other++;
      atItemStart = false;
    }
    i++;
  }
  return { items, other, end: Math.min(i, limit), closed: depth === 0 };
}

/**
 * The literal file-ish part of an exclusion pattern: path separators and escapes
 * flattened, then the longest run of characters that are not regex syntax, then
 * its last path segment. `/src[\/\\]app[\/\\]globals\.css$/` → "globals.css";
 * `/\.test\.(ts|tsx)$/` → ".test.".
 */
function literalTail(pattern) {
  const flat = pattern
    .replace(/\[[\\/]{1,6}\]/g, "/")
    .replace(/\\([^\w\s])/g, (_, ch) => (ch === "\\" ? "/" : ch));
  const chunks = flat.split(/[()[\]{}|*+?^$\\]+/);
  let best = "";
  for (const c of chunks) if (c.length > best.length) best = c;
  const parts = best.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

/**
 * Entries of every EXCLUDE-named array in `text`, and the names of arrays that
 * never closed. A declaration that starts inside an array already scanned is part
 * of it (it is skipped), so no character is scanned twice and a file of repeated
 * unclosed declarations costs one pass, not one pass per declaration.
 */
function exclusionsOf(text) {
  const entries = [];
  const unclosed = [];
  let cursor = 0;
  for (const m of text.matchAll(EXCLUDE_DECL_RE)) {
    if (m.index < cursor) continue;
    const scan = scanArray(text, m.index + m[0].length);
    cursor = scan.end;
    if (!scan.closed) unclosed.push(m[1]);
    for (const it of scan.items) entries.push({ variable: m[1], kind: it.kind, value: it.value });
    if (cursor >= text.length) break;
  }
  return { entries, unclosed };
}

// ── run ─────────────────────────────────────────────────────────────────────

function run(ctx) {
  const out = [];
  const headMs = isoToMs(ctx.git && ctx.git.commitDate);
  const noGitNote = "no git history, so there is no HEAD commit date to measure an age against (today's date is never used)";

  // ── snapshots ──
  const hist = loadHistory(ctx);
  const dated = hist.entries
    .map((e, idx) => ({ e, idx, ms: isoToMs(e.runAt) }))
    .filter((x) => x.ms !== null);
  let first = null;
  let last = null;
  for (const x of dated) {
    if (!first || x.ms < first.ms) first = x;
    if (!last || x.ms >= last.ms) last = x;
  }
  const days = new Set(dated.map((x) => utcDay(x.ms)));
  const byTrigger = new Map();
  for (const e of hist.entries) {
    const t = typeof e.triggeredBy === "string" && e.triggeredBy ? e.triggeredBy : "(none)";
    byTrigger.set(t, (byTrigger.get(t) ?? 0) + 1);
  }
  const histNotes = hist.problem ? [hist.problem] : [];
  const undated = hist.entries.length - dated.length;
  if (undated) histNotes.push(`${undated} snapshot(s) have no parseable ISO runAt and are left out of every date counter`);
  if (hist.malformed) histNotes.push(`${hist.malformed} non-object entr${hist.malformed === 1 ? "y was" : "ies were"} ignored`);
  const noSnapshotNote = hist.entries.length ? "no snapshot has a parseable ISO runAt" : "no snapshots";
  const lastNote = last ? [] : [noSnapshotNote];
  const lastField = (name) => (last ? finiteOrNull(last.e[name]) : null);

  out.push(counter({
    id: "habit.snapshots.file_exists",
    group: GROUP,
    kind: "presence",
    unit: "boolean",
    value: hist.exists,
    definition: { summary: "The drift history file exists (a symlink that resolves outside the repo reads as absent)", regex: null, fileSet: HISTORY_FILE },
    notes: hist.exists ? undefined : ctx.leftRepoNotes([HISTORY_FILE]).length ? ctx.leftRepoNotes([HISTORY_FILE]) : undefined,
  }));
  out.push(counter({
    id: "habit.snapshots.count",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: hist.entries.length,
    definition: {
      summary: "Snapshot entries in the drift history (a bare array and a {\"snapshots\": []} object are both read); non-object entries are ignored",
      regex: null,
      fileSet: HISTORY_FILE,
    },
    detail: { shape: hist.shape, undated, malformed: hist.malformed, byTriggeredBy: sortedByKey(byTrigger) },
    notes: histNotes.length ? histNotes : undefined,
  }));
  out.push(counter({
    id: "habit.snapshots.distinct_days",
    group: GROUP,
    kind: "mechanical",
    unit: "distinct",
    value: days.size,
    definition: { summary: "Distinct UTC calendar days that hold at least one dated snapshot", regex: null, fileSet: HISTORY_FILE },
    detail: { days: [...days].sort((a, b) => a - b).slice(0, 30).map((d) => isoDay(d * DAY_MS)) },
  }));
  out.push(counter({
    id: "habit.snapshots.first_run_at",
    group: GROUP,
    kind: "mechanical",
    unit: "date",
    value: first ? new Date(first.ms).toISOString() : null,
    definition: { summary: "runAt of the earliest dated snapshot, normalised to UTC ISO-8601", regex: ISO_RE, fileSet: HISTORY_FILE },
    notes: first ? undefined : [noSnapshotNote],
  }));
  out.push(counter({
    id: "habit.snapshots.last_run_at",
    group: GROUP,
    kind: "mechanical",
    unit: "date",
    value: last ? new Date(last.ms).toISOString() : null,
    definition: {
      summary: "runAt of the newest dated snapshot (the greatest runAt; on a tie the later entry wins), normalised to UTC ISO-8601",
      regex: ISO_RE,
      fileSet: HISTORY_FILE,
    },
    notes: lastNote.length ? lastNote : undefined,
  }));
  const ageNotes = [...lastNote];
  if (last && headMs === null) ageNotes.push(noGitNote);
  if (last && headMs !== null && utcDay(last.ms) > utcDay(headMs)) ageNotes.push("the newest snapshot is dated after the HEAD commit (an uncommitted snapshot), so the age is negative");
  out.push(counter({
    id: "habit.snapshots.last_age_days",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: last && headMs !== null ? utcDay(headMs) - utcDay(last.ms) : null,
    definition: {
      summary: "Calendar days (UTC dates) from the newest snapshot to the HEAD commit date. Never measured to today",
      regex: null,
      fileSet: `${HISTORY_FILE} + git HEAD commit date`,
    },
    detail: { lastRunDay: last ? isoDay(last.ms) : null, headCommitDay: headMs !== null ? isoDay(headMs) : null },
    notes: ageNotes.length ? ageNotes : undefined,
  }));
  for (const [name, field, unitSummary] of [
    ["last_score", "score", "score"],
    ["last_critical", "critical", "critical count"],
    ["last_warnings", "warnings", "warnings count"],
    ["last_files_audited", "componentsAudited", "componentsAudited (files audited)"],
  ]) {
    out.push(counter({
      id: `habit.snapshots.${name}`,
      group: GROUP,
      kind: "mechanical",
      unit: "number",
      value: lastField(field),
      definition: { summary: `The ${unitSummary} stored in the newest dated snapshot, as written (not recomputed)`, regex: null, fileSet: HISTORY_FILE },
      notes: last ? (lastField(field) === null ? [`the newest snapshot has no numeric ${field}`] : undefined) : lastNote,
    }));
  }
  for (const [name, field] of [["last_triggered_by", "triggeredBy"], ["last_score_formula", "scoreFormula"]]) {
    const v = last && typeof last.e[field] === "string" && last.e[field] ? last.e[field] : null;
    out.push(counter({
      id: `habit.snapshots.${name}`,
      group: GROUP,
      kind: "mechanical",
      unit: "string",
      value: v,
      definition: { summary: `The ${field} stored in the newest dated snapshot`, regex: null, fileSet: HISTORY_FILE },
      notes: name === "last_score_formula" && last && v === null
        ? ["no scoreFormula: a snapshot written before the clean-files formula; its score is not comparable with the current drift command's"]
        : last ? undefined : lastNote,
    }));
  }

  // ── workflows ──
  const workflows = directChildren(ctx.listTree(WORKFLOWS_DIR, { exts: [".yml", ".yaml"] }), WORKFLOWS_DIR);
  const mentions = new Map();
  const noncomment = new Map();
  for (const f of workflows) {
    const text = ctx.read(f);
    mentions.set(f.rel, ctx.countMatches(text, DRIFT_RE));
    let n = 0;
    for (const line of text.split("\n")) if (DRIFT_ANY_RE.test(line) && !line.trimStart().startsWith("#")) n++;
    noncomment.set(f.rel, n);
  }
  const sum = (map) => [...map.values()].reduce((a, b) => a + b, 0);
  const wfSet = `${WORKFLOWS_DIR}/*.yml and *.yaml (direct children only, as GitHub reads them)`;
  const noWorkflows = workflows.length ? undefined : [ctx.leftRepoNotes([WORKFLOWS_DIR])[0] ?? `no workflow files under ${WORKFLOWS_DIR}`];
  out.push(counter({
    id: "habit.workflows.files",
    group: GROUP,
    kind: "mechanical",
    unit: "file",
    value: workflows.length,
    definition: { summary: "GitHub Actions workflow files", regex: null, fileSet: wfSet },
    perFile: new Map(workflows.map((f) => [f.rel, 1])),
    detail: { names: workflows.map((f) => path.posix.basename(f.rel)) },
    notes: noWorkflows,
  }));
  out.push(counter({
    id: "habit.workflows.drift_mentions",
    group: GROUP,
    kind: "mechanical",
    unit: "match",
    value: sum(mentions),
    definition: { summary: "Case-insensitive occurrences of \"drift\" in workflow files, comments included", regex: DRIFT_RE, fileSet: wfSet },
    perFile: mentions,
    notes: noWorkflows,
  }));
  out.push(counter({
    id: "habit.workflows.files_mentioning_drift",
    group: GROUP,
    kind: "mechanical",
    unit: "file",
    value: [...mentions.values()].filter((n) => n > 0).length,
    definition: { summary: "Workflow files containing \"drift\" at least once (case-insensitive); perFile count = mentions in the file", regex: DRIFT_RE, fileSet: wfSet },
    perFile: mentions,
    notes: noWorkflows,
  }));
  out.push(counter({
    id: "habit.workflows.drift_noncomment_lines",
    group: GROUP,
    kind: "mechanical",
    unit: "line",
    value: sum(noncomment),
    definition: {
      summary: "Lines with \"drift\" (case-insensitive) that are not whole-line # comments. Closer to \"the workflow runs something drift-related\" than the raw mention count",
      regex: DRIFT_RE,
      fileSet: wfSet,
    },
    perFile: noncomment,
    notes: ["a trailing # comment or a name/description field that mentions drift still counts; this is a text search, not a parse of the workflow"],
  }));

  // ── npm scripts ──
  const pkg = ctx.readJson("package.json");
  const scripts = pkg && isPlainObject(pkg.scripts) ? pkg.scripts : {};
  const driftScripts = Object.keys(scripts)
    .filter((k) => DRIFT_ANY_RE.test(k) || (typeof scripts[k] === "string" && DRIFT_ANY_RE.test(scripts[k])))
    .sort(byString);
  out.push(counter({
    id: "habit.npm_scripts.drift",
    group: GROUP,
    kind: "mechanical",
    unit: "distinct",
    value: driftScripts.length,
    definition: { summary: "Root package.json scripts whose name or command mentions \"drift\" (case-insensitive)", regex: DRIFT_RE, fileSet: "package.json at the repo root (workspace packages are not read)" },
    detail: { names: driftScripts, scriptsTotal: Object.keys(scripts).length },
    notes: !ctx.exists("package.json") ? [ctx.leftRepoNotes(["package.json"])[0] ?? "no package.json at the repo root"] : !pkg ? ["package.json is not valid JSON"] : undefined,
  }));

  // ── scripts/*drift* ──
  const driftFiles = directChildren(ctx.listTree("scripts"), "scripts")
    .filter((f) => DRIFT_ANY_RE.test(path.posix.basename(f.rel)));
  const scriptsLeft = ctx.leftRepoNotes(["scripts"]);
  out.push(counter({
    id: "habit.scripts.drift_files",
    group: GROUP,
    kind: "mechanical",
    unit: "file",
    value: driftFiles.length,
    definition: { summary: "Files directly inside scripts/ whose name contains \"drift\" (case-insensitive)", regex: null, fileSet: "scripts/*drift* (glob, matched case-insensitively) at the repo root, one level" },
    perFile: new Map(driftFiles.map((f) => [f.rel, 1])),
    detail: { names: driftFiles.map((f) => f.rel) },
    notes: scriptsLeft.length ? scriptsLeft : undefined,
  }));

  // ── the drift script's exit behaviour and exclusions (text search only) ──
  const searched = driftFiles.filter((f) => SCRIPT_EXTS.has(path.posix.extname(f.rel).toLowerCase()));
  const nonzero = new Map();
  const claims = new Map();
  const exclusions = [];
  const unclosedArrays = [];
  for (const f of searched) {
    const text = ctx.read(f);
    nonzero.set(f.rel, ctx.countMatches(text, NONZERO_EXIT_RE));
    let n = 0;
    for (const line of text.split("\n")) if (EXIT_ZERO_CLAIM_RE.test(line)) n++;
    claims.set(f.rel, n);
    const found = exclusionsOf(text);
    for (const x of found.entries) exclusions.push({ file: f.rel, ...x });
    for (const variable of found.unclosed) unclosedArrays.push({ file: f.rel, variable });
  }
  const searchedSet = `scripts/*drift* files with a script extension (${[...SCRIPT_EXTS].map((e) => e || "none").join(", ")})`;
  const noScript = searched.length ? [] : [driftFiles.length ? "no scripts/*drift* file has a script extension to search" : "no scripts/*drift* file to search"];
  const nonzeroTotal = sum(nonzero);
  out.push(counter({
    id: "habit.drift_script.nonzero_exit_statements",
    group: GROUP,
    kind: "mechanical",
    unit: "match",
    value: nonzeroTotal,
    definition: {
      summary: "Exit statements whose status is not the literal 0: process.exit(x), process.exitCode = x, Deno/sys/os._exit(x), exit(x)/quit(x), SystemExit(x), and shell `exit N` / `exit $var` at the start of a command (line start, or after ; & | ( ) { } then else do)",
      regex: NONZERO_EXIT_RE,
      fileSet: searchedSet,
    },
    perFile: nonzero,
    notes: [
      ...noScript,
      ...scriptsLeft,
      "text search of the script, never run. process.exit(code) and exit $rc count even if the variable may be 0; matches inside comments and strings count",
      "not detected: a thrown error or unhandled rejection, `set -e`, a bare `exit` or `exit()` (status = the last command's), abort/die, and a literal 0",
    ],
  }));
  out.push(counter({
    id: "habit.drift_script.exits_nonzero",
    group: GROUP,
    kind: "presence",
    unit: "boolean",
    value: nonzeroTotal > 0,
    definition: {
      summary: "True when at least one scripts/*drift* file contains an exit statement whose status is not the literal 0 (the forms listed at habit.drift_script.nonzero_exit_statements; text search; false also when there is no script to search)",
      regex: NONZERO_EXIT_RE,
      fileSet: searchedSet,
    },
    detail: { scriptsSearched: searched.length },
    notes: noScript.length ? noScript : undefined,
  }));
  out.push(counter({
    id: "habit.drift_script.exit_zero_claims",
    group: GROUP,
    kind: "mechanical",
    unit: "line",
    value: sum(claims),
    definition: {
      summary: "Lines in the drift script(s) that say the exit code is 0 or that drift is \"not a gate\" (case-insensitive)",
      regex: EXIT_ZERO_CLAIM_RE,
      fileSet: searchedSet,
    },
    perFile: claims,
    notes: noScript.length ? noScript : undefined,
  }));

  const guardrailsExists = ctx.exists(GUARDRAILS_FILE);
  const guardrails = guardrailsExists ? ctx.read(GUARDRAILS_FILE) : "";
  const classified = exclusions.map((x) => {
    const tail = literalTail(x.value);
    return { ...x, tail, named: guardrailsExists && tail.length >= MIN_NAMED_LEN && guardrails.includes(tail) };
  });
  const exclusionRows = new Map();
  for (const x of classified) exclusionRows.set(x.file, (exclusionRows.get(x.file) ?? 0) + 1);
  const unnamed = classified.filter((x) => !x.named);
  out.push(counter({
    id: "habit.drift_script.exclude_patterns",
    group: GROUP,
    kind: "mechanical",
    unit: "match",
    value: classified.length,
    definition: {
      summary: "Regex-literal and string entries of an array variable whose name contains EXCLUDE in the drift script(s): the files the script exempts",
      regex: EXCLUDE_DECL_RE,
      fileSet: searchedSet,
    },
    perFile: exclusionRows,
    detail: {
      patterns: classified.slice(0, 50).map((x) => ({ file: x.file, kind: x.kind, source: x.value, tail: x.tail })),
      unclosedArrays: unclosedArrays.slice(0, 20),
    },
    notes: [
      ...noScript,
      "read as text, never evaluated; array items that are neither a regex literal nor a plain string are not counted",
      ...(unclosedArrays.length
        ? [`${unclosedArrays.length} EXCLUDE array(s) never close before the end of the file (${unclosedArrays.slice(0, 5).map((u) => `${u.variable} in ${u.file}`).join(", ")}); entries were counted to the end of the file and any declaration after it is read as part of it, so the count is a lower bound`]
        : []),
    ],
  }));
  out.push(counter({
    id: "habit.drift_script.exclusions_not_named_in_guardrails",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: guardrailsExists || !classified.length ? unnamed.length : null,
    definition: {
      summary: `Exclusion entries whose literal tail (the file-ish text left after stripping regex syntax, e.g. "globals.css") does not appear, case-sensitively, anywhere in ${GUARDRAILS_FILE}. A tail under ${MIN_NAMED_LEN} characters is never counted as named`,
      regex: null,
      fileSet: `${searchedSet}, compared with ${GUARDRAILS_FILE}`,
    },
    detail: { unnamed: unnamed.slice(0, 50).map((x) => ({ file: x.file, tail: x.tail })) },
    notes: guardrailsExists || !classified.length
      ? ["a tooling-only exemption: the script skips the file but the guardrails never say so; \"named\" is a text mention, not proof the guardrails declare an exception"]
      : [`${ctx.leftRepoNotes([GUARDRAILS_FILE])[0] ?? `${GUARDRAILS_FILE} not found`}, so exclusions cannot be compared with it`],
  }));

  // ── config: design.* ──
  const cfg = ctx.config();
  const design = cfg && Object.prototype.hasOwnProperty.call(cfg, "design") ? cfg.design : null;
  const designKeys = [];
  flattenKeys(design, "design", designKeys);
  const cfgNote = !ctx.exists("systemix.config.yaml")
    ? [ctx.leftRepoNotes(["systemix.config.yaml"])[0] ?? "no systemix.config.yaml"]
    : !cfg ? ["systemix.config.yaml could not be parsed"] : undefined;
  out.push(counter({
    id: "habit.config.design_keys",
    group: GROUP,
    kind: "mechanical",
    unit: "number",
    value: designKeys.length,
    definition: { summary: "Leaf keys under `design:` in systemix.config.yaml (a scalar `design: x` counts as one; an empty block as none)", regex: null, fileSet: "systemix.config.yaml" },
    detail: { keys: designKeys },
    notes: cfgNote ?? (designKeys.length ? undefined : ["no design: block in systemix.config.yaml"]),
  }));
  const source = isPlainObject(design) && typeof design.source === "string" && design.source.trim() ? design.source.trim() : null;
  out.push(counter({
    id: "habit.config.design_source",
    group: GROUP,
    kind: "mechanical",
    unit: "string",
    value: source,
    definition: { summary: "The design.source value: where the repo says its design system lives", regex: null, fileSet: "systemix.config.yaml" },
    notes: cfgNote ?? (source === null ? ["design.source is not set"] : undefined),
  }));

  return out;
}

module.exports = { group: GROUP, run };
