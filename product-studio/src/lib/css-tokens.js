"use strict";

/**
 * css-tokens.js: read the custom properties of a CSS file, per theme, and resolve var() chains.
 *
 *   readTokens(text) → { light: Map(name → {value,line}), dark: Map, hasDark, order: [name] }
 *     light  :root, html, .light, [data-theme="light"] (outside a dark media query)
 *     dark   .dark, :root.dark, html.dark, [data-theme="dark"], :root[data-theme="dark"], and
 *            :root / html inside @media (prefers-color-scheme: dark)
 *   env(tokens, theme)   the declarations that apply in a theme (dark = light overridden by dark)
 *   resolve(value, env)  → { value } | { error }: var() substituted all the way down, with the
 *                         fallback used for an undefined name and a cycle reported as an error
 *
 * Other selectors are ignored. Comments are blanked so line numbers stay true.
 */

const LIGHT = new Set([":root", "html", ".light", '[data-theme="light"]', ":root.light", 'html[data-theme="light"]', ':root[data-theme="light"]']);
const DARK = new Set([".dark", ":root.dark", "html.dark", '[data-theme="dark"]', ':root[data-theme="dark"]', 'html[data-theme="dark"]', ".dark:root"]);
const ROOTS = new Set([":root", "html"]);

const blankComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
const normSel = (s) => s.trim().replace(/\s+/g, " ").replace(/\[\s*data-theme\s*=\s*'?"?(\w+)'?"?\s*\]/g, '[data-theme="$1"]');
const lineAt = (text, i) => text.slice(0, i).split("\n").length;

/** The rule blocks of a stylesheet: [{ selector, media: [string], body, start }] (body offset `start`). */
function blocks(text) {
  const out = [];
  const walk = (from, to, media) => {
    let i = from;
    let head = from;
    while (i < to) {
      const c = text[i];
      if (c === ";") {
        head = i + 1;
      } else if (c === "{") {
        let depth = 1;
        let j = i + 1;
        while (j < to && depth) {
          if (text[j] === "{") depth++;
          else if (text[j] === "}") depth--;
          j++;
        }
        const prelude = text.slice(head, i).trim();
        if (prelude.startsWith("@")) {
          if (/^@(media|supports|layer|container)\b/i.test(prelude)) walk(i + 1, j - 1, [...media, prelude]);
        } else out.push({ selector: prelude, media, body: text.slice(i + 1, j - 1), start: i + 1 });
        i = j;
        head = j;
        continue;
      } else if (c === "}") head = i + 1;
      i++;
    }
  };
  walk(0, text.length, []);
  return out;
}

const isDarkMedia = (m) => /prefers-color-scheme\s*:\s*dark/i.test(m);
const isLightMedia = (m) => /prefers-color-scheme\s*:\s*light/i.test(m);

function themeOf(block) {
  const sels = block.selector.split(",").map(normSel);
  const darkMedia = block.media.some(isDarkMedia);
  if (darkMedia) return sels.some((s) => ROOTS.has(s) || LIGHT.has(s) || DARK.has(s)) ? "dark" : null;
  if (sels.some((s) => DARK.has(s))) return "dark";
  if (block.media.some(isLightMedia)) return sels.some((s) => ROOTS.has(s) || LIGHT.has(s)) ? "light" : null;
  if (sels.some((s) => LIGHT.has(s))) return "light";
  return null;
}

/** Custom-property declarations in a block body, with their line numbers in the whole text. */
function declarations(text, block) {
  const out = [];
  const re = /(^|;)\s*(--[A-Za-z0-9_-]+)\s*:([^;]*)/g;
  let m;
  while ((m = re.exec(block.body))) {
    const at = m.index + m[0].indexOf(m[2]);
    out.push({ name: m[2], value: m[3].trim(), line: lineAt(text, block.start + at) });
    re.lastIndex = m.index + m[0].length;
  }
  return out;
}

function readTokens(raw) {
  const text = blankComments(raw);
  const light = new Map();
  const dark = new Map();
  const order = [];
  let hasDark = false;
  for (const b of blocks(text)) {
    const theme = themeOf(b);
    if (!theme) continue;
    if (theme === "dark") hasDark = true;
    const into = theme === "dark" ? dark : light;
    for (const d of declarations(text, b)) {
      if (!light.has(d.name) && !dark.has(d.name)) order.push(d.name);
      into.set(d.name, { value: d.value, line: d.line });
    }
  }
  return { light, dark, hasDark, order };
}

/** name → value in a theme: dark is light overridden by dark. */
function env(tokens, theme) {
  const e = new Map();
  for (const [k, v] of tokens.light) e.set(k, v.value);
  if (theme === "dark") for (const [k, v] of tokens.dark) e.set(k, v.value);
  return e;
}

/** Find the first var( … ) in s with balanced parens: { start, end, name, fallback } | null. */
function findVar(s) {
  const i = s.search(/var\(/i);
  if (i < 0) return null;
  let depth = 0;
  for (let j = i + 3; j < s.length; j++) {
    if (s[j] === "(") depth++;
    else if (s[j] === ")") {
      depth--;
      if (depth === 0) {
        const inner = s.slice(i + 4, j);
        const comma = inner.indexOf(",");
        const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
        const fallback = comma < 0 ? null : inner.slice(comma + 1).trim();
        return { start: i, end: j + 1, name, fallback };
      }
    }
  }
  return { start: i, end: s.length, name: null, fallback: null, unclosed: true };
}

/** Substitute every var() in value against env. { value } or { error }. */
function resolve(value, e, stack = []) {
  let s = value;
  for (let guard = 0; guard < 1000; guard++) {
    const v = findVar(s);
    if (!v) return { value: s.trim() };
    if (v.unclosed || !v.name) return { error: `a var() in "${value}" is not closed` };
    let sub;
    if (stack.includes(v.name)) return { error: `var() cycle: ${[...stack, v.name].join(" → ")}` };
    if (e.has(v.name)) {
      const r = resolve(e.get(v.name), e, [...stack, v.name]);
      if (r.error) return r;
      sub = r.value;
    } else if (v.fallback !== null) {
      const r = resolve(v.fallback, e, stack);
      if (r.error) return r;
      sub = r.value;
    } else return { error: `${v.name} is not defined${stack.length ? ` (via ${stack.join(" → ")})` : ""}` };
    s = s.slice(0, v.start) + sub + s.slice(v.end);
  }
  return { error: `"${value}" does not resolve` };
}

/** Resolve a token by name in a theme. */
const resolveToken = (tokens, theme, name) => {
  const e = env(tokens, theme);
  if (!e.has(name)) return { error: `${name} is not defined` };
  return resolve(e.get(name), e, [name]);
};

module.exports = { readTokens, env, resolve, resolveToken, blocks };
