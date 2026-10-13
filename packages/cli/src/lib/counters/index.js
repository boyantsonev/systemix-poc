"use strict";

/**
 * counters/index.js — runs every counter group over a repo and returns ONE
 * deterministic report. Same tree + same commit → byte-identical JSON: no
 * timestamps, no randomness, sorted output, stable ids.
 *
 * The report is the evidence an audit quotes. A skill (or a human) must not
 * recompute a counter that is in here; it fills only the judged fields, and
 * tags every number it prints as `mechanical` (from this report) or `judged`.
 */

const path = require("path");
const { createContext } = require("./context");
const { byString, validateReport } = require("./counter");

const SCHEMA = "systemix.audit-counters/1";
const COUNTERS_VERSION = "1.0.0";

// Fixed order — modules are listed, never discovered, so a stray file can't change a report.
const GROUPS = [
  "census", "tokens", "colour", "typography", "scale", "primitives",
  "reachability", "guardrails", "docs", "decisions", "habit", "legibility",
];

function toolVersion() {
  try { return require("../../../package.json").version; } catch { return null; }
}

function loadGroup(name) {
  try {
    return require(`./${name}`);
  } catch (e) {
    if (e && e.code === "MODULE_NOT_FOUND" && String(e.message).includes(`./${name}`)) return null;
    throw e;
  }
}

/**
 * @param {string} root project root (absolute or relative)
 * @param {{dirs?: string[], groups?: string[]}} [opts]
 */
function runCounters(root, opts = {}) {
  const ctx = createContext(path.resolve(root), { dirs: opts.dirs });
  const wanted = opts.groups && opts.groups.length ? opts.groups : GROUPS;
  const counters = [];
  const groupsRun = [];
  const groupsMissing = [];

  for (const name of GROUPS.filter((g) => wanted.includes(g))) {
    const mod = loadGroup(name);
    if (!mod) { groupsMissing.push(name); continue; }
    groupsRun.push(name);
    for (const c of mod.run(ctx)) counters.push(c);
  }
  counters.sort((a, b) => byString(a.id, b.id));

  const pop = ctx.population;
  const report = {
    schema: SCHEMA,
    countersVersion: COUNTERS_VERSION,
    toolVersion: toolVersion(),
    repo: ctx.git,
    scope: {
      dirs: pop.dirs,
      missingDirs: pop.missingDirs,
      rejectedDirs: pop.rejectedDirs,
      tokenSource: {
        path: ctx.tokenSource.rel,
        via: ctx.tokenSource.via,
        reason: ctx.tokenSource.reason,
        customProperties: ctx.tokenSource.customProperties,
      },
      population: {
        census: pop.census.length,
        tests: pop.tests.length,
        declarations: pop.declarations.length,
        audited: pop.audited.length,
      },
    },
    groups: { run: groupsRun, missing: groupsMissing },
    counters,
    warnings: [...ctx.warnings].sort(byString),
  };

  const problems = validateReport(report);
  if (problems.length) throw new Error(`counters report failed validation:\n  - ${problems.join("\n  - ")}`);
  return report;
}

module.exports = { runCounters, GROUPS, SCHEMA, COUNTERS_VERSION };
