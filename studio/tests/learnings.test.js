"use strict";

const fs = require("fs");
const path = require("path");
const { cli, tmpRepo, read } = require("./helpers/cli");
const { materialize } = require("./helpers/fixtures");

const BULLET = /^- \*\*L-\d{3,}\*\* · (high|medium|low) · review-by \d{4}-\d{2}-\d{2} · .+ · source: .+$/;
const bullets = (root) => read(root, "design/LEARNINGS.md").split("\n").filter((l) => l.startsWith("- **L-"));
const OK = ["--text", "Showing who invited them doubles accepted invites", "--confidence", "medium", "--review-by", "2026-07-01", "--source", "G-001, design/evaluations.md"];
const without = (flag) => {
  const i = OK.indexOf(flag);
  return [...OK.slice(0, i), ...OK.slice(i + 2)];
};
const withValue = (flag, value) => OK.map((v, i) => (OK[i - 1] === flag ? value : v));

describe("learnings add", () => {
  test("writes exactly one cited bullet with the next id", async () => {
    const root = materialize("F4-loops");
    const before = bullets(root);
    const r = await cli(["learnings", "add", ...OK, "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json).toEqual({
      id: "L-003",
      line: "- **L-003** · medium · review-by 2026-07-01 · Showing who invited them doubles accepted invites · source: G-001, design/evaluations.md",
    });
    const after = bullets(root);
    expect(after).toHaveLength(before.length + 1);
    expect(after.slice(0, -1)).toEqual(before);
    expect(after.slice(-1)[0]).toBe(r.json.line);
    expect(r.json.line).toMatch(BULLET);
  });

  test("rejects a missing field, a bad date or confidence, and text over 300 characters, writing nothing", async () => {
    const root = materialize("F4-loops");
    const before = read(root, "design/LEARNINGS.md");
    const cases = [
      without("--text"),
      without("--confidence"),
      without("--review-by"),
      without("--source"),
      withValue("--review-by", "2026-02-30"),
      withValue("--review-by", "next spring"),
      withValue("--confidence", "certain"),
      withValue("--text", "x".repeat(301)),
      withValue("--source", " "),
    ];
    for (const args of cases) {
      const r = await cli(["learnings", "add", ...args, "--json"], { root });
      expect([args.join(" ").slice(0, 60), r.code]).toEqual([args.join(" ").slice(0, 60), 1]);
      expect(r.json.ok).toBe(false);
      expect(r.json.problems.length).toBeGreaterThan(0);
    }
    expect(read(root, "design/LEARNINGS.md")).toBe(before);
    expect((await cli(["learnings", "add", ...withValue("--text", "x".repeat(300)), "--json"], { root })).code).toBe(0);
  });

  test("creates the ledger with its header when it is missing", async () => {
    const root = tmpRepo();
    const r = await cli(["learnings", "add", ...OK, "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json.id).toBe("L-001");
    const text = read(root, "design/LEARNINGS.md");
    expect(text).toMatch(/^# Learnings\n/);
    expect(text).not.toContain("{{");
    expect(bullets(root)).toEqual([r.json.line]);
  });
});

describe("learnings used", () => {
  test("appends the goal to used-by, and a second run changes nothing", async () => {
    const root = materialize("F4-loops");
    const first = await cli(["learnings", "used", "L-002", "--by", "G-005", "--json"], { root });
    expect(first.code).toBe(0);
    expect(first.json).toMatchObject({ id: "L-002", usedBy: ["G-005"], changed: true });
    const after = read(root, "design/LEARNINGS.md");
    const second = await cli(["learnings", "used", "L-002", "--by", "G-005", "--json"], { root });
    expect(second.code).toBe(0);
    expect(second.json).toMatchObject({ usedBy: ["G-005"], changed: false });
    expect(read(root, "design/LEARNINGS.md")).toBe(after);
    expect(bullets(root).find((l) => l.startsWith("- **L-002**"))).toMatch(/ · used-by: G-005$/);
  });

  test("adds to an existing used-by list", async () => {
    const root = materialize("F4-loops");
    const r = await cli(["learnings", "used", "L-001", "--by", "G-003", "--json"], { root });
    expect(r.json.usedBy).toEqual(["G-002", "G-003"]);
    expect(bullets(root)[0]).toMatch(/ · used-by: G-002, G-003$/);
    expect(bullets(root)[0]).toMatch(BULLET);
  });

  test("an unknown learning fails; bad ids are usage errors", async () => {
    const root = materialize("F4-loops");
    const r = await cli(["learnings", "used", "L-042", "--by", "G-001", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.error).toBe("no-such-learning");
    expect((await cli(["learnings", "used", "L-001", "--by", "goal one"], { root })).code).toBe(2);
    expect((await cli(["learnings", "used", "one", "--by", "G-001"], { root })).code).toBe(2);
  });
});

describe("learnings list", () => {
  test("every learning, newest first, with its fields", async () => {
    const r = await cli(["learnings", "list", "--json"], { root: materialize("F4-loops") });
    expect(r.code).toBe(0);
    expect(r.json.learnings.map((l) => l.id)).toEqual(["L-002", "L-001"]);
    expect(r.json.learnings[1]).toEqual({
      id: "L-001",
      confidence: "high",
      reviewBy: "2026-06-30",
      text: "People who see the yearly price first choose the yearly plan about twice as often as people who see the monthly price first",
      source: "design/decisions/D-001-yearly-price-first.md",
      usedBy: ["G-002"],
      stale: false,
    });
  });

  test("--recent n keeps the newest n", async () => {
    const root = materialize("F4-loops");
    await cli(["learnings", "add", ...OK], { root });
    const r = await cli(["learnings", "list", "--recent", "2", "--json"], { root });
    expect(r.json.learnings.map((l) => l.id)).toEqual(["L-003", "L-002"]);
    expect((await cli(["learnings", "list", "--recent", "zero"], { root })).code).toBe(2);
  });

  test("a learning is stale once its review-by date has passed", async () => {
    const root = materialize("F4-loops");
    const now = await cli(["learnings", "list", "--json"], { root });
    expect(now.json.learnings.every((l) => !l.stale)).toBe(true);
    const later = await cli(["learnings", "list", "--json"], { root, now: new Date("2026-05-01T09:00:00Z") });
    expect(Object.fromEntries(later.json.learnings.map((l) => [l.id, l.stale]))).toEqual({ "L-001": false, "L-002": true });
    const onTheDay = await cli(["learnings", "list", "--json"], { root, now: new Date("2026-04-15T09:00:00Z") });
    expect(onTheDay.json.learnings.find((l) => l.id === "L-002").stale).toBe(false);
  });

  test("a repo with no ledger lists nothing", async () => {
    const r = await cli(["learnings", "list", "--json"], { root: tmpRepo() });
    expect(r.code).toBe(0);
    expect(r.json.learnings).toEqual([]);
  });

  test("a malformed bullet is reported, not guessed", async () => {
    const root = materialize("F4-loops");
    fs.appendFileSync(path.join(root, "design/LEARNINGS.md"), "- **L-003** · sure · we learned a thing\n");
    const r = await cli(["learnings", "list", "--json"], { root });
    expect(r.json.learnings).toHaveLength(2);
    expect(r.json.problems).toHaveLength(1);
  });
});
