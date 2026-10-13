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
 *   3. a css file that design/DESIGN.md, design/tokens.mdx or design/index.mdx
 *      names as canonical (a line saying "canonical" / "source of truth")
 *   4. the css file declaring the most distinct custom properties (>= MIN_PROPS)
 *
 * Audited population = census (ts/tsx/js/jsx/css/vue/svelte under the audited
 * dirs) minus tests, `.d.ts` and the resolved token source. Generated files and
 * vendored/build directories never enter the census.
 */

const fs = require("fs");
const path = require("path");
const { parseSimpleYaml } = require("../config");

const DEFAULT_DIRS = ["src", "app", "components", "lib", "packages"];
const EXCLUDE_DIRS = new Set([
  "node_modules", "dist", "build", "out", "coverage", "vendor", "reference",
  ".next", ".expo", ".git", ".systemix", "generated",
]);
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".vue", ".svelte"]);
const MIN_PROPS = 5;
const DOC_FILES = ["design/DESIGN.md", "design/tokens.mdx", "design/index.mdx"];
const CANONICAL_LINE_RE = /canonical|source of truth|single source|authoritative/i;
const CSS_REF_RE = /[\w@~./-]*[\w-]\.css\b/g;
const CUSTOM_PROP_RE = /^[ \t]*(--[\w-]+)[ \t]*:/gm;
const TEST_RE = /\.(?:test|spec)\.[^./]+$/;

const toPosix = (p) => p.split(path.sep).join("/");
const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Resolve `p` under `root`; null when it escapes the root (no `..` traversal). */
function safeJoin(root, p) {
  if (typeof p !== "string" || !p.trim()) return null;
  const abs = path.resolve(root, p.trim());
  const rel = path.relative(path.resolve(root), abs);
  if (rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel)) return null;
  return abs;
}

const isFile = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };

function readText(abs) {
  try { return fs.readFileSync(abs, "utf8"); } catch { return null; }
}

const isTestFile = (rel) => TEST_RE.test(rel) || /(^|\/)__tests__\//.test(rel);
const isDeclarationFile = (rel) => /\.d\.[cm]?ts$/.test(rel);

/** Distinct custom-property names declared in a css text (`--name:` at line start). */
function customProperties(text) {
  const names = new Set();
  for (const m of String(text ?? "").matchAll(CUSTOM_PROP_RE)) names.add(m[1]);
  return names;
}

/**
 * Files under `dirs` (resolved inside `root`) whose extension is in `exts`.
 * Skips excluded/dot directories, symlinks and `.generated.` files. Sorted by
 * repo-relative posix path, de-duplicated — the same tree always lists the same.
 */
function listFiles(root, dirs, { exts = EXTS } = {}) {
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
        if (!EXCLUDE_DIRS.has(e.name) && !e.name.startsWith(".")) walk(abs);
      } else if (e.isFile() && exts.has(path.extname(e.name)) && !/\.generated\./.test(e.name)) {
        take(abs);
      }
    }
  };
  for (const d of dirs) {
    const abs = safeJoin(root, d);
    if (!abs) continue;
    if (isDir(abs)) walk(abs);
    else if (isFile(abs) && exts.has(path.extname(abs)) && !/\.generated\./.test(abs)) take(abs);
  }
  return out.sort((a, b) => byString(a.rel, b.rel));
}

function readDesignConfig(root) {
  try {
    const cfg = parseSimpleYaml(fs.readFileSync(path.join(root, "systemix.config.yaml"), "utf8"));
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

const hit = (root, abs, via, reason) => ({
  abs,
  rel: toPosix(path.relative(root, abs)),
  via,
  reason,
  customProperties: customProperties(readText(abs)).size,
});

/**
 * Resolve the canonical token source for `root`.
 * @param {string} root
 * @param {string[]} [dirs] audited dirs (scope for resolution step 4)
 * @returns {{abs:string|null, rel:string|null, via:string, reason:string, customProperties:number}}
 */
function resolveTokenSource(root, dirs = DEFAULT_DIRS) {
  // 1 — the scaffolded spine
  const spine = path.join(root, "design", "tokens.css");
  if (isFile(spine)) return hit(root, spine, "design/tokens.css", "design/tokens.css exists");

  // 2 — systemix.config.yaml design.source
  const design = readDesignConfig(root);
  const configured = design && typeof design.source === "string" ? design.source.trim() : "";
  if (configured && configured !== "design" && configured !== "none") {
    const abs = safeJoin(root, configured);
    if (abs && isFile(abs) && path.extname(abs) === ".css") {
      return hit(root, abs, "config:design.source", `systemix.config.yaml design.source points at ${configured}`);
    }
    if (abs && isDir(abs)) {
      const inDir = path.join(abs, "tokens.css");
      if (isFile(inDir)) return hit(root, inDir, "config:design.source", `design.source ${configured} holds tokens.css`);
      const best = mostCustomProperties(listFiles(root, [configured], { exts: new Set([".css"]) }));
      if (best) return hit(root, best.f.abs, "config:design.source", `design.source ${configured}: css file with the most custom properties`);
    }
  }

  const candidates = candidateCssFiles(root, dirs);

  // 3 — a css file the design docs name as canonical
  for (const doc of DOC_FILES) {
    const text = readText(path.join(root, doc));
    if (!text) continue;
    for (const line of text.split(/\r?\n/)) {
      if (!CANONICAL_LINE_RE.test(line)) continue;
      for (const ref of line.match(CSS_REF_RE) ?? []) {
        const clean = ref.replace(/^\.\//, "");
        const options = [
          safeJoin(root, clean),
          safeJoin(path.join(root, "design"), clean),
          ...candidates.filter((c) => !clean.includes("/") && path.basename(c.abs) === clean).map((c) => c.abs),
        ];
        for (const abs of options) {
          if (abs && isFile(abs) && customProperties(readText(abs)).size > 0) {
            return hit(root, abs, `doc:${doc}`, `${doc} names ${clean} as canonical`);
          }
        }
      }
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
  const census = listFiles(root, used);
  const tokenRel = tokenSource && tokenSource.rel ? tokenSource.rel : null;
  const tests = census.filter((f) => isTestFile(f.rel));
  const declarations = census.filter((f) => isDeclarationFile(f.rel));
  const audited = census.filter((f) => !isTestFile(f.rel) && !isDeclarationFile(f.rel) && f.rel !== tokenRel);
  return {
    dirs: used,
    missingDirs: missing,
    rejectedDirs: rejected,
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
  MIN_PROPS,
  customProperties,
  isDeclarationFile,
  isTestFile,
  listFiles,
  population,
  resolveTokenSource,
  safeJoin,
  toPosix,
};
