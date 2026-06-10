# DISCUSS Decisions — atlas-phase-2

> Wave 2 (compressed). Spec/DESIGN already exists at `docs/feature/atlas-surface/spec.md` §5.
> Job is pre-validated in SSOT — JTBD skipped per the DISCUSS decision matrix.

## Key Decisions
- **[D1] Feature type = Backend.** The deliverable is a CLI generator (`npx systemix atlas build`)
  + a config-schema addition. The `/atlas` renderer already shipped in Phase 1; it only swaps
  its data source (hardcoded module → generated catalog). (see: spec §5, §7 Phase-2)
- **[D2] Walking skeleton = one workflow, full pipeline.** Thinnest end-to-end slice:
  `contract/workflows/founder-the-loop.mdx` → `atlas build` → generated catalog → `/atlas`
  renders that one workflow. Prove the pipeline before migrating the rest.
- **[D3] Seed catalog = dogfood the own 9 (founder decision, 2026-06-09).** Migrate the 9
  workflows currently hardcoded in `src/lib/data/atlas-catalog.ts` into nine
  `contract/workflows/*.mdx` files, generate them back, and assert `/atlas` renders **identically**
  (parity). This is the migration that makes `/atlas` data-driven with zero visual regression —
  not a fresh demo. A generic client example is explicitly OUT (deferrable to a later slice).
- **[D4] Contract format = MDX frontmatter** (spec open-q #1, leaning MDX) — consistent with
  `contract/hypotheses/*.mdx`, lets `kind`/`pattern` stay closed enums while `persona`/`surface`/
  `agent` become open vocab declared in config.
- **[D5] `/atlas-scan` authoring loop = OUT (Phase 3).** Do not build the codebase-scanning
  skill now; hand-author the 9 contracts. (spec §6)

## Requirements Summary
- Primary job: **JOB-006 keep-engine-generic** ("the client owns the domain components; Systemix
  documents and keeps them in sync without prescribing what they must be") + **JOB-002
  install-into-foreign-repo** (Atlas must render from a per-instance source, not Systemix-baked data).
- Walking-skeleton scope: 1 workflow end-to-end (D2), then migrate to all 9 (D3).
- Feature type: backend (D1).

## Acceptance Criteria (DISTILL anchor — what `atlas build` must satisfy)
**AC-1 (walking skeleton).** Given one valid `contract/workflows/*.mdx`, `npx systemix atlas build`
emits a catalog artifact implementing the `WorkflowCatalog` port (`all()`/`byPersona()`/`byId()`),
and `/atlas` renders that workflow.
**AC-2 (vocab validation).** A contract whose `persona`/`surface`/`agent` is NOT declared in the
`atlas:` block of `systemix.config.yaml` is a build error naming the file + the unknown value —
not a silent pass. `kind`/`pattern` validated against the closed enums.
**AC-3 (parity — the dogfood gate).** After migrating all 9 workflows to contracts, the generated
catalog is **deep-equal** to the current hardcoded `atlas-catalog.ts` (same ids, personas, steps,
edges, ordering). `/atlas` is visually unchanged.
**AC-4 (empty state).** Absent `atlas:` block OR no `contract/workflows/*.mdx` → build emits an
empty catalog and `/atlas` shows the empty state (like `/instance` without config). No crash.
**AC-5 (malformed contract).** A contract with broken frontmatter or a missing required field
(`id`/`persona`/`title`/`pattern`/`steps`) fails the build with a file-scoped error; other
contracts are unaffected.
**AC-6 (idempotent).** Running `atlas build` twice with no input change produces a byte-identical
catalog artifact.

## Outcome KPIs
- **Parity**: generated catalog deep-equals the hardcoded one (0 diffs) — binary gate.
- **De-Connecta-fication**: 0 persona/agent/surface string literals remain hardcoded in
  app `src/` for the catalog (all sourced from contracts + config).
- **Coverage**: generator logic ≥ 80% mutation kill rate (packages/cli Jest, post-DELIVER).

## Constraints Established
- Reuse `src/lib/ports/atlas.ts` (types) and `src/lib/adapters/flow-layout.ts` (pure transform)
  **unchanged** — only the catalog *data source* changes.
- Generator lives in `packages/cli/` (Jest-tested), consistent with existing CLI commands.
- Do NOT conflate with `src/lib/data/workflows.ts` (models Systemix's own build pipeline — different domain).

## Upstream Changes
- None. Aligns with existing SSOT JOB-006/JOB-002; no DISCOVER assumptions changed.
