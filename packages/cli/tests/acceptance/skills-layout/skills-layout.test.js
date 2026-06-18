"use strict";

/**
 * Guard: the vendored loop skills must target the v6 `experiments/` layout — the
 * loop is the core (experiments/), the design system is an optional substrate
 * (design/), and runtime HITL state lives in `.systemix/`. A regression here means
 * a freshly-init'd client repo's loop would read/write the wrong files.
 */

const fs   = require("fs");
const path = require("path");

const SKILLS_DIR = path.join(__dirname, "..", "..", "..", "pipelines", "hypothesis-validation", "skills");

const skillDirs = fs
  .readdirSync(SKILLS_DIR)
  .filter((d) => fs.existsSync(path.join(SKILLS_DIR, d, "SKILL.md")));

describe("vendored loop skills target the experiments/ layout (v6)", () => {
  it("there are loop skills to check", () => {
    expect(skillDirs.length).toBeGreaterThan(0);
  });

  it.each(skillDirs)(
    "%s references no legacy design/decisions, design/goals, design/.state, or contract/ paths",
    (skill) => {
      const md = fs.readFileSync(path.join(SKILLS_DIR, skill, "SKILL.md"), "utf8");
      expect(md).not.toMatch(/design\/decisions/); // the loop moved out of design/
      expect(md).not.toMatch(/design\/goals/);
      expect(md).not.toMatch(/design\/\.state/);   // runtime state moved to .systemix/
      expect(md).not.toMatch(/contract\//);        // pre-v5 authored-contract paths
    }
  );

  it("the capture skill writes the learning into experiments/LEARNINGS.md and the experiment file", () => {
    const md = fs.readFileSync(path.join(SKILLS_DIR, "close-experiment", "SKILL.md"), "utf8");
    expect(md).toContain("experiments/LEARNINGS.md"); // the synthesized loop memory
    expect(md).toContain("experiments/<id>.mdx");     // the experiment file
    expect(md).toContain("## Memory");                // the Memory ledger anchor
    expect(md).toContain(".systemix/queue.json");     // HITL card is file-first runtime state
  });
});
