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

const [, , command, ...args] = process.argv;

const HELP = `
  systemix — agentic design system ops for Claude Code

  Usage:
    npx systemix init               Interactive setup wizard (run once per project)
    npx systemix add <workflow>      Install a workflow to ~/.claude/skills/
    npx systemix add                List available workflows
    npx systemix update             Check for and apply SKILL.md updates
    npx systemix list               Show installed skills and workflows
    npx systemix doctor             Health check for all dependencies
    npx systemix sync [options]     Sync design tokens and components
    npx systemix schedule [sub]     Schedule workflow runs to off-peak windows
    npx systemix token-profile [dir] Scan for token inefficiency patterns
    npx systemix token-guard [sub]   Manage TokenGuard (status|reset|remove)

  Sync options:
    --dry-run                       Estimate token cost without executing
    --node <name>                   Target a single component by name
    --page <name>                   Target a specific Figma page
    --only tokens|components|styles Narrow the sync scope
    --incremental                   Only sync nodes changed since last run
    --budget <n>                    Abort if estimated token cost exceeds N
    --file <key>                    Figma file key (overrides project-context.json)
    --schedule <when>               Defer run to off-peak window (e.g. "auto", "weekly Mon 06:00")

  Schedule subcommands:
    npx systemix schedule list      List all scheduled systemix runs
    npx systemix schedule clear     Remove all systemix cron entries
    npx systemix schedule run       Schedule a sync run (--when, --command)

  Workflows:
    figma-to-code  (alias: figma)   /figma → /tokens → /component → /storybook → /deploy
    token-guard    (alias: guard)   MCP proxy auto-register + token cache layer

  Examples:
    npx systemix init
    npx systemix add figma
    npx systemix list
    npx systemix doctor
    npx systemix sync --dry-run
    npx systemix sync --incremental --budget 20000
    npx systemix sync --node button-primary --page Components
    npx systemix sync --schedule "weekly Mon 06:00" --incremental
    npx systemix schedule run --when "tonight 22:00"
    npx systemix token-profile ./src

  Learn more: https://systemix-alpha.vercel.app
`;

async function main() {
  switch (command) {
    case "init":
      await init();
      break;
    case "add":
      await add(args[0]);
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
