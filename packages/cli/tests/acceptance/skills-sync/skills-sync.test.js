"use strict";

/**
 * Acceptance tests — `systemix skills sync`. Runs against the REAL bundled
 * pipelines (packages/cli/pipelines) into tmp target dirs, so it verifies the
 * command vendors the actual loop skills the way init/add do — but in place, and
 * able to target the user-global ~/.claude/skills/ (--global) that init/add never
 * touch. Injectable seams (homeDir/projectRoot) keep it off the real home dir.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");

const { syncSkills } = require("../../../src/commands/skills");

const PIPELINES_DIR = path.join(__dirname, "..", "..", "..", "pipelines");
const LOOP = "hypothesis-validation";
const LOOP_SKILLS = JSON.parse(
  fs.readFileSync(path.join(PIPELINES_DIR, LOOP, "manifest.json"), "utf8")
).skills;

const tmpRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "systemix-skills-"));
const skillFile = (dir, skill) => path.join(dir, ".claude", "skills", skill, "SKILL.md");

describe("skills sync — vendor the loop skills in place", () => {
  let home;
  beforeEach(() => { home = tmpRoot(); });
  afterEach(() => { fs.rmSync(home, { recursive: true, force: true }); });

  it("--global creates every loop skill under ~/.claude/skills on a first run", () => {
    const r = syncSkills({ global: true }, { homeDir: home });
    expect(r.skillsDir).toBe(path.join(home, ".claude", "skills"));
    expect(r.results.map((x) => x.skill).sort()).toEqual([...LOOP_SKILLS].sort());
    expect(r.results.every((x) => x.state === "create")).toBe(true);
    for (const skill of LOOP_SKILLS) {
      expect(fs.existsSync(skillFile(home, skill))).toBe(true);
    }
  });

  it("a second run is a no-op: every skill reports in-sync", () => {
    syncSkills({ global: true }, { homeDir: home });
    const again = syncSkills({ global: true }, { homeDir: home });
    expect(again.results.every((x) => x.state === "in-sync")).toBe(true);
  });

  it("overwrites a drifted skill and reports the version bump", () => {
    syncSkills({ global: true }, { homeDir: home });
    const target = skillFile(home, "init-experiment");
    fs.writeFileSync(target, "---\nname: init-experiment\nversion: \"0.0.1\"\n---\nstale\n", "utf8");

    const r = syncSkills({ global: true }, { homeDir: home });
    const entry = r.results.find((x) => x.skill === "init-experiment");
    expect(entry.state).toBe("update");
    expect(entry.from).toBe("0.0.1");
    // dest now byte-matches the bundled source
    const src = fs.readFileSync(path.join(PIPELINES_DIR, LOOP, "skills", "init-experiment", "SKILL.md"), "utf8");
    expect(fs.readFileSync(target, "utf8")).toBe(src);
    expect(entry.to).toBe(require("../../../src/skills-fetcher").parseVersion(src));
  });

  it("--dry-run reports changes but writes nothing", () => {
    const r = syncSkills({ global: true, "dry-run": true }, { homeDir: home });
    expect(r.dryRun).toBe(true);
    expect(r.results.every((x) => x.state === "create")).toBe(true);
    for (const skill of LOOP_SKILLS) {
      expect(fs.existsSync(skillFile(home, skill))).toBe(false); // nothing written
    }
  });

  it("without --global, targets the project's .claude/skills (not home)", () => {
    const proj = tmpRoot();
    try {
      const r = syncSkills({}, { homeDir: home, projectRoot: proj });
      expect(r.skillsDir).toBe(path.join(proj, ".claude", "skills"));
      expect(fs.existsSync(skillFile(proj, "init-experiment"))).toBe(true);
      expect(fs.existsSync(skillFile(home, "init-experiment"))).toBe(false);
    } finally {
      fs.rmSync(proj, { recursive: true, force: true });
    }
  });

  it("leaves unrelated skills in the target dir untouched", () => {
    const keep = path.join(home, ".claude", "skills", "my-custom-skill");
    fs.mkdirSync(keep, { recursive: true });
    fs.writeFileSync(path.join(keep, "SKILL.md"), "mine\n", "utf8");
    syncSkills({ global: true }, { homeDir: home });
    expect(fs.readFileSync(path.join(keep, "SKILL.md"), "utf8")).toBe("mine\n");
  });

  it("throws on an unknown pipeline", () => {
    expect(() => syncSkills({ global: true, pipeline: "nope" }, { homeDir: home })).toThrow(/pipeline not found/);
  });

  it("opts.skillsDir overrides flag-based resolution (the seam `update` reuses)", () => {
    // `update` resolves its own target dir (project if present, else global) and hands
    // it to syncSkills directly — so skillsDir must win over --global/cwd.
    const explicit = path.join(home, "custom-skills-root");
    const r = syncSkills({ global: true }, { homeDir: home, skillsDir: explicit });
    expect(r.skillsDir).toBe(explicit);
    expect(fs.existsSync(path.join(explicit, "init-experiment", "SKILL.md"))).toBe(true);
    // the --global default location was NOT used
    expect(fs.existsSync(skillFile(home, "init-experiment"))).toBe(false);
  });
});

describe("skills sync — a skill is a folder, not only its SKILL.md", () => {
  let tmp, pipelines, proj;
  const skillSrc = () => path.join(pipelines, "p", "skills", "demo");
  const run = () => syncSkills({ pipeline: "p" }, { pipelinesDir: pipelines, projectRoot: proj });
  beforeEach(() => {
    tmp = tmpRoot();
    pipelines = path.join(tmp, "pipelines");
    proj = path.join(tmp, "proj");
    fs.mkdirSync(skillSrc(), { recursive: true });
    fs.mkdirSync(proj);
    fs.writeFileSync(path.join(pipelines, "p", "manifest.json"), JSON.stringify({ name: "p", skills: ["demo"] }));
    fs.writeFileSync(path.join(skillSrc(), "SKILL.md"), "---\nname: demo\nversion: \"1.0.0\"\n---\nbody\n");
    fs.writeFileSync(path.join(skillSrc(), "rubric.json"), "{\"a\":1}\n");
  });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  it("copies the sibling files and then reports in-sync", () => {
    expect(run().results[0].state).toBe("create");
    expect(fs.readFileSync(path.join(proj, ".claude", "skills", "demo", "rubric.json"), "utf8")).toBe("{\"a\":1}\n");
    expect(run().results[0].state).toBe("in-sync");
  });

  it("a changed sibling alone (SKILL.md untouched) is an update, not in-sync", () => {
    run();
    fs.writeFileSync(path.join(skillSrc(), "rubric.json"), "{\"a\":2}\n");
    expect(run().results[0].state).toBe("update");
    expect(fs.readFileSync(path.join(proj, ".claude", "skills", "demo", "rubric.json"), "utf8")).toBe("{\"a\":2}\n");
  });

  it("a sibling missing from the install is restored", () => {
    run();
    fs.rmSync(path.join(proj, ".claude", "skills", "demo", "rubric.json"));
    expect(run().results[0].state).toBe("update");
    expect(fs.existsSync(path.join(proj, ".claude", "skills", "demo", "rubric.json"))).toBe(true);
  });
});
