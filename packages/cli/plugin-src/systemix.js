#!/usr/bin/env node
"use strict";

/**
 * The Systemix plugin's scan: the subset of the `@getsystemix/cli` CLI the audit and loop skills
 * run, copied into the plugin so nothing is downloaded at run time. It never installs or
 * writes skills. Two commands write into the repo: `loops init` (the loop templates, new
 * files only, after the person answered the loops skill's setup questions) and `drift scan`
 * without --dry-run (a snapshot appended to .systemix/drift-history.json); the skills run
 * `drift scan --dry-run`. Run it from the repo it reads:
 *
 *   node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" audit counters --dirs src --out /tmp/c.json
 */

const HELP = `
  Systemix scan (bundled with the Systemix plugin)

    systemix audit counters [dir…]   Audit counters as JSON: [--groups g] [--ids i] [--brief] [--out file] [--pretty] [--summary] [--dirty]
    systemix audit report [dir…]     Free score, or the paid quick report with --key: sends only the counters JSON (never code) with --yes [--key k] [--redact-paths] [--dry-run]
    systemix drift <sub>             Sacred timeline: scan [dir…] [--dry-run] [--json] | history [--last 10]
    systemix loops <sub>             Product + build loops: init | check | status | decisions [--json]
`;

async function main(argv) {
  const [cmd, sub, ...rest] = argv;
  if (cmd === "audit" && (sub === "counters" || sub === "report")) {
    const { audit } = require("./src/commands/audit");
    return audit([sub, ...rest]);
  }
  if (cmd === "loops") {
    const { loops } = require("./src/commands/loops");
    return loops(argv.slice(1));
  }
  if (cmd === "drift" && sub) {
    const { drift } = require("./src/commands/drift");
    return drift([sub, ...rest]);
  }
  if (cmd === undefined || cmd === "--help" || cmd === "-h" || cmd === "help") {
    console.log(HELP);
    return null;
  }
  console.error(`\n  ✗  not part of the plugin's scan: ${argv.join(" ")}\n${HELP}`);
  process.exitCode = 1;
  return null;
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(`\n  ✗  ${e && e.message ? e.message : e}\n`);
    process.exitCode = 1;
  });
}

module.exports = { main, HELP };
