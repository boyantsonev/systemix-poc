"use strict";

/**
 * G-003 PR 2 — safe to publish. Nothing the CLI does destroys a user's settings, writes
 * skills a person did not see, or leaves keys readable by others; the engine workflow
 * (a model run in CI) is added only with a yes.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `sx-safety-${name}-`));
const quiet = async (fn) => {
  const spies = ["log", "error", "warn"].map((m) => jest.spyOn(console, m).mockImplementation(() => {}));
  const out = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    return await fn();
  } finally {
    spies.forEach((s) => s.mockRestore());
    out.mockRestore();
  }
};
afterEach(() => {
  process.exitCode = 0;
});

describe("Claude client settings are never destroyed (E4)", () => {
  const registrar = require("../../../src/installers/mcp-server-registrar");
  const proxyRegistrar = require("../../../src/installers/mcp-registrar");

  test("an unparsable ~/.claude.json is left byte-for-byte untouched", async () => {
    const file = path.join(tmp("broken"), ".claude.json");
    const truncated = '{"projects": {"/a": {"allowedTools": ["Bash"]}}, "mcpServers": {"other": {"comm';
    fs.writeFileSync(file, truncated);
    const r = await quiet(() => registrar.registerServer(file, { projectRoot: "/repo" }));
    expect(r).toBe(false);
    expect(fs.readFileSync(file, "utf8")).toBe(truncated);
    expect(fs.readdirSync(path.dirname(file))).toEqual([".claude.json"]);
    expect(await quiet(() => registrar.unregisterServer(file))).toBe(false);
    expect(fs.readFileSync(file, "utf8")).toBe(truncated);
    expect(() => proxyRegistrar.readConfig(file)).toThrow(/not valid JSON/);
  });

  test("a valid file keeps every other setting and its mode; no temp file is left", async () => {
    const file = path.join(tmp("valid"), ".claude.json");
    fs.writeFileSync(file, JSON.stringify({ theme: "dark", projects: { "/a": { x: 1 } }, mcpServers: { other: { command: "o" } } }), { mode: 0o600 });
    expect(await quiet(() => registrar.registerServer(file, { projectRoot: "/repo" }))).toBe(true);
    const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(cfg).toMatchObject({ theme: "dark", projects: { "/a": { x: 1 } }, mcpServers: { other: { command: "o" } } });
    expect(cfg.mcpServers["systemix-mcp"]).toBeDefined();
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(path.dirname(file))).toEqual([".claude.json"]);
  });
});

describe("update writes nothing a person did not see and accept (E5)", () => {
  const { installedPipelines } = require("../../../src/commands/update");

  test("only the pipelines whose own skills are installed are re-installed", () => {
    expect(installedPipelines(["design-audit", "drift-report", "init-experiment"])).toEqual(["design-system", "hypothesis-validation"]);
    expect(installedPipelines(["drift-report"])).toEqual([]); // shared by two pipelines: says nothing
    expect(installedPipelines(["figma-inspect"])).toEqual(["figma-to-code"]);
  });

  test("third-party skill packs are pinned to a commit", () => {
    for (const name of ["design-system", "figma-to-code"]) {
      const m = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../pipelines", name, "manifest.json"), "utf8"));
      for (const pack of m["skill-packs"] || []) expect([name, pack.ref]).toEqual([name, expect.stringMatching(/^[0-9a-f]{40}$/)]);
    }
  });

  test("without --yes, update leaves the skills folder exactly as it was", async () => {
    const root = tmp("update");
    const skill = path.join(root, ".claude", "skills", "design-audit", "SKILL.md");
    fs.mkdirSync(path.dirname(skill), { recursive: true });
    fs.writeFileSync(skill, "---\nname: design-audit\nversion: 0.0.1\n---\nmy edits\n");
    const before = fs.readdirSync(path.join(root, ".claude", "skills"));
    const cwd = process.cwd();
    process.chdir(root);
    try {
      let update;
      jest.isolateModules(() => ({ update } = require("../../../src/commands/update")));
      await quiet(() => update([]));
    } finally {
      process.chdir(cwd);
    }
    expect(fs.readdirSync(path.join(root, ".claude", "skills"))).toEqual(before);
    expect(fs.readFileSync(skill, "utf8")).toContain("my edits");
  }, 20000);
});

describe("init: private keys, signals that work, the engine only with a yes (E6)", () => {
  const { init } = require("../../../src/init");
  const prompt = (answers) => {
    const q = [...answers];
    return { ask: () => Promise.resolve(q.shift() ?? ""), close() {} };
  };
  const run = (answers) => {
    const root = tmp("init-root");
    const home = tmp("init-home");
    return quiet(() => init({ projectRoot: root, homeDir: home, prompt: prompt(answers), detectClients: () => [], registerServer: () => {} })).then(() => ({ root, home }));
  };

  test("a PostHog key is stored readable by the user only, and turns the signal on", async () => {
    // design: scaffold · PostHog key · autonomy · self-improvement · 4 context answers · engine
    const { root, home } = await run(["1", "phc_test_key", "", "", "", "", "", "", ""]);
    const cfg = path.join(home, ".systemix", "config.json");
    expect(JSON.parse(fs.readFileSync(cfg, "utf8")).posthogKey).toBe("phc_test_key");
    expect(fs.statSync(cfg).mode & 0o777).toBe(0o600);
    const yaml = fs.readFileSync(path.join(root, "systemix.config.yaml"), "utf8");
    expect(yaml).toMatch(/posthog:\s*\n\s*enabled: true/);
    expect(yaml).toMatch(/vercel:\s*\n\s*enabled: false/);
  });

  test("without a key every signal stays off", async () => {
    const { root } = await run([]);
    const yaml = fs.readFileSync(path.join(root, "systemix.config.yaml"), "utf8");
    for (const s of ["posthog", "vercel", "figma", "social"]) expect(yaml).toMatch(new RegExp(`${s}:\\s*\\n\\s*enabled: false`));
  });

  test("the engine workflow is added only when the person says yes", async () => {
    const yes = await run(["1", "", "", "", "", "", "", "", "y"]);
    expect(fs.existsSync(path.join(yes.root, ".github", "workflows", "systemix-engine.yml"))).toBe(true);
    const no = await run(["1", "", "", "", "", "", "", "", ""]);
    expect(fs.existsSync(path.join(no.root, ".github", "workflows", "systemix-engine.yml"))).toBe(false);
  });
});
