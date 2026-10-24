"use strict";

/**
 * graph.js — the import graph under the reachability and primitives counters: a small
 * tokenizer for ts/tsx/js/jsx/vue/svelte (comments, strings, template literals, regex
 * literals and JSX text are skipped), the import / export-from / literal import() /
 * require() extraction, a resolver for relative paths, tsconfig/jsconfig `paths`
 * aliases, `baseUrl`, extension probing and index files, and the graph with its entry
 * points (see reachability.js for what each counter says about it). Also the JSX tag
 * helpers primitives.js needs (definitionBody, tagEnd), which sit on the same lexer.
 *
 * Not a group: it exports no `run`. Built once per context (ctx.memo).
 */

const path = require("path");
const { byString } = require("./counter");
const PARSE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"]);
const PROBE_EXTS = [".ts", ".tsx", ".d.ts", ".js", ".jsx", ".vue", ".svelte", ".css"];
const OUTSIDE_EXTS = [".mts", ".cts", ".mjs", ".cjs", ".json", ".svg", ".md", ".mdx"];
const COMPONENTS_DIR_RE = /(?:^|\/)components\//;
const COMPONENTS_UI_RE = /(?:^|\/)components\/ui\//;

const APP_ROUTE_NAMES =
  "page|layout|route|loading|error|global-error|not-found|forbidden|unauthorized|template|default|" +
  "sitemap|robots|manifest|opengraph-image|twitter-image|icon|apple-icon";
// matched against the path from an `app/` segment on; a folder whose name starts with "_" is private (not routable)
const APP_ROUTE_RE = new RegExp(`^app/(?:[^/_][^/]*/)*(?:${APP_ROUTE_NAMES})\\.(?:tsx|ts|jsx|js)$`);
const APP_ROUTE_EXTS = [".tsx", ".ts", ".jsx", ".js"];
// a route file in the app directory itself, or directly under (route-group) folders: the sign of a Next app router
const APP_ROOT_ROUTE_RE = new RegExp(`^(?:\\([^/]+\\)/)*(?:${APP_ROUTE_NAMES})\\.(?:tsx|ts|jsx|js)$`);
const NEXT_CONFIG_FILES = ["next.config.js", "next.config.mjs", "next.config.cjs", "next.config.ts", "next.config.mts"];
const MANIFEST_DEP_KEYS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
const PAGES_ROUTE_RE = /^(?:(?:apps|packages)\/[^/]+\/)?(?:src\/)?pages\/.+\.(?:tsx|ts|jsx|js)$/;
const SPECIAL_ENTRY_RE =
  /^(?:(?:apps|packages)\/[^/]+\/)?(?:src\/)?(?:middleware|proxy|instrumentation|instrumentation-client|mdx-components)\.(?:tsx|ts|jsx|js)$/;

const REGEX_PRECEDERS = new Set([
  "return", "typeof", "instanceof", "in", "of", "void", "delete", "new", "case", "do", "else", "yield", "await", "throw",
]);
const JSX_PRECEDERS = new Set([...REGEX_PRECEDERS, "default"]);
const ID_RE = /[A-Za-z_$\u0080-\uFFFF][\w$\u0080-\uFFFF]*/y;
const NUM_RE = /\d[\w.]*/y;
const PACKAGE_NAME_RE = /^(?:@[\w.-]+\/)?[\w.-]+(?:\/|$)/;

/* ------------------------------------------------------------------ lexer */

const CODE = 0;
const TAG = 1;
const TEXT = 2;

const isNameStart = (c) => (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95 || c === 36 || c > 127;
const isNameChar = (c) => isNameStart(c) || (c >= 48 && c <= 58) || c === 45 || c === 46;
const isSpace = (c) => c === 32 || c === 9 || c === 10 || c === 13;
// bytes allowed in the type arguments of a JSX tag name: <Select<Option> />
const TYPE_ARGS_RE = /^[\w\s,.|&[\]<>:'"$-]*$/;
const MAX_TYPE_ARGS = 200;

/**
 * Tokenize just enough JavaScript/TypeScript/JSX to find import statements.
 * Parallel arrays: kind[] is "i" identifier, "s" string, "t" template without
 * substitutions, "T" template with substitutions (its tail is an "e"), "n"
 * number, "r" regex literal, "J" the start of a JSX element (its end is an "x"),
 * "p" single punctuation character. lvl[] is the bracket nesting level at each token; cands[] indexes
 * the import/export/require identifiers. With `offsets`, from[] / to[] hold the
 * start and end offset of every token.
 *
 * Strings and regex literals are closed on the SAME line only, so a stray
 * apostrophe can never swallow more than its own line.
 *
 * JSX (`jsx`, on by default; the graph turns it off for .ts files, where `<T>`
 * is a type assertion or a generic). A `<` where an expression may start, and
 * that opens a well-formed tag, begins an element: its tags and its text are
 * read as markup — brackets, quotes, `//` and backticks in the text mean
 * nothing — and only the `{ … }` containers inside it are read as code. A `<`
 * that does not turn out to be an element (the markup never closes, a closing
 * tag does not match, the tag is not well-formed) is rewound and read as an
 * operator, so TypeScript generics and angle-bracket assertions cost at most a
 * bounded amount of re-reading (about four passes over the file) and then JSX
 * is switched off for the rest of the file.
 */
function lex(text, { jsx = true, offsets = false } = {}) {
  const n = text.length;
  const kind = [];
  const val = [];
  const lvl = [];
  const cands = [];
  const from = offsets ? [] : null;
  const to = offsets ? [] : null;
  const frames = []; // open template substitutions (t: 0) and JSX containers (t: 1)
  const active = []; // JSX roots being read, outermost first
  const noJsx = new Set(); // offsets of a "<" that already failed to parse as JSX
  const noClose = new Map();
  const wasteLimit = 4 * n + 4096;
  let depth = 0;
  let level = 0;
  let i = 0;
  let tplSubst = false;
  let mode = CODE;
  let cur = null; // the JSX root whose tag or text is being read (mode TAG / TEXT)
  let jsxOn = jsx;
  let wasted = 0;

  const emit = (k, v, s, e) => {
    kind.push(k);
    val.push(v);
    lvl.push(level);
    if (offsets) { from.push(s); to.push(e); }
  };

  const closeOnLine = (at, q) => {
    if (at < (noClose.get(q) ?? -1)) return -1;
    for (let j = at + 1; j < n; j++) {
      const c = text.charCodeAt(j);
      if (c === 92) j++;
      else if (c === 10) { noClose.set(q, j); return -1; }
      else if (c === q) return j;
    }
    noClose.set(q, n);
    return -1;
  };

  const regexEnd = (at) => {
    if (at < (noClose.get(47) ?? -1)) return -1;
    let inClass = false;
    for (let j = at + 1; j < n; j++) {
      const c = text.charCodeAt(j);
      if (c === 92) j++;
      else if (c === 10) { noClose.set(47, j); return -1; }
      else if (c === 91) inClass = true;
      else if (c === 93) inClass = false;
      else if (c === 47 && !inClass) return j;
    }
    noClose.set(47, n);
    return -1;
  };

  // index after the closing backtick, or after the next "${" (tplSubst = true)
  const templateBody = (at) => {
    for (let j = at; j < n; j++) {
      const c = text.charCodeAt(j);
      if (c === 92) j++;
      else if (c === 96) { tplSubst = false; return j + 1; }
      else if (c === 36 && text.charCodeAt(j + 1) === 123) { tplSubst = true; return j + 2; }
    }
    tplSubst = false;
    return n;
  };

  const regexAllowed = () => {
    const last = kind.length - 1;
    if (last < 0) return true;
    const k = kind[last];
    if (k === "p") {
      const v = val[last];
      return !(v === ")" || v === "]" || v === "}" || v === "<");
    }
    if (k === "i") return REGEX_PRECEDERS.has(val[last]);
    return false;
  };

  // can an expression (and so an element) start after the previous token?
  const elementAllowed = () => {
    const last = kind.length - 1;
    if (last < 0) return true;
    const k = kind[last];
    if (k === "p") {
      const v = val[last];
      return !(v === ")" || v === "]" || v === "}" || v === "<");
    }
    return k === "i" && JSX_PRECEDERS.has(val[last]);
  };

  /* ------------------------------------------------------------ JSX reader */

  // the opening tag name at the "<" at `at`: { name, end } (end = after the name and any type arguments) or null
  const openingAt = (at) => {
    const d = text.charCodeAt(at + 1);
    let j = at + 1;
    if (d !== 62) {
      if (!isNameStart(d)) return null;
      while (j < n && isNameChar(text.charCodeAt(j))) j++;
    }
    const name = text.slice(at + 1, j);
    if (text.charCodeAt(j) === 60) {
      let depthAngle = 0;
      let k = j;
      for (; k < n && k < j + MAX_TYPE_ARGS; k++) {
        const c = text.charCodeAt(k);
        if (c === 60) depthAngle++;
        else if (c === 62 && --depthAngle === 0) break;
      }
      if (k >= n || depthAngle !== 0 || !TYPE_ARGS_RE.test(text.slice(j, k + 1))) return null;
      j = k + 1;
    }
    return { name, end: j };
  };

  const finishRoot = () => {
    emit("x", null, i - 1, i);
    active.pop();
    cur = null;
    mode = CODE;
  };

  // read the root's markup again as code: the "<" was an operator after all
  const failRoot = (root) => {
    wasted += i - root.snap.i;
    let target = root;
    if (wasted > wasteLimit) { jsxOn = false; target = active[0]; }
    const s = target.snap;
    noJsx.add(s.i);
    kind.length = s.k;
    val.length = s.k;
    lvl.length = s.k;
    if (offsets) { from.length = s.k; to.length = s.k; }
    cands.length = s.c;
    level = s.level;
    depth = s.depth;
    frames.length = s.f;
    i = s.i;
    mode = CODE;
    cur = null;
    active.length = active.indexOf(target);
  };

  const enterContainer = () => {
    frames.push({ t: 1, depth, mode, cur });
    depth = 0;
    level++;
    emit("p", "{", i, i + 1);
    i++;
    mode = CODE;
    cur = null;
  };

  const startElement = () => {
    if (noJsx.has(i)) return false;
    const op = openingAt(i);
    if (!op || !elementAllowed()) return false;
    let k = op.end;
    while (isSpace(text.charCodeAt(k))) k++;
    // <T extends X>(…) => … is a generic arrow function, not an element
    if (text.startsWith("extends", k) && !isNameChar(text.charCodeAt(k + 7))) return false;
    cur = { names: [], tag: op.name, eq: false, snap: { i, k: kind.length, c: cands.length, level, depth, f: frames.length } };
    active.push(cur);
    emit("J", null, i, i + 1);
    mode = TAG;
    i = op.end;
    return true;
  };

  const tagStep = () => {
    for (;;) {
      const c = text.charCodeAt(i);
      if (isSpace(c)) { i++; continue; }
      if (c === 47) {
        const d = text.charCodeAt(i + 1);
        if (d === 42) { const e = text.indexOf("*/", i + 2); if (e === -1) return failRoot(cur); i = e + 2; continue; }
        if (d === 47) { const e = text.indexOf("\n", i + 2); i = e === -1 ? n : e; continue; }
      }
      break;
    }
    if (i >= n) return failRoot(cur);
    const c = text.charCodeAt(i);
    if (cur.eq) {
      if (c === 34 || c === 39) {
        const e = text.indexOf(text[i], i + 1); // attribute strings have no escapes and may span lines
        if (e === -1) return failRoot(cur);
        cur.eq = false;
        i = e + 1;
        return undefined;
      }
      if (c === 123) { cur.eq = false; return enterContainer(); }
      return failRoot(cur);
    }
    if (c === 62) {
      cur.names.push(cur.tag);
      mode = TEXT;
      i++;
      return undefined;
    }
    if (c === 47 && text.charCodeAt(i + 1) === 62) {
      i += 2;
      if (cur.names.length === 0) finishRoot();
      else mode = TEXT;
      return undefined;
    }
    if (c === 123) return enterContainer();
    if (c === 61) { cur.eq = true; i++; return undefined; }
    if (isNameStart(c)) {
      while (i < n && isNameChar(text.charCodeAt(i))) i++;
      return undefined;
    }
    return failRoot(cur);
  };

  const textStep = () => {
    let j = i;
    while (j < n) {
      const c = text.charCodeAt(j);
      if (c === 60 || c === 123) break;
      j++;
    }
    i = j;
    if (j >= n) return failRoot(cur);
    if (text.charCodeAt(j) === 123) return enterContainer();
    if (text.charCodeAt(j + 1) === 47) {
      let k = j + 2;
      while (isSpace(text.charCodeAt(k))) k++;
      const s = k;
      while (k < n && isNameChar(text.charCodeAt(k))) k++;
      const name = text.slice(s, k);
      while (isSpace(text.charCodeAt(k))) k++;
      if (text.charCodeAt(k) !== 62 || cur.names[cur.names.length - 1] !== name) return failRoot(cur);
      cur.names.pop();
      i = k + 1;
      if (cur.names.length === 0) finishRoot();
      return undefined;
    }
    const op = openingAt(j);
    if (!op) return failRoot(cur);
    cur.tag = op.name;
    i = op.end;
    mode = TAG;
    return undefined;
  };

  /* ------------------------------------------------------------- code loop */

  for (;;) {
    while (i < n) {
      if (mode !== CODE) {
        if (mode === TAG) tagStep();
        else textStep();
        continue;
      }
      const c = text.charCodeAt(i);
      if (c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12) { i++; continue; }

      if (c === 47) {
        const d = text.charCodeAt(i + 1);
        if (d === 47) { const e = text.indexOf("\n", i + 2); i = e === -1 ? n : e; continue; }
        if (d === 42) { const e = text.indexOf("*/", i + 2); i = e === -1 ? n : e + 2; continue; }
        if (regexAllowed()) {
          const e = regexEnd(i);
          if (e !== -1) { emit("r", null, i, e + 1); i = e + 1; continue; }
        }
        emit("p", "/", i, i + 1);
        i++;
        continue;
      }

      if (c === 39 || c === 34) {
        const e = closeOnLine(i, c);
        if (e === -1) { i++; continue; }
        emit("s", text.slice(i + 1, e), i, e + 1);
        i = e + 1;
        continue;
      }

      if (c === 96) {
        const e = templateBody(i + 1);
        if (!tplSubst) {
          emit("t", text.slice(i + 1, Math.max(i + 1, e - 1)), i, e);
        } else {
          emit("T", null, i, e);
          frames.push({ t: 0, depth });
          depth = 0;
          level++;
        }
        i = e;
        continue;
      }

      if (c === 123) { level++; depth++; emit("p", "{", i, i + 1); i++; continue; }
      if (c === 125) {
        if (depth === 0 && frames.length) {
          const f = frames[frames.length - 1];
          if (f.t === 1) {
            frames.pop();
            depth = f.depth;
            if (level > 0) level--;
            emit("p", "}", i, i + 1);
            mode = f.mode;
            cur = f.cur;
            i++;
            continue;
          }
          const e = templateBody(i + 1);
          if (!tplSubst) {
            frames.pop();
            depth = f.depth;
            if (level > 0) level--;
            emit("e", null, i, e);
          }
          i = e;
          continue;
        }
        if (depth > 0) depth--;
        if (level > 0) level--;
        emit("p", "}", i, i + 1);
        i++;
        continue;
      }
      if (c === 40 || c === 91) { level++; emit("p", text[i], i, i + 1); i++; continue; }
      if (c === 41 || c === 93) { if (level > 0) level--; emit("p", text[i], i, i + 1); i++; continue; }

      if (c === 60 && jsxOn && startElement()) continue;

      if (isNameStart(c)) {
        ID_RE.lastIndex = i;
        ID_RE.test(text);
        const word = text.slice(i, ID_RE.lastIndex);
        const last = kind.length - 1;
        // a property access `o.require(` has one dot; the dots of a spread `...require(` are not one
        const afterDot = last >= 0 && kind[last] === "p" && val[last] === "." && !(last >= 1 && kind[last - 1] === "p" && val[last - 1] === ".");
        const declared = last >= 0 && kind[last] === "i" && val[last] === "function";
        if (!afterDot && !declared && (word === "import" || word === "export" || word === "require")) cands.push(kind.length);
        emit("i", word, i, ID_RE.lastIndex);
        i = ID_RE.lastIndex;
        continue;
      }
      if (c >= 48 && c <= 57) {
        NUM_RE.lastIndex = i;
        NUM_RE.test(text);
        emit("n", null, i, NUM_RE.lastIndex);
        i = NUM_RE.lastIndex;
        continue;
      }
      emit("p", text[i], i, i + 1);
      i++;
    }
    if (!active.length) break;
    failRoot(active[active.length - 1]); // the file ended inside an element
  }
  return { kind, val, lvl, cands, from, to };
}

/* ----------------------------------------------------------- import parser */

/**
 * @returns {{refs: {spec:string, kind:string, typeOnly:boolean, bindings?:{local:string,imported:string}[],
 *   names?:{local:string,exported:string}[], ns?:string|null}[], nonLiteral:number,
 *   localExports:{local:string,exported:string}[]}}
 */
function extractRefs(text, opts) {
  const out = { refs: [], nonLiteral: 0, localExports: [] };
  if (!text.includes("import") && !text.includes("export") && !text.includes("require")) return out;
  const { kind, val, lvl, cands } = lex(text, opts);
  const len = kind.length;
  const isP = (t, ch) => kind[t] === "p" && val[t] === ch;
  const isId = (t, w) => kind[t] === "i" && val[t] === w;
  const isName = (t) => kind[t] === "i" || kind[t] === "s";

  // { a, b as c, type d } → [{ first, second }] ; returns [list, indexAfterBrace] or null
  const braceList = (start) => {
    const list = [];
    let j = start + 1;
    while (j < len && !isP(j, "}")) {
      if (isId(j, "type") && isName(j + 1) && !isId(j + 1, "as")) j++;
      if (!isName(j)) return null;
      const first = val[j];
      j++;
      let second = first;
      if (isId(j, "as") && isName(j + 1)) { second = val[j + 1]; j += 2; }
      list.push({ first, second });
      if (isP(j, ",")) j++;
    }
    return isP(j, "}") ? [list, j + 1] : null;
  };

  for (const t of cands) {
    const w = val[t];

    if (w === "require") {
      if (!isP(t + 1, "(")) continue;
      const k = kind[t + 2];
      if ((k === "s" || k === "t") && isP(t + 3, ")")) out.refs.push({ spec: val[t + 2], kind: "require", typeOnly: false });
      else if (t + 2 < len && !isP(t + 2, ")")) out.nonLiteral++;
      continue;
    }

    if (w === "import") {
      if (isP(t + 1, "(")) {
        const k = kind[t + 2];
        if ((k === "s" || k === "t") && (isP(t + 3, ")") || isP(t + 3, ","))) out.refs.push({ spec: val[t + 2], kind: "dynamic", typeOnly: false });
        else out.nonLiteral++;
        continue;
      }
      if (lvl[t] !== 0 || isP(t + 1, ".")) continue;
      let j = t + 1;
      if (kind[j] === "s") { out.refs.push({ spec: val[j], kind: "side_effect", typeOnly: false }); continue; }
      let typeOnly = false;
      if (isId(j, "type") && !(isId(j + 1, "from") && kind[j + 2] === "s") && !isP(j + 1, ",") && !isP(j + 1, "=")) { typeOnly = true; j++; }
      const bindings = [];
      if (kind[j] === "i") {
        if (isP(j + 1, "=")) continue; // import x = require("y") is found through its require
        bindings.push({ local: val[j], imported: "default" });
        j++;
        if (isP(j, ",")) j++;
      }
      if (isP(j, "*")) {
        if (!(isId(j + 1, "as") && kind[j + 2] === "i")) continue;
        bindings.push({ local: val[j + 2], imported: "*" });
        j += 3;
      } else if (isP(j, "{")) {
        const braced = braceList(j);
        if (!braced) continue;
        for (const b of braced[0]) bindings.push({ local: b.second, imported: b.first });
        j = braced[1];
      }
      if (isId(j, "from") && kind[j + 1] === "s") out.refs.push({ spec: val[j + 1], kind: "import", typeOnly, bindings });
      continue;
    }

    if (lvl[t] !== 0) continue; // export
    let j = t + 1;
    let typeOnly = false;
    if (isId(j, "type") && (isP(j + 1, "{") || isP(j + 1, "*"))) { typeOnly = true; j++; }
    if (isP(j, "*")) {
      j++;
      let ns = null;
      if (isId(j, "as") && isName(j + 1)) { ns = val[j + 1]; j += 2; }
      if (isId(j, "from") && kind[j + 1] === "s") out.refs.push({ spec: val[j + 1], kind: "export_star", typeOnly, ns });
    } else if (isP(j, "{")) {
      const braced = braceList(j);
      if (!braced) continue;
      const names = braced[0].map((b) => ({ local: b.first, exported: b.second }));
      j = braced[1];
      if (isId(j, "from") && kind[j + 1] === "s") out.refs.push({ spec: val[j + 1], kind: "export_from", typeOnly, names });
      else out.localExports.push(...names);
    }
  }
  return out;
}

/** Imports of the <script> blocks of a .vue / .svelte file (found with indexOf: linear even on malformed markup). */
function extractFromMarkup(text) {
  const out = { refs: [], nonLiteral: 0, localExports: [] };
  // ASCII-only lower-casing keeps every offset aligned with `text` (toLowerCase() lengthens "İ" and a few others)
  const lower = text.replace(/[A-Z]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 32));
  let at = 0;
  for (;;) {
    const open = lower.indexOf("<script", at);
    if (open === -1) break;
    const next = lower.charCodeAt(open + 7);
    const bodyStart = lower.indexOf(">", open) + 1;
    if (bodyStart === 0) break;
    const close = lower.indexOf("</script", bodyStart);
    const bodyEnd = close === -1 ? text.length : close;
    at = bodyEnd + 1;
    if (!(next === 62 || next === 32 || next === 9 || next === 10 || next === 13)) continue; // <scripty>, not <script>
    const part = extractRefs(text.slice(bodyStart, bodyEnd), { jsx: false });
    out.refs.push(...part.refs);
    out.nonLiteral += part.nonLiteral;
    out.localExports.push(...part.localExports);
    if (close === -1) break;
  }
  return out;
}

/* -------------------------------------------------------- tsconfig / paths */

/** Strip // and /* comments and trailing commas from a tsconfig, leaving strings alone. */
function stripJsonc(text) {
  const out = [];
  const n = text.length;
  let pending = -1;
  let i = 0;
  while (i < n) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < n && text[j] !== '"') { if (text[j] === "\\") j++; j++; }
      out.push(text.slice(i, j + 1));
      pending = -1;
      i = j + 1;
    } else if (c === "/" && text[i + 1] === "/") {
      const e = text.indexOf("\n", i);
      i = e === -1 ? n : e;
    } else if (c === "/" && text[i + 1] === "*") {
      const e = text.indexOf("*/", i + 2);
      i = e === -1 ? n : e + 2;
    } else if (c === ",") {
      pending = out.length;
      out.push(c);
      i++;
    } else if (c === "}" || c === "]") {
      if (pending !== -1) out[pending] = "";
      pending = -1;
      out.push(c);
      i++;
    } else {
      if (c !== " " && c !== "\n" && c !== "\t" && c !== "\r") pending = -1;
      out.push(c);
      i++;
    }
  }
  return out.join("");
}

const posixJoin = (...parts) => path.posix.normalize(path.posix.join(...parts)).replace(/^\.\/(?=.)/, "");

function readConfig(ctx, rel) {
  const direct = ctx.readJson(rel);
  if (direct && typeof direct === "object") return direct;
  const text = ctx.read(rel);
  if (!text.trim()) return null;
  try {
    const parsed = JSON.parse(stripJsonc(text));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    ctx.warn(`could not parse ${rel}; its path aliases were ignored`);
    return null;
  }
}

/** Resolve an `extends` / `references` target (relative only) to an existing config file. */
function configTarget(ctx, fromRel, target) {
  if (typeof target !== "string" || !(target.startsWith("./") || target.startsWith("../"))) return null;
  const base = posixJoin(path.posix.dirname(fromRel), target);
  if (base.startsWith("..")) return null;
  for (const c of [base, base + ".json", posixJoin(base, "tsconfig.json")]) {
    if (/\.json$/.test(c) && ctx.exists(c) && !ctx.isDirectory(c)) return c;
  }
  return null;
}

/** compilerOptions.baseUrl / paths of a config, following relative `extends`. */
function loadOptions(ctx, rel, cache, seen = new Set(), depth = 0) {
  if (cache.has(rel)) return cache.get(rel);
  if (seen.has(rel) || depth > 8) return { baseUrl: null, paths: null, pathsDir: null };
  seen.add(rel);
  const cfg = readConfig(ctx, rel);
  let opts = { baseUrl: null, paths: null, pathsDir: null };
  if (cfg) {
    const parents = Array.isArray(cfg.extends) ? cfg.extends : typeof cfg.extends === "string" ? [cfg.extends] : [];
    for (const p of parents) {
      const target = configTarget(ctx, rel, p);
      if (!target) continue;
      const inherited = loadOptions(ctx, target, cache, seen, depth + 1);
      opts = {
        baseUrl: inherited.baseUrl ?? opts.baseUrl,
        paths: inherited.paths ?? opts.paths,
        pathsDir: inherited.paths ? inherited.pathsDir : opts.pathsDir,
      };
    }
    const co = cfg.compilerOptions && typeof cfg.compilerOptions === "object" ? cfg.compilerOptions : {};
    const dir = path.posix.dirname(rel);
    if (typeof co.baseUrl === "string") opts = { ...opts, baseUrl: posixJoin(dir, co.baseUrl) };
    if (co.paths && typeof co.paths === "object" && !Array.isArray(co.paths)) opts = { ...opts, paths: co.paths, pathsDir: dir };
    if (opts.baseUrl === null && opts.paths === null && Array.isArray(cfg.references)) {
      for (const ref of cfg.references) {
        const target = ref && configTarget(ctx, rel, ref.path);
        if (!target) continue;
        const viaRef = loadOptions(ctx, target, cache, seen, depth + 1);
        if (viaRef.paths || viaRef.baseUrl !== null) { opts = viaRef; break; }
      }
    }
  }
  cache.set(rel, opts);
  return opts;
}

/* ---------------------------------------------------------------- resolver */

function makeResolver(ctx, census) {
  const optionCache = new Map();
  const configByDir = new Map();
  const usedConfigs = new Map();
  const existsCache = new Map();

  const configFor = (dir) => {
    if (configByDir.has(dir)) return configByDir.get(dir);
    let found = null;
    for (const name of ["tsconfig.json", "jsconfig.json"]) {
      const p = posixJoin(dir, name);
      if (ctx.exists(p) && !ctx.isDirectory(p)) { found = p; break; }
    }
    if (!found && dir !== "." && dir !== "") found = configFor(path.posix.dirname(dir));
    configByDir.set(dir, found);
    return found;
  };

  const optionsFor = (importerRel) => {
    const cfg = configFor(path.posix.dirname(importerRel));
    if (!cfg) return null;
    const opts = loadOptions(ctx, cfg, optionCache);
    if ((opts.paths || opts.baseUrl !== null) && !usedConfigs.has(cfg)) {
      usedConfigs.set(cfg, { file: cfg, baseUrl: opts.baseUrl ?? "", patterns: opts.paths ? Object.keys(opts.paths).sort(byString) : [] });
    }
    return opts;
  };

  const probe = (p) => {
    if (census.has(p)) return p;
    const js = /\.(?:js|jsx|mjs|cjs)$/.exec(p);
    if (js) {
      const stem = p.slice(0, -js[0].length);
      for (const e of [".ts", ".tsx"]) if (census.has(stem + e)) return stem + e;
    }
    for (const e of PROBE_EXTS) if (census.has(p + e)) return p + e;
    for (const e of PROBE_EXTS) {
      const idx = posixJoin(p, "index" + e);
      if (census.has(idx)) return idx;
    }
    return null;
  };

  const existsOutside = (p) => {
    if (existsCache.has(p)) return existsCache.get(p);
    let found = false;
    if (ctx.exists(p) && !ctx.isDirectory(p)) found = true;
    else {
      for (const e of [...PROBE_EXTS, ...OUTSIDE_EXTS]) {
        if (ctx.exists(p + e) || ctx.exists(posixJoin(p, "index" + e))) { found = true; break; }
      }
    }
    existsCache.set(p, found);
    return found;
  };

  const locate = (p) => {
    if (p === ".." || p.startsWith("../")) return { res: "outside" };
    const hit = probe(p);
    if (hit) return { res: "file", target: hit };
    return { res: existsOutside(p) ? "outside" : "missing" };
  };

  function resolve(spec, importerRel) {
    const q = spec.search(/[?#]/);
    const s = q > 0 ? spec.slice(0, q) : spec;
    if (!s) return { res: "missing" };
    if (s.startsWith("./") || s.startsWith("../") || s === "." || s === "..") {
      return locate(posixJoin(path.posix.dirname(importerRel), s));
    }
    if (s.startsWith("/")) return locate(posixJoin(s.slice(1) || "."));

    const opts = optionsFor(importerRel);
    let aliasMatched = false;
    if (opts && opts.paths) {
      let best = null;
      for (const pattern of Object.keys(opts.paths)) {
        const star = pattern.indexOf("*");
        let capture = null;
        if (star === -1) { if (s === pattern) capture = ""; }
        else {
          const pre = pattern.slice(0, star);
          const post = pattern.slice(star + 1);
          if (s.length >= pre.length + post.length && s.startsWith(pre) && s.endsWith(post)) capture = s.slice(pre.length, s.length - post.length);
        }
        if (capture === null) continue;
        const prefixLen = star === -1 ? pattern.length : star;
        if (!best || prefixLen > best.prefixLen) best = { pattern, capture, prefixLen };
      }
      if (best) {
        aliasMatched = best.prefixLen > 0;
        const base = opts.baseUrl ?? opts.pathsDir ?? ".";
        const targets = Array.isArray(opts.paths[best.pattern]) ? opts.paths[best.pattern] : [];
        let sawOutside = false;
        for (const t of targets) {
          if (typeof t !== "string") continue;
          const r = locate(posixJoin(base, t.replace("*", () => best.capture)));
          if (r.res === "file") return r;
          if (r.res === "outside") sawOutside = true;
        }
        if (sawOutside) return { res: "outside" };
      }
    }
    if (opts && opts.baseUrl !== null) {
      const r = locate(posixJoin(opts.baseUrl, s));
      if (r.res === "file") return r;
    }
    if (aliasMatched) return { res: "missing" };
    if (/^[@~]\//.test(s) || s === "~" || s === "@") return { res: "missing" };
    const isPackage = PACKAGE_NAME_RE.test(s) || /^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith("$") || s.startsWith("#");
    return { res: isPackage ? "package" : "missing" };
  }

  return { resolve, usedConfigs };
}

/* ------------------------------------------------------------------- graph */


/**
 * Which kind of framework entry point is `rel`, if any. An app-router route
 * file counts only in the root app directory of a Next.js package:
 *   • `app/` or `src/app/` directly under the repo root, `apps/<x>/`,
 *     `packages/<x>/`, `examples/<x>/`, or beside any package.json;
 *   • private `_folders` are skipped;
 *   • if that package.json exists, it must name `next` (or a next.config.* sits
 *     beside it) — a Remix `app/routes/error.tsx` is an ordinary file;
 *   • with no package.json, the app directory must hold a route file
 *     (page, layout, route, not-found, …) itself or directly under a `(group)`
 *     folder, as every Next app does — a lone `app/routes/error.tsx` is not one.
 * So `src/components/app/loading.tsx` and `src/app/_private/icon.tsx` are
 * ordinary files too.
 */
function makeEntryKind(ctx) {
  const nextApps = new Map();
  const rootRoute = (appDir) =>
    ctx.listTree(appDir, { exts: APP_ROUTE_EXTS }).some((f) => APP_ROOT_ROUTE_RE.test(f.rel.slice(appDir.length + 1)));
  const isNextApp = (base, appDir) => {
    if (nextApps.has(appDir)) return nextApps.get(appDir);
    const at = (name) => (base ? `${base}/${name}` : name);
    let ok;
    if (ctx.exists(at("package.json"))) {
      const manifest = ctx.readJson(at("package.json"));
      ok = !manifest || typeof manifest !== "object" // an unreadable manifest cannot rule Next out
        || MANIFEST_DEP_KEYS.some((k) => manifest[k] && typeof manifest[k] === "object" && "next" in manifest[k])
        || NEXT_CONFIG_FILES.some((name) => ctx.exists(at(name)));
    } else {
      ok = (base === "" || /^(?:apps|packages|examples)\/[^/]+$/.test(base)) && rootRoute(appDir);
    }
    nextApps.set(appDir, ok);
    return ok;
  };
  return (rel) => {
    const segs = rel.split("/");
    for (let a = 0; a < segs.length - 1; a++) {
      if (segs[a] !== "app" || !APP_ROUTE_RE.test(segs.slice(a).join("/"))) continue;
      const above = a > 0 && segs[a - 1] === "src" ? a - 1 : a;
      if (isNextApp(segs.slice(0, above).join("/"), segs.slice(0, a + 1).join("/"))) return "app_route";
    }
    if (PAGES_ROUTE_RE.test(rel)) return "pages_route";
    if (SPECIAL_ENTRY_RE.test(rel)) return "special";
    return null;
  };
}

/**
 * The import graph of the census. Memoised per context, so primitives.js and
 * this module share one parse.
 * @returns {{census:Set<string>, files:Map<string,{refs:object[], nonLiteral:number, localExports:object[]}>,
 *   importers:Map<string,Map<string,boolean>>, entries:Map<string,string>, reached:Set<string>|null,
 *   tests:Set<string>, configs:object[], stats:object}}
 */
function buildGraph(ctx) {
  return ctx.memo("graph", () => makeGraph(ctx));
}

function makeGraph(ctx) {
  const census = new Set(ctx.census.map((f) => f.rel));
  const tests = new Set(ctx.tests.map((f) => f.rel));
  const { resolve, usedConfigs } = makeResolver(ctx, census);
  const files = new Map();
  const importers = new Map();
  const entries = new Map();
  const edges = new Map();
  const stats = {
    parsed: 0, total: 0, resolved: 0, package: 0, outside: 0, missing: 0, nonLiteral: 0,
    byKind: {}, missingByFile: new Map(), nonLiteralByFile: new Map(), missingSpecs: new Set(), unread: new Map(),
    totalByFile: new Map(), resolvedByFile: new Map(), packageByFile: new Map(), outsideByFile: new Map(),
  };
  const tally = (m, rel) => m.set(rel, (m.get(rel) ?? 0) + 1);
  const entryKind = makeEntryKind(ctx);
  // ctx.read answers "" for a file it did not read (over 5 MB, or past the read budget) and says so; an empty file is simply empty
  const wasSkipped = (rel) => ctx.skipped.has(rel);

  for (const f of ctx.census) {
    const ek = entryKind(f.rel);
    if (ek && !tests.has(f.rel)) entries.set(f.rel, ek);
    const ext = path.posix.extname(f.rel);
    if (!PARSE_EXTS.has(ext)) continue;
    const text = ctx.read(f.rel);
    if (!text && wasSkipped(f.rel)) {
      stats.unread.set(f.rel, 1);
      files.set(f.rel, { refs: [], nonLiteral: 0, localExports: [] });
      continue;
    }
    stats.parsed++;
    // .ts cannot hold JSX, so there `<T>` is a generic or an assertion; .js, .jsx and .tsx can
    const info = ext === ".vue" || ext === ".svelte" ? extractFromMarkup(text) : extractRefs(text, { jsx: ext !== ".ts" });
    files.set(f.rel, info);
    stats.nonLiteral += info.nonLiteral;
    if (info.nonLiteral) stats.nonLiteralByFile.set(f.rel, info.nonLiteral);
    for (const ref of info.refs) {
      const r = resolve(ref.spec, f.rel);
      ref.res = r.res;
      ref.target = r.target ?? null;
      stats.total++;
      tally(stats.totalByFile, f.rel);
      stats.byKind[ref.kind] = (stats.byKind[ref.kind] ?? 0) + 1;
      if (r.res === "file") {
        stats.resolved++;
        tally(stats.resolvedByFile, f.rel);
        if (r.target !== f.rel) {
          const into = importers.get(r.target) ?? importers.set(r.target, new Map()).get(r.target);
          into.set(f.rel, (into.get(f.rel) ?? true) && ref.typeOnly);
          (edges.get(f.rel) ?? edges.set(f.rel, new Set()).get(f.rel)).add(r.target);
        }
      } else if (r.res === "package") { stats.package++; tally(stats.packageByFile, f.rel); }
      else if (r.res === "outside") { stats.outside++; tally(stats.outsideByFile, f.rel); }
      else {
        stats.missing++;
        stats.missingByFile.set(f.rel, (stats.missingByFile.get(f.rel) ?? 0) + 1);
        stats.missingSpecs.add(ref.spec);
      }
    }
  }

  let reached = null;
  if (entries.size) {
    reached = new Set(entries.keys());
    const queue = [...entries.keys()];
    for (let q = 0; q < queue.length; q++) {
      for (const next of edges.get(queue[q]) ?? []) {
        if (!reached.has(next)) { reached.add(next); queue.push(next); }
      }
    }
  }

  const graph = {
    census, files, importers, entries, reached, tests,
    configs: [...usedConfigs.values()].sort((a, b) => byString(a.file, b.file)),
    stats,
  };
  return graph;
}

/**
 * Does any OTHER census file import `rel`? `exclTests` ignores test importers.
 * Entry points are never "unimported": the framework is their importer.
 */
function hasImporter(graph, rel, { exclTests = false } = {}) {
  if (graph.entries.has(rel)) return true;
  const from = graph.importers.get(rel);
  if (!from) return false;
  if (!exclTests) return from.size > 0;
  for (const importer of from.keys()) if (!graph.tests.has(importer)) return true;
  return false;
}

module.exports = {
  APP_ROUTE_RE,
  COMPONENTS_DIR_RE,
  COMPONENTS_UI_RE,
  PACKAGE_NAME_RE,
  PAGES_ROUTE_RE,
  PARSE_EXTS,
  SPECIAL_ENTRY_RE,
  buildGraph,
  extractRefs,
  hasImporter,
  lex,
  stripJsonc,
};
