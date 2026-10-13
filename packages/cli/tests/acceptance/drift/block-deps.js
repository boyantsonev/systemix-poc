"use strict";

/**
 * Preload hook for the lazy-bin tests (`node -r block-deps.js bin/cli.js ...`),
 * not a test file. It makes third-party packages "not installed":
 *
 *   SX_BLOCK=gray-matter,foo   those bare specifiers throw MODULE_NOT_FOUND
 *   SX_BLOCK=all               EVERY bare specifier does (only node built-ins
 *                              and relative/absolute paths still load)
 *
 * which is what a checkout without `npm ci` looks like. SX_TRACE=<file> also records
 * every module that got loaded (see the bottom of this file).
 */

const Module = require("module");
const path = require("path");

const spec = process.env.SX_BLOCK ?? "";
const blockAll = spec === "all";
const blocked = new Set(spec.split(",").map((s) => s.trim()).filter(Boolean));
const builtins = new Set(Module.builtinModules);

const originalLoad = Module._load;
Module._load = function load(request, ...rest) {
  const bare = !request.startsWith(".") && !path.isAbsolute(request) && !request.startsWith("node:") && !builtins.has(request);
  if (bare && (blockAll || blocked.has(request) || blocked.has(request.split("/")[0]))) {
    const err = new Error(`Cannot find module '${request}'`);
    err.code = "MODULE_NOT_FOUND";
    throw err;
  }
  return originalLoad.call(this, request, ...rest);
};

// SX_TRACE=<file>: on exit, write the absolute path of every module that was loaded
// (JSON list), so a test can assert what a command did and did not require.
if (process.env.SX_TRACE) {
  const fs = require("fs");
  process.on("exit", () => {
    try {
      fs.writeFileSync(process.env.SX_TRACE, JSON.stringify(Object.keys(require.cache)));
    } catch {
      /* the test will notice a missing file */
    }
  });
}
