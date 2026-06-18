"use strict";

// Single source of truth for the embedded instance layout. `init` scaffolds these
// paths, readers resolve against them, and tests assert against them — defined once.
//
// v6 split — the LOOP is the core; the design system is an optional substrate:
//   experiments/  THE LOOP (always scaffolded; general, not design-bound):
//                 <id>.mdx · LEARNINGS.md (the synthesized memory) · goals/ ·
//                 meta/ (self-improvement audit).
//   design/       an OPTIONAL substrate (the design-system-as-object): DESIGN.md ·
//                 guardrails.mdx · tokens.css. Scaffolded, pointed at an existing
//                 DS (systemix.config.yaml `design.source`), or omitted.
//   .systemix/    machine RUNTIME state: queue.json (the HITL decision queue).

const path = require("path");

const EXPERIMENTS = "experiments";
const DESIGN = "design";
const STATE = ".systemix";

/** Repo-relative paths (for config YAML, gitignore, prose). */
const rel = {
  // ── the loop (core) ──
  experiments: EXPERIMENTS,
  learnings: `${EXPERIMENTS}/LEARNINGS.md`,
  goals: `${EXPERIMENTS}/goals`,
  meta: `${EXPERIMENTS}/meta`,
  metaContract: `${EXPERIMENTS}/meta/hermes-accuracy.mdx`,
  experimentFile: (id) => `${EXPERIMENTS}/${id}.mdx`,
  // ── design substrate (optional) ──
  design: DESIGN,
  designFile: `${DESIGN}/DESIGN.md`,
  guardrails: `${DESIGN}/guardrails.mdx`,
  tokens: `${DESIGN}/tokens.css`,
  // ── runtime state ──
  state: STATE,
  queue: `${STATE}/queue.json`,
};

/** Absolute paths under a given project root. */
const abs = (root) => ({
  experiments: path.join(root, EXPERIMENTS),
  learnings: path.join(root, EXPERIMENTS, "LEARNINGS.md"),
  goals: path.join(root, EXPERIMENTS, "goals"),
  meta: path.join(root, EXPERIMENTS, "meta"),
  metaContract: path.join(root, EXPERIMENTS, "meta", "hermes-accuracy.mdx"),
  experimentFile: (id) => path.join(root, EXPERIMENTS, `${id}.mdx`),
  design: path.join(root, DESIGN),
  designFile: path.join(root, DESIGN, "DESIGN.md"),
  guardrails: path.join(root, DESIGN, "guardrails.mdx"),
  tokens: path.join(root, DESIGN, "tokens.css"),
  state: path.join(root, STATE),
  queue: path.join(root, STATE, "queue.json"),
});

module.exports = { EXPERIMENTS, DESIGN, STATE, rel, abs };
