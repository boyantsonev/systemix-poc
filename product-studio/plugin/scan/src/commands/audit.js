"use strict";

/**
 * audit: what a repo's UI already is, so setup can propose a system. Read-only.
 *
 *   audit [<dirs…>] [--primitives <path>…] [--json]
 *
 * Default dirs are the ones of src app components lib packages pages styles that exist.
 * --primitives replaces the default primitive paths (components/ui/, ui/, primitives/).
 * Every number is counted by src/lib/audit; nothing is estimated.
 */

const fs = require("fs");
const path = require("path");
const { parseArgs, last, problems } = require("../lib/args");
const { audit, DEFAULT_DIRS, DEFAULT_PRIMITIVES } = require("../lib/audit");

const USAGE = `
  Usage: audit [<dirs…>] [--primitives <path>…] [--root <dir>] [--json]

    Reads the UI under the dirs (default: those of ${DEFAULT_DIRS.join(" ")} that exist) and
    reports the token source, the literal palette, type scale and spacing, drift by severity,
    duplicate components, primitives, images without alt, the setup class (fresh, partial or
    mature) and the open questions a person has to answer. Writes nothing.
    --primitives <path>   a folder that holds primitives (repeatable; default ${DEFAULT_PRIMITIVES.join(" ")})
`;

async function run(argv, ctx) {
  const parsed = parseArgs(argv, { values: ["--primitives"] });
  if (parsed.help) {
    ctx.out(USAGE);
    return 0;
  }
  const bad = problems(parsed);
  if (bad.length) return ctx.usage(bad.join("; "), USAGE);
  const root = ctx.rootFrom(last(parsed, "--root"));
  const json = parsed.bools.has("--json");
  for (const d of parsed.positional) {
    const abs = path.resolve(root, d);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return ctx.usage(`no such folder: ${d}`, USAGE);
    if (path.relative(root, abs).startsWith("..")) return ctx.usage(`${d} is outside the root`, USAGE);
  }
  const dirs = parsed.positional.map((d) => path.relative(root, path.resolve(root, d)) || ".");
  const r = audit(root, { dirs, primitives: parsed.values["--primitives"] || DEFAULT_PRIMITIVES });
  if (json) {
    ctx.json(r);
    return 0;
  }
  const t = r.tokenSource;
  ctx.out(`  Audit of ${r.dirs.length ? r.dirs.join(", ") : "(no UI folders found)"} · ${r.files.scanned} files (${r.files.ui} UI, ${r.files.styles} styles)`);
  ctx.out(`  Setup class: ${r.setupClass}`);
  ctx.out(`  Token source: ${t.file ? `${t.file} (${t.kind}, ${t.count} tokens)` : "none"}`);
  ctx.out(`  Colours: ${r.palette.length} distinct literal values · ${r.tokenCoverage.colourRefs} uses through tokens, ${r.tokenCoverage.literalColours} raw (share ${r.tokenCoverage.share})`);
  ctx.out(`  Drift: ${r.drift.critical.length} critical, ${r.drift.warning.length} warning, ${r.drift.info.length} info`);
  for (const f of r.drift.critical.slice(0, 5)) ctx.out(`    ✗ ${f.file}:${f.line}  ${f.match}`);
  if (r.drift.critical.length > 5) ctx.out(`    … and ${r.drift.critical.length - 5} more (--json for all)`);
  ctx.out(`  Components: ${r.primitives.length} primitives, ${r.duplicates.length} duplicated (${r.duplicates.map((d) => d.name).join(", ") || "none"})`);
  ctx.out(`  Images: ${r.images.total}, ${r.images.withoutAlt} without alt`);
  if (r.openQuestions.length) {
    ctx.out("  Open questions for a person:");
    r.openQuestions.forEach((q) => ctx.out(`    ? ${q}`));
  }
  return 0;
}

module.exports = { run, USAGE };
