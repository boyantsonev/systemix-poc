import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSkillFile } from "./skills-catalog";

// resolveSkillFile() turns a URL slug into a path under process.cwd(), so the
// slug must stay a slug — "../x" must not read a SKILL.md outside the skills dirs.
describe("resolveSkillFile", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-skills-catalog-"));
    fs.mkdirSync(path.join(root, ".claude", "skills", "hermes"), { recursive: true });
    fs.writeFileSync(path.join(root, ".claude", "skills", "hermes", "SKILL.md"), "# hermes\n");
    // A SKILL.md outside .claude/skills/ that a traversal slug would reach.
    fs.mkdirSync(path.join(root, "secret"), { recursive: true });
    fs.writeFileSync(path.join(root, "secret", "SKILL.md"), "# secret\n");
    vi.spyOn(process, "cwd").mockReturnValue(root);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("resolves a valid installed skill slug", () => {
    expect(resolveSkillFile("hermes")).toEqual({
      path: path.join(".claude", "skills", "hermes", "SKILL.md"),
      raw: "# hermes\n",
    });
  });

  it.each(["../../secret", "..", "hermes/../../secret", "Hermes", ".hidden", ""])(
    "rejects the non-slug %j without reading anything",
    (slug) => {
      expect(resolveSkillFile(slug)).toBeNull();
    },
  );
});
