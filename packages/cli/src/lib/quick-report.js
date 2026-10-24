"use strict";

/**
 * quick-report.js — the paid quick report, built from a counters report alone.
 *
 * The client's own agent runs `audit counters` on their machine; only that JSON
 * (numbers, counter definitions, file paths and short identifiers, never source
 * code) reaches the report service, which calls build() here. Deterministic: no
 * model, no network, the same counters always give the same report.
 *
 * What it prints: the readiness score from the published rubric (the same
 * evaluator the skills use), a score per area, the caveats that cost the most
 * points, and one recommendation per caveat in priority order.
 */

const crypto = require("crypto");
const path = require("path");
const { evaluate, rubricFromBlocks, DEFAULT_SKILLS_DIR } = require("./rubric-eval");
const RECOMMENDATIONS = require("./quick-report-recommendations.json");

const MAX_CAVEATS = 10;

let cachedRubric = null;
function defaultRubric() {
  // static requires, so a bundler (the hosted report service) ships the rubric with the code
  if (!cachedRubric) {
    cachedRubric = rubricFromBlocks({
      "readiness-audit": require("../../pipelines/design-system/skills/readiness-audit/rubric.json"),
      "design-audit": require("../../pipelines/design-system/skills/design-audit/rubric.json"),
      "drift-report": require("../../pipelines/design-system/skills/drift-report/rubric.json"),
    });
  }
  return cachedRubric;
}

const pct = (v) => `${Math.round(v * 1000) / 10}%`;
const tidy = (v) => (typeof v === "number" && !Number.isInteger(v) ? String(Math.round(v * 100) / 100) : String(v));

function formatValue(item) {
  if (item.value === null || item.value === undefined) return "not computable";
  if (item.unit === "ratio" && typeof item.value === "number") return pct(item.value);
  if (typeof item.value === "boolean" || item.unit === "boolean") return item.value ? "yes" : "no";
  if (item.unit === "percent") return `${tidy(item.value)}%`;
  return item.unit ? `${tidy(item.value)} ${item.unit}` : tidy(item.value);
}

/** Items that lost points, each with the points it lost weighted by its area's importance. */
function caveatsOf(result) {
  const out = [];
  for (const dim of Object.values(result.dimensions)) {
    for (const item of dim.items) {
      if (item.status === "na") continue;
      // an item that cannot be measured lost its points to a missing input another caveat already names
      if (item.value === null || item.value === undefined) continue;
      const lost = item.max - item.points;
      if (!(lost > 0)) continue;
      out.push({
        area: dim.label,
        areaKey: dim.key,
        id: item.id,
        label: item.label,
        value: formatValue(item),
        points: item.points,
        max: item.max,
        lost,
        weight: lost * dim.importance,
        recommendation: RECOMMENDATIONS[item.id] || null,
      });
    }
  }
  // biggest weighted loss first; fixed tie-breaks so the order never moves
  return out.sort((a, b) => b.weight - a.weight || b.lost - a.lost || (a.id < b.id ? -1 : 1));
}

/**
 * Build the quick report from a counters report.
 * @returns {{scored: boolean, overall: number|null, areas: object[], caveats: object[], markdown: string}}
 */
function build(counters, { rubric = defaultRubric(), maxCaveats = MAX_CAVEATS } = {}) {
  const result = evaluate(counters, rubric);
  const h = result.header || {};
  const lines = [];
  lines.push("# Quick design-system report");
  lines.push("");
  lines.push(`Commit ${h.commit || "unknown"}${h.commitDate ? ` (${h.commitDate.slice(0, 10)})` : ""} · folders: ${(h.dirs || []).join(", ") || "default"} · ${h.audited ?? "?"} files audited · token source: ${h.tokenSource && h.tokenSource.path ? h.tokenSource.path : "none found"}`);
  lines.push("");

  if (!result.scored) {
    const reasons = (result.withheld && result.withheld.reasons) || [];
    lines.push("**No score.** The results file is incomplete, so a score would be misleading:");
    for (const r of reasons) lines.push(`- ${typeof r === "string" ? r : JSON.stringify(r)}`);
    lines.push("");
    lines.push("Run `npx @getsystemix/cli audit counters` again without slicing options and send the full file.");
    return { scored: false, overall: null, areas: [], caveats: [], markdown: lines.join("\n") + "\n" };
  }

  const overall = result.overall.value;
  // ranked areas first (biggest opportunity), then the ones already at or above their importance
  const order = [...result.ranking.map((r) => r.key), ...Object.keys(result.dimensions).filter((k) => !result.ranking.some((r) => r.key === k))];
  const areas = order.map((k) => {
    const d = result.dimensions[k];
    return { key: d.key, label: d.label, score: d.satisfaction, importance: d.importance };
  });
  const caveats = caveatsOf(result);
  const shown = caveats.slice(0, maxCaveats);

  lines.push(`## Score: ${overall} / 100`);
  lines.push("");
  lines.push("| Area | Score (out of 10) |");
  lines.push("|---|---|");
  for (const a of areas) lines.push(`| ${a.label} | ${a.score} |`);
  lines.push("");
  lines.push("Areas are listed with the biggest opportunity first: what matters most for agent-built UI and is weakest today.");
  lines.push("");

  lines.push("## Caveats");
  lines.push("");
  if (!shown.length) lines.push("None: every scored item is at its maximum.");
  shown.forEach((c, i) => lines.push(`${i + 1}. **${c.area}: ${c.label}.** Measured: ${c.value}. Scored ${c.points} of ${c.max}.`));
  if (caveats.length > shown.length) lines.push(`\n${caveats.length - shown.length} smaller caveats are not listed.`);
  const unmeasured = Object.values(result.dimensions).flatMap((d) => d.items).filter((it) => it.status !== "na" && it.points < it.max && (it.value === null || it.value === undefined)).length;
  if (unmeasured) lines.push(`${unmeasured} more items score 0 because what they measure does not exist yet (fixing the caveats above unlocks them).`);
  lines.push("");

  lines.push("## Recommendations, in this order");
  lines.push("");
  let n = 0;
  const seen = new Set();
  for (const c of shown) {
    if (!c.recommendation || seen.has(c.recommendation)) continue;
    seen.add(c.recommendation);
    lines.push(`${++n}. ${c.recommendation}`);
  }
  if (!n) lines.push("Nothing to recommend from the counters.");
  lines.push("");

  lines.push("---");
  lines.push("");
  lines.push(`How this was made: a deterministic scan of the code (no AI judgement in the numbers), scored with rubric ${result.rubricVersion} and counters ${h.countersVersion}. ${result.validity}`);
  lines.push("No source code was sent to produce this report, only counts and file names.");

  return { scored: true, overall, areas, caveats: shown, markdown: lines.join("\n") + "\n" };
}

// ---------------------------------------------------------------------------------------------------- redaction

const PATH_LIKE = /^(?:[\w@.+-]+\/)+[\w@.+()[\]-]*$|^[\w@.+-]+\.(?:tsx?|jsx?|mjs|cjs|css|scss|vue|svelte|mdx?|json|ya?ml)$/;
const SKIP_KEYS = new Set(["definition", "id", "group", "kind", "unit"]);

const hashOf = (s) => "path-" + crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);

/**
 * A copy of a counters report with every file and folder path replaced by a stable
 * hash (`path-1a2b3c4d5e`). Counts are unchanged, so the score is unchanged; the
 * report service never sees a file name.
 */
function redactPaths(report) {
  const walk = (v, key) => {
    if (typeof v === "string") return key !== "summary" && PATH_LIKE.test(v) ? hashOf(v) : v;
    if (Array.isArray(v)) return v.map((x) => walk(x, key));
    if (v && typeof v === "object") {
      const o = {};
      for (const [k, val] of Object.entries(v)) o[k] = SKIP_KEYS.has(k) ? val : walk(val, k);
      return o;
    }
    return v;
  };
  // only the parts that carry repo data; schema, versions and git info stay as they are
  const out = { ...report, scope: walk(report.scope, "scope"), warnings: walk(report.warnings, "warnings"), counters: walk(report.counters, "counters") };
  // perFile rows are ordered count desc, file asc; hashing changes the names, so re-sort
  for (const c of out.counters || []) {
    if (Array.isArray(c.perFile)) c.perFile.sort((a, b) => b.count - a.count || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  }
  return out;
}

/** What a report contains, for the "this is what will be sent" preview. */
function payloadSummary(report) {
  const paths = new Set();
  const walk = (v, key) => {
    if (typeof v === "string") { if (key !== "summary" && PATH_LIKE.test(v)) paths.add(v); return; }
    if (Array.isArray(v)) return v.forEach((x) => walk(x, key));
    if (v && typeof v === "object") for (const [k, val] of Object.entries(v)) if (!SKIP_KEYS.has(k)) walk(val, k);
  };
  walk(report.scope, "scope"); walk(report.warnings, "warnings"); walk(report.counters, "counters");
  return { counters: (report.counters || []).length, bytes: Buffer.byteLength(JSON.stringify(report)), paths: paths.size, redacted: [...paths].every((p) => p.startsWith("path-")) };
}

module.exports = { build, redactPaths, payloadSummary, caveatsOf, RECOMMENDATIONS, MAX_CAVEATS, PATH_LIKE, rubricDir: path.join(DEFAULT_SKILLS_DIR) };
