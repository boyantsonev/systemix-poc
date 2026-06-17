"use strict";

/**
 * Acceptance tests — skill-update (deterministic; engine = Claude Code)
 *
 * Records a closed-experiment decision as a bullet under a SKILL.md
 * "## Past Decisions" log. No LLM / no Ollama — the append is deterministic and
 * dates are injected (opts.date) so tests stay reproducible. Genuine
 * reasoning-based skill/guardrail improvements (Hermes's review+propose role)
 * live in the Claude `hermes` skill and are out of scope here.
 *
 * Driving port: update(hypothesisId, decision, card, opts)
 */

const fs   = require("fs");
const os   = require("os");
const path = require("path");

const skillUpdate = require("../../../src/commands/skill-update");

// ── Test helpers ──────────────────────────────────────────────────────────────

function createTmpWorkspace() {
  const root      = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-skill-update-test-"));
  const skillsDir = path.join(root, ".claude", "skills", "hermes");
  const queueDir  = path.join(root, ".systemix");
  const hypoDir   = path.join(root, "contract", "hypotheses");
  fs.mkdirSync(skillsDir, { recursive: true });
  fs.mkdirSync(queueDir,  { recursive: true });
  fs.mkdirSync(hypoDir,   { recursive: true });

  return {
    root, skillsDir, queueDir, hypoDir,
    skillPath: path.join(skillsDir, "SKILL.md"),
    queuePath: path.join(queueDir, "queue.json"),

    /** Write a hypothesis MDX contract with the given frontmatter fields. */
    writeContract(id, frontmatter = {}, body = "") {
      const tags  = frontmatter["skill-tags"]
        ? `skill-tags: [${frontmatter["skill-tags"].join(", ")}]`
        : "";
      const extra = Object.entries(frontmatter)
        .filter(([k]) => k !== "skill-tags")
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join("\n");
      const fm = [`id: "${id}"`, `status: running`, tags, extra].filter(Boolean).join("\n");
      fs.writeFileSync(path.join(this.hypoDir, `${id}.mdx`), `---\n${fm}\n---\n\n${body || "Body."}`, "utf8");
    },

    writeSkillMd(content) { fs.writeFileSync(this.skillPath, content, "utf8"); },
    readSkillMd()         { return fs.readFileSync(this.skillPath, "utf8"); },
    readQueue()           { return fs.existsSync(this.queuePath) ? JSON.parse(fs.readFileSync(this.queuePath, "utf8")) : null; },
    cleanup()             { fs.rmSync(root, { recursive: true, force: true }); },
  };
}

const SKILL_WITH_SECTION = `# Hermes Skill

## Synthesis Guidelines

- Summarise evidence without invention.

## Past Decisions

- alpha: promote (2026-04-01) — earlier learning.
`;

const SKILL_NO_SECTION = `# Hermes Skill

## Synthesis Guidelines

- Summarise evidence without invention.
`;

const DATE = "2026-06-17";

// ── Test suite ────────────────────────────────────────────────────────────────

describe("skill-update — deterministic Past-Decisions log", () => {
  let ws;
  beforeEach(() => { ws = createTmpWorkspace(); });
  afterEach(()  => { ws.cleanup(); });

  it("appends a Past-Decisions bullet for an approved decision — bullet-level, no card", async () => {
    ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"], hypothesis: "Variant B lifts signup" });
    ws.writeSkillMd(SKILL_WITH_SECTION);

    await skillUpdate.update("pricing-headline-v2", "promote", {}, { workspaceRoot: ws.root, date: DATE });

    const md = ws.readSkillMd();
    expect(md).toContain("## Past Decisions");
    expect(md).toContain("- pricing-headline-v2: promote (2026-06-17)");
    expect(md).toContain("Variant B lifts signup");           // summary from contract frontmatter
    expect(md).toContain("- alpha: promote (2026-04-01)");     // prior bullet preserved
    expect(ws.readQueue()).toBeNull();                          // section existed → bullet-level → no card
  });

  it("uses NO network: an injected fetch is never called and the write still happens", async () => {
    ws.writeContract("x", { "skill-tags": ["hermes"] });
    ws.writeSkillMd(SKILL_WITH_SECTION);
    const exploding = () => { throw new Error("network must not be used — engine is Claude, not Ollama"); };

    await expect(
      skillUpdate.update("x", "promote", {}, { workspaceRoot: ws.root, date: DATE, fetch: exploding }),
    ).resolves.toBeUndefined();

    expect(ws.readSkillMd()).toContain("- x: promote (2026-06-17)");
  });

  it("creates the Past Decisions section when absent — structural change queues a review card", async () => {
    ws.writeContract("p", { "skill-tags": ["hermes"] });
    ws.writeSkillMd(SKILL_NO_SECTION);

    await skillUpdate.update("p", "promote", {}, { workspaceRoot: ws.root, date: DATE });

    const md = ws.readSkillMd();
    expect(md).toContain("## Past Decisions");
    expect(md).toContain("- p: promote (2026-06-17)");

    const review = (ws.readQueue()?.cards ?? []).filter(c => c.type === "skill-update-review");
    expect(review).toHaveLength(1);
    expect(review[0].hypothesisId).toBe("p");
    expect(review[0].changeType).toBe("structural");
    expect(review[0].status).toBe("pending");
  });

  it("missing contract — skips with a contract-not-found log, no write", async () => {
    ws.writeSkillMd(SKILL_WITH_SECTION);
    const original = ws.readSkillMd();
    const logs = [];

    await skillUpdate.update("ghost", "promote", {}, { workspaceRoot: ws.root, date: DATE, onLog: e => logs.push(e) });

    expect(ws.readSkillMd()).toBe(original);
    expect(logs).toEqual([{ event: "skill-update.skipped", reason: "contract-not-found", hypothesisId: "ghost" }]);
  });

  it("skill directory absent — skips with a skill-dir-absent log, no file created", async () => {
    ws.writeContract("p", { "skill-tags": ["no-such-skill"] });
    const logs = [];

    await skillUpdate.update("p", "promote", {}, { workspaceRoot: ws.root, date: DATE, onLog: e => logs.push(e) });

    const absent = path.join(ws.root, ".claude", "skills", "no-such-skill", "SKILL.md");
    expect(fs.existsSync(absent)).toBe(false);
    expect(logs).toEqual([{ event: "skill-update.skipped", reason: "skill-dir-absent", hypothesisId: "p" }]);
  });

  it("atomic write — no .tmp file is left behind", async () => {
    ws.writeContract("p", { "skill-tags": ["hermes"] });
    ws.writeSkillMd(SKILL_WITH_SECTION);

    await skillUpdate.update("p", "promote", {}, { workspaceRoot: ws.root, date: DATE });

    expect(fs.existsSync(ws.skillPath + ".tmp")).toBe(false);
    expect(ws.readSkillMd()).toContain("- p: promote (2026-06-17)");
  });

  it("trailing whitespace is stripped from the written file", async () => {
    ws.writeContract("p", { "skill-tags": ["hermes"] });
    ws.writeSkillMd("# Hermes Skill\n\n## Past Decisions   \n\n- old.   \n");

    await skillUpdate.update("p", "promote", {}, { workspaceRoot: ws.root, date: DATE });

    const md = ws.readSkillMd();
    expect(md).not.toMatch(/ \n/);          // no space immediately before a newline
    expect(md).toContain("## Past Decisions\n");
  });

  it("skill-tags: the first tag wins and a decoy skill is left untouched", async () => {
    ws.writeContract("p", { "skill-tags": ["hermes", "other"] });
    ws.writeSkillMd(SKILL_WITH_SECTION);
    const otherDir = path.join(ws.root, ".claude", "skills", "other");
    fs.mkdirSync(otherDir, { recursive: true });
    fs.writeFileSync(path.join(otherDir, "SKILL.md"), "# Other\n", "utf8");

    await skillUpdate.update("p", "promote", {}, { workspaceRoot: ws.root, date: DATE });

    expect(ws.readSkillMd()).toContain("- p: promote (2026-06-17)");
    expect(fs.readFileSync(path.join(otherDir, "SKILL.md"), "utf8")).toBe("# Other\n");
  });

  it("no skill-tags — resolution defaults to the hermes skill", async () => {
    ws.writeContract("p", {});
    ws.writeSkillMd(SKILL_WITH_SECTION);

    await skillUpdate.update("p", "promote", {}, { workspaceRoot: ws.root, date: DATE });

    expect(ws.readSkillMd()).toContain("- p: promote (2026-06-17)");
  });

  it("queue append — an existing card is preserved and the review card is appended", async () => {
    ws.writeContract("p", { "skill-tags": ["hermes"] });
    ws.writeSkillMd(SKILL_NO_SECTION); // structural → review card
    fs.writeFileSync(ws.queuePath, JSON.stringify({ cards: [{ id: "pre-1", type: "other", status: "pending" }] }), "utf8");

    await skillUpdate.update("p", "promote", {}, { workspaceRoot: ws.root, date: DATE });

    const q = ws.readQueue();
    expect(q.cards).toHaveLength(2);
    expect(q.cards[0].id).toBe("pre-1");
    expect(q.cards[1].type).toBe("skill-update-review");
  });

  it("queue heal — a non-array cards field is reset to an array with the new card", async () => {
    ws.writeContract("p", { "skill-tags": ["hermes"] });
    ws.writeSkillMd(SKILL_NO_SECTION);
    fs.writeFileSync(ws.queuePath, JSON.stringify({ cards: { not: "an array" } }), "utf8");

    await skillUpdate.update("p", "promote", {}, { workspaceRoot: ws.root, date: DATE });

    const q = ws.readQueue();
    expect(Array.isArray(q.cards)).toBe(true);
    expect(q.cards).toHaveLength(1);
    expect(q.cards[0].type).toBe("skill-update-review");
  });
});

describe("skill-update — pure helpers", () => {
  it("classifyChange: same heading set (any order) is bullet-level; a new heading is structural", () => {
    const base = "## A\n## B";
    expect(skillUpdate.classifyChange(base, "## B\n## A\n- x")).toBe("bullet-level");
    expect(skillUpdate.classifyChange(base, "## A\n## B\n## C")).toBe("structural");
  });

  it("summarize: prefers result, falls back to hypothesis, treats null/empty as blank", () => {
    expect(skillUpdate.summarize({ result: '"B won"', hypothesis: '"H"' })).toBe("B won");
    expect(skillUpdate.summarize({ result: "null", hypothesis: '"H text"' })).toBe("H text");
    expect(skillUpdate.summarize({})).toBe("");
  });

  it("appendPastDecision: appends under an existing section, keeping prior bullets", () => {
    const out = skillUpdate.appendPastDecision(SKILL_WITH_SECTION, {
      hypothesisId: "z", decision: "kill", date: DATE, summary: "",
    });
    expect(out).toContain("- alpha: promote (2026-04-01)");
    expect(out).toContain("- z: kill (2026-06-17)");
  });
});
