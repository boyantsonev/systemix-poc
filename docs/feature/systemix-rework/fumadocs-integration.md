# Fumadocs Integration — One Shared Theme, Two Mounts

**Decision:** adopt **Fumadocs** as the documentation renderer for **both** the public marketing
`/docs` **and** the in-app **System** layer, driven by **one** Tailwind v4 token source. Replaces the
hand-rolled MDX docs engine and the custom React design-system pages.

**Status:** 🔒 LOCKED as ADR-011. **Mount (a) marketing `/docs` — ✅ IMPLEMENTED (Phase 1).**
**Mount (b) in-app System `/system` — ✅ IMPLEMENTED (Phase 2, lean — drift-control cut).** Both
build-verified (2026-06-08). Stack: fumadocs-ui/core 16.9.3 + fumadocs-mdx 15.0.11, Tailwind 4.3.0.

---

## Why Fumadocs

- **App-Router native, library-not-framework** — mounts inside the existing Next.js 16 app at a
  sub-path; modular (`fumadocs-core` headless + `fumadocs-ui` + `fumadocs-mdx`); MIT; low lock-in,
  ejectable layer-by-layer.
- **Tailwind v4 + shadcn compatible** — matches our stack exactly (`globals.css` `@theme inline`,
  oklch vars, shadcn primitives).
- **MDX renders arbitrary React** — token tables, live component previews, prototype frames, even a
  3D graph or react-flow diagram, via a component map passed to `<MDXContent components={…} />`.
- **Programmatic content sources** — not limited to static repo MDX; a custom Source adapter can feed
  it from data (`contract/*`, `lib/data/docs.ts`).

## The one-shared-theme architecture

```
globals.css  →  @theme inline (oklch vars, Tailwind v4)   ← single source of truth
      │
      ├── shadcn app chrome             (--primary, --radius, font … )
      └── Fumadocs (fumadocs-ui/css/shadcn.css)
              maps --color-fd-* ──► --background / --primary / --sidebar / …
```

- **Single token source:** the oklch vars in `globals.css` drive both the shadcn app and Fumadocs.
- **Shared theme (as built):** `@import 'fumadocs-ui/css/shadcn.css'` maps Fumadocs' built-in
  `--color-fd-*` tokens directly onto the existing shadcn vars (`--background`, `--primary`,
  `--sidebar`, …), so `/docs` inherits the Systemix theme in light **and** dark with **zero**
  duplicated tokens. This is the v16-native mechanism and is **cleaner than the older
  `cssPrefix` plugin** the research assumed (Fumadocs already namespaces its own tokens as
  `--color-fd-*`). Actual `globals.css` import order:
  `@import 'tailwindcss'` → `tw-animate-css` → `fumadocs-ui/css/shadcn.css` →
  `fumadocs-ui/css/preset.css` → `@source '…/fumadocs-ui/dist/**/*.js'`.
- **Tailwind ≥ 4.2 required:** Fumadocs 16 uses the `inset-s-*` logical utility, absent in 4.1.x —
  bumped `tailwindcss`/`@tailwindcss/postcss` 4.1.18 → **4.3.0** (within the project's `^4` range).
- **Theme provider scoping:** the app already provides next-themes, so Fumadocs' `RootProvider`
  is mounted in `src/app/docs/layout.tsx` with `theme={{ enabled: false }}` (defers to next-themes)
  and `search={{ enabled: false }}` (search route is Phase 1b).
- **Typography plugin:** Fumadocs bundles its own (via `preset.css`); don't double-load
  `@tailwindcss/typography`.

## Two mounts

### (a) Marketing `/docs` — **✅ implemented**

- Public guides + reference; the content was **already** MDX in `content/docs/*.mdx`, so the
  migration pointed Fumadocs at it (`source.config.ts` + `src/lib/source.ts`) rather than
  re-authoring. The ~18 bespoke React wrapper pages + the old `[slug]` renderer were deleted;
  `next-mdx-remote`/`gray-matter` stay (the design-system pages still use them).
- **Journey nav preserved** via a single `content/docs/meta.json` (Get started / Configure / Run /
  Extend + external System/Dashboard links) — no files moved except `skills`/`architecture` lifted
  to top-level to keep their URLs stable.
- **Interactive components survive** by embedding them in MDX through the component map
  (`src/mdx-components.tsx`): `<ArchitectureGraph/>` (the ReactFlow `SystemGraph`),
  `<SkillsBrowser/>`, `<DocsRoleChooser/>` (the `/docs` index via `content/docs/index.mdx`).
- `src/lib/docs-manifest.ts` is **kept** as the status/coverage source (sync-docs-compatible); the
  Fumadocs sidebar is driven by `meta.json`.
- Route: `src/app/docs/[[...slug]]/page.tsx` (DocsPage) + `layout.tsx` (DocsLayout + RootProvider).

### (b) In-app **System** layer — **✅ implemented (lean) at `/system`**

- A **second `defineDocs` collection** (`system`, in `source.config.ts`) over `contract/` with a
  permissive `catchall` schema that derives `title` (contract files have none); loader in
  `src/lib/system-source.ts` (`/system`). Route: `src/app/system/[...slug]` + `layout.tsx`.
- Renders each token/component/hypothesis contract as a Fumadocs page: prose body via the shared MDX
  map + a `ContractMeta` data header (swatch/value/collection/status · parity/path/Storybook ·
  status/section/decision). Nav grouped by `contract/meta.json` (Tokens / Components / Hypotheses).
- **Deliberately lean:** the interactive drift-control machinery (resolve controls, ΔE, reverse
  index, health score, decisions) is **out of scope** — the existing `(app)/design-system/*`
  dashboard is left intact but deprecated. See `build-roadmap.md` Phase 2.
- **Per-client theming risk (research-flagged)** remains the planned mitigation: **build-time**
  CSS custom properties compiled from the instance DS (not yet exercised; no per-client demo yet).

## Migration

1. ✅ Add Fumadocs; wire the shared `globals.css` token source via `shadcn.css` (Phase 1).
2. ✅ Stand up `/docs` on Fumadocs; `meta.json` journey nav; deleted the old loader (Phase 1).
3. ⬜ Build the custom Source adapter for the **System** layer over `contract/*` + `docs.ts` (Phase 2).
4. ⬜ Re-skin the `(app)/design-system/*` pages onto Fumadocs layouts; keep the data readers (Phase 2).
5. ⬜ Wire Fumadocs search (`/api/search`) + re-enable `search` in `RootProvider` (Phase 1b).

## Risks / watch-items

| Risk | Mitigation |
|---|---|
| Per-client theming in the embedded styleguide | Build-time CSS vars (above), not runtime. |
| CSS-var collisions with shadcn | None in practice — Fumadocs namespaces as `--color-fd-*`; `shadcn.css` bridges them. |
| Coupling docs content to Fumadocs | Modular core; `docs-manifest.ts`/`docs.ts` stay the data SoT — ejectable. |
| ESM-only / bundler | Already on Next 16 + Tailwind v4 — non-issue. |
