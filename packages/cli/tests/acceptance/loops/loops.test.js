"use strict";

/**
 * The Loop Kit checker (src/lib/loopkit.js) and `systemix loops`: a fresh init with a
 * filled roster passes; each rule the kit names is refused with file:line.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const kit = require("../../../src/lib/loopkit");
const { init, loops } = require("../../../src/commands/loops");

const TODAY = "2026-10-31";
let root;
const d = (...p) => path.join(root, "design", ...p);
const write = (rel, text) => {
  fs.mkdirSync(path.dirname(d(rel)), { recursive: true });
  fs.writeFileSync(d(rel), text);
};
const edit = (rel, from, to) => fs.writeFileSync(d(rel), fs.readFileSync(d(rel), "utf8").replace(from, to));
const messages = (errs) => errs.map((e) => `${e.file}:${e.line}: ${e.message}`);
const check = () => {
  const sys = kit.load(root);
  return messages([...kit.checkLoops(sys), ...kit.checkGoals(sys)]);
};

const EVALS = `| id | must be true | checked by | bar | answered at | status |
|---|---|---|---|---|---|
| E1 | the score runs | npm test | passes | build.test | open |
| E2 | a person installs it | 3 observed installs | 3 of 3 under 2 min | build.measure | open |
| E3 | the hub shows goals | screenshot | every goal visible | product.score | open |
| E4 | gates are typed | decisions.md | one line per ruling | build.test | open |
| E5 | nothing self-approves | loops check | exit 0 | build.test | waived |
`;

function goal({ step = "product.evals", waiting = "reviewer", evals = EVALS, decisions = "# G-001 · decisions\n", extra = {} } = {}) {
  const fm = { id: "G-001", slug: "first-goal", title: "A first goal", asked: "make the first goal", status: "open", step, waiting, lead: "design-lead", repos: "[this-repo]", opened: TODAY, updated: TODAY, ...extra };
  write("goals/G-001-first-goal/goal.md", `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${v}`).join("\n")}\n---\n\n## The goal, as asked\n`);
  write("goals/G-001-first-goal/evals.md", evals);
  write("goals/G-001-first-goal/decisions.md", decisions);
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "sx-loops-"));
  init(root, "design", { today: TODAY });
  edit("loops/roster.md", /\{\{PERSON_A\}\}/g, "Ada");
  edit("loops/roster.md", /\{\{PERSON_B\}\}/g, "Lin");
});
afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  process.exitCode = 0;
});

describe("loops check", () => {
  test("a fresh init with a filled roster is well-formed", () => {
    expect(check()).toEqual([]);
    const sys = kit.load(root);
    expect(sys.loops.map((l) => l.fm.data.id)).toEqual(["build", "product"]);
    expect(Object.keys(sys.steps)).toEqual(expect.arrayContaining(["product.goal", "product.evals", "product.test", "build.hub", "build.measure"]));
  });

  test("an unfilled roster is refused", () => {
    edit("loops/roster.md", "holder: Ada\n", "holder: {{PERSON_A}}\n");
    expect(check().join("\n")).toMatch(/roster\.md:\d+: role design-lead: holder is still a placeholder/);
  });

  test("a person's name where a role belongs is refused", () => {
    edit("loops/product-loop.md", "- runs: design-lead + agent\n", "- runs: Ada + agent\n");
    expect(check().join("\n")).toMatch(/product-loop\.md:\d+: step "Shape" runs: "Ada" is a person/);
  });

  test("a step outside every Story phase, two decide steps, an approve gate without context are refused", () => {
    edit("loops/product-loop.md", "→ score, validate", "→ score");
    edit("loops/product-loop.md", "- kind: record", "- kind: decide\n- gate: decide · reviewer · context product");
    edit("loops/build-loop.md", "gate: approve · reviewer · context design, tech", "gate: approve · reviewer");
    const out = check().join("\n");
    expect(out).toMatch(/step "Validate" is in no Story phase/);
    expect(out).toMatch(/product-loop\.md:1: exactly one decide step per loop \(found 2\)/);
    expect(out).toMatch(/step "System": an approve gate names at least one context pack/);
  });

  test("agreed while awaiting, a missing path, a pack without its sections are refused", () => {
    edit("loops/build-loop.md", "status: draft", "status: agreed");
    edit("loops/product-loop.md", "experiments/LEARNINGS.md, design/goals/README.md", "experiments/LEARNINGS.md, design/nowhere.md");
    edit("context/tech.md", "## Numbers", "## Figures");
    const out = check().join("\n");
    expect(out).toMatch(/build-loop\.md:\d+: status agreed while awaiting \[reviewer\]/);
    expect(out).toMatch(/reads path design\/nowhere\.md does not exist/);
    expect(out).toMatch(/context\/tech\.md:1: context pack tech: missing section "## Numbers"/);
  });

  test("a join to an unknown step is refused", () => {
    edit("loops/joins.md", "### build.measure → product.learn", "### build.measure → product.lessons");
    expect(check().join("\n")).toMatch(/joins\.md:\d+: join names unknown step product\.lessons/);
  });
});

describe("goals check", () => {
  test("a goal waiting at the Evals gate is well-formed (a waived eval needs a decision line)", () => {
    goal({ decisions: "# G-001 · decisions\n\n- **2026-10-31 · Evals approved with changes.** E5 waived for now. (reviewer: Ada · context product, design, tech · brief B-001)\n" });
    expect(check()).toEqual([]);
  });

  test("waiting must be the gate lead of its step, and only at a gate", () => {
    goal({ waiting: "engineering-lead", decisions: "# G-001 · decisions\n- **2026-10-31 · Evals approved.** ok. (reviewer: Ada · context product)\n" });
    expect(check().join("\n")).toMatch(/waiting "engineering-lead" is not the gate lead of product\.evals \(reviewer\)/);
    goal({ step: "product.design", waiting: "reviewer", decisions: "# G-001 · decisions\n- **2026-10-31 · E5 waived.** E5. (reviewer: Ada · context product)\n" });
    expect(check().join("\n")).toMatch(/waiting is set but product\.design has no gate/);
  });

  test("a bad step, bad evals and a malformed decision line are refused", () => {
    goal({ step: "product.dream", evals: "| id | must be true | bar |\n|---|---|---|\n| E1 | x | y |\n", decisions: "# G-001 · decisions\n- approved in chat\n" });
    const out = check().join("\n");
    expect(out).toMatch(/goal\.md:\d+: step "product\.dream" is not a <loop>\.<step>/);
    expect(out).toMatch(/evals\.md:1: the evals table's columns are: id \| must be true/);
    expect(out).toMatch(/decisions\.md:2: decision line does not parse/);
  });

  test("an eval waived without a decision line, a vague check and too few evals are refused", () => {
    goal({ evals: EVALS.replace("| npm test |", "| looks good |").split("\n").slice(0, 5).join("\n") + "\n| E5 | x | loops check | exit 0 | build.test | waived |\n" });
    const out = check().join("\n");
    expect(out).toMatch(/E1: "checked by" must be a command/);
    expect(out).toMatch(/E5 is waived but no decision line names it/);
    goal({ evals: EVALS.split("\n").slice(0, 4).join("\n") + "\n" });
    expect(check().join("\n")).toMatch(/2 evals \(five to twelve\)/);
  });

  test("from product.shape on, artifacts.md is required, with a link and a date per row", () => {
    const decisions = "# G-001 · decisions\n- **2026-10-31 · Evals approved.** E5 waived. (reviewer: Ada · context product, design, tech)\n";
    goal({ step: "product.shape", waiting: "", decisions });
    expect(check().join("\n")).toMatch(/from product\.shape on, artifacts\.md is required/);
    write("goals/G-001-first-goal/artifacts.md", "| id | shows | evals | source | artifact | published |\n|---|---|---|---|---|---|\n| A1 | hub | E3 | design/artifacts/hub.html | | |\n");
    expect(check().join("\n")).toMatch(/A1: no published link/);
    write("goals/G-001-first-goal/artifacts.md", "No pictures — a build-only goal.\n");
    expect(check()).toEqual([]);
  });

  test("the folder name and the id must agree", () => {
    goal({ extra: { id: "G-002" }, decisions: "# G-001 · decisions\n- **2026-10-31 · E5 waived.** E5. (reviewer: Ada · context product)\n" });
    expect(check().join("\n")).toMatch(/id G-002 does not match the folder \(G-001\)/);
  });
});

describe("systemix loops", () => {
  const quiet = async (fn) => {
    const spies = ["log", "error"].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
    try {
      return await fn();
    } finally {
      spies.forEach((s) => s.mockRestore());
    }
  };

  test("init never overwrites a file that exists", () => {
    edit("context/product.md", "## What we know", "## What we know\n- a real fact `docs/x.md`");
    const r = init(root, "design", { today: TODAY });
    expect(r.written).toEqual([]);
    expect(fs.readFileSync(d("context/product.md"), "utf8")).toContain("a real fact");
  });

  test("status and decisions read the goals; check exits 1 on errors", async () => {
    goal({ decisions: "# G-001 · decisions\n- **2026-10-31 · Evals approved.** E5 waived. (reviewer: Ada as deputy · context product, design · brief B-001)\n" });
    const rows = await quiet(() => loops(["status", "--json"], { projectRoot: root }));
    expect(rows).toEqual([{ id: "G-001", title: "A first goal", status: "open", step: "product.evals", waiting: "reviewer", holders: ["Ada", "Lin"], lastRuling: "2026-10-31 · Evals approved" }]);
    const all = await quiet(() => loops(["decisions", "--json"], { projectRoot: root }));
    expect(all[0]).toMatchObject({ goal: "G-001", role: "reviewer", person: "Ada", deputy: true, context: ["product", "design"], brief: "B-001" });
    expect(await quiet(() => loops(["check"], { projectRoot: root }))).toEqual([]);
    expect(process.exitCode).not.toBe(1);
    edit("goals/G-001-first-goal/goal.md", "status: open", "status: maybe");
    await quiet(() => loops(["check"], { projectRoot: root }));
    expect(process.exitCode).toBe(1);
  });
});
