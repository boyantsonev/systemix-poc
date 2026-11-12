"use strict";

// The privacy lint for anything the studio keeps: the run log's free-text fields and the
// upstream issue drafts. It names what it found and where, never the value itself.

const CHECKS = [
  ["an email address", /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/],
  ["a secret key", /\bsk-[A-Za-z0-9_-]{8,}/],
  ["a GitHub token", /\bgh[pousr]_[A-Za-z0-9]{10,}/],
  ["a chat token", /\bxox[bapsr]-[A-Za-z0-9-]{8,}/],
  ["a long hex string (a key or hash)", /(^|[^0-9A-Fa-f])[0-9A-Fa-f]{32,}(?![0-9A-Fa-f])/],
  ["a URL with a query string", /\b[a-z][a-z0-9+.-]*:\/\/[^\s?#]+\?\S+/i],
  ["an absolute home path", /(^|[^\w.~-])\/(Users|home)\/[^\s/'"`]+/],
  ["an absolute home path", /\b[A-Za-z]:[\\/]+Users[\\/]+[^\s\\/]+/],
];

/** A long run of base64-ish characters with letters and digits mixed in: looks like a token. */
function looksLikeBase64(s) {
  for (const m of s.matchAll(/[A-Za-z0-9+_]{32,}={0,2}/g)) {
    if (/\d/.test(m[0]) && /[A-Za-z]/.test(m[0])) return true;
  }
  return false;
}

/** What a string looks like, or null when it is clean. */
function findIn(value) {
  if (typeof value !== "string" || !value) return null;
  for (const [what, re] of CHECKS) if (re.test(value)) return what;
  if (looksLikeBase64(value)) return "a long encoded string (a key or token)";
  return null;
}

/**
 * lint([[field, value], …]) → [message]. Each message names the field and what it looks like.
 * `value` may be a string or a list of strings (each element is named `field[i]`).
 */
function lint(fields) {
  const out = [];
  for (const [field, value] of fields) {
    const items = Array.isArray(value) ? value.map((v, i) => [`${field}[${i}]`, v]) : [[field, value]];
    for (const [name, v] of items) {
      const what = findIn(v);
      if (what) out.push(`${name}: looks like ${what}; the run log keeps none (leave it out or say it in other words)`);
    }
  }
  return out;
}

/** The fields of a run-log row the lint reads: note, args, false_positives[].why and sources. */
function rowFields(row) {
  const fields = [
    ["note", row.note],
    ["args", row.args],
  ];
  if (Array.isArray(row.false_positives)) row.false_positives.forEach((fp, i) => fields.push([`false_positives[${i}].why`, fp && fp.why]));
  if (Array.isArray(row.sources)) fields.push(["sources", row.sources]);
  return fields;
}

const lintRow = (row) => lint(rowFields(row));

module.exports = { lint, lintRow, findIn };
