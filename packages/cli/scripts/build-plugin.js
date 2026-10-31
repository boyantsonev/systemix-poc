#!/usr/bin/env node
"use strict";

/**
 * build-plugin.js — generate the Systemix Claude Code plugin + marketplace from this package.
 *
 *   node scripts/build-plugin.js [outDir]     write it (default: <repo>/plugin)
 *   node scripts/build-plugin.js --check      exit 1 if <repo>/plugin is not what a build would write
 *
 * The output is the root of the public plugin repo (getsystemix/systemix):
 *   .claude-plugin/marketplace.json, README.md, LICENSE
 *   plugins/systemix/  plugin.json, .mcp.json, skills/ (from pipelines/design-system + plugin-src),
 *                      scan/ (the read-only subset of this CLI the skills run, copied as-is)
 *
 * Skills are copied from the pipeline with their `npx @getsystemix/cli` calls pointed at the bundled
 * scan, so the plugin and the CLI never disagree on a number. Change the sources here, never the output.
 */

const fs = require("fs");
const path = require("path");

const CLI = path.resolve(__dirname, "..");
const REPO = path.resolve(CLI, "..", "..");
const SRC = path.join(CLI, "plugin-src");
const PIPELINE = path.join(CLI, "pipelines", "design-system", "skills");
const DEFAULT_OUT = path.join(REPO, "plugin");

const PIPELINE_SKILLS = ["readiness-audit", "design-audit", "drift-report", "design-interview", "claude-design-sync"];
const OWN_SKILLS = ["score", "loops", "goal", "next", "gate", "decide"];
const SKILL_NAMES = [...PIPELINE_SKILLS, ...OWN_SKILLS];

// the module graph of `audit counters|report` and `drift scan|history` (checked by the tests: the copy must run alone)
const SCAN_FILES = [
  "src/commands/audit.js",
  "src/commands/drift.js",
  "src/config.js",
  "src/lib/css-parse.js",
  "src/lib/design-source.js",
  "src/lib/layout.js",
  "src/lib/quick-report.js",
  "src/lib/quick-report-recommendations.json",
  "src/lib/rubric-eval.js",
  "src/commands/loops.js",
  "src/lib/loopkit.js",
  ...["index", "context", "counter", "summary", "census", "tokens", "css", "util", "colour", "typography", "exemptions",
    "scale", "primitives", "graph", "tags", "reachability", "guardrails", "markdown", "docs", "decisions", "habit",
    "legibility"].map((n) => `src/lib/counters/${n}.js`),
  ...["readiness-audit", "design-audit", "drift-report"].map((s) => `pipelines/design-system/skills/${s}/rubric.json`),
];

const SCAN_CMD = 'node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js"';

/** Point a pipeline skill at the bundled scan and the plugin's namespace. Order matters: longest phrases first. */
const REWRITES = [
  [/refresh the skill with `npx @getsystemix\/cli audit` \(design-audit alone\) or `npx @getsystemix\/cli workflow add design-system` \(all three audit skills; `update` does not refresh them\); do not run either yourself/g,
    "update the plugin with `/plugin update systemix@systemix`; do not run it yourself"],
  [/refresh the skill with `npx @getsystemix\/cli workflow add design-system` \(`audit` installs design-audit only and `update` does not refresh these skills; do not run it yourself: this audit writes nothing into the audited repo\)/g,
    "update the plugin with `/plugin update systemix@systemix` (do not run it yourself: this audit writes nothing into the audited repo)"],
  [/a CLI release which lists `audit counters`\s+in\s+`npx @getsystemix\/cli --help` is required \(a Systemix checkout has it:\s+`node packages\/cli\/bin\/cli\.js`\)/g,
    "the plugin's scan must run (`" + SCAN_CMD + " --help` lists `audit counters`; if it does not, reinstall the plugin)"],
  [/CLI\s+release which lists `audit counters` in `npx @getsystemix\/cli --help` is required \(a Systemix checkout has it:\s+`node packages\/cli\/bin\/cli\.js`\)/g,
    "the plugin's scan must run (`" + SCAN_CMD + " --help` lists `audit counters`; if it does not, reinstall the plugin)"],
  [/\(`@getsystemix\/cli@<version>`\s+in place of `@getsystemix\/cli`\)/g, "(the same plugin version)"],
  // skills and commands of the full CLI that the plugin does not ship (checked by unshippedRefs below)
  [/\(`\/hermes` if it is installed, else the operator's own review\)/g, "(the operator's own review)"],
  [/\(`\/hermes` if it is installed\)/g, "(the operator's review)"],
  [/\[awaiting approval, \/hermes\]/g, "[awaiting approval]"],
  [/\nthe same way `\/workflow-artifact` does if that skill is installed \(/g, "\n("],
  [/ \(`\/sync-to-figma`\), not this skill/g, " of the Systemix CLI, not this plugin"],
  [/`\/init-experiment` to validate the new direction/g, "`/systemix:goal` to validate the new direction"],
  [/\(`systemix design feed` \/\s+MCP `design_list_proposals` read it\)/g, "(the Systemix CLI's design feed reads it)"],
  [/\(`systemix design feed` \/\s+MCP `design_list_proposals`\)/g, "(the Systemix CLI's design feed)"],
  [/npx @getsystemix\/cli (--help|audit counters|drift scan)/g, `${SCAN_CMD} $1`],
  [new RegExp("(^|[\\s`(\"'])/(" + PIPELINE_SKILLS.join("|") + ")\\b", "gm"), "$1/systemix:$2"],
];

function rewriteSkill(text) {
  let out = text;
  for (const [re, to] of REWRITES) out = out.replace(re, to);
  return out;
}

/** Every `npx @getsystemix/cli` call left in a generated skill must be one the operator runs by choice (init). */
function leftoverCalls(text) {
  return [...text.matchAll(/npx @getsystemix\/cli(?! init)[^`\n]*/g)].map((m) => m[0]);
}

// what a generated skill may name: its own skills, Claude Code's /plugin, and the scan's commands
const BUILTIN_COMMANDS = ["plugin"];
const SCAN_COMMANDS = /^(audit (counters|report)|drift (scan|history)|loops (init|check|status|decisions)|init\b)/;

/** Skill references and `systemix <command>`s in a generated skill that the plugin does not ship. */
function unshippedRefs(text) {
  const refs = [];
  for (const m of text.matchAll(/(^|[\s`("'])\/([a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)?)(?![\w/.-])/gm)) {
    const name = m[2];
    const own = name.startsWith("systemix:") && SKILL_NAMES.includes(name.slice("systemix:".length));
    if (!own && !BUILTIN_COMMANDS.includes(name)) refs.push(`/${name}`);
  }
  for (const m of text.matchAll(/(?:^|[\s`(])systemix ([a-z][a-z-]*(?: [a-z][a-z-]*)?)/gm)) {
    if (!SCAN_COMMANDS.test(m[1])) refs.push(`systemix ${m[1]}`);
  }
  return refs;
}

/** Throw, naming each one, if a generated skill references something the plugin does not ship. */
function assertShipped(rendered) {
  const bad = [];
  for (const [rel, content] of Object.entries(rendered)) {
    if (!/^plugins\/systemix\/skills\/.+\.md$/.test(rel)) continue;
    for (const ref of unshippedRefs(String(content))) bad.push(`${rel}: ${ref}`);
  }
  if (bad.length) throw new Error(`the plugin references what it does not ship:\n  ${bad.join("\n  ")}`);
  return rendered;
}

function files(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p, base) : [path.relative(base, p)];
  });
}

/** The plugin as { relativePath: Buffer|string }, sorted — a pure function of the sources. */
function render() {
  const out = {};
  const put = (rel, content) => (out[rel.split(path.sep).join("/")] = content);
  const P = "plugins/systemix";
  const pkg = JSON.parse(fs.readFileSync(path.join(CLI, "package.json"), "utf8"));
  // one version for the plugin and the scan it carries: the CLI's
  const pluginJson = { ...JSON.parse(fs.readFileSync(path.join(SRC, "plugin.json"), "utf8")), version: pkg.version };
  const license = fs.readFileSync(path.join(REPO, "LICENSE"));
  const readme = fs.readFileSync(path.join(SRC, "README.md"), "utf8");

  put(".claude-plugin/marketplace.json", fs.readFileSync(path.join(SRC, "marketplace.json"), "utf8"));
  put("README.md", readme);
  put("LICENSE", license);
  put(`${P}/.claude-plugin/plugin.json`, JSON.stringify(pluginJson, null, 2) + "\n");
  put(`${P}/.mcp.json`, fs.readFileSync(path.join(SRC, "mcp.json"), "utf8"));
  put(`${P}/.claude-plugin/icon.png`, fs.readFileSync(path.join(SRC, "icon.png")));
  put(`${P}/README.md`, readme);
  put(`${P}/LICENSE`, license);

  for (const skill of PIPELINE_SKILLS) {
    for (const rel of files(path.join(PIPELINE, skill))) {
      const abs = path.join(PIPELINE, skill, rel);
      put(`${P}/skills/${skill}/${rel}`, rel.endsWith(".md") ? rewriteSkill(fs.readFileSync(abs, "utf8")) : fs.readFileSync(abs));
    }
  }
  for (const skill of OWN_SKILLS) {
    for (const rel of files(path.join(SRC, "skills", skill))) put(`${P}/skills/${skill}/${rel}`, fs.readFileSync(path.join(SRC, "skills", skill, rel)));
  }

  for (const rel of SCAN_FILES) put(`${P}/scan/${rel}`, fs.readFileSync(path.join(CLI, rel)));
  // the loop templates `loops init` copies
  for (const rel of files(path.join(CLI, "templates", "loop"))) put(`${P}/scan/templates/loop/${rel}`, fs.readFileSync(path.join(CLI, "templates", "loop", rel)));
  put(`${P}/scan/systemix.js`, fs.readFileSync(path.join(SRC, "systemix.js")));
  put(`${P}/scan/mcp.js`, fs.readFileSync(path.join(SRC, "mcp.js")));
  // the counters report the CLI version as toolVersion; no dependencies, so nothing is installed
  put(`${P}/scan/package.json`, JSON.stringify({ name: "systemix-plugin-scan", version: pkg.version, private: true, license: "MIT" }, null, 2) + "\n");

  return assertShipped(Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1))));
}

function write(outDir, rendered = render()) {
  fs.rmSync(outDir, { recursive: true, force: true });
  for (const [rel, content] of Object.entries(rendered)) {
    const abs = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  }
  return rendered;
}

/** Paths that differ between a directory and a fresh render (missing, extra or changed). */
function diff(dir, rendered = render()) {
  const have = fs.existsSync(dir) ? files(dir).map((p) => p.split(path.sep).join("/")) : [];
  const want = Object.keys(rendered);
  const changed = want.filter((rel) => !have.includes(rel) || !Buffer.from(rendered[rel]).equals(fs.readFileSync(path.join(dir, rel))));
  const extra = have.filter((rel) => !(rel in rendered));
  return [...changed, ...extra].sort();
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes("--check")) {
    const d = diff(DEFAULT_OUT);
    if (d.length) {
      console.error(`plugin/ is out of date (${d.length} files): ${d.slice(0, 10).join(", ")}\nRun: node packages/cli/scripts/build-plugin.js`);
      process.exit(1);
    }
    console.log("plugin/ is up to date");
  } else {
    const outDir = path.resolve(args[0] || DEFAULT_OUT);
    const r = write(outDir);
    console.log(`wrote ${Object.keys(r).length} files to ${path.relative(process.cwd(), outDir) || "."}`);
  }
}

module.exports = { render, write, diff, rewriteSkill, leftoverCalls, unshippedRefs, assertShipped, SCAN_FILES, SKILL_NAMES, DEFAULT_OUT };
