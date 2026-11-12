"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { build, verify } = require("../scripts/build-plugin");

const out = fs.mkdtempSync(path.join(os.tmpdir(), "ps-plugin-test-"));
let result;
beforeAll(() => {
  result = build(out);
});

describe("the plugin build", () => {
  test("builds with no problems", () => {
    expect(result.problems).toEqual([]);
  });

  test("ships the five commands, loop and admin person-only", () => {
    for (const c of ["setup", "brief", "check", "loop", "admin"]) expect(fs.existsSync(path.join(out, "skills", c, "SKILL.md"))).toBe(true);
    for (const c of ["loop", "admin"]) expect(fs.readFileSync(path.join(out, "skills", c, "SKILL.md"), "utf8")).toMatch(/^disable-model-invocation: true$/m);
  });

  test("no top-level bin/: claude.ai and org sync refuse a plugin with one", () => {
    expect(fs.existsSync(path.join(out, "bin"))).toBe(false);
    expect(fs.existsSync(path.join(out, "scan", "bin", "product-studio.js"))).toBe(true);
  });

  test("the bundled CLI runs alone from the plugin", () => {
    const help = execFileSync("node", [path.join(out, "scan", "product-studio.js"), "--help"], { cwd: os.tmpdir(), encoding: "utf8" });
    expect(help).toMatch(/rules/);
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), "ps-plugin-repo-"));
    fs.writeFileSync(path.join(repo, "a.css"), ".a { color: #ff0000; }\n");
    let code = 0;
    try {
      execFileSync("node", [path.join(out, "scan", "product-studio.js"), "rules", "check", ".", "--starter", "--json"], { cwd: repo, encoding: "utf8" });
    } catch (e) {
      code = e.status;
      expect(JSON.parse(e.stdout).findings[0].id).toBe("T1");
    }
    expect(code).toBe(1);
  });

  test("verify catches a missing path, a ../ path, an unknown command and a leak", () => {
    const bad = fs.mkdtempSync(path.join(os.tmpdir(), "ps-plugin-bad-"));
    fs.cpSync(out, bad, { recursive: true });
    fs.writeFileSync(
      path.join(bad, "skills", "brief", "SKILL.md"),
      '---\nname: brief\n---\nRead ${CLAUDE_PLUGIN_ROOT}/skills/nope.md and ../x.md, run node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" frobnicate. Made by hellobill.\n',
    );
    const problems = verify(bad).join("\n");
    expect(problems).toMatch(/nope\.md/);
    expect(problems).toMatch(/\.\.\//);
    expect(problems).toMatch(/frobnicate/);
    expect(problems).toMatch(/hellobill/);
  });

  test("the committed plugin is up to date", () => {
    const code = (() => {
      try {
        execFileSync("node", [path.join(__dirname, "..", "scripts", "build-plugin.js"), "--check"], { stdio: "pipe" });
        return 0;
      } catch (e) {
        return e.status;
      }
    })();
    expect(code).toBe(0);
  });
});
