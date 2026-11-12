"use strict";

/**
 * evidence: whether an analytics source is connected (optional).
 *
 *   evidence check     read design/.studio/analytics.json and check the env vars it names are set
 *
 * The config holds the names of environment variables, never their values:
 *   { "source": "posthog"|"other", "hostEnv": "…", "keyEnv": "…", "projectEnv": "…" }
 * No network call is made; a value is never printed.
 */

const fs = require("fs");
const path = require("path");
const { parseArgs, last, problems } = require("../lib/args");
const { rel: L } = require("../lib/layout");

const CONFIG = `${L.state}/analytics.json`;
const SOURCES = ["posthog", "other"];
const FIELDS = [
  ["hostEnv", "the API host"],
  ["keyEnv", "the read key"],
  ["projectEnv", "the project id"],
];
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const KNOWN = new Set(["source", ...FIELDS.map((f) => f[0])]);

const USAGE = `
  Usage: evidence check [--root <dir>] [--json]

    check   read ${CONFIG} ({"source": "posthog"|"other", "hostEnv", "keyEnv", "projectEnv"}, each
            the NAME of an environment variable) and check that every named variable is set. Makes no
            network call and never prints a value. Exit 1 with what is missing.
`;

function check(root, env) {
  const file = path.join(root, CONFIG);
  if (!fs.existsSync(file)) {
    return { connected: false, source: null, config: CONFIG, problems: [`no ${CONFIG}: no analytics source is connected (it is optional; see the analytics reference to connect one)`] };
  }
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return { connected: false, source: null, config: CONFIG, problems: [`${CONFIG} is not valid JSON`] };
  }
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) return { connected: false, source: null, config: CONFIG, problems: [`${CONFIG} must be a JSON object`] };
  const out = [];
  const source = typeof cfg.source === "string" ? cfg.source : null;
  if (!SOURCES.includes(source)) out.push(`${CONFIG}: source is ${SOURCES.join(" or ")}, not ${source === null ? "missing" : JSON.stringify(source)}`);
  for (const k of Object.keys(cfg).sort()) if (!KNOWN.has(k)) out.push(`${CONFIG}: unknown field ${k} (only source, hostEnv, keyEnv and projectEnv; values belong in env, never in this file)`);
  for (const [field, what] of FIELDS) {
    const name = cfg[field];
    if (typeof name !== "string" || !name.trim()) out.push(`${CONFIG}: ${field} is missing (the name of the env var that holds ${what})`);
    else if (!ENV_NAME.test(name)) out.push(`${CONFIG}: ${field} must be an env var name (letters, digits, _), not a value`);
    else if (env[name] === undefined || String(env[name]).trim() === "") out.push(`${name} is not set (${field}: ${what}); set it in your shell or CI secrets, never in a file`);
  }
  return { connected: out.length === 0, source, config: CONFIG, problems: out };
}

async function run(argv, ctx) {
  const [sub, ...rest] = argv;
  const parsed = parseArgs(rest);
  if (!sub || sub === "help" || parsed.help) {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  if (sub !== "check") return ctx.usage(`unknown evidence subcommand: ${sub}`, USAGE);
  if (parsed.positional.length) return ctx.usage(`evidence check takes no arguments, not ${parsed.positional.join(" ")}`, USAGE);
  const root = ctx.rootFrom(last(parsed, "--root"));
  const r = check(root, ctx.env || {});
  if (parsed.bools.has("--json")) ctx.json(r);
  else if (r.connected) ctx.out(`  ✓ ${r.source} connected: every variable named in ${CONFIG} is set`);
  else {
    ctx.err(`  ✗ not connected${r.source ? ` (${r.source})` : ""}:`);
    r.problems.forEach((p) => ctx.err(`    - ${p}`));
  }
  return r.connected ? 0 : 1;
}

module.exports = { run, check, CONFIG };
