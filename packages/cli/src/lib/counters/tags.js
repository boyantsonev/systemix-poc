"use strict";

/**
 * tags.js — reading JSX/markup tags and component definitions out of source text, for
 * the primitives counters: where an opening tag ends (`tagEnd`) and the text of the
 * definition that starts at a `function` / `const` keyword (`bodyReader`, `definitionBody`),
 * found with the same tokenizer the import graph uses so a keyword inside a comment, a
 * string or markup text is not a definition. Bounded: a tag is read to at most MAX_TAG
 * characters, and a file's definition bodies are sliced within a budget proportional to
 * its size, so a hostile file costs a fixed amount per tag and per definition.
 *
 * Not a group: it exports no `run`.
 */

const { lex } = require("./graph");

const MAX_TAG = 4000;

/* ------------------------------------------------------- tag text helpers */

function skipString(text, i, limit) {
  const q = text[i];
  for (let j = i + 1; j < limit; j++) {
    if (text[j] === "\\") j++;
    else if (text[j] === q) return j;
  }
  return limit;
}

function skipTemplate(text, i, limit) {
  for (let j = i + 1; j < limit; j++) {
    const c = text[j];
    if (c === "\\") j++;
    else if (c === "`") return j;
    else if (c === "$" && text[j + 1] === "{") j = skipBraces(text, j + 1, limit);
  }
  return limit;
}

function skipBraces(text, i, limit) {
  let depth = 0;
  for (let j = i; j < limit; j++) {
    const c = text[j];
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return j; }
    else if (c === '"' || c === "'") j = skipString(text, j, limit);
    else if (c === "`") j = skipTemplate(text, j, limit);
    else if (c === "/" && text[j + 1] === "*") { const e = text.indexOf("*/", j + 2); j = e === -1 || e > limit ? limit : e + 1; }
    else if (c === "/" && text[j + 1] === "/") { const e = text.indexOf("\n", j); j = e === -1 || e > limit ? limit : e; }
  }
  return limit;
}

/**
 * Index of the ">" that closes the opening tag whose name ends at `from`. The
 * scan stops at `stop` (the next tag of the same name: one tag cannot contain
 * another `<button`), so a file of unclosed tags is read once, not once per tag.
 */
function tagEnd(text, from, stop = text.length) {
  const limit = Math.min(text.length, from + MAX_TAG, stop);
  for (let j = from; j < limit; j++) {
    const c = text[j];
    if (c === ">") return j;
    if (c === "{") j = skipBraces(text, j, limit);
    else if (c === '"' || c === "'") j = skipString(text, j, limit);
  }
  return limit;
}

/* ----------------------------------------------------- definition helpers */

// words after which an expression is not finished, so a line break there does not end a statement
const OPERATOR_WORDS = new Set([
  "typeof", "instanceof", "in", "of", "void", "delete", "new", "await", "yield", "as", "satisfies", "extends", "keyof", "is",
  "return", "throw", "case", "else", "do",
]);
// tokens that continue an expression when they start the next line (JavaScript inserts no semicolon before them)
const CONTINUING = new Set([".", "?", ":", ",", "=", "+", "-", "*", "/", "%", "&", "|", "^", "<", ">", "(", "["]);
const CONTINUING_WORDS = new Set(["as", "satisfies", "in", "instanceof"]);
// the work a file may spend slicing definition bodies: its own size times this, but at least 1 MiB
const BODY_BUDGET_FACTOR = 16;
const BODY_BUDGET_MIN = 1 << 20;

/** Token streams plus bracket pairing: "(" "[" "{" with their closers, a template "T" with its tail "e", an element "J" with its end "x". */
function tokenize(text) {
  const t = lex(text, { jsx: true, offsets: true });
  const len = t.kind.length;
  const match = new Int32Array(len).fill(-1);
  const stack = [];
  for (let j = 0; j < len; j++) {
    const k = t.kind[j];
    const v = t.val[j];
    if (k === "T" || k === "J" || (k === "p" && (v === "(" || v === "[" || v === "{"))) {
      stack.push(j);
    } else if (stack.length) {
      const top = stack[stack.length - 1];
      const tk = t.kind[top];
      const tv = t.val[top];
      const pairs = k === "e" ? tk === "T"
        : k === "x" ? tk === "J"
          : k === "p" && ((v === ")" && tv === "(") || (v === "]" && tv === "[") || (v === "}" && tv === "{"));
      if (pairs) { stack.pop(); match[top] = j; match[j] = top; }
    }
  }
  return { text, kind: t.kind, val: t.val, from: t.from, to: t.to, match, len };
}

/** Index of the token starting at offset `at`, or -1 (the offset is inside a comment, a string or markup text). */
function tokenAt(t, at) {
  let lo = 0;
  let hi = t.len - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (t.from[mid] < at) lo = mid + 1;
    else if (t.from[mid] > at) hi = mid - 1;
    else return t.kind[mid] === "i" ? mid : -1;
  }
  return -1;
}

/**
 * Index of the last token of the declaration whose first token is `k`, or -1
 * when it cannot be told. A `function` declaration ends at the `}` that closes
 * its body (generics, parameters and a return type — object types included —
 * are skipped as bracket groups). A `const` declaration ends at the first `;`
 * outside any bracket, at the end of the enclosing block, or at a line break
 * after a finished expression that the next line does not continue.
 */
function declarationEnd(t, k) {
  const { kind, val, from, to, match, len } = t;
  const isP = (j, ch) => kind[j] === "p" && val[j] === ch;
  const opener = (j) => kind[j] === "T" || kind[j] === "J" || (kind[j] === "p" && (val[j] === "(" || val[j] === "[" || val[j] === "{"));
  const closer = (j) => kind[j] === "p" && (val[j] === ")" || val[j] === "]" || val[j] === "}");
  const arrowHead = (j) => isP(j, ">") && isP(j - 1, "=") && to[j - 1] === from[j];

  // the ">" that closes the "<" at j, or -1
  const angleEnd = (j) => {
    let d = 0;
    for (; j < len; j++) {
      if (opener(j)) { j = match[j]; if (j < 0) return -1; continue; }
      if (isP(j, "<")) d++;
      else if (isP(j, ">")) { if (!arrowHead(j) && --d === 0) return j; }
      else if (closer(j) || isP(j, ";")) return -1;
    }
    return -1;
  };
  const complete = (j) => {
    if (kind[j] === "i") return !OPERATOR_WORDS.has(val[j]);
    if (kind[j] === "p") return val[j] === ")" || val[j] === "]" || val[j] === "}" || (val[j] === ">" && !arrowHead(j));
    return true;
  };
  const continues = (j) => {
    if (kind[j] === "p") return CONTINUING.has(val[j]);
    if (kind[j] === "i") return CONTINUING_WORDS.has(val[j]);
    return kind[j] === "t" || kind[j] === "T";
  };

  const initializerEnd = (start) => {
    let nl = -1;
    for (let j = start; j < len;) {
      if (isP(j, ";")) return j;
      if (closer(j)) return j - 1;
      const last = opener(j) ? match[j] : j;
      if (last < 0) return -1;
      const next = last + 1;
      if (next >= len) return last;
      if (isP(next, ";")) return next;
      if (closer(next)) return last;
      if (nl < to[last]) { nl = t.text.indexOf("\n", to[last]); if (nl === -1) nl = Infinity; }
      if (nl < from[next] && complete(last) && !continues(next)) return last;
      j = next;
    }
    return len - 1;
  };

  let j = k;
  if (val[j] === "async") j++;
  if (val[j] === "function") {
    j++;
    if (isP(j, "*")) j++;
    j++; // the name
    if (isP(j, "<")) { j = angleEnd(j); if (j < 0) return -1; j++; }
    if (!isP(j, "(") || match[j] < 0) return -1;
    j = match[j] + 1;
    if (isP(j, ":")) {
      for (j++; j < len; j++) {
        if (isP(j, "{")) {
          const p = j - 1;
          const typeLiteral = isP(p, ":") || isP(p, "|") || isP(p, "&") || isP(p, "<") || isP(p, ",") || isP(p, "(") || isP(p, "[") || arrowHead(p);
          if (!typeLiteral) break;
        }
        if (opener(j)) { j = match[j]; if (j < 0) return -1; } else if (isP(j, "<")) { j = angleEnd(j); if (j < 0) return -1; } else if (isP(j, ";")) return j;
      }
    }
    if (isP(j, ";")) return j;
    return isP(j, "{") ? match[j] : -1;
  }
  if (val[j] !== "const") return -1;
  for (j += 2; j < len && !(isP(j, "=") && !isP(j + 1, ">")); j++) { // the name, then an optional type annotation up to "="
    if (opener(j)) { j = match[j]; if (j < 0) return -1; } else if (isP(j, "<")) { j = angleEnd(j); if (j < 0) return -1; } else if (isP(j, ";") || closer(j)) return -1;
  }
  return j < len ? initializerEnd(j + 1) : -1;
}

/**
 * A reader of definition bodies for one file's text: `bodyAt(kw)` →
 * `{ body }`, or `{ skip }` with the reason the body could not be taken —
 * "not_code" (the keyword sits in a comment, string or markup text), "extent"
 * (the end of the declaration could not be found) or "budget" (the file's
 * slicing budget is spent).
 */
function bodyReader(text) {
  let tokens = null;
  let spent = 0;
  const budget = Math.max(BODY_BUDGET_MIN, BODY_BUDGET_FACTOR * text.length);
  return function bodyAt(kw) {
    if (!tokens) tokens = tokenize(text);
    const k = tokenAt(tokens, kw);
    if (k < 0) return { skip: "not_code" };
    const end = declarationEnd(tokens, k);
    if (end < k) return { skip: "extent" };
    const size = tokens.to[end] - kw;
    if (spent + size > budget) return { skip: "budget" };
    spent += size;
    return { body: text.slice(kw, tokens.to[end]) };
  };
}

/** Body of the definition whose keyword starts at `kw` (see the module header), or null when it cannot be taken. */
function definitionBody(text, kw) {
  const r = bodyReader(text)(kw);
  return r.body ?? null;
}

module.exports = { MAX_TAG, bodyReader, definitionBody, tagEnd };
