#!/usr/bin/env node
"use strict";

/**
 * The Systemix plugin's scan: the subset of the `@getsystemix/cli` CLI the four commands run,
 * copied into the plugin so nothing is downloaded at run time and nothing is ever sent. It never
 * installs or writes skills. Three commands write into the repo, new files only, after the person
 * said yes: `rules init` (the starter rules.md and its evals), `loops init` (the loop templates),
 * and `drift scan` without --dry-run (a snapshot in .systemix/drift-history.json); the skills run
 * `drift scan --dry-run`. Run it from the repo it reads:
 *
 *   node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" audit counters --dirs src --out /tmp/c.json
 */

const HELP = `
  Systemix scan (bundled with the Systemix plugin)

    systemix audit counters [dir…]   Audit counters as JSON: [--groups g] [--ids i] [--brief] [--out file] [--pretty] [--summary] [--dirty]
    systemix audit report [dir…]     The free AI-readiness score, computed on this machine: [--dirs src] [--json]
    systemix drift <sub>             Sacred timeline: scan [dir…] [--dry-run] [--json] | history [--last 10]
    systemix rules <sub>             The rules as data: init | lint | check <files…> [--surface s] | eval
    systemix loops <sub>             Product + build loops: init | check | status | decisions [--json]
`;

async function main(argv) {
  const [cmd, sub, ...rest] = argv;
  if (cmd === "audit" && (sub === "counters" || sub === "report")) {
    const { audit } = require("./src/commands/audit");
    return audit([sub, ...rest]);
  }
  if (cmd === "rules") {
    const { rules } = require("./src/commands/rules");
    return rules(argv.slice(1));
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
