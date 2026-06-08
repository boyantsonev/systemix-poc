# shadcn Design System — Setup Plan

**Derives from:** [`product-model.md`](./product-model.md) §3 (the app is a shadcn
shell, themed by the client DS) and [`surfaces-brief.md`](./surfaces-brief.md)
(theming contract). Pair with [`skills-figma-sync.md`](./skills-figma-sync.md) for
the Figma push path.

> Scope: the **Systemix base design system** — the neutral shadcn/ui foundation
> that powers both the marketing site and the app shell, and that gets **re-themed
> per client** (primary color + font). Memory: *Systemix UI = shadcn/ui; Tamagui
> is Connecta-only; re-implement, don't port.*

---

## 1. Current state (already shadcn-shaped)

`src/app/globals.css` is Tailwind v4 + shadcn/ui, oklch, with `@theme inline`:

- **Semantic colors (light + dark):** `background, foreground, card, popover,
  primary, secondary, muted, accent, destructive, border, input, ring` +
  `sidebar*` (8). → 26 tokens.
- **Status (Systemix):** `status-synced / drifted / stale / new`. → 4 tokens.
- **Radius:** `--radius: 0.5rem` + derived `radius-sm/md/lg/xl` (calc). → 1 base.
- **Typography:** `--font-sans = Manrope`, `--font-mono = JetBrains Mono`;
  font-size scale `2xs…2xl` (8 steps). *(present in CSS, **not** yet in the bridge)*
- **No chart tokens** today (shadcn convention is `--chart-1…5`).

`.systemix/tokens.bridge.json` = 31 tokens in **3 collections**: Semantic (26),
Status (4), Spacing & Radius (1). **Typography is the gap.**

UI primitives in `src/components/ui/`: `button, badge, card, tabs, tooltip,
popover, scroll-area, separator, table, progress, command, combobox` (12 shadcn) +
`animated-beam, flickering-grid, figma-logo` (3 Systemix-custom).

## 2. Token architecture (target)

Keep the shadcn semantic model as the contract. Figma collections to fully mirror
the DS:

| Collection | Modes | Contents | Status |
|---|---|---|---|
| **Semantic** | Light, Dark | the 26 shadcn colors (incl. `sidebar*`) | exists |
| **Status** | Light, Dark | `synced / drifted / stale / new` | exists |
| **Spacing & Radius** | Default | `radius/base` (+ make `radius/sm·md·lg·xl` explicit; optional spacing scale) | partial |
| **Typography** | Default | `font/sans`, `font/mono`, `font-size/2xs…2xl` | **NEW — add** |
| **Chart** | Light, Dark | `chart/1…5` | optional (only if charts ship) |

**Naming convention** (matches `/tokens` mapping): `primary/default → --primary`,
`background/default → --background`, `font-size/sm → --font-size-sm`,
`radius/xl → --radius-xl`.

## 3. Theming layer — base → per-client (the "wears your brand" principle)

Two layers:
1. **Base theme** = current `globals.css` (neutral). The DS ships this.
2. **Client override** = a thin token layer that changes **`--primary`** (+
   `--primary-foreground`) and **`--font-sans`** (+ derived) — and nothing else.
   The Connecta cream/coral shell is exactly this override.

Mechanisms that already exist (reuse, don't reinvent):
- **`/apply-theme`** — apply a client brand via token overrides only, no component
  changes; reports coverage.
- **`/style-match`** — scrape colors/typography/radius from a live URL → propose a
  `globals.css` diff (each change gets a Hermes contract entry; HITL-gated apply).
- **`brands.ts` pattern** (`src/lib/data/brands.ts`) — layered `tokenOverrides`
  per brand → becomes the single per-instance config in the embedded model.

The Atlas prototype renderer and the whole shell read the **resolved** theme, so
both update from one override.

## 4. Component plan

| Tier | Components | Action |
|---|---|---|
| shadcn primitives (12) | button, badge, card, tabs, tooltip, popover, scroll-area, separator, table, progress, command, combobox | Formalize: one **contract** (`contract/components/*`) + Storybook story each; map to Figma via Code Connect |
| Systemix-custom (3) | animated-beam, flickering-grid, figma-logo | Document as Systemix-specific; keep out of the client-themable set |
| Surface-specific | graph nodes, Atlas step nodes, HITL card, loop diagram | Belong to the surfaces (`surfaces-brief.md`), not the base DS |

Each base component gets: status (`clean`/`drifted`), token references (no
hardcoded values — enforced by `/drift-report`), a story, and a Code Connect
mapping (`/connect`).

## 5. Setup steps (DS foundation)

1. **Lock the token tiers** (§2) — add the **Typography** collection to
   `scripts/token-converter.ts` so `npm run tokens` emits it into the bridge.
   *(Decision: include font-size scale + font families; chart optional.)*
2. **Make derived radius explicit** in the bridge (sm/md/lg/xl) so Figma carries
   real values, not calc.
3. **Contract every base component** (12) — `contract/components/*` with token refs.
4. **Stories** for each (Storybook) — drives `/storybook` verification later.
5. **Wire the theming layer** — confirm `/apply-theme` + `brands.ts` cover the
   primary-color + font override path end to end.
6. **Then** run the Figma push — see [`skills-figma-sync.md`](./skills-figma-sync.md).

## 6. Open decisions
1. **Typography in Figma** — add font families + font-size scale as variables
   (recommended) vs. keep type as Figma text styles only.
2. **Spacing scale** — promote a spacing scale into tokens, or stay radius-only.
3. **Chart tokens** — add `chart/1…5` now or defer until charts ship.
4. **Component source of truth for Figma** — generate Figma components from code
   via `/component`+`/connect`, vs. author in Figma and pull via `/figma`.
