"use strict";

/**
 * Preload hook for the dispatch tests (`node -r stub-commands.js bin/cli.js ...`),
 * not a test file. Every `require("../src/...")` made by bin/cli.js returns a stub
 * whose functions only record that they were called, so a test sees exactly what
 * the bin dispatched: which module was required, which export was called, and with
 * which arguments. Nothing a command does for real runs.
 *
 *   SX_BIN             absolute path of bin/cli.js (only requires made by it are stubbed)
 *   SX_DISPATCH_OUT    file the record is written to on exit: { required: [...], calls: [...] }
 *
 * An `undefined` argument is recorded as the string "__undefined__" (JSON would
 * turn it into null and lose the difference between `add()` and `add(null)`).
 */

const fs = require("fs");
const Module = require("module");

const bin = process.env.SX_BIN;
const required = [];
const calls = [];

const originalLoad = Module._load;
Module._load = function load(request, parent, ...rest) {
  if (parent && parent.filename === bin && request.startsWith("../src/")) {
    required.push(request);
    return new Proxy({}, {
      get: (_, name) => (typeof name === "string" ? (...args) => { calls.push({ module: request, fn: name, args }); } : undefined),
    });
  }
  return originalLoad.call(this, request, parent, ...rest);
};

process.on("exit", () => {
  const replacer = (_, v) => (v === undefined ? "__undefined__" : v);
  try {
    fs.writeFileSync(process.env.SX_DISPATCH_OUT, JSON.stringify({ required, calls }, replacer));
  } catch {
    /* the test will notice a missing file */
  }
});
