"use strict";

/**
 * markdown.js — the markdown and front-matter readers the documentation counters
 * (docs, guardrails, decisions) share: front matter, fenced-code-aware lines, the
 * frontmatter yaml subset, the DESIGN.md colours, and the decision-record files.
 * Text in, structure out; the only I/O is through the `ctx` handed in.
 *
 * Lines are never cut: a long unwrapped paragraph is still prose, and a cut would drop
 * the colours and claims past it without a trace. Every pattern that runs over a line is
 * written to be linear in the line's length instead (bounded runs, `[^\n]*` rather
 * than `.*` before an end anchor), and the tests feed each of them a hostile line.
 */

const layout = require("../layout");
const { LINE_CAP } = require("./util");
const { byString } = require("./counter");

const MD_EXTS = [".md", ".mdx", ".markdown"];
const ADR_DIRS = ["decisions", `${layout.rel.design}/decisions`];
const H2_RE = /^##[ \t]+\S/; // the one rule every H2 counter uses: column 0, a non-empty title

/**
 * Front matter: a block opened by a first line `---` and closed by `---` / `...`.
 * @returns {{present:boolean, raw:string, endLine:number}} endLine = 1-based line of the closing fence
 */
function frontMatter(text) {
  const lines = text.split("\n");
  if (!/^---[ \t]*$/.test(lines[0] ?? "")) return { present: false, raw: "", endLine: 0 };
  for (let j = 1; j < lines.length; j++) {
    if (/^(?:---|\.\.\.)[ \t]*$/.test(lines[j])) return { present: true, raw: lines.slice(1, j).join("\n"), endLine: j + 1 };
  }
  return { present: false, raw: "", endLine: 0 };
}

/**
 * Lines after the front matter, each flagged when it sits inside (or is the
 * fence of) a fenced code block. Line numbers are 1-based in the whole file.
 * @returns {{front:{present:boolean, raw:string, endLine:number}, lines:{n:number, text:string, fenced:boolean}[]}}
 */
function scanMarkdown(text) {
  const front = frontMatter(text);
  const raw = text.split("\n");
  const lines = [];
  if (!text) return { front, lines };
  let fence = null;
  for (let i = front.endLine; i < raw.length; i++) {
    const l = raw[i];
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(l);
    if (fence) {
      lines.push({ n: i + 1, text: l, fenced: true });
      if (m && m[1][0] === fence.ch && m[1].length >= fence.len && /^ {0,3}[`~]+[ \t]*$/.test(l)) fence = null;
    } else if (m) {
      fence = { ch: m[1][0], len: m[1].length };
      lines.push({ n: i + 1, text: l, fenced: true });
    } else {
      lines.push({ n: i + 1, text: l, fenced: false });
    }
  }
  // a file's trailing "\n" leaves one empty last element, which is not a line
  if (lines.length && lines[lines.length - 1].text === "" && text.endsWith("\n")) lines.pop();
  return { front, lines };
}

// ── tiny yaml (frontmatter subset) ──────────────────────────────────────────

function scalar(s) {
  const t = s.trim();
  if (t[0] === '"') {
    const end = t.indexOf('"', 1);
    if (end > 0) return t.slice(1, end).replace(/\\"/g, '"');
  }
  if (t[0] === "'") {
    const end = t.indexOf("'", 1);
    if (end > 0) return t.slice(1, end);
  }
  return t.replace(/\s+#.*$/, "").trim();
}

/** `key: value` lines of a yaml block → [{indent, key, value|null, line}] (lists and block scalars are skipped). */
function yamlEntries(raw, firstLine = 2) {
  const out = [];
  raw.split("\n").forEach((l, idx) => {
    if (l.length > LINE_CAP || !l.trim() || /^\s*#/.test(l) || /^\s*-(?:\s|$)/.test(l)) return;
    const m = /^( *)("[^"]*"|'[^']*'|[^\s#'"][^:]*?)[ \t]*:(?:[ \t]+(.*))?$/.exec(l);
    if (!m) return;
    const key = m[2][0] === '"' || m[2][0] === "'" ? m[2].slice(1, -1) : m[2];
    const rest = m[3] === undefined ? "" : m[3];
    out.push({ indent: m[1].length, key, value: rest.trim() === "" ? null : scalar(rest), line: firstLine + idx });
  });
  return out;
}

/** Top-level scalar keys of a yaml block as a Map (first occurrence wins). */
function topLevel(entries) {
  const map = new Map();
  for (const e of entries) if (e.indent === 0 && e.value !== null && !map.has(e.key)) map.set(e.key, e.value);
  return map;
}

/** Direct children of top-level `key` (a block whose own value is empty). */
function childrenOf(entries, key) {
  const at = entries.findIndex((e) => e.indent === 0 && e.key === key && e.value === null);
  if (at === -1) return [];
  const kids = [];
  for (let i = at + 1; i < entries.length && entries[i].indent > 0; i++) kids.push(entries[i]);
  if (!kids.length) return kids;
  const base = Math.min(...kids.map((k) => k.indent));
  return kids.filter((k) => k.indent === base);
}

// ── DESIGN.md and the decision records ──────────────────────────────────────

/** Repo-relative path of the design doc: design/DESIGN.md, else a root DESIGN.md, else null. */
function designMdPath(ctx) {
  if (ctx.exists(layout.rel.designFile) && !ctx.isDirectory(layout.rel.designFile)) return layout.rel.designFile;
  if (ctx.exists("DESIGN.md") && !ctx.isDirectory("DESIGN.md")) return "DESIGN.md";
  return null;
}

/** Front-matter `colors:` of DESIGN.md → { path, present, colors:[{name, value, line}] } (parsed once per context). */
function designColors(ctx) {
  return ctx.memo("md:design-colors", () => {
    const p = designMdPath(ctx);
    if (!p) return { path: null, present: false, colors: [] };
    const fm = frontMatter(ctx.read(p));
    const entries = fm.present ? yamlEntries(fm.raw) : [];
    const colors = childrenOf(entries, "colors")
      .filter((e) => e.value !== null)
      .map((e) => ({ name: e.key, value: e.value, line: e.line }));
    return { path: p, present: fm.present, colors };
  });
}

/** Markdown decision-record files under decisions/ and design/decisions/ (sorted, de-duplicated). */
function adrFiles(ctx) {
  const seen = new Set();
  const files = [];
  for (const dir of ADR_DIRS) {
    for (const f of ctx.listTree(dir, { exts: MD_EXTS })) {
      if (!seen.has(f.rel)) { seen.add(f.rel); files.push(f); }
    }
  }
  return files.sort((a, b) => byString(a.rel, b.rel));
}

module.exports = {
  ADR_DIRS,
  H2_RE,
  MD_EXTS,
  adrFiles,
  childrenOf,
  designColors,
  designMdPath,
  frontMatter,
  scanMarkdown,
  topLevel,
  yamlEntries,
};
