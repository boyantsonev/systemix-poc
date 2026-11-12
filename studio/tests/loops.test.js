"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { cli, tmpRepo, read } = require("./helpers/cli");
const { materialize } = require("./helpers/fixtures");

const TEMPLATES = path.join(__dirname, "..", "templates", "loops");
const DECISION = /^- \d{4}-\d{2}-\d{2} · [a-z][\w-]*\.[a-z][\w-]* · (approve|rework|drop) · by [^·]+ · brief: (B-\d{3,}|none)( · note: .+)?$/;

/** A temp git repo whose user.name is `name` (or none), isolated from the machine's git config. */
function gitRepo(name) {
  const root = tmpRepo({ "README.md": "# a product\n" });
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "ps-home-"));
  const env = { HOME: home, GIT_CONFIG_GLOBAL: path.join(home, "gitconfig"), GIT_CONFIG_NOSYSTEM: "1" };
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: root, env: { ...process.env, ...env } });
  if (name) execFileSync("git", ["config", "user.name", name], { cwd: root, env: { ...process.env, ...env } });
  return { root, env };
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

const goalFile = (root, id) => {
  const dir = fs.readdirSync(path.join(root, "design/goals")).find((n) => n.startsWith(`${id}-`));
  return path.join(root, "design/goals", dir);
};
const setStep = (root, id, step) => {
  const f = path.join(goalFile(root, id), "goal.md");
  fs.writeFileSync(f, fs.readFileSync(f, "utf8").replace(/^step: .*$/m, `step: ${step}`));
};
const frontField = (root, id, key) => new RegExp(`^${key}: (.*)$`, "m").exec(fs.readFileSync(path.join(goalFile(root, id), "goal.md"), "utf8"))[1];
const decisionsOf = (root, id) => fs.readFileSync(path.join(goalFile(root, id), "decisions.md"), "utf8");
const checkOk = async (root) => {
  const r = await cli(["loops", "check", "--json"], { root });
  expect(r.json.problems).toEqual([]);
  expect(r.code).toBe(0);
};

describe("loops init", () => {
  test("no flag gives a solo roster held by the git user, no placeholder left, and check passes", async () => {
    const { root, env } = gitRepo("Ada Lovelace");
    const r = await cli(["loops", "init", "--json"], { root, env });
    expect(r.code).toBe(0);
    expect(r.json.written).toEqual(
      expect.arrayContaining([
        "design/loops/product-loop.md",
        "design/loops/build-loop.md",
        "design/loops/joins.md",
        "design/loops/roster.md",
        "design/loops/README.md",
        "design/goals/README.md",
        "design/briefs/README.md",
        "design/context/product.md",
        "design/context/marketing.md",
        "design/LEARNINGS.md",
        "design/evaluations.md",
      ]),
    );
    expect(r.json.written).toEqual([...r.json.written].sort());
    const roster = read(root, "design/loops/roster.md");
    expect(roster).toMatch(/^preset: solo$/m);
    expect(roster.match(/^- holder: Ada Lovelace$/gm)).toHaveLength(3);
    expect(roster).not.toMatch(/^- deputy:/m);
    for (const f of walk(path.join(root, "design"))) expect(fs.readFileSync(f, "utf8")).not.toContain("{{");
    expect(read(root, "design/loops/product-loop.md")).toMatch(/^updated: 2026-01-15$/m);
    await checkOk(root);
    const again = await cli(["loops", "init", "--json"], { root, env });
    expect(again.json.written).toEqual([]);
    expect(again.json.kept).toContain("design/loops/roster.md");
  });

  test("--dry-run writes nothing", async () => {
    const { root, env } = gitRepo("Ada Lovelace");
    const r = await cli(["loops", "init", "--dry-run", "--json"], { root, env });
    expect(r.code).toBe(0);
    expect(r.json.written).toContain("design/loops/roster.md");
    expect(fs.existsSync(path.join(root, "design"))).toBe(false);
  });

  test("with no git user and no --holder it asks for one; --holder answers it", async () => {
    const { root, env } = gitRepo(null);
    const r = await cli(["loops", "init", "--json"], { root, env });
    expect(r.code).not.toBe(0);
    expect(r.json.error).toBe("need-holder");
    expect(fs.existsSync(path.join(root, "design"))).toBe(false);
    const ok = await cli(["loops", "init", "--holder", "reviewer=Grace Hopper", "--json"], { root, env });
    expect(ok.code).toBe(0);
    expect(read(root, "design/loops/roster.md").match(/^- holder: Grace Hopper$/gm)).toHaveLength(3);
    await checkOk(root);
  });

  test("--preset team names each lead, their deputies, and both as reviewers", async () => {
    const { root, env } = gitRepo("Ada Lovelace");
    const r = await cli(["loops", "init", "--preset", "team", "--holder", "engineering-lead=Grace Hopper", "--json"], { root, env });
    expect(r.code).toBe(0);
    const roster = read(root, "design/loops/roster.md");
    expect(roster).toMatch(/^preset: team$/m);
    expect(roster).toMatch(/## design-lead\n- holder: Ada Lovelace\n- deputy: engineering-lead/);
    expect(roster).toMatch(/## engineering-lead\n- holder: Grace Hopper\n- deputy: design-lead/);
    expect(roster).toMatch(/## reviewer\n- holder: Ada Lovelace, Grace Hopper/);
    await checkOk(root);
  });

  test("a bad preset or holder flag is a usage error", async () => {
    const { root, env } = gitRepo("Ada Lovelace");
    expect((await cli(["loops", "init", "--preset", "squad"], { root, env })).code).toBe(2);
    expect((await cli(["loops", "init", "--holder", "nobody"], { root, env })).code).toBe(2);
    expect((await cli(["loops", "init", "--holder", "founder=Ada"], { root, env })).code).toBe(2);
    expect((await cli(["loops", "init", "--holder", "design-lead=Ada", "--holder", "reviewer=Grace"], { root, env })).code).toBe(2);
  });

  test("the templates carry no market loop, experiments, sprint phases, hub, parity eval or agent holder; the coding agent never merges", () => {
    const all = walk(TEMPLATES).map((f) => [path.relative(TEMPLATES, f), fs.readFileSync(f, "utf8")]);
    for (const [f, text] of all) {
      for (const bad of [/market loop/i, /experiments\//, /\bFrame\b.*\bBuild\b.*\bSystematize\b/, /\bhub\b/i, /parity/i, /holder: Claude/i]) {
        expect([f, bad.test(text)]).toEqual([f, false]);
      }
    }
    for (const preset of ["solo", "team"]) {
      const roster = fs.readFileSync(path.join(TEMPLATES, "loops", `roster.${preset}.md`), "utf8");
      const agent = roster.slice(roster.indexOf("## coding-agent"));
      expect(agent).toMatch(/The coding agent/);
      const may = /- may: ([\s\S]*?)\n- never:/.exec(agent)[1];
      expect(may).not.toMatch(/merg/i);
      expect(agent).not.toMatch(/^- holder:/m);
    }
  });
});

describe("loops check", () => {
  test("passes on F4 and its team variant", async () => {
    await checkOk(materialize("F4-loops"));
    await checkOk(materialize("F4-loops", { variant: "team" }));
  });

  test("a {{ under design/loops, design/goals or design/context fails", async () => {
    for (const rel of ["design/loops/product-loop.md", "design/goals/G-001-notebook-invite/goal.md", "design/context/tech.md"]) {
      const root = materialize("F4-loops");
      fs.appendFileSync(path.join(root, rel), "\nHeld by {{PERSON_A}}\n");
      const r = await cli(["loops", "check", "--json"], { root });
      expect(r.code).toBe(1);
      expect(r.json.ok).toBe(false);
      expect(r.json.problems.some((p) => p.file === rel && /placeholder/.test(p.message))).toBe(true);
    }
  });

  test("--loops and --goals check one half each", async () => {
    const root = materialize("F4-loops");
    fs.appendFileSync(path.join(root, "design/goals/G-001-notebook-invite/goal.md"), "\n{{X}}\n");
    expect((await cli(["loops", "check", "--loops", "--json"], { root })).code).toBe(0);
    expect((await cli(["loops", "check", "--goals", "--json"], { root })).code).toBe(1);
  });

  test("refuses a goal past a gate with no approve line, a malformed decision line, and a coding agent that may merge", async () => {
    let root = materialize("F4-loops");
    setStep(root, "G-001", "product.design");
    let r = await cli(["loops", "check", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.problems.map((p) => p.message).join("\n")).toMatch(/past the product\.evals gate/);

    root = materialize("F4-loops");
    fs.appendFileSync(path.join(goalFile(root, "G-001"), "decisions.md"), "- 2026-01-14 approved by Ada\n");
    r = await cli(["loops", "check", "--json"], { root });
    expect(r.json.problems.map((p) => p.message).join("\n")).toMatch(/does not parse/);

    root = materialize("F4-loops");
    const roster = path.join(root, "design/loops/roster.md");
    fs.writeFileSync(roster, fs.readFileSync(roster, "utf8").replace("- may: prepare a decision brief,", "- may: merge a pull request, prepare a decision brief,"));
    r = await cli(["loops", "check", "--json"], { root });
    expect(r.json.problems.map((p) => p.message).join("\n")).toMatch(/may never merge/);
  });

  test("a repo with no loops says to run init", async () => {
    const r = await cli(["loops", "check", "--json"], { root: tmpRepo() });
    expect(r.code).toBe(1);
    expect(r.json.problems[0].message).toMatch(/loops init/);
  });
});

describe("loops status and decisions", () => {
  test("status JSON on F4: each goal's step and whose ruling it waits on", async () => {
    const root = materialize("F4-loops");
    const r = await cli(["loops", "status", "--json"], { root });
    expect(r.code).toBe(0);
    const by = Object.fromEntries(r.json.goals.map((g) => [g.id, g]));
    expect(r.json.goals.map((g) => g.id)).toEqual(["G-001", "G-002", "G-003", "G-004", "G-005"]);
    expect(by["G-001"]).toMatchObject({ slug: "notebook-invite", step: "product.evals", waitsOn: { role: "reviewer", holder: "Ada Lovelace", deputy: null }, lastRuling: null });
    expect(by["G-001"].title).toMatch(/invite a teammate/);
    expect(by["G-002"]).toMatchObject({ step: "product.design", waitsOn: null, lastRuling: { date: "2026-01-07", gate: "product.evals", ruling: "approve", by: "Ada Lovelace" } });
    expect(by["G-003"].step).toBe("build.plan");
    expect(by["G-004"].step).toBe("build.measure");
    expect(by["G-005"].step).toBe("product.learn");
    for (const g of r.json.goals) expect(Object.keys(g)).toEqual(expect.arrayContaining(["id", "slug", "title", "step", "waitsOn", "lastRuling"]));
  });

  test("decisions lists every line across goals, in date order", async () => {
    const r = await cli(["loops", "decisions", "--json"], { root: materialize("F4-loops") });
    expect(r.code).toBe(0);
    expect(r.json.decisions).toHaveLength(12);
    const dates = r.json.decisions.map((d) => d.date);
    expect(dates).toEqual([...dates].sort());
    expect(r.json.decisions.find((d) => d.goal === "G-002" && d.ruling === "rework")).toMatchObject({ gate: "product.evals", by: "Ada Lovelace", brief: "none", note: "E4 must be observed, not assumed" });
  });
});

describe("loops goal new", () => {
  test("creates G-006 on F4 at the first gate, and check still passes", async () => {
    const root = materialize("F4-loops");
    const r = await cli(["loops", "goal", "new", "export-pdf", "--title", "Let an admin export a notebook as a PDF", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json).toEqual({
      id: "G-006",
      dir: "design/goals/G-006-export-pdf",
      files: ["design/goals/G-006-export-pdf/decisions.md", "design/goals/G-006-export-pdf/evals.md", "design/goals/G-006-export-pdf/goal.md"],
    });
    const goal = read(root, "design/goals/G-006-export-pdf/goal.md");
    expect(goal).toMatch(/^---\nid: G-006\ntitle: Let an admin export a notebook as a PDF\nstatus: open\nstep: product\.evals\nopened: 2026-01-15\n---/);
    for (const s of ["## Success criteria", "## Kill if", "## Context"]) expect(goal).toContain(s);
    expect(read(root, "design/goals/G-006-export-pdf/evals.md")).toContain("| id | must be true | checked by | bar | answered at | status |");
    expect(read(root, "design/goals/G-006-export-pdf/decisions.md").trim()).toBe("# Decisions");
    await checkOk(root);
    const gate = await cli(["loops", "gate", "G-006", "approve", "--by", "Ada Lovelace", "--json"], { root });
    expect(gate.code).toBe(1);
    expect(gate.json.error).toBe("evals-incomplete");
  });

  test("a bad slug or no title is a usage error", async () => {
    const root = materialize("F4-loops");
    expect((await cli(["loops", "goal", "new", "Bad Slug", "--title", "x"], { root })).code).toBe(2);
    expect((await cli(["loops", "goal", "new", "ok-slug"], { root })).code).toBe(2);
  });
});

describe("loops gate: the scripted F4 walk", () => {
  test("approve on G-001 by Ada Lovelace moves the step, writes one grammar-true line with brief: none, and check passes", async () => {
    const root = materialize("F4-loops");
    const r = await cli(["loops", "gate", "G-001", "approve", "--by", "Ada Lovelace", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({ id: "G-001", gate: "product.evals", step: "product.design", next: "product.validate" });
    expect(r.json.line).toBe("- 2026-01-15 · product.evals · approve · by Ada Lovelace · brief: none");
    expect(r.json.line).toMatch(DECISION);
    expect(decisionsOf(root, "G-001").trim().split("\n").slice(-1)[0]).toBe(r.json.line);
    expect(frontField(root, "G-001", "step")).toBe("product.design");
    await checkOk(root);

    // the coding agent's design step: not a gate, so nobody rules there
    const nope = await cli(["loops", "gate", "G-001", "approve", "--by", "Ada Lovelace", "--json"], { root });
    expect(nope.code).toBe(1);
    expect(nope.json.error).toBe("not-at-gate");

    // next moves the agent's step on; then the validate gate hands the goal to the build loop
    setStep(root, "G-001", "product.validate");
    await checkOk(root);
    const v = await cli(["loops", "gate", "G-001", "approve", "--by", "Ada Lovelace", "--note", "variant B", "--json"], { root });
    expect(v.json).toMatchObject({ step: "build.plan", next: "build.code" });
    expect(v.json.line).toBe("- 2026-01-15 · product.validate · approve · by Ada Lovelace · brief: none · note: variant B");
    expect(v.json.line).toMatch(DECISION);
    expect(frontField(root, "G-001", "status")).toBe("building");
    await checkOk(root);
  });

  test("a name that is neither holder nor deputy is refused and nothing is written", async () => {
    const root = materialize("F4-loops");
    const before = decisionsOf(root, "G-001");
    const r = await cli(["loops", "gate", "G-001", "approve", "--by", "Charles Babbage", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.error).toBe("not-a-holder");
    expect(r.json.waitsOn).toEqual({ role: "reviewer", holder: "Ada Lovelace", deputy: null });
    expect(decisionsOf(root, "G-001")).toBe(before);
    expect(frontField(root, "G-001", "step")).toBe("product.evals");
  });

  test("team: any reviewer rules; a deputy stands in for a person's step; others are refused", async () => {
    const root = materialize("F4-loops", { variant: "team" });
    expect((await cli(["loops", "gate", "G-001", "approve", "--by", "Grace Hopper", "--json"], { root })).code).toBe(0);
    // G-003 waits at the build.plan gate: any reviewer rules on it
    expect((await cli(["loops", "gate", "G-003", "approve", "--by", "Grace Hopper", "--json"], { root })).json).toMatchObject({ gate: "build.plan", step: "build.code" });
    const st = await cli(["loops", "status", "--json"], { root });
    expect(st.json.goals.find((g) => g.id === "G-003").waitsOn).toEqual({ role: "engineering-lead", holder: "Grace Hopper", deputy: "Ada Lovelace" });
    expect((await cli(["loops", "gate", "G-003", "approve", "--by", "Charles Babbage", "--json"], { root })).json.error).toBe("not-a-holder");
    const dep = await cli(["loops", "gate", "G-003", "approve", "--by", "Ada Lovelace", "--note", "it holds", "--json"], { root });
    expect(dep.code).toBe(0);
    expect(dep.json).toMatchObject({ gate: "build.code", step: "build.test" });
    await checkOk(root);
  });

  test("rework at a decide gate goes back to the build step; drop closes the goal", async () => {
    const root = materialize("F4-loops");
    setStep(root, "G-002", "product.validate");
    const rw = await cli(["loops", "gate", "G-002", "rework", "--by", "Ada Lovelace", "--note", "the toggle reads as a tab", "--json"], { root });
    expect(rw.json).toMatchObject({ step: "product.design", ruling: "rework" });
    await checkOk(root);
    setStep(root, "G-002", "product.validate");
    const dr = await cli(["loops", "gate", "G-002", "drop", "--by", "Ada Lovelace", "--json"], { root });
    expect(dr.json).toMatchObject({ step: "product.validate", next: null });
    expect(frontField(root, "G-002", "status")).toBe("dropped");
    await checkOk(root);
    expect((await cli(["loops", "gate", "G-002", "approve", "--by", "Ada Lovelace", "--json"], { root })).json.error).toBe("goal-closed");
  });

  test("rework at the evals gate stays at the gate", async () => {
    const root = materialize("F4-loops");
    const r = await cli(["loops", "gate", "G-001", "rework", "--by", "Ada Lovelace", "--note", "E1 needs a bar per session", "--json"], { root });
    expect(r.json).toMatchObject({ step: "product.evals", next: "product.design" });
    expect(r.json.line).toMatch(DECISION);
    await checkOk(root);
  });

  test("a brief that does not exist is refused; bad flags are usage errors", async () => {
    const root = materialize("F4-loops");
    expect((await cli(["loops", "gate", "G-001", "approve", "--by", "Ada Lovelace", "--brief", "B-009", "--json"], { root })).json.error).toBe("no-such-brief");
    expect((await cli(["loops", "gate", "G-001", "approve", "--by", "Ada Lovelace", "--brief", "nine"], { root })).code).toBe(2);
    expect((await cli(["loops", "gate", "G-001", "ship", "--by", "Ada Lovelace"], { root })).code).toBe(2);
    expect((await cli(["loops", "gate", "G-001", "approve"], { root })).code).toBe(2);
    expect((await cli(["loops", "gate", "G-099", "approve", "--by", "Ada Lovelace", "--json"], { root })).json.error).toBe("no-such-goal");
  });
});
