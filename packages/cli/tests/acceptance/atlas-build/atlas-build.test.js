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
});
