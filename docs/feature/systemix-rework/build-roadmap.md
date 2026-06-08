# Build Roadmap — Next Phases

**Derives from:** the locked concept (ADR-010 three layers · ADR-011 Fumadocs · ADR-012 Connecta).
**Status:** plan. Turns the concept lock into a sequenced, dependency-ordered build.

## Phase 0 — Build home (locked 2026-06-08)

- **Dogfood here first.** Build the three layers in **this repo** as Systemix's **own DS instance**
  (ADR-014 E8 dogfood), on the existing seeds. `getsystemix` becomes **marketing + Fumadocs `/docs`
  + the dogfood three-layer app**.
- **Extract the template later** (Phase 6): the validated shell becomes the separate per-instance
  shell that `init` distributes; Connecta consumes it via `systemix update`.
- **First milestone = Fumadocs foundation** (Phase 1) — the keystone that unblocks the System layer
  and proves the one-theme architecture.

**Execution gotcha (from prior work):** building Next 16 inside a git **worktree** fails (no
`node_modules`; Turbopack rejects a symlinked `node_modules`). Build/verify in the **main checkout**.

---

## Phases

| Phase | Goal | Depends on | Can parallel? |
|---|---|---|---|
| **1 · Fumadocs foundation** ✅ | Shared theme + marketing `/docs` on Fumadocs | Phase 0 | — |
| **2 · System layer on Fumadocs** ✅ | In-app living styleguide at `/system` (lean; drift-control cut) | Phase 1 | — |
| **3 · Config layer** | Editable settings + 3D force graph + runtime feed/HITL | Phase 0 | ‖ with 1–2 |
| **4 · Atlas layer (gated)** | Workflow catalog → inline prototype, generated catalog | Phase 2 (theme/gate) + Phase 3 (catalog source) | — |
| **5 · Big landing redesign** | Three-layer story + real surface screenshots | Phases 2–4 (screenshots) | — |
| **6 · Extract init template** | The distributable per-instance shell; Connecta consumes | Phases 1–4 validated | — |

---

### Phase 1 · Fumadocs foundation  *(FIRST — the keystone)* — ✅ DONE (2026-06-08, build-verified)

1. Install Fumadocs (`fumadocs-core`/`-ui`/`-mdx`); add `createPreset({ cssPrefix: 'fuma-' })`;
   wire the **shared** `globals.css` token source; import order
   `tailwindcss → fumadocs-ui/css/shadcn.css → preset.css`; scope away global `background`/`color`
   resets; don't double-load `@tailwindcss/typography`.
2. Migrate marketing **`/docs`** onto Fumadocs — MDX in `content/docs/*`, **keep**
   `src/lib/docs-manifest.ts` as the tree/status source (sync-docs-compatible). Port pages per the
   journey IA in [`../site-rebuild/docs-ia.md`](../site-rebuild/docs-ia.md)
   (Install → Configure → Run → Extend; `layers/*` slugs). Delete the hand-rolled
   `next-mdx-remote/rsc` + `gray-matter` loader **after parity**.

**Files:** `package.json`, `src/app/globals.css`, tailwind/preset config, `src/app/docs/*`,
`content/docs/*`, `src/lib/docs-manifest.ts`, `.claude/skills/sync-docs.md`.
**Acceptance:** `/docs` renders via Fumadocs; theme matches the shadcn app in light **and** dark; every
`docs-manifest` entry resolves; `sync-docs` coverage stays green; old loader removed.

### Phase 2 · System layer on Fumadocs — ✅ DONE (lean, 2026-06-08, build-verified)

Shipped a **Fumadocs-rendered living styleguide at `/system`** over the `contract/*` records:
1. ✅ `system` collection in `source.config.ts` (a second `defineDocs` over `contract/`, permissive
   `catchall` schema deriving `title`) + `src/lib/system-source.ts` loader (`/system`).
2. ✅ `src/app/system/[...slug]/page.tsx` (DocsPage) + `layout.tsx` (DocsLayout, shared theme) +
   index; `contract/meta.json` groups Tokens / Components / Hypotheses.
3. ✅ `src/components/system/ContractMeta.tsx` renders the per-type data header (token = swatch +
   value + collection + status; component = parity + path + Storybook id; hypothesis = status +
   section + decision); prose body via the shared MDX map.
4. ✅ Repointed the System links (`/docs` meta.json, DocsRoleChooser, `docs-manifest`) → `/system`.

**Scope deliberately cut (per founder, 2026-06-08):** the **token-resolver / drift-control
dashboard** (interactive `TokenResolveControl`, ΔE color diffs, reverse-index "used by", health-score
overview, decisions log) is **skipped** — it was for *controlling* drift, not reading the styleguide.
The existing `src/app/(app)/design-system/*` dashboard is **left intact but deprecated**; retire it
once `/system` covers what's needed.

**Deferred:** build-time per-client theming demo; component live previews / prototype frames.
(✅ `/system` search wired — `/api/system-search`, scoped to the System index.)

**Acceptance (met):** `/system` renders tokens/components/hypotheses via Fumadocs under the shared
theme (light/dark); additive + non-destructive; build clean (133/133 static pages).

### Phase 3 · Config layer  *(parallelizable with 1–2)*

1. **Editable settings** over `systemix.config.yaml` — skills, agents, signals, autonomy,
   self-improvement, trust tiers, infra — with validation + write-back. Seed:
   `src/lib/state/instance-config.ts` (read-only today) + `/instance` sidebar → make editable.
2. **3D force graph** — integrate `3d-force-graph`/three.js from the prototype
   (`docs/feature/systemix-v2/prototypes/systemix-graph-standalone.html`) into the app; 7-type
   taxonomy; orbit·pan·scroll, search, zoom-to-fit, node-info panel. Adds deps (`three`,
   `3d-force-graph`); supersedes the 2D `SystemGraph.tsx` as the centerpiece.
3. **Runtime feed + role-routed HITL** cards + instance overview from `.systemix/systemix.json`
   (`activeRuns`, `hitlQueue`).

**Acceptance:** editing config updates the graph; the graph renders the instance topology in 3D with
full interactions; the runtime feed + HITL cards render from runtime state.

### Phase 4 · Atlas layer  *(GATED behind init + DS sync)*

1. **Port the Connecta logic verbatim** — `apps/platform/src/ports/catalog.ts` +
   `adapters/flow-layout.ts` (pure, theme-safe). **Re-implement** the shell/UI in **shadcn** +
   `@xyflow/react` (no Tamagui).
2. **Generate the catalog** from `systemix.config.yaml` + agent defs (not hardcoded) — this is what
   makes Atlas a *Systemix* surface.
3. Persona tabs + step-type legend (Input / Agent / Router / Parallel / Tool / HITL / Output) +
   workflow rows; click a step → **inline prototype detail pane** rendered in the client DS theme.
4. **Enforce the gate** (`init-flow.md` §Gates): render only after `init` is complete **and** a DS is
   created/synced.

**Acceptance:** Atlas renders a **generated** catalog; clicking a step opens an inline prototype in
the DS theme; the gate is enforced (no DS → no Atlas).

### Phase 5 · Big landing redesign

1. Implement the recast landing per [`../site-rebuild/landing-ia.md`](../site-rebuild/landing-ia.md)
   + [`../site-rebuild/positioning.md`](../site-rebuild/positioning.md): the NEW sections
   (Install/setup, Wears-your-brand, **Three layers**), role lens, experiment-types recast.
2. Capture **real surface screenshots** from Phases 2–4 (the demo mechanic = screenshots).
3. Re-add `QualityGate`; wire PostHog events (`layers_view`, `layer_card_click`, etc. — note the
   slug/event rename `surfaces/*`→`layers/*`).

**Acceptance:** the landing tells the three-layer story with real screenshots; section events fire;
build-verified in the main checkout.

### Phase 6 · Extract the init-distributable template

1. Extract the validated three-layer shell from the dogfood into the **separate per-instance shell**
   the CLI scaffolds; wire `packages/cli` `init` (new repo) / `update` (existing repo, incl.
   Connecta) to produce it, themed by the client DS (build-time).
2. Validate against **Connecta** (`connecta-design-system` → `systemix update`).

**Acceptance:** `npx systemix init`/`update` produces the three-layer app themed by the client DS; the
Connecta instance renders Config + System; Atlas lights up once Connecta's DS is synced.

---

## Cross-cutting rules

- **No Tamagui in Systemix** — port pure logic, re-implement UI in shadcn ([[project_systemix_stack_shadcn]]).
- `contract/*` + `docs-manifest.ts` + `docs.ts` stay the **data SoT**; keep `sync-docs` green every phase.
- **Build-time theming**, not runtime (single-tenant embedded model).
- Verify builds in the **main checkout**, not the worktree.

## Relationship to PLAN.md

PLAN.md §5 tracks the **Connecta engagement** build (DS → landing → platform). This roadmap is the
**Systemix app** build (Fumadocs + the three layers) that the dogfood instance runs; Phase 6 is where
the two meet (the extracted template lands in Connecta's instance).

## Open / revisit

- Exact pipeline question set for `init` beyond the 4-question wizard (forward UX; not gating).
- Whether anything stays central (cross-instance evidence registry, license) — deferred per ADR-006.
- Confirm the `surfaces/*`→`layers/*` slug + `*_view` event rename is the final public vocabulary.
