"use strict";

/**
 * css.js — the token source as css, parsed ONCE per run (lib/css-parse.js) and shared
 * by every group that reads it: tokens (the inventory), colour (which hex values are
 * tokens), typography (the --font-size-* values and the type token families), docs and
 * decisions (token records and DESIGN.md colours against what the source declares),
 * guardrails (the page background for a contrast claim). One parse means one answer to
 * "what does the token source declare", whichever counter asks.
 *
 *   tokenCss(ctx)   the parsed source: every custom-property declaration (name, value,
 *                   line, the kind of rule it sits in) and every rule that holds one
 *   tokenThemes(ctx) the declared values by theme: light / dark / @theme, last one wins
 *   declaredHexSet(ctx) the hex values the custom properties are declared with
 *
 * Rule kinds (one classifier, so "dark" means the same thing everywhere):
 *   theme   an `@theme` (or `@theme inline`) rule
 *   dark    a rule whose selector is, or lists, the dark theme: `.dark`, `:root.dark`,
 *           `html.dark`, `[data-theme=dark]`, `[data-mode=dark]`, or a `:root` / `html`
 *           / `body` rule inside `@media (prefers-color-scheme: dark)`. A descendant
 *           rule such as `.dark .card` is component-local, not the dark theme
 *   root    any other rule that names `:root`
 *   other   every other rule (component-local), and a declaration outside every rule
 * An at-rule wrapper (@layer, @media, @supports, @container, @scope, @starting-style,
 * @document) is transparent: its declarations belong to the nearest enclosing rule that
 * is not a wrapper.
 */

const { MAX_CSS_DEPTH, THEME_RE, blankComments, parseCss } = require("../css-parse");
const { canonicalHex, normalizeHex } = require("./util");

const WRAPPER_RE = /^@(?:layer|media|supports|container|scope|starting-style|document)\b/;
const DARK_SEL_RE = /^(?:html|:root|body)?(?:\.dark|\[data-(?:theme|mode)=["']?dark["']?\])$/;
const LIGHT_SEL_RE = /^(?:(?::root|html|body)(?:\.light|\[data-(?:theme|mode)=["']?light["']?\])?|\.light|\[data-(?:theme|mode)=["']?light["']?\])$/;
const ROOTISH_PREFIX_RE = /^(?::root|html|body)(?![\w-])/;
const ROOT_RE = /:root\b/;
const HEX_LITERAL_RE = /#[0-9a-fA-F]{3,8}\b/g;
const VAR_ONLY_RE = /^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)$/;

/** Trimmed, without a trailing `!important` (manual: a `\s*` regex would go quadratic on long blank runs). */
function stripImportant(value) {
  const v = value.trim();
  return /!important$/i.test(v) ? v.slice(0, -10).trimEnd() : v;
}

/** A css value string made comparable: whitespace collapsed, `!important` / a trailing `;` / one pair of quotes dropped, hex lower-cased and expanded. */
function normValue(value) {
  let v = String(value ?? "").trim();
  for (let prev = null; prev !== v;) {
    prev = v;
    v = stripImportant(v);
    while (v.endsWith(";")) v = v.slice(0, -1).trimEnd();
  }
  if (v.length >= 2 && /^(["']).*\1$/.test(v)) v = v.slice(1, -1).trim();
  v = v.replace(/\s+/g, " ");
  return v.replace(/#[0-9a-fA-F]{3,8}(?![\w-])/g, canonicalHex);
}

/** Which theme(s) a rule's declarations define: {theme, dark, light}. */
function classify(rule) {
  const none = { theme: false, dark: false, light: false };
  if (THEME_RE.test(rule.selector)) return { ...none, theme: true };
  let darkMedia = false;
  for (const p of rule.chain) {
    if (/^@layer\b/i.test(p)) continue;
    if (/^@media\b[^{]*prefers-color-scheme\s*:\s*dark/i.test(p)) { darkMedia = true; continue; }
    return none;
  }
  if (rule.selector.startsWith("@")) return none;
  const items = rule.selector.includes("(") ? [rule.selector.trim()] : rule.selector.split(",").map((s) => s.trim());
  const dark = items.some((s) => DARK_SEL_RE.test(s) || (darkMedia && ROOTISH_PREFIX_RE.test(s)));
  const light = !darkMedia && items.some((s) => LIGHT_SEL_RE.test(s));
  return { theme: false, dark, light };
}

/** The rule a declaration belongs to: the rule itself unless it is an at-rule wrapper, then its nearest non-wrapper ancestor (null: none). */
function owner(rule, byId) {
  if (!WRAPPER_RE.test(rule.selector)) return rule;
  for (let i = rule.parents.length - 1; i >= 0; i--) {
    const parent = byId[rule.parents[i]];
    if (!WRAPPER_RE.test(parent.selector)) return parent;
  }
  return null;
}

/** "theme" | "dark" | "root" | "other" for an owning rule (see the header). */
function kindOf(rule) {
  if (!rule) return "other";
  const c = classify(rule);
  if (c.theme) return "theme";
  if (c.dark) return "dark";
  if (ROOT_RE.test(rule.selector)) return "root";
  return "other";
}

/**
 * The parsed token source, once per context.
 * @returns {{
 *   rel: string|null, text: string, clean: string, tooDeep: number,
 *   rules: object[],
 *   decls: {name:string, value:string, line:number, kind:string, block:number}[],
 *   blocks: {id:number, selector:string, kind:string, startLine:number, endLine:number, declarations:number}[]
 * }} text = the file as read; clean = the same with comments blanked; decls in source order
 *   (`block` = id of the owning rule, -1 outside every rule); blocks = the owning rules that hold at least one declaration
 */
function tokenCss(ctx) {
  return ctx.memo("css:token", () => {
    const ts = ctx.tokenSource;
    const text = ts && ts.abs ? ctx.read(ts.abs) : "";
    const { rules, loose, tooDeep } = parseCss(text);
    if (tooDeep && typeof ctx.warn === "function") {
      ctx.warn(`${ts.rel}: ${tooDeep} css rule(s) nested deeper than ${MAX_CSS_DEPTH} levels were not read`);
    }
    const byId = rules;
    const counts = new Map();
    const decls = [];
    for (const rule of rules) {
      const own = owner(rule, byId);
      const kind = kindOf(own);
      for (const d of rule.decls) {
        decls.push({ name: d.name, value: d.value, line: d.line, kind, block: own ? own.id : -1, order: decls.length });
        if (own) counts.set(own.id, (counts.get(own.id) ?? 0) + 1);
      }
    }
    for (const d of loose) decls.push({ name: d.name, value: d.value, line: d.line, kind: "other", block: -1, order: decls.length });
    decls.sort((a, b) => a.line - b.line || a.order - b.order);
    const blocks = rules
      .filter((r) => counts.has(r.id))
      .map((r) => ({ id: r.id, selector: r.selector, kind: kindOf(r), startLine: r.line, endLine: r.endLine, declarations: counts.get(r.id) }));
    return { rel: ts ? ts.rel : null, text, clean: blankComments(text), tooDeep, rules, decls, blocks };
  });
}

/** Normalised (canonicalHex) hex values the token source's custom properties are declared with. */
function declaredHexSet(ctx) {
  return ctx.memo("css:hex", () => {
    const set = new Set();
    for (const d of tokenCss(ctx).decls) for (const hex of d.value.matchAll(HEX_LITERAL_RE)) set.add(canonicalHex(hex[0]));
    return set;
  });
}

/**
 * Declared values of the token source by theme, last declaration in source
 * order winning inside each theme: `light` (:root / html / .light), `dark`
 * (.dark / [data-theme=dark] / prefers-color-scheme: dark), `theme` (@theme),
 * plus `all` (name → every declaration, any block).
 */
function tokenThemes(ctx) {
  return ctx.memo("css:themes", () => {
    const themes = { light: new Map(), dark: new Map(), theme: new Map(), all: new Map(), rules: 0, tooDeep: 0 };
    const css = tokenCss(ctx);
    themes.rules = css.rules.length;
    themes.tooDeep = css.tooDeep;
    for (const rule of css.rules) {
      const c = classify(rule);
      const kind = c.theme ? "theme" : c.dark && c.light ? "light+dark" : c.dark ? "dark" : c.light ? "light" : "other";
      for (const d of rule.decls) {
        const entry = { value: stripImportant(d.value), line: d.line, block: kind };
        if (c.theme) themes.theme.set(d.name, entry);
        if (c.dark) themes.dark.set(d.name, entry);
        if (c.light) themes.light.set(d.name, entry);
        if (!themes.all.has(d.name)) themes.all.set(d.name, []);
        themes.all.get(d.name).push(entry);
      }
    }
    return themes;
  });
}

/** The declaration of `name` that applies in a theme: dark falls back to :root, then @theme. */
function effective(themes, key, name) {
  const own = key === "dark" ? themes.dark.get(name) : undefined;
  if (own) return { ...own, inherited: false };
  const base = themes.light.get(name) ?? themes.theme.get(name);
  return base ? { ...base, inherited: key === "dark" } : null;
}

/** Follow `var(--x)` (with fallback) inside one theme until a literal is left. */
function resolveValue(themes, key, value, depth = 0) {
  const m = VAR_ONLY_RE.exec(String(value).trim());
  if (!m || depth > 8) return String(value).trim();
  const next = effective(themes, key, m[1]);
  if (next) return resolveValue(themes, key, next.value, depth + 1);
  return m[2] !== undefined ? resolveValue(themes, key, m[2], depth + 1) : String(value).trim();
}

/** First of `names` the theme declares → {name, value, hex|null, line, inherited}; null when none. */
function themeColor(themes, key, names) {
  for (const name of names) {
    const eff = effective(themes, key, name);
    if (!eff) continue;
    const value = resolveValue(themes, key, eff.value);
    return { name, value, hex: normalizeHex(value), line: eff.line, inherited: eff.inherited };
  }
  return null;
}

module.exports = {
  HEX_LITERAL_RE,
  THEME_RE,
  blankComments,
  classify,
  declaredHexSet,
  normValue,
  parseCss,
  resolveValue,
  stripImportant,
  themeColor,
  tokenCss,
  tokenThemes,
};
