/**
 * The MCP door onto the loop must refuse experiment ids that aren't path-safe:
 * an id becomes experiments/<id>.mdx, so "../x" would read or write outside the
 * loop. Mirrors the CLI door's tests (packages/cli/tests/acceptance/experiment).
 * Lives outside src/ so tsc never ships it in dist/; the root Vitest run collects it.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  experimentCloseHandler,
  experimentGetHandler,
  experimentMeasureHandler,
  experimentNewHandler,
} from "../src/tools/experiment";
import type { ToolResult } from "../src/types";

const text = (r: ToolResult) => r.content[0].text;

describe("MCP experiment_* tools — path-safe ids", () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "sx-mcp-ids-"));
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it.each([
    "../escaped-id",
    "../../outside-the-repo",
    "nested/id",
    "back\\slash",
    "..",
    ".hidden",
    "Upper-Case",
    "under_score",
    "x".repeat(82),
  ])("experiment_new rejects the unsafe id %j and writes nothing", async (id) => {
    const r = await experimentNewHandler({ id }, root);
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/^invalid experiment id /);
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it("experiment_new rejects a missing id with a clear error", async () => {
    const r = await experimentNewHandler({ id: "" }, root);
    expect(r.isError).toBe(true);
    expect(text(r)).toBe("an experiment id is required");
  });

  it("experiment_get / measure / close refuse a traversal id and never touch the file it points at", async () => {
    // experiments/../decoy.mdx resolves to <root>/decoy.mdx — a file OUTSIDE the loop
    const decoy = path.join(root, "decoy.mdx");
    const original = "---\nid: decoy\nstatus: running\n---\n\n# not an experiment\n";
    fs.writeFileSync(decoy, original, "utf8");

    const results = [
      await experimentGetHandler({ id: "../decoy" }, root),
      await experimentMeasureHandler({ id: "../decoy", event: "x" }, root),
      await experimentCloseHandler({ id: "../decoy", result: "r", decision: "promote" }, root),
    ];
    for (const r of results) {
      expect(r.isError).toBe(true);
      expect(text(r)).toContain('invalid experiment id "../decoy"');
    }

    expect(fs.readFileSync(decoy, "utf8")).toBe(original);
    expect(fs.existsSync(path.join(root, "experiments"))).toBe(false); // no LEARNINGS.md
    expect(fs.existsSync(path.join(root, ".systemix"))).toBe(false); // no queue card
  });

  it("a kebab-case id still works end to end (new → measure → close)", async () => {
    const id = "hero-cta-2026-10";
    expect((await experimentNewHandler({ id }, root)).isError).toBeFalsy();
    expect((await experimentMeasureHandler({ id, event: "cta_clicked" }, root)).isError).toBeFalsy();
    expect((await experimentCloseHandler({ id, result: "won", decision: "promote" }, root)).isError).toBeFalsy();
    expect(fs.readFileSync(path.join(root, "experiments", `${id}.mdx`), "utf8")).toContain("status: complete");
  });
});
