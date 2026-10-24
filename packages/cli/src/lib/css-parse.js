"use strict";

/**
 * css-parse.js — the one place the custom-property declarations of a css text are
 * found. Shared by the token-source resolver (lib/design-source.js, so `drift scan`
 * and `audit counters` pick the same file) and by every counter that reads the token
 * source (counters/css.js), so "how many custom properties does this file declare"
 * has ONE answer however the file is written: one declaration per line, several on a
 * line (`.dark { --a: #000; --b: #111; }`), minified, or at the top level.
 *
 * A declaration is `--name: value` found at the start of a statement: after `{`, `;`
 * or `}`, or at the start of the text. Comments are blanked first (newlines kept, so
 * line numbers hold) and a commented-out declaration is not one. Quotes and
 * parentheses are skipped, so `url(data:image/png;base64,…)`, `content: "{"` and
 * `@media (min-width: 1px)` cannot split a statement. One linear pass, no
 * backtracking regex; a rule nested deeper than MAX_CSS_DEPTH is skipped and counted
 * in `tooDeep`, so hostile input stays linear.
 */

const MAX_CSS_DEPTH = 32;
const CUSTOM_PROP_NAME_RE = /^--[\w-]+$/;
const THEME_RE = /^@theme\b/i;

/** Same text with every comment blanked to spaces (newlines kept so line numbers hold). Linear. */
function blankComments(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const s = text.indexOf("/*", i);
    if (s === -1) { out += text.slice(i); break; }
    out += text.slice(i, s);
    const e = text.indexOf("*/", s + 2);
    const end = e === -1 ? text.length : e + 2;
    out += text.slice(s, end).replace(/[^\n]/g, " ");
    i = end;
  }
  return out;
}

function declOf(text, line) {
  const idx = text.indexOf(":");
  if (idx < 1) return null;
  const name = text.slice(0, idx).trim();
  if (!CUSTOM_PROP_NAME_RE.test(name)) return null;
  return { name, value: text.slice(idx + 1).trim(), line };
}

/**
 * Rules of a css text, and the declarations that sit outside every rule.
 * Only rules that matter are returned: one that holds a declaration, one that encloses such a rule, and every
 * `@theme` rule (an empty rule is not kept).
 * @returns {{
 *   rules: {id:number, selector:string, chain:string[], parents:number[], decls:{name:string,value:string,line:number}[], line:number, endLine:number}[],
 *   loose: {name:string,value:string,line:number}[],
 *   tooDeep: number
 * }} rules in the order they open (`id` = that position); `chain` = the enclosing preludes,
 *   outermost first, `parents` = their rule ids; only custom-property declarations are kept
 */
function parseCss(text) {
  const src = blankComments(text);
  const rules = [];
  const loose = [];
  const stack = [];
  let tooDeep = 0;
  let over = 0;
  let segStart = 0;
  let segLine = 1;
  let line = 1;
  let paren = 0;
  let quote = "";

  // A rule is recorded the first time it matters: when it holds a declaration, when a rule inside it does, or when
  // it is an @theme rule. A rule with nothing in it is never kept, so a file of "{}" costs a stack frame at a time.
  const record = (depth) => {
    const frame = stack[depth];
    if (frame.rule) return;
    if (depth > 0) record(depth - 1);
    const above = stack.slice(0, depth);
    frame.rule = { id: rules.length, selector: frame.prelude, chain: above.map((f) => f.prelude), parents: above.map((f) => f.rule.id), decls: [], line: frame.line, endLine: frame.line };
    rules.push(frame.rule);
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "\n") line++;
    if (quote) {
      // an unescaped newline ends a string, as in css (a bad string): an unterminated quote cannot swallow the rest of the file
      if (ch === "\\") { if (src[i + 1] === "\n") line++; i++; } else if (ch === quote || ch === "\n") quote = "";
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === "(") { paren++; continue; }
    if (ch === ")") { if (paren) paren--; continue; }
    if (paren || (ch !== "{" && ch !== "}" && ch !== ";")) continue;
    const seg = src.slice(segStart, i);
    const body = seg.trim();
    let at = segLine;
    for (let k = 0, lead = seg.length - seg.trimStart().length; k < lead; k++) if (seg[k] === "\n") at++;
    if (ch === "{") {
      if (stack.length >= MAX_CSS_DEPTH) {
        over++; // past the depth limit a rule is counted, not stacked
      } else {
        stack.push({ prelude: body, line: at, rule: null });
        if (THEME_RE.test(body)) record(stack.length - 1);
      }
    } else {
      if (body && over === 0) {
        const decl = declOf(body, at);
        if (decl) {
          if (stack.length) {
            record(stack.length - 1);
            stack[stack.length - 1].rule.decls.push(decl);
          } else {
            loose.push(decl);
          }
        }
      }
      if (ch === "}") {
        if (over > 0) {
          over--;
          tooDeep++;
        } else {
          const frame = stack.pop();
          if (frame && frame.rule) frame.rule.endLine = line;
        }
      }
    }
    segStart = i + 1;
    segLine = line;
  }
  return { rules, loose, tooDeep };
}

/** Distinct custom-property names a css text declares (see the header for what counts). */
function customProperties(text) {
  const names = new Set();
  const { rules, loose } = parseCss(String(text ?? ""));
  for (const r of rules) for (const d of r.decls) names.add(d.name);
  for (const d of loose) names.add(d.name);
  return names;
}

module.exports = { MAX_CSS_DEPTH, THEME_RE, blankComments, customProperties, parseCss };
