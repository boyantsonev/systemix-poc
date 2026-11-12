"use strict";

// The run log, design/.studio/runs.jsonl: the schema, validation, reading, appending and the
// ratings merged onto the runs they rate. Rows are only ever appended (SPEC.md § runs).

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { rel: L } = require("./layout");
const privacy = require("./privacy");
const pkg = require("../../package.json");

const KINDS = ["run", "eval", "admin", "rating"];
const COMMANDS = ["setup", "brief", "check", "loop", "admin"];
const RESULTS = ["pass", "pass-with-flags", "pass-with-fixes", "fail", "proposed", "written", "stopped-at-gate", "error"];
const RATINGS = ["up", "down", "none"];
const RUN_ID = /^r-\d{8}-\d{6}-[0-9a-f]{4}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const NOTE_MAX = 300;

/** The fields in the order they are written. `filled` ones are set by the log, never by the caller. */
const FIELDS = ["run", "at", "kind", "command", "args", "surface", "depth", "goal", "result", "blocks", "flags", "false_positives", "sources", "files_written", "duration_s", "rating", "note", "ref", "studio_version"];
const FILLED = ["run", "at", "studio_version"];

const isStr = (v) => typeof v === "string";
const isStrOrNull = (v) => v === null || typeof v === "string";
const isCount = (v) => Number.isInteger(v) && v >= 0;
const isStrList = (v) => Array.isArray(v) && v.every(isStr);
const oneOf = (list) => (v) => list.includes(v);

const CHECKS = {
  run: [(v) => isStr(v) && RUN_ID.test(v), "r-YYYYMMDD-HHMMSS-<4 hex>"],
  at: [(v) => isStr(v) && ISO.test(v) && !Number.isNaN(Date.parse(v)), "an ISO time (YYYY-MM-DDTHH:MM:SSZ)"],
  kind: [oneOf(KINDS), KINDS.join("|")],
  command: [oneOf(COMMANDS), COMMANDS.join("|")],
  args: [isStr, "a string"],
  surface: [isStrOrNull, "a string or null"],
  depth: [isStrOrNull, "a string or null"],
  goal: [(v) => v === null || (isStr(v) && /^G-\d{3,}$/.test(v)), "G-NNN or null"],
  result: [oneOf(RESULTS), RESULTS.join("|")],
  blocks: [isCount, "a whole number, 0 or more"],
  flags: [isCount, "a whole number, 0 or more"],
  false_positives: [Array.isArray, "a list of {rule, where, why}"],
  sources: [isStrList, "a list of strings"],
  files_written: [isStrList, "a list of strings"],
  duration_s: [(v) => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0), "a number of seconds or null"],
  rating: [oneOf(RATINGS), RATINGS.join("|")],
  note: [(v) => isStr(v) && v.length <= NOTE_MAX, `a string of ${NOTE_MAX} characters or fewer`],
  ref: [(v) => isStr(v) && RUN_ID.test(v), "the run id rated (r-YYYYMMDD-HHMMSS-<4 hex>)"],
  studio_version: [(v) => isStr(v) && v.length > 0, "a version string"],
};

/**
 * validate(row, { input }) → [problem]. `input` is a row from a caller, before the log fills
 * run/at/studio_version (so those must be absent); otherwise a stored row (so they must be there).
 * Schema problems first, then the privacy lint, which names the field and never the value.
 */
function validate(row, { input = false } = {}) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return ["a row is one JSON object"];
  const problems = [];
  for (const k of Object.keys(row).sort()) {
    if (!FIELDS.includes(k)) problems.push(`unknown field "${k}"`);
    else if (input && FILLED.includes(k)) problems.push(`${k}: filled by the log; leave it out`);
  }
  for (const k of FIELDS) {
    if (input && FILLED.includes(k)) continue;
    const has = Object.prototype.hasOwnProperty.call(row, k);
    if (k === "ref") {
      if (row.kind === "rating" && !has) problems.push("ref: a rating row names the run it rates");
      if (row.kind !== "rating" && has) problems.push("ref: only a rating row has ref");
      if (!has) continue;
    }
    if (!has) {
      problems.push(`${k}: missing (${CHECKS[k][1]})`);
      continue;
    }
    const [ok, want] = CHECKS[k];
    if (!ok(row[k])) problems.push(`${k}: must be ${want}`);
  }
  if (Array.isArray(row.false_positives)) {
    row.false_positives.forEach((fp, i) => {
      const okShape = fp && typeof fp === "object" && !Array.isArray(fp);
      const keys = okShape ? Object.keys(fp).sort().join(",") : "";
      if (!okShape || keys !== "rule,where,why" || ![fp.rule, fp.where, fp.why].every(isStr)) problems.push(`false_positives[${i}]: must be {rule, where, why}, each a string`);
    });
  }
  if (problems.length) return problems;
  return privacy.lintRow(row);
}

/** The row with its fields in the schema's order (stable bytes). */
const ordered = (row) => Object.fromEntries(FIELDS.filter((k) => Object.prototype.hasOwnProperty.call(row, k)).map((k) => [k, row[k]]));

const file = (root) => path.join(root, L.runs);

/** Every line of the log: { rows (valid JSON objects, with .line), problems[{line, message}] }. */
function read(root) {
  const f = file(root);
  const out = { rows: [], problems: [], exists: fs.existsSync(f) };
  if (!out.exists) return out;
  fs.readFileSync(f, "utf8")
    .split("\n")
    .forEach((text, i) => {
      if (!text.trim()) return;
      let row;
      try {
        row = JSON.parse(text);
      } catch {
        out.problems.push({ line: i + 1, message: "not valid JSON" });
        return;
      }
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        out.problems.push({ line: i + 1, message: "a row is one JSON object" });
        return;
      }
      out.rows.push(Object.defineProperty(row, "line", { value: i + 1, enumerable: false }));
    });
  return out;
}

/** lint(root) → { ok, rows, problems[{line, message}] }: every row valid and privacy-clean. */
function lint(root) {
  const r = read(root);
  const problems = [...r.problems];
  const ids = new Set();
  for (const row of r.rows) {
    for (const p of validate(row)) problems.push({ line: row.line, message: p });
    if (row.run && ids.has(row.run)) problems.push({ line: row.line, message: `run: ${row.run} appears twice` });
    ids.add(row.run);
  }
  problems.sort((a, b) => a.line - b.line);
  return { ok: problems.length === 0, exists: r.exists, rows: r.rows.length, problems };
}

const pad = (n) => String(n).padStart(2, "0");
const isoSeconds = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

/** A run id from the clock: r-YYYYMMDD-HHMMSS-<4 hex>, the hex seeded from now and the row. */
function newId(now, seed, taken) {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  for (let i = 0; ; i++) {
    const hex = crypto.createHash("sha1").update(`${now.toISOString()}|${seed}|${i}`).digest("hex").slice(0, 4);
    const id = `r-${stamp}-${hex}`;
    if (!taken.has(id)) return id;
  }
}

/**
 * append(root, input, now) → { ok, run } | { ok:false, problems[] }. Fills run, at and
 * studio_version, validates, and appends one line. Appends nothing when the row is invalid.
 */
function append(root, input, now) {
  const pre = validate(input, { input: true });
  if (pre.length) return { ok: false, problems: pre };
  const existing = read(root);
  const taken = new Set(existing.rows.map((r) => r.run));
  const row = ordered({ ...input, run: newId(now, `${existing.rows.length}|${JSON.stringify(input)}`, taken), at: isoSeconds(now), studio_version: pkg.version });
  const post = validate(row);
  if (post.length) return { ok: false, problems: post };
  const f = file(root);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const prev = existing.exists ? fs.readFileSync(f, "utf8") : "";
  fs.appendFileSync(f, (prev && !prev.endsWith("\n") ? "\n" : "") + JSON.stringify(row) + "\n");
  return { ok: true, run: row.run, row };
}

const byTime = (a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : (a.line || 0) - (b.line || 0));

/**
 * Runs (every row but ratings) with their ratings merged on: `rating` becomes the latest up or
 * down given for that run (a "none" skip never overrides one), with `rating_note` and `rated_at`.
 */
function merged(rows) {
  const ratings = new Map();
  for (const r of rows.filter((x) => x.kind === "rating").sort(byTime)) {
    if (!ratings.has(r.ref)) ratings.set(r.ref, []);
    ratings.get(r.ref).push(r);
  }
  return rows
    .filter((x) => x.kind !== "rating")
    .sort(byTime)
    .map((row) => {
      const given = (ratings.get(row.run) || []).filter((r) => r.rating !== "none");
      const out = { ...row };
      const asked = ratings.has(row.run);
      if (given.length) {
        const latest = given[given.length - 1];
        out.rating = latest.rating;
        out.rated_at = latest.at;
        if (latest.note) out.rating_note = latest.note;
      }
      out.asked = asked || out.rating !== "none";
      return out;
    });
}

/** The last run or admin row (not a rating, not a harness eval): what `rate last` and `should-ask` mean. */
const lastRun = (rows) => rows.filter((r) => r.kind === "run" || r.kind === "admin").sort(byTime).slice(-1)[0] || null;

/** A run the rating rule asks about straight away: it ended in error or fail, or dropped a false positive. */
const askEligible = (row) => !!row && (row.result === "error" || row.result === "fail" || (Array.isArray(row.false_positives) && row.false_positives.length > 0));

module.exports = { FIELDS, FILLED, KINDS, COMMANDS, RESULTS, RATINGS, RUN_ID, NOTE_MAX, validate, ordered, read, lint, append, merged, lastRun, askEligible, byTime, isoSeconds };
