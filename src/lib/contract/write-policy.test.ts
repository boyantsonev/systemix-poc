import { describe, it, expect } from "vitest";
import {
  mayWrite,
  assertWriteAllowed,
  WritePolicyError,
  tierBand,
  MATRIX_ROWS,
} from "./write-policy";

// The autonomy dial made mechanical (docs/feature/contract-rework/contract-model.md).
// These tests ARE the covenant: at ghost tier the engine may not write directly,
// and goals are never autonomous at any tier.
describe("write-policy matrix", () => {
  it("ghost (tier 0) proposes everything except record status", () => {
    expect(mayWrite(0, "evidence")).toBe("propose");
    expect(mayWrite(0, "hypothesis")).toBe("propose");
    expect(mayWrite(0, "memory")).toBe("propose");
    expect(mayWrite(0, "goal")).toBe("propose");
    expect(mayWrite(0, "brief")).toBe("propose");
    expect(mayWrite(0, "record")).toBe("auto"); // drift/parity already auto via skills
  });

  it("balanced (tier 1) auto-writes evidence but still proposes memory + hypotheses", () => {
    expect(mayWrite(1, "evidence")).toBe("auto");
    expect(mayWrite(1, "memory")).toBe("propose");
    expect(mayWrite(1, "hypothesis")).toBe("propose");
  });

  it("high (tier 2+) auto-writes evidence, hypotheses, and memory", () => {
    expect(mayWrite(2, "memory")).toBe("auto");
    expect(mayWrite(2, "hypothesis")).toBe("auto");
    expect(mayWrite(3, "memory")).toBe("auto");
  });

  it("the covenant: goals and the brief are never autonomous, at any tier", () => {
    for (const tier of [0, 1, 2, 3, 99]) {
      expect(mayWrite(tier, "goal")).toBe("propose");
      expect(mayWrite(tier, "brief")).toBe("propose");
    }
  });

  it("tierBand maps 0→ghost, 1→balanced, 2+→high", () => {
    expect(tierBand(0)).toBe("ghost");
    expect(tierBand(1)).toBe("balanced");
    expect(tierBand(2)).toBe("high");
    expect(tierBand(3)).toBe("high");
  });
});

describe("assertWriteAllowed", () => {
  it("a human-approved write is always allowed (the human is the gate)", () => {
    expect(() =>
      assertWriteAllowed({ tier: 0, artifact: "memory", humanApproved: true }),
    ).not.toThrow();
    expect(() =>
      assertWriteAllowed({ tier: 0, artifact: "goal", humanApproved: true }),
    ).not.toThrow();
  });

  it("an autonomous memory write is rejected at ghost tier", () => {
    expect(() =>
      assertWriteAllowed({ tier: 0, artifact: "memory", humanApproved: false }),
    ).toThrow(WritePolicyError);
  });

  it("an autonomous memory write is allowed at high tier", () => {
    expect(() =>
      assertWriteAllowed({ tier: 2, artifact: "memory", humanApproved: false }),
    ).not.toThrow();
  });

  it("an autonomous goal write is rejected at every tier", () => {
    expect(() =>
      assertWriteAllowed({ tier: 3, artifact: "goal", humanApproved: false }),
    ).toThrow(WritePolicyError);
  });
});

describe("MATRIX_ROWS (the rows the AutonomyClause renders)", () => {
  it("derives from the same policy the guards enforce", () => {
    const memory = MATRIX_ROWS.find((r) => r.artifact === "memory")!;
    expect(memory).toMatchObject({ ghost: "propose", balanced: "propose", high: "auto" });
    const goal = MATRIX_ROWS.find((r) => r.artifact === "goal")!;
    expect(goal).toMatchObject({ ghost: "propose", balanced: "propose", high: "propose" });
  });
});
