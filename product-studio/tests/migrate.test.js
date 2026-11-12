"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { cli, tmpRepo, read, exists } = require("./helpers/cli");
const { materialize } = require("./helpers/fixtures");

const GOLDEN = path.join(__dirname, "golden", "migrate");

/** Compare with a golden file; UPDATE_GOLDEN=1 rewrites it. */
function golden(name, actual) {
  const file = path.join(GOLDEN, name);
  if (process.env.UPDATE_GOLDEN === "1") {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, actual);
  }
  expect(fs.existsSync(file)).toBe(true);
  expect(actual).toBe(fs.readFileSync(file, "utf8"));
}

/** Every file under root (but .git) with a hash of its bytes. */
function snapshot(root) {
  const out = {};
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === ".git") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else out[path.relative(root, p).split(path.sep).join("/")] = crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");
    }
  };
  walk(root);
  return out;
}

const git = (root, ...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" });

describe("migrate", () => {
  test("--dry-run on F8: golden JSON and text, and it changes no file", async () => {
    const root = materialize("F8-legacy");
    const before = snapshot(root);
    const json = await cli(["migrate", "--dry-run", "--json"], { root });
    expect(json.code).toBe(0);
    const text = await cli(["migrate"], { root });
    expect(text.code).toBe(0);
    golden("F8-dry-run.json", json.stdout + "\n");
    golden("F8-dry-run.txt", text.stdout + "\n");
    expect(snapshot(root)).toEqual(before);
    expect(git(root, "status", "--porcelain")).toBe("");
  });

  test("the dry run on F8 lists the moves, all 10 guardrails bullets and the one unmapped learning", async () => {
    const r = (await cli(["migrate", "--json"], { root: materialize("F8-legacy") })).json;
    expect(r.applied).toBe(false);
    expect(r.legacy).toEqual({ guardrails: true, experiments: true, learnings: true, goals: true, state: true, evals: true, data: true });
    const by = (a) => r.moves.filter((m) => m.action === a).map((m) => [m.from, m.to]);
    expect(by("rewrite")).toEqual([["experiments/LEARNINGS.md", "studio/LEARNINGS.md"]]);
    expect(by("move")).toEqual([
      ["design/DESIGN.md", "studio/DESIGN.md"],
      ["design/evals/rules/known-bad/T1-raw-hex.css", "studio/rules/known-bad/T1-raw-hex.css"],
      ["design/tokens.css", "studio/tokens.css"],
    ]);
    expect(by("drop")).toEqual([[".systemix/", null]]);
    expect(by("create").map((m) => m[1])).toEqual([
      "studio/goals/G-002-clear-renewals/decisions.md",
      "studio/goals/G-002-clear-renewals/evals.md",
      "studio/goals/G-002-clear-renewals/goal.md",
      "studio/goals/G-001-faster-first-note/decisions.md",
      "studio/goals/G-001-faster-first-note/evals.md",
      "studio/goals/G-001-faster-first-note/goal.md",
    ]);
    expect(r.guardrails).toHaveLength(10);
    expect(r.guardrails[0]).toEqual({ line: 13, text: "All colours come from the custom properties in `design/tokens.css`: no raw hex (`#rrggbb`) in component styles." });
    expect(r.guardrails[9].text).toMatch(/^Never promise results/);
    expect(r.unmapped).toHaveLength(1);
    expect(r.unmapped[0].text).toMatch(/Templates on the empty notebook did not help/);
    expect(r.unmapped[0].why).toBe("missing a confidence, a review-by date");
    expect(r.conflicts).toEqual([]);
  });

  test("--apply moves the files, keeps guardrails.mdx, and the result reads back", async () => {
    const root = materialize("F8-legacy");
    const guardrails = read(root, "design/guardrails.mdx");
    const dry = (await cli(["migrate", "--json"], { root })).json;
    const r = await cli(["migrate", "--apply", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json).toEqual({ ...dry, applied: true });

    expect(read(root, "design/guardrails.mdx")).toBe(guardrails);
    expect(exists(root, "studio/rules/known-bad/T1-raw-hex.css")).toBe(true);
    for (const gone of [".systemix", "experiments", "design/evals"]) expect(exists(root, gone)).toBe(false);
    for (const f of dry.moves.filter((m) => m.to).map((m) => m.to)) expect(exists(root, f)).toBe(true);
    // docs stay where they are
    expect(exists(root, "docs/manifest.json")).toBe(true);
    expect((await cli(["docs", "sync", "--check"], { root })).code).toBe(0);

    const learnings = await cli(["learnings", "list", "--json"], { root });
    expect(learnings.code).toBe(0);
    expect(learnings.json.learnings.map((l) => [l.id, l.confidence, l.reviewBy, l.source])).toEqual([
      ["L-002", "high", "2026-03-24", "empty-notebook-2025-09, decision: promote"],
      ["L-001", "medium", "2026-01-10", "pricing-yearly-first-2025-08, decision: promote"],
    ]);

    const goal = read(root, "studio/goals/G-001-faster-first-note/goal.md");
    expect(goal).toMatch(/^---\nid: G-001\ntitle: New teams write their first note within two minutes\nstatus: open\nstep: product\.evals\nopened: 2025-08-20\n---\n/);
    expect(goal).toContain("## Success criteria\n- The median time from sign-up to the first note is under two minutes for new teams.\n");
    expect(goal).toContain("## Kill if\n- Two experiments in a row leave the median above three minutes.\n");
    expect(goal).toContain("## Context\n");

    // a second run has nothing left to move
    const again = (await cli(["migrate", "--json"], { root })).json;
    expect(again.moves).toEqual([]);
    expect(again.guardrails).toHaveLength(10);
  });

  test("after --apply and the starter rules, rules eval finds the moved known-bad sample", async () => {
    const root = materialize("F8-legacy");
    expect((await cli(["migrate", "--apply"], { root })).code).toBe(0);
    const init = await cli(["rules", "init", "--json"], { root });
    expect(init.json.kept).toContain("studio/rules/known-bad/T1-raw-hex.css");
    const ev = await cli(["rules", "eval", "--json"], { root });
    expect(ev.code).toBe(0);
    expect(ev.json.rows.find((x) => x.file === "studio/rules/known-bad/T1-raw-hex.css")).toMatchObject({ expect: "T1", ok: true });
  });

  test("--apply refuses on a dirty tree under the paths it touches, and changes nothing", async () => {
    const root = materialize("F8-legacy");
    fs.appendFileSync(path.join(root, "experiments/LEARNINGS.md"), "\n- an uncommitted note\n");
    const before = snapshot(root);
    const r = await cli(["migrate", "--apply", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json).toMatchObject({ ok: false, error: "dirty-tree", dirty: ["experiments/LEARNINGS.md"] });
    expect(snapshot(root)).toEqual(before);
    const text = await cli(["migrate", "--apply"], { root });
    expect(text.code).toBe(1);
    expect(text.stderr).toMatch(/uncommitted changes/);
  });

  test("an untracked file at a destination is dirty too; a change elsewhere is not", async () => {
    const root = materialize("F8-legacy");
    fs.writeFileSync(path.join(root, "README.md"), "changed\n");
    fs.mkdirSync(path.join(root, "studio"), { recursive: true });
    fs.writeFileSync(path.join(root, "studio/LEARNINGS.md"), "# Learnings\n");
    fs.mkdirSync(path.join(root, "studio/rules/known-bad"), { recursive: true });
    fs.writeFileSync(path.join(root, "studio/rules/known-bad/T1-raw-hex.css"), ".x { color: #000; }\n");
    const r = await cli(["migrate", "--apply", "--json"], { root });
    expect(r.code).toBe(1);
    // the differing sample is a conflict migrate leaves alone, so it is not a path it touches
    expect(r.json.dirty).toEqual(["studio/LEARNINGS.md"]);
    git(root, "add", "-A");
    git(root, "-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-qm", "wip");
    const ok = await cli(["migrate", "--apply", "--json"], { root });
    expect(ok.code).toBe(0);
    // a differing sample already in place is left alone and reported
    expect(ok.json.conflicts.map((c) => c.from)).toEqual(["design/evals/rules/known-bad/T1-raw-hex.css"]);
    expect(read(root, "studio/rules/known-bad/T1-raw-hex.css")).toBe(".x { color: #000; }\n");
    expect(exists(root, "design/evals/rules/known-bad/T1-raw-hex.css")).toBe(true);
  });

  test("--apply outside a git repo refuses", async () => {
    const root = tmpRepo({ ".systemix/queue.json": "{}" });
    const r = await cli(["migrate", "--apply", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.error).toBe("not-a-git-repo");
    expect(exists(root, ".systemix/queue.json")).toBe(true);
  });

  test("a repo with no older install has nothing to migrate", async () => {
    const r = await cli(["migrate", "--json"], { root: materialize("F3-installed", { branch: false }) });
    expect(r.code).toBe(0);
    expect(r.json.moves).toEqual([]);
    expect(r.json.guardrails).toEqual([]);
    expect(Object.values(r.json.legacy).every((v) => v === false)).toBe(true);
  });

  test("learnings are appended after an existing ledger, numbered on from it", async () => {
    const root = tmpRepo({
      "studio/LEARNINGS.md": "# Learnings\n\n- **L-004** · low · review-by 2026-06-01 · Kept. · source: G-001\n",
      "experiments/LEARNINGS.md": "# Learnings\n\n- **2025-10-01 · Short pages convert better.** — confidence 0.4 · from [short-pages], decision: iterate. Review by: 2026-04-01.\n",
    });
    git(root, "init", "-q", "-b", "main");
    git(root, "add", "-A");
    git(root, "-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-qm", "base");
    expect((await cli(["migrate", "--apply"], { root })).code).toBe(0);
    expect(read(root, "studio/LEARNINGS.md")).toBe(
      "# Learnings\n\n- **L-004** · low · review-by 2026-06-01 · Kept. · source: G-001\n\n- **L-005** · low · review-by 2026-04-01 · Short pages convert better. · source: short-pages, decision: iterate\n",
    );
  });

  test("usage errors are exit 2", async () => {
    const root = tmpRepo();
    expect((await cli(["migrate", "--apply", "--dry-run"], { root })).code).toBe(2);
    expect((await cli(["migrate", "now"], { root })).code).toBe(2);
  });
});
