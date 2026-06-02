# Systemix v-next — Meta-Plan (Plan-to-Plan)

**Feature ID:** systemix-v2
**Type:** Architecture evolution (not a UI feature)
**Status:** META-PLAN — defines the waves; waves not yet run
**Date:** 2026-06-02
**Driver:** Connecta (Design Partner #1) is the first external install. Its three-repo shape forces Systemix to decide its distribution architecture.

> This document is the **plan we will follow to plan, evaluate, and define** Systemix v-next. It does not make the v-next design decisions — it defines the process, inputs, questions, criteria, and gates by which those decisions will be made. It rides the repo's existing nWave rails (`docs/feature/<name>/{discover,discuss,diverge}/` + `recommendation.md` + `wave-decisions.md`).

---

## 1. Objective & Central Question

**Objective:** Define the next architecture of Systemix such that it can be **installed into a client's design-system repo and run locally** (`npx systemix init`), with Connecta as the first proof.

**Central question:**
> How does Systemix move from a *central, multi-tenant, Supabase-backed dashboard* to an *embedded, single-tenant-per-repo instance* — and what, if anything, remains central?

This is the locked product decision (see `wave-decisions.md` D1: **Embedded per-client**). The waves do not re-litigate *whether* to embed; they design *how*.

---

## 2. Evidence Base / Inputs

| Input | What it provides | Path |
|---|---|---|
| Gap Analysis v1 | Component-by-component build status (built / partial / not-started) — the v1 baseline | `docs/gap-analysis-v1.md` |
| Current central data model | What multi-tenancy looks like today (projects, project_members, RLS, realtime) — the thing being re-shaped | `supabase/schema.sql` |
| Multi-brand model | `Brand` + layered `tokenOverrides`, written by `component-themer` — becomes single-tenant-per-instance | `src/lib/data/brands.ts` |
| Docs loop | `sync-docs` → `docs.ts` → `/app/docs` — the self-updating docs mechanic that must run *inside* a client repo | `packages/cli/pipelines/figma-to-code/skills/sync-docs/SKILL.md` |
| Distribution surface | CLI (`init`/`add`/`doctor`), mcp-server, mcp-proxy, github-action — the embed substrate already half-built | `packages/{cli,mcp-server,mcp-proxy,github-action}` |
| JTBD SSOT | Canonical jobs; v-next adds/updates jobs here | `docs/product/jobs.yaml` |
| Connecta research set | Real client constraints: Tamagui theme, component inventory, analytics (PostHog EU), framework migration | `research/*` |
| Existing ADRs | Decisions not to contradict | `decisions/ADR.md`, `docs/product/architecture/adr-*.md` |

**Note:** `npx systemix init` is already referenced as the assumed onboarding sequence in `docs/feature/landing-rework/` — v-next must make that contract real, not aspirational.

---

## 3. The Architectural Shift to Evaluate

| Dimension | Today (central) | v-next target (embedded) | Tension to resolve in DESIGN |
|---|---|---|---|
| Tenancy | Many tenants in one Supabase DB, isolated by RLS | One instance = one client repo | Does the central DB survive as an optional control plane? |
| Data store | Supabase (Postgres) | Local-first (`.systemix/` files? per-repo SQLite? optional Supabase) | What is the source of truth when offline/CI? |
| Dashboard | Central Next.js app (`src/app/*`) | Per-instance, runs locally (`npx systemix dev`?) | Is there still a hosted dashboard, and what does it show? |
| HITL queue | Central `hitl_tasks` table + UI | Local queue per repo | How does a human review across many client instances? |
| Brands | `brands.ts` array of many brands | The instance *is* the brand | Migration path for the array → single config |
| Distribution | Deploy the app | `npx systemix init` scaffolds into the client repo | The init contract (files written, deps, MCP wiring) |
| Evidence / hypothesis loop | Contracts in `contract/` (central repo) | Lives where? DS repo? landing app? | Binding between the landing app and an instance |

---

## 4. Open Questions the Waves Must Resolve

1. **Local data store** — `.systemix/` JSON files (already the legacy pattern, see schema comments "replaces .systemix/events/*.json") vs per-repo SQLite vs optional Supabase sync. Source of truth in CI?
2. **Control plane survival** — Does anything stay central (cross-client evidence registry, auth, license, TokenGuard aggregate)? Or is v-next fully decentralized with central as a later add-on (the "hybrid control-plane" option deferred in the product decision)?
3. **HITL across instances** — local approval per repo vs a central inbox aggregating many instances.
4. **Hypothesis-validation binding** — the Connecta *landing* is the first user of the hypothesis pipeline. Does the landing app embed its own instance, or does the **DS-repo instance** own experiments, or is hypothesis a separate concern from the design-system loop entirely?
5. **TokenGuard per-instance** — budget enforcement and caching when each client runs its own instance + CI action.
6. **`init` contract** — exactly what `npx systemix init` writes into a client repo (config, skills, MCP registration, `.systemix/` scaffold, package deps) — this is the **gating artifact** for the Connecta DS build.
7. **What migrates from v1** — which of the 23 components in `gap-analysis-v1.md` port as-is, which get re-shaped for embed, which are deprecated.

---

## 5. Evaluation Criteria / Decision Gates

A v-next architecture option is acceptable only if it satisfies:

| # | Criterion | Test |
|---|---|---|
| C1 | **Embeddable** | `npx systemix init` produces a working instance in a fresh repo with no central dependency required to run the design-system loop. |
| C2 | **Connecta-provable** | The exact path scaffolds `connecta-design-system` and runs `sync-docs` → renders `/docs` for Connecta's components. |
| C3 | **Local-first** | The design-system + docs loops run in CI and offline; central sync (if any) is optional. |
| C4 | **Migration-bounded** | A named, finite migration path from the v1 central model (no "rewrite everything"). |
| C5 | **Cost-bounded** | TokenGuard budget enforcement works per-instance (the github-action contract holds). |
| C6 | **Reuses existing skills** | The 3 pipelines (`design-system`, `figma-to-code`, `hypothesis-validation`) run inside an instance largely unchanged. |

**Decision gates** mirror the nWave gates used in `docs/feature/landing-rework/wave-decisions.md` (G1 strategic-job framing, G2 evidence, G3 option diversity, G4 weighted ranking + dissent).

---

## 6. Wave Sequence

| Wave | Goal | Key inputs | Outputs | Skill |
|---|---|---|---|---|
| **DISCOVER** | Establish the v-next baseline + harvest Connecta learnings | `gap-analysis-v1.md`, `supabase/schema.sql`, `research/*` | `discover/gap-analysis-v2.md` (target delta), `discover/connecta-learnings.md` | `nw-discover` / `nw-research` |
| **DISCUSS** | Update the jobs the architecture must serve | `docs/product/jobs.yaml`, DISCOVER outputs | `jobs.yaml` deltas (new/changed jobs for embedded distribution) | `nw-discuss` |
| **DIVERGE** | Generate + score distribution-architecture options | DISCUSS jobs, §3 tensions, §5 criteria | `diverge/options-raw.md`, `diverge/taste-evaluation.md`, `recommendation.md` | `nw-diverge` |
| **DESIGN** | Lock the target architecture + the `init` contract | `recommendation.md` | New ADRs (`decisions/ADR.md` + `docs/product/architecture/`), `init`-contract spec | `nw-design` |

Each wave closes with a `wave-decisions.md` update (gate summary + decisions + open questions for the next wave), matching the repo convention.

---

## 7. Artifacts Produced (definition of done for the planning phase)

- `discover/gap-analysis-v2.md` — v1→v-next component delta (port / re-shape / deprecate per component).
- `discover/connecta-learnings.md` — what Design Partner #1 taught us (framework migration, Tamagui, PostHog-EU/Clarity compliance, embedded-instance pull).
- `jobs.yaml` updates — jobs for embedded distribution, with changelog entry.
- `recommendation.md` — chosen distribution architecture with dissenting case.
- ADR(s) — embedded-per-client model; local data store; control-plane stance; the `npx systemix init` contract.
- `wave-decisions.md` — per-wave decision log (stub created now).

---

## 8. Sequencing vs the Connecta Build (the critical dependency)

```
Systemix v-next: DISCOVER → DISCUSS → DIVERGE → DESIGN ──► locks `npx systemix init` contract
                                                              │
                                                              ▼
Connecta build:                                  scaffold connecta-design-system
                                                 (embedded instance) → Tamagui theme
                                                 → sync-docs → /docs → publish @connecta/ds
                                                              │
                                                              ▼
                                                 fork→app monorepo: build landing
                                                 (hypothesis pipeline) ; later platform
```

**Hard gate:** `connecta-design-system` cannot be scaffolded correctly until the `npx systemix init` contract (Wave DESIGN) is locked. Everything else in the Connecta engagement (theme, docs loop, landing) sits downstream of that single artifact.

**What can run in parallel (not blocked by v-next):** confirming Wisprflow hex values (DevTools), Connecta Clarity→PostHog-EU compliance fix on the live Astro site, and the deeper educational-AI component research (seeded by `research/connecta-component-inventory.md`) needed before the *platform* build.

---

## References
- Project map + workstreams: `PLAN.md` (repo root)
- Baseline: `docs/gap-analysis-v1.md`
- JTBD SSOT: `docs/product/jobs.yaml`
- Connecta research: `research/SYNTHESIS.md` and `research/*`
- Convention exemplar: `docs/feature/landing-rework/wave-decisions.md`
