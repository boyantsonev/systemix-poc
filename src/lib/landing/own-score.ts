import fs from "node:fs";
import path from "node:path";

// This repo's own report, built from a committed results file, so the score the site shows
// is never made up. Used by the landing's proof section and by /report.

export type OwnReport = {
  overall: number;
  areas: { key: string; label: string; score: number }[];
  caveats: { id: string; area: string; label: string; value: string; points: number; max: number; recommendation: string | null }[];
  caveatCount: number;
  commit: string;
};

export async function loadOwnReport(): Promise<OwnReport | null> {
  try {
    const file = path.join(process.cwd(), "packages/cli/tests/acceptance/skills/fixtures/systemix-poc-986a92fca0cb.counters.json");
    const counters = JSON.parse(fs.readFileSync(file, "utf8"));
    const { build } = await import("../../../packages/cli/src/lib/quick-report.js");
    const r = build(counters);
    if (!r.scored || r.overall === null) return null;
    return { overall: r.overall, areas: r.areas, caveats: r.caveats, caveatCount: r.caveatCount ?? r.caveats.length, commit: String(counters.repo?.commit ?? "").slice(0, 12) };
  } catch {
    return null;
  }
}
