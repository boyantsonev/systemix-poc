"use strict";

// Acceptance tests — path safety for ids/tags/names that come from repo-file
// frontmatter or a PostHog event and become file paths. Each case plants a
// "victim" file exactly where the traversal would land (outside the intended
// dir) and asserts it is never touched. Hermetic: real tmpdirs, stubbed fetch.

const fs   = require("fs");
const os   = require("os");
const path = require("path");

let base, ws;

beforeEach(() => {
  base = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-path-safety-"));
  ws   = path.join(base, "ws");
  fs.mkdirSync(path.join(ws, ".systemix"), { recursive: true });
});

afterEach(() => {
  fs.rmSync(base, { recursive: true, force: true });
});

// ── skill-update: skill-tags frontmatter → .claude/skills/<tag>/SKILL.md ─────

describe("skill-update", () => {
  const skillUpdate = require("../../../src/commands/skill-update");

  function writeContract(id, tag) {
    const dir = path.join(ws, "contract", "hypotheses");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${id}.mdx`), `---\nid: "${id}"\nskill-tags: [${tag}]\n---\n\nBody.`, "utf8");
  }

  test("a traversal skill-tag is skipped and the file it points at is untouched", async () => {
    // ws/.claude/skills/../../../outside → base/outside
    fs.mkdirSync(path.join(ws, ".claude", "skills"), { recursive: true });
    const victim = path.join(base, "outside", "SKILL.md");
    fs.mkdirSync(path.dirname(victim), { recursive: true });
    fs.writeFileSync(victim, "# not yours\n", "utf8");
    writeContract("p", "../../../outside");

    const logs = [];
    await skillUpdate.update("p", "promote", {}, { workspaceRoot: ws, date: "2026-10-11", onLog: e => logs.push(e) });

    expect(fs.readFileSync(victim, "utf8")).toBe("# not yours\n");
    expect(logs).toEqual([{ event: "skill-update.skipped", reason: "invalid-skill-tag", hypothesisId: "p" }]);
  });

  test("a valid skill-tag still records the decision", async () => {
    const skill = path.join(ws, ".claude", "skills", "measure", "SKILL.md");
    fs.mkdirSync(path.dirname(skill), { recursive: true });
    fs.writeFileSync(skill, "# Measure\n\n## Past Decisions\n\n- old\n", "utf8");
    writeContract("p", "measure");

    await skillUpdate.update("p", "promote", {}, { workspaceRoot: ws, date: "2026-10-11", onLog: () => {} });

    expect(fs.readFileSync(skill, "utf8")).toMatch("- p: promote (2026-10-11)");
  });
});

// ── watch: PostHog component_name → contract/components/<name>.mdx ──────────

describe("watch pollPostHog", () => {
  const COMPONENT_MDX = "---\ncomponent: Button\nusage-count-30d: 0\nevidence-posthog: null\n---\n\nBody.\n";
  let prevEnv;

  beforeEach(() => {
    prevEnv = { ...process.env };
    process.env.POSTHOG_API_KEY = "phc_test";
    process.env.POSTHOG_PROJECT_ID = "1";
    fs.mkdirSync(path.join(ws, "contract", "components"), { recursive: true });
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = prevEnv;
    delete global.fetch;
    jest.restoreAllMocks();
  });

  test("a traversal component_name is skipped; valid components are still patched", async () => {
    // ws/contract/components/../../../victim.mdx → base/victim.mdx
    const victim = path.join(base, "victim.mdx");
    fs.writeFileSync(victim, COMPONENT_MDX, "utf8");
    const button = path.join(ws, "contract", "components", "Button.mdx");
    fs.writeFileSync(button, COMPONENT_MDX, "utf8");

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          ["../../../victim", "a", "/", 50, 5],
          ["Button", "a", "/", 7, 2],
        ],
      }),
    });

    const { pollPostHog } = require("../../../src/commands/watch");
    await pollPostHog(ws, false);

    expect(fs.readFileSync(victim, "utf8")).toBe(COMPONENT_MDX);
    expect(fs.readFileSync(button, "utf8")).toMatch(/usage-count-30d: 7/);
    const cards = JSON.parse(fs.readFileSync(path.join(ws, ".systemix", "queue.json"), "utf8")).cards;
    expect(cards.map(c => c.component)).toEqual(["Button"]);
  });
});

// ── evidence experiment pull: frontmatter id → experiments/<id>.mdx ──────────

describe("evidence experiment pull", () => {
  const VICTIM = "---\nid: victim\nstatus: running\n---\n\nBody.\n";
  let prevCwd, prevEnv;

  function freshModule() {
    jest.resetModules();
    return require("../../../src/commands/evidence");
  }

  beforeEach(() => {
    prevCwd = process.cwd();
    prevEnv = { ...process.env };
    process.env.POSTHOG_API_KEY = "phx_test";
    process.env.POSTHOG_PROJECT_ID = "123";
    fs.mkdirSync(path.join(ws, "experiments"), { recursive: true });
    process.chdir(ws);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ results: [[800, 50, 40]] }) });
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    process.env = prevEnv;
    delete global.fetch;
    jest.restoreAllMocks();
  });

  test("an experiment whose frontmatter id is a traversal is skipped before any query or write", async () => {
    // ws/experiments/../victim.mdx → ws/victim.mdx
    const victim = path.join(ws, "victim.mdx");
    fs.writeFileSync(victim, VICTIM, "utf8");
    fs.writeFileSync(
      path.join(ws, "experiments", "bad.mdx"),
      `---\nid: "../victim"\nstatus: running\nposthog-event: book_a_call\n---\n\nBody.\n`,
      "utf8",
    );

    const { experimentPull } = freshModule();
    await experimentPull([]);

    expect(fs.readFileSync(victim, "utf8")).toBe(VICTIM);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(ws, ".systemix", "queue.json"))).toBe(false);
  });

  test("writeExperimentSnapshot refuses an invalid id", () => {
    const victim = path.join(ws, "victim.mdx");
    fs.writeFileSync(victim, VICTIM, "utf8");
    const { writeExperimentSnapshot } = freshModule();
    expect(() => writeExperimentSnapshot("../victim", {
      event: "e", period_days: 30, fetched_at: "2026-10-11", source: "live",
      visitors: 1, event_count: 0, event_persons: 0, rate: 0,
    })).toThrow(/experiment id/);
    expect(fs.readFileSync(victim, "utf8")).toBe(VICTIM);
  });
});

// ── docs new: <Name> → docs/components/<slug>.md ──────────────────────────────

describe("docs new", () => {
  const { kebabCase, newDoc } = require("../../../src/commands/docs");

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  test("kebabCase only ever yields slug characters", () => {
    expect(kebabCase("ButtonGroup")).toBe("button-group");
    expect(kebabCase("Date Picker_v2")).toBe("date-picker-v2");
    expect(kebabCase("../../etc/evil")).toBe("etc-evil");
    expect(kebabCase("Button.Group")).toBe("button-group");
  });

  test("a traversal name stays inside docs/components/", () => {
    newDoc(ws, "../../../Escape", { group: "actions" });
    expect(fs.existsSync(path.join(ws, "docs", "components", "escape.md"))).toBe(true);
    expect(fs.readdirSync(base)).toEqual(["ws"]);
  });

  test("a name with no slug characters is refused and writes nothing", () => {
    expect(newDoc(ws, "../..", { group: "actions" })).toBe(false);
    expect(fs.existsSync(path.join(ws, "docs"))).toBe(false);
  });
});
