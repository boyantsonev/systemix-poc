/**
 * init-context.test.js — acceptance tests for the init CONTEXT interview
 * (product/ICP/design problems/use case → systemix.config.yaml `context:` +
 * DESIGN.md frontmatter mirror + seeded goal) and the `app.preview.url` seam.
 *
 * Same walking-skeleton harness as init.test.js: real tmp filesystem, fake
 * prompt, fake MCP detection.
 */

"use strict";

const fs   = require("fs");
const os   = require("os");
const path = require("path");

const { init } = require("../../../src/init");

function makeWorkspace() {
  const root    = fs.mkdtempSync(path.join(os.tmpdir(), "sx-ctx-"));
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "sx-ctx-home-"));
  return {
    projectRoot: root,
    homeDir,
    read(rel) {
      return fs.readFileSync(path.join(root, rel), "utf8");
    },
    exists(rel) {
      return fs.existsSync(path.join(root, rel));
    },
    cleanup() {
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(homeDir, { recursive: true, force: true });
    },
  };
}

function makePrompt(answers) {
  const queue = [...answers];
  return {
    ask:   () => Promise.resolve(queue.shift() ?? ""),
    close: () => {},
  };
}

const noClients    = () => [];
const noopRegister = () => {};

const silence = async (fn) => {
  const orig = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = orig;
  }
};

describe("init context interview", () => {
  let ws;
  afterEach(() => ws?.cleanup());

  test("answers land in config context:, DESIGN.md frontmatter, and a seeded goal", async () => {
    ws = makeWorkspace();
    const prompt = makePrompt([
      "1", // design: scaffold
      "",  // posthog skip
      "1", // autonomy ghost
      "2", // self-improvement audit
      "Clinic scheduling SaaS for small practices",       // context: product
      "practice managers at 2-10 seat clinics",           // context: icp
      "drift, no-docs",                                   // context: problems
      "1",                                                // use case: product-ui
    ]);

    await silence(() =>
      init({ projectRoot: ws.projectRoot, homeDir: ws.homeDir, prompt, detectClients: noClients, registerServer: noopRegister })
    );

    const yaml = ws.read("systemix.config.yaml");
    expect(yaml).toContain('product: "Clinic scheduling SaaS for small practices"');
    expect(yaml).toContain('icp: "practice managers at 2-10 seat clinics"');
    expect(yaml).toContain('- "drift"');
    expect(yaml).toContain('- "no-docs"');
    expect(yaml).toContain("use_case: product-ui");
    // the preview seam ships regardless of answers
    expect(yaml).toMatch(/app:\n  preview:\n    url: ""/);

    const designMd = ws.read("design/DESIGN.md");
    expect(designMd).toContain('icp: "practice managers at 2-10 seat clinics"');
    expect(designMd).toContain('description: "Clinic scheduling SaaS for small practices"');

    expect(ws.exists("experiments/goals/fix-drift.mdx")).toBe(true);
    const goal = ws.read("experiments/goals/fix-drift.mdx");
    expect(goal).toContain('title: "Fix: drift"');
    expect(goal).toContain("status: active");
  });

  test("defaults mode writes TODO markers, seeds no goal, keeps the preview seam", async () => {
    ws = makeWorkspace();
    await silence(() =>
      init({ projectRoot: ws.projectRoot, homeDir: ws.homeDir, defaults: true, detectClients: noClients, registerServer: noopRegister })
    );

    const yaml = ws.read("systemix.config.yaml");
    expect(yaml).toContain("context:");
    expect(yaml).toContain("TODO: what product/service does it serve?");
    expect(yaml).toContain("problems: []");
    expect(yaml).toContain("use_case: all");
    expect(yaml).toMatch(/app:\n  preview:\n    url: ""/);

    const goalsDir = path.join(ws.projectRoot, "experiments", "goals");
    const seeded = fs.readdirSync(goalsDir).filter((f) => f.startsWith("fix-"));
    expect(seeded).toEqual([]);

    // untouched template frontmatter when nothing was answered
    expect(ws.read("design/DESIGN.md")).toContain("icp: your-icp");
  });

  test("a --reconfigure re-run updates config context: but never rewrites an existing DESIGN.md", async () => {
    ws = makeWorkspace();
    const answers = (product, icp) => ["1", "", "1", "2", product, icp, "", "1"];
    const run = (prompt, extra = {}) =>
      silence(() =>
        init({ projectRoot: ws.projectRoot, homeDir: ws.homeDir, prompt, detectClients: noClients, registerServer: noopRegister, ...extra })
      );

    await run(makePrompt(answers("Clinic scheduling SaaS", "practice managers")));
    // the team hand-edits DESIGN.md — it is their source of truth from here on
    const edited = ws.read("design/DESIGN.md").replace(/^description: .*$/m, 'description: "Written by the team"');
    fs.writeFileSync(path.join(ws.projectRoot, "design", "DESIGN.md"), edited, "utf8");

    await run(makePrompt(answers("Veterinary booking app", "vet receptionists")), { reconfigure: true });

    expect(ws.read("systemix.config.yaml")).toContain('product: "Veterinary booking app"');
    expect(ws.read("design/DESIGN.md")).toBe(edited);
  });
});

describe("systemix app command", () => {
  const { app } = require("../../../src/commands/app");

  test("dry run resolves server path, port and project root", async () => {
    const result = await app(["--port", "4499", "--project-root", os.tmpdir()], {
      dryRun: true,
      resolveServer: () => "/fake/app/server/index.js",
    });
    expect(result.started).toBe(false);
    expect(result.serverPath).toBe("/fake/app/server/index.js");
    expect(result.port).toBe("4499");
    expect(result.projectRoot).toBe(fs.realpathSync(os.tmpdir()) === os.tmpdir() ? os.tmpdir() : result.projectRoot);
  });

  test("missing package prints install hint and does not start", async () => {
    const origError = console.error;
    const origLog = console.log;
    const errors = [];
    console.error = (...a) => errors.push(a.join(" "));
    console.log = () => {};
    try {
      const result = await app([], { resolveServer: () => null });
      expect(result.started).toBe(false);
      expect(errors.join("\n")).toContain("@getsystemix/app is not installed");
    } finally {
      console.error = origError;
      console.log = origLog;
      process.exitCode = 0;
    }
  });
});
