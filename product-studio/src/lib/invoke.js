"use strict";

// Run another command in-process and take its JSON: invoke(ctx, ["rules", "lint"]) → { code, json, stdout, stderr }.
// `--json` and `--root <ctx.root>` are added. Used by admin eval, score and proposals apply,
// so a number is computed once, by the command that owns it.

const { makeCtx } = require("./ctx");

async function invoke(ctx, argv) {
  const { load } = require("../commands");
  const out = [];
  const err = [];
  const sub = makeCtx({ cwd: ctx.root, now: ctx.now, env: ctx.env, stdin: "", out: (s = "") => out.push(String(s)), err: (s = "") => err.push(String(s)) });
  let code;
  try {
    code = await load(argv[0]).run([...argv.slice(1), "--json", "--root", ctx.root], sub);
  } catch (e) {
    err.push(e.message);
    code = 1;
  }
  const stdout = out.join("\n");
  let json = null;
  try {
    json = JSON.parse(stdout);
  } catch {
    json = null;
  }
  return { code: typeof code === "number" ? code : 0, json, stdout, stderr: err.join("\n") };
}

module.exports = { invoke };
