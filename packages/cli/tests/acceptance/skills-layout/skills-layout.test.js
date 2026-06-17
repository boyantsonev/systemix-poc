"use strict";

/**
 * Guard: the vendored hypothesis-validation loop skills must target the `design/`
 * layout, not the legacy `contract/` + `.systemix/` paths. A regression here means
 * a freshly-init'd client repo's loop would read/write the wrong files.
 */

const fs   = require("fs");
const path = require("path");

const SKILLS_DIR = path.join(__dirname, "..", "..", "..", "pipelines", "hypothesis-validation", "skills");

const skillDirs = fs
  .readdirSync(SKILLS_DIR)
  .filter((d) => fs.existsSync(path.join(SKILLS_DIR, d, "SKILL.md")));

describe("vendored loop skills target the design/ layout", () => {
  it("there are loop skills to check", () => {
    expect(skillDirs.length).toBeGreaterThan(0);
  });

  it.each(skillDirs)("%s references no legacy contract/ or .systemix/ paths", (skill) => {
    const md = fs.readFileSync(path.join(SKILLS_DIR, skill, "SKILL.md"), "utf8");
    expect(md).not.toMatch(/contract\//);   // old authored-contract paths
    expect(md).not.toMatch(/\.systemix\//); // old runtime-state paths
  });

  it("the capture skill writes the learning into design/DESIGN.md and design/decisions/", () => {
    const md = fs.readFileSync(path.join(SKILLS_DIR, "close-experiment", "SKILL.md"), "utf8");
    expect(md).toContain("design/DESIGN.md");
    expect(md).toContain("design/decisions/");
    expect(md).toContain("## Memory");                 // captures into the Memory ledger
    expect(md).toContain("design/.state/queue.json");  // HITL card is file-first
  });
});
