"use strict";

const fs = require("fs");
const path = require("path");
const { cli, tmpRepo, read } = require("./helpers/cli");
const { materialize } = require("./helpers/fixtures");

const FULL = {
  tracker: { kind: "github", repo: "acme-labs/notebook", label: "studio", post: "ask" },
  notion: { digests: "0123456789abcdef0123456789abcdef", measurements: "https://pages.example.com/Measurements-0123456789abcdef0123456789abcdef", post: "auto" },
  slack: { channel: "#product-studio", post: "ask" },
  analytics: { source: "posthog", hostEnv: "ANALYTICS_HOST", keyEnv: "ANALYTICS_READ_KEY", projectEnv: "ANALYTICS_PROJECT" },
};
const ENV = { ANALYTICS_HOST: "https://analytics.example.com", ANALYTICS_READ_KEY: "secret-value-123", ANALYTICS_PROJECT: "42" };
const withConfig = (cfg) => tmpRepo({ "studio/connectors.json": typeof cfg === "string" ? cfg : JSON.stringify(cfg, null, 2) });
const intoFixture = (root, cfg) => fs.writeFileSync(path.join(root, "studio/connectors.json"), JSON.stringify(cfg, null, 2));

let fetchSpy;
beforeEach(() => {
  fetchSpy = typeof global.fetch === "function" ? jest.spyOn(global, "fetch").mockImplementation(() => Promise.reject(new Error("no network"))) : null;
});
afterEach(() => {
  if (fetchSpy) {
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  }
});

describe("connectors check", () => {
  test("no config: every connector not connected, exit 0", async () => {
    const r = await cli(["connectors", "check", "--json"], { root: tmpRepo(), env: ENV });
    expect(r.code).toBe(0);
    expect(r.json.file).toBe("studio/connectors.json");
    expect(r.json.exists).toBe(false);
    expect(r.json.ok).toBe(true);
    for (const n of ["tracker", "notion", "slack", "analytics"]) expect(r.json.connectors[n]).toEqual({ configured: false, ready: false, post: null, problems: [] });
    const text = await cli(["connectors", "check"], { root: tmpRepo() });
    expect(text.code).toBe(0);
    expect(text.stdout).toMatch(/tracker\s+not connected/);
  });

  test("a full, valid config: each configured and ready, post as written, no value printed", async () => {
    const r = await cli(["connectors", "check", "--json"], { root: withConfig(FULL), env: ENV });
    expect(r.code).toBe(0);
    expect(r.json.connectors).toEqual({
      tracker: { configured: true, ready: true, post: "ask", problems: [] },
      notion: { configured: true, ready: true, post: "auto", problems: [] },
      slack: { configured: true, ready: true, post: "ask", problems: [] },
      analytics: { configured: true, ready: true, post: null, problems: [] },
    });
    expect(r.stdout).not.toContain("secret-value-123");
  });

  test("post defaults to ask; analytics with its env vars unset is configured but not ready (evidence's logic)", async () => {
    const r = await cli(["connectors", "check", "--json"], { root: withConfig({ slack: { channel: "#design" }, analytics: FULL.analytics }), env: {} });
    expect(r.code).toBe(0);
    expect(r.json.connectors.slack).toEqual({ configured: true, ready: true, post: "ask", problems: [] });
    expect(r.json.connectors.analytics.configured).toBe(true);
    expect(r.json.connectors.analytics.ready).toBe(false);
    expect(r.json.connectors.analytics.problems[0]).toMatch(/^ANALYTICS_HOST is not set/);
    const ev = await cli(["evidence", "check", "--json"], { root: withConfig({ analytics: FULL.analytics }), env: {} });
    expect(ev.json.config).toBe("studio/connectors.json");
    expect(ev.json.problems).toEqual(r.json.connectors.analytics.problems);
  });

  test("shape problems make a connector not ready, with exit 0", async () => {
    const bad = {
      tracker: { kind: "linear", repo: "not a repo", label: "a,b", post: "always", token: "x" },
      notion: { post: "ask" },
      slack: { channel: "General" },
      analytics: { ...FULL.analytics, keyEnv: "phc_abc-123" },
    };
    const r = await cli(["connectors", "check", "--json"], { root: withConfig(bad), env: ENV });
    expect(r.code).toBe(0);
    const t = r.json.connectors.tracker;
    expect(t.ready).toBe(false);
    expect(t.problems.join("\n")).toMatch(/kind is github/);
    expect(t.problems.join("\n")).toMatch(/repo is owner\/name/);
    expect(t.problems.join("\n")).toMatch(/label is one label name/);
    expect(t.problems.join("\n")).toMatch(/post is ask or auto/);
    expect(t.problems.join("\n")).toMatch(/unknown field token/);
    expect(r.json.connectors.notion.problems).toEqual([expect.stringMatching(/name a parent page/)]);
    expect(r.json.connectors.slack.problems).toEqual([expect.stringMatching(/channel is #name/)]);
    expect(r.json.connectors.analytics.problems.join("\n")).toMatch(/keyEnv must be an env var name/);
    expect(r.stdout).not.toContain("phc_abc-123");
  });

  test("a malformed file is exit 1: bad JSON, not an object, an unknown connector, a section not an object", async () => {
    for (const [cfg, msg] of [
      ["{nope", /is not valid JSON/],
      ["[]", /must be a JSON object/],
      [{ linear: {} }, /unknown connector linear/],
      [{ slack: "#design" }, /slack must be an object/],
    ]) {
      const r = await cli(["connectors", "check", "--json"], { root: withConfig(cfg), env: ENV });
      expect(r.code).toBe(1);
      expect(r.json.ok).toBe(false);
      expect(r.json.problems[0]).toMatch(msg);
    }
  });

  test("the older studio/.state/analytics.json is still read when connectors.json has no analytics key", async () => {
    const root = tmpRepo({ "studio/connectors.json": JSON.stringify({ slack: { channel: "#design" } }), "studio/.state/analytics.json": JSON.stringify(FULL.analytics) });
    const r = await cli(["connectors", "check", "--json"], { root, env: ENV });
    expect(r.json.connectors.analytics).toEqual({ configured: true, ready: true, post: null, problems: [] });
    const ev = await cli(["evidence", "check", "--json"], { root, env: ENV });
    expect(ev.json).toEqual({ connected: true, source: "posthog", config: "studio/.state/analytics.json", problems: [] });
  });

  test("usage errors are exit 2", async () => {
    const root = tmpRepo();
    for (const argv of [["connectors", "frob"], ["connectors", "check", "x"], ["connectors", "check", "--nope"], ["connectors", "issue"], ["connectors", "issue", "G-1"], ["connectors", "page", "x"], ["connectors", "notice", "x"], ["connectors", "page", "digest", "--since", "yesterday"], ["connectors", "issue", "G-001", "--since", "2026-01-01"]]) {
      expect({ argv, code: (await cli(argv, { root })).code }).toEqual({ argv, code: 2 });
    }
  });
});

describe("connectors text on F4 (goals) and F6 (run log)", () => {
  let f4;
  let f6;
  beforeAll(() => {
    f4 = materialize("F4-loops");
    f6 = materialize("F6-runlog");
  });

  test("issue: title, body from goal.md, evals.md and the decisions, the label from config", async () => {
    let r = await cli(["connectors", "issue", "G-001", "--json"], { root: f4 });
    expect(r.code).toBe(0);
    expect(r.json.title).toBe("G-001 · Let a person invite a teammate to a notebook in under a minute");
    expect(r.json.labels).toEqual(["studio"]);
    expect(r.json.issue).toBe(null);
    const b = r.json.body;
    expect(b.startsWith("Let a person invite a teammate to a notebook in under a minute\n")).toBe(true);
    expect(b).toContain("Step: `product.evals`");
    expect(b).toContain("## Success criteria\n- A new admin invites a teammate from inside a notebook without opening Settings.");
    expect(b).toContain("| E5 | Invites sent per new team in week one goes up | evaluations.md row | above 1.2 | build.measure | open |");
    expect(b).toContain("Goal folder: `studio/goals/G-001-notebook-invite/`");
    expect(b).toContain("Opened by product-studio");
    expect(b).toContain("## Decisions\nNone yet.");

    r = await cli(["connectors", "issue", "G-004", "--json"], { root: f4 });
    expect(r.json.body).toContain("- 2026-01-09 · build.ship · approve · by Ada Lovelace · brief: none");

    const root = materialize("F4-loops");
    intoFixture(root, { tracker: { kind: "github", repo: "acme-labs/notebook", label: "goal" } });
    r = await cli(["connectors", "issue", "G-001", "--json"], { root });
    expect(r.json.labels).toEqual(["goal"]);
    expect(r.json.repo).toBe("acme-labs/notebook");
  });

  test("an issue number in goal.md frontmatter is read back, and loops check still passes", async () => {
    const root = materialize("F4-loops");
    const goal = path.join(root, "studio/goals/G-001-notebook-invite/goal.md");
    fs.writeFileSync(goal, fs.readFileSync(goal, "utf8").replace("opened: 2026-01-12\n", "opened: 2026-01-12\nissue: 12\n"));
    intoFixture(root, { tracker: { kind: "github", repo: "acme-labs/notebook" } });
    expect((await cli(["connectors", "issue", "G-001", "--json"], { root })).json.issue).toBe(12);
    expect((await cli(["loops", "check", "--json"], { root })).json.ok).toBe(true);
    const n = await cli(["connectors", "notice", "gate", "G-001", "--json"], { root });
    expect(n.json.text).toContain("Tracked in acme-labs/notebook#12.");
  });

  test("comment: the latest decision line, and close on shipped or dropped", async () => {
    let r = await cli(["connectors", "comment", "G-004", "--json"], { root: f4 });
    expect(r.code).toBe(0);
    expect(r.json.line).toBe("- 2026-01-09 · build.ship · approve · by Ada Lovelace · brief: none");
    expect(r.json.body).toContain("**build.ship · approve** by Ada Lovelace on 2026-01-09");
    expect(r.json.close).toBe(true);
    expect(r.json.reason).toBe("completed");

    r = await cli(["connectors", "comment", "G-003", "--json"], { root: f4 });
    expect(r.json.close).toBe(false);
    expect(r.json.body).toContain("> variant B, the renewal date in the summary card");
    expect(r.json.body).toContain("now at `build.plan`");

    r = await cli(["connectors", "comment", "G-001", "--json"], { root: f4 });
    expect(r.code).toBe(1);
    expect(r.json.error).toBe("no-decision");

    const root = materialize("F4-loops");
    expect((await cli(["loops", "gate", "G-001", "drop", "--by", "Ada Lovelace", "--note", "not now"], { root })).code).toBe(0);
    r = await cli(["connectors", "comment", "G-001", "--json"], { root });
    expect(r.json.close).toBe(true);
    expect(r.json.reason).toBe("not planned");
    expect(r.json.body).toContain("> not now");
  });

  test("page measurement: the goal's evaluations.md rows only, with each eval's text", async () => {
    let r = await cli(["connectors", "page", "measurement", "G-005", "--json"], { root: f4 });
    expect(r.code).toBe(0);
    expect(r.json.title).toMatch(/^G-005 · .+ · measured 2026-01-10$/);
    expect(r.json.rows).toBe(2);
    expect(r.json.markdown).toContain("| 2025-11-28 | E5 |");
    expect(r.json.markdown).toContain("median time to the first note: 1 min 35 s");
    expect(r.json.markdown).not.toContain("G-004");
    r = await cli(["connectors", "page", "measurement", "G-004", "--json"], { root: f4 });
    expect(r.json.markdown).toContain("not measured: no analytics is connected");
    r = await cli(["connectors", "page", "measurement", "G-001", "--json"], { root: f4 });
    expect(r.code).toBe(1);
    expect(r.json.error).toBe("no-measurements");
    expect((await cli(["connectors", "page", "measurement", "G-099", "--json"], { root: f4 })).json.error).toBe("no-such-goal");
  });

  test("notice gate: the gate and its holder from loops status; nobody waited on is exit 1", async () => {
    let r = await cli(["connectors", "notice", "gate", "G-001", "--json"], { root: f4 });
    expect(r.code).toBe(0);
    const st = (await cli(["loops", "status", "--json"], { root: f4 })).json.goals.find((g) => g.id === "G-001");
    expect(r.json.waitsOn).toEqual(st.waitsOn);
    expect(r.json.text).toContain("product.evals gate");
    expect(r.json.text).toContain("Ada Lovelace holds it (reviewer)");
    expect(r.json.text).toContain("/product-studio:loop gate approve|rework|drop G-001");
    expect(r.json.text.split("\n")).toHaveLength(1);
    r = await cli(["connectors", "notice", "gate", "G-002", "--json"], { root: f4 });
    expect(r.code).toBe(1);
    expect(r.json.error).toBe("not-at-gate");

    const team = materialize("F4-loops", { variant: "team" });
    r = await cli(["connectors", "notice", "gate", "G-001", "--json"], { root: team });
    const tst = (await cli(["loops", "status", "--json"], { root: team })).json.goals.find((g) => g.id === "G-001");
    expect(r.json.waitsOn).toEqual(tst.waitsOn);
    expect(r.json.text).toContain(`${tst.waitsOn.holder} holds it (${tst.waitsOn.role})`);
  });

  test("page digest and notice digest: every number from admin digest", async () => {
    const d = (await cli(["admin", "digest", "--json"], { root: f6 })).json;
    const page = await cli(["connectors", "page", "digest", "--json"], { root: f6 });
    expect(page.code).toBe(0);
    expect(page.json.title).toBe("Studio digest · 2026-01-15");
    const md = page.json.markdown;
    expect(md).toContain(`${d.runs} runs`);
    for (const [cmd, c] of Object.entries(d.byCommand)) expect(md).toContain(`| ${cmd} | ${c.runs} | ${c.up} | ${c.down} | ${c.downShare} |`);
    expect(md).toContain(`Blocks fixed: ${d.blocksFixed}.`);
    expect(md).toContain(`| T1 | ${d.falsePositives.T1} |`);
    for (const s of d.signals) expect(md).toContain(`| ${s.kind} | ${s.subject.replace(/\|/g, "\\|")} | ${s.count} | ${s.threshold} | ${s.top ? "yes" : "no"} |`);
    expect(md).toContain("## Proposals\n\nNone.");

    const notice = await cli(["connectors", "notice", "digest", "--json"], { root: f6 });
    expect(notice.code).toBe(0);
    expect(notice.json.text).toContain(`${d.runs} runs, ${d.blocksFixed} blocks fixed, ${d.signals.length} signals over a threshold`);
    expect(notice.json.text).toContain("Proposals waiting for a ruling: none");
    expect(notice.json.text.split("\n")).toHaveLength(1);

    const since = await cli(["connectors", "page", "digest", "--since", "2026-01-10", "--json"], { root: f6 });
    const ds = (await cli(["admin", "digest", "--since", "2026-01-10", "--json"], { root: f6 })).json;
    expect(since.json.markdown).toContain(`from 2026-01-10 to 2026-01-15: ${ds.runs} runs`);
  });

  test("page digest lists the proposals from proposals list", async () => {
    const root = materialize("F6-runlog");
    fs.mkdirSync(path.join(root, "studio/proposals"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "studio/proposals/P-001-t1-fragments.md"),
      "---\nid: P-001\ntitle: T1 misfires on url fragments\ntarget: client\nkind: rule-fix\nevidence: [r-20260106-090500-53d7]\nstatus: New\ndecided_by: null\ndecided_at: null\nevals_before: null\nevals_after: null\ncreated: 2026-01-15\n---\n## Problem\nx\n## Change\nwords\n## How it will be checked\nrules-eval\n",
    );
    const page = await cli(["connectors", "page", "digest", "--json"], { root });
    expect(page.json.markdown).toContain("| P-001 | T1 misfires on url fragments | client | rule-fix | New |");
    const notice = await cli(["connectors", "notice", "digest", "--json"], { root });
    expect(notice.json.text).toContain("Proposals waiting for a ruling: P-001.");
  });

  test("deterministic: the same repo gives byte-identical output, JSON and text, and writes nothing", async () => {
    const before = read(f4, "studio/goals/G-004-settings-export/goal.md");
    for (const argv of [
      ["connectors", "check"],
      ["connectors", "issue", "G-004"],
      ["connectors", "comment", "G-004"],
      ["connectors", "page", "measurement", "G-005"],
      ["connectors", "notice", "gate", "G-001"],
    ]) {
      for (const extra of [[], ["--json"]]) {
        const a = await cli([...argv, ...extra], { root: f4, env: ENV });
        const b = await cli([...argv, ...extra], { root: f4, env: ENV });
        expect(a.code).toBe(0);
        expect(a.stdout).toBe(b.stdout);
      }
    }
    for (const argv of [["connectors", "page", "digest", "--json"], ["connectors", "notice", "digest", "--json"]]) {
      const a = await cli(argv, { root: f6 });
      const b = await cli(argv, { root: f6 });
      expect(a.stdout).toBe(b.stdout);
    }
    expect(read(f4, "studio/goals/G-004-settings-export/goal.md")).toBe(before);
  });
});
