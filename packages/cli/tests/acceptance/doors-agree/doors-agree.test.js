"use strict";

/**
 * Guard: the loop's "three doors" stay aligned on ONE canonical file layout.
 * The CLI (`src/lib/experiments.js`, via the layout SSOT) and the MCP server
 * (`packages/mcp-server/src/tools/experiment.ts`, a SEPARATE TS impl with its own
 * inline parser) are parallel implementations over the SAME experiments/*.mdx,
 * LEARNINGS.md, and .systemix/queue.json. A rename in the layout SSOT must not
 * silently leave the MCP door pointing at the old files.
 *
 * The skills door (the SKILL.md prose) is covered by skills-layout.test.js.
 */

const fs = require("fs");
const path = require("path");
const layout = require("../../../src/lib/layout");

const read = (...p) => fs.readFileSync(path.join(__dirname, ...p), "utf8");

const cliCommand = read("..", "..", "..", "src", "commands", "experiment.js");
const cliLib = read("..", "..", "..", "src", "lib", "experiments.js");
const mcpTool = read("..", "..", "..", "..", "mcp-server", "src", "tools", "experiment.ts");
// The third writer lives in the app package (repo-root src/), not the CLI.
const appWriter = read("..", "..", "..", "..", "..", "src", "lib", "contract", "memory-mdx.ts");

const LEARNINGS = path.basename(layout.rel.learnings); // "LEARNINGS.md"
const QUEUE = path.basename(layout.rel.queue);         // "queue.json"
const MEMORY_ANCHOR = "## Memory";                     // the LEARNINGS.md ledger anchor

describe("the three doors share one canonical loop layout", () => {
  it("the CLI `experiment` command delegates to the shared lib (no parallel reimplementation)", () => {
    expect(cliCommand).toMatch(/require\(\s*["']\.\.\/lib\/experiments["']\s*\)/);
  });

  it("the shared lib resolves paths through the layout SSOT", () => {
    expect(cliLib).toMatch(/require\(\s*["']\.\/layout["']\s*\)/);
    expect(cliLib).toContain(MEMORY_ANCHOR);
  });

  it("the MCP experiment_* tools (separate TS impl) target the SAME files + ledger anchor as the SSOT", () => {
    expect(mcpTool).toContain(LEARNINGS);
    expect(mcpTool).toContain(QUEUE);
    expect(mcpTool).toContain(layout.EXPERIMENTS); // "experiments"
    expect(mcpTool).toContain(MEMORY_ANCHOR);
  });

  it("all three memory writers share ONE canonical learning bullet template (no format drift)", () => {
    // The CLI lib, the MCP tool, and the app writer (memory-mdx.ts) render the same
    // bullet by convention (separate packages, can't import). These markers — confidence
    // ALWAYS present (— when null), the optional summary insertion point, the Used-by
    // backlink, and the trailing-punctuation guard — must appear in all three, so the one
    // reader (parseLearnings) reads every writer. Change one writer, change all three.
    const markers = ['?? "—"} · from [', ".${reason} Review by: ", ". Used by: —", "/[.!?]$/.test("];
    for (const src of [cliLib, mcpTool, appWriter]) {
      for (const m of markers) expect(src).toContain(m);
    }
  });
});
