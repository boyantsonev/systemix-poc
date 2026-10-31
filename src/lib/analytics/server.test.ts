import { describe, expect, it } from "vitest";
import { filesBand, scoreBand } from "./server";

describe("analytics bands", () => {
  it("bands scores in fifths", () => {
    expect([0, 19, 20, 53, 79, 80, 100].map(scoreBand)).toEqual(["0-19", "0-19", "20-39", "40-59", "60-79", "80-100", "80-100"]);
    expect(scoreBand(null)).toBeNull();
  });
  it("bands file counts coarsely", () => {
    expect([0, 49, 50, 199, 200, 999, 1000].map(filesBand)).toEqual(["<50", "<50", "50-199", "50-199", "200-999", "200-999", "1000+"]);
    expect(filesBand("12")).toBeNull();
  });
});
