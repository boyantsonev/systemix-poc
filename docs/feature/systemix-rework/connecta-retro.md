# Connecta Retrospective — POC & Design Partner #1

**Purpose:** reevaluate Connecta (the design system + platform built as the Systemix POC and design
partner) — what worked, what didn't, why — and fold the learnings into a harder-edged `init` + a
shadcn-native per-instance template. **Decision: Connecta stays design partner #1** (🔒 locked as ADR-012).

**Scope note:** this retro covers the *engagement* (how Connecta exercised Systemix). It is **not**
the open question of *what Connecta itself is* — the SLM hypothesis is still unconfirmed and gets its
own research track. That track does **not** gate the Systemix template.

---

## What worked / validated

| What | Evidence | Why it matters to Systemix |
|---|---|---|
| **Embedded per-instance model** | `connecta-design-system` runs an embedded instance; local-first files. | Proved ADR-006/007 — the client repo as source of truth is viable. |
| **DS-as-first-class-object** | Connecta DS = the example instance; Systemix's own DS = dogfood (ADR-014). | The "design system is a type, not a one-off" framing held up. |
| **The token bridge** | 31 tokens / 3 collections (Semantic 26 / Status 4 / Spacing&Radius 1), oklch→hex/rgba. | The DS→Figma pipeline shape is real and reusable. |
| **The Atlas hexagonal port** | `apps/platform/src/ports/catalog.ts` — `Workflow`/`Step`/`StepKind`/`Pattern`; `flow-layout.ts` pure transform. | **The clean generalization seam:** the `WorkflowCatalog` port is the *only* client-specific bit. Layout + shell are already client-agnostic → a Systemix Atlas = any client provides a catalog, Systemix renders the same map. |
| **sync-docs registry pattern** | `lib/data/docs.ts` (16 entries) conforming to a sync-docs schema. | The living-styleguide data model that the System layer + Fumadocs adapter build on. |
| **Separate DS repo as an update-path** | `github.com/boyantsonev/connecta-design-system` already exists → `systemix update`, not provision. | Confirmed the init-vs-update split (ADR-011/014). |
| **Two-instance insight** | DS repo + landing app, each its own `systemix.config.yaml` (ADR-009). | The hypothesis loop binds to the consuming app, not the DS package. |

## What didn't work / friction

| Friction | Detail | Consequence |
|---|---|---|
| **Tamagui stack mismatch** | `--legacy-peer-deps` on every install (RNW@0.19 vs React 19); `withTamagui` inactive under ESM `next.config.mjs`; runtime `TamaguiProvider` only. | Connecta DS **can't be the literal Systemix template** — Systemix is shadcn (Radix + Tailwind + CSS-var tokens). The DS is a worked example, not a copy source. |
| **Connecta's product definition is unsettled** | "Is Connecta an SLM?" raised 2026-06-03, still unconfirmed; framing (educational agentic UI, 3 interaction axes → AG-UI/MCP/A2A) not validated. | Building the loop on a moving target. Mitigate by keeping Systemix **generic**; Connecta-specific content stays in the Connecta instance. |
| **Atlas prototype is Vite + Tamagui** | `apps/platform` at `:5173`, `@xyflow/react` + Tamagui. | **Logic ports verbatim** (`catalog.ts`, `flow-layout.ts`); **UI re-implemented in shadcn**. Don't bring Tamagui into Systemix. |
| **Repo-topology drift** | Connecta exists as both a standalone DS repo and a near-duplicate `connecta/packages/design-system` in the monorepo. | Demote the monorepo copy to a consumer; standalone repo is canonical. |
| **`/sync-docs` automation gap** | `docs.ts` was hand-written; the sync-docs skill that regenerates it is a future TODO. | The System layer's "Hermes-maintained" promise is still partly manual — flag, don't overstate. |

## Why (root causes)

1. **Stack divergence** — Tamagui is Connecta-only (cross-platform/Expo need); Systemix standardizes
   on shadcn. The two can't share component code, only *patterns* and *pure logic*.
2. **Definition instability** — Connecta's own primitive is unconfirmed, so anything Connecta-shaped
   risks churn; keep the Systemix engine generic and push specifics into the instance.
3. **Topology drift** — multi-repo vs monorepo decisions evolved mid-engagement, leaving duplicates.

## Learnings → init + template

- **Ship a shadcn-native per-instance template.** Re-implement, don't port. Pure logic
  (`flow-layout.ts`, the catalog port) carries over verbatim; shells/components are rewritten.
- **Generate the Atlas catalog** from `systemix.config.yaml` + agent defs rather than hardcoding
  12 workflows — that's what makes Atlas a *Systemix* surface, not a Connecta one.
- **Keep DS repos as an update-path**; reserve provision for genuinely new repos.
- **Treat Connecta as the worked example** that proves the seams (per-instance model, token bridge,
  catalog port), not as the template source.
- **Quarantine the "what is Connecta / SLM" question** into its own research track; it must not gate
  the Systemix engine or template.

## Decision

**Connecta stays design partner #1.** The retro hardens `init` and the template; it does not pause or
drop Connecta. Continue Connecta's DS + landing as the worked example, on the shadcn-native template
where Systemix code is involved.

## Related

- [[project_connecta_definition]] — the still-open "what is Connecta" research.
- [[project_atlas_workflow_map]] — the catalog port = generalization seam.
- [[project_systemix_stack_shadcn]] — shadcn for Systemix; Tamagui Connecta-only.
- ADR-006…014 in `decisions/ADR.md`.
