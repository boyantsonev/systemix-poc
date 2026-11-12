"use strict";

// Where a repo keeps its tokens, if anywhere. Candidates, in the order the first one wins:
//   1. design/tokens.css                                          css-vars
//   2. a DTCG tokens file (*tokens*.json with $value leaves)      tokens-json
//   3. a Tailwind config whose theme reads tokens (var(--…) or a required JSON file)
//                                                                 tailwind-config
//   4. any other stylesheet declaring MIN_PROPS or more custom properties
//                                                                 css-vars
// A Tailwind config that holds raw values only is not a token source: its colours are palette input
// and the audit asks whether they are the brand's tokens. Every candidate found is returned, so the
// audit can say when there are two.

const fs = require("fs");
const path = require("path");
const { rel: L } = require("../layout");
const { declarations } = require("./css");
const { isColour } = require("./colour");

const MIN_PROPS = 5;
const TAILWIND = ["tailwind.config.js", "tailwind.config.cjs", "tailwind.config.mjs", "tailwind.config.ts"];
const toPosix = (p) => p.split(path.sep).join("/");

/** Custom properties declared in a stylesheet: [{ name, value, line }]. */
function customProps(text) {
  return declarations(text)
    .filter((d) => d.prop.startsWith("--"))
    .map((d) => ({ name: d.prop, value: d.value, line: d.line }));
}

/** DTCG leaves: [{ path: "color.primary", value, type }]. Inherited $type is applied. */
function dtcgLeaves(obj, prefix = [], inherited = null) {
  const out = [];
  if (!obj || typeof obj !== "object") return out;
  const type = obj.$type || inherited;
  for (const key of Object.keys(obj).sort()) {
    if (key.startsWith("$")) continue;
    const v = obj[key];
    if (v && typeof v === "object" && "$value" in v) out.push({ path: [...prefix, key].join("."), value: v.$value, type: v.$type || type });
    else if (v && typeof v === "object") out.push(...dtcgLeaves(v, [...prefix, key], type));
  }
  return out;
}

function readJson(abs) {
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch {
    return null;
  }
}

/** `key: "value"` pairs in a Tailwind config's theme (string values only). */
function tailwindEntries(text) {
  const at = text.search(/\btheme\s*:/);
  if (at < 0) return [];
  const body = text.slice(at);
  const out = [];
  const re = /["']?([\w-]+)["']?\s*:\s*(["'])([^"'\n]+)\2/g;
  let m;
  while ((m = re.exec(body))) out.push({ name: m[1], value: m[3] });
  return out;
}

/**
 * find(root, { scanned }) → { primary, all[], tailwind|null }
 *   each source: { file, kind, count, colours: [{ name, value }] (raw values), defs: [{ name, value }] }
 * `scanned` is the list of repo-relative files the audit walks (for stylesheets and tokens files).
 */
function find(root, { scanned }) {
  const all = [];
  const seen = new Set();
  const add = (s) => {
    if (seen.has(s.file)) return;
    seen.add(s.file);
    all.push(s);
  };

  // 1. design/tokens.css
  const tokensCss = path.join(root, L.tokens);
  if (fs.existsSync(tokensCss)) {
    const defs = customProps(fs.readFileSync(tokensCss, "utf8"));
    add({ file: L.tokens, kind: "css-vars", count: new Set(defs.map((d) => d.name)).size, defs, rank: 1 });
  }

  // 2. DTCG tokens files: at the root, in design/, and among the scanned files
  const jsonCandidates = new Set();
  for (const dir of [".", L.data]) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) continue;
    for (const f of fs.readdirSync(abs).sort()) if (/tokens.*\.json$/i.test(f)) jsonCandidates.add(toPosix(path.join(dir, f)).replace(/^\.\//, ""));
  }
  for (const f of scanned) if (/(^|\/)[^/]*tokens[^/]*\.json$/i.test(f)) jsonCandidates.add(f);
  for (const f of [...jsonCandidates].sort()) {
    const leaves = dtcgLeaves(readJson(path.join(root, f)));
    if (!leaves.length) continue;
    add({ file: f, kind: "tokens-json", count: leaves.length, defs: leaves.map((l) => ({ name: l.path, value: String(l.value) })), rank: 2 });
  }

  // 3. Tailwind config
  let tailwind = null;
  for (const f of TAILWIND) {
    const abs = path.join(root, f);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, "utf8");
    const entries = tailwindEntries(text);
    const wired = /var\(--/.test(text) || /require\(\s*["'][^"']*\.json["']\s*\)/.test(text);
    const colours = entries.filter((e) => isColour(e.value) || /^var\(--/.test(e.value));
    tailwind = { file: f, wired, colourNames: colours.map((c) => c.name).sort(), defs: entries };
    if (wired) add({ file: f, kind: "tailwind-config", count: entries.length, defs: entries, rank: 3 });
    break;
  }

  // 4. other stylesheets with many custom properties
  for (const f of scanned.filter((x) => /\.(css|scss)$/.test(x)).sort()) {
    if (f === L.tokens) continue;
    const defs = customProps(fs.readFileSync(path.join(root, f), "utf8"));
    const names = new Set(defs.map((d) => d.name));
    if (names.size >= MIN_PROPS) add({ file: f, kind: "css-vars", count: names.size, defs, rank: 4 });
  }

  all.sort((a, b) => a.rank - b.rank || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  return { primary: all[0] || null, all, tailwind };
}

module.exports = { find, customProps, dtcgLeaves, tailwindEntries, MIN_PROPS };
