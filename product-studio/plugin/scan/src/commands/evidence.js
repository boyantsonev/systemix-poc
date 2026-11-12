"use strict";

/**
 * evidence: whether an analytics source is connected (optional).
 *
 *   evidence check     read the "analytics" key of studio/connectors.json (or, when that file has
 *                      none, the older studio/.state/analytics.json) and check the env vars it names are set
 *
 * The config holds the names of environment variables, never their values:
 *   { "source": "posthog"|"other", "hostEnv": "…", "keyEnv": "…", "projectEnv": "…" }
 * No network call is made; a value is never printed.
 */

const fs = require("fs");
const path = require("path");
const { parseArgs, last, problems } = require("../lib/args");
const { rel: L } = require("../lib/layout");

const CONFIG = L.analyticsLegacy;
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

    check   read the "analytics" key of ${L.connectors} (or, when that file has none, the older
            ${CONFIG}): {"source": "posthog"|"other", "hostEnv", "keyEnv", "projectEnv"}, each
            the NAME of an environment variable. Check that every named variable is set. Makes no
            network call and never prints a value. Exit 1 with what is missing.
`;

/** Problems with an analytics config object (`where` prefixes each message); checks env too. */
function validate(cfg, env, where) {
  if (!cfg || typeof cfg !== "object" || Array.isArray(cfg)) return { source: null, problems: [`${where} must be a JSON object`] };
  const out = [];
  const source = typeof cfg.source === "string" ? cfg.source : null;
  if (!SOURCES.includes(source)) out.push(`${where}: source is ${SOURCES.join(" or ")}, not ${source === null ? "missing" : JSON.stringify(source)}`);
  for (const k of Object.keys(cfg).sort()) if (!KNOWN.has(k)) out.push(`${where}: unknown field ${k} (only source, hostEnv, keyEnv and projectEnv; values belong in env, never in this file)`);
  for (const [field, what] of FIELDS) {
    const name = cfg[field];
    if (typeof name !== "string" || !name.trim()) out.push(`${where}: ${field} is missing (the name of the env var that holds ${what})`);
    else if (!ENV_NAME.test(name)) out.push(`${where}: ${field} must be an env var name (letters, digits, _), not a value`);
    else if (env[name] === undefined || String(env[name]).trim() === "") out.push(`${name} is not set (${field}: ${what}); set it in your shell or CI secrets, never in a file`);
  }
  return { source, problems: out };
}

const readJson = (file) => {
  try {
    return { ok: true, value: JSON.parse(fs.readFileSync(file, "utf8")) };
  } catch {
    return { ok: false };
  }
};

/** Where the analytics config lives: connectors.json's "analytics" key first, then the older file. */
function locate(root) {
  const connectors = path.join(root, L.connectors);
  if (fs.existsSync(connectors)) {
    const j = readJson(connectors);
    if (!j.ok) return { config: L.connectors, problem: `${L.connectors} is not valid JSON` };
    if (j.value && typeof j.value === "object" && !Array.isArray(j.value) && "analytics" in j.value) return { config: L.connectors, where: `${L.connectors} analytics`, cfg: j.value.analytics };
  }
  const legacy = path.join(root, CONFIG);
  if (fs.existsSync(legacy)) {
    const j = readJson(legacy);
    if (!j.ok) return { config: CONFIG, problem: `${CONFIG} is not valid JSON` };
    return { config: CONFIG, where: CONFIG, cfg: j.value };
  }
  return { config: L.connectors, none: true };
}

function check(root, env) {
  const at = locate(root);
  if (at.none) {
    return {
      connected: false,
      source: null,
      config: at.config,
      problems: [`no analytics source is connected: no "analytics" key in ${L.connectors} and no ${CONFIG} (it is optional; see the analytics reference to connect one)`],
    };
  }
  if (at.problem) return { connected: false, source: null, config: at.config, problems: [at.problem] };
  const v = validate(at.cfg, env, at.where);
  return { connected: v.problems.length === 0, source: v.source, config: at.config, problems: v.problems };
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
  else if (r.connected) ctx.out(`  ✓ ${r.source} connected: every variable named in ${r.config} is set`);
  else {
    ctx.err(`  ✗ not connected${r.source ? ` (${r.source})` : ""}:`);
    r.problems.forEach((p) => ctx.err(`    - ${p}`));
  }
  return r.connected ? 0 : 1;
}

module.exports = { run, check, validate, locate, CONFIG, SOURCES };
