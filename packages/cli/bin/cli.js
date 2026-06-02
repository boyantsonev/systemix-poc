#!/usr/bin/env node

const { add } = require("../src/add");
const { list } = require("../src/list");
const { doctor } = require("../src/doctor");
const { init } = require("../src/init");
const { sync } = require("../src/commands/sync");
const { tokenProfile } = require("../src/commands/token-profile");
const { schedule } = require("../src/commands/schedule");
const { tokenGuard } = require("../src/commands/token-guard");
const { update } = require("../src/commands/update");
const { tokens } = require("../src/commands/tokens");
const { watch } = require("../src/commands/watch");
const { socialSignal } = require("../src/commands/social-signal");
const { evidence } = require("../src/commands/evidence");
const { config } = require("../src/commands/config");

const [, , command, ...args] = process.argv;

const HELP = `
  systemix — agentic design system ops for Claude Code

  Usage:
    npx systemix init                    Interactive setup wizard (run once per project)
    npx systemix init --reconfigure      Re-run the wizard, overwrite systemix.config.yaml
    npx systemix config show             Print the active instance topology
    npx systemix workflow add <name>     Install a workflow to ~/.claude/skills/
    npx systemix workflow list           List available workflows
    npx systemix add <name>              Alias for: workflow add
    npx systemix update                  Check for and apply SKILL.md updates
    npx systemix list                    Show installed skills and workflows
    npx systemix doctor                  Health check for all dependencies
    npx systemix sync [options]          Sync design tokens and components
    npx systemix schedule [sub]          Schedule workflow runs to off-peak windows
    npx systemix token-profile [dir]     Scan for token inefficiency patterns
    npx systemix tokens                  Convert globals.css → .systemix/tokens.bridge.json
    npx systemix watch                   Continuous Hermes run — watch CSS + poll Figma
    npx systemix social-signal           Log social post metrics into PostHog + hypothesis contract
    npx systemix token-guard [sub]       Manage TokenGuard (status|reset|remove)
    npx systemix evidence [pull|close]   Pull PostHog data + Hermes synthesis → queue

  Workflows (install with: npx systemix workflow add <name>):
    design-system                        Product A — Figma↔code token sync (6 skills)
    hypothesis-validation                Product B — ship → measure → loop (4 skills)
    figma-to-code  (alias: figma)        Full 18-skill pipeline
    token-guard    (alias: guard)        MCP proxy auto-register + token cache layer

  Sync options:
    --dry-run                            Estimate token cost without executing
    --node <name>                        Target a single component by name
    --page <name>                        Target a specific Figma page
    --only tokens|components|styles      Narrow the sync scope
    --incremental                        Only sync nodes changed since last run
    --budget <n>                         Abort if estimated token cost exceeds N
    --file <key>                         Figma file key (overrides project-context.json)
    --schedule <when>                    Defer run to off-peak window

  Examples:
    npx systemix workflow add design-system
    npx systemix workflow add hypothesis-validation
    npx systemix init
    npx systemix sync --dry-run
    npx systemix sync --incremental --budget 20000
    npx systemix watch

  Learn more: https://getsystemix.vercel.app
`;

async function main() {
  switch (command) {
    case "init":
      await init({ reconfigure: args.includes("--reconfigure") });
      break;
    case "config":
      await config(args);
      break;
    case "add":
      await add(args[0]);
      break;
    case "workflow":
      if (args[0] === "add") {
        await add(args[1]);
      } else if (!args[0] || args[0] === "list") {
        await add(undefined);
      } else {
        console.error(`\n  Unknown workflow subcommand: ${args[0]}\n`);
        console.log("  Usage: npx systemix workflow add <name>\n");
        process.exit(1);
      }
      break;
    case "list":
    case "ls":
      list();
      break;
    case "doctor":
      await doctor();
      break;
    case "sync":
      await sync(args);
      break;
    case "token-profile":
      await tokenProfile(args);
      break;
    case "schedule":
      await schedule(args);
      break;
    case "token-guard":
      await tokenGuard(args);
      break;
    case "update":
      await update(args);
      break;
    case "tokens":
      await tokens(args);
      break;
    case "watch":
      await watch(args);
      break;
    case "social-signal":
      await socialSignal(args);
      break;
    case "evidence":
      await evidence(args);
      break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      console.log(HELP);
      break;
    default:
      console.error(`\n  Unknown command: ${command}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch(err => {
  console.error("\n✗", err.message, "\n");
  process.exit(1);
});
