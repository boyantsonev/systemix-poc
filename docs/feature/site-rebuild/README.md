# Site Rebuild — Landing + Docs Blueprint

From-scratch replan of the Systemix **marketing site** (`getsystemix.vercel.app`):
the landing page and the marketing docs, re-anchored to the corrected product
model. **Blueprint / IA only — no code this round.**

> **Concept refresh (2026-06-08):** the product model now lives in
> [`../systemix-rework/`](../systemix-rework/) — **three layers** (Config absorbs
> Graph), **Fumadocs** for both docs + the System layer under one theme, and a
> Connecta retro. This README's marketing-site IA still holds; the layer model and
> docs renderer below are updated there.

## Read in this order
1. [`product-model.md`](./product-model.md) — **SSOT.** What Systemix is: the loop
   spine, the three hypothesis domains, install/setup, the shadcn-shell-themed-by-DS
   principle, the three layers, and the System-vs-docs naming discipline.
2. [`positioning.md`](./positioning.md) — message architecture: hero (kept) + the
   story stack + role lens + per-surface one-liners.
3. [`landing-ia.md`](./landing-ia.md) — section-by-section landing blueprint with
   reuse/edit/build verdicts and PostHog events.
4. [`docs-ia.md`](./docs-ia.md) — the new docs tree (Install → Configure → Run →
   Extend) with role accents and per-page sources.
5. [`surfaces-brief.md`](./surfaces-brief.md) — canonical spec for the four fresh
   surfaces + the shell theming contract.
6. [`migration-cleanup.md`](./migration-cleanup.md) — keep / rewrite / archive for
   every current doc + landing section.

**Design system (the shadcn foundation the shell wears):**
7. [`design-system-setup.md`](./design-system-setup.md) — the shadcn DS setup:
   token tiers, theming layer (base → per-client), component plan.
8. [`skills-figma-sync.md`](./skills-figma-sync.md) — how the DS maps to the
   Systemix skills + the runbook to update Figma later (incl. the bootstrap caveat).

## Locked decisions
- Hypothesis-loop **hero kept**; local-app / three-layer story layered beneath.
- Docs IA = **journey** (Install → Configure → Run → Extend) + **role accents**.
- Surfaces are **prototypes → spec a fresh canonical build**.
- Output is **docs only**; no components/routes touched.

## Resolved decisions (2026-06-06)
1. **Surfaces home = a separate shadcn shell repo** (the installable app shell that
   `npx systemix init` distributes). getsystemix stays marketing + docs and demos
   the surfaces via **screenshots**.
2. **Demo mechanic = screenshots.**
3. **Theming = build-time** CSS custom properties (compiled from the instance DS at
   build/`init`); light/dark **mode** stays runtime via the `.dark` class. Runtime
   token injection rejected (contradicts the single-tenant embedded model).
4. **Role accents = frontmatter `audience` field + a "Start here for…" index chooser**
   (not full role sub-trees).
5. **GitHub handle:** keep `boyantsonev/systemix` for now, extracted to a single
   `siteConfig.githubUrl` constant (one-line change when moving to an org).

## Resolved decisions (2026-06-08 — concept refresh)
6. **Three layers, not four** — Config absorbs the Graph (editable settings + the 3D
   force graph in one layer); then System, then Atlas. See
   [`../systemix-rework/app-three-layers.md`](../systemix-rework/app-three-layers.md).
7. **Fumadocs = both mounts, one theme** — powers the marketing `/docs` **and** the
   in-app System layer, one Tailwind v4 token source, namespaced via `cssPrefix`.
   Replaces the hand-rolled MDX engine. See
   [`../systemix-rework/fumadocs-integration.md`](../systemix-rework/fumadocs-integration.md).
8. **Connecta stays design partner #1** — retro hardens `init` + the per-instance
   template. See [`../systemix-rework/connecta-retro.md`](../systemix-rework/connecta-retro.md).

**Build order:** landing rebuild first, then docs restructure, then DS token pipeline.

## Status (2026-06-06)
- ✅ **Blueprint** — the 8 docs in this folder.
- ✅ **Landing rebuild** — `src/app/page.tsx` (new Install/setup, Wears-your-brand,
  Four-surfaces sections; role-lens recast; `siteConfig`). Build-verified. Surface
  visuals are placeholders + `QualityGate` left docs-only — both deferred to the
  upcoming **big landing redesign**.
- ⬜ **Docs restructure** — tracked in [#30](https://github.com/boyantsonev/systemix-poc/issues/30).
- ⬜ **DS → Figma sync** — tracked in [#31](https://github.com/boyantsonev/systemix-poc/issues/31).
- 🔜 **Big landing redesign** — planned; current rebuild is a checkpoint. Recast the
  "Four surfaces" section to **three layers** (see `../systemix-rework/`).
- ↗ **Three layers** — separate per-instance shadcn shell repo (out of this repo's scope).
