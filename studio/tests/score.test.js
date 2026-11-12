"use strict";

const fs = require("fs");
const path = require("path");
const { cli, tmpRepo } = require("./helpers/cli");
const { materialize } = require("./helpers/fixtures");
const invokeLib = require("../src/lib/invoke");
const { rel: L } = require("../src/lib/layout");
const { COMMANDS } = require("../src/commands");
const { render, loadRubric, RUBRIC_FILE } = require("../src/commands/score");

const GOLDEN = path.join(__dirname, "golden", "score");

function golden(name, value) {
  const file = path.join(GOLDEN, `${name}.json`);
  const text = JSON.stringify(value, null, 2) + "\n";
  if (process.env.UPDATE_GOLDEN || !fs.existsSync(file)) {
    fs.mkdirSync(GOLDEN, { recursive: true });
    fs.writeFileSync(file, text);
  }
  expect(text).toBe(fs.readFileSync(file, "utf8"));
}

const score = async (root) => {
  const r = await cli(["score", "--json"], { root });
  expect(r.code).toBe(0);
  return r;
};

describe("score", () => {
  const rubric = loadRubric();
  const roots = {};
  beforeAll(() => {
    for (const id of ["F1-ui-drift", "F2-css-vars", "F3-installed"]) roots[id] = materialize(id);
  });
  afterEach(() => jest.restoreAllMocks());

  test.each(["F1-ui-drift", "F2-css-vars", "F3-installed"])("golden score --json on %s", async (id) => {
    const r = await score(roots[id]);
    expect(r.json.version).toBe(2);
    expect(r.json.beta).toBe(true);
    expect(r.json.dimensions.map((d) => d.id)).toEqual(["tokens", "rules", "drift", "components", "rationale", "accessibility"]);
    golden(id, r.json);
  });

  test("the weights are fixed and sum to 1, in the rubric and in every report", async () => {
    expect(rubric.dimensions).toHaveLength(6);
    expect(rubric.dimensions.reduce((n, d) => n + d.weight, 0)).toBeCloseTo(1, 10);
    for (const d of rubric.dimensions) expect(d.inputs.reduce((n, i) => n + i.weight, 0)).toBeCloseTo(1, 10);
    const { json } = await score(roots["F1-ui-drift"]);
    expect(json.dimensions.map((d) => d.weight)).toEqual(rubric.dimensions.map((d) => d.weight));
  });

  test("the validity sentence and the limits are printed verbatim from the rubric", async () => {
    const { json } = await score(roots["F2-css-vars"]);
    expect(json.validity).toBe(rubric.validity);
    expect(json.limits).toEqual(rubric.limits);
    const text = await cli(["score"], { root: roots["F2-css-vars"] });
    expect(text.stdout).toContain(rubric.validity);
  });

  test("band edges are ascending and start at 0", () => {
    expect(rubric.bands[0].min).toBe(0);
    rubric.bands.slice(1).forEach((b, k) => expect(b.min).toBeGreaterThan(rubric.bands[k].min));
  });

  test("no criterion reads an older install's paths: each resolves through the layout or a CLI command", () => {
    const forbidden = [...Object.values(L.legacy), ["con", "tract/"].join(""), "scripts/"];
    for (const d of rubric.dimensions) {
      for (const i of d.inputs) {
        expect(i.reads).toBeTruthy();
        if (i.reads.layout) {
          expect(Object.prototype.hasOwnProperty.call(L, i.reads.layout)).toBe(true);
          const p = L[i.reads.layout];
          expect(typeof p).toBe("string");
          expect(p.startsWith(L.data + "/")).toBe(true);
        }
        if (i.reads.command) expect(Object.prototype.hasOwnProperty.call(COMMANDS, i.reads.command[0])).toBe(true);
        expect(i.reads.layout || i.reads.command).toBeTruthy();
      }
    }
    const texts = [fs.readFileSync(RUBRIC_FILE, "utf8"), fs.readFileSync(path.join(__dirname, "..", "src", "commands", "score.js"), "utf8")];
    const libDir = path.join(__dirname, "..", "src", "lib", "audit");
    for (const f of fs.readdirSync(libDir)) texts.push(fs.readFileSync(path.join(libDir, f), "utf8"));
    for (const t of texts) for (const word of forbidden.filter((w) => w !== "scripts/")) expect(t).not.toContain(word);
    expect(JSON.stringify(rubric.dimensions)).not.toContain("scripts/");
  });

  test("two runs are byte-identical", async () => {
    for (const id of Object.keys(roots)) {
      const a = await score(roots[id]);
      const b = await score(roots[id]);
      expect(b.stdout).toBe(a.stdout);
    }
  });

  test("F1 scores low with every input computed, and ranks opportunities by importance × gap with ties stated", async () => {
    const { json } = await score(roots["F1-ui-drift"]);
    expect(json.coverage).toBe(1);
    expect(json.withheld).toBeNull();
    expect(typeof json.score).toBe("number");
    const pri = json.opportunities.map((o) => o.importance * o.gap);
    expect(pri).toEqual([...pri].sort((a, b) => b - a));
    const tokens = json.opportunities.find((o) => o.dimension === "tokens");
    const rules = json.opportunities.find((o) => o.dimension === "rules");
    expect(tokens.tie).toContain("rules");
    expect(rules.tie).toContain("tokens");
    expect(json.dimensions.find((d) => d.id === "accessibility").inputs.alt.value).toEqual({ total: 2, withoutAlt: 2 });
  });

  test("near-threshold entries are within the rubric's distance of the next band", async () => {
    for (const id of Object.keys(roots)) {
      const { json } = await score(roots[id]);
      for (const n of json.nearThreshold) {
        expect(n.distance).toBeGreaterThan(0);
        expect(n.distance).toBeLessThanOrEqual(rubric.nearThreshold);
        expect(rubric.bands.find((b) => b.id === n.next).min - n.score).toBe(n.distance);
      }
    }
  });

  test("withheld, not estimated, when coverage is below 0.8 (inputs whose commands are not built)", async () => {
    const root = tmpRepo({
      "src/a.css": ".a { color: var(--primary); }\n",
      [L.tokens]: ":root { --primary: #112233; }\n",
      [L.learnings]: "# Learnings\n",
      [`${L.goals}/G-001-x/goal.md`]: "---\nid: G-001\n---\n",
    });
    const real = invokeLib.invoke;
    // tokens lint, learnings list and loops status answer the way an unbuilt command does
    jest.spyOn(invokeLib, "invoke").mockImplementation(async (ctx, argv) => {
      if (["tokens", "learnings", "loops"].includes(argv[0])) return { code: 1, json: null, stdout: "", stderr: `  ✗ ${argv[0]} is not built yet` };
      return real(ctx, argv);
    });
    const r = await cli(["score", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json.coverage).toBeLessThan(0.8);
    expect(r.json.score).toBeNull();
    expect(r.json.band).toBeNull();
    expect(r.json.withheld).toMatch(/below 0\.8/);
    expect(r.json.withheld).toMatch(/tokens\.roles/);
    expect(r.json.withheld).toMatch(/rationale\.learnings/);
    expect(r.json.opportunities).toEqual([]);
    expect(r.json.nearThreshold).toEqual([]);
    const roles = r.json.dimensions.find((d) => d.id === "tokens").inputs.roles;
    expect(roles.score).toBeNull();
    expect(roles.missing).toMatch(/not built yet/);
    const text = await cli(["score"], { root });
    expect(text.stdout).toMatch(/withheld/);
  });

  test("render: a missing input rescales its dimension; at 0.8 coverage or more the score stands", () => {
    const full = {};
    for (const d of rubric.dimensions) full[d.id] = Object.fromEntries(d.inputs.map((i) => [i.id, { value: 1, score: 50 }]));
    const all = render(rubric, full);
    expect(all.coverage).toBe(1);
    expect(all.score).toBe(50);
    const partial = JSON.parse(JSON.stringify(full));
    partial.tokens.roles = { value: null, score: null, missing: "x" };
    partial.tokens.share.score = 80;
    const p = render(rubric, partial);
    expect(p.coverage).toBe(0.94);
    expect(p.dimensions[0].score).toBe(Math.round((0.3 * 50 + 0.4 * 80) / 0.7));
    expect(p.score).not.toBeNull();
    const low = JSON.parse(JSON.stringify(full));
    for (const id of ["tokens", "rules"]) for (const k of Object.keys(low[id])) low[id][k] = { value: null, score: null, missing: "x" };
    const w = render(rubric, low);
    expect(w.coverage).toBe(0.6);
    expect(w.score).toBeNull();
    expect(w.withheld).toMatch(/coverage 0\.6 is below 0\.8/);
  });

  test("a missing folder is a usage error", async () => {
    const r = await cli(["score", "nope", "--json"], { root: roots["F1-ui-drift"] });
    expect(r.code).toBe(2);
  });
});
