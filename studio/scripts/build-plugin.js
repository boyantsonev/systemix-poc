#!/usr/bin/env node
"use strict";

/**
 * build-plugin.js: generate the product-studio Claude Code plugin from studio/.
 *
 *   node scripts/build-plugin.js [outDir]   write it (default: studio/plugin)
 *   node scripts/build-plugin.js --check    exit 1 if studio/plugin is not what a build would write
 *
 * Output (the plugin root):
 *   .claude-plugin/plugin.json, README.md, LICENSE
 *   skills/      plugin-src/skills with {{PLUGIN}} {{CLI}} {{ROOT}} filled in
 *   bin/ src/ rubric/ templates/ namespace.json package.json   the CLI, copied as-is
 *   scan/product-studio.js                                      the entry the skills call
 *
 * The build refuses (exit 1) when a skill names a plugin path that does not exist, uses ../,
 * calls a CLI command the CLI does not have, leaves a {{…}} unfilled, or when any shipped file
 * carries a brand, client or product name (the leak-grep). Change the sources, never the output.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const STUDIO = path.resolve(__dirname, "..");
const ns = require(path.join(STUDIO, "namespace.json"));
const pkg = require(path.join(STUDIO, "package.json"));
const DEFAULT_OUT = path.join(STUDIO, "plugin");
const PERSON_ONLY = ["loop", "admin"];
const COMMANDS = ["setup", "brief", "check", "loop", "admin"];
const CLI_COPY = ["bin", "src", "rubric", "templates", "namespace.json"];

const FILL = {
  "{{PLUGIN}}": ns.plugin,
  "{{CLI}}": `node "\${CLAUDE_PLUGIN_ROOT}/scan/${ns.bin}.js"`,
  "{{ROOT}}": "${CLAUDE_PLUGIN_ROOT}",
  "{{REPO}}": ns.repo,
  "{{MARKETPLACE}}": ns.marketplace,
};

// Literal strings no shipped file may carry, each with the only files allowed to name it.
const LEAKS = [
  ["systemix", /(^|\/)(migrate\.(js|md)|layout\.js)$/],
  ["getsystemix", null],
  ["hermes", null],
  ["hellobill", null],
  ["--bill-", null],
  ["vero", null],
  ["vito", null],
  ["contract/", null],
  ["experiments/", /(^|\/)(migrate\.(js|md)|layout\.js)$/],
  ["guardrails.mdx", /(^|\/)(migrate\.(js|md)|layout\.js|setup\/SKILL\.md)$/],
  ["localhost:", null],
  ["posthog", /(^|\/)(analytics\.md|evidence\.js|context-pack\.md)$/],
  ["app.notion.com", null],
  ["claude.ai/artifact", null],
];

function walk(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p, base) : [path.relative(base, p).split(path.sep).join("/")];
  }).sort();
}

const fill = (text) => Object.entries(FILL).reduce((t, [k, v]) => t.split(k).join(v), text);

/** Build into outDir; returns { files, problems }. */
function build(outDir) {
  const problems = [];
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const put = (rel, content) => {
    const p = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  };

  // the CLI, as-is
  for (const entry of CLI_COPY) {
    const src = path.join(STUDIO, entry);
    if (!fs.existsSync(src)) continue;
    if (fs.statSync(src).isDirectory()) for (const f of walk(src)) put(`${entry}/${f}`, fs.readFileSync(path.join(src, f)));
    else put(entry, fs.readFileSync(src));
  }
  put("package.json", JSON.stringify({ name: pkg.name, version: pkg.version, private: true, license: pkg.license, bin: pkg.bin }, null, 2) + "\n");
  put(`scan/${ns.bin}.js`, `#!/usr/bin/env node\n"use strict";\n// the entry the skills call; the CLI itself is ../bin\nrequire("../bin/${ns.bin}.js").main(process.argv.slice(2)).then((code) => {\n  process.exitCode = code;\n});\n`);

  // the skills
  const skillsSrc = path.join(STUDIO, "plugin-src", "skills");
  for (const f of walk(skillsSrc)) {
    const raw = fs.readFileSync(path.join(skillsSrc, f), "utf8");
    put(`skills/${f}`, f.endsWith(".md") ? fill(raw) : raw);
  }
  for (const c of COMMANDS) if (!fs.existsSync(path.join(outDir, "skills", c, "SKILL.md"))) problems.push(`skills/${c}/SKILL.md is missing`);

  put(".claude-plugin/plugin.json", JSON.stringify({
    name: ns.plugin,
    version: pkg.version,
    description: pkg.description,
    author: { name: ns.org },
    license: pkg.license,
    repository: `https://github.com/${ns.repo}`,
    keywords: ["design-system", "rules", "product", "claude-code"],
  }, null, 2) + "\n");
  for (const f of ["README.md", "LICENSE"]) {
    const src = path.join(STUDIO, "plugin-src", f);
    if (fs.existsSync(src)) put(f, fill(fs.readFileSync(src, "utf8")));
    else problems.push(`plugin-src/${f} is missing`);
  }

  problems.push(...verify(outDir));
  return { files: walk(outDir), problems };
}

/** The structural checks, on a built plugin. */
function verify(outDir) {
  const problems = [];
  const { COMMANDS: cliCommands } = require(path.join(outDir, "src", "commands", "index.js"));
  const skillFiles = walk(path.join(outDir, "skills")).filter((f) => f.endsWith(".md"));
  for (const f of skillFiles) {
    const text = fs.readFileSync(path.join(outDir, "skills", f), "utf8");
    const at = `skills/${f}`;
    if (/\{\{[A-Z_]+\}\}/.test(text)) problems.push(`${at}: an unfilled ${text.match(/\{\{[A-Z_]+\}\}/)[0]}`);
    if (/(^|[\s(`"'])\.\.\//m.test(text)) problems.push(`${at}: a ../ path (name files by \${CLAUDE_PLUGIN_ROOT}/…)`);
    for (const m of text.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([A-Za-z0-9_./-]+)/g)) {
      const p = m[1].replace(/[.,;:)]+$/, "");
      if (!fs.existsSync(path.join(outDir, p))) problems.push(`${at}: names \${CLAUDE_PLUGIN_ROOT}/${p}, which the plugin does not have`);
    }
    for (const m of text.matchAll(new RegExp(`scan/${ns.bin}\\.js"\\s+([a-z][a-z-]*)`, "g"))) {
      if (!Object.prototype.hasOwnProperty.call(cliCommands, m[1])) problems.push(`${at}: calls \`${ns.bin} ${m[1]}\`, which the CLI does not have`);
    }
  }
  for (const c of PERSON_ONLY) {
    const p = path.join(outDir, "skills", c, "SKILL.md");
    if (fs.existsSync(p) && !/^disable-model-invocation:\s*true\s*$/m.test(fs.readFileSync(p, "utf8").split(/^---$/m)[1] || "")) {
      problems.push(`skills/${c}/SKILL.md: a person-only command needs disable-model-invocation: true`);
    }
  }
  for (const f of walk(outDir)) {
    if (/\.(png|jpg|ico|woff2?)$/.test(f)) continue;
    const lower = fs.readFileSync(path.join(outDir, f), "utf8").toLowerCase();
    for (const [word, allowed] of LEAKS) {
      if (lower.includes(word) && !(allowed && allowed.test(f))) problems.push(`${f}: carries "${word}" (leak-grep)`);
    }
  }
  return problems;
}

function main(argv) {
  const check = argv.includes("--check");
  const out = check ? fs.mkdtempSync(path.join(os.tmpdir(), "ps-plugin-")) : path.resolve(argv.find((a) => !a.startsWith("--")) || DEFAULT_OUT);
  const { files, problems } = build(out);
  if (problems.length) {
    console.error(problems.map((p) => `  ✗ ${p}`).join("\n"));
    console.error(`\n  ✗ the plugin build has ${problems.length} problem${problems.length === 1 ? "" : "s"}`);
    return 1;
  }
  if (check) {
    const have = walk(DEFAULT_OUT);
    const differ = [...new Set([...have, ...files])].filter((f) => {
      const a = path.join(DEFAULT_OUT, f);
      const b = path.join(out, f);
      return !fs.existsSync(a) || !fs.existsSync(b) || !fs.readFileSync(a).equals(fs.readFileSync(b));
    });
    fs.rmSync(out, { recursive: true, force: true });
    if (differ.length) {
      console.error(`  ✗ studio/plugin is out of date (${differ.length} files): run npm run build:plugin\n${differ.slice(0, 20).map((f) => `    ${f}`).join("\n")}`);
      return 1;
    }
    console.log(`  ✓ studio/plugin is up to date (${files.length} files)`);
    return 0;
  }
  console.log(`  ✓ built ${files.length} files into ${path.relative(process.cwd(), out) || out}`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { build, verify, LEAKS, FILL };
