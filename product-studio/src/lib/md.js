"use strict";

// Small, dependency-free readers for the markdown the studio keeps its data in.

/** Split a markdown table row into cells; `\|` stays a literal pipe inside a cell. null if not a row. */
function cells(line) {
  const t = line.trim();
  if (!t.startsWith("|")) return null;
  const out = [];
  let cur = "";
  for (let i = 1; i < t.length; i++) {
    const c = t[i];
    if (c === "\\" && t[i + 1] === "|") {
      cur += "|";
      i++;
    } else if (c === "|") {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  return out;
}

const scalar = (v) => {
  const s = v.trim();
  if (s === "") return "";
  if (/^\[.*\]$/.test(s)) return s.slice(1, -1).split(",").map((x) => scalar(x)).filter((x) => x !== "");
  if (/^".*"$|^'.*'$/.test(s)) return s.slice(1, -1);
  if (s === "true") return true;
  if (s === "false") return false;
  if (s === "null" || s === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
};

/**
 * Parse `---\nkey: value\n---\nbody`. Values: strings, numbers, booleans, null, [a, b] lists,
 * and `key:` followed by `  - item` lines. Returns { data, body, lines } (lines = frontmatter length).
 */
function frontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: {}, body: text, lines: 0 };
  const data = {};
  let listKey = null;
  for (const line of m[1].split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) {
      data[listKey].push(scalar(item[1]));
      continue;
    }
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    if (kv[2].trim() === "") {
      data[kv[1]] = [];
      listKey = kv[1];
    } else {
      data[kv[1]] = scalar(kv[2]);
      listKey = null;
    }
  }
  return { data, body: text.slice(m[0].length), lines: m[0].split("\n").length - 1 };
}

const needsQuote = (s) => /^[\s\-?:,[\]{}#&*!|>'"%@`]|: | #|^(true|false|null|~|-?\d+(\.\d+)?)$/.test(s) || s === "";

/** Serialize a flat object as frontmatter (strings, numbers, booleans, null, string lists). */
function stringifyFrontmatter(data) {
  const lines = Object.entries(data).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: [${v.map((x) => (needsQuote(String(x)) ? JSON.stringify(String(x)) : String(x))).join(", ")}]`;
    if (v === null || v === undefined) return `${k}: null`;
    if (typeof v === "string") return `${k}: ${needsQuote(v) ? JSON.stringify(v) : v}`;
    return `${k}: ${v}`;
  });
  return `---\n${lines.join("\n")}\n---\n`;
}

module.exports = { cells, frontmatter, stringifyFrontmatter };
