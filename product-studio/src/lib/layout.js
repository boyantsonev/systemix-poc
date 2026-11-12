"use strict";

// The one place a client repo's studio layout is named. Every command, template and test
// resolves paths through here; a guide names them in prose, and the plugin build checks the
// prose against this list. Rename the data folder by changing namespace.json, nowhere else.

const path = require("path");
const ns = require("../../namespace.json");

const D = ns.dataDir; // "studio"
const S = ns.stateDir; // "studio/.state"

/** Repo-relative paths. */
const rel = {
  data: D,
  designFile: `${D}/DESIGN.md`,
  tokens: `${D}/tokens.css`,
  rules: `${D}/rules.md`,
  rulesDir: `${D}/rules`,
  knownBad: `${D}/rules/known-bad`,
  knownGood: `${D}/rules/known-good`,
  reviewCases: `${D}/rules/review-cases.json`,
  decisions: `${D}/decisions`,
  goals: `${D}/goals`,
  loops: `${D}/loops`,
  roster: `${D}/loops/roster.md`,
  context: `${D}/context`,
  briefs: `${D}/briefs`,
  proposals: `${D}/proposals`,
  evaluations: `${D}/evaluations.md`,
  learnings: `${D}/LEARNINGS.md`,
  connectors: `${D}/connectors.json`, // optional, committed, no secrets: tracker, docs pages, notices, analytics
  state: S,
  analyticsLegacy: `${S}/analytics.json`, // read by `evidence` only when connectors.json has no analytics key
  runs: `${S}/runs.jsonl`,
  preview: `${S}/preview.html`,
  componentDocs: "docs/components",
  manifest: "docs/manifest.json",
  ciWorkflow: ".github/workflows/design-rules.yml",
  // an older install, read only by `migrate`: it kept its system in design/
  legacy: {
    data: "design",
    guardrails: "design/guardrails.mdx",
    experiments: "experiments",
    learnings: "experiments/LEARNINGS.md",
    goals: "experiments/goals",
    state: ".systemix",
    evals: "design/evals/rules",
    // design/<entry> moves to studio/<entry> as it is
    moved: ["DESIGN.md", "tokens.css", "rules.md", "decisions", "goals", "loops", "context", "briefs", "proposals", "LEARNINGS.md", "evaluations.md"],
  },
};

/** Files no scripted rule is ever run on: the token source and the rules' own samples. */
const NEVER_CHECKED = [rel.tokens, rel.rulesDir + "/", rel.state + "/"];

/** Absolute path of a layout entry under root. */
const at = (root, relPath) => path.join(root, relPath);

module.exports = { ns, rel, at, NEVER_CHECKED };
