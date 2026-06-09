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

/**
 * Wraps makeFakeOllama and records every fetch call (url + opts) into `calls`,
 * so a test can assert the exact request the production code builds.
 */
function makeRecordingOllama(calls, fakeOpts) {
  const inner = makeFakeOllama(fakeOpts);
  return async function recordingFetch(url, opts) {
    calls.push({ url, opts });
    return inner(url, opts);
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
      // Recording fetch so we can assert the generate request the production code builds.
      const calls = [];
      const fakeFetch = makeRecordingOllama(calls, { ollamaState: "available" });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then — the skill file is updated with the closed hypothesis decision
      const updatedContent = ws.readSkillMd();
      expect(updatedContent).toContain("## Past Decisions");
      expect(updatedContent).toContain("pricing-headline-v2");
      expect(updatedContent).toContain("promote");

      // Then — the probe call hit the Ollama tags endpoint
      const probe = calls.find(c => c.url.includes("/api/tags"));
      expect(probe).toBeDefined();

      // Then — the generate request is a POST with the documented headers and body
      const gen = calls.find(c => c.url.includes("/api/generate"));
      expect(gen).toBeDefined();
      expect(gen.url).toBe("http://localhost:11434/api/generate");
      expect(gen.opts.method).toBe("POST");
      expect(gen.opts.headers["Content-Type"]).toBe("application/json");
      const body = JSON.parse(gen.opts.body);
      expect(body.model).toBe("hermes3");
      expect(body.stream).toBe(false);

      // Then — the prompt embeds the hypothesis id, decision, today's date and the
      // exact "## Past Decisions" instruction produced by buildPrompt().
      const today = new Date().toISOString().slice(0, 10);
      expect(body.prompt).toContain("You are updating a skill file.");
      expect(body.prompt).toContain('Append a new bullet to the "## Past Decisions" section');
      expect(body.prompt).toContain("Hypothesis ID: pricing-headline-v2");
      expect(body.prompt).toContain("Decision: promote");
      expect(body.prompt).toContain(`Date: ${today}`);
      expect(body.prompt).toContain("Return ONLY the updated full SKILL.md content, nothing else.");
      // The prompt embeds the FULL existing skill file (not a slice of the date, etc.)
      expect(body.prompt).toContain("## Synthesis Guidelines");
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

      // Then — exactly one structured log emitted, with every field at its exact value
      const refusedLogs = emittedLogs.filter(e => e.event === "health.startup.refused");
      expect(refusedLogs).toHaveLength(1);
      const refusedLog = refusedLogs[0];
      expect(refusedLog.event).toBe("health.startup.refused");
      expect(refusedLog.adapter).toBe("ollama");
      expect(refusedLog.reason).toBe("econnrefused");
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
      expect(Array.isArray(queue.cards)).toBe(true);
      expect(queue.cards).toHaveLength(1);

      const failCard = queue.cards.find(c => c.type === "skill-update-failed");
      expect(failCard).toBeDefined();
      // Every field value of the HITL fail card is asserted exactly.
      expect(failCard.id).toContain("skill-update-failed-");
      expect(failCard.id).toContain("pricing-headline-v2");
      expect(failCard.type).toBe("skill-update-failed");
      expect(failCard.hypothesisId).toBe("pricing-headline-v2");
      expect(failCard.decision).toBe("promote");
      expect(failCard.reason).toBe("Hermes generate failed after 2 attempts");
      expect(failCard.status).toBe("pending");
      expect(typeof failCard.requestedAt).toBe("string");
      expect(failCard.requestedAt.length).toBeGreaterThan(0);

      // No SKILL.md write happened — only the fail card was queued.
      const failCards = queue.cards.filter(c => c.type === "skill-update-failed");
      expect(failCards).toHaveLength(1);
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

      // Then — queue contains exactly one skill-update-review card
      const queue        = ws.readQueue();
      const reviewCards  = (queue?.cards ?? []).filter(c => c.type === "skill-update-review");
      expect(reviewCards).toHaveLength(1);
      const reviewCard = reviewCards[0];
      // Every field value of the HITL review card is asserted exactly.
      expect(reviewCard.id).toContain("skill-update-review-");
      expect(reviewCard.id).toContain("pricing-headline-v2");
      expect(reviewCard.type).toBe("skill-update-review");
      expect(reviewCard.hypothesisId).toBe("pricing-headline-v2");
      expect(reviewCard.decision).toBe("promote");
      expect(reviewCard.changeType).toBe("structural");
      expect(reviewCard.status).toBe("pending");
      expect(typeof reviewCard.requestedAt).toBe("string");
      expect(reviewCard.requestedAt.length).toBeGreaterThan(0);

      // Then — write still proceeded: the new structural heading is now in SKILL.md.
      const updated = ws.readSkillMd();
      expect(updated).toContain("pricing-headline-v2");
      expect(updated).toContain("## New Structural Section");
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

      // Then — exactly one skip log was emitted with the exact reason and hypothesis id
      const warnLogs = emittedLogs.filter(e => e.event === "skill-update.skipped");
      expect(warnLogs).toHaveLength(1);
      const warnLog = warnLogs[0];
      expect(warnLog.event).toBe("skill-update.skipped");
      expect(warnLog.reason).toBe("skill-dir-absent");
      expect(warnLog.hypothesisId).toBe("pricing-headline-v2");
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

      // Then — exactly one structured log, every field at its exact value
      const refusedLogs = emittedLogs.filter(e => e.event === "health.startup.refused");
      expect(refusedLogs).toHaveLength(1);
      const refusedLog = refusedLogs[0];
      expect(refusedLog.event).toBe("health.startup.refused");
      expect(refusedLog.adapter).toBe("ollama");
      expect(refusedLog.reason).toBe("model-absent");
      expect(refusedLog.action).toBe("skill-update.skipped");
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
      expect(failCard.reason).toBe("Hermes generate failed after 2 attempts");
      expect(failCard.status).toBe("pending");
    }
  );

  // ── Retry: generate fails on attempt 1, succeeds on attempt 2 ──────────────

  it(
    // Given Ollama's generate endpoint fails on the first attempt but succeeds on the second
    // When skillUpdate.update() is called
    // Then the retry kicks in and the SKILL.md is written from the second attempt's output
    // (this proves the loop runs to attempt 2, killing the `attempt <= 2` -> `attempt < 2` mutant)
    "retry: generate fails once then succeeds — second attempt's output is written, no fail card",
    async () => {
      // Given
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);

      let generateCalls = 0;
      const flakyFetch = async (url) => {
        if (url.includes("/api/tags")) {
          return { ok: true, json: async () => ({ models: [{ name: "hermes3:latest" }] }) };
        }
        generateCalls += 1;
        if (generateCalls === 1) {
          // First attempt: HTTP error -> triggers retry
          return { ok: false, status: 503, json: async () => ({}) };
        }
        // Second attempt: valid patch — keep BOTH existing headings so the change is
        // bullet-level (no review card), isolating this test to the retry behaviour.
        return {
          ok:   true,
          json: async () => ({
            response: "# Hermes Skill\n\n## Synthesis Guidelines\n\n- Summarise evidence without invention.\n\n## Past Decisions\n\n- pricing-headline-v2: promoted on retry attempt 2.\n",
          }),
        };
      };

      const card = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         flakyFetch,
      });

      // Then — generate was called twice (the loop reached attempt 2)
      expect(generateCalls).toBe(2);

      // Then — the second attempt's content was written
      expect(ws.readSkillMd()).toContain("promoted on retry attempt 2");

      // Then — no fail card was queued (recovery succeeded)
      expect(ws.readQueue()).toBeNull();
    }
  );

  // ── Retry: generate THROWS on attempt 1 (network error), succeeds on attempt 2 ─

  it(
    // Given the generate fetch THROWS (transient network error) on the first attempt
    //   then returns a valid patch on the second attempt
    // When skillUpdate.update() is called
    // Then the thrown error is caught, the loop continues, and the second attempt's
    //   output is written without the call rejecting
    // (kills the empty `catch (err) {}` mutant: without `continue` the loop falls through
    //  to `genRes.ok` on an undefined genRes and throws)
    "retry: generate throws once then succeeds — error is caught, second attempt is written",
    async () => {
      // Given
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);

      let generateCalls = 0;
      const throwingFetch = async (url) => {
        if (url.includes("/api/tags")) {
          return { ok: true, json: async () => ({ models: [{ name: "hermes3:latest" }] }) };
        }
        generateCalls += 1;
        if (generateCalls === 1) {
          throw new Error("socket hang up"); // transient network failure
        }
        return {
          ok:   true,
          json: async () => ({
            response: "# Hermes Skill\n\n## Synthesis Guidelines\n\n- Summarise evidence without invention.\n\n## Past Decisions\n\n- pricing-headline-v2: promoted after a thrown-then-recovered call.\n",
          }),
        };
      };

      const card = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };

      // When — must resolve (not reject): the thrown error is caught and retried
      await expect(
        skillUpdate.update("pricing-headline-v2", "promote", card, {
          workspaceRoot: ws.root,
          fetch:         throwingFetch,
        })
      ).resolves.toBeUndefined();

      // Then — both attempts ran and the recovered content was written
      expect(generateCalls).toBe(2);
      expect(ws.readSkillMd()).toContain("thrown-then-recovered");
    }
  );

  // ── Validation: trailing whitespace is stripped before the write ───────────

  it(
    // Given Hermes returns valid content but with trailing whitespace on each line
    // When skillUpdate.update() is called
    // Then the written SKILL.md has trailing whitespace removed (stripTrailingWhitespace applied)
    "validation: trailing whitespace in Hermes output is stripped before writing",
    async () => {
      // Given — every content line carries trailing spaces; lines must be trimEnd-ed (not trimStart)
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);

      const dirtyResponse =
        "## Past Decisions   \n\n  - leading kept, trailing stripped.   \n";
      const fetchWithTrailing = async (url) => {
        if (url.includes("/api/tags")) {
          return { ok: true, json: async () => ({ models: [{ name: "hermes3:latest" }] }) };
        }
        return { ok: true, json: async () => ({ response: dirtyResponse }) };
      };

      const card = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fetchWithTrailing,
      });

      // Then — the heading line lost its trailing spaces, joined back with newlines
      const written = ws.readSkillMd();
      expect(written).toContain("## Past Decisions\n");
      expect(written).not.toContain("## Past Decisions   ");
      // Leading whitespace is preserved (trimEnd, not trimStart, not trim)
      expect(written).toContain("  - leading kept, trailing stripped.\n");
      expect(written).not.toContain("trailing stripped.   ");
    }
  );

  // ── Bullet-level change → NO review card, but write still proceeds ─────────

  it(
    // Given the proposed patch from Hermes keeps the SAME ## headings (only bullets differ)
    // When skillUpdate.update() is called
    // Then NO skill-update-review card is queued (the change is bullet-level, not structural)
    // And the SKILL.md is still updated
    // (kills the `if (changeType === "structural")` -> `if (true)` mutant and `return \"bullet-level\"` -> `\"\"`)
    "bullet-level change — no review card is queued and the skill file is still updated",
    async () => {
      // Given — existing SKILL.md headings == proposed headings (set & order identical)
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL); // headings: Synthesis Guidelines, Past Decisions

      // Proposed content keeps BOTH headings, changes only bullets.
      const sameHeadingsPatch =
        "# Hermes Skill\n\n## Synthesis Guidelines\n\n- A brand new guideline bullet.\n\n## Past Decisions\n\n- pricing-headline-v2: promoted 2026-05-07 — bullet only change.\n";
      const fakeFetch = makeFakeOllama({ ollamaState: "available", patchContent: sameHeadingsPatch });

      const card = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then — write proceeded with the bullet-level content
      const written = ws.readSkillMd();
      expect(written).toContain("A brand new guideline bullet.");
      expect(written).toContain("bullet only change.");

      // Then — NO review card, in fact NO queue at all was created
      expect(ws.readQueue()).toBeNull();
    }
  );

  // ── Heading REORDER is bullet-level (extractHeadings sorts before compare) ──

  it(
    // Given existing and proposed SKILL.md contain the SAME ## headings in a DIFFERENT order
    // When skillUpdate.update() is called
    // Then the change classifies as bullet-level (sorted heading sets are equal) — NO review card
    // (kills the `matches.sort()` -> `matches` mutant in extractHeadings)
    "heading reorder only — classified as bullet-level (headings are sorted before comparison), no review card",
    async () => {
      // Given — existing order: Alpha then Beta
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd("# Hermes Skill\n\n## Alpha\n\n- a1.\n\n## Beta\n\n- b1.\n\n## Past Decisions\n\n- seed.\n");

      // Proposed: SAME three headings but reordered: Beta then Alpha then Past Decisions
      const reorderedPatch =
        "# Hermes Skill\n\n## Beta\n\n- b1.\n\n## Alpha\n\n- a1.\n\n## Past Decisions\n\n- pricing-headline-v2 added.\n";
      const fakeFetch = makeFakeOllama({ ollamaState: "available", patchContent: reorderedPatch });

      const card = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then — write proceeded
      expect(ws.readSkillMd()).toContain("pricing-headline-v2 added.");

      // Then — reordering the same heading set is NOT structural: no review card / no queue.
      expect(ws.readQueue()).toBeNull();
    }
  );

  // ── pushQueueCard appends to a PRE-EXISTING queue (does not clobber) ────────

  it(
    // Given a queue.json already exists with one unrelated card
    // When a structural skill update queues a review card
    // Then the existing card is PRESERVED and the review card is APPENDED
    // (kills the `if (fs.existsSync(queuePath))` -> `if (false)` and `cards: []` reset mutants)
    "queue append — an existing queue card is preserved and the new HITL card is appended",
    async () => {
      // Given — a pre-existing queue with one unrelated card
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_PRE_STRUCTURAL);
      const preExisting = { cards: [{ id: "pre-existing-1", type: "other-card", status: "pending" }] };
      fs.writeFileSync(ws.queuePath, JSON.stringify(preExisting, null, 2), "utf8");

      const card      = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };
      const fakeFetch = makeFakeOllama({ ollamaState: "available", structural: true });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then — both cards are present: the original was not clobbered, the review card was appended
      const queue = ws.readQueue();
      expect(queue.cards).toHaveLength(2);
      expect(queue.cards[0].id).toBe("pre-existing-1");
      expect(queue.cards[0].type).toBe("other-card");
      expect(queue.cards[1].type).toBe("skill-update-review");
    }
  );

  // ── pushQueueCard heals a corrupt (non-array) cards field ──────────────────

  it(
    // Given queue.json exists but its `cards` field is not an array
    // When a HITL card is pushed
    // Then the cards field is reset to an array containing exactly the new card
    // (kills the `if (!Array.isArray(queue.cards))` mutants in pushQueueCard)
    "queue heal — a non-array cards field is reset to an array holding the new card",
    async () => {
      // Given — corrupt queue: cards is an object, not an array
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_PRE_STRUCTURAL);
      fs.writeFileSync(ws.queuePath, JSON.stringify({ cards: { not: "an array" } }, null, 2), "utf8");

      const card      = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };
      const fakeFetch = makeFakeOllama({ ollamaState: "available", structural: true });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then — cards is now a single-element array with the review card
      const queue = ws.readQueue();
      expect(Array.isArray(queue.cards)).toBe(true);
      expect(queue.cards).toHaveLength(1);
      expect(queue.cards[0].type).toBe("skill-update-review");
    }
  );

  // ── contract-not-found log payload assertions ──────────────────────────────

  it(
    // Given no contract file exists for the hypothesis id
    // When skillUpdate.update() is called with an onLog sink
    // Then exactly one skip log with the exact event/reason/hypothesisId is emitted
    "missing contract — emits exactly one skill-update.skipped log with reason contract-not-found",
    async () => {
      // Given — no contract written
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);
      const emittedLogs = [];
      const card      = { hypothesisId: "ghost-hypothesis", type: "hypothesis-validation" };
      const fakeFetch = makeFakeOllama({ ollamaState: "available" });

      // When
      await skillUpdate.update("ghost-hypothesis", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
        onLog:         (entry) => emittedLogs.push(entry),
      });

      // Then — exactly one skip log with every field at its exact value
      expect(emittedLogs).toHaveLength(1);
      const skipLog = emittedLogs[0];
      expect(skipLog.event).toBe("skill-update.skipped");
      expect(skipLog.reason).toBe("contract-not-found");
      expect(skipLog.hypothesisId).toBe("ghost-hypothesis");
    }
  );

  // ── skill-tags parsing: first of multiple tags wins, whitespace trimmed ────

  it(
    // Given the frontmatter declares multiple skill-tags with surrounding whitespace: [ hermes , other ]
    // When skillUpdate.update() resolves the skill path
    // Then it resolves to the FIRST tag (hermes), trimmed — writing the hermes file and not the other
    // (kills parseSkillTags split/trim/filter mutants and tags[0] resolution)
    "skill-tags parsing — first tag wins and is trimmed when multiple tags with whitespace are present",
    async () => {
      // Given — multiple tags; the writeContract helper joins with ", " => "[hermes, other]".
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes", "other"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);

      // Decoy "other" skill dir — must remain untouched since hermes (first tag) wins.
      const otherDir = path.join(ws.root, ".claude", "skills", "other");
      fs.mkdirSync(otherDir, { recursive: true });
      const otherPath = path.join(otherDir, "SKILL.md");
      fs.writeFileSync(otherPath, "# Other Skill\n", "utf8");

      const card      = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };
      const fakeFetch = makeFakeOllama({ ollamaState: "available" });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then — hermes (first tag) was written
      expect(ws.readSkillMd()).toContain("pricing-headline-v2");
      // Then — the second tag's skill file was NOT touched
      expect(fs.readFileSync(otherPath, "utf8")).toBe("# Other Skill\n");
    }
  );

  // ── skill-tags resolves a NON-default tag from a multi-line frontmatter ────

  it(
    // Given a contract whose frontmatter (multiple lines) declares skill-tags: [custom-skill]
    // When skillUpdate.update() resolves the skill path
    // Then it writes to the custom-skill SKILL.md, NOT the hermes default
    // (kills parseFrontmatter line-split / colon-split / key.trim mutants, fm["skill-tags"], and the
    //  parseSkillTags chain — all of which must work to resolve a non-default tag)
    "skill-tags resolution — a non-default tag in a multi-line frontmatter targets that skill's file",
    async () => {
      // Given — a real multi-line frontmatter; skill-tags is NOT the first key.
      // Written directly (not via the helper) to control exact spacing.
      // The tag value contains a colon ("custom:skill") so that the line's colon-split
      // must be re-joined with ":" — this exercises rest.join(":") faithfully.
      const contractPath = path.join(ws.hypoDir, "pricing-headline-v2.mdx");
      fs.writeFileSync(
        contractPath,
        '---\nid: "pricing-headline-v2"\nstatus: running\n  skill-tags : [custom:skill]\ntitle: "Pricing headline"\n---\n\nHypothesis body.\n',
        "utf8"
      );

      // The hermes default file exists too — it must remain untouched.
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);

      // The custom:skill dir is the ONLY skill dir that exists for the resolved tag.
      const customDir = path.join(ws.root, ".claude", "skills", "custom:skill");
      fs.mkdirSync(customDir, { recursive: true });
      const customPath = path.join(customDir, "SKILL.md");
      fs.writeFileSync(customPath, SKILL_MD_BULLET_LEVEL, "utf8");

      const card      = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };
      const fakeFetch = makeFakeOllama({ ollamaState: "available" });

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         fakeFetch,
      });

      // Then — the custom-skill file was updated (frontmatter + tag parsing resolved correctly)
      expect(fs.readFileSync(customPath, "utf8")).toContain("pricing-headline-v2");
      // Then — the hermes default file was NOT touched.
      expect(ws.readSkillMd()).toBe(SKILL_MD_BULLET_LEVEL);
    }
  );

  // ── probe: hermes present alongside another model is detected (some, not every) ─

  it(
    // Given Ollama lists multiple models where only ONE is a hermes model
    // When skillUpdate.update() probes for hermes
    // Then hermes is detected and the update proceeds
    // (kills the `models.some(...)` -> `models.every(...)` mutant: every would be false here)
    "probe — hermes is detected when present alongside a non-hermes model",
    async () => {
      // Given
      ws.writeContract("pricing-headline-v2", { "skill-tags": ["hermes"] });
      ws.writeSkillMd(SKILL_MD_BULLET_LEVEL);

      const mixedModelsFetch = async (url) => {
        if (url.includes("/api/tags")) {
          return {
            ok:   true,
            // llama3 is NOT hermes, hermes3 IS — `every` would reject, `some` accepts.
            json: async () => ({ models: [{ name: "llama3:latest" }, { name: "hermes3:latest" }] }),
          };
        }
        return {
          ok:   true,
          json: async () => ({ response: "## Past Decisions\n\n- pricing-headline-v2 promoted.\n" }),
        };
      };

      const card = { hypothesisId: "pricing-headline-v2", type: "hypothesis-validation" };

      // When
      await skillUpdate.update("pricing-headline-v2", "promote", card, {
        workspaceRoot: ws.root,
        fetch:         mixedModelsFetch,
      });

      // Then — the update proceeded (hermes was detected among the mixed models)
      expect(ws.readSkillMd()).toContain("pricing-headline-v2 promoted.");
    }
  );
});
