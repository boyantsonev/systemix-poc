"use strict";

/**
 * Shared fixture helpers for the counters acceptance tests (not a test file:
 * jest only runs *.test.js). Every test builds a tiny temp repo, asserts
 * hand-computed values and cleans up — never numbers from the live repo.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { runCounters } = require("../../../src/lib/counters");

/** Create a temp repo from { "rel/path": "contents" }; returns its absolute root. */
function makeRepo(files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sx-counters-"));
  for (const [rel, body] of Object.entries(files)) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, body);
  }
  return root;
}

const removeRepo = (root) => fs.rmSync(root, { recursive: true, force: true });

/** Run the counters (optionally one group) over `root`. */
const run = (root, opts = {}) => runCounters(root, opts);

/** The counter with this id, or undefined. */
const get = (report, id) => report.counters.find((c) => c.id === id);

/** Just the value of a counter (undefined when the id does not exist). */
const val = (report, id) => get(report, id)?.value;

module.exports = { makeRepo, removeRepo, run, get, val };
