"use strict";

/**
 * readme-table.js — builds the id table of src/lib/counters/README.md from a real
 * run on the committed fixture (not a test file).
 *
 *   node tests/acceptance/counters/readme-table.js           print the table
 *   node tests/acceptance/counters/readme-table.js --write   replace the block between the markers in README.md
 *
 * consistency.test.js fails when the README block differs from this output, so a
 * new, renamed or reworded counter cannot ship with a stale table.
 */

const fs = require("fs");
const path = require("path");
const { makeRichRepo } = require("./fixture");
const { removeRepo } = require("./helpers");
const { runCounters, GROUPS } = require("../../../src/lib/counters");

const README = path.join(__dirname, "..", "..", "..", "src", "lib", "counters", "README.md");
const START = "<!-- counters-table:start -->";
const END = "<!-- counters-table:end -->";

/** The first sentence of a definition summary, on one line, without markdown noise and repo-specific numbers. */
function oneLine(summary) {
  let s = summary.replace(/\s+/g, " ").replace(/`/g, "").trim();
  const m = /^(.*?[a-z0-9)\]])\.(?:\s|$)/.exec(s);
  if (m && m[1].length >= 25) s = m[1];
  s = s.replace(/\s*\(perFile count = [^)]*\)/, "").replace(/\s*\(\d+ distinct\)/, "");
  s = s.replace(/,? e\.g$/, "").replace(/ oklch\($/, " oklch(");
  if (s.length > 130) s = s.slice(0, 127).replace(/\s+\S*$/, "") + "…";
  return s.replace(/\|/g, "\\|");
}

/** { markdown, rows } for the counters of a report. */
function tableOf(report) {
  const lines = [];
  const rows = [];
  for (const g of GROUPS) {
    const list = report.counters.filter((c) => c.group === g);
    lines.push(`#### ${g} (${list.length})`, "", "| id | unit | meaning |", "|---|---|---|");
    for (const c of list) {
      lines.push(`| \`${c.id}\` | ${c.unit} | ${oneLine(c.definition.summary)} |`);
      rows.push({ id: c.id, unit: c.unit });
    }
    lines.push("");
  }
  return { markdown: lines.join("\n").trimEnd(), rows };
}

function buildTable() {
  const root = makeRichRepo();
  try {
    return tableOf(runCounters(root, { dirs: ["src"] }));
  } finally {
    removeRepo(root);
  }
}

/** The block currently between the markers in README.md (null when the markers are missing). */
function readmeBlock(text = fs.readFileSync(README, "utf8")) {
  const a = text.indexOf(START);
  const b = text.indexOf(END);
  if (a === -1 || b === -1 || b < a) return null;
  return text.slice(a + START.length, b).replace(/^\n+|\n+$/g, "");
}

if (require.main === module) {
  const { markdown } = buildTable();
  if (process.argv.includes("--write")) {
    const text = fs.readFileSync(README, "utf8");
    const a = text.indexOf(START);
    const b = text.indexOf(END);
    if (a === -1 || b === -1) throw new Error(`${README} has no ${START} … ${END} block`);
    fs.writeFileSync(README, `${text.slice(0, a + START.length)}\n\n${markdown}\n\n${text.slice(b)}`);
    console.error(`wrote the id table into ${path.relative(process.cwd(), README)}`);
  } else {
    console.log(markdown);
  }
}

module.exports = { buildTable, tableOf, readmeBlock, oneLine, README, START, END };
