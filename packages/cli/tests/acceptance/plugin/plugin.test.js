"use strict";

/**
 * The Claude Code plugin (scripts/build-plugin.js → <repo>/plugin): the committed output is what
 * a build writes, it is four commands (G-005 E1), it sends nothing anywhere (E2), the loop is a
 * person's command (E4), every reference is shipped (E5), and the bundled scan runs on its own
 * outside this package, the rules check included (E3).
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { render, write, diff, leftoverCalls, unshippedRefs, assertShipped, SKILL_NAMES, DEFAULT_OUT } = require("../../../scripts/build-plugin");
const { makeRepo, removeRepo } = require("../counters/helpers");

const P = "plugins/systemix";
const rendered = render();
const text = (rel) => Buffer.from(rendered[rel]).toString("utf8");

describe("plugin build", () => {
  test("the committed plugin/ is exactly what a build writes (run scripts/build-plugin.js)", () => {
    expect(diff(DEFAULT_OUT, rendered)).toEqual([]);
  });

  test("ships exactly four commands: setup, brief, check, loop (G-005 E1)", () => {
    const skills = new Set(Object.keys(rendered).filter((r) => /^plugins\/systemix\/skills\/[^/]+\/SKILL\.md$/.test(r)).map((r) => r.split("/")[3]));
    expect([...skills].sort()).toEqual(["brief", "check", "loop", "setup"]);
    expect(Object.keys(rendered).filter((r) => r.startsWith(`${P}/skills/`) && r.endsWith("/SKILL.md") && r.split("/").length > 5)).toEqual([]);
  });

  test("ships every skill, each named after its folder", () => {
    for (const name of SKILL_NAMES) {
      const body = text(`${P}/skills/${name}/SKILL.md`);
      expect(body).toMatch(new RegExp(`^---\\n(?:.*\\n)*?name: ${name}\\n`));
    }
  });

  test("skills call the bundled scan, not npx (init, run by the operator, is the only npx left)", () => {
    for (const rel of Object.keys(rendered).filter((r) => r.startsWith(`${P}/skills/`) && r.endsWith(".md"))) {
      expect([rel, leftoverCalls(text(rel))]).toEqual([rel, []]);
    }
    expect(text(`${P}/skills/check/references/readiness-audit/guide.md`)).toContain('node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" audit counters');
    expect(text(`${P}/skills/check/references/drift-report/guide.md`)).toContain('node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" drift scan');
    expect(text(`${P}/skills/check/references/readiness-audit/guide.md`)).not.toMatch(/^---\nname:/);
  });

  test("a skill that references an unshipped skill or command fails the build, naming it (G-003 E8)", () => {
    const skill = `${P}/skills/check/SKILL.md`;
    const bad = { ...rendered, [skill]: "Next: `/hermes`, then run `systemix design feed`; /systemix:loop is fine, /tmp/x.json is a path." };
    expect(() => assertShipped(bad)).toThrow(/plugins\/systemix\/skills\/check\/SKILL\.md: \/hermes/);
    expect(() => assertShipped(bad)).toThrow(/check\/SKILL\.md: systemix design feed/);
    expect(unshippedRefs("/systemix:loop, /plugin update, `systemix loops check`, `systemix rules eval`, design/goals, /tmp/c.json")).toEqual([]);
    expect(unshippedRefs("/systemix:gate, /systemix:score and /init-experiment")).toEqual(["/systemix:gate", "/systemix:score", "/init-experiment"]);
  });

  test("the shipped skills reference only what the plugin ships", () => {
    for (const rel of Object.keys(rendered).filter((r) => r.startsWith(`${P}/skills/`) && r.endsWith(".md"))) {
      expect([rel, unshippedRefs(text(rel))]).toEqual([rel, []]);
    }
  });

  test("sends nothing anywhere: no MCP server, no settings, no network call (G-005 E2)", () => {
    const manifest = JSON.parse(text(`${P}/.claude-plugin/plugin.json`));
    expect(manifest.name).toBe("systemix");
    expect(manifest.userConfig).toBeUndefined();
    expect(manifest.mcpServers).toBeUndefined();
    expect(Object.keys(rendered).filter((r) => /\.mcp\.json$|scan\/mcp\.js$/.test(r))).toEqual([]);
    const code = Object.keys(rendered).filter((r) => r.endsWith(".js"));
    const net = code.filter((r) => /\bfetch\s*\(|require\(["'](node:)?https?["']\)|XMLHttpRequest|\.request\(/.test(text(r)));
    expect(net).toEqual([]);
  });

  test("this repo's own marketplace (the development channel) lists the same plugin from plugin/", () => {
    const repoRoot = path.resolve(__dirname, "../../../../..");
    const dev = JSON.parse(fs.readFileSync(path.join(repoRoot, ".claude-plugin/marketplace.json"), "utf8"));
    const pub = JSON.parse(text(".claude-plugin/marketplace.json"));
    expect(dev.name).toBe(pub.name);
    expect(dev.plugins.map((p) => p.name)).toEqual(pub.plugins.map((p) => p.name));
    expect(dev.plugins[0].source).toBe("./plugin/plugins/systemix");
    expect(fs.existsSync(path.join(repoRoot, "plugin/plugins/systemix/.claude-plugin/plugin.json"))).toBe(true);
  });

  test("has no top-level bin/ (claude.ai and org sync refuse plugins with one)", () => {
    expect(Object.keys(rendered).some((r) => r.startsWith(`${P}/bin/`))).toBe(false);
  });
});

describe("the bundled scan, copied out of this package", () => {
  let dir;
  let repo;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sx-plugin-"));
    write(dir, rendered);
    repo = makeRepo({
      "src/app/globals.css": ":root { --a: #000; --b: #111; }\n",
      "src/components/Hero.tsx": 'export const Hero = () => <button className="text-[13px] bg-[#ff0000]">Hi</button>;\n',
    });
  });
  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    removeRepo(repo);
  });

  const scan = (...args) => spawnSync(process.execPath, [path.join(dir, P, "scan/systemix.js"), ...args], { cwd: repo, encoding: "utf8" });

  test("runs the counters and the drift scan with nothing else installed", () => {
    const c = scan("audit", "counters", "--dirs", "src");
    expect(c.status).toBe(0);
    expect(JSON.parse(c.stdout).schema).toBe("systemix.audit-counters/1");
    const d = scan("drift", "scan", "--dry-run", "--json", "--dirs", "src");
    expect(d.status).toBe(0);
    expect(JSON.parse(d.stdout)).toHaveProperty("score");
    expect(fs.existsSync(path.join(repo, ".systemix"))).toBe(false);
  });

  test("its help passes the skills' feature probes", () => {
    const h = scan("--help").stdout;
    expect(h).toMatch(/audit counters/);
    expect(h).toMatch(/drift <sub>.*--dry-run/);
  });

  test("runs the loop kit: init writes the templates, check reads them", () => {
    expect(scan("loops", "init").status).toBe(0);
    expect(fs.existsSync(path.join(repo, "design/loops/product-loop.md"))).toBe(true);
    const roster = path.join(repo, "design/loops/roster.md");
    fs.writeFileSync(roster, fs.readFileSync(roster, "utf8").replace(/\{\{PERSON_[AB]\}\}/g, "Ada"));
    const c = scan("loops", "check");
    expect([c.status, c.stderr]).toEqual([0, ""]);
    fs.rmSync(path.join(repo, "design/loops"), { recursive: true, force: true });
  });

  test("the loop is a person's command: a gate is a ruling (G-005 E4)", () => {
    expect(text(`${P}/skills/loop/SKILL.md`)).toMatch(/^disable-model-invocation: true$/m);
    for (const s of ["setup", "brief", "check"]) expect(text(`${P}/skills/${s}/SKILL.md`)).not.toMatch(/disable-model-invocation/);
  });

  test("runs the rules: init writes the starter, eval catches every known-bad sample, check finds the hex (G-005 E3)", () => {
    expect(scan("rules", "init").status).toBe(0);
    const e = scan("rules", "eval");
    expect([e.status, e.stdout]).toEqual([0, expect.stringContaining("every sample behaves")]);
    const c = scan("rules", "check", "src", "--json");
    expect(c.status).toBe(1);
    const r = JSON.parse(c.stdout);
    expect(r.result).toBe("fail");
    expect(r.findings.map((f) => f.id)).toEqual(expect.arrayContaining(["T3", "T4"]));
    fs.rmSync(path.join(repo, "design"), { recursive: true, force: true });
  });

  test("the report is computed here and nothing is sent", () => {
    const r = scan("audit", "report", "--dirs", "src");
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/## Score: \d+ \/ 100[\s\S]*Computed on this machine; nothing was sent/);
    expect(scan("audit", "report", "--dirs", "src", "--key", "X").status).toBe(1);
  });

  test("refuses anything that would install or write skills", () => {
    const r = scan("audit");
    expect(r.status).toBe(1);
    expect(fs.existsSync(path.join(repo, ".claude"))).toBe(false);
  });
});
