"use strict";

/**
 * Acceptance — `systemix init --defaults` (fresh-repo onboarding)
 *
 * Real filesystem in a tmp project dir + a tmp fake HOME (init routes every
 * global path through os.homedir(), which honors $HOME on POSIX — verified;
 * nothing is written outside the two tmp dirs). --defaults answers every
 * prompt with its default, so the run is fully non-interactive.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const CLI = path.resolve(__dirname, "..", "..", "..", "bin", "cli.js");
const { parseSimpleYaml, validateConfig } = require("../../../src/config.js");

let projectDir;
let homeDir;

function runInit(extraArgs = []) {
  return execFileSync(process.execPath, [CLI, "init", "--defaults", ...extraArgs], {
    cwd: projectDir,
    env: { ...process.env, HOME: homeDir },
    encoding: "utf8",
  });
}

beforeEach(() => {
  projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-init-"));
  homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-home-"));
});

afterEach(() => {
  fs.rmSync(projectDir, { recursive: true, force: true });
  fs.rmSync(homeDir, { recursive: true, force: true });
});

describe("systemix init --defaults — fresh repo onboarding", () => {
  it("scaffolds a valid instance the app can load", () => {
    runInit();

    // The committed topology — must parse AND validate with the CLI's own parser.
    const yamlPath = path.join(projectDir, "systemix.config.yaml");
    expect(fs.existsSync(yamlPath)).toBe(true);
    const cfg = parseSimpleYaml(fs.readFileSync(yamlPath, "utf8"));
    expect(() => validateConfig(cfg)).not.toThrow();
    expect(cfg.signals.posthog.enabled).toBe(true);
    expect(cfg.trust.orchestrator_tier).toBe(0);
    expect(cfg.trust.hermes_tier).toBe(0);

    // Contract scaffold.
    for (const dir of ["tokens", "components", "hypotheses"]) {
      expect(fs.existsSync(path.join(projectDir, "contract", dir))).toBe(true);
    }

    // Project skills installed (default = both pipelines).
    const skillsDir = path.join(projectDir, ".claude", "skills");
    expect(fs.existsSync(skillsDir)).toBe(true);
    expect(fs.readdirSync(skillsDir).length).toBeGreaterThan(0);

    // Secrets file lives under (fake) HOME, never in the repo.
    const userCfg = path.join(homeDir, ".systemix", "config.json");
    expect(fs.existsSync(userCfg)).toBe(true);
    expect(() => JSON.parse(fs.readFileSync(userCfg, "utf8"))).not.toThrow();

    // Runtime dirs are gitignored.
    const gitignore = fs.readFileSync(path.join(projectDir, ".gitignore"), "utf8");
    expect(gitignore).toContain(".systemix/cache/");
  });

  it("is idempotent without --reconfigure and rewrites with it", () => {
    runInit();
    const yamlPath = path.join(projectDir, "systemix.config.yaml");
    const first = fs.readFileSync(yamlPath, "utf8");

    runInit();
    expect(fs.readFileSync(yamlPath, "utf8")).toBe(first);

    fs.writeFileSync(yamlPath, first + "# marker\n");
    runInit(["--reconfigure"]);
    expect(fs.readFileSync(yamlPath, "utf8")).not.toContain("# marker");
  });
});
