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
 *     definition: { summary, regex|null, fileSet }      // what was counted, how, where
 *     perFile?:   [{ file, count }]                      // sorted: count desc, file asc
 *     perFileTotal?: number                              // when perFile was truncated
 *     detail?:    { ... }                                // small JSON-safe extras
 *     notes?:     [string]                               // caveats a reader needs
 *   }
 *
 * Ratios (unit "ratio") are fractions rounded to 4 decimals and MUST carry
 * detail.numerator / detail.denominator so a reviewer can re-divide them.
 */

const KINDS = new Set(["mechanical", "presence"]);
const UNITS = new Set(["match", "line", "file", "distinct", "boolean", "ratio", "number", "string", "date"]);
const ID_RE = /^[a-z0-9]+(?:\.[a-z0-9_]+)+$/;
const PER_FILE_LIMIT = 200;

const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Round to 4 decimals (the pinned precision for ratios). */
const round4 = (n) => Math.round(n * 1e4) / 1e4;

/** { file → count } (Map or object) → sorted perFile rows, zero counts dropped. */
function perFileRows(counts) {
  const entries = counts instanceof Map ? [...counts.entries()] : Object.entries(counts);
  return entries
    .filter(([, n]) => n > 0)
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count || byString(a.file, b.file));
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

/**
 * Build a validated counter. Throws on a malformed one — a bad counter is a bug
 * in the module that produced it, never something to paper over at report time.
 */
function counter(spec) {
  const { id, group, kind, unit, value, definition, perFile, detail, notes } = spec;
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
  if (definition.regex != null && typeof definition.regex !== "string") throw new Error(`${where}: definition.regex must be a string or null`);
  if (unit === "ratio") {
    if (!(value >= 0 && value <= 1)) throw new Error(`${where}: ratio value must be within 0..1`);
    if (!detail || !Number.isFinite(detail.numerator) || !Number.isFinite(detail.denominator)) throw new Error(`${where}: ratio needs detail.numerator and detail.denominator`);
  }
  if (detail !== undefined && !isJsonSafe(detail)) throw new Error(`${where}: detail must be JSON-safe`);
  if (notes !== undefined && !(Array.isArray(notes) && notes.every((n) => typeof n === "string"))) throw new Error(`${where}: notes must be strings`);

  const out = {
    id,
    group,
    kind,
    unit,
    value,
    definition: { summary: definition.summary, regex: definition.regex ?? null, fileSet: definition.fileSet },
  };
  if (perFile) {
    const rows = Array.isArray(perFile) ? perFile : perFileRows(perFile);
    out.perFile = rows.slice(0, PER_FILE_LIMIT);
    if (rows.length > PER_FILE_LIMIT) out.perFileTotal = rows.length;
  }
  if (detail !== undefined) out.detail = detail;
  if (notes && notes.length) out.notes = notes;
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
  }
  const ids = report.counters.map((c) => c.id);
  if (ids.join("\n") !== [...ids].sort(byString).join("\n")) problems.push("counters must be sorted by id");
  return problems;
}

module.exports = { KINDS, UNITS, PER_FILE_LIMIT, byString, counter, perFileRows, round4, validateReport };
