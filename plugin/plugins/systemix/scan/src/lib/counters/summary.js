"use strict";

/**
 * summary.js — the human view of a counters report: one line per counter, grouped,
 * under a short header. It only formats what the report already says; it adds no
 * number and drops none. (`systemix audit counters --summary`; the JSON stays the
 * evidence.)
 */

const MAX_STRING = 48;

/** A counter value as one short cell. */
function cell(c) {
  const v = c.value;
  if (v === null || v === undefined) return "-";
  if (c.unit === "ratio") return `${v} (${Math.round(v * 10000) / 100}%)`;
  if (typeof v === "string") {
    const flat = v.replace(/\s+/g, " ");
    return flat.length > MAX_STRING ? `${flat.slice(0, MAX_STRING - 1)}…` : flat;
  }
  return String(v);
}

const pad = (s, n) => s + " ".repeat(Math.max(0, n - s.length));
const padLeft = (s, n) => " ".repeat(Math.max(0, n - s.length)) + s;

/**
 * @param {object} report from runCounters
 * @returns {string} text without a trailing newline
 */
function formatSummary(report) {
  const lines = [];
  const scope = report.scope;
  const pop = scope.population;
  const repo = report.repo ?? {};
  const ts = scope.tokenSource;

  lines.push(`systemix audit counters — counters ${report.countersVersion} (${report.schema})`);
  lines.push(
    repo.commit
      ? `  commit        ${repo.commit.slice(0, 12)}  ${repo.commitDate ?? "no date"}${repo.dirty ? "  (uncommitted changes)" : ""}${repo.prefix ? `  [folder ${repo.prefix}]` : ""}`
      : "  commit        no git history",
  );
  lines.push(`  audited dirs  ${scope.dirs.length ? scope.dirs.join(", ") : "(none)"}`);
  lines.push(`  population    ${pop.census} files in the census · ${pop.tests} tests · ${pop.declarations} .d.ts · ${pop.audited} audited${pop.unreadable ? ` · ${pop.unreadable} unreadable` : ""}`);
  lines.push(ts.path ? `  token source  ${ts.path} (via ${ts.via}; ${ts.customProperties} custom properties)` : "  token source  none found");

  const byGroup = new Map();
  for (const c of report.counters) {
    if (!byGroup.has(c.group)) byGroup.set(c.group, []);
    byGroup.get(c.group).push(c);
  }
  const idWidth = Math.max(0, ...report.counters.map((c) => c.id.length));
  const cells = new Map(report.counters.map((c) => [c.id, cell(c)]));
  const valueWidth = Math.max(0, ...[...cells.values()].map((v) => v.length));

  for (const [group, list] of byGroup) {
    lines.push("");
    lines.push(`${group} (${list.length})`);
    for (const c of list) {
      lines.push(`  ${pad(c.id, idWidth)}  ${padLeft(cells.get(c.id), valueWidth)}  ${c.unit}`);
    }
  }

  if (report.groups.skipped.length) {
    lines.push("");
    lines.push(`groups left out (--groups): ${report.groups.skipped.join(", ")}`);
  }
  if (report.warnings.length) {
    lines.push("");
    lines.push(`warnings (${report.warnings.length})`);
    for (const w of report.warnings) lines.push(`  ! ${w}`);
  }
  lines.push("");
  lines.push(`${report.counters.length} counters. Definitions, regexes, file sets and per-file rows: run without --summary for the JSON.`);
  return lines.join("\n");
}

module.exports = { formatSummary };
