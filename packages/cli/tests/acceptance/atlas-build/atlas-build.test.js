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

// atlas: block present but every vocab field is the WRONG shape (scalars, not
// list/object). readVocab must fall back to empty vocab for each → all contracts
// rejected. Exercises the `Array.isArray(...) ? ... : []` / agents-typeof fallbacks.
const CONFIG_MALFORMED_ATLAS = `version: 1
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
  personas: not-a-list
  agents: not-a-map
  surfaces: not-a-list
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
    async (field, contract, badValue) => {
      // Given a contract violating a closed enum
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("bad-enum", contract);

      // When / Then — the error names the file, the bad value, AND lists the
      // allowed values comma+space separated (kills the `.join(", ")` mutants).
      const allowed =
        field === "pattern"
          ? "chain, routing, parallelization, orchestration"
          : "input, agent, router, parallel, tool, human, output";
      await expect(atlasBuild.build({ projectRoot: ws.root })).rejects.toThrow(
        new RegExp(`bad-enum\\.mdx.*${badValue}`)
      );
      await expect(atlasBuild.build({ projectRoot: ws.root })).rejects.toThrow(
        allowed
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

  // ── AC-1 (strengthened): artifact shape + `written` is the resolved path ─────

  it(
    // Given one valid contract
    // When build runs
    // Then the on-disk artifact has the exact { version: 1, workflows: [...] } shape,
    //  `written` is the resolved artifact path, and `workflows` mirrors catalog.all()
    "AC-1: artifact has { version, workflows } shape; written is the resolved path; no `order` leaks",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("founder-loop", FOUNDER_LOOP_CONTRACT);

      const { catalog, workflows, written } = await atlasBuild.build({
        projectRoot: ws.root,
      });

      // `written` is the resolved absolute artifact path (kills written→null / wrong path)
      expect(written).toBe(ws.artifactPath);
      expect(path.isAbsolute(written)).toBe(true);

      // Returned `workflows` is exactly the catalog contents
      expect(workflows).toEqual(catalog.all());

      // On-disk top-level shape is exactly { version: 1, workflows: [...] }
      const artifact = JSON.parse(ws.readArtifact());
      expect(Object.keys(artifact).sort()).toEqual(["version", "workflows"].sort());
      expect(artifact.version).toBe(1);
      expect(Array.isArray(artifact.workflows)).toBe(true);
      expect(artifact.workflows).toHaveLength(1);

      // The serialized workflow carries no build-time `order` hint
      const serialized = artifact.workflows[0];
      expect(serialized).not.toHaveProperty("order");
      expect(serialized.id).toBe("founder-loop");
      // problem default is "" only when absent; here it is the authored string
      expect(serialized.problem).toBe(
        "Ship a hypothesis, read the signals, close the loop."
      );
    }
  );

  it(
    // Given a valid contract that omits the optional `problem` field
    // When build runs
    // Then `problem` defaults to an empty string (not undefined / not omitted)
    "AC-1: a contract without `problem` defaults problem to empty string",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow(
        "no-problem",
        FOUNDER_LOOP_CONTRACT.replace(/^id: founder-loop$/m, "id: no-problem").replace(
          /^problem: .*$/m,
          ""
        )
      );

      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });
      const wf = catalog.byId("no-problem");
      expect(wf).toBeDefined();
      expect(wf.problem).toBe("");
    }
  );

  // ── Closed enums: every valid pattern and step kind round-trips ─────────────

  it.each([["chain"], ["routing"], ["parallelization"], ["orchestration"]])(
    "AC-2: pattern %s is accepted and preserved verbatim in the catalog",
    async (pattern) => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow(
        "pat",
        FOUNDER_LOOP_CONTRACT.replace("pattern: chain", `pattern: ${pattern}`)
      );

      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });
      expect(catalog.byId("founder-loop").pattern).toBe(pattern);
    }
  );

  it.each([
    ["input"],
    ["agent"],
    ["router"],
    ["parallel"],
    ["tool"],
    ["human"],
    ["output"],
  ])(
    "AC-2: step kind %s is accepted and preserved verbatim in the catalog",
    async (kind) => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      // A minimal single-step contract using the kind under test.
      const contract = `---
id: kind-${kind}
persona: founder
title: Kind probe
pattern: chain
surface: desktop
steps:
  - { id: only, label: Only step, kind: ${kind}, note: probe }
edges:
  - { from: only, to: only }
---

# probe
`;
      ws.writeWorkflow("kind", contract);

      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });
      const wf = catalog.byId(`kind-${kind}`);
      expect(wf).toBeDefined();
      expect(wf.steps[0].kind).toBe(kind);
    }
  );

  // ── Optional step/edge fields: present → kept, absent → omitted ─────────────

  it(
    // Given a step with no agent/screen and an edge with no label
    // When build runs
    // Then those optional keys are absent (not present-as-undefined) in the catalog
    "AC-1: optional step fields (agent/screen) and edge label are OMITTED when absent",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("founder-loop", FOUNDER_LOOP_CONTRACT);
      // founder-loop's `define` step has no agent/screen; its edges have no label.
      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });
      const wf = catalog.byId("founder-loop");

      const defineStep = wf.steps[0];
      expect(defineStep.id).toBe("define");
      expect(defineStep).not.toHaveProperty("agent");
      expect(defineStep).not.toHaveProperty("screen");
      // exact shape of a no-optional step
      expect(defineStep).toEqual({
        id: "define",
        label: "Define hypothesis",
        kind: "input",
        note: "Write the claim",
      });

      for (const edge of wf.edges) {
        expect(edge).not.toHaveProperty("label");
      }
    }
  );

  it(
    // Given an edge that declares a label
    // When build runs
    // Then the edge label is preserved on the emitted edge
    "AC-1: an edge with a label preserves it in the catalog",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow(
        "founder-loop",
        FOUNDER_LOOP_CONTRACT.replace(
          "{ from: define, to: hermes }",
          "{ from: define, to: hermes, label: go }"
        )
      );

      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });
      const edge = catalog.byId("founder-loop").edges[0];
      expect(edge).toEqual({ from: "define", to: "hermes", label: "go" });
    }
  );

  it(
    // Given a step whose required `note` is an EMPTY STRING (present but blank)
    // When build runs
    // Then it is treated as missing and rejected (kills the `=== ""` branch)
    "AC-5: a step required field that is an empty string is treated as missing",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const contract = `---
id: blank-note
persona: founder
title: Blank note
pattern: chain
surface: desktop
steps:
  - { id: a, label: A, kind: input, note: "" }
edges:
  - { from: a, to: a }
---
`;
      ws.writeWorkflow("blank-note", contract);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/blank-note\.mdx.*"note"/);
    }
  );

  it(
    // Given a top-level required field that is an EMPTY STRING (title: "")
    // When build runs
    // Then it is treated as missing (kills the `=== ""` branch at the top level)
    "AC-5: a top-level required field that is an empty string is treated as missing",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const contract = `---
id: blank-title
persona: founder
title: ""
pattern: chain
surface: desktop
steps:
  - { id: a, label: A, kind: input, note: n }
edges:
  - { from: a, to: a }
---
`;
      ws.writeWorkflow("blank-title", contract);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/blank-title\.mdx.*"title"/);
    }
  );

  it(
    // Given steps is an EMPTY LIST
    // When build runs
    // Then the empty-array branch of required-field validation rejects it
    "AC-5: an empty steps list is treated as a missing required field",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const contract = `---
id: empty-steps
persona: founder
title: Empty steps
pattern: chain
surface: desktop
steps: []
edges:
  - { from: a, to: a }
---
`;
      ws.writeWorkflow("empty-steps", contract);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/empty-steps\.mdx.*"steps"/);
    }
  );

  it(
    // Given an empty `agent`/`screen` on a step and an empty edge `label`
    // When build runs
    // Then they are treated as absent: agent="" is NOT validated against vocab,
    //  and agent/screen/label keys are OMITTED (kills the `=== ""` optional branches)
    "AC-1: empty-string optional fields (agent/screen/label) are treated as absent and omitted",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const contract = `---
id: blank-optionals
persona: founder
title: Blank optionals
pattern: chain
surface: desktop
steps:
  - { id: a, label: A, kind: agent, note: n, agent: "", screen: "" }
edges:
  - { from: a, to: a, label: "" }
---
`;
      ws.writeWorkflow("blank-optionals", contract);

      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });
      const wf = catalog.byId("blank-optionals");
      expect(wf).toBeDefined();
      // empty agent string was NOT rejected as "unknown agent" → treated as absent
      const step = wf.steps[0];
      expect(step).not.toHaveProperty("agent");
      expect(step).not.toHaveProperty("screen");
      expect(wf.edges[0]).not.toHaveProperty("label");
    }
  );

  it(
    // Given null optional fields (agent: null / screen: null on a step, label: null
    //  on an edge)
    // When build runs
    // Then they are treated as absent and OMITTED — and agent: null is NOT validated
    //  against the agent vocab (kills the `!== null` optional guards distinctly)
    "AC-1: null optional fields (agent/screen/label) are treated as absent and omitted",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const contract = `---
id: null-optionals
persona: founder
title: Null optionals
pattern: chain
surface: desktop
steps:
  - { id: a, label: A, kind: agent, note: n, agent: null, screen: null }
edges:
  - { from: a, to: a, label: null }
---
`;
      ws.writeWorkflow("null-optionals", contract);

      // agent: null must NOT be rejected as an "unknown agent" → build succeeds.
      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });
      const wf = catalog.byId("null-optionals");
      expect(wf).toBeDefined();
      const step = wf.steps[0];
      expect(step).not.toHaveProperty("agent");
      expect(step).not.toHaveProperty("screen");
      expect(wf.edges[0]).not.toHaveProperty("label");
    }
  );

  it(
    // Given an edge that is null (a bare `-` list item)
    // When build runs
    // Then build rejects with the from/to AtlasBuildError (not a raw TypeError) —
    //  kills the `!raw || typeof raw !== "object"` guard in normaliseEdge
    "AC-5: a null edge is rejected with the from/to message, not a crash",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const contract = `---
id: null-edge
persona: founder
title: Null edge
pattern: chain
surface: desktop
steps:
  - { id: a, label: A, kind: input, note: n }
edges:
  -
---
`;
      ws.writeWorkflow("null-edge", contract);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/null-edge\.mdx.*"from" and "to"/);
    }
  );

  it(
    // Given a non-.mdx file sits alongside a valid contract
    // When build runs
    // Then the non-.mdx file is ignored (kills the `.endsWith(".mdx")` filter)
    "discovery: non-.mdx files in contract/workflows are ignored",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("founder-loop", FOUNDER_LOOP_CONTRACT);
      // A stray markdown/readme file that would FAIL parsing if it were read.
      fs.writeFileSync(
        path.join(ws.workflowsDir, "README.md"),
        "not a contract at all",
        "utf8"
      );

      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });
      expect(catalog.all().map((w) => w.id)).toEqual(["founder-loop"]);
    }
  );

  // ── Step structural validation (AC-5, per-field) ────────────────────────────

  it.each([["id"], ["label"], ["kind"], ["note"]])(
    "AC-5: a step missing required field %s fails with an error naming the file and field",
    async (field) => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      // Drop one required key from the first step.
      const fullStep =
        "{ id: define, label: Define hypothesis, kind: input, note: Write the claim }";
      const dropped = {
        id: "{ label: Define hypothesis, kind: input, note: Write the claim }",
        label: "{ id: define, kind: input, note: Write the claim }",
        kind: "{ id: define, label: Define hypothesis, note: Write the claim }",
        note: "{ id: define, label: Define hypothesis, kind: input }",
      }[field];
      ws.writeWorkflow(
        "broken-step",
        FOUNDER_LOOP_CONTRACT.replace(fullStep, dropped)
      );

      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(new RegExp(`broken-step\\.mdx.*"${field}"`));
    }
  );

  it(
    // Given a step required field explicitly null (note: null)
    // When build runs
    // Then it is treated as missing (kills the step-field `=== null` branch)
    "AC-5: a step required field explicitly null is treated as missing",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const contract = `---
id: null-step-note
persona: founder
title: Null step note
pattern: chain
surface: desktop
steps:
  - { id: a, label: A, kind: input, note: null }
edges:
  - { from: a, to: a }
---
`;
      ws.writeWorkflow("null-step-note", contract);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/null-step-note\.mdx.*"note"/);
    }
  );

  it(
    // Given a step whose own `id` is missing
    // When build runs
    // Then the error uses the "?" placeholder for the unknown step id
    //  (kills the `raw.id ?? "?"` fallback in the step error message)
    "AC-5: a step missing its own id reports the missing field with a '?' placeholder",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const contract = `---
id: no-step-id
persona: founder
title: No step id
pattern: chain
surface: desktop
steps:
  - { label: A, kind: input, note: n }
edges:
  - { from: a, to: a }
---
`;
      ws.writeWorkflow("no-step-id", contract);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/no-step-id\.mdx.*step "\?".*"id"/);
    }
  );

  it(
    // Given an edge that is a bare scalar (not a map)
    // When build runs
    // Then build rejects with the from/to requirement (kills the `!raw`/typeof
    //  guard in normaliseEdge)
    "AC-5: a non-map edge is rejected naming the file and the from/to requirement",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const contract = `---
id: scalar-edge
persona: founder
title: Scalar edge
pattern: chain
surface: desktop
steps:
  - { id: a, label: A, kind: input, note: n }
edges:
  - just-a-string
---
`;
      ws.writeWorkflow("scalar-edge", contract);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/scalar-edge\.mdx.*"from" and "to"/);
    }
  );

  it(
    // Given a step that is a bare scalar (not a map)
    // When build runs
    // Then build rejects, naming the file and the map requirement
    "AC-5: a non-map step is rejected naming the file",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const contract = `---
id: scalar-step
persona: founder
title: Scalar step
pattern: chain
surface: desktop
steps:
  - just-a-string
edges:
  - { from: a, to: b }
---
`;
      ws.writeWorkflow("scalar-step", contract);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/scalar-step\.mdx.*map with id\/label\/kind\/note/);
    }
  );

  // ── Edge structural validation (AC-5) ───────────────────────────────────────

  it.each([
    ["from", "{ to: hermes }"],
    ["to", "{ from: define }"],
  ])(
    "AC-5: an edge missing %s is rejected naming the file and the from/to requirement",
    async (_missing, brokenEdge) => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow(
        "broken-edge",
        FOUNDER_LOOP_CONTRACT.replace("{ from: define, to: hermes }", brokenEdge)
      );

      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/broken-edge\.mdx.*"from" and "to"/);
    }
  );

  // ── steps / edges must be lists (AC-5) ──────────────────────────────────────

  it.each([
    ["steps", /broken-list\.mdx.*"steps" must be a list/],
    ["edges", /broken-list\.mdx.*"edges" must be a list/],
  ])(
    "AC-5: a contract whose %s is not a list is a file-scoped error",
    async (field, expected) => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      // Replace the block field with a scalar so it parses as a string, not array.
      // Build a contract where `field` is a scalar value.
      const base = {
        id: "broken-list",
        persona: "founder",
        title: "Broken list",
        pattern: "chain",
        surface: "desktop",
        steps:
          field === "steps"
            ? "not-a-list"
            : "\n  - { id: a, label: A, kind: input, note: n }",
        edges:
          field === "edges"
            ? "not-a-list"
            : "\n  - { from: a, to: a }",
      };
      const contract = `---
id: ${base.id}
persona: ${base.persona}
title: ${base.title}
pattern: ${base.pattern}
surface: ${base.surface}
steps: ${base.steps}
edges: ${base.edges}
---
`;
      ws.writeWorkflow("broken-list", contract);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(expected);
    }
  );

  // ── AC-5 (strengthened): the missing-field error names the field, per field ─

  it.each([["id"], ["persona"], ["title"], ["pattern"], ["surface"]])(
    "AC-5: a contract missing top-level field %s names the file and that field",
    async (field) => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow(
        "missing-top",
        FOUNDER_LOOP_CONTRACT.replace(
          new RegExp(`^${field}: .*$`, "m"),
          ""
        ).replace(/^id: founder-loop$/m, field === "id" ? "" : "id: missing-top")
      );

      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(new RegExp(`missing-top|founder-loop|\\.mdx`));
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(new RegExp(`"${field}"`));
    }
  );

  it(
    // Given a contract whose frontmatter is empty (no fields at all)
    // When build runs
    // Then build rejects naming the file with the missing-id message
    "AC-5: a contract with empty frontmatter is rejected naming the file",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("empty-fm", `---\n---\n\n# nothing\n`);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/empty-fm\.mdx.*(missing required field|empty or malformed)/);
    }
  );

  it(
    // Given a contract whose frontmatter is a YAML SCALAR (not a map)
    // When build runs
    // Then build rejects with the "empty or malformed" message (kills the
    //  `!data || typeof data !== "object"` guard)
    "AC-5: frontmatter that is a scalar (non-object) is rejected as malformed",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("scalar-fm", `---\njust a bare string\n---\n\n# x\n`);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/scalar-fm\.mdx.*empty or malformed/);
    }
  );

  it(
    // Given a contract whose frontmatter is NOT valid YAML
    // When build runs
    // Then build rejects with the "not valid YAML" message (kills the parse catch)
    "AC-5: frontmatter that is invalid YAML is rejected naming the file",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("bad-yaml", `---\nid: [unclosed\n---\n\n# x\n`);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/bad-yaml\.mdx.*not valid YAML/);
    }
  );

  it(
    // Given a required field explicitly set to null (title: null)
    // When build runs
    // Then it is treated as missing (kills the `value === null` branch)
    "AC-5: a required field explicitly null is treated as missing",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const contract = `---
id: null-title
persona: founder
title: null
pattern: chain
surface: desktop
steps:
  - { id: a, label: A, kind: input, note: n }
edges:
  - { from: a, to: a }
---
`;
      ws.writeWorkflow("null-title", contract);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/null-title\.mdx.*"title"/);
    }
  );

  it(
    // Given contract/workflows/ does not exist at all
    // When build runs
    // Then the catalog is empty and the artifact is still written (kills the
    //  `: []` fallback when the directory is absent)
    "AC-4: missing contract/workflows directory → empty catalog, artifact written",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      // Remove the workflows dir created by the fixture.
      fs.rmSync(ws.workflowsDir, { recursive: true, force: true });

      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });
      expect(catalog.all()).toEqual([]);
      expect(fs.existsSync(ws.artifactPath)).toBe(true);
      expect(JSON.parse(ws.readArtifact())).toEqual({ version: 1, workflows: [] });
    }
  );

  // ── Ordering: `order` sorts then id; absent order sorts last ────────────────

  it(
    // Given three contracts with explicit order 2, 1 and one with no order
    // When build runs
    // Then catalog is [order:1, order:2, no-order]; ties break by id; order is stripped
    "ordering: workflows sort by `order` then id, absent order sorts last, order is stripped",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);

      const make = (id, orderLine, persona = "founder") => `---
id: ${id}
persona: ${persona}
title: ${id}
pattern: chain
surface: desktop
${orderLine}steps:
  - { id: a, label: A, kind: input, note: n }
edges:
  - { from: a, to: a }
---
`;
      // alpha-order on disk: a-second, b-first, c-none, d-none-z
      ws.writeWorkflow("a-second", make("a-second", "order: 2\n"));
      ws.writeWorkflow("b-first", make("b-first", "order: 1\n"));
      ws.writeWorkflow("c-none", make("c-none", "")); // no order → last
      ws.writeWorkflow("d-none-z", make("d-none-z", "")); // no order → last, after c by id

      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });
      const ids = catalog.all().map((w) => w.id);

      // order:1 first, order:2 next, then the two order-less by id
      expect(ids).toEqual(["b-first", "a-second", "c-none", "d-none-z"]);

      // `order` never leaks into any emitted workflow
      for (const wf of catalog.all()) {
        expect(wf).not.toHaveProperty("order");
      }
    }
  );

  it(
    // Given two contracts with the SAME order value
    // When build runs
    // Then ties break deterministically by id (ascending)
    "ordering: equal `order` values tie-break by id ascending",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const make = (id) => `---
id: ${id}
persona: founder
title: ${id}
pattern: chain
surface: desktop
order: 5
steps:
  - { id: a, label: A, kind: input, note: n }
edges:
  - { from: a, to: a }
---
`;
      ws.writeWorkflow("zeta", make("zeta"));
      ws.writeWorkflow("alpha", make("alpha"));

      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });
      expect(catalog.all().map((w) => w.id)).toEqual(["alpha", "zeta"]);
    }
  );

  it(
    // Given one contract with a NON-NUMBER order (string) and one with a real number
    // When build runs
    // Then the non-number order is treated as absent (sorts last), so the numeric
    //  one comes first (kills the `typeof data.order === "number"` guard)
    "ordering: a non-number `order` is treated as absent (sorts last)",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const make = (id, orderLine) => `---
id: ${id}
persona: founder
title: ${id}
pattern: chain
surface: desktop
${orderLine}steps:
  - { id: a, label: A, kind: input, note: n }
edges:
  - { from: a, to: a }
---
`;
      // `aaa` has a STRING order → must sort AFTER the numeric `zzz`.
      ws.writeWorkflow("aaa", make("aaa", "order: high\n"));
      ws.writeWorkflow("zzz", make("zzz", "order: 1\n"));

      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });
      expect(catalog.all().map((w) => w.id)).toEqual(["zzz", "aaa"]);
    }
  );

  // ── Catalog port: byPersona / byId across multiple personas ─────────────────

  it(
    // Given workflows for two personas
    // When the catalog is queried
    // Then byPersona returns exactly the matching workflows (and [] for a persona
    //  declared in vocab but with zero workflows), byId resolves + misses cleanly
    "catalog: byPersona filters per persona (empty for a persona with no workflows); byId resolves and misses",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      const make = (id, persona) => `---
id: ${id}
persona: ${persona}
title: ${id}
pattern: chain
surface: desktop
steps:
  - { id: a, label: A, kind: input, note: n }
edges:
  - { from: a, to: a }
---
`;
      ws.writeWorkflow("f1", make("f1", "founder"));
      ws.writeWorkflow("f2", make("f2", "founder"));
      ws.writeWorkflow("e1", make("e1", "engineer"));

      const { catalog } = await atlasBuild.build({ projectRoot: ws.root });

      expect(catalog.byPersona("founder").map((w) => w.id).sort()).toEqual([
        "f1",
        "f2",
      ]);
      expect(catalog.byPersona("engineer").map((w) => w.id)).toEqual(["e1"]);
      // `designer` is declared in vocab but has zero workflows
      expect(catalog.byPersona("designer")).toEqual([]);
      // `marketer` is not even in vocab → still []
      expect(catalog.byPersona("marketer")).toEqual([]);

      expect(catalog.byId("e1").persona).toBe("engineer");
      expect(catalog.byId("nope")).toBeUndefined();
    }
  );

  // ── Empty state: no config file at all → empty catalog, artifact still written

  it(
    // Given NO systemix.config.yaml at all (but contracts exist)
    // When build runs
    // Then catalog is empty and the artifact is still emitted
    "AC-4: absent systemix.config.yaml → empty catalog, artifact still written",
    async () => {
      // No writeConfig() call at all.
      ws.writeWorkflow("founder-loop", FOUNDER_LOOP_CONTRACT);

      const { catalog, written } = await atlasBuild.build({
        projectRoot: ws.root,
      });

      expect(catalog.all()).toEqual([]);
      expect(fs.existsSync(ws.artifactPath)).toBe(true);
      expect(written).toBe(ws.artifactPath);

      // The emitted empty artifact still has the canonical shape.
      const artifact = JSON.parse(ws.readArtifact());
      expect(artifact).toEqual({ version: 1, workflows: [] });
    }
  );

  it(
    // Given an atlas: block whose `personas` is a scalar (not a list)
    // When build runs
    // Then readVocab falls back to empty personas → the declared persona is rejected
    //  (kills the `Array.isArray(atlas.personas) ? ... : []` fallback)
    "AC-2: malformed atlas.personas (scalar) → empty persona vocab rejects the persona",
    async () => {
      ws.writeConfig(CONFIG_MALFORMED_ATLAS);
      ws.writeWorkflow("malformed-vocab", FOUNDER_LOOP_CONTRACT);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/malformed-vocab\.mdx.*unknown persona/);
    }
  );

  it(
    // Given valid personas but `surfaces` as a scalar (not a list)
    // When build runs
    // Then the persona check passes and the surface check rejects
    //  (kills the `Array.isArray(atlas.surfaces) ? ... : []` fallback distinctly)
    "AC-2: malformed atlas.surfaces (scalar) → empty surface vocab rejects the surface",
    async () => {
      // Keep personas valid; corrupt only surfaces.
      const cfg = FULL_CONFIG_ATLAS.replace(
        /surfaces:\n    - phone\n    - tablet\n    - desktop/,
        "surfaces: not-a-list"
      );
      ws.writeConfig(cfg);
      ws.writeWorkflow("bad-surfaces", FOUNDER_LOOP_CONTRACT);
      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/bad-surfaces\.mdx.*unknown surface/);
    }
  );

  it(
    // Given a malformed atlas: agents (scalar, not a map) but a step using an agent
    // When build runs
    // Then the agents vocab is empty so the agent reference is rejected
    //  (kills the `typeof atlas.agents === \"object\"` fallback)
    "AC-2: malformed atlas.agents (scalar) → empty agent vocab rejects an agent step",
    async () => {
      // personas/surfaces here ARE valid so we reach the agent check; only agents is bad.
      const cfg = FULL_CONFIG_ATLAS.replace(
        /agents:\n    hermes:\n      label: Hermes\n    flux:\n      label: Flux/,
        "agents: not-a-map"
      );
      ws.writeConfig(cfg);
      ws.writeWorkflow("agent-vocab", FOUNDER_LOOP_CONTRACT);

      await expect(
        atlasBuild.build({ projectRoot: ws.root })
      ).rejects.toThrow(/agent-vocab\.mdx.*unknown agent "hermes"/);
    }
  );

  it(
    // Given a valid build
    // When the artifact is written
    // Then the serialized JSON ends with a trailing newline and is 2-space indented
    //  (kills the `+ "\\n"` and pretty-print mutants in writeArtifact)
    "artifact: serialized JSON is 2-space pretty-printed and ends with a trailing newline",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("founder-loop", FOUNDER_LOOP_CONTRACT);

      await atlasBuild.build({ projectRoot: ws.root });
      const raw = ws.readArtifact();

      expect(raw.endsWith("\n")).toBe(true);
      // 2-space indentation present (pretty-printed, not single-line)
      expect(raw).toMatch(/\n  "version": 1/);
      expect(raw).toContain('\n  "workflows": [');
      // Reparses to the canonical object
      expect(JSON.parse(raw).version).toBe(1);
    }
  );

  // ── CLI presentation: thin coverage of the cli() wrapper ────────────────────

  it(
    // Given an unknown subcommand
    // When the cli() entry is invoked
    // Then it reports an error and exits non-zero (presentation contract)
    "cli: an unknown subcommand reports an error and exits 1",
    async () => {
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const exitSpy = jest
        .spyOn(process, "exit")
        .mockImplementation((code) => {
          throw new Error(`__exit__${code}`);
        });

      try {
        await expect(atlasBuild.atlas(["frobnicate"])).rejects.toThrow(
          "__exit__1"
        );
        expect(errSpy).toHaveBeenCalled();
        // The error text mentions the unknown subcommand
        const errArgs = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
        expect(errArgs).toMatch(/frobnicate/);
      } finally {
        errSpy.mockRestore();
        logSpy.mockRestore();
        exitSpy.mockRestore();
      }
    }
  );

  it(
    // Given a valid project (run from its root via process.cwd)
    // When the cli() build subcommand is invoked
    // Then it logs a success line mentioning the workflow count and does not exit
    "cli: build success logs a success line with the workflow count",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("founder-loop", FOUNDER_LOOP_CONTRACT);

      const cwdSpy = jest.spyOn(process, "cwd").mockReturnValue(ws.root);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = jest
        .spyOn(process, "exit")
        .mockImplementation((code) => {
          throw new Error(`__exit__${code}`);
        });

      try {
        await atlasBuild.atlas(["build"]); // should NOT throw / exit
        expect(exitSpy).not.toHaveBeenCalled();
        const logArgs = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
        expect(logArgs).toMatch(/atlas build/);
        expect(logArgs).toMatch(/1 workflow/);
      } finally {
        cwdSpy.mockRestore();
        logSpy.mockRestore();
        errSpy.mockRestore();
        exitSpy.mockRestore();
      }
    }
  );

  it(
    // Given no subcommand args at all
    // When cli() is invoked
    // Then it defaults to `build` (succeeds, no error/exit) — kills the
    //  `args[0] || "build"` default mutant
    "cli: no args defaults to the build subcommand",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow("founder-loop", FOUNDER_LOOP_CONTRACT);

      const cwdSpy = jest.spyOn(process, "cwd").mockReturnValue(ws.root);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = jest
        .spyOn(process, "exit")
        .mockImplementation((code) => {
          throw new Error(`__exit__${code}`);
        });

      try {
        await atlasBuild.atlas([]); // no args → defaults to "build", must not exit
        expect(exitSpy).not.toHaveBeenCalled();
        expect(errSpy).not.toHaveBeenCalled();
        const logArgs = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
        expect(logArgs).toMatch(/atlas build/);
      } finally {
        cwdSpy.mockRestore();
        logSpy.mockRestore();
        errSpy.mockRestore();
        exitSpy.mockRestore();
      }
    }
  );

  it(
    // Given a project with an invalid contract
    // When the cli() build subcommand is invoked
    // Then it reports an AtlasBuildError and exits 1 (does not rethrow)
    "cli: a build authoring error is reported and exits 1",
    async () => {
      ws.writeConfig(FULL_CONFIG_ATLAS);
      ws.writeWorkflow(
        "bad-vocab",
        FOUNDER_LOOP_CONTRACT.replace("persona: founder", "persona: marketer")
      );

      const cwdSpy = jest.spyOn(process, "cwd").mockReturnValue(ws.root);
      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = jest
        .spyOn(process, "exit")
        .mockImplementation((code) => {
          throw new Error(`__exit__${code}`);
        });

      try {
        await expect(atlasBuild.atlas(["build"])).rejects.toThrow("__exit__1");
        const errArgs = errSpy.mock.calls.map((c) => c.join(" ")).join("\n");
        expect(errArgs).toMatch(/atlas build failed/);
        expect(errArgs).toMatch(/marketer/);
      } finally {
        cwdSpy.mockRestore();
        logSpy.mockRestore();
        errSpy.mockRestore();
        exitSpy.mockRestore();
      }
    }
  );
});
