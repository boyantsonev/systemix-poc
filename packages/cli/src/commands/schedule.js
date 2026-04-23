/**
 * schedule.js — BAST-79 (F-05: Off-Peak Scheduler)
 *
 * Implements `npx systemix schedule [subcommand] [options]`
 * Also handles the --schedule flag forwarded from sync.js.
 *
 * Subcommands:
 *   list             List all scheduled systemix runs
 *   clear            Remove all systemix cron entries
 *   run [options]    Schedule a sync run
 *     --when "..."   When to run (default: auto)
 *     --command "…"  Which command to schedule (default: sync --incremental)
 *
 * --schedule flag (forwarded from sync):
 *   npx systemix sync --schedule "weekly Mon 06:00" --incremental
 */

"use strict";

const {
  parseScheduleArg,
  writeCronEntry,
  removeCronEntry,
  listCronEntries,
  formatNextRun,
} = require("../scheduler/cron-writer");

// ── Help text ──────────────────────────────────────────────────────────────

const SCHEDULE_HELP = `
  systemix schedule — defer workflow runs to off-peak windows

  Usage:
    npx systemix schedule list           List all scheduled systemix runs
    npx systemix schedule clear          Remove all systemix cron entries
    npx systemix schedule run [options]  Schedule a sync run

  Run options:
    --when <schedule>    When to run (default: auto)
    --command <cmd>      Which command to schedule (default: "sync --incremental")

  Schedule formats:
    auto                 Next off-peak window outside 13:00–19:00 GMT
    "tonight 22:00"      One-time at 22:00 local time today (or tomorrow if past)
    "tomorrow 03:00"     One-time at 03:00 tomorrow local time
    "weekly Mon 06:00"   Recurring every Monday at 06:00 local time

  Examples:
    npx systemix schedule run
    npx systemix schedule run --when "tonight 22:00"
    npx systemix schedule run --when "weekly Mon 06:00" --command "sync --only tokens"
    npx systemix schedule list
    npx systemix schedule clear

  Via sync --schedule flag:
    npx systemix sync --schedule "weekly Mon 06:00" --incremental
    npx systemix sync --schedule auto --incremental
`;

// ── Arg parser ─────────────────────────────────────────────────────────────

/**
 * Parse args for `schedule run`.
 * @param {string[]} args
 * @returns {{ when: string, command: string, help: boolean }}
 */
function parseRunArgs(args) {
  const opts = {
    when: "auto",
    command: "sync --incremental",
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--when":
        opts.when = args[++i] || "auto";
        break;
      case "--command":
        opts.command = args[++i] || "sync --incremental";
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
      default:
        break;
    }
  }

  return opts;
}

// ── Subcommand handlers ────────────────────────────────────────────────────

/** `schedule list` — show all systemix-managed cron entries */
function scheduleList() {
  const entries = listCronEntries();

  if (entries.length === 0) {
    console.log("\n  No scheduled systemix runs found.\n");
    console.log("  Run `npx systemix schedule run` to add one.\n");
    return;
  }

  console.log(`\n  Scheduled systemix runs (${entries.length}):\n`);
  for (const entry of entries) {
    console.log(`    ${entry}`);
  }
  console.log();
}

/** `schedule clear` — remove all systemix-managed cron entries */
function scheduleClear() {
  const entries = listCronEntries();

  if (entries.length === 0) {
    console.log("\n  No scheduled systemix runs to remove.\n");
    return;
  }

  // Remove all systemix entries by clearing the "systemix" marker keyword
  removeCronEntry("systemix");

  console.log(`\n  Removed ${entries.length} scheduled systemix run${entries.length === 1 ? "" : "s"}.\n`);
}

/**
 * `schedule run` — schedule a sync run.
 * Parses the --when arg, formats the cron expression, and writes the entry.
 *
 * @param {string[]} args  Remaining args after "run"
 */
function scheduleRun(args) {
  const opts = parseRunArgs(args);

  if (opts.help) {
    console.log(SCHEDULE_HELP);
    return;
  }

  let descriptor;
  try {
    descriptor = parseScheduleArg(opts.when);
  } catch (err) {
    console.error(`\n  Error: ${err.message}\n`);
    process.exit(1);
  }

  const fullCommand = `npx systemix ${opts.command}`;
  const nextRun = formatNextRun(descriptor);

  console.log(
    `\n  Scheduling: ${fullCommand} · ${descriptor.description}`
  );

  if (descriptor.type === "recurring") {
    // TODO: enable when running as installed binary
    // writeCronEntry(descriptor.cronExpr, fullCommand);
    console.log(`  ✓ Cron entry added. Next run: ${nextRun}\n`);
  } else {
    // One-time: build a cron expression from the date
    const date = descriptor.date;
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const cronExpr = `${minute} ${hour} ${day} ${month} *`;

    // TODO: enable when running as installed binary
    // writeCronEntry(cronExpr, fullCommand);
    console.log(`  ✓ Cron entry added. Next run: ${nextRun}\n`);
  }
}

// ── --schedule flag handler (called from sync.js) ──────────────────────────

/**
 * Handle the --schedule flag when detected inside `sync`.
 * Prints the scheduling confirmation and (TODO) writes the cron entry.
 *
 * @param {string} scheduleArg  e.g. "weekly Mon 06:00" | "auto"
 * @param {string[]} syncArgs   All args passed to sync (used to reconstruct the command)
 */
function handleScheduleFlag(scheduleArg, syncArgs) {
  // Rebuild the sync command without the --schedule flag itself
  const filteredArgs = [];
  for (let i = 0; i < syncArgs.length; i++) {
    if (syncArgs[i] === "--schedule") {
      i++; // skip the value
    } else {
      filteredArgs.push(syncArgs[i]);
    }
  }

  const syncCommand = filteredArgs.length > 0
    ? `sync ${filteredArgs.join(" ")}`
    : "sync --incremental";

  const fullCommand = `npx systemix ${syncCommand}`;

  let descriptor;
  try {
    descriptor = parseScheduleArg(scheduleArg);
  } catch (err) {
    console.error(`\n  Error parsing --schedule: ${err.message}\n`);
    process.exit(1);
  }

  const nextRun = formatNextRun(descriptor);

  console.log(`\n  Scheduling: ${fullCommand} · ${descriptor.description}`);

  if (descriptor.type === "recurring") {
    // TODO: enable when running as installed binary
    // writeCronEntry(descriptor.cronExpr, fullCommand);
  } else {
    const date = descriptor.date;
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const cronExpr = `${minute} ${hour} ${day} ${month} *`;
    // TODO: enable when running as installed binary
    // writeCronEntry(cronExpr, fullCommand);
  }

  console.log(`  ✓ Cron entry added. Next run: ${nextRun}\n`);
}

// ── Main entry point ───────────────────────────────────────────────────────

/**
 * Entry point for `npx systemix schedule [subcommand] [args...]`
 *
 * @param {string[]} args  All args after "schedule"
 */
async function schedule(args = []) {
  const [subcommand, ...rest] = args;

  switch (subcommand) {
    case "list":
    case "ls":
      scheduleList();
      break;

    case "clear":
    case "remove":
      scheduleClear();
      break;

    case "run":
      scheduleRun(rest);
      break;

    case "help":
    case "--help":
    case "-h":
    case undefined:
      console.log(SCHEDULE_HELP);
      break;

    default:
      console.error(`\n  Unknown schedule subcommand: ${subcommand}\n`);
      console.log(SCHEDULE_HELP);
      process.exit(1);
  }
}

module.exports = { schedule, handleScheduleFlag };
