"use strict";

const fs = require("fs");
const path = require("path");

// `systemix audit counters` is the other half of the audit: the deterministic counters
// script the audit skills quote instead of recounting (see src/lib/counters/README.md).
// It is dependency-free like `drift`, and is required only when it runs.

// The design-audit skill is the zero-setup front door. `systemix audit` vendors
// just that one skill into the repo (no full init, no config, no MCP) so the
// engine — Claude Code — can run it. This keeps the landing CTA honest: someone
// runs `npx @getsystemix/cli audit`, gets the skill, and runs `/design-audit`.

const SKILL_SRC = path.join(
  __dirname, "..", "..", "pipelines", "design-system", "skills", "design-audit"
);
const SKILLS_DIR = path.join(process.cwd(), ".claude", "skills");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

const COUNTERS_USAGE = [
  "",
  "  Usage: npx @getsystemix/cli audit counters [dir…] [--dirs src,app] [--groups colour,tokens]",
  "                                             [--ids colour.hex6,tokens.source.path] [--brief] [--no-definitions] [--no-per-file]",
  "                                             [--out report.json] [--pretty] [--summary] [--dirty] [--root <dir>]",
  "",
  "    Counts the design system of this repo — files, tokens, colour and type literals, primitives,",
  "    reachability, guardrails, docs, decisions, habit, agent legibility — and prints ONE JSON report",
  "    on stdout. Same tree and same commit give the same bytes. Read-only; no model, no network.",
  "",
  "      dir…               folders or files to audit, relative to the project root",
  "                         (default: the drift scanner's list — src app components lib packages)",
  "      --dirs a,b         the same, comma-separated; may be repeated",
  "      --groups a,b       only these counter groups (default: all)",
  "      --ids a,b          only these counters: an id, or a dotted prefix (colour.hex6 = colour.hex6.*)",
  "      --brief            per counter only id, unit, value (and a ratio's numerator and denominator)",
  "      --no-definitions   leave out every counter's definition (regex, file set)",
  "      --no-per-file      leave out every counter's per-file rows",
  "      --out file         write the JSON to this file instead of stdout (parent folders are created)",
  "      --pretty           indent the JSON (default: one line)",
  "      --summary          print a compact table on stdout instead of the JSON (--out still writes the JSON)",
  "      --dirty            also say whether the working tree differs from HEAD (runs `git status`, which runs",
  "                         the clean filters of the repo's own .git/config: only for a repo you trust)",
  "      --root dir         the project to audit (default: the current folder)",
  "",
  "    The full report is large (hundreds of KB). Slice it with --ids, --brief, --no-definitions and",
  "    --no-per-file; a sliced report says what it left out in its `slice` field.",
  "    Diagnostics go to stderr. Exit code 0 unless the root cannot be read, an argument is wrong (an",
  "    --ids selector that matches no counter included) or the report fails its own validation.",
  "",
].join("\n");

const AUDIT_USAGE = [
  "",
  "  Usage: npx @getsystemix/cli audit                     install the design-audit skill into .claude/skills/",
  "         npx @getsystemix/cli audit counters [dir…] …   print the audit counters as JSON (audit counters --help)",
  "",
].join("\n");

function fail(message) {
  console.error(`\n  ✗  ${message}`);
  process.exitCode = 1;
}

/**
 * `systemix audit counters` — run every counter group over the project and print the
 * report. stdout carries the JSON (or, with --summary, the table) and nothing else.
 * @returns {object|null} the report, or null when nothing ran
 */
function countersCommand(args, opts = {}) {
  const { parseFlags, splitList } = require("./drift");
  const parsed = parseFlags(args, {
    valueFlags: ["--dirs", "--groups", "--ids", "--out", "--root"],
    boolFlags: ["--pretty", "--summary", "--dirty", "--brief", "--no-definitions", "--no-per-file"],
  });
  if (parsed.help) {
    console.log(COUNTERS_USAGE);
    return null;
  }

  const { GROUPS, runCounters, sliceReport } = require("../lib/counters");
  const { formatSummary } = require("../lib/counters/summary");
  const { safeJoin } = require("../lib/design-source");

  const unique = (list) => [...new Set(list)];
  const last = (key) => (parsed.values[key] ?? []).slice(-1)[0];
  const problems = [...parsed.errors, ...parsed.unknown.map((f) => `unknown flag ${f}`)];

  const root = path.resolve(last("--root") ?? opts.projectRoot ?? process.cwd());
  try {
    fs.readdirSync(root);
  } catch (e) {
    problems.push(`cannot read the project root ${root} (${e && e.code ? e.code : "error"})`);
  }

  const dirs = unique([...splitList(parsed.values["--dirs"] ?? []), ...splitList(parsed.positional)]);
  for (const d of dirs) {
    if (!safeJoin(root, d)) problems.push(`folder ${d} is outside the project root (a ".." path, or a symlink that leaves it)`);
  }

  const groups = unique(splitList(parsed.values["--groups"] ?? []));
  const unknownGroups = groups.filter((g) => !GROUPS.includes(g));
  if (unknownGroups.length) problems.push(`unknown counter group ${unknownGroups.join(", ")} (groups: ${GROUPS.join(", ")})`);

  if (problems.length) {
    for (const p of problems) fail(p);
    console.error("     (see: audit counters --help)\n");
    return null;
  }

  let report;
  try {
    report = runCounters(root, { dirs, groups, dirty: parsed.bools.has("--dirty") });
  } catch (e) {
    fail(e.message);
    console.error();
    return null;
  }

  const ids = unique(splitList(parsed.values["--ids"] ?? []));
  const slicing = ids.length > 0 || parsed.bools.has("--brief") || parsed.bools.has("--no-definitions") || parsed.bools.has("--no-per-file");
  let shown = report;
  if (slicing) {
    const sliced = sliceReport(report, {
      ids,
      brief: parsed.bools.has("--brief"),
      definitions: !parsed.bools.has("--no-definitions"),
      perFile: !parsed.bools.has("--no-per-file"),
    });
    if (sliced.unmatched.length) {
      fail(`no counter matches ${sliced.unmatched.join(", ")} (an id, or a dotted prefix such as colour.hex6; groups: ${GROUPS.join(", ")})`);
      console.error();
      return null;
    }
    shown = sliced.report;
  }

  for (const w of report.warnings) console.error(`  !  ${w}`);

  const json = JSON.stringify(shown, null, parsed.bools.has("--pretty") ? 2 : 0);
  const out = last("--out");
  if (out) {
    const file = path.resolve(out);
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, json + "\n");
    } catch (e) {
      fail(`could not write ${out} (${e && e.code ? e.code : e.message})`);
      console.error();
      return null;
    }
    console.error(`  ✓  wrote ${out} — ${shown.counters.length} counters, ${Buffer.byteLength(json) + 1} bytes`);
  }
  if (parsed.bools.has("--summary")) console.log(formatSummary(report));
  else if (!out) console.log(json);
  return report;
}

/**
 * `systemix audit` — install the zero-setup design-audit skill into this repo.
 * Read-only when run: the audit itself proposes files and writes nothing without
 * approval. This command only vendors the skill.
 *
 * `systemix audit counters …` runs the deterministic counters instead (see above).
 * Any other argument is an error (exit 1), never an install.
 */
async function audit(args = [], opts = {}) {
  const sub = args[0];
  if (sub === "counters") return countersCommand(args.slice(1), opts);
  if (sub === "help" || sub === "--help" || sub === "-h") {
    console.log(AUDIT_USAGE);
    return null;
  }
  // an install writes files, so a mistyped subcommand must not fall through to it
  if (sub !== undefined) {
    fail(`unknown audit subcommand: ${sub} (the only one is "counters"; "audit" alone installs the skill)`);
    console.error(AUDIT_USAGE);
    return null;
  }
  if (!fs.existsSync(SKILL_SRC)) {
    throw new Error("design-audit skill not found in this systemix install.");
  }

  const dest = path.join(SKILLS_DIR, "design-audit");
  copyDir(SKILL_SRC, dest);

  console.log("\n✓ design-audit installed → .claude/skills/design-audit/\n");
  console.log("  Zero setup. Read-only. It infers your de-facto design system,");
  console.log("  flags drift + inconsistent components, and proposes a starter");
  console.log("  design/ — writing nothing without your approval.\n");
  console.log("  Next: open Claude Code in this repo and run\n");
  console.log("    /design-audit            audit the whole repo");
  console.log("    /design-audit src/       scope to a directory\n");
  console.log("  Docs: https://getsystemix.vercel.app/docs/audit\n");
}

module.exports = { audit };
