"use strict";

/**
 * Shared helpers for the drift acceptance tests (not a test file). Temp repos
 * come from the counters helpers; `capture` records everything a command writes
 * to the console without printing it, and restores process.exitCode.
 */

const fs = require("fs");
const path = require("path");
const { makeRepo, removeRepo } = require("../counters/helpers");

/**
 * Run `fn` with console.log/warn/error recorded.
 * @returns {Promise<{result:any, out:string[], err:string[], exitCode:number|undefined}>}
 */
async function capture(fn) {
  const saved = { log: console.log, warn: console.warn, error: console.error, exitCode: process.exitCode };
  const out = [];
  const err = [];
  const join = (a) => a.map((x) => (typeof x === "string" ? x : String(x))).join(" ");
  console.log = (...a) => out.push(join(a));
  console.warn = (...a) => err.push(join(a));
  console.error = (...a) => err.push(join(a));
  process.exitCode = undefined;
  try {
    const result = await fn();
    return { result, out, err, exitCode: process.exitCode };
  } finally {
    console.log = saved.log;
    console.warn = saved.warn;
    console.error = saved.error;
    process.exitCode = saved.exitCode;
  }
}

const historyFile = (root) => path.join(root, ".systemix", "drift-history.json");
const readJsonFile = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

/** A snapshot as written before the clean-files score (the seven original fields). */
const legacySnapshot = (over = {}) => ({
  runAt: "2026-07-08T18:47:00.000Z",
  triggeredBy: "manual",
  score: 68,
  critical: 7,
  warnings: 4,
  componentsAudited: 182,
  topOffenders: ["src/a.tsx"],
  ...over,
});

module.exports = { makeRepo, removeRepo, capture, historyFile, readJsonFile, legacySnapshot };
