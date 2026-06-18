import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Loop parity gate: IF the instance has experiments/goals, every experiment must
// link to exactly one existing goal via `goal:`. A fresh (blank-slate) instance
// has neither — valid, so the gate degrades to vacuous truth.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXPERIMENTS = path.join(ROOT, "experiments");
const CONTRACT = path.join(ROOT, "contract");

function frontmatter(file: string): string {
  return readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
}

function field(block: string, key: string): string | undefined {
  return block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim();
}

function mdxFiles(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".mdx")).map((f) => path.join(dir, f));
  } catch {
    return []; // dir absent on a blank-slate instance
  }
}

describe("loop hierarchy", () => {
  const goalIds = mdxFiles(path.join(EXPERIMENTS, "goals")).map((f) => field(frontmatter(f), "id"));

  it("every goal file declares an id", () => {
    for (const id of goalIds) expect(id).toBeTruthy();
  });

  it("every experiment links to exactly one existing goal", () => {
    for (const file of mdxFiles(EXPERIMENTS)) {
      const goal = field(frontmatter(file), "goal");
      expect(goal, `${path.basename(file)} is missing a goal: field`).toBeTruthy();
      expect(goalIds, `${path.basename(file)} links to unknown goal "${goal}"`).toContain(goal);
    }
  });

  it("the root contract exists", () => {
    expect(frontmatter(path.join(CONTRACT, "index.mdx"))).toContain("type: contract");
  });
});
