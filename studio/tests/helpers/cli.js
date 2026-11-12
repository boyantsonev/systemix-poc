"use strict";

// Run the CLI in-process: cli(["rules", "lint"], { root }) → { code, stdout, stderr, json }.
// The clock is fixed (2026-01-15T10:00:00Z) unless `now` is given, so goldens are stable.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { main } = require("../../bin/product-studio");
const { makeCtx } = require("../../src/lib/ctx");

const FIXED_NOW = new Date("2026-01-15T10:00:00Z");

async function cli(argv, { root, now = FIXED_NOW, stdin = "", env = {} } = {}) {
  const outLines = [];
  const errLines = [];
  const ctx = makeCtx({
    cwd: root || process.cwd(),
    now,
    env: { ...env },
    stdin,
    out: (s = "") => outLines.push(String(s)),
    err: (s = "") => errLines.push(String(s)),
  });
  const code = await main(argv, ctx);
  const stdout = outLines.join("\n");
  let json;
  try {
    json = JSON.parse(stdout);
  } catch {
    json = undefined;
  }
  return { code, stdout, stderr: errLines.join("\n"), json };
}

/** A fresh temp dir; `files` is { "rel/path": "content" }. */
function tmpRepo(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ps-"));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}

const read = (root, rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (root, rel) => fs.existsSync(path.join(root, rel));

module.exports = { cli, tmpRepo, read, exists, FIXED_NOW };
