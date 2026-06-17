"use strict";

// Single source of truth for the embedded `design/` instance layout — the
// "design-system-as-object". `init` scaffolds these paths, readers resolve
// against them, and tests assert against them, so the layout is defined once.
//
// The AUTHORED contract lives under design/ (DESIGN.md, guardrails.mdx,
// tokens.css, decisions/, goals/, meta/). Machine RUNTIME state (queue, figma
// context) still lives under .systemix/ for now; consolidating it into
// design/.state/ is a later coordinated migration once the MCP/app readers move.

const path = require("path");

const DESIGN = "design";

/** Repo-relative paths (for config YAML, gitignore, prose). */
const rel = {
  dir: DESIGN,
  designFile: `${DESIGN}/DESIGN.md`,
  guardrails: `${DESIGN}/guardrails.mdx`,
  tokens: `${DESIGN}/tokens.css`,
  decisions: `${DESIGN}/decisions`,
  goals: `${DESIGN}/goals`,
  meta: `${DESIGN}/meta`,
  metaContract: `${DESIGN}/meta/hermes-accuracy.mdx`,
  state: `${DESIGN}/.state`,
};

/** Absolute paths under a given project root. */
const abs = (root) => ({
  dir: path.join(root, DESIGN),
  designFile: path.join(root, DESIGN, "DESIGN.md"),
  guardrails: path.join(root, DESIGN, "guardrails.mdx"),
  tokens: path.join(root, DESIGN, "tokens.css"),
  decisions: path.join(root, DESIGN, "decisions"),
  goals: path.join(root, DESIGN, "goals"),
  meta: path.join(root, DESIGN, "meta"),
  metaContract: path.join(root, DESIGN, "meta", "hermes-accuracy.mdx"),
  state: path.join(root, DESIGN, ".state"),
});

module.exports = { DESIGN, rel, abs };
