/**
 * cron-writer.js — BAST-79 (F-05: Off-Peak Scheduler)
 *
 * Utilities for parsing schedule strings and writing cron/launchd entries.
 * Peak hours are defined as 13:00–19:00 GMT (Claude Pro rate limits apply).
 *
 * Exported:
 *   parsePeakWindow()       → { start: 13, end: 19 }
 *   isOffPeak(date?)        → boolean
 *   nextOffPeakWindow()     → Date (within next 24h, outside peak window)
 *   parseScheduleArg(arg)   → { type, date?, cronExpr?, description }
 *   writeCronEntry(expr, cmd)
 *   removeCronEntry(cmd)
 *   listCronEntries(cmd?)
 */

"use strict";

const { execSync, spawnSync } = require("child_process");

// ── Peak window definition ─────────────────────────────────────────────────

/** Returns the peak window in GMT hours (inclusive start, exclusive end). */
function parsePeakWindow() {
  return { start: 13, end: 19 };
}

/**
 * Returns true if the given Date (default: now) is outside the peak window.
 * Peak = 13:00–19:00 GMT.
 */
function isOffPeak(date = new Date()) {
  const gmtHour = date.getUTCHours();
  const { start, end } = parsePeakWindow();
  return gmtHour < start || gmtHour >= end;
}

/**
 * Returns the next Date (within the next 24 hours) that falls outside
 * the 13:00–19:00 GMT peak window.
 *
 * Strategy: walk forward in 1-minute steps from now until isOffPeak().
 * In practice this resolves quickly (at most ~6h * 60 = 360 iterations).
 */
function nextOffPeakWindow() {
  const now = new Date();
  if (isOffPeak(now)) return now;

  // Advance to the next off-peak minute
  const candidate = new Date(now);
  // Round up to the next whole minute
  candidate.setSeconds(0, 0);
  candidate.setMinutes(candidate.getMinutes() + 1);

  const limit = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  while (candidate < limit) {
    if (isOffPeak(candidate)) return candidate;
    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  // Fallback: 03:00 UTC tomorrow (always off-peak)
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(3, 0, 0, 0);
  return tomorrow;
}

// ── Schedule string parser ─────────────────────────────────────────────────

const DAY_MAP = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

/**
 * Parse a human-readable schedule string into a schedule descriptor.
 *
 * Supported formats:
 *   "auto"              → next off-peak window (one-time Date)
 *   "tonight HH:MM"     → today at HH:MM local (tomorrow if already past)
 *   "tomorrow HH:MM"    → tomorrow at HH:MM local
 *   "weekly DAY HH:MM"  → cron expression e.g. "0 6 * * 1"
 *
 * Returns:
 *   { type: 'once',      date: Date,   description: string }
 *   { type: 'recurring', cronExpr: string, description: string }
 */
function parseScheduleArg(arg) {
  if (!arg || typeof arg !== "string") {
    throw new Error(`Invalid schedule argument: ${arg}`);
  }

  const trimmed = arg.trim().toLowerCase();

  // ── "auto" ──────────────────────────────────────────────────────────────
  if (trimmed === "auto") {
    const date = nextOffPeakWindow();
    return {
      type: "once",
      date,
      description: `auto · next off-peak window (${formatDateTime(date)} local)`,
    };
  }

  // ── "weekly DAY HH:MM" ───────────────────────────────────────────────────
  const weeklyMatch = trimmed.match(/^weekly\s+(\w+)\s+(\d{1,2}):(\d{2})$/);
  if (weeklyMatch) {
    const dayStr = weeklyMatch[1];
    const hour = parseInt(weeklyMatch[2], 10);
    const minute = parseInt(weeklyMatch[3], 10);

    const dayNum = DAY_MAP[dayStr];
    if (dayNum === undefined) {
      throw new Error(`Unknown day "${dayStr}". Use: Mon, Tue, Wed, Thu, Fri, Sat, Sun`);
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(`Invalid time ${weeklyMatch[2]}:${weeklyMatch[3]}`);
    }

    const cronExpr = `${minute} ${hour} * * ${dayNum}`;
    const dayName = dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
    return {
      type: "recurring",
      cronExpr,
      description: `weekly ${dayName} ${pad2(hour)}:${pad2(minute)}`,
    };
  }

  // ── "tonight HH:MM" ─────────────────────────────────────────────────────
  const tonightMatch = trimmed.match(/^tonight\s+(\d{1,2}):(\d{2})$/);
  if (tonightMatch) {
    const hour = parseInt(tonightMatch[1], 10);
    const minute = parseInt(tonightMatch[2], 10);
    validateTime(hour, minute);

    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    // If already past, schedule for tomorrow
    if (date <= new Date()) {
      date.setDate(date.getDate() + 1);
    }

    return {
      type: "once",
      date,
      description: `tonight ${pad2(hour)}:${pad2(minute)} · ${formatDate(date)}`,
    };
  }

  // ── "tomorrow HH:MM" ────────────────────────────────────────────────────
  const tomorrowMatch = trimmed.match(/^tomorrow\s+(\d{1,2}):(\d{2})$/);
  if (tomorrowMatch) {
    const hour = parseInt(tomorrowMatch[1], 10);
    const minute = parseInt(tomorrowMatch[2], 10);
    validateTime(hour, minute);

    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(hour, minute, 0, 0);

    return {
      type: "once",
      date,
      description: `tomorrow ${pad2(hour)}:${pad2(minute)} · ${formatDate(date)}`,
    };
  }

  throw new Error(
    `Cannot parse schedule: "${arg}"\n` +
    `  Supported: "auto" | "tonight HH:MM" | "tomorrow HH:MM" | "weekly Mon HH:MM"`
  );
}

// ── Crontab read/write ─────────────────────────────────────────────────────

const SYSTEMIX_MARKER = "# systemix-managed";

/**
 * Read existing crontab as a string. Returns "" if no crontab exists.
 */
function readCrontab() {
  try {
    const result = spawnSync("crontab", ["-l"], { encoding: "utf8" });
    // Exit code 1 with "no crontab for user" means empty — treat as ""
    if (result.status !== 0) return "";
    return result.stdout || "";
  } catch {
    return "";
  }
}

/**
 * Write a new crontab from a string.
 * Uses echo-pipe to avoid temp files.
 */
function writeCrontab(content) {
  // TODO: enable when running as installed binary
  const result = spawnSync("crontab", ["-"], {
    input: content,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`crontab write failed: ${result.stderr || "(unknown error)"}`);
  }
}

/**
 * Append a cron entry for the given command.
 * Adds a systemix-managed marker so entries can be listed/removed later.
 *
 * @param {string} cronExpr  e.g. "0 22 * * *"
 * @param {string} command   e.g. "npx systemix sync --incremental"
 */
function writeCronEntry(cronExpr, command) {
  const existing = readCrontab();
  const entry = `${cronExpr} ${command} ${SYSTEMIX_MARKER}`;

  // Avoid duplicates
  if (existing.includes(entry)) return;

  const newContent = existing.endsWith("\n") || existing === ""
    ? existing + entry + "\n"
    : existing + "\n" + entry + "\n";

  // TODO: enable when running as installed binary
  writeCrontab(newContent);
}

/**
 * Remove all cron entries that contain the given command string
 * and are tagged with the systemix marker.
 *
 * @param {string} command  The command substring to match.
 */
function removeCronEntry(command) {
  const existing = readCrontab();
  if (!existing) return;

  const lines = existing.split("\n").filter(
    line => !(line.includes(command) && line.includes(SYSTEMIX_MARKER))
  );

  // TODO: enable when running as installed binary
  writeCrontab(lines.join("\n"));
}

/**
 * List all systemix-managed cron entries.
 * If command is provided, filters to entries containing that command.
 *
 * @param {string} [command]  Optional command filter.
 * @returns {string[]}        Array of cron entry lines.
 */
function listCronEntries(command) {
  const existing = readCrontab();
  if (!existing) return [];

  return existing
    .split("\n")
    .filter(line => {
      if (!line.includes(SYSTEMIX_MARKER)) return false;
      if (command && !line.includes(command)) return false;
      return true;
    });
}

// ── Date helpers ───────────────────────────────────────────────────────────

function pad2(n) {
  return String(n).padStart(2, "0");
}

function validateTime(hour, minute) {
  if (hour < 0 || hour > 23) throw new Error(`Invalid hour: ${hour}`);
  if (minute < 0 || minute > 59) throw new Error(`Invalid minute: ${minute}`);
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(date) {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format a Date as "Monday 06:00" (day-of-week + local time).
 * Used in confirmation output.
 */
function formatNextRun(descriptor) {
  if (descriptor.type === "once" && descriptor.date) {
    return descriptor.date.toLocaleString("en-US", {
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  if (descriptor.type === "recurring") {
    // Parse the cron expression for a human label
    return descriptor.description;
  }
  return "(unknown)";
}

// ── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  parsePeakWindow,
  isOffPeak,
  nextOffPeakWindow,
  parseScheduleArg,
  writeCronEntry,
  removeCronEntry,
  listCronEntries,
  formatNextRun,
};
