"use strict";

/**
 * design-source.js — which file is the canonical token source, and which files
 * count as the audited population.
 *
 * Shared by `systemix drift scan` and `systemix audit counters` so both resolve
 * the SAME token source and audit the SAME files. Deterministic (no model, no
 * network), read-only and dependency-free — it must load without gray-matter.
 *
 * Token source resolution (first hit wins; the choice and its reason are
 * returned so a report can state them):
 *   1. design/tokens.css
 *   2. systemix.config.yaml `design.source` — a css file, or a directory holding one
 *      (`design.tokens`, the key the local app reads, is accepted the same way)
 *   3. a css file that design/DESIGN.md, design/tokens.mdx or design/index.mdx
 *      names as canonical (a line saying "canonical" / "source of truth"). A clause
 *      that negates ("old.css is no longer canonical", "not X.css", legacy,
 *      deprecated) blesses nothing; when one line leaves several candidates the one
 *      that follows "is" / ":" wins, then the one with the most custom properties,
 *      and the others are returned in `alternatives` and named in the reason
 *   4. the css file declaring the most distinct custom properties (>= MIN_PROPS)
 *
 * Audited population = census (ts/tsx/js/jsx/css/vue/svelte under the audited
 * dirs) minus tests, `.d.ts` and the resolved token source. Generated and vendored
 * code never enters the census: build/dependency directories, `generated/`,
 * `__generated__/`, `_generated/`, and files named `*.generated.*`, `*.gen.*` or
 * `*.min.*`. A folder skipped by name that holds source files is reported in
 * `population().skippedDirs`, never dropped silently. A path that resolves (through
 * a symlink) outside the root is refused, like a `..` path — for the audited dirs
 * and for every file the resolver reads (the token file, the config, the design
 * docs) — and a file is only ever read through readBounded(): regular files only,
 * never more than the cap, so a symlink to /dev/zero or a FIFO cannot hang or
 * exhaust the process.
 */

const fs = require("fs");
const path = require("path");
const { parseSimpleYaml } = require("../config");
const { customProperties } = require("./css-parse");

const DEFAULT_DIRS = ["src", "app", "components", "lib", "packages"];
// tool output and dependencies: no walk of the repo ever enters these (the audited population and ctx.listTree alike)
const TREE_SKIP_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "out", "coverage"]);
// the audited population also leaves out vendored and generated code (a folder of that name that holds source is reported)
const EXCLUDE_DIRS = new Set([
  ...TREE_SKIP_DIRS, "vendor", "reference", ".expo", ".systemix", "generated", "__generated__", "_generated",
]);
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".vue", ".svelte"]);
// generated or minified output, whatever the folder: routeTree.gen.ts, api.generated.ts, vendor.min.js
const GENERATED_FILE_RE = /\.(?:generated|gen|min)\./;
// Skipped without a word: tool output and dependencies, expected everywhere. Every other
// EXCLUDE_DIRS name (build, out, vendor, reference, generated, __generated__, _generated) can be real
// source, so a skipped folder of that name that holds source files is reported.
const QUIET_SKIP_DIRS = new Set(["node_modules", "dist", "coverage"]);
const PROBE_LIMIT = 2000;
const MAX_READ_BYTES = 5 * 1024 * 1024;
const MIN_PROPS = 5;
const DOC_FILES = ["design/DESIGN.md", "design/tokens.mdx", "design/index.mdx"];
const CANONICAL_LINE_RE = /canonical|source of truth|single source|authoritative/i;
// CSS_REF_RE backtracks on a long run of path characters, so a line is only matched when it is
// short and mentions .css at all (a design doc line naming a file is never thousands of characters)
const MAX_DOC_LINE = 2000;
const CSS_REF_RE = /[\w@~./-]*[\w-]\.css\b/g;
// a clause ends at ; , ( ) a spaced dash, or a contrast word; a clause that negates blesses no file
const CLAUSE_BREAK_RE = /[;,()]|\s[—–-]\s|\b(?:but|however|whereas|although|though|while)\b/gi;
const NEGATION_RE = /\b(?:not|no longer|never|isn't|aren't|legacy|deprecated|obsolete|outdated|superseded|replaced|formerly|previously|old)\b/i;
const POINTS_AT_RE = /(?:\b(?:is|are)|[:=]|->|→)$/i;
// "superseded by X.css": the negating word describes the former file, X is the new one
const REPLACED_BY_RE = /\b(?:superseded|replaced|supplanted|succeeded)\s+(?:by|with)$|\bin\s+favou?r\s+of$/i;
const TEST_RE = /\.(?:test|spec)\.[^./]+$/;

const toPosix = (p) => p.split(path.sep).join("/");
const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const isOutside = (rel) => rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel);

/** True when `abs` exists and, once symlinks are followed, lies outside `root`. */
function escapesBySymlink(root, abs) {
  try {
    return isOutside(path.relative(fs.realpathSync(root), fs.realpathSync(abs)));
  } catch {
    return false; // missing or dangling: nothing to read, the caller's existence check says so
  }
}

/**
 * Resolve `p` under `root`; null when it escapes the root, lexically (`..`) or through
 * a symlink that points outside it.
 */
function safeJoin(root, p) {
  if (typeof p !== "string" || !p.trim()) return null;
  const abs = path.resolve(root, p.trim());
  if (isOutside(path.relative(path.resolve(root), abs))) return null;
  return escapesBySymlink(root, abs) ? null : abs;
}

const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

const READ_CHUNK = 1 << 20;

/**
 * Read a regular file as UTF-8, never more than `maxBytes` of it. The file is opened
 * non-blocking and fstat()ed first, so a FIFO, a device (a symlink to /dev/zero or
 * /dev/stdin) or a directory is refused instead of read until memory runs out or
 * forever, and the size is checked on the open descriptor, not on a path that can change.
 * @returns {{text:string}|{skipped:"over"|"not-a-file"|"unreadable", code?:string}}
 */
function readBounded(abs, maxBytes = MAX_READ_BYTES) {
  let fd;
  try {
    fd = fs.openSync(abs, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0));
  } catch (e) {
    return { skipped: "unreadable", code: e && e.code ? e.code : "ERR" };
  }
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile()) return { skipped: "not-a-file" };
    if (st.size > maxBytes) return { skipped: "over" };
    const chunk = Math.min(Math.max(st.size, 1) + 1, READ_CHUNK);
    const parts = [];
    let total = 0;
    for (;;) {
      const buf = Buffer.allocUnsafe(chunk);
      const n = fs.readSync(fd, buf, 0, chunk, null);
      if (n === 0) break;
      total += n;
      if (total > maxBytes) return { skipped: "over" };
      parts.push(n === chunk ? buf : buf.subarray(0, n));
      if (n < chunk && total >= st.size) break;
    }
    return { text: Buffer.concat(parts, total).toString("utf8") };
  } catch (e) {
    return { skipped: "unreadable", code: e && e.code ? e.code : "ERR" };
  } finally {
    try { fs.closeSync(fd); } catch { /* nothing to close */ }
  }
}

/** UTF-8 text, BOM stripped as `ctx.read` does; null when unreadable, not a regular file, or over 5 MB. */
function readText(abs) {
  const r = readBounded(abs, MAX_READ_BYTES);
  return r.text === undefined ? null : r.text.replace(/^﻿/, "");
}

const isTestFile = (rel) => TEST_RE.test(rel) || /(^|\/)__tests__\//.test(rel);
const isDeclarationFile = (rel) => /\.d\.[cm]?ts$/.test(rel);

/**
 * Files under `dirs` (resolved inside `root`) whose extension is in `exts`.
 * Skips excluded/dot directories, symlinks and generated/minified files. Sorted by
 * repo-relative posix path, de-duplicated — the same tree always lists the same.
 * `onSkip(abs)` is called for every directory skipped because of its NAME.
 */
function listFiles(root, dirs, { exts = EXTS, onSkip = null } = {}) {
  const out = [];
  const seen = new Set();
  const take = (abs) => {
    if (seen.has(abs)) return;
    seen.add(abs);
    out.push({ abs, rel: toPosix(path.relative(root, abs)) });
  };
  const walk = (dirAbs) => {
    let entries;
    try { entries = fs.readdirSync(dirAbs, { withFileTypes: true }); } catch { return; }
    entries.sort((a, b) => byString(a.name, b.name));
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      const abs = path.join(dirAbs, e.name);
      if (e.isDirectory()) {
        if (e.name.startsWith(".")) continue;
        if (EXCLUDE_DIRS.has(e.name)) { if (onSkip) onSkip(abs); continue; }
        walk(abs);
      } else if (e.isFile() && exts.has(path.extname(e.name)) && !GENERATED_FILE_RE.test(e.name)) {
        take(abs);
      }
    }
  };
  for (const d of dirs) {
    const abs = safeJoin(root, d);
    if (!abs) continue;
    if (isDir(abs)) walk(abs);
    else if (isFile(abs) && exts.has(path.extname(abs)) && !GENERATED_FILE_RE.test(path.basename(abs))) take(abs);
  }
  return out.sort((a, b) => byString(a.rel, b.rel));
}

/**
 * Whether a skipped directory holds source files (EXTS, not generated/minified), looking at
 * most PROBE_LIMIT entries deep so a vendored monster costs milliseconds. A tree too
 * big to finish probing is assumed to hold source. Never follows symlinks.
 */
function holdsSource(dirAbs) {
  let seen = 0;
  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return false; }
    entries.sort((a, b) => byString(a.name, b.name));
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      if (++seen > PROBE_LIMIT) return true;
      if (e.isDirectory()) {
        if (e.name !== "node_modules" && !e.name.startsWith(".") && walk(path.join(d, e.name))) return true;
      } else if (e.isFile() && EXTS.has(path.extname(e.name)) && !GENERATED_FILE_RE.test(e.name)) {
        return true;
      }
    }
    return false;
  };
  return walk(dirAbs);
}

function readDesignConfig(root) {
  try {
    const file = safeJoin(root, "systemix.config.yaml");
    const text = file ? readText(file) : null;
    if (text === null) return null;
    const cfg = parseSimpleYaml(text);
    return cfg && typeof cfg.design === "object" && cfg.design ? cfg.design : null;
  } catch {
    return null;
  }
}

/** css files worth considering as a token source: audited dirs + design/ + root-level. */
function candidateCssFiles(root, dirs) {
  const exts = new Set([".css"]);
  const found = listFiles(root, [...dirs, "design"], { exts });
  let rootEntries = [];
  try { rootEntries = fs.readdirSync(root, { withFileTypes: true }); } catch { /* unreadable root */ }
  for (const e of rootEntries) {
    if (e.isFile() && path.extname(e.name) === ".css") {
      const abs = path.join(root, e.name);
      if (!found.some((f) => f.abs === abs)) found.push({ abs, rel: e.name });
    }
  }
  return found.sort((a, b) => byString(a.rel, b.rel));
}

function mostCustomProperties(files) {
  let best = null;
  for (const f of files) {
    const n = customProperties(readText(f.abs)).size;
    if (n < MIN_PROPS) continue;
    // more properties wins; ties → shorter path → alphabetical (fixed tie-break)
    if (!best || n > best.n || (n === best.n && (f.rel.length < best.f.rel.length ||
        (f.rel.length === best.f.rel.length && f.rel < best.f.rel)))) {
      best = { f, n };
    }
  }
  return best;
}

const hit = (root, abs, via, reason, alternatives = []) => ({
  abs,
  rel: toPosix(path.relative(root, abs)),
  via,
  reason,
  alternatives,
  customProperties: customProperties(readText(abs)).size,
});

/**
 * The css files a design-doc line blesses as canonical: refs in clauses that do not negate,
 * each with whether it directly follows "is" / "are" / ":" / "=" ("the source of truth is X.css").
 * @returns {{ref:string, points:boolean}[]}
 */
function blessedRefs(line) {
  const breaks = [...line.matchAll(CLAUSE_BREAK_RE)].map((m) => ({ at: m.index, end: m.index + m[0].length }));
  const out = [];
  for (const m of line.matchAll(CSS_REF_RE)) {
    const before = breaks.filter((b) => b.end <= m.index).pop();
    const after = breaks.find((b) => b.at >= m.index + m[0].length);
    const clauseStart = before ? before.end : 0;
    const clauseEnd = after ? after.at : line.length;
    // a file name must not negate itself ("old.css"): refs are masked before the negation test
    const clause = line.slice(clauseStart, clauseEnd).replace(CSS_REF_RE, "§");
    const leadIn = line.slice(clauseStart, m.index).replace(CSS_REF_RE, "§").replace(/[`'"*_<\s]+$/, "");
    if (REPLACED_BY_RE.test(leadIn)) { out.push({ ref: m[0], points: true }); continue; }
    if (NEGATION_RE.test(clause)) continue;
    out.push({ ref: m[0], points: POINTS_AT_RE.test(leadIn) });
  }
  return out;
}

/**
 * Resolve the canonical token source for `root`.
 * @param {string} root
 * @param {string[]} [dirs] audited dirs (scope for resolution step 4)
 * @returns {{abs:string|null, rel:string|null, via:string, reason:string, alternatives:string[], customProperties:number}}
 */
function resolveTokenSource(root, dirs = DEFAULT_DIRS) {
  // 1 — the scaffolded spine
  const spine = safeJoin(root, "design/tokens.css");
  if (spine && isFile(spine)) return hit(root, spine, "design/tokens.css", "design/tokens.css exists");

  // 2 — systemix.config.yaml design.source (or design.tokens, which the local app reads)
  const design = readDesignConfig(root);
  for (const key of ["source", "tokens"]) {
    const configured = design && typeof design[key] === "string" ? design[key].trim() : "";
    if (!configured || configured === "design" || configured === "none") continue;
    const via = `config:design.${key}`;
    const abs = safeJoin(root, configured);
    if (abs && isFile(abs) && path.extname(abs) === ".css") {
      return hit(root, abs, via, `systemix.config.yaml design.${key} points at ${configured}`);
    }
    if (abs && isDir(abs)) {
      const inDir = path.join(abs, "tokens.css");
      if (isFile(inDir)) return hit(root, inDir, via, `design.${key} ${configured} holds tokens.css`);
      const best = mostCustomProperties(listFiles(root, [configured], { exts: new Set([".css"]) }));
      if (best) return hit(root, best.f.abs, via, `design.${key} ${configured}: css file with the most custom properties`);
    }
  }

  const candidates = candidateCssFiles(root, dirs);
  // a bare file name in a design doc ("globals.css") is looked up in the audited dirs first, then in
  // the default dirs, so narrowing `dirs` to a subfolder cannot make a documented token source vanish
  let wide = null;
  const widerCandidates = () => (wide ??= candidateCssFiles(root, [...new Set([...dirs, ...DEFAULT_DIRS])]));

  // 3 — a css file the design docs name as canonical
  for (const doc of DOC_FILES) {
    const docAbs = safeJoin(root, doc);
    const text = docAbs ? readText(docAbs) : null;
    if (!text) continue;
    for (const line of text.split(/\r?\n/)) {
      if (line.length > MAX_DOC_LINE || !line.includes(".css") || !CANONICAL_LINE_RE.test(line)) continue;
      const found = new Map(); // abs → {clean, points, order, props}
      for (const { ref, points } of blessedRefs(line)) {
        const clean = ref.replace(/^\.\//, "");
        const bare = !clean.includes("/");
        const named = (list) => list.filter((c) => bare && path.basename(c.abs) === clean).map((c) => c.abs);
        const options = [
          safeJoin(root, clean),
          safeJoin(path.join(root, "design"), clean),
          ...named(candidates),
          ...(bare ? named(widerCandidates()) : []),
        ];
        for (const abs of options) {
          if (!abs || !isFile(abs)) continue;
          const props = customProperties(readText(abs)).size;
          if (props === 0) continue;
          const prior = found.get(abs);
          if (!prior) found.set(abs, { clean, points, order: found.size, props });
          else if (points) prior.points = true;
          break;
        }
      }
      if (!found.size) continue;
      // the file a clause points at ("the source of truth is X.css"), then the one with the most custom properties
      const ranked = [...found.entries()].sort((a, b) =>
        Number(b[1].points) - Number(a[1].points) || b[1].props - a[1].props || a[1].order - b[1].order);
      const [abs, pick] = ranked[0];
      const others = ranked.slice(1).map(([o]) => toPosix(path.relative(root, o)));
      const reason = `${doc} names ${pick.clean} as canonical` +
        (others.length ? `; the same line also names ${others.join(", ")}, ${pick.points ? "this one is the file it points at" : "this one declares the most custom properties"}` : "");
      return hit(root, abs, `doc:${doc}`, reason, others);
    }
  }

  // 4 — the css file with the most custom properties
  const best = mostCustomProperties(candidates);
  if (best) {
    return hit(root, best.f.abs, "most-custom-properties",
      `no design/tokens.css, config or doc names a source; ${best.f.rel} declares the most custom properties (${best.n})`);
  }

  return {
    abs: null,
    rel: null,
    via: "none",
    reason: `no token source: no design/tokens.css, no design.source, no canonical css named in the design docs, and no css file declares >= ${MIN_PROPS} custom properties`,
    alternatives: [],
    customProperties: 0,
  };
}

/**
 * The files an audit looks at.
 * @param {string} root
 * @param {string[]} dirs requested dirs (default scan list when empty)
 * @param {{rel:string|null}|null} tokenSource from resolveTokenSource (exempted)
 */
function population(root, dirs, tokenSource = null) {
  const requested = dirs && dirs.length ? dirs : DEFAULT_DIRS;
  const used = [];
  const missing = [];
  const rejected = [];
  for (const d of requested) {
    const abs = safeJoin(root, d);
    if (!abs) rejected.push(d);
    else if (isDir(abs) || isFile(abs)) used.push(toPosix(path.relative(root, abs)) || ".");
    else missing.push(d);
  }
  const skipped = new Set();
  const onSkip = (abs) => {
    if (QUIET_SKIP_DIRS.has(path.basename(abs)) || !holdsSource(abs)) return;
    skipped.add(toPosix(path.relative(root, abs)));
  };
  const usedDirs = [...new Set(used)];
  const census = listFiles(root, usedDirs, { onSkip });
  const tokenRel = tokenSource && tokenSource.rel ? tokenSource.rel : null;
  const tests = census.filter((f) => isTestFile(f.rel));
  const declarations = census.filter((f) => isDeclarationFile(f.rel));
  const audited = census.filter((f) => !isTestFile(f.rel) && !isDeclarationFile(f.rel) && f.rel !== tokenRel);
  return {
    dirs: usedDirs,
    missingDirs: missing,
    rejectedDirs: rejected,
    skippedDirs: [...skipped].sort(byString),
    census,
    tests,
    declarations,
    tokenSourceInCensus: tokenRel ? census.some((f) => f.rel === tokenRel) : false,
    audited,
  };
}

module.exports = {
  DEFAULT_DIRS,
  EXCLUDE_DIRS,
  EXTS,
  GENERATED_FILE_RE,
  MAX_READ_BYTES,
  MIN_PROPS,
  TREE_SKIP_DIRS,
  customProperties,
  escapesBySymlink,
  isDeclarationFile,
  isTestFile,
  listFiles,
  population,
  readBounded,
  resolveTokenSource,
  safeJoin,
  toPosix,
};
