# Wave Decisions — systemix-v2

**Wave:** META-PLAN → DISCOVER → DESIGN (compressed)
**Date:** 2026-06-02
**Status:** DESIGN locked — `init` contract decided (ADR-006..009). Ready for build.

> This stub records the decisions made *before* the waves begin. Each wave appends its own section (gate summary + decisions + open questions) per the repo convention (`docs/feature/landing-rework/wave-decisions.md`).

---

## Decisions Locked Before DISCOVER

### D1: Embedded per-client distribution
Systemix v-next ships as `npx systemix init` and runs *inside* a client's design-system repo as a single-tenant instance. The central multi-tenant Next.js + Supabase app is no longer the target shape. The waves design *how* to embed, not *whether*.

### D2: Connecta repo topology — DS repo + app monorepo
- `connecta-design-system` — separate, publishable (`@connecta/design-system`), contains the embedded Systemix instance, the Tamagui base theme, components, and the self-updating docs (`sync-docs` → `/docs`).
- Connecta **app monorepo** (fork of `denitsa9006/connecta` evolved into a Turborepo) — `apps/landing` + `apps/platform`, both consuming the DS package.

### D3: Run v-next as an nWave feature
Use the existing wave process (`docs/feature/systemix-v2/{discover,discuss,diverge}/` + `recommendation.md` + this file). This turn produced only the meta-plan (`meta-plan.md`) — no waves run yet.

---

## Supersedes (from PLAN.md iteration 2)
- Single forked `connecta-app` with everything inside it → **split** into DS repo + app monorepo (D2).
- `/styleguide` route living inside the app → docs now live in `connecta-design-system` via the embedded instance's `sync-docs` loop.

---

## Open Questions for DISCOVER Wave
1. Local data store for the embedded instance — `.systemix/` files vs per-repo SQLite vs optional Supabase sync. (meta-plan §4.1)
2. Does any control plane stay central? (meta-plan §4.2)
3. Where does the hypothesis-validation loop bind — DS-repo instance, landing app, or separate concern? (meta-plan §4.4)
4. Exact `npx systemix init` contract — the gating artifact for the Connecta DS build. (meta-plan §4.6, §8)
5. Per-component v1→v-next disposition (port / re-shape / deprecate). (meta-plan §4.7)

---

## Handoff
**Handoff to:** DISCOVER wave (`nw-discover` / `nw-research`)
**Decision statement:** Meta-plan approved. Proceed to DISCOVER — produce `gap-analysis-v2.md` + `connecta-learnings.md`. Do not scaffold `connecta-design-system` until the `init` contract is locked in DESIGN.

---

# Wave: DISCOVER

**Date:** 2026-06-02
**Status:** Complete — ready for DISCUSS
**Outputs:** `discover/gap-analysis-v2.md`, `discover/connecta-learnings.md`

## Gate Summary
| Gate | Criterion | Status |
|------|-----------|--------|
| Baseline established | Every v1 component assigned a v-next disposition | PASS — 20 components classified (9 PORT, 6 RE-SHAPE, 4 DEPRECATE→optional, 1 PROMOTE) in `gap-analysis-v2.md` |
| Evidence harvested | Design-partner learnings grounded in research, each with an implication | PASS — 8 learnings (L1–L8) in `connecta-learnings.md`, each cited to `research/*` |
| Migration bounded (criterion C4) | A finite migration path, no "rewrite everything" | PASS — embed substrate ~60% already built (9 PORT); v-next is re-shape of delivery + data plane |

## Key Decisions / Findings
1. **`init` already exists but installs globally** (`packages/cli/src/init.js`) — the core v-next re-shape is making `init` scaffold a *self-contained instance inside the client repo*. This is the linchpin.
2. **Data-plane reversal** — v1 moved `.systemix/*.json` *up* into Supabase; v-next likely makes the local store the source of truth and demotes the central DB to optional. The reconciler already writes `.systemix/runs/`, proving the local path survives.
3. **Central dashboard is the main casualty** — 4 UI components deprecate to an optional control plane. Whether a hosted control plane survives is the highest-leverage open decision.
4. **Distribution (npm publish) → P0** — promoted from v1's P3.
5. **Engine/content boundary sharpened** (L6) — Systemix ships a generic loop; components are the client's domain. Keeps scope honest.

## Open Questions for DISCUSS Wave
1. **Central control plane: delete or demote?** L4/L7 (compliance-bound evidence) + HITL-across-instances pull a control plane back in, even though the engine embeds cleanly. (gap-analysis-v2 §"DISCOVER concludes" #3; connecta-learnings "Open tension for DESIGN")
2. **Local store format** — `.systemix/*.json` (gitable, CI-friendly) vs per-repo SQLite (queryable). (meta-plan §4.1)
3. **Hypothesis-loop binding** — landing app instance vs DS-repo instance vs separate concern; also a compliance decision (L4/L7). (meta-plan §4.4)
4. **Job deltas** — reconcile the 6 candidate jobs (connecta-learnings "Cross-cutting takeaways") against `docs/product/jobs.yaml` (currently centered on JOB-001 evidence-permanence); record with a changelog entry.

## Handoff
**Handoff to:** DISCUSS wave (`nw-discuss` → `jobs.yaml` deltas)
**Decision statement:** DISCOVER complete. The embed is bounded and mostly built; the unresolved questions are *product* (control-plane survival, hypothesis binding) not *feasibility*. DISCUSS should resolve the job deltas and frame the control-plane decision for DIVERGE to generate options against.

---

# Waves: DISCUSS + DIVERGE + DESIGN (compressed)

**Date:** 2026-06-02
**Status:** Complete — locked as ADR-006..009
**Why compressed:** The founder answered the open architecture questions directly **and** supplied a working prototype that embodies the instance design (`prototypes/systemix-onboarding-v2.jsx` + `systemix-graph-standalone.html`). Running the three waves ceremonially would re-derive a decision already made and validated — the same pragmatic absorption used in `docs/feature/landing-rework/` ("no new competitive research needed"). The waves are recorded as resolved, not skipped.

## Founder decisions (resolve DISCOVER's open questions)
| Open question (DISCOVER) | Decision | ADR |
|---|---|---|
| Control plane: delete or demote? | **Demote** to optional control plane; local repo is source of truth | ADR-006 |
| Local store format | **Files** (MDX contracts + `queue.json` + `systemix.config.yaml` + `.systemix/`) | ADR-007 |
| The `init` contract | **4-question topology wizard** → `systemix.config.yaml`; project-scoped skills; `watch` runs Hermes on Ollama; Trust Tier 0 at init | ADR-008 |
| Hypothesis-loop binding | **Consuming app** runs its own instance; DS package stays pure | ADR-009 |

## The prototype as DESIGN output
- `systemix-onboarding-v2.jsx` — the **`npx systemix init` UX**: 4 steps (Surfaces · Signals · Autonomy · Self-improvement) → `systemix.config.yaml`. Also defines the full node/edge taxonomy of the instance (sources, tools, agents, skills, artifacts, infra, ui) and the data flows between them.
- `systemix-graph-standalone.html` — the **local force-graph viewer** of an instance's topology. This is the local-first replacement for the demoted central dashboard (ADR-006) — "what the design partner sees on localhost."
- Confirmed architecture facts: contracts are MDX files in-repo ("no database, no hosted UI"); Hermes is local Ollama (air-gapped); the dashboard is a read-only view over the contracts; self-improvement = the `/meta-audit` loop writing a `contract/meta/hermes-accuracy.mdx` meta-contract.

## Refinements flagged (not blockers)
1. **Prototype copy says skills install at `~/.claude/skills/` (global)** — must change to **project-scoped/vendored** for a self-contained, CI-reproducible instance (ADR-008 consequence; gap-analysis-v2 "CLI core → RE-SHAPE").
2. **Two instances per engagement** (DS + landing) — confirm this is acceptable operationally (ADR-009 review trigger).
3. **`jobs.yaml` deltas** still want a formal pass + changelog entry to register the embedded-distribution jobs (deferred — does not block build).

## Handoff
**Handoff to:** BUILD (Connecta Phase 1, gated by the now-locked `init` contract) + a later `jobs.yaml` reconciliation.
**Decision statement:** v-next architecture is locked at ADR-006..009. `connecta-design-system` may now be scaffolded against the `init` contract. The `init.js` re-shape (global → project-scoped instance scaffold) is the first engine build task.
