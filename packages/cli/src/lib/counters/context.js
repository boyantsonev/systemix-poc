"use strict";

/**
 * context.js — what every counter module is handed. One context per run: the
 * resolved token source, the audited population, cached file reads and a few
 * counting helpers, so modules agree on units and scope instead of each
 * re-deriving them. Read-only; the only process it spawns is `git`, once, for
 * provenance.
 *
 * Conventions every module relies on (pinned here, not re-decided per counter):
 *   • text is read as UTF-8, BOM stripped, CRLF normalised to LF
 *   • a "line" is what `wc -l` counts (a last line without "\n" still counts)
 *   • a "match" is one regex hit, a "line" is one line holding >= 1 hit,
 *     a "file" is one file holding >= 1 hit, a "distinct" is one unique value
 *   • repo-relative paths use "/" on every platform
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { parseSimpleYaml } = require("../../config");
const ds = require("../design-source");

const MAX_READ_BYTES = 5 * 1024 * 1024;
const SKIP_TREE_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", "out", "coverage"]);

function git(root, args) {
  try {
    return execFileSync("git", ["-c", "core.fsmonitor=false", "-C", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10000,
      env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    }).trim();
  } catch {
    return null;
  }
}

function gitInfo(root) {
  const commit = git(root, ["rev-parse", "HEAD"]);
  if (!commit) return { commit: null, commitDate: null, dirty: null };
  return {
    commit,
    commitDate: git(root, ["log", "-1", "--format=%cI"]),
    dirty: (git(root, ["status", "--porcelain", "--untracked-files=no"]) ?? "") !== "",
  };
}

/** Number of lines as `wc -l` + a trailing partial line. */
function lineCount(text) {
  if (!text) return 0;
  const n = text.split("\n").length;
  return text.endsWith("\n") ? n - 1 : n;
}

/** Count regex matches (the regex is forced global; lastIndex never leaks). */
function countMatches(text, re) {
  const g = re.global ? re : new RegExp(re.source, re.flags + "g");
  let n = 0;
  for (const _ of String(text).matchAll(g)) n++; // eslint-disable-line no-unused-vars
  return n;
}

/** 1-based line number of a string index. */
function lineOf(text, index) {
  let line = 1;
  for (let i = text.indexOf("\n"); i !== -1 && i < index; i = text.indexOf("\n", i + 1)) line++;
  return line;
}

/**
 * @param {string} root absolute project root
 * @param {{dirs?: string[]}} [opts] dirs to audit (default scan list when empty)
 */
function createContext(root, opts = {}) {
  root = path.resolve(root);
  const warnings = [];
  const cache = new Map();
  const warn = (msg) => { if (!warnings.includes(msg)) warnings.push(msg); };

  const scanDirs = opts.dirs && opts.dirs.length ? opts.dirs : ds.DEFAULT_DIRS;
  const tokenSource = ds.resolveTokenSource(root, scanDirs);
  const pop = ds.population(root, scanDirs, tokenSource);
  for (const d of pop.missingDirs) warn(`audited dir not found: ${d}`);
  for (const d of pop.rejectedDirs) warn(`audited dir outside the repo root was ignored: ${d}`);
  if (!tokenSource.abs) warn(tokenSource.reason);

  const abs = (p) => (typeof p === "string" ? (path.isAbsolute(p) ? p : path.join(root, p)) : p.abs);

  function read(p) {
    const file = abs(p);
    if (cache.has(file)) return cache.get(file);
    let text = "";
    try {
      const st = fs.statSync(file);
      if (st.size > MAX_READ_BYTES) {
        warn(`skipped (over ${MAX_READ_BYTES / 1024 / 1024} MB): ${ds.toPosix(path.relative(root, file))}`);
      } else {
        text = fs.readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
      }
    } catch {
      /* missing or unreadable → empty text; callers check exists() when it matters */
    }
    cache.set(file, text);
    return text;
  }

  const exists = (p) => { try { fs.statSync(abs(p)); return true; } catch { return false; } };
  const isDirectory = (p) => { try { return fs.statSync(abs(p)).isDirectory(); } catch { return false; } };

  /** Parsed JSON file, or null when missing/invalid. */
  function readJson(p) {
    try { return JSON.parse(read(p)); } catch { return null; }
  }

  /** Parsed systemix.config.yaml (subset parser), or null. */
  function config() {
    if (!exists("systemix.config.yaml")) return null;
    try { return parseSimpleYaml(read("systemix.config.yaml")); } catch { return null; }
  }

  /**
   * Files under a repo-relative dir, recursively, INCLUDING dot-directories
   * (.github, .claude) — unlike the audited population, which skips them.
   * Sorted by repo-relative path. Symlinks are never followed.
   */
  function listTree(relDir, { exts = null } = {}) {
    const start = ds.safeJoin(root, relDir);
    const out = [];
    if (!start) return out;
    const walk = (dirAbs) => {
      let entries;
      try { entries = fs.readdirSync(dirAbs, { withFileTypes: true }); } catch { return; }
      entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      for (const e of entries) {
        if (e.isSymbolicLink()) continue;
        const full = path.join(dirAbs, e.name);
        if (e.isDirectory()) {
          if (!SKIP_TREE_DIRS.has(e.name)) walk(full);
        } else if (e.isFile() && (!exts || exts.includes(path.extname(e.name)))) {
          out.push({ abs: full, rel: ds.toPosix(path.relative(root, full)) });
        }
      }
    };
    walk(start);
    return out;
  }

  const byExt = (files, ...exts) => files.filter((f) => exts.includes(path.extname(f.rel)));

  return {
    root,
    requestedDirs: scanDirs,
    dirs: pop.dirs,
    tokenSource,
    population: pop,
    census: pop.census,
    tests: pop.tests,
    audited: pop.audited,
    git: gitInfo(root),
    warnings,
    warn,
    read,
    exists,
    isDirectory,
    readJson,
    config,
    listTree,
    byExt,
    lineCount,
    countMatches,
    lineOf,
    toPosix: ds.toPosix,
  };
}

module.exports = { createContext, lineCount, countMatches, lineOf };
