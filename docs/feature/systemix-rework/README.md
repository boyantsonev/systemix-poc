# Systemix Rework — Concept Clarity + Blueprint

**Feature:** systemix-rework · **Type:** strategy/concept blueprint · **Status:** 🔒 **LOCKED 2026-06-08**
**Locked as:** ADR-010 (three layers) · ADR-011 (Fumadocs) · ADR-012 (Connecta) in
[`../../../decisions/ADR.md`](../../../decisions/ADR.md). · **Output:** docs only — no production code.

This round sharpens **what Systemix is** and **how `npx systemix init` works**, decides **Fumadocs**
as the shared documentation layer, retrospects **Connecta** (design partner #1), and collapses the
app from four surfaces to **three layers**. It is the strategy checkpoint the big landing redesign,
the Fumadocs integration, the editable config page, and the Atlas port all build on next.

It **extends and partly supersedes** [`../site-rebuild/`](../site-rebuild/): the loop spine, the
hero, the journey docs IA, and the "wears your brand" shell principle all carry forward unchanged;
the **four-surface split**, the **hand-rolled MDX docs engine**, and a couple of resolved decisions
are updated here. Where the two folders disagree, **this folder wins** for the product model.

## Decisions locked (2026-06-08)

| # | Decision | ADR | Detail |
|---|---|---|---|
| 1 | **Concept + blueprint only** | — | No production code this round — like the original site-rebuild pass. |
| 2 | **Fumadocs = both mounts, one theme** | ADR-011 | Powers the public marketing `/docs` **and** the in-app **System** surface, both driven by one Tailwind v4 token source; Fumadocs namespaced (`cssPrefix`) to avoid shadcn CSS-var collisions. |
| 3 | **Three layers** | ADR-010 | Merge Config + Graph → **Config**; then **System** (Fumadocs DS); then **Atlas**. |
| 4 | **Connecta stays design partner #1** | ADR-012 | The retro hardens `init` + the per-instance template; it does not drop Connecta. |

The build sequencing that follows from these locks is in
[`build-roadmap.md`](./build-roadmap.md).

## Read order

1. [`what-is-systemix.md`](./what-is-systemix.md) — the **one decided definition**.
2. [`init-flow.md`](./init-flow.md) — how `npx systemix init` works, end to end, incl. the **gates**.
3. [`app-three-layers.md`](./app-three-layers.md) — the **three-layer** per-instance app spec
   (Config / System / Atlas), the editable config page, and the Atlas gating rule.
4. [`fumadocs-integration.md`](./fumadocs-integration.md) — the **one-shared-theme** architecture
   (two mounts, namespacing, build-time per-client theming, migration off hand-rolled MDX).
5. [`connecta-retro.md`](./connecta-retro.md) — what worked / didn't / why → learnings → decision.
6. [`build-roadmap.md`](./build-roadmap.md) — the sequenced next build phases (dogfood here;
   **Fumadocs foundation first**).

## What this round does **not** do (the build phases — now sequenced in `build-roadmap.md`)

- Big landing **redesign** implementation.
- Fumadocs **code** integration + migration off the hand-rolled MDX/`docs.ts`.
- Editable **config/settings** page implementation.
- **Atlas** shadcn port from Connecta `apps/platform`.
- 3D force graph integration into the app (currently a standalone prototype).
- The separate "what is Connecta / is it an SLM" research track.

## Naming discipline (unchanged, still load-bearing)

- **System** (layer 2) = the in-app, self-updating **living styleguide**. **Not** the marketing docs.
- **Docs** = the **marketing documentation site** at `getsystemix.vercel.app/docs`.
- Both now render through Fumadocs and share one theme — but they remain **different artifacts with
  different audiences**. Never conflate them in copy, nav, or blueprint.
