#!/usr/bin/env node
"use strict";
// the entry the skills call; the CLI itself is ./bin
require("./bin/product-studio.js").main(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
