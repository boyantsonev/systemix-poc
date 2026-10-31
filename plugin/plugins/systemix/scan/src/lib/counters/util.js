"use strict";

/**
 * util.js — small helpers more than one counter group needs, kept here so a group
 * never imports another group (a group module exports `{ group, run }` and nothing
 * else). Pure: no I/O, no clock, no locale, no randomness. The helpers that take a
 * `ctx` only call its read-only methods.
 *
 * What lives here, and why one copy each:
 *   • dates      isoToMs / utcDay / isoDay — "age in days" is a calendar-day difference of UTC
 *                dates, measured to the HEAD commit date, never to today
 *   • hex        normalizeHex (a colour that can sit on a background: 3 or 6 digits, else null),
 *                canonicalHex (any #hex lower-cased with 3→6 and 4→8 digit expansion, the form
 *                the colour counters compare), parseHex
 *   • tallies    bump / sum / cap / sortedByCount / sortedByKey / lineNumbers
 *   • notes      joinNotes / capNotes — the "over the read cap, so a 0 is not a measurement" notes
 *   • paths      repoRelativePath — a path written in repo content, only if it is repo-relative
 *   • file sets  CODE_EXTS, CODE_SET, AUDITED_SET — the words several definitions share
 */

const path = require("path");
const { EXCLUDE_DIRS } = require("../design-source");
const { byString } = require("./counter");

const POSIX = path.posix;
const DAY_MS = 86400000;
// a front-matter line or a design-doc "canonical" line longer than this is not a `key: value` or a pointer to a file and is
// not matched (prose lines are never cut: the patterns that read them are linear)
const LINE_CAP = 2000;

// ── dates ───────────────────────────────────────────────────────────────────

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}(?::?\d{2})?)?)?$/;

/**
 * ISO-8601 date or date-time → UTC milliseconds, or null when it is not one.
 * Parsed by hand so the result never depends on the engine's lenient Date
 * parsing or on the machine's timezone: a date-time with no zone is read as UTC.
 */
function isoToMs(value) {
  if (typeof value !== "string") return null;
  const m = ISO_RE.exec(value.trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const h = Number(m[4] ?? 0);
  const mi = Number(m[5] ?? 0);
  const s = Number(m[6] ?? 0);
  const msPart = Number(((m[7] ?? "") + "000").slice(0, 3));
  if (y < 1900 || mo < 1 || mo > 12 || d < 1 || h > 23 || mi > 59 || s > 59) return null;
  if (d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return null;
  let offsetMin = 0;
  const zone = m[8];
  if (zone && zone !== "Z") {
    const digits = zone.slice(1).replace(":", "");
    offsetMin = (zone[0] === "-" ? -1 : 1) * (Number(digits.slice(0, 2)) * 60 + Number(digits.slice(2) || 0));
  }
  return Date.UTC(y, mo - 1, d, h, mi, s, msPart) - offsetMin * 60000;
}

const utcDay = (ms) => Math.floor(ms / DAY_MS);
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

// ── hex colours ─────────────────────────────────────────────────────────────

// 3- or 6-digit hex that is not an HTML entity (&#123;), a url fragment id
// (word char before #), or a markdown anchor link ](#abc). 4/8-digit (alpha)
// forms are deliberately not matched: they cannot be placed on a background.
const HEX_SRC = "(?<![&\\w]|\\]\\()#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F\\w])";

/** "#ABC" / "#aabbcc" → "#aabbcc"; null for anything else (4/8-digit alpha forms included). */
function normalizeHex(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const h = m[1].toLowerCase();
  return "#" + (h.length === 3 ? [...h].map((c) => c + c).join("") : h);
}

/** Lowercase, 3→6 digit and 4→8 digit expansion. Other lengths are only lowercased. */
function canonicalHex(hex) {
  const h = String(hex).toLowerCase();
  if (h.length === 4 || h.length === 5) return "#" + [...h.slice(1)].map((c) => c + c).join("");
  return h;
}

/** "#rrggbb" or "#rgb" → [r, g, b] (0..255), or null. */
function parseHex(hex) {
  const n = normalizeHex(hex);
  if (!n) return null;
  return [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)];
}

// ── tallies ─────────────────────────────────────────────────────────────────

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const bump = (map, key, n = 1) => map.set(key, (map.get(key) ?? 0) + n);
const sum = (map) => { let n = 0; for (const v of map.values()) n += v; return n; };
const cap = (list, n = 25) => list.slice(0, n);
/** A sorted copy of any iterable of strings (code-unit order, never the locale's). */
const sortedList = (iter) => [...iter].sort(byString);

/** { key → count } Map as a plain object, count desc then key asc (stable JSON; a key such as __proto__ stays a key). */
function sortedByCount(map) {
  return Object.fromEntries([...map.entries()].sort((a, b) => b[1] - a[1] || byString(a[0], b[0])));
}

/** { key → value } Map as a plain object, keys ascending (stable JSON; a key such as __proto__ stays a key). */
function sortedByKey(map) {
  return Object.fromEntries([...map.entries()].sort((a, b) => byString(a[0], b[0])));
}

/**
 * 1-based line number of each ascending string index, in one pass over the text.
 * The next newline is cached and searched for again only once an index has passed
 * it, so the cost is O(text + hits) even on a one-line minified file.
 */
function lineNumbers(text, indices) {
  const lines = [];
  let line = 1;
  let nextNewline = text.indexOf("\n");
  for (const idx of indices) {
    while (nextNewline !== -1 && nextNewline < idx) {
      line++;
      nextNewline = text.indexOf("\n", nextNewline + 1);
    }
    lines.push(line);
  }
  return lines;
}

/** `text` without the trailing characters of `chars` (a loop: a `[...]+$` regex is quadratic on a long run). */
function trimTrailing(text, chars) {
  let end = text.length;
  while (end > 0 && chars.includes(text[end - 1])) end--;
  return end === text.length ? text : text.slice(0, end);
}

// ── notes ───────────────────────────────────────────────────────────────────

/** Several note lists → one list, or undefined when all are empty (counter() takes undefined as "no notes"). */
function joinNotes(...lists) {
  const all = lists.flat().filter(Boolean);
  return all.length ? all : undefined;
}

/** Notes naming the files among `rels` that were not read (over the read cap, past the run's read budget); [] when none. */
function capNotes(ctx, rels) {
  const notes = [];
  for (const [reason, why] of [["over", "over the 5 MB read cap"], ["budget", "past the run's read budget"]]) {
    const hit = rels.filter((r) => ctx.skipped.get(r) === reason);
    if (!hit.length) continue;
    const shown = hit.slice(0, 3).join(", ") + (hit.length > 3 ? ` and ${hit.length - 3} more` : "");
    notes.push(`${why} and not read: ${shown}. Nothing in ${hit.length === 1 ? "it" : "them"} is counted here, so a 0 is not a measurement`);
  }
  return notes;
}

// ── paths ───────────────────────────────────────────────────────────────────

const posixNorm = (p) => POSIX.normalize(String(p).trim().replace(/\\/g, "/")).replace(/^\.\//, "");

/**
 * A path written in repo content → its normalised repo-relative posix form, or null
 * when it is not one: absolute (`/x`, `C:\x`, `\\host\x`), home-relative (`~/x`),
 * climbing out of the repo (`../x`), or built from a template (`${x}`). Such a path
 * says nothing about this tree, so it is never looked up on the auditor's disk.
 */
function repoRelativePath(p) {
  const raw = String(p ?? "").trim();
  if (!raw || raw.includes("${")) return null;
  const norm = posixNorm(raw);
  if (!norm || norm === "." || POSIX.isAbsolute(norm) || /^[A-Za-z]:/.test(norm) || /^~(?:\/|$)/.test(norm)) return null;
  if (norm === ".." || norm.startsWith("../")) return null;
  return norm;
}

// ── file sets (the words several definitions share) ─────────────────────────

const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"]);
// The census never enters directories with these names (nor dot-directories); stated in every file set so the scope is not silent.
const CENSUS_SKIPS = `the census skips directories named ${[...EXCLUDE_DIRS].filter((d) => !d.startsWith(".")).sort(byString).join(", ")} and dot-directories (one that holds source files is listed in scope.skippedDirs)`;
const CODE_SET = `audited code files (ts, tsx, js, jsx, vue, svelte under the audited dirs), excluding tests, .d.ts and the token source; ${CENSUS_SKIPS}`;
const AUDITED_SET = `audited files (ts, tsx, js, jsx, css, vue, svelte under the audited dirs), excluding tests, .d.ts and the token source; ${CENSUS_SKIPS}`;

module.exports = {
  AUDITED_SET,
  CODE_EXTS,
  CODE_SET,
  DAY_MS,
  HEX_SRC,
  ISO_RE,
  LINE_CAP,
  bump,
  canonicalHex,
  cap,
  capNotes,
  isPlainObject,
  isoDay,
  isoToMs,
  joinNotes,
  lineNumbers,
  normalizeHex,
  parseHex,
  posixNorm,
  repoRelativePath,
  sortedByCount,
  sortedByKey,
  sortedList,
  sum,
  trimTrailing,
  utcDay,
};
