"use strict";

// The reference evaluator now ships in src/lib/rubric-eval.js (the quick-report service
// uses it at runtime). This path stays because the skills' cross-check names it.
const lib = require("../../../src/lib/rubric-eval");

module.exports = lib;

if (require.main === module) lib.main(process.argv.slice(2));
