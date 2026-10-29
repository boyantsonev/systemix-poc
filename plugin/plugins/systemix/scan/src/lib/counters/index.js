"use strict";

/**
 * counters/index.js — runs every counter group over a repo and returns ONE
 * deterministic report. Same tree + same commit → byte-identical JSON: no
 * timestamps, no randomness, sorted output, stable ids.
 *
 * The report is the evidence an audit quotes. A skill (or a human) must not
 * recompute a counter that is in here; it fills only the judged fields, and
 * tags every number it prints as `mechanical` (from this report) or `judged`.
 *
 * A listed group that cannot be loaded is a broken install, not a smaller report:
 * runCounters throws. `groups.skipped` lists the groups left out on purpose (--groups).
 */

const path = require("path");
const { createContext } = require("./context");
const { MAX_NOTE_TEXT, byString, clampText, validateReport } = require("./counter");

const SCHEMA = "systemix.audit-counters/1";
// MAJOR: an id removed or renamed, a unit or definition changed so a number means something else, a schema break.
// MINOR: a counter, group, field or flag added. PATCH: a fix to match the published definition, wording, speed.
// Bump it in the PR that changes a counter, and regenerate the id table in README.md (see "Versioning" there).
const COUNTERS_VERSION = "1.0.0";
// a report this large cannot be read in one piece by a person or a model: say so (the slicing flags are the cure)
const LARGE_REPORT_BYTES = 5 * 1024 * 1024;

// Fixed order — modules are listed, never discovered, so a stray file can't change a report.
const GROUPS = [
  "census", "tokens", "colour", "typography", "scale", "primitives",
  "reachability", "guardrails", "docs", "decisions", "habit", "legibility",
];

function toolVersion() {
  try { return require("../../../package.json").version; } catch { return null; }
}

/**
 * @param {string} root project root (absolute or relative)
 * @param {{dirs?: string[], groups?: string[], dirty?: boolean, readBudgetBytes?: number, warnReportBytes?: number}} [opts]
 *   dirty: also compute repo.dirty (runs `git status`; see context.js for why that is opt-in);
 *   readBudgetBytes: the run's total read budget (context.js); warnReportBytes: the size past which the report warns that it is too big to read whole
 */
function runCounters(root, opts = {}) {
  const ctx = createContext(path.resolve(root), { dirs: opts.dirs, dirty: opts.dirty, readBudgetBytes: opts.readBudgetBytes });
  const wanted = opts.groups && opts.groups.length ? opts.groups : GROUPS;
  const counters = [];
  const groupsRun = [];
  const groupsSkipped = [];

  for (const name of GROUPS) {
    if (!wanted.includes(name)) { groupsSkipped.push(name); continue; }
    const mod = require(`./${name}`);
    groupsRun.push(name);
    for (const c of mod.run(ctx)) counters.push(c);
  }
  ctx.finish();
  counters.sort((a, b) => byString(a.id, b.id));

  const unreadable = ctx.unreadable();
  if (unreadable.length) {
    const shown = unreadable.slice(0, 8).map((u) => `${u.file} (${u.reason})`).join(", ");
    ctx.warn(`${unreadable.length} census file(s) could not be opened as regular files (an unreadable file, a name that is not valid UTF-8, a FIFO or a device) and contribute nothing to any counter: ${shown}${unreadable.length > 8 ? `, … (${unreadable.length - 8} more)` : ""}`);
  }

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
      skippedDirs: pop.skippedDirs,
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
        unreadable: unreadable.length,
      },
    },
    groups: { run: groupsRun, skipped: groupsSkipped },
    counters,
    warnings: ctx.warnings.map((w) => clampText(w, MAX_NOTE_TEXT)).sort(byString),
  };

  const problems = validateReport(report);
  if (problems.length) throw new Error(`counters report failed validation:\n  - ${problems.join("\n  - ")}`);
  if (Buffer.byteLength(JSON.stringify(report)) > (opts.warnReportBytes ?? LARGE_REPORT_BYTES)) {
    report.warnings = [...report.warnings, "this report is over 5 MB: read it through a slice (--ids, --brief, --no-per-file, --no-definitions) instead of whole"].sort(byString);
  }
  return report;
}

/** Counter ids matching one selector: the id itself, or a dotted prefix of it (`colour.hex6` selects `colour.hex6.*`). */
const selects = (selector, id) => id === selector || id.startsWith(selector + ".");

/**
 * A smaller view of a finished report, for a reader that cannot take all of it (a model reading the whole
 * JSON is ~100k tokens). Every counter keeps its id, unit and value; the rest is opt-out. The result says
 * what was cut in `slice`, and is NOT a full report (it no longer validates as one).
 * @param {object} report from runCounters
 * @param {{ids?: string[], brief?: boolean, definitions?: boolean, perFile?: boolean}} [opts]
 *   ids: selectors (see `selects`); brief: only id, unit, value and a ratio's numerator and denominator;
 *   definitions / perFile: false drops that part of every counter
 * @returns {{report: object, unmatched: string[]}} unmatched = selectors that selected nothing
 */
function sliceReport(report, { ids = [], brief = false, definitions = true, perFile = true } = {}) {
  const unmatched = ids.filter((sel) => !report.counters.some((c) => selects(sel, c.id)));
  let counters = ids.length ? report.counters.filter((c) => ids.some((sel) => selects(sel, c.id))) : report.counters;
  if (brief) {
    counters = counters.map((c) => {
      const row = { id: c.id, unit: c.unit, value: c.value };
      if (c.unit === "ratio") row.detail = { numerator: c.detail.numerator, denominator: c.detail.denominator };
      return row;
    });
  } else if (!definitions || !perFile) {
    counters = counters.map((c) => {
      const { definition, perFile: rows, perFileTotal, perFileOmitted, ...rest } = c;
      const out = { ...rest };
      if (definitions) out.definition = definition;
      if (perFile && rows !== undefined) {
        out.perFile = rows;
        if (perFileTotal !== undefined) { out.perFileTotal = perFileTotal; out.perFileOmitted = perFileOmitted; }
      }
      return out;
    });
  }
  const slice = { ids, brief, definitions: brief ? false : definitions, perFile: brief ? false : perFile, counters: counters.length, of: report.counters.length };
  return { report: { ...report, slice, counters }, unmatched };
}

module.exports = { runCounters, sliceReport, GROUPS, SCHEMA, COUNTERS_VERSION };
