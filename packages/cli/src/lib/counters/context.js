"use strict";

/**
 * context.js — what every counter module is handed. One context per run: the
 * resolved token source, the audited population, cached file reads and a few
 * counting helpers, so modules agree on units and scope instead of each
 * re-deriving them. Read-only; the only process it spawns is `git`, for provenance.
 *
 * Conventions every module relies on (pinned here, not re-decided per counter):
 *   • text is read as UTF-8, BOM stripped, CRLF normalised to LF
 *   • a "line" is what `wc -l` counts (a last line without "\n" still counts)
 *   • a "match" is one regex hit, a "line" is one line holding >= 1 hit,
 *     a "file" is one file holding >= 1 hit, a "distinct" is one unique value
 *   • repo-relative paths use "/" on every platform
 *
 * Containment (one rule, enforced here, not left to each group). Every read goes
 * through read/readFile/exists/isDirectory/readJson/config/listTree, and a path
 * that resolves — through a symlink — outside the repo reads as ABSENT: exists
 * false, text "", no list, one warning ("symlink resolves outside the repo: X"). A
 * report therefore depends on the repo alone, never on a file elsewhere on the
 * auditor's disk. Files are read with design-source's readBounded(): regular files
 * only (a FIFO or a device is refused, not read), at most 5 MB each, and at most a
 * total budget of text per run (the cache keeps every file for the whole run); a
 * file past either limit reads as "" and is named in a warning. Audited-population
 * files come from a walk that never follows a symlink, so they skip the symlink check.
 *
 * Provenance. `git` is run with an allow-listed environment (no GIT_DIR,
 * GIT_WORK_TREE, GIT_INDEX_FILE … inherited from a hook or a CI wrapper, which
 * would make it describe another repository) and with the repo-local settings
 * that can run programs switched off (core.fsmonitor, core.hooksPath,
 * log.showSignature). `dirty` is NOT computed unless asked for: `git status`
 * runs the clean filters the repository's own .git/config defines, which is
 * code from the tree being audited.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { parseSimpleYaml } = require("../../config");
const ds = require("../design-source");

const MAX_READ_BYTES = ds.MAX_READ_BYTES;
// the cache keeps every file read for the whole run (a group's own tables hold about 5x the corpus), so the total is bounded
const DEFAULT_READ_BUDGET_BYTES = 256 * 1024 * 1024;
// a run names this many skipped files in warnings of their own; the rest are counted in one warning at the end
const SKIP_WARN_FILES = 20;
const GIT_TIMEOUT_MS = 10000;
const GIT_MAX_BUFFER = 16 * 1024 * 1024;
const FIXED_INPUTS = ["design/tokens.css", "systemix.config.yaml", "design/DESIGN.md", "design/tokens.mdx", "design/index.mdx"];

// The only variables git sees. Everything GIT_* that points at a repository, an index or a work tree is
// dropped; GIT_CONFIG_GLOBAL / _SYSTEM / _NOSYSTEM stay because they select the auditor's OWN config.
const GIT_ENV_KEEP = [
  "PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "XDG_CONFIG_HOME",
  "GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM", "GIT_CONFIG_NOSYSTEM",
];

function gitEnv() {
  const env = {};
  for (const k of GIT_ENV_KEEP) if (process.env[k] !== undefined) env[k] = process.env[k];
  return { ...env, GIT_OPTIONAL_LOCKS: "0", GIT_TERMINAL_PROMPT: "0", GIT_PAGER: "cat" };
}

/** stdout of a git command, trimmed; null when git is missing, exits non-zero, times out or overflows the buffer. */
function git(root, args) {
  try {
    return execFileSync("git", [
      "-c", "core.fsmonitor=false",
      "-c", `core.hooksPath=${os.devNull}`,
      "-c", "log.showSignature=false",
      "-c", "protocol.allow=never",
      "--no-pager",
      "-C", root,
      ...args,
    ], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: GIT_TIMEOUT_MS,
      maxBuffer: GIT_MAX_BUFFER,
      env: gitEnv(),
    }).trim();
  } catch {
    return null;
  }
}

/**
 * One spelling of the commit date whatever the git version: newer git prints a UTC
 * offset as "Z", older git as "+00:00". The report must be byte-identical across machines.
 */
function isoDate(s) {
  if (!s) return s;
  return s.endsWith("Z") ? `${s.slice(0, -1)}+00:00` : s;
}

/**
 * HEAD of the repository that contains `root`. `prefix` is where `root` sits inside it
 * ("" at the repository top level, "packages/web" for a subfolder, null without git), so
 * a report auditing a subfolder says that its commit and date are the enclosing repo's.
 * `dirty` is null unless `wantDirty`; then it is whether anything under `root` differs from
 * HEAD — a modified or deleted tracked file, or an untracked file that is not ignored — and
 * null again when git could not tell (a failure, a timeout, output too large).
 */
function gitInfo(root, { wantDirty = false } = {}) {
  const commit = git(root, ["rev-parse", "HEAD"]);
  if (!commit) return { commit: null, commitDate: null, dirty: null, prefix: null };
  let dirty = null;
  if (wantDirty) {
    const status = git(root, ["status", "--porcelain", "--untracked-files=normal", "--ignore-submodules=all", "--", "."]);
    dirty = status === null ? null : status !== "";
  }
  return {
    commit,
    commitDate: isoDate(git(root, ["log", "-1", "--format=%cI"])),
    dirty,
    prefix: (git(root, ["rev-parse", "--show-prefix"]) ?? "").replace(/\/$/, ""),
  };
}

const describeBytes = (n) => (n >= 1024 * 1024 ? `${Math.round(n / 1024 / 1024)} MB` : `${n} bytes`);

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

/** Whether a path can be opened as a regular file: "ok", "not-a-file", or the error code. Reads nothing. */
function probe(file) {
  let fd;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NONBLOCK || 0));
    return fs.fstatSync(fd).isFile() ? "ok" : "not-a-file";
  } catch (e) {
    return e && e.code ? e.code : "ERR";
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd); } catch { /* nothing to close */ }
  }
}

/**
 * @param {string} root absolute project root
 * @param {{dirs?: string[], dirty?: boolean, readBudgetBytes?: number}} [opts] dirs to audit (default scan list when
 *   empty); dirty: compute repo.dirty (runs `git status`, see the header); readBudgetBytes: the total-text budget
 */
function createContext(root, opts = {}) {
  root = path.resolve(root);
  const warnings = [];
  const cache = new Map();
  const memos = new Map();
  const skipped = new Map(); // rel → "over" (past the 5 MB cap) | "budget" (past the run's total)
  const budget = Number.isFinite(opts.readBudgetBytes) ? opts.readBudgetBytes : DEFAULT_READ_BUDGET_BYTES;
  const budgetSkipped = [];
  const overSkipped = [];
  let readTotal = 0;
  const warn = (msg) => { if (!warnings.includes(msg)) warnings.push(msg); };
  const relOf = (file) => ds.toPosix(path.relative(root, file));

  // the audited folders are a set: spelled one way (src, ./src, src/, an absolute path inside the repo), de-duplicated and
  // sorted, so the same audit named in another order or spelling is the same report. A path that leaves the repo is kept
  // as typed; the resolver rejects it.
  const spell = (d) => {
    const inside = ds.safeJoin(root, d);
    return inside ? ds.toPosix(path.relative(root, inside)) || "." : String(d).trim();
  };
  const requested = opts.dirs && opts.dirs.length ? opts.dirs : ds.DEFAULT_DIRS;
  const scanDirs = [...new Set(requested.map(spell))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const tokenSource = ds.resolveTokenSource(root, scanDirs);
  const pop = ds.population(root, scanDirs, tokenSource);
  const censusAbs = new Set(pop.census.map((f) => f.abs));
  if (tokenSource.abs) censusAbs.add(tokenSource.abs);

  // ── containment ──
  const verdicts = new Map();
  const escaped = new Set();
  /** True when `file` (absolute) stays inside the repo; a path that leaves it is recorded and warned about once. */
  function inside(file) {
    if (censusAbs.has(file)) return true; // listed by a walk that never follows a symlink
    if (verdicts.has(file)) return verdicts.get(file);
    const ok = !ds.escapesBySymlink(root, file); // a missing, dangling or looping path is left to the normal "missing" handling
    verdicts.set(file, ok);
    if (!ok) {
      const shown = relOf(file);
      escaped.add(shown);
      warn(`symlink resolves outside the repo: ${shown}`);
    }
    return ok;
  }

  // the default list names folders most repos do not have: only a folder you named is worth a warning (scope.missingDirs lists them all)
  const named = Boolean(opts.dirs && opts.dirs.length);
  if (named) for (const d of pop.missingDirs) warn(`audited dir not found: ${d}`);
  for (const d of pop.rejectedDirs) warn(`audited dir outside the repo root was ignored: ${d}`);
  if (!tokenSource.abs) warn(tokenSource.reason);
  if (tokenSource.alternatives && tokenSource.alternatives.length) warn(`token source is ambiguous: ${tokenSource.reason}`);
  // the resolver reads these before any group does; say so when it refused one
  for (const rel of FIXED_INPUTS) inside(path.join(root, rel));
  const gitState = gitInfo(root, { wantDirty: Boolean(opts.dirty) });
  if (gitState.prefix) warn(`the audited root is the folder ${gitState.prefix} of a larger git repository: commit, commit date and every age counter are that repository's HEAD`);
  if (pop.skippedDirs.length) {
    const shown = pop.skippedDirs.slice(0, 8).join(", ");
    warn(`folders skipped by name, not audited (build, out, vendor, reference, generated, __generated__ and _generated are never walked): ${shown}${pop.skippedDirs.length > 8 ? `, … (${pop.skippedDirs.length - 8} more)` : ""}`);
  }

  const abs = (p) => (typeof p === "string" ? (path.isAbsolute(p) ? p : path.join(root, p)) : p.abs);

  /**
   * One file's text and how the read went: {text} or {skipped: reason, code?}. Cached. Reasons:
   * "outside" (a symlink leaves the repo), "over" (past the 5 MB cap), "budget" (past the run's total
   * budget), "not-a-file", "unreadable" (code = errno), "missing" (no such file).
   */
  function readFile(p) {
    const file = abs(p);
    if (cache.has(file)) return cache.get(file);
    const rel = relOf(file);
    const isCensus = censusAbs.has(file);
    let entry;
    if (!inside(file)) {
      entry = { text: "", skipped: "outside" };
    } else {
      const r = ds.readBounded(file, MAX_READ_BYTES);
      if (r.text !== undefined) {
        const text = r.text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
        if (readTotal + text.length > budget) {
          entry = { text: "", skipped: "budget" };
          skipped.set(rel, "budget");
          budgetSkipped.push(rel);
          if (budgetSkipped.length <= SKIP_WARN_FILES) warn(`skipped (over the ${describeBytes(budget)} read budget): ${rel}`);
        } else {
          readTotal += text.length;
          entry = { text };
        }
      } else if (r.skipped === "over") {
        entry = { text: "", skipped: "over" };
        skipped.set(rel, "over");
        overSkipped.push(rel);
        if (overSkipped.length <= SKIP_WARN_FILES) warn(`skipped (over ${MAX_READ_BYTES / 1024 / 1024} MB): ${rel}`);
      } else if (r.skipped === "not-a-file") {
        entry = { text: "", skipped: "not-a-file" };
        // a directory is just "not a file"; a FIFO or a device is worth saying
        let isDir = false;
        try { isDir = fs.statSync(file).isDirectory(); } catch { /* gone */ }
        if (!isDir && !isCensus) warn(`skipped (not a regular file): ${rel}`);
      } else if (r.code === "ENOENT") {
        entry = { text: "", skipped: "missing" };
      } else {
        entry = { text: "", skipped: "unreadable", code: r.code };
        // an audited file that cannot be read is reported once, with the others, by unreadable()
        if (!isCensus) warn(`unreadable (${r.code}): ${rel}`);
      }
    }
    cache.set(file, entry);
    return entry;
  }

  const read = (p) => readFile(p).text;

  const exists = (p) => { const file = abs(p); if (!inside(file)) return false; try { fs.statSync(file); return true; } catch { return false; } };
  const isDirectory = (p) => { const file = abs(p); if (!inside(file)) return false; try { return fs.statSync(file).isDirectory(); } catch { return false; } };

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
   * Sorted by repo-relative path. Symlinks are never followed; tool output and
   * dependency directories (design-source TREE_SKIP_DIRS) are skipped, but not the
   * vendored/generated ones the audited population also leaves out.
   */
  function listTree(relDir, { exts = null } = {}) {
    const out = [];
    if (!inside(abs(relDir))) return out;
    const start = ds.safeJoin(root, relDir);
    if (!start) return out;
    const walk = (dirAbs) => {
      let entries;
      try { entries = fs.readdirSync(dirAbs, { withFileTypes: true }); } catch { return; }
      entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
      for (const e of entries) {
        if (e.isSymbolicLink()) continue;
        const full = path.join(dirAbs, e.name);
        if (e.isDirectory()) {
          if (!ds.TREE_SKIP_DIRS.has(e.name)) walk(full);
        } else if (e.isFile() && (!exts || exts.includes(path.extname(e.name)))) {
          out.push({ abs: full, rel: relOf(full) });
        }
      }
    };
    walk(start);
    return out;
  }

  const byExt = (files, ...exts) => files.filter((f) => exts.includes(path.extname(f.rel)));

  /** One value per context, computed on first use (a parse or a scan several groups share). */
  function memo(key, compute) {
    if (!memos.has(key)) memos.set(key, compute());
    return memos.get(key);
  }

  /**
   * `systemix drift scan` over this audit's population, once per run (colour and reachability both quote it): the
   * scanner IS the one in commands/drift.js, fed the files this context reads and the token source and population
   * it resolved, so nothing is read or resolved twice and a file past the read cap is skipped by the scanner and
   * by every counter alike.
   */
  const scan = () => memo("scan", () => {
    const { scanProject } = require("../../commands/drift");
    const why = { over: `over ${MAX_READ_BYTES / 1024 / 1024} MB`, budget: "past the read budget", "not-a-file": "not a regular file" };
    return scanProject(root, scanDirs, {
      tokenSource,
      population: pop,
      readFile: (_abs, rel) => {
        const r = readFile(rel);
        return r.skipped ? { skipped: why[r.skipped] ?? "unreadable" } : { text: r.text };
      },
    });
  });

  /** Census files that cannot be opened as regular files (a name that is not valid UTF-8 included): [{file, reason}]. */
  const unreadable = () => memo("unreadable", () => {
    const rows = [];
    for (const f of pop.census) {
      const status = probe(f.abs);
      if (status !== "ok") rows.push({ file: f.rel, reason: status });
    }
    return rows;
  });

  /** The rels among `rels` that were left unread for being over the cap or past the run's budget. */
  const skippedReads = (rels) => rels.filter((r) => skipped.has(r));

  /** Repo-relative paths that were read as absent because a symlink leaves the repo. */
  const escapedList = () => [...escaped].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  /** Notes saying which of `rels` were ignored because they resolve outside the repo. */
  const leftRepoNotes = (rels) => {
    const left = escapedList();
    return rels.filter((r) => left.includes(r)).map((r) => `${r} is a symlink that resolves outside the repo and was ignored`);
  };

  /** Called once after the last group: the warnings that need the whole run (files skipped past the first few named). */
  function finish() {
    if (overSkipped.length > SKIP_WARN_FILES) {
      warn(`${overSkipped.length - SKIP_WARN_FILES} more file(s) were over the ${MAX_READ_BYTES / 1024 / 1024} MB read cap and were not read`);
    }
    if (budgetSkipped.length > SKIP_WARN_FILES) {
      warn(`${budgetSkipped.length - SKIP_WARN_FILES} more file(s) were not read because the run's ${describeBytes(budget)} read budget was spent; every counter over those files undercounts`);
    }
  }

  return {
    root,
    requestedDirs: scanDirs,
    dirs: pop.dirs,
    tokenSource,
    population: pop,
    census: pop.census,
    tests: pop.tests,
    audited: pop.audited,
    git: gitState,
    warnings,
    warn,
    read,
    readFile,
    exists,
    escaped: escapedList,
    leftRepoNotes,
    isDirectory,
    readJson,
    config,
    listTree,
    byExt,
    lineCount,
    countMatches,
    memo,
    scan,
    unreadable,
    skipped,
    skippedReads,
    finish,
    toPosix: ds.toPosix,
  };
}

module.exports = { createContext, lineCount, countMatches };
