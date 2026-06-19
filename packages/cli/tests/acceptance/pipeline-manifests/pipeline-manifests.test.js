"use strict";

/**
 * Guard: every pipeline manifest must agree with the skills on disk.
 *   - install integrity — every skill a manifest advertises exists on disk, so
 *     `npx systemix add <pipeline>` (which reads manifest.skills then copies each
 *     skill dir) can never fail mid-copy. This is the door the `add` command rides.
 *   - no orphans — every skills/<dir> is advertised, so dead skills don't ship.
 *
 * `figma-to-code` is held to install integrity but EXCLUDED from the orphan check:
 * its `style-match/` dir is a known orphan (on disk, not in the manifest) and the
 * whole pipeline is being removed in a separate task. When that lands, the exclude
 * becomes a no-op (the pipeline simply isn't iterated).
 */

const fs = require("fs");
const path = require("path");

const PIPELINES_DIR = path.join(__dirname, "..", "..", "..", "pipelines");

const ORPHAN_CHECK_EXCLUDE = new Set(["figma-to-code"]); // pending removal (separate task)

const pipelines = fs
  .readdirSync(PIPELINES_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && fs.existsSync(path.join(PIPELINES_DIR, e.name, "manifest.json")))
  .map((e) => e.name);

const manifestSkills = (p) =>
  JSON.parse(fs.readFileSync(path.join(PIPELINES_DIR, p, "manifest.json"), "utf8")).skills || [];

const skillsOnDisk = (p) => {
  const dir = path.join(PIPELINES_DIR, p, "skills");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, "SKILL.md")))
    .map((e) => e.name);
};

describe("pipeline manifests match the skills on disk", () => {
  it("there are pipelines to check", () => {
    expect(pipelines.length).toBeGreaterThan(0);
  });

  it.each(pipelines)(
    "%s — every manifest skill exists on disk (npx systemix add can't break)",
    (p) => {
      const missing = manifestSkills(p).filter(
        (skill) => !fs.existsSync(path.join(PIPELINES_DIR, p, "skills", skill, "SKILL.md"))
      );
      expect(missing).toEqual([]);
    }
  );

  it.each(pipelines.filter((p) => !ORPHAN_CHECK_EXCLUDE.has(p)))(
    "%s — no orphan skill dirs (every skills/* is advertised in the manifest)",
    (p) => {
      const listed = new Set(manifestSkills(p));
      const orphans = skillsOnDisk(p).filter((d) => !listed.has(d));
      expect(orphans).toEqual([]);
    }
  );
});
