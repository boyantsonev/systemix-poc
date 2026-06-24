import { describe, it, expect } from "vitest";
import {
  appendMemoryEntry,
  renderMemoryLine,
  titleFromExperiment,
  addDays,
  type MemoryEntry,
} from "./memory-mdx";

const ENTRY: MemoryEntry = {
  date: "2026-06-19",
  title: "velocity-gap framing wins",
  experimentId: "landing-velocity-gap-2026-06",
  decision: "promote",
  confidence: 0.82,
  summary: "Pre-PMF founders respond to the velocity-gap framing",
  reviewBy: "2026-09-17",
};

const INDEX = [
  "---",
  "type: contract",
  "title: The Contract",
  "---",
  "",
  "## Memory",
  "",
  "Memory is written only from closed experiments — every entry cites the experiment that earned it.",
  "",
  "*No entries yet.* The first entry lands when the first experiment closes.",
  "",
  "## Decision log",
  "",
  "Resolved decisions live in the ledger.",
  "",
].join("\n");

describe("renderMemoryLine", () => {
  it("renders the canonical provenance-bearing bullet", () => {
    const line = renderMemoryLine(ENTRY);
    expect(line).toContain("**2026-06-19 · velocity-gap framing wins**");
    expect(line).toContain("confidence 0.82");
    expect(line).toContain("from [landing-velocity-gap-2026-06]");
    expect(line).toContain("decision: promote");
    expect(line).toContain("Review by: 2026-09-17");
    expect(line).toContain("Used by: —");
  });

  it("renders confidence as — when null (canonical: always present)", () => {
    expect(renderMemoryLine({ ...ENTRY, confidence: null })).toContain("confidence —");
  });

  it("drops the summary clause cleanly when empty (no double space)", () => {
    const line = renderMemoryLine({ ...ENTRY, summary: "" });
    expect(line).toContain("decision: promote. Review by:");
    expect(line).not.toContain("  "); // no doubled spaces
  });
});

describe("appendMemoryEntry", () => {
  it("the first write replaces the placeholder and keeps the intro", () => {
    const out = appendMemoryEntry(INDEX, ENTRY)!;
    expect(out).not.toContain("No entries yet");
    expect(out).toContain("Memory is written only from closed experiments");
    expect(out).toContain("from [landing-velocity-gap-2026-06]");
    // Decision log heading survives untouched.
    expect(out).toContain("## Decision log");
    expect(out).toContain("Resolved decisions live in the ledger.");
  });

  it("a second write keeps the first, newest on top", () => {
    const once = appendMemoryEntry(INDEX, ENTRY)!;
    const twice = appendMemoryEntry(once, {
      ...ENTRY,
      date: "2026-07-01",
      title: "second learning",
      experimentId: "exp-2",
    })!;
    const first = twice.indexOf("second learning");
    const second = twice.indexOf("velocity-gap framing wins");
    expect(first).toBeGreaterThan(-1);
    expect(second).toBeGreaterThan(-1);
    expect(first).toBeLessThan(second); // newest first
  });

  it("returns null when there is no ## Memory section", () => {
    expect(appendMemoryEntry("---\ntype: contract\n---\n\n## Brief\n\nx\n", ENTRY)).toBeNull();
  });
});

describe("helpers", () => {
  it("titleFromExperiment takes the first clause", () => {
    expect(titleFromExperiment("One two three four five six seven", "fallback")).toBe(
      "One two three four five six…",
    );
    expect(titleFromExperiment(undefined, "fallback-id")).toBe("fallback-id");
  });

  it("addDays advances a date string", () => {
    expect(addDays("2026-06-19", 90)).toBe("2026-09-17");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});
