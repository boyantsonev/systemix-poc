"use strict";

/**
 * Acceptance tests — experiments/goals/ file-ops. Real filesystem (tmp dirs).
 * Mirrors tests/acceptance/experiment/experiment.test.js's shape: the shared
 * lib (src/lib/goals.js) + the CLI door (src/commands/goal.js) over the same
 * files. Also covers the experiment-side `goal:` field (src/lib/experiments.js)
 * that links an experiment to a goal.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const matter = require("gray-matter");

const goalsLib = require("../../../src/lib/goals");
const exp = require("../../../src/lib/experiments");
const { goal } = require("../../../src/commands/goal");
const { experiment } = require("../../../src/commands/experiment");

const NOW = new Date("2026-07-06T00:00:00.000Z");

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "systemix-goal-"));
}
const readGoal = (root, id) =>
  matter(fs.readFileSync(path.join(root, "experiments", "goals", `${id}.mdx`), "utf8"));

describe("experiments/goals/ — file-first ops", () => {
  let root;
  beforeEach(() => { root = tmpRoot(); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  it("new creates experiments/goals/<id>.mdx (status: active) with the goal schema", () => {
    goalsLib.createGoal(root, "consultancy-leads", {
      title: "Attract consultancy leads",
      given: "the loop is the lead magnet",
      goalType: "surface",
      icp: "pre-pmf-founder",
      successCriteria: "founders book a call at a meaningful rate",
      killIf: "two cycles with no lift",
      now: NOW,
    });
    const fm = readGoal(root, "consultancy-leads").data;
    expect(fm.type).toBe("goal");
    expect(fm.title).toBe("Attract consultancy leads");
    expect(fm.status).toBe("active");
    expect(fm.order).toBe(0);
    expect(fm["goal-type"]).toBe("surface");
    expect(fm["success-criteria"]).toBe("founders book a call at a meaningful rate");
    expect(fm["kill-if"]).toBe("two cycles with no lift");
    expect(fm.records).toBeUndefined(); // no vestigial field on new goals
  });

  it("new throws if the goal already exists", () => {
    goalsLib.createGoal(root, "dup", { now: NOW });
    expect(() => goalsLib.createGoal(root, "dup", { now: NOW })).toThrow(/already exists/);
  });

  it("new appends order after the highest existing goal — no hand-picked numbers", () => {
    goalsLib.createGoal(root, "a", { order: 0, now: NOW });
    goalsLib.createGoal(root, "b", { order: 5, now: NOW });
    goalsLib.createGoal(root, "c", { now: NOW }); // no order given
    expect(readGoal(root, "c").data.order).toBe(6);
  });

  it("list sorts by order and defaults title/status", () => {
    goalsLib.createGoal(root, "second", { order: 1, now: NOW });
    goalsLib.createGoal(root, "first", { order: 0, now: NOW });
    const items = goalsLib.listGoals(root);
    expect(items.map((g) => g.id)).toEqual(["first", "second"]);
  });

  it("the _example template file is excluded from list", () => {
    fs.mkdirSync(path.join(root, "experiments", "goals"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "experiments", "goals", "_example.mdx"),
      "---\ntype: goal\nid: example-goal\nstatus: active\n---\n",
      "utf8"
    );
    expect(goalsLib.listGoals(root)).toEqual([]);
  });

  it("CLI door: `goal new` writes the same file", async () => {
    await goal(["new", "cli-goal", "--title", "From the CLI"], { projectRoot: root });
    const fm = readGoal(root, "cli-goal").data;
    expect(fm.id).toBe("cli-goal");
    expect(fm.title).toBe("From the CLI");
    expect(fm.status).toBe("active");
  });

  it("CLI door: `goal list` reports created goals", async () => {
    await goal(["new", "reported", "--title", "Reported goal"], { projectRoot: root });
    const items = goalsLib.listGoals(root);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("reported");
  });
});

describe("experiments/goals/ — path-safe ids", () => {
  let root;
  beforeEach(() => { root = tmpRoot(); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  const UNSAFE_IDS = [
    "../x",
    "../../outside-the-repo",
    "nested/id",
    "back\\slash",
    "..",
    ".hidden",
    "-leading-hyphen",
    "Upper-Case",
    "with space",
    "under_score",
    "dotted.name",
    "line\nbreak",
    "x".repeat(82),
  ];

  it.each(UNSAFE_IDS)("new rejects the unsafe id %j and writes nothing", (id) => {
    expect(() => goalsLib.createGoal(root, id, { now: NOW })).toThrow(/^invalid goal id /);
    expect(fs.readdirSync(root)).toEqual([]); // not even experiments/goals/ — rejected before any write
  });

  it("new rejects a missing id with a clear error", () => {
    expect(() => goalsLib.createGoal(root, undefined)).toThrow("a goal id is required");
    expect(() => goalsLib.createGoal(root, "")).toThrow("a goal id is required");
  });

  it.each(["a", "0", "consultancy-leads", "x".repeat(81)])("new accepts the kebab-case id %j", (id) => {
    goalsLib.createGoal(root, id, { now: NOW });
    expect(fs.existsSync(path.join(root, "experiments", "goals", `${id}.mdx`))).toBe(true);
  });

  it("goalFile refuses a traversal id instead of resolving a path outside experiments/goals/", () => {
    expect(() => goalsLib.goalFile(root, "../x")).toThrow('invalid goal id "../x"');
  });

  it("CLI door: `goal new ../x` rejects the id and writes nothing outside experiments/goals/", async () => {
    await expect(goal(["new", "../x"], { projectRoot: root })).rejects.toThrow('invalid goal id "../x"');
    expect(fs.existsSync(path.join(root, "experiments", "x.mdx"))).toBe(false); // where ../x would land
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it("the `systemix` binary prints the error and exits 1 — no stack trace, no file", () => {
    const { spawnSync } = require("child_process");
    const bin = path.join(__dirname, "..", "..", "..", "bin", "cli.js");
    const r = spawnSync(process.execPath, [bin, "goal", "new", "../x"], { cwd: root, encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('✗ invalid goal id "../x" — use lowercase letters, digits and hyphens');
    expect(r.stderr).not.toMatch(/\n\s+at /); // no stack frames
    expect(fs.existsSync(path.join(root, "experiments"))).toBe(false);
  });
});

describe("experiments/<id>.mdx — the `goal:` link to a goal", () => {
  let root;
  beforeEach(() => { root = tmpRoot(); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  it("createExperiment persists a `goal:` field, defaulting to null", () => {
    exp.createExperiment(root, "no-goal-exp", { now: NOW });
    expect(
      matter(fs.readFileSync(path.join(root, "experiments", "no-goal-exp.mdx"), "utf8")).data.goal
    ).toBeNull();

    exp.createExperiment(root, "with-goal-exp", { goal: "consultancy-leads", now: NOW });
    expect(
      matter(fs.readFileSync(path.join(root, "experiments", "with-goal-exp.mdx"), "utf8")).data.goal
    ).toBe("consultancy-leads");
  });

  it("CLI door: `experiment new --goal` writes the link", async () => {
    await experiment(["new", "cli-linked", "--goal", "consultancy-leads"], { projectRoot: root });
    const fm = matter(
      fs.readFileSync(path.join(root, "experiments", "cli-linked.mdx"), "utf8")
    ).data;
    expect(fm.goal).toBe("consultancy-leads");
  });
});
