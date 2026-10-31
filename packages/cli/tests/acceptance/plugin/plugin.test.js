"use strict";

/**
 * The Claude Code plugin (scripts/build-plugin.js → <repo>/plugin): the committed output is what
 * a build writes, the skills call the bundled scan, the scan runs on its own outside this
 * package, and the MCP server answers over stdio with the key taken from the plugin settings.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { render, write, diff, leftoverCalls, SKILL_NAMES, DEFAULT_OUT } = require("../../../scripts/build-plugin");
const { makeRepo, removeRepo } = require("../counters/helpers");

const P = "plugins/systemix";
const rendered = render();
const text = (rel) => Buffer.from(rendered[rel]).toString("utf8");

describe("plugin build", () => {
  test("the committed plugin/ is exactly what a build writes (run scripts/build-plugin.js)", () => {
    expect(diff(DEFAULT_OUT, rendered)).toEqual([]);
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
    expect(text(`${P}/skills/readiness-audit/SKILL.md`)).toContain('node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" audit counters');
    expect(text(`${P}/skills/drift-report/SKILL.md`)).toContain('node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" drift scan');
  });

  test("the license key is a sensitive setting that only the MCP server receives", () => {
    const manifest = JSON.parse(text(`${P}/.claude-plugin/plugin.json`));
    expect(manifest.name).toBe("systemix");
    expect(manifest.userConfig.license_key).toMatchObject({ type: "string", sensitive: true, required: false });
    const mcp = JSON.parse(text(`${P}/.mcp.json`)).mcpServers.systemix;
    expect(mcp.args).toEqual(["${CLAUDE_PLUGIN_ROOT}/scan/mcp.js"]);
    expect(mcp.env.SYSTEMIX_REPORT_KEY).toBe("${user_config.license_key}");
    for (const rel of Object.keys(rendered).filter((r) => r.endsWith(".md"))) expect(text(rel)).not.toContain("user_config.license_key");
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

  test("refuses anything that would install or write skills", () => {
    const r = scan("audit");
    expect(r.status).toBe(1);
    expect(fs.existsSync(path.join(repo, ".claude"))).toBe(false);
  });

  test("the MCP server lists quick_report and describes the payload without sending", () => {
    const lines = [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "1" } } },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 2, method: "tools/list" },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "quick_report", arguments: { dirs: ["src"] } } },
      { jsonrpc: "2.0", id: 4, method: "nope" },
    ].map((l) => JSON.stringify(l)).join("\n") + "\n";
    const r = spawnSync(process.execPath, [path.join(dir, P, "scan/mcp.js")], {
      input: lines,
      encoding: "utf8",
      env: { ...process.env, SYSTEMIX_PROJECT_DIR: repo, SYSTEMIX_REPORT_SERVICE: "https://reports.example.test", SYSTEMIX_REPORT_KEY: "${user_config.license_key}" },
    });
    const out = r.stdout.trim().split("\n").map((l) => JSON.parse(l));
    expect(out.map((m) => m.id)).toEqual([1, 2, 3, 4]);
    expect(out[0].result.serverInfo.name).toBe("systemix");
    expect(out[1].result.tools.map((t) => t.name)).toEqual(["quick_report"]);
    expect(out[2].result.isError).toBe(false);
    expect(out[2].result.content[0].text).toMatch(/No source code[\s\S]*nothing was sent/);
    expect(out[3].error.code).toBe(-32601);
  });

  test("send=true posts the results file with the key from the settings, and never prints it", async () => {
    const { quickReport } = require(path.join(dir, P, "scan/mcp.js"));
    const calls = [];
    const saved = global.fetch;
    global.fetch = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return { ok: true, status: 200, json: async () => ({ scored: true, preview: false, overall: 40, markdown: "# Quick design-system report\n" }) };
    };
    try {
      const r = await quickReport({ dirs: ["src"], send: true, redact_paths: true }, { SYSTEMIX_PROJECT_DIR: repo, SYSTEMIX_REPORT_SERVICE: "https://reports.example.test", SYSTEMIX_REPORT_KEY: "ABCD-1234-EFGH" });
      expect(r.isError).toBe(false);
      expect(r.text).toContain("# Quick design-system report");
      expect(r.text).not.toContain("ABCD-1234-EFGH");
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe("https://reports.example.test/api/report");
      expect(calls[0].body.licenseKey).toBe("ABCD-1234-EFGH");
      expect(JSON.stringify(calls[0].body.counters)).not.toContain("src/components/Hero.tsx");
    } finally {
      global.fetch = saved;
      process.exitCode = 0;
    }
  });
});
