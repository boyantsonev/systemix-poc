"use strict";

/**
 * Acceptance tests — atlas-build (Atlas Phase-2 generator)
 *
 * Walking skeleton strategy: C — real filesystem (tmp directory). No external services.
 * Driving port: atlasBuild.build({ projectRoot }) → { catalog, written }
 *   - catalog implements the WorkflowCatalog port: all() / byPersona() / byId()
 *   - writes .systemix/atlas.catalog.json (the artifact consumed by the renderer)
 *
 * AC coverage (docs/feature/atlas-phase-2/discuss/wave-decisions.md):
 *   AC-1  Walking skeleton — one valid contract → catalog with all()/byPersona()/byId()
 *   AC-2  Vocab validation — unknown persona/surface/agent or bad kind/pattern → file-scoped error
 *   AC-4  Empty state — no atlas: block OR no contracts → empty catalog, no crash
 *   AC-5  Malformed contract — broken frontmatter / missing required field → file-scoped error
 *   AC-6  Idempotent — two builds → byte-identical artifact
 */

const fs   = require("fs");
const os   = require("os");
const path = require("path");

const atlasBuild = require("../../../src/commands/atlas");

// ── Test workspace ────────────────────────────────────────────────────────────

const FULL_CONFIG_ATLAS = `version: 1
surfaces:
  - design-system
signals:
  posthog:
    enabled: true
hermes:
  model: hermes3
self_improvement:
  mode: audit
trust:
  orchestrator_tier: 0
  hermes_tier: 0
atlas:
  personas:
    - founder
    - designer
    - engineer
  agents:
    hermes:
      label: Hermes
    flux:
      label: Flux
  surfaces:
    - phone
    - tablet
    - desktop
`;

const CONFIG_NO_ATLAS = `version: 1
surfaces:
  - design-system
signals:
  posthog:
    enabled: true
hermes:
  model: hermes3
self_improvement:
  mode: audit
trust:
  orchestrator_tier: 0
  hermes_tier: 0
`;

const FOUNDER_LOOP_CONTRACT = `---
id: founder-loop
persona: founder
title: The loop
pattern: chain
surface: desktop
problem: "Ship a hypothesis, read the signals, close the loop."
steps:
  - { id: define, label: Define hypothesis, kind: input, note: Write the claim }
  - { id: hermes, label: Hermes synthesis, kind: agent, agent: hermes, note: Evidence → recommendation, screen: /queue }
  - { id: next, label: Next experiment, kind: output, note: Starts from known ground }
edges:
  - { from: define, to: hermes }
  - { from: hermes, to: next }
---

# The loop
`;

function createTmpWorkspace() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-atlas-build-test-"));
  const workflowsDir = path.join(root, "contract", "workflows");
  fs.mkdirSync(workflowsDir, { recursive: true });
  fs.mkdirSync(path.join(root, ".systemix"), { recursive: true });

  return {
    root,
    workflowsDir,
    artifactPath: path.join(root, ".systemix", "atlas.catalog.json"),
    writeConfig(content) {
      fs.writeFileSync(path.join(root, "systemix.config.yaml"), content, "utf8");
    },
    writeWorkflow(name, content) {
      fs.writeFileSync(path.join(workflowsDir, `${name}.mdx`), content, "utf8");
    },
    readArtifact() {
      return fs.readFileSync(this.artifactPath, "utf8");
    },
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe("Atlas build — atlas-phase-2 acceptance tests", () => {
  let ws;

  beforeEach(() => {
    ws = createTmpWorkspace();
  });

  afterEach(() => {
    ws.cleanup();
  });

  // ── AC-1: Walking skeleton ──────────────────────────────────────────────────

  it(
    // Given one valid contract/workflows/*.mdx and an atlas: config block
    // When atlas build runs
    // Then it emits a catalog implementing all()/byPersona()/byId() for that workflow
    "AC-1 (walking skeleton): one valid contract builds a catalog implementing the WorkflowCatalog port",
    async () => {
      // Given
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("founder-loop", FOUNDER_LOOP_CONTRACT);

      // When
      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });

      // Then — all() returns the single workflow with full fidelity
      const all = catalog.all();
      expect(all).toHaveLength(1);
      const wf = all[0];
      expect(wf.id).toBe("founder-loop");
      expect(wf.persona).toBe("founder");
      expect(wf.title).toBe("The loop");
      expect(wf.pattern).toBe("chain");
      expect(wf.surface).toBe("desktop");
      expect(wf.problem).toBe("Ship a hypothesis, read the signals, close the loop.");
      expect(wf.steps).toHaveLength(3);
      expect(wf.steps[1]).toEqual({
        id: "hermes",
        label: "Hermes synthesis",
        kind: "agent",
        agent: "hermes",
        note: "Evidence → recommendation",
        screen: "/queue",
      });
      expect(wf.edges).toEqual([
        { from: "define", to: "hermes" },
        { from: "hermes", to: "next" },
      ]);

      // Then — byPersona filters by persona
      expect(catalog.byPersona("founder")).toHaveLength(1);
      expect(catalog.byPersona("engineer")).toHaveLength(0);

      // Then — byId resolves the workflow and misses cleanly
      expect(catalog.byId("founder-loop").title).toBe("The loop");
      expect(catalog.byId("does-not-exist")).toBeUndefined();

      // Then — the artifact was written to .systemix/atlas.catalog.json
      expect(fs.existsSync(ws.artifactPath)).toBe(true);
    }
  );

  // ── AC-2: Vocab validation (open vocab — persona/surface/agent) ─────────────

  it.each([
    [
      "persona",
      FOUNDER_LOOP_CONTRACT.replace("persona: founder", "persona: marketer"),
      "marketer",
    ],
    [
      "surface",
      FOUNDER_LOOP_CONTRACT.replace("surface: desktop", "surface: watch"),
      "watch",
    ],
    [
      "agent",
      FOUNDER_LOOP_CONTRACT.replace("agent: hermes", "agent: gandalf"),
      "gandalf",
    ],
  ])(
    "AC-2: a contract with an undeclared %s is a build error naming the file and the unknown value",
    async (_field, contract, unknownValue) => {
      // Given a contract using a value not declared in the atlas: vocab
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("bad-vocab", contract);

      // When / Then — build rejects with a file-scoped error naming the bad value
      await expect(atlasBuild.build({ projectRoot: ws.root })).rejects.toThrow(
        new RegExp(`bad-vocab\\.mdx.*${unknownValue}`)
      );
    }
  );

  // ── AC-2: Closed enum validation (kind / pattern) ──────────────────────────

  it.each([
    ["pattern", FOUNDER_LOOP_CONTRACT.replace("pattern: chain", "pattern: spiral"), "spiral"],
    [
      "kind",
      FOUNDER_LOOP_CONTRACT.replace("kind: input", "kind: teleport"),
      "teleport",
    ],
  ])(
    "AC-2: a contract with an invalid %s (closed enum) is a file-scoped build error",
    async (_field, contract, badValue) => {
      // Given a contract violating a closed enum
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("bad-enum", contract);

      // When / Then
      await expect(atlasBuild.build({ projectRoot: ws.root })).rejects.toThrow(
        new RegExp(`bad-enum\\.mdx.*${badValue}`)
      );
    }
  );

  // ── AC-4: Empty state ───────────────────────────────────────────────────────

  it(
    // Given a config with NO atlas: block (but contracts exist)
    // When build runs
    // Then the catalog is empty and no artifact crash occurs
    "AC-4: absent atlas: block → empty catalog, no crash",
    async () => {
      // Given
      ws.writeConfig(CONFIG_NO_ATLAS);
      ws.writeWorkflow("founder-loop", FOUNDER_LOOP_CONTRACT);

      // When
      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });

      // Then
      expect(catalog.all()).toEqual([]);
      expect(catalog.byPersona("founder")).toEqual([]);
      expect(catalog.byId("founder-loop")).toBeUndefined();
      expect(fs.existsSync(ws.artifactPath)).toBe(true);
    }
  );

  it(
    // Given an atlas: block but NO contract files
    // When build runs
    // Then the catalog is empty and the artifact is still written
    "AC-4: atlas: block present but no contracts → empty catalog, no crash",
    async () => {
      // Given — config has atlas vocab, but contract/workflows/ is empty
      ws.writeConfig(FULL_CONFIG_ATLAS);

      // When
      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });

      // Then
      expect(catalog.all()).toEqual([]);
      expect(fs.existsSync(ws.artifactPath)).toBe(true);
    }
  );

  // ── AC-5: Malformed contract — file-scoped error, others unaffected ─────────

  it(
    // Given one contract is missing a required field while a sibling is valid
    // When build runs
    // Then build fails with a file-scoped error naming the broken file
    "AC-5: a contract missing a required field fails the build with a file-scoped error",
    async () => {
      // Given — a valid sibling and a broken contract (no `title`)
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("founder-loop", FOUNDER_LOOP_CONTRACT);
      ws.writeWorkflow(
        "broken",
        FOUNDER_LOOP_CONTRACT.replace("title: The loop\n", "")
      );

      // When / Then — the error names the offending file and the missing field
      await expect(atlasBuild.build({ projectRoot: ws.root })).rejects.toThrow(
        /broken\.mdx.*title/
      );
    }
  );

  // ── AC-6: Idempotent ────────────────────────────────────────────────────────

  it(
    // Given the same inputs
    // When build runs twice
    // Then the emitted artifact is byte-identical
    "AC-6: two builds with no input change produce a byte-identical artifact",
    async () => {
      // Given
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("founder-loop", FOUNDER_LOOP_CONTRACT);

      // When
      await atlasBuild.build({ projectRoot: ws.root });
      const first = ws.readArtifact();
      await atlasBuild.build({ projectRoot: ws.root });
      const second = ws.readArtifact();

      // Then
      expect(second).toBe(first);
    }
  );
});
