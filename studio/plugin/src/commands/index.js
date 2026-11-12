"use strict";

// Every command the CLI has, with one line of help. SPEC.md is the contract for each.
// A command module exports `run(argv, ctx) → exit code` (0 ok, 1 a finding or failed check, 2 a usage error).

const COMMANDS = {
  rules: "init | lint | check | eval | list: the rules in design/rules.md, as data",
  tokens: "lint | diff: the tokens in design/tokens.css (roles, both themes, contrast) and a source's changes",
  preview: "render design/.studio/preview.html from the tokens: swatches, contrast, type, radius, spacing",
  audit: "--json: what a repo's UI already is (palette, type, drift, duplicates, setup class)",
  score: "--json: the readiness score out of 100 (beta)",
  loops: "init | check | status | goal | gate | decisions: the product and build loops",
  learnings: "add | used | list: the learnings ledger in design/LEARNINGS.md",
  runs: "log | rate | list | should-ask: the run log in design/.studio/runs.jsonl",
  proposals: "lint | list | next-id | decide | apply: improvement proposals in design/proposals/",
  admin: "eval | digest: the studio's key-free self-check and what it did",
  docs: "sync | check: component docs in docs/components and docs/manifest.json",
  migrate: "--dry-run | --apply: move an older install into this layout",
  evidence: "check: whether an analytics source is connected (optional)",
};

const load = (name) => require(`./${name}`);

module.exports = { COMMANDS, load };
