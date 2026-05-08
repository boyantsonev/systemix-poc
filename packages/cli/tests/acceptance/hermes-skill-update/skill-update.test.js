"use strict";

/**
 * Acceptance tests — hermes-skill-update
 *
 * Walking skeleton strategy: B — real filesystem (tmp directory), fake Ollama HTTP calls.
 * Driving port: skillUpdate.update(hypothesisId, decision, card)
 *
 * Given-When-Then naming convention inside Jest describe/it blocks.
 * All scenarios except the first (walking skeleton) are marked with skip — enable one at a time.
 *
 * AC coverage:
 *   AC-1  Walking skeleton — Hermes available, SKILL.md updated
 *   AC-2  Hermes unavailable (ECONNREFUSED) — silent skip, structured log emitted
 *   AC-3  Hermes fails after 2 retries — HITL card of type skill-update-failed in queue
 *   AC-4  skill-tags: [hermes] in frontmatter — writes to ~/.claude/skills/hermes/SKILL.md
 *   AC-5  No skill-tags in frontmatter — defaults to ~/.claude/skills/hermes/SKILL.md
 *   AC-6  Atomic write — tmp file absent after successful write, original intact if rename not completed
 *   AC-7  Structural change detected — HITL card of type skill-update-review + write proceeds
 */

const fs   = require("fs");
const os   = require("os");
const path = require("path");

// ── Module under test ────────────────────────────────────────────────────────

const skillUpdate = require("../../../src/commands/skill-update");

// ── Test helpers ─────────────────────────────────────────────────────────────

/**
 * Creates a temporary directory that is cleaned up after each test.
 * Returns an object with helpers for writing hypothesis contracts and SKILL.md files.
 */
function createTmpWorkspace() {
  const root       = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-skill-update-test-"));
  const skillsDir  = path.join(root, ".claude", "skills", "hermes");
  const queueDir   = path.join(root, ".systemix");
  const hypoDir    = path.join(root, "contract", "hypotheses");

  fs.mkdirSync(skillsDir,  { recursive: true });
  fs.mkdirSync(queueDir,   { recursive: true });
  fs.mkdirSync(hypoDir,    { recursive: true });

  return {
    root,
    skillsDir,
    queueDir,
    hypoDir,
    skillPath:  path.join(skillsDir, "SKILL.md"),
    queuePath:  path.join(queueDir,  "queue.json"),

    /** Write a hypothesis MDX contract with the given frontmatter fields. */
    writeContract(id, frontmatter = {}, body = "") {
      const tags  = frontmatter["skill-tags"] ? `skill-tags: [${frontmatter["skill-tags"].join(", ")}]` : "";
      const extra = Object.entries(frontmatter)
        .filter(([k]) => k !== "skill-tags")
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join("\n");
      const fm = [
        `id: "${id}"`,
        `status: running`,
        tags,
        extra,
      ].filter(Boolean).join("\n");
      const content = `---\n${fm}\n---\n\n${body || "Hypothesis body."}`;
      fs.writeFileSync(path.join(hypoDir, `${id}.mdx`), content, "utf8");
    },

    /** Write a minimal SKILL.md with a Past Decisions section pre-existing (or not). */
    writeSkillMd(content) {
      fs.writeFileSync(this.skillPath, content, "utf8");
    },

    /** Read the current SKILL.md content. */
    readSkillMd() {
      return fs.readFileSync(this.skillPath, "utf8");
    },

    /** Read the queue.json if it exists. */
    readQueue() {
      if (!fs.existsSync(this.queuePath)) return null;
      return JSON.parse(fs.readFileSync(this.queuePath, "utf8"));
    },

    /** Clean up the entire tmp workspace. */
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

/**
 * Minimal SKILL.md fixture with one existing section.
 * Bullet-level change: a new bullet is added to an existing section.
 */
const SKILL_MD_BULLET_LEVEL = `# Hermes Skill

## Synthesis Guidelines

- Summarise evidence without invention.
- Cite source and confidence level.

## Past Decisions

- hypothesis-alpha: promoted 2026-04-01 — variant B +14% signup conversion.
`;

/**
 * SKILL.md fixture that will trigger a STRUCTURAL change:
 * The proposed patch adds a new ## heading not present in this version.
 */
const SKILL_MD_PRE_STRUCTURAL = `# Hermes Skill

## Synthesis Guidelines

- Summarise evidence without invention.
`;

// ── Fake Ollama factory ───────────────────────────────────────────────────────

/**
 * Returns a fetch stub that simulates Ollama behaviour.
 *
 * @param {object} opts
 * @param {'available'|'unavailable'|'fail-generate'} opts.ollamaState
 *   available       — probe returns 200 with hermes3, generate returns a valid patch
 *   unavailable     — probe throws ECONNREFUSED
 *   fail-generate   — probe ok, generate fails on every attempt (triggers retry + HITL)
 * @param {string} [opts.patchContent] — the section content Hermes "returns" (bullet-level by default)
 * @param {boolean} [opts.structural]  — if true, patchContent includes a new ## heading
 */
function makeFakeOllama({ ollamaState, patchContent, structural = false }) {
  return async function fakeFetch(url, opts) {
    // Probe call: GET /api/tags
    if (url.includes("/api/tags")) {
      if (ollamaState === "unavailable") {
        const err = new Error("connect ECONNREFUSED 127.0.0.1:11434");
        err.code  = "ECONNREFUSED";
        throw err;
      }
      return {
        ok:   true,
        json: async () => ({ models: [{ name: "hermes3:latest" }] }),
      };
    }

    // Generate call: POST /api/generate
    if (url.includes("/api/generate")) {
      if (ollamaState === "fail-generate") {
        return { ok: false, status: 503, json: async () => ({}) };
      }
      const defaultPatch = structural
        ? `## Past Decisions\n\n- pricing-headline-v2: promoted 2026-05-07 — variant B +14%.\n\n## New Structural Section\n\n- Added by skill update.\n`
        : `## Past Decisions\n\n- pricing-headline-v2: promoted 2026-05-07 — variant B +14%.\n`;
      return {
        ok:   true,
        json: async () => ({
          response: patchContent ?? defaultPatch,
        }),
      };
    }

    throw new Error(`Unexpected fetch call to: ${url}`);
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe("Skill update — hermes-skill-update acceptance tests", () => {
  let ws;

  beforeEach(() => {
    ws = createTmpWorkspace();
  });

  afterEach(() => {
    ws.cleanup();
  });

  // ── AC-1: Walking skeleton ─────────────────────────────────────────────────
  // Strategy B: real filesystem (tmp), fake Ollama HTTP call.
  // This is the FIRST scenario — it is enabled. All others are skipped.

  it(
    // Given a hypothesis card is approved and Hermes is available
    // When skillUpdate.update() is called
    // Then SKILL.md contains a Past Decisions entry for the closed hypothesis
    "AC-1 (walking skeleton): approved hypothesis results in a Past Decisions entry written to the skill file",
    async () => {
      // Given
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);

      const card = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };
      const fakeFetch = makeFakeOllama({ ollamaState: "available" });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then
      const updatedContent = ws.readSkillMd();
      expect(updatedContent).toContain("## Past Decisions");
      expect(updatedContent).toContain("pricing-headline-v2");
      expect(updatedContent).toContain("promote");
    }
  );

  // ── AC-2: Hermes unavailable — silent skip ─────────────────────────────────

  it(
    // Given Ollama is not running (ECONNREFUSED)
    // When a hypothesis card is approved and skillUpdate.update() is called
    // Then the SKILL.md is not written, and a structured log entry is emitted
    "AC-2: Hermes unavailable — SKILL.md is not written and a health.startup.refused log is emitted",
    async () => {
      // Given
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);
      const originalContent = ws.readSkillMd();

      const emittedLogs = [];
      const card       = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };
      const fakeFetch   = makeFakeOllama({ ollamaState: "unavailable" });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
        onLog:         (entry) => emittedLogs.push(entry),
      });

      // Then — SKILL.md unchanged
      expect(ws.readSkillMd()).toBe(originalContent);

      // Then — structured log emitted
      const refusedLog = emittedLogs.find(e => e.event === "health.startup.refused");
      expect(refusedLog).toBeDefined();
      expect(refusedLog.adapter).toBe("ollama");
      expect(refusedLog.action).toBe("skill-update.skipped");
    }
  );

  // ── AC-3: Hermes fails after 2 retries — HITL card written ────────────────

  it(
    // Given Ollama is running but returns an error on every generate attempt
    // When skillUpdate.update() is called
    // Then a HITL card of type skill-update-failed appears in queue.json
    "AC-3: Hermes fails after 2 retries — a skill-update-failed card is written to the queue",
    async () => {
      // Given
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);

      const card      = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };
      const fakeFetch = makeFakeOllama({ ollamaState: "fail-generate" });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then
      const queue = ws.readQueue();
      expect(queue).not.toBeNull();

      const failCard = (queue.cards ?? []).find(c => c.type === "skill-update-failed");
      expect(failCard).toBeDefined();
      expect(failCard.hypothesisId).toBe("pricing-headline-v2");
      expect(failCard.status).toBe("pending");
      expect(failCard.decision).toBe("promote");
    }
  );

  // ── AC-4: Skill resolution from frontmatter ────────────────────────────────

  it(
    // Given a hypothesis contract has skill-tags: [hermes] in its frontmatter
    // When the skill update runs
    // Then the write targets the hermes SKILL.md path and no other skill file
    "AC-4: skill-tags: [hermes] in frontmatter — write targets the hermes skill file",
    async () => {
      // Given — contract has explicit skill-tags: [hermes]
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);

      // Also create a decoy skill directory to confirm only hermes is written
      const decoyDir = path.join(ws.root, ".claude", "skills", "other-skill");
      fs.mkdirSync(decoyDir, { recursive: true });
      const decoyPath = path.join(decoyDir, "SKILL.md");
      fs.writeFileSync(decoyPath, "# Other Skill\n", "utf8");

      const card      = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };
      const fakeFetch = makeFakeOllama({ ollamaState: "available" });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then — hermes SKILL.md is updated
      expect(ws.readSkillMd()).toContain("pricing-headline-v2");

      // Then — decoy is untouched
      expect(fs.readFileSync(decoyPath, "utf8")).toBe("# Other Skill\n");
    }
  );

  // ── AC-5: Skill resolution — default fallback ──────────────────────────────

  it(
    // Given a hypothesis contract has no skill-tags field
    // When the skill update runs
    // Then the write targets the hermes SKILL.md default path
    "AC-5: no skill-tags in frontmatter — write defaults to the hermes skill file",
    async () => {
      // Given — contract has no skill-tags
      ws.writeContract("pricing-headline-v2", {}); // no skill-tags
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);

      const card      = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };
      const fakeFetch = makeFakeOllama({ ollamaState: "available" });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then — hermes SKILL.md was updated (default fallback resolved correctly)
      expect(ws.readSkillMd()).toContain("pricing-headline-v2");
    }
  );

  // ── AC-6: Atomic write — tmp file cleaned up after successful write ─────────

  it(
    // Given a valid update completes successfully
    // When the write has finished
    // Then no .tmp file remains on disk (rename completed cleanly)
    "AC-6: atomic write — no .tmp file is left on disk after a successful skill update",
    async () => {
      // Given
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);

      const card      = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };
      const fakeFetch = makeFakeOllama({ ollamaState: "available" });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then — no orphaned tmp file
      const tmpPath = ws.skillPath + ".tmp";
      expect(fs.existsSync(tmpPath)).toBe(false);

      // Then — SKILL.md is present and updated
      expect(fs.existsSync(ws.skillPath)).toBe(true);
      expect(ws.readSkillMd()).toContain("pricing-headline-v2");
    }
  );

  // ── AC-7: Structural change → HITL review card + write proceeds ─────────────

  it(
    // Given the proposed patch from Hermes adds a new ## heading (structural change)
    // When the skill update runs
    // Then a HITL card of type skill-update-review is written to the queue
    // And the SKILL.md write proceeds (structural write is not blocked)
    "AC-7: structural change — HITL review card is written and the skill file is still updated",
    async () => {
      // Given — SKILL.md has only one section; patch will add a new ## heading
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_PRE_STRUCTURAL);

      const card      = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };
      // Fake returns content containing a new ## heading — triggers structural classification
      const fakeFetch = makeFakeOllama({ ollamaState: "available", structural: true });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then — queue contains a skill-update-review card
      const queue      = ws.readQueue();
      const reviewCard = (queue?.cards ?? []).find(c => c.type === "skill-update-review");
      expect(reviewCard).toBeDefined();
      expect(reviewCard.hypothesisId).toBe("pricing-headline-v2");
      expect(reviewCard.status).toBe("pending");

      // Then — write still proceeded (SKILL.md was updated)
      expect(ws.readSkillMd()).toContain("pricing-headline-v2");
    }
  );

  // ── Error path: hypothesis contract not found ──────────────────────────────

  it(
    // Given a hypothesis ID is passed but no corresponding contract file exists on disk
    // When skillUpdate.update() is called
    // Then the call resolves without writing SKILL.md and without throwing
    "error path: missing hypothesis contract — update skips gracefully without writing SKILL.md",
    async () => {
      // Given — no contract written for this id
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);
      const originalContent = ws.readSkillMd();

      const card      = { hypothesisId: "non-existent-hypothesis", type: "hypothesis-validation" };
      const fakeFetch = makeFakeOllama({ ollamaState: "available" });

      // When
      await expect(
        skillUpdate.update("non-existent-hypothesis", "promote", card, {
          workspaceRoot: ws.root,
          fetch:         fakeFetch,
        })
      ).resolves.not.toThrow();

      // Then — SKILL.md is unchanged
      expect(ws.readSkillMd()).toBe(originalContent);
    }
  );

  // ── Error path: SKILL.md target directory does not exist ──────────────────

  it(
    // Given the resolved skill directory does not exist on disk
    // When skillUpdate.update() is called
    // Then the update is skipped gracefully — no file creation, no throw
    "error path: skill directory absent — update skips without creating the directory",
    async () => {
      // Given — contract references a skill tag for which no directory exists
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["no-such-skill"] });
      // Deliberately do NOT create ~/.claude/skills/no-such-skill/

      const emittedLogs = [];
      const card        = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };
      const fakeFetch   = makeFakeOllama({ ollamaState: "available" });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
        onLog:         (entry) => emittedLogs.push(entry),
      });

      // Then — no skill file created
      const absentPath = path.join(ws.root, ".claude", "skills", "no-such-skill", "SKILL.md");
      expect(fs.existsSync(absentPath)).toBe(false);

      // Then — a warning log was emitted
      const warnLog = emittedLogs.find(e => e.event === "skill-update.skipped");
      expect(warnLog).toBeDefined();
    }
  );

  // ── Error path: Hermes probe — model absent from Ollama ───────────────────

  it(
    // Given Ollama is running but the hermes3 model is not installed
    // When skillUpdate.update() is called
    // Then the update is skipped and a health.startup.refused log is emitted with reason model-absent
    "error path: Ollama running but hermes model absent — update skips with model-absent log",
    async () => {
      // Given
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);
      const originalContent = ws.readSkillMd();

      const emittedLogs = [];
      const card        = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };

      // Fake: probe returns 200 but model list is empty (no hermes)
      const modelAbsentFetch = async (url) => {
        if (url.includes("/api/tags")) {
          return {
            ok:   true,
            json: async () => ({ models: [{ name: "llama3:latest" }] }), // no hermes
          };
        }
        throw new Error("Unexpected generate call — should have been skipped after probe");
      };

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         modelAbsentFetch,
        onLog:         (entry) => emittedLogs.push(entry),
      });

      // Then — SKILL.md unchanged
      expect(ws.readSkillMd()).toBe(originalContent);

      // Then — structured log with model-absent reason
      const refusedLog = emittedLogs.find(e => e.event === "health.startup.refused");
      expect(refusedLog).toBeDefined();
      expect(refusedLog.reason).toContain("model-absent");
    }
  );

  // ── Error path: Hermes output fails validation (heading not preserved) ─────

  it(
    // Given Hermes returns a section patch that does not begin with the expected heading
    // When the validation check runs
    // Then the SKILL.md is not written and a retry is attempted (up to cap)
    "error path: Hermes output missing expected heading — write is refused and retry is attempted",
    async () => {
      // Given
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);
      const originalContent = ws.readSkillMd();

      const card = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };

      // Hermes returns garbled output — heading stripped
      const malformedFetch = async (url) => {
        if (url.includes("/api/tags")) {
          return { ok: true, json: async () => ({ models: [{ name: "hermes3:latest" }] }) };
        }
        return {
          ok:   true,
          json: async () => ({ response: "This is just prose, no heading." }),
        };
      };

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         malformedFetch,
      });

      // Then — SKILL.md unchanged (validation refused the write)
      expect(ws.readSkillMd()).toBe(originalContent);

      // Then — a skill-update-failed card is written after retry cap exhausted
      const queue      = ws.readQueue();
      const failCard   = (queue?.cards ?? []).find(c => c.type === "skill-update-failed");
      expect(failCard).toBeDefined();
    }
  );
});
