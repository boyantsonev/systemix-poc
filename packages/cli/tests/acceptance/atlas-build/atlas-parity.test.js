"use strict";

/**
 * Parity gate — atlas-phase-2 AC-3 (the dogfood gate)
 *
 * After migrating all 9 hardcoded workflows into contract/workflows/*.mdx, the
 * generated catalog MUST be deep-equal to the original hardcoded WORKFLOWS array
 * (same ids, personas, titles, patterns, surfaces, steps incl. agent/screen/note,
 * edges, AND ORDER). The original was snapshotted to fixtures/original-workflows.json
 * BEFORE atlas-catalog.ts was refactored, so it survives the swap as a stable oracle.
 *
 * This builds against the REAL repo (contract/workflows/ + systemix.config.yaml),
 * not a tmp fixture — it is the actual migration under test.
 */

const fs   = require("fs");
const path = require("path");

const atlasBuild = require("../../../src/commands/atlas");

// Repo root = five levels up from this test file:
// atlas-build → acceptance → tests → cli → packages → <repo root>.
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "..");

const ORIGINAL = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "original-workflows.json"), "utf8")
);

describe("Atlas parity — generated catalog deep-equals the original 9 (AC-3)", () => {
  it("the generated catalog's all() is deep-equal to the original hardcoded WORKFLOWS, in order", async () => {
    // When — build the catalog from the real instance contracts
    const { catalog } = await atlasBuild.build({ projectRoot: REPO_ROOT });
    const generated = catalog.all();

    // Then — identical count, order, and full structure
    expect(generated).toHaveLength(ORIGINAL.length);
    expect(generated.map((w) => w.id)).toEqual(ORIGINAL.map((w) => w.id));
    // Deep structural equality — the binary parity gate.
    expect(generated).toEqual(ORIGINAL);
  });

  it("byPersona and byId over the generated catalog match the original per-persona slices", async () => {
    const { catalog } = await atlasBuild.build({ projectRoot: REPO_ROOT });

    for (const persona of ["founder", "designer", "engineer"]) {
      const expected = ORIGINAL.filter((w) => w.persona === persona);
      expect(catalog.byPersona(persona)).toEqual(expected);
    }
    expect(catalog.byId("founder-loop")).toEqual(
      ORIGINAL.find((w) => w.id === "founder-loop")
    );
  });
});
