"use strict";

// File-ops over experiments/goals/ — the shared core behind the CLI `goal`
// subcommands. A Claude Code skill (new-goal) is the other door onto the same
// files (the "three doors": MCP / CLI / skills, one set of MDX files — MCP
// parity is deferred until a workflow needs it).
//
// Goals are declared by a human, never self-assigned by the engine. The link to
// an experiment is one-directional and lives on the EXPERIMENT side (its own
// `goal:` field, read live by src/lib/contract/goal-map.ts) — nothing on the
// goal file itself needs to be hand-maintained as experiments are added.

const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const layout = require("./layout");
const { stringifyMdx, EXPERIMENT_ID_RE } = require("./experiments");

const isoDay = (d) => d.toISOString().slice(0, 10);

// A goal id becomes a file name (experiments/goals/<id>.mdx), so it follows the
// same path-safe kebab-case rule as experiment ids (EXPERIMENT_ID_RE) — no path
// separators, no "..", nothing that resolves outside experiments/goals/.
const isValidGoalId = (id) => typeof id === "string" && EXPERIMENT_ID_RE.test(id);

/** Throw a clear error unless `id` is a safe goal id. */
function assertGoalId(id) {
  if (id == null || id === "") throw new Error("a goal id is required");
  if (!isValidGoalId(id)) {
    throw new Error(
      `invalid goal id ${JSON.stringify(id)} — use lowercase letters, digits and hyphens, ` +
        "starting with a letter or digit (max 81 characters), e.g. consultancy-leads"
    );
  }
}

function goalFile(root, id) {
  assertGoalId(id);
  return path.join(layout.abs(root).goals, `${id}.mdx`);
}

/** List goals (experiments/goals/*.mdx, excluding the _example), sorted by `order`. */
function listGoals(root) {
  const dir = layout.abs(root).goals;
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") && !f.startsWith("_"))
    .map((f) => {
      const parsed = matter(fs.readFileSync(path.join(dir, f), "utf8"));
      const d = parsed.data || {};
      return {
        id: String(d.id ?? f.replace(/\.mdx$/, "")),
        title: d.title ?? null,
        status: String(d.status ?? "active"),
        order: typeof d.order === "number" ? d.order : 99,
        icp: d.icp ?? null,
      };
    })
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Create experiments/goals/<id>.mdx (status: active). Throws if it already exists. */
function createGoal(root, id, fields = {}) {
  const file = goalFile(root, id); // throws on a missing or unsafe id, before any write
  if (fs.existsSync(file)) throw new Error(`goal already exists: experiments/goals/${id}.mdx`);
  fs.mkdirSync(path.dirname(file), { recursive: true });

  // Append after the highest existing order so GoalsIndex's sort stays stable
  // without the caller having to pick a number.
  const existing = listGoals(root);
  const order =
    fields.order ?? (existing.length ? Math.max(...existing.map((g) => g.order)) + 1 : 0);

  const title = fields.title ?? id;
  const data = {
    type: "goal",
    id,
    title,
    order,
    given: fields.given ?? null,
    "goal-type": fields.goalType ?? "surface",
    icp: fields.icp ?? null,
    status: fields.status ?? "active",
    "success-criteria": fields.successCriteria ?? null,
    "kill-if": fields.killIf ?? null,
    created: fields.created ?? isoDay(fields.now ?? new Date()),
  };
  const body = `\n# ${title}\n\n${
    fields.rationale ??
    "State the outcome you want and how you'll know it's met. Experiments in `experiments/` link to this goal via their own `goal:` field — nothing needs to be edited here as experiments are added."
  }\n`;
  fs.writeFileSync(file, stringifyMdx(body, data), "utf8");
  return file;
}

module.exports = { listGoals, createGoal, goalFile, isValidGoalId, assertGoalId };
