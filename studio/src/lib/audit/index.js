"use strict";

// audit(root, { dirs, primitives }) → the audit JSON (SPEC.md § audit). Read-only, deterministic,
// no model: every number in the report is counted here.
//
// What is read:
//   files      .ts .tsx .js .jsx .mjs .cjs .css .scss .vue .svelte .html under the dirs, minus
//              tests, type declarations, minified files and build or dependency folders
//   ui         .tsx .jsx .vue .svelte .html          styles  .css .scss
//   drift      critical  a raw colour in a component (a ui file, or any file under a primitives path)
//              warning   a raw px font-size, or an arbitrary Tailwind value such as text-[13px]
//              info      a raw colour or px spacing in a plain stylesheet
//   Custom property declarations (--x: #fff) define tokens, so they are palette, never drift.

const fs = require("fs");
const path = require("path");
const { declarations, styleBlocks, lineAt } = require("./css");
const { colourRe, isColour, normalize } = require("./colour");
const sources = require("./sources");

const DEFAULT_DIRS = ["src", "app", "components", "lib", "packages", "pages", "styles"];
const DEFAULT_PRIMITIVES = ["components/ui/", "ui/", "primitives/"];
const SKIP_DIRS = new Set(["node_modules", "dist", "build", "out", "coverage", "vendor", "generated", "__generated__"]);
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".scss", ".vue", ".svelte", ".html", ".htm"]);
const UI = new Set([".tsx", ".jsx", ".vue", ".svelte", ".html", ".htm"]);
const STYLES = new Set([".css", ".scss"]);
const COMPONENT_EXTS = new Set([".tsx", ".jsx", ".vue", ".svelte"]);
const SKIP_FILE = /\.(test|spec|stories)\.[^.]+$|\.d\.ts$|\.min\.[^.]+$/;

const COLOUR_PROPS = /^(color|background|background-color|background-image|border|border-(top|right|bottom|left|block|inline)(-color)?|border-color|outline|outline-color|fill|stroke|box-shadow|text-shadow|text-decoration-color|caret-color|accent-color|column-rule|column-rule-color)$/;
const SPACING_PROPS = /^(margin|padding)(-(top|right|bottom|left|block|inline)(-(start|end))?)?$|^(gap|row-gap|column-gap|inset)$/;
const LENGTH = /^-?\d*\.?\d+(px|rem|em)$/;
const TYPE_TOKEN = /^--(font-size|text)-/;
const SPACE_TOKEN = /^--(space|spacing)-/;
const SPACING_UTIL = /^(p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y)$/;

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const toPosix = (p) => p.split(path.sep).join("/");

/** Every readable file under the dirs, repo-relative and sorted. */
function walk(root, dirs) {
  const out = [];
  const visit = (abs) => {
    const st = fs.lstatSync(abs);
    if (st.isSymbolicLink()) return;
    if (st.isDirectory()) {
      for (const e of fs.readdirSync(abs).sort()) if (!e.startsWith(".") && !SKIP_DIRS.has(e)) visit(path.join(abs, e));
    } else if (st.isFile() && EXTS.has(path.extname(abs).toLowerCase()) && !SKIP_FILE.test(abs)) out.push(toPosix(path.relative(root, abs)));
  };
  for (const d of dirs) visit(path.join(root, d));
  return [...new Set(out)].sort();
}

const underPrimitives = (file, primitives) => primitives.some((p) => ("/" + file).includes("/" + p.replace(/^\/+/, "")));

/** Component names a file defines: exported PascalCase functions, consts and classes, and a PascalCase file name. */
function componentNames(file, text) {
  const names = new Set();
  const re = /export\s+(?:default\s+)?(?:async\s+)?(?:function|const|class)\s+([A-Z][A-Za-z0-9]*)/g;
  let m;
  while ((m = re.exec(text))) names.add(m[1]);
  const base = path.basename(file, path.extname(file));
  if (/^[A-Z][A-Za-z0-9]*$/.test(base)) names.add(base);
  return [...names].sort();
}

function tally(map, key, file) {
  const e = map.get(key) || { count: 0, files: new Set() };
  e.count++;
  if (file) e.files.add(file);
  map.set(key, e);
}

/** A length in px for ordering ties (rem and em at 16px); NaN for anything else. */
const px = (v) => (/rem$|em$/.test(v) ? parseFloat(v) * 16 : parseFloat(v));
const byLength = (a, b) => {
  const x = px(a);
  const y = px(b);
  return Number.isFinite(x) && Number.isFinite(y) && x !== y ? x - y : cmp(a, b);
};

const sortCounts = (map, withFiles) =>
  [...map.entries()]
    .map(([value, e]) => (withFiles ? { value, count: e.count, files: [...e.files].sort() } : { value, count: e.count }))
    .sort((a, b) => b.count - a.count || (withFiles ? cmp(a.value, b.value) : byLength(a.value, b.value)));

function audit(root, { dirs = null, primitives = DEFAULT_PRIMITIVES } = {}) {
  const useDirs = (dirs && dirs.length ? dirs : DEFAULT_DIRS.filter((d) => fs.existsSync(path.join(root, d)) && fs.statSync(path.join(root, d)).isDirectory())).map((d) => toPosix(d).replace(/\/+$/, ""));
  const files = walk(root, useDirs);
  const src = sources.find(root, { scanned: files });
  const sourceFiles = new Set(src.all.map((s) => s.file));
  if (src.tailwind) sourceFiles.add(src.tailwind.file);

  const palette = new Map();
  const typeScale = new Map();
  const spacing = new Map();
  const drift = { critical: [], warning: [], info: [] };
  let colourRefs = 0;
  let literalColours = 0;
  const literalUses = new Map(); // normalized colour → [file] (uses outside token definitions)

  // colour names a reference can point at: token-source colours and Tailwind colours wired to tokens
  const colourTokens = new Set();
  for (const s of src.all) {
    if (s.kind !== "css-vars") continue;
    const byName = new Map(s.defs.map((d) => [d.name, d.value]));
    const resolves = (name, depth = 0) => {
      const v = byName.get(name);
      if (v === undefined || depth > 10) return false;
      if (isColour(v)) return true;
      const m = /^var\(\s*(--[\w-]+)/.exec(v);
      return !!m && resolves(m[1], depth + 1);
    };
    for (const name of byName.keys()) if (resolves(name)) colourTokens.add(name);
  }
  const tailwindColours = src.tailwind && src.tailwind.wired ? new Set(src.tailwind.colourNames) : new Set();

  const addPalette = (raw, file) => {
    const n = normalize(raw);
    if (n) tally(palette, n, file);
    return n;
  };
  const push = (sev, file, line, match, kind) => drift[sev].push({ file, line, match: match.trim().slice(0, 120), kind });

  // the token sources themselves: palette, type scale and spacing definitions
  for (const s of src.all) {
    if (files.includes(s.file)) continue; // scanned below
    for (const d of s.defs) {
      const v = String(d.value);
      if (isColour(v)) addPalette(v, s.file);
      if (!LENGTH.test(v)) continue;
      const json = s.kind === "tokens-json";
      if (json ? /(^|\.)(font-?size|text|type)(\.|$)/i.test(d.name) : TYPE_TOKEN.test(d.name)) tally(typeScale, v);
      if (json ? /(^|\.)(space|spacing)(\.|$)/i.test(d.name) : SPACE_TOKEN.test(d.name)) tally(spacing, v);
    }
  }
  // a Tailwind config that is not a token source still holds the colours someone chose
  if (src.tailwind && !src.tailwind.wired) for (const d of src.tailwind.defs) if (isColour(d.value)) addPalette(d.value, src.tailwind.file);

  const componentsByName = new Map();
  const primitivesList = [];
  const images = { total: 0, withoutAlt: 0 };
  let ui = 0;
  let styles = 0;

  const scanCss = (file, css, offset, full, { component }) => {
    for (const d of declarations(css, offset, full)) {
      const isDef = d.prop.startsWith("--");
      if (isDef) {
        if (TYPE_TOKEN.test(d.prop) && LENGTH.test(d.value)) tally(typeScale, d.value);
        if (SPACE_TOKEN.test(d.prop) && LENGTH.test(d.value)) tally(spacing, d.value);
        const re = colourRe();
        let c;
        while ((c = re.exec(d.value))) addPalette(c[1], file);
        continue;
      }
      // references
      const refs = d.value.match(/var\(\s*--[\w-]+/g) || [];
      for (const r of refs) {
        const name = r.replace(/^var\(\s*/, "");
        if (colourTokens.has(name) || COLOUR_PROPS.test(d.prop)) colourRefs++;
      }
      // literal colours (skip url(...) contents)
      const value = d.value.replace(/url\([^)]*\)/g, (m) => " ".repeat(m.length));
      const re = colourRe();
      let c;
      while ((c = re.exec(value))) {
        const n = addPalette(c[1], file);
        if (!n) continue;
        literalColours++;
        literalUses.set(n, [...(literalUses.get(n) || []), file]);
        const line = lineAt(full, d.valueIndex + c.index);
        push(component ? "critical" : "info", file, line, `${d.prop}: ${d.value}`, "raw-colour");
      }
      if (d.prop === "font-size" && LENGTH.test(d.value)) {
        tally(typeScale, d.value);
        if (d.value.endsWith("px")) push("warning", file, d.line, `${d.prop}: ${d.value}`, "px-font-size");
      }
      if (SPACING_PROPS.test(d.prop)) {
        for (const part of d.value.split(/\s+/)) {
          if (!LENGTH.test(part) || /^-?0+(\.0+)?[a-z]+$/.test(part)) continue;
          tally(spacing, part);
          if (part.endsWith("px")) push("info", file, d.line, `${d.prop}: ${d.value}`, "raw-spacing");
        }
      }
    }
  };

  const scanCode = (file, text, { component }) => {
    // arbitrary Tailwind values: bg-[#7c3aed], text-[13px], p-[12px]
    const arb = /(?<![\w-])((?:[a-z]+:)*)([a-z]+(?:-[a-z]+)*)-\[([^\]\s"'`]+)\]/g;
    const taken = [];
    let m;
    while ((m = arb.exec(text))) {
      const util = m[2];
      const value = m[3];
      const line = lineAt(text, m.index);
      if (isColour(value)) {
        const n = addPalette(value, file);
        if (!n) continue;
        literalColours++;
        literalUses.set(n, [...(literalUses.get(n) || []), file]);
        push(component ? "critical" : "warning", file, line, m[0], "arbitrary-colour");
        taken.push([m.index, m.index + m[0].length]);
      } else if (/^(-?\d|\.\d|var\(|calc\()/.test(value)) {
        if (util === "text" && LENGTH.test(value)) tally(typeScale, value);
        if (SPACING_UTIL.test(util) && LENGTH.test(value)) tally(spacing, value);
        if (/^var\(--/.test(value) && /^(bg|text|border|fill|stroke|ring|outline|from|via|to|decoration|accent|caret)$/.test(util)) colourRefs++;
        push("warning", file, line, m[0], "arbitrary-value");
      }
    }
    // a colour as a whole string literal: style={{ color: "#fff" }}, const brand = "rgb(…)"
    const lit = /(["'`])\s*(#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch|oklab)\([^"'`()]*\))\s*\1/g;
    while ((m = lit.exec(text))) {
      if (taken.some(([a, b]) => m.index >= a && m.index < b)) continue;
      if (/\b(href|id|to|htmlFor|for|xlinkHref)\s*=\s*\{?\s*$/.test(text.slice(Math.max(0, m.index - 20), m.index))) continue;
      const n = addPalette(m[2], file);
      if (!n) continue;
      literalColours++;
      literalUses.set(n, [...(literalUses.get(n) || []), file]);
      push(component ? "critical" : "info", file, lineAt(text, m.index), m[0], "raw-colour");
    }
    // tailwind classes that name a colour wired to tokens: bg-primary, text-muted-foreground
    if (tailwindColours.size) {
      const cls = /(?<![\w-])(?:bg|text|border|ring|fill|stroke|outline|from|via|to|decoration|accent|caret)-([a-z][\w-]*)/g;
      while ((m = cls.exec(text))) if (tailwindColours.has(m[1])) colourRefs++;
    }
    // var(--token) used in code (inline styles, CSS-in-JS)
    const v = /var\(\s*(--[\w-]+)/g;
    while ((m = v.exec(text))) if (colourTokens.has(m[1]) && !taken.some(([a, b]) => m.index >= a && m.index < b)) colourRefs++;
  };

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const text = fs.readFileSync(path.join(root, file), "utf8");
    const isUi = UI.has(ext);
    const isStyle = STYLES.has(ext);
    if (isUi) ui++;
    if (isStyle) styles++;
    if (sourceFiles.has(file) && !isStyle) continue;
    const component = COMPONENT_EXTS.has(ext) || underPrimitives(file, primitives);
    if (isStyle) scanCss(file, text, 0, text, { component: underPrimitives(file, primitives) });
    else {
      if (isUi) for (const b of styleBlocks(text)) scanCss(file, b.css, b.offset, text, { component });
      if (isUi || /\.(js|jsx|ts|mjs|cjs)$/.test(ext)) scanCode(file, text, { component });
    }
    if (isUi) {
      const tag = /<(img|Image)\b([^>]*)>/g;
      let m;
      while ((m = tag.exec(text))) {
        images.total++;
        if (!/(^|\s)alt\s*=/.test(m[2])) images.withoutAlt++;
      }
    }
    if (COMPONENT_EXTS.has(ext)) {
      for (const name of componentNames(file, text)) {
        const dirs = componentsByName.get(name) || new Map();
        dirs.set(path.posix.dirname(file), [...(dirs.get(path.posix.dirname(file)) || []), file]);
        componentsByName.set(name, dirs);
        if (underPrimitives(file, primitives)) primitivesList.push({ name, file });
      }
    }
  }

  for (const k of Object.keys(drift)) drift[k].sort((a, b) => cmp(a.file, b.file) || a.line - b.line || cmp(a.match, b.match) || cmp(a.kind, b.kind));

  const duplicates = [...componentsByName.entries()]
    .filter(([, dirs]) => dirs.size >= 2)
    .map(([name, dirs]) => ({ name, files: [...dirs.values()].flat().sort() }))
    .sort((a, b) => cmp(a.name, b.name));
  primitivesList.sort((a, b) => cmp(a.name, b.name) || cmp(a.file, b.file));

  const tokenSource = src.primary ? { file: src.primary.file, kind: src.primary.kind, count: src.primary.count } : { file: null, kind: "none", count: 0 };
  const share = colourRefs + literalColours ? Math.round((colourRefs / (colourRefs + literalColours)) * 100) / 100 : 0;
  const setupClass = tokenSource.kind === "none" ? "fresh" : drift.critical.length > 0 || share < 0.6 ? "partial" : "mature";

  // contradictions code can see
  const openQuestions = [];
  if (src.all.length > 1) openQuestions.push(`There are ${src.all.length} token sources (${src.all.map((s) => `${s.file}, ${s.kind}`).join("; ")}): which one is canonical?`);
  if (src.tailwind && !src.tailwind.wired && src.tailwind.colourNames.length) openQuestions.push(`${src.tailwind.file} names ${src.tailwind.colourNames.length} colours with raw values (${src.tailwind.colourNames.join(", ")}): are these the brand's colours, and which roles do they play?`);
  const ts = sortCounts(typeScale, false);
  const pxSizes = ts.filter((t) => t.value.endsWith("px")).length;
  const remSizes = ts.filter((t) => /r?em$/.test(t.value)).length;
  if (pxSizes && remSizes) openQuestions.push(`Font sizes are set in both px (${pxSizes} sizes) and rem (${remSizes} sizes): which type scale is the real one?`);
  for (const d of duplicates) openQuestions.push(`${d.name} is defined in ${d.files.length} places (${d.files.join(", ")}): which one is canonical?`);
  const tokenValues = new Map();
  for (const s of src.all) {
    const byName = new Map(s.defs.map((d) => [d.name, String(d.value)]));
    for (const [name, value] of byName) {
      const n = isColour(value) ? normalize(value) : null;
      if (n && !tokenValues.has(n)) tokenValues.set(n, `${name} in ${s.file}`);
    }
  }
  for (const [value, uses] of [...literalUses.entries()].sort((a, b) => cmp(a[0], b[0]))) {
    if (tokenValues.has(value)) openQuestions.push(`${value} is written raw ${uses.length === 1 ? "once" : `${uses.length} times`} (${[...new Set(uses)].sort().join(", ")}) but is already the token ${tokenValues.get(value)}: should those uses read the token?`);
  }
  if (tokenSource.kind === "none" && literalColours > 0) openQuestions.push(`There is no token source and ${palette.size} distinct colours are written raw: which of them are the brand's?`);

  return {
    version: 1,
    root,
    dirs: useDirs,
    files: { scanned: files.length, ui, styles },
    tokenSource,
    palette: sortCounts(palette, true),
    typeScale: ts,
    spacing: sortCounts(spacing, false),
    drift,
    driftCounts: { critical: drift.critical.length, warning: drift.warning.length, info: drift.info.length },
    duplicates,
    primitives: primitivesList,
    images,
    setupClass,
    tokenCoverage: { colourRefs, literalColours, share },
    openQuestions,
  };
}

module.exports = { audit, walk, componentNames, DEFAULT_DIRS, DEFAULT_PRIMITIVES };
