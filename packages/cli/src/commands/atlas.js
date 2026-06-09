"use strict";

/**
 * npx systemix atlas build
 *
 * Atlas Phase-2 generator. Reads per-instance workflow contracts
 * (contract/workflows/*.mdx), validates them against the `atlas:` vocabulary
 * declared in systemix.config.yaml (+ the closed kind/pattern enums), and emits
 * a catalog artifact (.systemix/atlas.catalog.json) implementing the
 * `WorkflowCatalog` port (all() / byPersona() / byId()).
 *
 * The Systemix `/atlas` renderer loads that artifact instead of a hardcoded
 * TypeScript module — making the surface data-driven with zero visual change.
 */

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const { parseSimpleYaml } = require("../config");

const ARTIFACT_REL = path.join(".systemix", "atlas.catalog.json");
const WORKFLOWS_REL = path.join("contract", "workflows");

// Closed enums — domain-universal, mirrored from src/lib/ports/atlas.ts. These are
// NOT instance vocab: they drive node shape/animation and never change per client.
const PATTERNS = ["chain", "routing", "parallelization", "orchestration"];
const STEP_KINDS = ["input", "agent", "router", "parallel", "tool", "human", "output"];

const REQUIRED_FIELDS = ["id", "persona", "title", "pattern", "surface", "steps", "edges"];

// ── Build error ───────────────────────────────────────────────────────────────

/** A file-scoped authoring error. Names the offending contract file. */
class AtlasBuildError extends Error {
  constructor(file, message) {
    super(`${file}: ${message}`);
    this.name = "AtlasBuildError";
    this.file = file;
  }
}

// ── Vocab ─────────────────────────────────────────────────────────────────────

/** Extract the instance vocabulary from the parsed config's `atlas:` block. */
function readVocab(config) {
  const atlas = config && config.atlas;
  if (!atlas) return null;
  return {
    personas: Array.isArray(atlas.personas) ? atlas.personas : [],
    agents: atlas.agents && typeof atlas.agents === "object" ? Object.keys(atlas.agents) : [],
    surfaces: Array.isArray(atlas.surfaces) ? atlas.surfaces : [],
  };
}

// ── Contract parsing + validation ─────────────────────────────────────────────

/** A single normalised step, with optional fields omitted when absent. */
function normaliseStep(file, raw, vocab) {
  if (!raw || typeof raw !== "object") {
    throw new AtlasBuildError(file, "each step must be a map with id/label/kind/note");
  }
  for (const field of ["id", "label", "kind", "note"]) {
    if (raw[field] === undefined || raw[field] === null || raw[field] === "") {
      throw new AtlasBuildError(file, `step "${raw.id ?? "?"}" is missing required field "${field}"`);
    }
  }
  if (!STEP_KINDS.includes(raw.kind)) {
    throw new AtlasBuildError(file, `step "${raw.id}" has unknown kind "${raw.kind}" (allowed: ${STEP_KINDS.join(", ")})`);
  }
  const step = { id: raw.id, label: raw.label, kind: raw.kind, note: raw.note };
  if (raw.agent !== undefined && raw.agent !== null && raw.agent !== "") {
    if (!vocab.agents.includes(raw.agent)) {
      throw new AtlasBuildError(file, `step "${raw.id}" references unknown agent "${raw.agent}" — declare it under atlas.agents in systemix.config.yaml`);
    }
    step.agent = raw.agent;
  }
  if (raw.screen !== undefined && raw.screen !== null && raw.screen !== "") {
    step.screen = raw.screen;
  }
  return step;
}

/** A single normalised edge. */
function normaliseEdge(file, raw) {
  if (!raw || typeof raw !== "object" || !raw.from || !raw.to) {
    throw new AtlasBuildError(file, "each edge must have both \"from\" and \"to\"");
  }
  const edge = { from: raw.from, to: raw.to };
  if (raw.label !== undefined && raw.label !== null && raw.label !== "") {
    edge.label = raw.label;
  }
  return edge;
}

/** Parse one contract file into a validated, normalised Workflow object. */
function parseContract(file, content, vocab) {
  let data;
  try {
    data = matter(content).data;
  } catch (err) {
    throw new AtlasBuildError(file, `frontmatter is not valid YAML — ${err.message}`);
  }
  if (!data || typeof data !== "object") {
    throw new AtlasBuildError(file, "frontmatter is empty or malformed");
  }

  for (const field of REQUIRED_FIELDS) {
    const value = data[field];
    const missing =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);
    if (missing) {
      throw new AtlasBuildError(file, `missing required field "${field}"`);
    }
  }

  if (!vocab.personas.includes(data.persona)) {
    throw new AtlasBuildError(file, `unknown persona "${data.persona}" — declare it under atlas.personas in systemix.config.yaml`);
  }
  if (!vocab.surfaces.includes(data.surface)) {
    throw new AtlasBuildError(file, `unknown surface "${data.surface}" — declare it under atlas.surfaces in systemix.config.yaml`);
  }
  if (!PATTERNS.includes(data.pattern)) {
    throw new AtlasBuildError(file, `unknown pattern "${data.pattern}" (allowed: ${PATTERNS.join(", ")})`);
  }
  if (!Array.isArray(data.steps)) {
    throw new AtlasBuildError(file, `"steps" must be a list`);
  }
  if (!Array.isArray(data.edges)) {
    throw new AtlasBuildError(file, `"edges" must be a list`);
  }

  const workflow = {
    id: data.id,
    persona: data.persona,
    title: data.title,
    pattern: data.pattern,
    surface: data.surface,
    problem: data.problem ?? "",
    steps: data.steps.map((s) => normaliseStep(file, s, vocab)),
    edges: data.edges.map((e) => normaliseEdge(file, e)),
  };
  return workflow;
}

// ── Catalog ───────────────────────────────────────────────────────────────────

/** Wrap a workflows array in the WorkflowCatalog port surface. */
function makeCatalog(workflows) {
  return {
    all: () => workflows,
    byPersona: (persona) => workflows.filter((w) => w.persona === persona),
    byId: (id) => workflows.find((w) => w.id === id),
  };
}

// ── Generator (driving port) ──────────────────────────────────────────────────

/**
 * Build the Atlas catalog from instance contracts.
 *
 * @param {object} [opts]
 * @param {string} [opts.projectRoot]  defaults to process.cwd()
 * @returns {Promise<{ catalog: object, workflows: Array, written: string|null }>}
 */
async function build(opts = {}) {
  const projectRoot = opts.projectRoot ?? process.cwd();

  // 1. Read config vocab. Absent config or absent atlas: block → empty catalog.
  const configPath = path.join(projectRoot, "systemix.config.yaml");
  let vocab = null;
  if (fs.existsSync(configPath)) {
    const config = parseSimpleYaml(fs.readFileSync(configPath, "utf8"));
    vocab = readVocab(config);
  }

  // 2. Discover contracts.
  const workflowsDir = path.join(projectRoot, WORKFLOWS_REL);
  const files = fs.existsSync(workflowsDir)
    ? fs.readdirSync(workflowsDir).filter((f) => f.endsWith(".mdx")).sort()
    : [];

  // 3. Empty state: no atlas: vocab OR no contracts → empty catalog, no crash.
  let workflows = [];
  if (vocab && files.length > 0) {
    workflows = files.map((f) => {
      const content = fs.readFileSync(path.join(workflowsDir, f), "utf8");
      return parseContract(f, content, vocab);
    });
  }

  // 4. Emit the artifact (stable serialization → idempotent).
  const written = writeArtifact(projectRoot, workflows);

  return { catalog: makeCatalog(workflows), workflows, written };
}

/** Serialize the catalog to .systemix/atlas.catalog.json (atomic write). */
function writeArtifact(projectRoot, workflows) {
  const artifactPath = path.join(projectRoot, ARTIFACT_REL);
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  const json = JSON.stringify({ version: 1, workflows }, null, 2) + "\n";
  const tmpPath = artifactPath + ".tmp";
  fs.writeFileSync(tmpPath, json, "utf8");
  fs.renameSync(tmpPath, artifactPath);
  return artifactPath;
}

// ── CLI entry ─────────────────────────────────────────────────────────────────

async function atlas(args) {
  const sub = args[0] || "build";
  if (sub === "build") {
    try {
      const { workflows, written } = await build({});
      console.log(`\n  ✓ atlas build — ${workflows.length} workflow(s) → ${path.relative(process.cwd(), written)}\n`);
    } catch (err) {
      if (err instanceof AtlasBuildError) {
        console.error(`\n  ✗ atlas build failed in contract/workflows/${err.message}\n`);
        process.exit(1);
      }
      throw err;
    }
    return;
  }
  console.error(`\n  Unknown atlas subcommand: ${sub}\n`);
  console.log("  Usage: npx systemix atlas build\n");
  process.exit(1);
}

module.exports = { atlas, build, AtlasBuildError, makeCatalog, parseContract, readVocab };
