#!/usr/bin/env node
"use strict";

const { COMMANDS, load } = require("../src/commands");
const { makeCtx } = require("../src/lib/ctx");
const pkg = require("../package.json");
const ns = require("../namespace.json");

function help(ctx) {
  ctx.out(`\n  ${ns.bin} ${pkg.version}: the scan behind the ${ns.plugin} plugin. Read-only unless a command says it writes.\n`);
  const w = Math.max(...Object.keys(COMMANDS).map((k) => k.length));
  for (const [name, line] of Object.entries(COMMANDS)) ctx.out(`    ${name.padEnd(w)}  ${line}`);
  ctx.out(`\n  Every command takes --root <dir>, --json and --help.\n`);
}

/** Run the CLI with argv in ctx; resolves to the exit code. Exported for tests. */
async function main(argv, ctx = makeCtx()) {
  const [name, ...rest] = argv;
  if (!name || name === "--help" || name === "-h" || name === "help") {
    help(ctx);
    return 0;
  }
  if (name === "--version" || name === "-v") {
    ctx.out(pkg.version);
    return 0;
  }
  if (!Object.prototype.hasOwnProperty.call(COMMANDS, name)) {
    ctx.err(`  ✗ unknown command: ${name}`);
    help(ctx);
    return 2;
  }
  try {
    const code = await load(name).run(rest, ctx);
    return typeof code === "number" ? code : 0;
  } catch (e) {
    ctx.err(`  ✗ ${name}: ${e && e.message ? e.message : e}`);
    if (ctx.env.PRODUCT_STUDIO_DEBUG) ctx.err(e.stack);
    return 1;
  }
}

if (require.main === module) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}

module.exports = { main };
