"use strict";

// materialize("F3-installed", { variant: "no-origin", branch: true }) → a temp git repo built
// from evals/fixtures/<id>/ (see SPEC.md § Fixtures). The harness and the Jest goldens both use it.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const FIXTURES = path.join(__dirname, "..", "..", "evals", "fixtures");
const GIT_ENV = {
  GIT_AUTHOR_NAME: "fixture",
  GIT_AUTHOR_EMAIL: "fixture@example.com",
  GIT_COMMITTER_NAME: "fixture",
  GIT_COMMITTER_EMAIL: "fixture@example.com",
  GIT_AUTHOR_DATE: "2026-01-14T09:00:00Z",
  GIT_COMMITTER_DATE: "2026-01-14T09:00:00Z",
};

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const listFixtures = () => fs.readdirSync(FIXTURES).filter((d) => fs.existsSync(path.join(FIXTURES, d, "fixture.json"))).sort();

function spec(id) {
  const dir = path.join(FIXTURES, id);
  if (!fs.existsSync(path.join(dir, "fixture.json"))) throw new Error(`no fixture ${id} (have: ${listFixtures().join(", ")})`);
  return { dir, ...JSON.parse(fs.readFileSync(path.join(dir, "fixture.json"), "utf8")) };
}

function materialize(id, { variant = null, branch = true, into = null } = {}) {
  const f = spec(id);
  const v = variant ? f.variants && f.variants[variant] : null;
  if (variant && !v) throw new Error(`fixture ${id} has no variant ${variant}`);
  const root = into || fs.mkdtempSync(path.join(os.tmpdir(), `ps-${id}-`));
  copyDir(path.join(f.dir, "repo"), root);
  const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "ignore", env: { ...process.env, ...GIT_ENV } });
  const initial = (v && v.initialBranch) || "main";
  git("init", "-q", "-b", initial);
  if (v && v.overlay) copyDir(path.join(f.dir, v.overlay), root);
  for (const r of (v && v.remove) || []) fs.rmSync(path.join(root, r), { recursive: true, force: true });
  git("add", "-A");
  git("commit", "-qm", `fixture ${id}${variant ? ` (${variant})` : ""}`, "--allow-empty");
  if (branch && f.branch) {
    git("checkout", "-qb", f.branch.name);
    copyDir(path.join(f.dir, f.branch.overlay), root);
    git("add", "-A");
    git("commit", "-qm", `branch ${f.branch.name}`);
  }
  return root;
}

module.exports = { materialize, listFixtures, spec, FIXTURES };
