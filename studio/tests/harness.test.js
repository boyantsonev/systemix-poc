"use strict";

const s = require("../evals/lib/score.cjs");

const skill = (name) => ({ type: "assistant", message: { content: [{ type: "tool_use", name: "Skill", input: { skill: name } }] } });
const text = (t) => ({ type: "assistant", message: { content: [{ type: "text", text: t }] } });

describe("eval scoring", () => {
  test("skills invoked, without the plugin prefix, in order", () => {
    expect(s.skillsInvoked([skill("product-studio:check"), text("x"), skill("product-studio:setup"), skill("design:ux-copy")], "product-studio")).toEqual(["check", "setup", "design:ux-copy"]);
  });

  test("skill_invoked: a string or an ordered list; another plugin's skill does not count against it", () => {
    const run = (events) => ({ turns: [{ text: "", events, snapshotAfter: {} }], snapshotBefore: {}, plugin: "product-studio" });
    expect(s.scoreCase({ skill_invoked: "check" }, run([skill("product-studio:check")])).ok).toBe(true);
    expect(s.scoreCase({ skill_invoked: "check" }, run([skill("product-studio:brief")])).ok).toBe(false);
    expect(s.scoreCase({ skill_invoked: ["check", "setup"] }, run([skill("product-studio:check"), skill("design:design-critique"), skill("product-studio:setup")])).ok).toBe(true);
    expect(s.scoreCase({ skill_invoked: ["check", "setup"] }, run([skill("product-studio:setup"), skill("product-studio:check")])).ok).toBe(false);
  });

  test("a write before the yes fails; the automatic writes never count", () => {
    const base = { "a.css": "1" };
    const run = (afterFirst, afterSecond) => ({
      turns: [
        { text: "proposal", events: [], snapshotAfter: afterFirst },
        { text: "done", events: [], snapshotAfter: afterSecond },
      ],
      snapshotBefore: base,
      plugin: "product-studio",
    });
    const auto = { ...base, "design/.studio/runs.jsonl": "x", "design/.studio/preview.html": "y" };
    expect(s.scoreCase({ no_write_before_turn: 2 }, run(auto, { ...auto, "design/rules.md": "r" })).ok).toBe(true);
    const early = s.scoreCase({ no_write_before_turn: 2 }, run({ ...auto, "design/rules.md": "r" }, { ...auto, "design/rules.md": "r" }));
    expect(early.ok).toBe(false);
    expect(early.checks[0].detail).toMatch(/design\/rules\.md/);
    expect(s.scoreCase({ no_repo_writes: true }, run(auto, auto)).ok).toBe(true);
    expect(s.scoreCase({ no_repo_writes: true }, run(auto, { ...auto, "a.css": "2" })).ok).toBe(false);
  });

  test("must_include and must_not_include are case-insensitive over every turn", () => {
    const run = { turns: [{ text: "FAIL · T1 raw hex", events: [], snapshotAfter: {} }, { text: "offer setup", events: [], snapshotAfter: {} }], snapshotBefore: {}, plugin: "p" };
    expect(s.scoreCase({ must_include: ["fail", "t1", "Setup"], must_not_include: ["HEAD~1"] }, run).ok).toBe(true);
    expect(s.scoreCase({ must_not_include: ["raw hex"] }, run).ok).toBe(false);
  });

  test("files, run-log rows and cli_after", () => {
    const run = { turns: [{ text: "", events: [], snapshotAfter: { "design/rules.md": "x" } }], snapshotBefore: {}, runLogRows: 2, cliAfter: [{ argv: ["rules", "lint"], code: 0 }], plugin: "p" };
    const r = s.scoreCase({ files_exist: ["design/rules.md"], files_absent: ["design/tokens.css"], run_log_rows: 2, cli_after: [{ argv: ["rules", "lint"], code: 0 }] }, run);
    expect(r.ok).toBe(true);
    expect(s.scoreCase({ run_log_rows: 1 }, run).ok).toBe(false);
  });

  test("majority over samples, the judge verdict and its parsing", () => {
    expect(s.majority([true, true, false])).toBe(true);
    expect(s.majority([true, false])).toBe(false);
    expect(s.judgeOk({ criteria: [{ pass: true }, { pass: true }] })).toBe(true);
    expect(s.judgeOk({ criteria: [{ pass: true }, { pass: false }] })).toBe(false);
    expect(s.judgeOk(null)).toBe(false);
    expect(s.parseJudge('Here: {"criteria":[{"criterion":"a","pass":true,"quote":"q"}]} done')).toEqual({ criteria: [{ criterion: "a", pass: true, quote: "q" }] });
    expect(s.parseJudge("no json")).toBeNull();
  });

  test("triggers: the first studio skill fired, and the summary", () => {
    expect(s.triggerGot([skill("design:design-critique"), skill("product-studio:check")], "product-studio", ["setup", "brief", "check"])).toBe("check");
    expect(s.triggerGot([skill("design:design-critique")], "product-studio", ["check"])).toBeNull();
    const sum = s.triggerSummary([
      { ask: "a", expect: "check", got: "check" },
      { ask: "b", expect: "setup", got: "check" },
      { ask: "c", expect: null, got: null },
      { ask: "d", expect: null, got: "brief" },
    ]);
    expect(sum).toEqual({ total: 4, positives: { ok: 1, total: 2 }, negatives: { ok: 1, total: 2 }, misses: [{ ask: "b", expected: "setup", got: "check" }, { ask: "d", expected: null, got: "brief" }] });
  });
});
