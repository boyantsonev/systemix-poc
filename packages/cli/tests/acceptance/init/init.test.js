"use strict";

/**
 * Acceptance tests — systemix-init
 *
 * Walking skeleton strategy: real filesystem (tmp directories), fake prompt, fake MCP client detection.
 * Driving port: init(opts) — opts.projectRoot, opts.homeDir, opts.prompt, opts.detectClients,
 *                             opts.registerServer, opts.reconfigure
 *
 * Given-When-Then naming convention inside Jest describe/it blocks.
 * All scenarios except the first (walking skeleton) are marked with skip — enable one at a time.
 *
 * AC coverage:
 *   AC-WS  Walking skeleton — both surfaces, skip all credentials — all dirs, YAML, gitignore, MCP snippet
 *   AC-01a Surface selection: design-system only — exactly 6 skill dirs, no hypothesis dirs
 *   AC-01b Surface selection: hypothesis-validation only — exactly 9 skill dirs, no design-system dirs
 *   AC-01c Surfaces YAML: hypothesis-validation choice writes [landing, onboarding], not [hypothesis-validation]
 *   AC-02a Figma key: full figma.com/design URL extracts file key, writes project-context.json
 *   AC-02b Figma key: bare key accepted without re-prompting
 *   AC-02c Figma key: invalid input loops then Enter skips — no project-context.json created
 *   AC-03a Idempotency: re-running without --reconfigure preserves existing systemix.config.yaml
 *   AC-03b Reconfigure: --reconfigure flag overwrites systemix.config.yaml
 *   AC-04a Gitignore: systemix entries appended to existing .gitignore, existing entries preserved
 *   AC-04b Gitignore: re-running init does not duplicate gitignore entries
 *   AC-04c Gitignore: partial entries completed without duplicating existing
 *   AC-05a Trust tier: conservative autonomy produces orchestrator_tier: 0 and hermes_tier: 0
 *   AC-05b Trust tier: progressive autonomy still produces orchestrator_tier: 0 and hermes_tier: 0
 *   AC-06a Self-improvement off: siMode=off → no contract/meta dir, no meta_contract in YAML
 *   AC-06b Self-improvement audit: siMode=audit → contract/meta dir exists and meta_contract in YAML
 *   AC-07a MCP fallback: no MCP client found — manual snippet printed, all file writes still complete
 *   AC-08a Skip flow: skipping Figma key leaves no project-context.json and no systemix.json
 *   AC-08b Skip flow: providing a Figma key writes both project-context.json and systemix.json figma block
 *   AC-08c Skip flow: skipping PAT means no figmaToken in ~/.systemix/config.json
 */

const fs   = require("fs");
const os   = require("os");
const path = require("path");

// ── Module under test ─────────────────────────────────────────────────────────

const { init } = require("../../../src/init");

// ── Test helpers ──────────────────────────────────────────────────────────────

/**
 * Creates two temporary directories — one for the project root and one for the
 * home directory — so that every file write in init() is isolated to tmp dirs.
 * Returns helpers for reading the most common output files.
 */
function createTmpWorkspace() {
  const root    = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-init-test-project-"));
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-init-test-home-"));

  return {
    projectRoot: root,
    homeDir,

    /** Absolute path to a file under the project root. */
    file(...segments) {
      return path.join(root, ...segments);
    },

    /** Absolute path to a file under the fake home dir. */
    homeFile(...segments) {
      return path.join(homeDir, ...segments);
    },

    /** Read a file from the project root (utf8). */
    read(...segments) {
      return fs.readFileSync(path.join(root, ...segments), "utf8");
    },

    /** Read a file from the fake home dir (utf8). */
    readHome(...segments) {
      return fs.readFileSync(path.join(homeDir, ...segments), "utf8");
    },

    /** True if file exists under project root. */
    exists(...segments) {
      return fs.existsSync(path.join(root, ...segments));
    },

    /** True if file exists under fake home dir. */
    homeExists(...segments) {
      return fs.existsSync(path.join(homeDir, ...segments));
    },

    /** Return a sorted list of skill dir names installed under .claude/skills/. */
    installedSkills() {
      const skillsDir = path.join(root, ".claude", "skills");
      if (!fs.existsSync(skillsDir)) return [];
      return fs.readdirSync(skillsDir).sort();
    },

    /** Clean up both tmp directories. */
    cleanup() {
      fs.rmSync(root,    { recursive: true, force: true });
      fs.rmSync(homeDir, { recursive: true, force: true });
    },
  };
}

/**
 * Creates a fake prompt that returns the supplied answers in order.
 * Any question beyond the supplied answers receives an empty string (i.e., Enter).
 *
 * @param {string[]} answers - Ordered answer strings, one per ask() call.
 * @returns {{ ask: () => Promise<string>, close: () => void }}
 */
function makePrompt(answers) {
  const queue = [...answers];
  return {
    ask:   () => Promise.resolve(queue.shift() ?? ""),
    close: () => {},
  };
}

// ── MCP fakes ─────────────────────────────────────────────────────────────────

/** No MCP client config files found on the machine. */
const noClients    = () => [];

/** At least one MCP client config file was found and exists. */
const hasClients   = () => [{ exists: true, configPath: "/fake/.claude.json" }];

/** No-op server registration (real registration writes JSON files we don't need here). */
const noopRegister = () => {};

// ── Skill sets (verified against manifest.json on disk) ───────────────────────

const DESIGN_SYSTEM_SKILLS = [
  "figma",
  "tokens",
  "sync-to-figma",
  "drift-report",
  "check-parity",
  "contract-query",
];

const HYPOTHESIS_VALIDATION_SKILLS = [
  "hypothesis",
  "measure",
  "experiment",
  "evidence",
  "hermes",
  "init-experiment",
  "growth-audit",
  "write-variants",
  "close-experiment",
];

// ── Test suite ────────────────────────────────────────────────────────────────

describe("systemix init — acceptance tests", () => {
  let ws;

  beforeEach(() => {
    ws = createTmpWorkspace();
  });

  afterEach(() => {
    ws.cleanup();
  });

  // ── AC-WS: Walking skeleton ────────────────────────────────────────────────
  // This is the FIRST scenario — it is enabled. All others are skipped.

  it(
    // Given a clean project root with no prior Systemix config
    // When init is run with both surfaces, no credentials, and no MCP clients detected
    // Then all 15 skill dirs, contract dirs, YAML, gitignore, and home config are created correctly
    "AC-WS (walking skeleton): both surfaces, skip all credentials — skill dirs, contract dirs, trust tier 0, gitignore, and MCP fallback snippet all correct",
    async () => {
      // Given
      const prompt = makePrompt([
        "",  // Q1: surface — Enter = "3" = both
        "",  // Q2: Figma URL — Enter = skip
        "",  // Q3: Figma PAT — Enter = skip
        "",  // Q4: PostHog key — Enter = skip
        "",  // Q5: autonomy — Enter = "2" = balanced
        "",  // Q6: self-improvement — Enter = "2" = audit
      ]);

      // Capture console.log output to assert on the MCP fallback snippet
      const logLines = [];
      const origLog  = console.log;
      console.log    = (...args) => logLines.push(args.join(" "));

      // When
      try {
        await init({
          projectRoot:    ws.projectRoot,
          homeDir:        ws.homeDir,
          prompt,
          detectClients:  noClients,
          registerServer: noopRegister,
        });
      } finally {
        console.log = origLog;
      }

      // Then — all 15 skill dirs exist under .claude/skills/
      const installed = ws.installedSkills();
      for (const skill of [...DESIGN_SYSTEM_SKILLS, ...HYPOTHESIS_VALIDATION_SKILLS]) {
        expect(installed).toContain(skill);
      }

      // Then — the design/ folder is scaffolded (the design-system-as-object)
      expect(ws.exists("design", "DESIGN.md")).toBe(true);
      expect(ws.exists("design", "guardrails.mdx")).toBe(true);
      expect(ws.exists("design", "tokens.css")).toBe(true);
      expect(ws.exists("design", "decisions")).toBe(true);
      expect(ws.exists("design", "goals")).toBe(true);

      // Then — design/meta/ exists because siMode=audit (not off)
      expect(ws.exists("design", "meta")).toBe(true);

      // Then — systemix.config.yaml exists and contains trust tier config
      expect(ws.exists("systemix.config.yaml")).toBe(true);
      const yaml = ws.read("systemix.config.yaml");
      expect(yaml).toContain("orchestrator_tier: 0");
      expect(yaml).toContain("hermes_tier: 0");

      // Then — surfaces list contains design-system, landing, onboarding (not "both")
      expect(yaml).toContain("- design-system");
      expect(yaml).toContain("- landing");
      expect(yaml).toContain("- onboarding");

      // Then — .gitignore contains all three systemix runtime entries
      expect(ws.exists(".gitignore")).toBe(true);
      const gitignore = ws.read(".gitignore");
      expect(gitignore).toContain(".systemix/handoffs/");
      expect(gitignore).toContain(".systemix/cache/");
      expect(gitignore).toContain(".systemix/runs/");

      // Then — no project-context.json (Figma key was skipped)
      expect(ws.exists(".systemix", "project-context.json")).toBe(false);

      // Then — no systemix.json figma block (key was skipped)
      expect(ws.exists(".systemix", "systemix.json")).toBe(false);

      // Then — ~/.systemix/config.json was written to the tmp homeDir
      expect(ws.homeExists(".systemix", "config.json")).toBe(true);

      // Then — MCP fallback snippet was printed (no clients found)
      const allOutput = logLines.join("\n");
      expect(allOutput).toContain("No MCP client config found");
      expect(allOutput).toContain('"systemix-mcp":');
    }
  );

  // ── AC-01a: Surface selection — design-system only ────────────────────────

  it(
    // Given the user selects surface "1" (design-system only) and skips all credentials
    // When init completes
    // Then exactly the 6 design-system skill dirs are installed, no hypothesis dirs
    "AC-01a (surface selection): design-system only — exactly 6 skill dirs, no hypothesis dirs",
    async () => {
      // Given
      const prompt = makePrompt([
        "1",  // Q1: design-system only
        "",   // Q2: Figma URL — skip
        "",   // Q3: Figma PAT — skip
        "",   // Q5: autonomy — balanced
        "",   // Q6: SI — audit
      ]);

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then — exactly the 6 design-system skills exist
      const installed = ws.installedSkills();
      for (const skill of DESIGN_SYSTEM_SKILLS) {
        expect(installed).toContain(skill);
      }

      // Then — no hypothesis-validation skills installed
      for (const skill of HYPOTHESIS_VALIDATION_SKILLS) {
        expect(installed).not.toContain(skill);
      }
    }
  );

  // ── AC-01b: Surface selection — hypothesis-validation only ────────────────

  it(
    // Given the user selects surface "2" (hypothesis-validation only) and skips PostHog key
    // When init completes
    // Then exactly the 9 hypothesis-validation skill dirs are installed, no design-system dirs
    "AC-01b (surface selection): hypothesis-validation only — exactly 9 skill dirs, no design-system dirs",
    async () => {
      // Given
      const prompt = makePrompt([
        "2",  // Q1: hypothesis-validation only
        "",   // Q4: PostHog key — skip
        "",   // Q5: autonomy — balanced
        "",   // Q6: SI — audit
      ]);

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then — exactly the 9 hypothesis-validation skills exist
      const installed = ws.installedSkills();
      for (const skill of HYPOTHESIS_VALIDATION_SKILLS) {
        expect(installed).toContain(skill);
      }

      // Then — no design-system skills installed
      for (const skill of DESIGN_SYSTEM_SKILLS) {
        expect(installed).not.toContain(skill);
      }
    }
  );

  // ── AC-01c: Surfaces YAML — hypothesis-validation choice writes [landing, onboarding] ──

  it(
    // Given the user selects surface "2" (hypothesis-validation only)
    // When init writes systemix.config.yaml
    // Then the surfaces list contains "landing" and "onboarding", not "hypothesis-validation"
    "AC-01c (surfaces YAML): hypothesis-validation choice writes [landing, onboarding] in YAML, not [hypothesis-validation]",
    async () => {
      // Given
      const prompt = makePrompt([
        "2",  // Q1: hypothesis-validation only
        "",   // Q4: PostHog key — skip
        "",   // Q5: autonomy — balanced
        "",   // Q6: SI — audit
      ]);

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then
      const yaml = ws.read("systemix.config.yaml");
      expect(yaml).toContain("- landing");
      expect(yaml).toContain("- onboarding");
      expect(yaml).not.toContain("- hypothesis-validation");
    }
  );

  // ── AC-02a: Figma key — full URL extracts file key ────────────────────────

  it(
    // Given the user pastes a full figma.com/design URL containing the file key
    // When init processes the Figma URL question
    // Then project-context.json contains the extracted fileKey and systemix.json has figma.fileKey
    "AC-02a (figma key): full figma.com/design URL extracts file key and writes project-context.json",
    async () => {
      // Given
      const prompt = makePrompt([
        "1",                                                           // Q1: design-system only
        "https://www.figma.com/design/h1m7dfFILe1wGSfxwQ6U02/MyDS",  // Q2: full Figma URL
        "",                                                            // Q3: PAT — skip
        "",                                                            // Q5: autonomy — balanced
        "",                                                            // Q6: SI — audit
      ]);

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then — project-context.json contains the extracted fileKey
      expect(ws.exists(".systemix", "project-context.json")).toBe(true);
      const ctx = JSON.parse(ws.read(".systemix", "project-context.json"));
      expect(ctx.fileKey).toBe("h1m7dfFILe1wGSfxwQ6U02");

      // Then — systemix.json has the figma.fileKey field
      expect(ws.exists(".systemix", "systemix.json")).toBe(true);
      const sx = JSON.parse(ws.read(".systemix", "systemix.json"));
      expect(sx.figma.fileKey).toBe("h1m7dfFILe1wGSfxwQ6U02");
    }
  );

  // ── AC-02b: Figma key — bare key accepted ─────────────────────────────────

  it(
    // Given the user enters a bare Figma file key (no URL)
    // When init processes the Figma URL question
    // Then project-context.json contains the fileKey without re-prompting
    "AC-02b (figma key): bare key accepted without re-prompting",
    async () => {
      // Given
      const prompt = makePrompt([
        "1",                      // Q1: design-system only
        "h1m7dfFILe1wGSfxwQ6U02", // Q2: bare key
        "",                       // Q3: PAT — skip
        "",                       // Q5: autonomy — balanced
        "",                       // Q6: SI — audit
      ]);

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then
      expect(ws.exists(".systemix", "project-context.json")).toBe(true);
      const ctx = JSON.parse(ws.read(".systemix", "project-context.json"));
      expect(ctx.fileKey).toBe("h1m7dfFILe1wGSfxwQ6U02");
    }
  );

  // ── AC-02c: Figma key — invalid input loops then Enter skips ──────────────

  it(
    // Given the user first enters an invalid URL then presses Enter to skip
    // When init processes the Figma URL question
    // Then no project-context.json is created (skip took effect after retry)
    "AC-02c (figma key): invalid input loops then Enter skips — no project-context.json created",
    async () => {
      // Given — first answer is an invalid non-Figma URL; second is Enter (skip)
      const prompt = makePrompt([
        "1",                             // Q1: design-system only
        "https://www.notion.so/mypage",  // Q2a: invalid URL — should trigger re-prompt
        "",                              // Q2b: Enter to skip after invalid
        "",                              // Q3: PAT — skip
        "",                              // Q5: autonomy — balanced
        "",                              // Q6: SI — audit
      ]);

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then — no project-context.json because the key was ultimately skipped
      expect(ws.exists(".systemix", "project-context.json")).toBe(false);
    }
  );

  // ── AC-03a: Idempotency — existing config preserved on re-run ─────────────

  it(
    // Given init was already run once with conservative autonomy
    // When init is run again with balanced autonomy but without --reconfigure
    // Then systemix.config.yaml still contains "autonomy: conservative" from the first run
    "AC-03a (idempotency): re-running init without --reconfigure preserves existing systemix.config.yaml",
    async () => {
      // Given — first run: conservative autonomy
      const firstPrompt = makePrompt(["", "", "", "", "1", ""]);
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt:         firstPrompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });
      expect(ws.read("systemix.config.yaml")).toContain("autonomy: ghost");

      // When — second run: balanced autonomy, no reconfigure flag
      const secondPrompt = makePrompt(["", "", "", "", "2", ""]);
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt:         secondPrompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then — still conservative (second run did not overwrite)
      expect(ws.read("systemix.config.yaml")).toContain("autonomy: ghost");
    }
  );

  // ── AC-03b: Reconfigure — flag forces overwrite ────────────────────────────

  it(
    // Given init was already run once with conservative autonomy
    // When init is run again with opts.reconfigure = true and balanced autonomy
    // Then systemix.config.yaml contains "autonomy: balanced" after the second run
    "AC-03b (reconfigure): --reconfigure flag overwrites systemix.config.yaml",
    async () => {
      // Given — first run: conservative autonomy
      const firstPrompt = makePrompt(["", "", "", "", "1", ""]);
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt:         firstPrompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });
      expect(ws.read("systemix.config.yaml")).toContain("autonomy: ghost");

      // When — second run: reconfigure = true, balanced autonomy
      const secondPrompt = makePrompt(["", "", "", "", "2", ""]);
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt:         secondPrompt,
        detectClients:  noClients,
        registerServer: noopRegister,
        reconfigure:    true,
      });

      // Then — overwritten with balanced
      expect(ws.read("systemix.config.yaml")).toContain("autonomy: assisted");
    }
  );

  // ── AC-04a: Gitignore — entries appended, existing content preserved ───────

  it(
    // Given a .gitignore file already exists with "node_modules/" in it
    // When init runs
    // Then .gitignore still contains "node_modules/" and now also contains all 3 systemix entries
    "AC-04a (gitignore): systemix entries appended to existing .gitignore, existing entries preserved",
    async () => {
      // Given — pre-existing .gitignore
      fs.writeFileSync(ws.file(".gitignore"), "node_modules/\n", "utf8");

      const prompt = makePrompt(["", "", "", "", "", ""]);

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then — original entry preserved
      const gitignore = ws.read(".gitignore");
      expect(gitignore).toContain("node_modules/");

      // Then — all 3 systemix entries added
      expect(gitignore).toContain(".systemix/handoffs/");
      expect(gitignore).toContain(".systemix/cache/");
      expect(gitignore).toContain(".systemix/runs/");
    }
  );

  // ── AC-04b: Gitignore — no duplicate entries on re-run ────────────────────

  it(
    // Given init was run once (systemix entries written)
    // When init is run a second time
    // Then each of the 3 systemix entries appears exactly once in .gitignore
    "AC-04b (gitignore): re-running init does not duplicate gitignore entries",
    async () => {
      // Given — first run
      const firstPrompt = makePrompt(["", "", "", "", "", ""]);
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt:         firstPrompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // When — second run
      const secondPrompt = makePrompt(["", "", "", "", "", ""]);
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt:         secondPrompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then — each entry appears exactly once
      const gitignore = ws.read(".gitignore");
      const lines     = gitignore.split("\n").map((l) => l.trim());
      expect(lines.filter((l) => l === ".systemix/handoffs/")).toHaveLength(1);
      expect(lines.filter((l) => l === ".systemix/cache/")).toHaveLength(1);
      expect(lines.filter((l) => l === ".systemix/runs/")).toHaveLength(1);
    }
  );

  // ── AC-04c: Gitignore — partial entries completed without duplicating ──────

  it(
    // Given .gitignore already contains ".systemix/handoffs/" but not the other two entries
    // When init runs
    // Then ".systemix/handoffs/" appears exactly once, and the other two entries are now present
    "AC-04c (gitignore): partial entries completed without duplicating existing",
    async () => {
      // Given — only one systemix entry pre-written
      fs.writeFileSync(ws.file(".gitignore"), ".systemix/handoffs/\n", "utf8");

      const prompt = makePrompt(["", "", "", "", "", ""]);

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then — handoffs appears exactly once (not duplicated)
      const gitignore = ws.read(".gitignore");
      const lines     = gitignore.split("\n").map((l) => l.trim());
      expect(lines.filter((l) => l === ".systemix/handoffs/")).toHaveLength(1);

      // Then — other two entries were added
      expect(gitignore).toContain(".systemix/cache/");
      expect(gitignore).toContain(".systemix/runs/");
    }
  );

  // ── AC-05a: Trust tier — conservative autonomy ────────────────────────────

  it(
    // Given the user selects autonomy "1" (conservative)
    // When init writes systemix.config.yaml
    // Then YAML contains orchestrator_tier: 0, hermes_tier: 0, and autonomy: conservative
    "AC-05a (trust tier): conservative autonomy produces orchestrator_tier: 0 and hermes_tier: 0",
    async () => {
      // Given
      const prompt = makePrompt(["", "", "", "", "1", ""]);  // autonomy = conservative

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then
      const yaml = ws.read("systemix.config.yaml");
      expect(yaml).toContain("orchestrator_tier: 0");
      expect(yaml).toContain("hermes_tier: 0");
      expect(yaml).toContain("autonomy: ghost");
    }
  );

  // ── AC-05b: Trust tier — progressive autonomy still ghost-mode ────────────

  it(
    // Given the user selects autonomy "3" (progressive)
    // When init writes systemix.config.yaml
    // Then YAML still contains orchestrator_tier: 0 and hermes_tier: 0 (ghost mode at init)
    "AC-05b (trust tier): progressive autonomy still produces orchestrator_tier: 0 and hermes_tier: 0",
    async () => {
      // Given
      const prompt = makePrompt(["", "", "", "", "3", ""]);  // autonomy = progressive

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then
      const yaml = ws.read("systemix.config.yaml");
      expect(yaml).toContain("orchestrator_tier: 0");
      expect(yaml).toContain("hermes_tier: 0");
      expect(yaml).toContain("autonomy: autonomous");
    }
  );

  // ── AC-06a: Self-improvement off — no contract/meta, no meta_contract ──────

  it(
    // Given the user selects self-improvement "1" (off)
    // When init completes
    // Then contract/meta/ does not exist and systemix.config.yaml has no meta_contract key
    "AC-06a (self-improvement off): siMode=off → no contract/meta dir, no meta_contract in YAML",
    async () => {
      // Given
      const prompt = makePrompt(["", "", "", "", "", "1"]);  // SI = off

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then — design/meta/ was not created
      expect(ws.exists("design", "meta")).toBe(false);

      // Then — YAML has no meta_contract line but does have mode: off
      const yaml = ws.read("systemix.config.yaml");
      expect(yaml).not.toContain("meta_contract:");
      expect(yaml).toContain("mode: off");
    }
  );

  // ── AC-06b: Self-improvement audit — contract/meta dir and meta_contract key ─

  it(
    // Given the user selects self-improvement "2" (audit)
    // When init completes
    // Then contract/meta/ exists and systemix.config.yaml contains the meta_contract path
    "AC-06b (self-improvement audit): siMode=audit → contract/meta dir exists and meta_contract in YAML",
    async () => {
      // Given
      const prompt = makePrompt(["", "", "", "", "", "2"]);  // SI = audit

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then — design/meta/ was created
      expect(ws.exists("design", "meta")).toBe(true);

      // Then — YAML contains the meta_contract path
      const yaml = ws.read("systemix.config.yaml");
      expect(yaml).toContain("meta_contract: design/meta/hermes-accuracy.mdx");
    }
  );

  // ── AC-07a: MCP fallback — snippet printed, writes complete ───────────────

  it(
    // Given no MCP client config file is found on the machine
    // When init runs
    // Then the manual snippet is printed to stdout and all expected files are still written
    "AC-07a (MCP fallback): no MCP client found — manual snippet printed, all file writes still complete",
    async () => {
      // Given
      const prompt     = makePrompt(["", "", "", "", "", ""]);
      const logLines   = [];
      const origLog    = console.log;
      console.log      = (...args) => logLines.push(args.join(" "));

      // When
      try {
        await init({
          projectRoot:    ws.projectRoot,
          homeDir:        ws.homeDir,
          prompt,
          detectClients:  noClients,
          registerServer: noopRegister,
        });
      } finally {
        console.log = origLog;
      }

      // Then — fallback snippet was printed
      const allOutput = logLines.join("\n");
      expect(allOutput).toContain("No MCP client config found");
      expect(allOutput).toContain('"systemix-mcp":');

      // Then — file writes still completed despite no MCP client
      expect(ws.exists("systemix.config.yaml")).toBe(true);
      expect(ws.exists(".gitignore")).toBe(true);
    }
  );

  // ── AC-08a: Skip flow — no key → no project-context.json, no systemix.json ─

  it(
    // Given the user selects design-system surface but skips the Figma URL prompt
    // When init completes
    // Then .systemix/project-context.json does not exist and .systemix/systemix.json does not exist
    "AC-08a (skip flow): skipping Figma key leaves no project-context.json and no figma block in systemix.json",
    async () => {
      // Given
      const prompt = makePrompt([
        "1",  // design-system only
        "",   // Figma URL — skip
        "",   // PAT — skip
        "",   // autonomy — balanced
        "",   // SI — audit
      ]);

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then
      expect(ws.exists(".systemix", "project-context.json")).toBe(false);
      expect(ws.exists(".systemix", "systemix.json")).toBe(false);
    }
  );

  // ── AC-08b: Skip flow — key provided → both files written ─────────────────

  it(
    // Given the user provides a bare Figma file key and skips the PAT
    // When init completes
    // Then project-context.json exists with the fileKey and systemix.json has figma.fileKey
    "AC-08b (skip flow): providing a Figma key writes both project-context.json and systemix.json figma block",
    async () => {
      // Given
      const prompt = makePrompt([
        "1",                      // design-system only
        "h1m7dfFILe1wGSfxwQ6U02", // Figma key
        "",                       // PAT — skip
        "",                       // autonomy — balanced
        "",                       // SI — audit
      ]);

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then — project-context.json written with fileKey
      expect(ws.exists(".systemix", "project-context.json")).toBe(true);
      const ctx = JSON.parse(ws.read(".systemix", "project-context.json"));
      expect(ctx.fileKey).toBe("h1m7dfFILe1wGSfxwQ6U02");

      // Then — systemix.json written with figma.fileKey
      expect(ws.exists(".systemix", "systemix.json")).toBe(true);
      const sx = JSON.parse(ws.read(".systemix", "systemix.json"));
      expect(sx.figma.fileKey).toBe("h1m7dfFILe1wGSfxwQ6U02");
    }
  );

  // ── AC-08c: Skip flow — no PAT → no figmaToken in home config ─────────────

  it(
    // Given the user provides a Figma file key but skips the PAT prompt
    // When init writes ~/.systemix/config.json
    // Then the config file does not contain a "figmaToken" key
    "AC-08c (skip flow): skipping PAT means no figmaToken in ~/.systemix/config.json",
    async () => {
      // Given
      const prompt = makePrompt([
        "1",                      // design-system only
        "h1m7dfFILe1wGSfxwQ6U02", // Figma key
        "",                       // PAT — skip
        "",                       // autonomy — balanced
        "",                       // SI — audit
      ]);

      // When
      await init({
        projectRoot:    ws.projectRoot,
        homeDir:        ws.homeDir,
        prompt,
        detectClients:  noClients,
        registerServer: noopRegister,
      });

      // Then — home config exists but has no figmaToken key
      expect(ws.homeExists(".systemix", "config.json")).toBe(true);
      const cfg = JSON.parse(ws.readHome(".systemix", "config.json"));
      expect(cfg).not.toHaveProperty("figmaToken");
    }
  );
});
