"use strict";

/**
 * counter.js — the one shape every audit counter has, and the validator that
 * keeps it that way. A counter is a MECHANICAL fact about a repo (a count, a
 * ratio, a presence check, a parsed value). The counters script never judges:
 * there is no "judged" kind, and no model is involved anywhere in this folder.
 *
 *   {
 *     id:         "colour.hex6.outside_token_source"   // stable API — dotted, lowercase
 *     group:      "colour"                              // = the module file name
 *     kind:       "mechanical" | "presence"
 *     unit:       "match" | "line" | "file" | "distinct" | "boolean" | "ratio"
 *                 | "number" | "string" | "date"
 *     value:      number | boolean | string | null
 *     definition: { summary, regex, flags, fileSet, regexes? }
 *                                                        // what was counted, how, where. regex + flags are ONE pattern that
 *                                                        // compiles as `new RegExp(regex, flags)` and finds exactly the
 *                                                        // counted text; a counter that really runs several patterns
 *                                                        // (a scanner's hex and function-call regexes, a tokenise-then-match
 *                                                        // pipeline) has regex null and flags null and lists them in
 *                                                        // `regexes: [{label, regex, flags}]`, each compilable the same way
 *     perFile?:   [{ file, count }]                      // sorted: count desc, file asc
 *     singleFile?: "path"                                // builder input only: the whole count sits in this one
 *                                                        // file, so perFile = [{ file, count: value }] (units match/line;
 *                                                        // unit file → count 1); nothing is emitted for a 0
 *     perFileTotal?: number                              // when perFile was truncated: the number of files
 *     perFileOmitted?: { files, count }                  // …and what the dropped rows hold, so rows + count = value
 *     truncated?: true                                   // a text in detail/value/notes was cut (see MAX_DETAIL_TEXT)
 *     detail?:    { ... }                                // small JSON-safe extras
 *     notes?:     [string]                               // caveats a reader needs
 *   }
 *
 * Ratios (unit "ratio") are fractions rounded to 4 decimals and MUST carry
 * detail.numerator / detail.denominator so a reviewer can re-divide them. A ratio
 * whose denominator is 0 has no value: it is `null` with detail.denominator 0 (and
 * a note saying why) — never 0 and never 1.
 *
 * Unknown answers. A "boolean" is true or false, never null: when the answer cannot
 * be known (no drift script to read an exit code from) the counter is `false` and
 * says so in `notes` and/or `detail`, so a reader checks those on every false.
 *
 * perFile rows are always emitted sorted (count desc, file asc), whatever order the
 * module built them in; validateReport checks it again on the finished report.
 */

const KINDS = new Set(["mechanical", "presence"]);
const UNITS = new Set(["match", "line", "file", "distinct", "boolean", "ratio", "number", "string", "date"]);
const ID_RE = /^[a-z0-9]+(?:\.[a-z0-9_]+)+$/;
const PER_FILE_LIMIT = 200;
// Text that comes from the audited repo (a heading, a rule, a config value, a token name) is cut to this many UTF-16 units,
// so one hostile line cannot make the report megabytes long. Code-written notes get a higher cap.
const MAX_DETAIL_TEXT = 500;
const MAX_NOTE_TEXT = 1000;
const FLAGS_RE = /^[dgimsuvy]*$/;

const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** perFile order: count desc, file asc. */
const byRow = (a, b) => b.count - a.count || byString(a.file, b.file);

/** Round to 4 decimals (the pinned precision for ratios). */
const round4 = (n) => Math.round(n * 1e4) / 1e4;

/** { file → count } (Map or object) → sorted perFile rows, zero counts dropped. */
function perFileRows(counts) {
  const entries = counts instanceof Map ? [...counts.entries()] : Object.entries(counts);
  return entries
    .filter(([, n]) => n > 0)
    .map(([file, count]) => ({ file, count }))
    .sort(byRow);
}

function isJsonSafe(v) {
  if (v === null) return true;
  const t = typeof v;
  if (t === "string" || t === "boolean") return true;
  if (t === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(isJsonSafe);
  if (t === "object") return Object.values(v).every(isJsonSafe);
  return false;
}

/** Row list → rows sorted count desc, file asc; throws on a row without a string file and a finite count. */
function checkedRows(rows, where) {
  for (const r of rows) {
    if (!r || typeof r.file !== "string" || !Number.isFinite(r.count)) throw new Error(`${where}: every perFile row needs a string file and a finite count`);
  }
  return [...rows].sort(byRow);
}

/** A text cut to `max` units with an ellipsis, never inside a surrogate pair. */
function clampText(text, max) {
  if (text.length <= max) return text;
  let end = max - 1;
  const last = text.charCodeAt(end - 1);
  if (last >= 0xd800 && last <= 0xdbff) end--;
  return text.slice(0, end) + "…";
}

/** Deep copy of a JSON-safe value with every string (and object key) clamped; `state.cut` says whether any was. */
function clampDeep(value, state) {
  const cut = (text) => {
    const out = clampText(text, MAX_DETAIL_TEXT);
    if (out !== text) state.cut = true;
    return out;
  };
  if (typeof value === "string") return cut(value);
  if (Array.isArray(value)) return value.map((v) => clampDeep(v, state));
  if (value && typeof value === "object") {
    const entries = [];
    const used = new Set();
    for (const [k, v] of Object.entries(value)) {
      let key = cut(k);
      for (let n = 2; used.has(key); n++) key = `${cut(k)} #${n}`; // two keys that clamp alike stay two keys
      used.add(key);
      entries.push([key, clampDeep(v, state)]);
    }
    return Object.fromEntries(entries); // own data properties only: a key such as __proto__ stays a key
  }
  return value;
}

/** {regex, flags} from a RegExp (its own flags) or a pattern string (+ the given flags); throws when it does not compile. */
function patternOf(regex, flags, where) {
  const source = regex instanceof RegExp ? regex.source : regex;
  const used = regex instanceof RegExp ? regex.flags : flags ?? "";
  if (typeof source !== "string") throw new Error(`${where}: a regex must be a RegExp or a string`);
  if (typeof used !== "string" || !FLAGS_RE.test(used)) throw new Error(`${where}: regex flags must be a string of dgimsuvy`);
  try {
    new RegExp(source, used);
  } catch {
    throw new Error(`${where}: definition regex does not compile with flags "${used}": ${clampText(source, 80)}`);
  }
  return { regex: source, flags: used };
}

/** The regex part of a definition: one pattern, none, or a labelled list. */
function regexPart(def, where) {
  if (def.regexes !== undefined) {
    if (def.regex != null) throw new Error(`${where}: give definition.regex or definition.regexes, not both`);
    if (!Array.isArray(def.regexes) || def.regexes.length < 2) throw new Error(`${where}: definition.regexes lists at least two patterns (use definition.regex for one)`);
    const list = def.regexes.map((r) => {
      if (!r || typeof r.label !== "string" || !r.label.trim()) throw new Error(`${where}: every definition.regexes entry needs a label`);
      return { label: r.label, ...patternOf(r.regex, r.flags, where) };
    });
    return { regex: null, flags: null, regexes: list };
  }
  if (def.regex == null) return { regex: null, flags: null };
  return patternOf(def.regex, def.flags, where);
}

/**
 * Build a validated counter. Throws on a malformed one — a bad counter is a bug
 * in the module that produced it, never something to paper over at report time.
 */
function counter(spec) {
  const { id, group, kind, unit, value, definition, perFile, singleFile, detail, notes } = spec;
  const where = `counter ${id ?? "(no id)"}`;
  if (typeof id !== "string" || !ID_RE.test(id)) throw new Error(`${where}: id must be dotted lowercase`);
  if (typeof group !== "string" || id.split(".")[0] !== group) throw new Error(`${where}: id must start with its group "${group}"`);
  if (!KINDS.has(kind)) throw new Error(`${where}: kind must be mechanical|presence`);
  if (!UNITS.has(unit)) throw new Error(`${where}: unit "${unit}" is not one of ${[...UNITS].join(", ")}`);
  if (value !== null && !["number", "boolean", "string"].includes(typeof value)) throw new Error(`${where}: value must be number|boolean|string|null`);
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`${where}: value must be finite`);
  if (unit === "boolean" && typeof value !== "boolean") throw new Error(`${where}: unit boolean needs a boolean value`);
  if (["match", "line", "file", "distinct"].includes(unit) && !(Number.isInteger(value) && value >= 0)) throw new Error(`${where}: unit ${unit} needs a non-negative integer`);
  if (!definition || typeof definition.summary !== "string" || !definition.summary.trim()) throw new Error(`${where}: definition.summary required`);
  if (typeof definition.fileSet !== "string" || !definition.fileSet.trim()) throw new Error(`${where}: definition.fileSet required`);
  const rx = regexPart(definition, where);
  if (unit === "ratio") {
    if (!detail || !Number.isFinite(detail.numerator) || !Number.isFinite(detail.denominator)) throw new Error(`${where}: ratio needs detail.numerator and detail.denominator`);
    if (value === null) {
      if (detail.denominator !== 0) throw new Error(`${where}: a null ratio needs detail.denominator 0`);
    } else if (detail.denominator === 0) {
      throw new Error(`${where}: a ratio with denominator 0 has no value: it must be null`);
    } else if (typeof value !== "number" || !(value >= 0 && value <= 1)) {
      throw new Error(`${where}: ratio value must be within 0..1 (or null for a zero denominator)`);
    }
  }
  if (perFile !== undefined && perFile !== null && !Array.isArray(perFile) && !(perFile instanceof Map) && typeof perFile !== "object") throw new Error(`${where}: perFile must be rows, a Map or an object`);
  if (detail !== undefined && !isJsonSafe(detail)) throw new Error(`${where}: detail must be JSON-safe`);
  if (notes !== undefined && !(Array.isArray(notes) && notes.every((n) => typeof n === "string"))) throw new Error(`${where}: notes must be strings`);

  const state = { cut: false };
  const out = {
    id,
    group,
    kind,
    unit,
    value: typeof value === "string" ? clampText(value, MAX_DETAIL_TEXT) : value,
    definition: { summary: definition.summary, ...rx, fileSet: definition.fileSet },
  };
  if (out.value !== value) state.cut = true;
  const noteList = notes && notes.length ? notes.map((n) => clampText(n, MAX_NOTE_TEXT)) : [];
  if (noteList.some((n, i) => n !== notes[i])) state.cut = true;
  if (perFile) {
    const rows = Array.isArray(perFile) ? checkedRows(perFile, where) : perFileRows(perFile);
    out.perFile = rows.slice(0, PER_FILE_LIMIT);
    if (rows.length > PER_FILE_LIMIT) {
      const dropped = rows.slice(PER_FILE_LIMIT);
      const droppedCount = dropped.reduce((a, r) => a + r.count, 0);
      out.perFileTotal = rows.length;
      out.perFileOmitted = { files: dropped.length, count: droppedCount };
      noteList.push(`perFile lists the first ${PER_FILE_LIMIT} of ${rows.length} files; the other ${dropped.length} hold ${droppedCount} (the listed rows add up to the value only together with perFileOmitted.count)`);
    }
  } else if (typeof singleFile === "string" && singleFile && ["match", "line", "file"].includes(unit) && value > 0) {
    out.perFile = [{ file: singleFile, count: unit === "file" ? 1 : value }];
  }
  if (detail !== undefined) out.detail = clampDeep(detail, state);
  if (noteList.length) out.notes = noteList;
  if (state.cut) out.truncated = true;
  return out;
}

/** Validate a finished report (schema shape + unique ids + every counter). Returns a list of problems. */
function validateReport(report) {
  const problems = [];
  if (!report || typeof report !== "object") return ["report must be an object"];
  if (report.schema !== "systemix.audit-counters/1") problems.push(`schema must be "systemix.audit-counters/1"`);
  if (typeof report.countersVersion !== "string") problems.push("countersVersion must be a string");
  if (!report.scope || typeof report.scope !== "object") problems.push("scope missing");
  if (!Array.isArray(report.counters)) return [...problems, "counters must be an array"];
  const seen = new Set();
  for (const c of report.counters) {
    if (seen.has(c.id)) problems.push(`duplicate counter id ${c.id}`);
    seen.add(c.id);
    try {
      counter({ ...c });
    } catch (e) {
      problems.push(e.message);
    }
    if (Array.isArray(c.perFile) && c.perFile.some((r, i) => i > 0 && byRow(c.perFile[i - 1], r) > 0)) {
      problems.push(`counter ${c.id}: perFile must be sorted count desc, file asc`);
    }
    if (c.perFileTotal !== undefined) {
      const o = c.perFileOmitted;
      if (!o || o.files !== c.perFileTotal - (c.perFile ? c.perFile.length : 0)) problems.push(`counter ${c.id}: perFileTotal needs a matching perFileOmitted`);
    }
  }
  const ids = report.counters.map((c) => c.id);
  if (ids.join("\n") !== [...ids].sort(byString).join("\n")) problems.push("counters must be sorted by id");
  return problems;
}

module.exports = { KINDS, UNITS, PER_FILE_LIMIT, MAX_DETAIL_TEXT, MAX_NOTE_TEXT, byString, clampText, counter, perFileRows, round4, validateReport };
