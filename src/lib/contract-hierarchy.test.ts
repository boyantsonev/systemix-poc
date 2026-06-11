import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Phase B parity gate (docs/feature/contract-rework/ia-and-migration.md):
// every hypothesis must link to exactly one existing goal via `goal:`.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../contract");

function frontmatter(file: string): string {
  return readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
}

function field(block: string, key: string): string | undefined {
  return block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim();
}

function mdxFiles(dir: string): string[] {
  return readdirSync(path.join(ROOT, dir))
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => path.join(ROOT, dir, f));
}

describe("contract hierarchy", () => {
  const goalIds = mdxFiles("goals").map((f) => field(frontmatter(f), "id"));

  it("every goal file declares an id", () => {
    expect(goalIds.length).toBeGreaterThan(0);
    for (const id of goalIds) expect(id).toBeTruthy();
  });

  it("every hypothesis links to exactly one existing goal", () => {
    const files = mdxFiles("hypotheses");
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const goal = field(frontmatter(file), "goal");
      expect(goal, `${path.basename(file)} is missing a goal: field`).toBeTruthy();
      expect(goalIds, `${path.basename(file)} links to unknown goal "${goal}"`).toContain(goal);
    }
  });

  it("the root contract exists", () => {
    expect(frontmatter(path.join(ROOT, "index.mdx"))).toContain("type: contract");
  });
});
