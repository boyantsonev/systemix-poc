"use strict";

// The context every command runs in. Commands never touch process.* directly, so tests run
// them in-process with a fixed clock, a captured stdout and a temp root.

const fs = require("fs");
const path = require("path");

/**
 * makeCtx({ cwd, now, env, stdin, out, err })
 *   ctx.root     the project root (cwd, or --root once the command resolves it with ctx.rootFrom)
 *   ctx.out(s)   write a line to stdout;  ctx.err(s) to stderr
 *   ctx.json(v)  write v as pretty JSON to stdout
 *   ctx.stdin()  the whole of stdin as a string ("" when there is none)
 *   ctx.now      a Date (fixed in tests)
 */
function makeCtx({ cwd = process.cwd(), now = new Date(), env = process.env, stdin = null, out = null, err = null } = {}) {
  const ctx = {
    cwd,
    root: cwd,
    now,
    env,
    out: out || ((s = "") => process.stdout.write(s + "\n")),
    err: err || ((s = "") => process.stderr.write(s + "\n")),
    stdin: () => {
      if (stdin !== null) return stdin;
      try {
        return fs.readFileSync(0, "utf8");
      } catch {
        return "";
      }
    },
  };
  ctx.json = (v) => ctx.out(JSON.stringify(v, null, 2));
  ctx.fail = (msg) => {
    ctx.err(`  ✗ ${msg}`);
    return 1;
  };
  ctx.usage = (msg, usage) => {
    ctx.err(`  ✗ ${msg}`);
    if (usage) ctx.err(usage);
    return 2;
  };
  /** Resolve --root against cwd and set ctx.root. */
  ctx.rootFrom = (rootFlag) => {
    ctx.root = path.resolve(cwd, rootFlag || ".");
    return ctx.root;
  };
  ctx.today = () => now.toISOString().slice(0, 10);
  return ctx;
}

/** Repo-relative path for messages and JSON (forward slashes on every OS). */
const relTo = (root, file) => (path.relative(root, file) || file).split(path.sep).join("/");

module.exports = { makeCtx, relTo };
