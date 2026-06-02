# Connecta Codebase Audit

Repo: `denitsa9006/connecta` (private)
Audited: 2026-06-01
Source files read: `package.json`, `astro.config.mjs`, `tsconfig.json`, `wrangler.jsonc`, `src/styles/global.css`, `src/layouts/BaseLayout.astro`, `src/components/HeroSection.astro`, `src/components/SiteNav.astro`, `README.md`, `src/ports/ports.ts`, `src/adapters/`, `src/shells/`

---

## Current Color System

All color values live in a single source of truth: `src/styles/global.css` as CSS custom properties on `:root`. No Tailwind config exists. No design token JSON file exists.

**Primary brand palette:**

| Token | Hex | Role |
|---|---|---|
| `--color-coral` | `#F35F49` | Primary action, CTAs |
| `--color-lime` | `#DEFB50` | Secondary accent, "go" signal |
| `--color-pale-lime` | `#ECFDA8` | Tertiary tint, soft surfaces |
| `--color-olive` | `#424F1A` | Deep accent, text on lime bg |
| `--color-plum` | `#571B32` | Alert / serious tones (replaces red) |
| `--color-rose-tint` | `#FEF0F0` | Nudge state background |
| `--color-plum-tint` | `#F5EEF2` | Slow mode state background |
| `--color-ink` | `#0F1A24` | Near-black ground |
| `--color-paper` | `#FFFFFF` | Clean white surface |
| `--connecta-sky` | `#BAE6FD` | Parent persona only |

**Neutral scale:** `--neutral-0` through `--neutral-900` (10 steps, `#FFFFFF` → `#0F1A24`).

**Semantic tokens defined in CSS:** `--fg-1/2/3/4`, `--bg-base/surface/elevated`, `--color-action-primary`, `--color-action-secondary`, `--color-alert`, persona tokens, hover states (`--color-coral-hover: #E0513C`, `--color-lime-hover: #D1EF3E`), state palette (nudge, alert), border tokens.

**How colors are applied in components:** Components use the CSS custom properties directly in scoped `<style>` blocks. No hardcoded hex values in component logic — `HeroSection.astro` references only `var(--connecta-coral)`, `var(--connecta-lime)`, etc. A few inline `rgba()` values appear in shadow definitions within `global.css` itself (e.g. `rgba(15,26,36,.10)`), which are intentional and use the ink color numerically.

**No Tailwind.** No utility classes. No CSS-in-JS.

---

## Typography

**Fonts loaded:**

| Font | Weight | Load method | File |
|---|---|---|---|
| DM Sans | Variable 100–1000 | Self-hosted `@font-face` | `/fonts/DMSans-VariableFont_opsz_wght.ttf` |
| DM Sans Italic | Variable 100–1000 | Self-hosted `@font-face` | `/fonts/DMSans-Italic-VariableFont_opsz_wght.ttf` |
| JetBrains Mono | 400, 500, 700 | Google Fonts import | `googleapis.com/css2?family=JetBrains+Mono` |
| Caveat | 500, 600, 700 | Google Fonts import (bundled with JetBrains Mono import) | same Google Fonts `@import` |

**Font assignment:**
- `--font-body` → DM Sans → applied to `<html>` via `font-family: var(--font-body)`, base size `17px`
- `--font-mono` → JetBrains Mono → applied to `code`, `pre`, `kbd`, `samp`, and badge/label elements
- Caveat is imported but no explicit CSS variable is defined for it — likely used ad hoc in specific section components (not confirmed in files read)

**Type scale (CSS vars):**

| Token | Value | px |
|---|---|---|
| `--t-display-lg` | `4rem` | 64px |
| `--t-display` | `3rem` | 48px |
| `--t-h1` | `2.25rem` | 36px |
| `--t-h2` | `1.875rem` | 30px |
| `--t-h3` | `1.5rem` | 24px |
| `--t-body-lg` | `1.125rem` | 18px |
| `--t-body` | `1rem` | 16px |
| `--t-small` | `0.875rem` | 14px |
| `--t-micro` | `0.75rem` | 12px |

Weight tokens: `--w-regular` (400), `--w-medium` (500), `--w-semibold` (600), `--w-bold` (700).
Line height tokens: `--lh-tight` (1.15), `--lh-snug` (1.3), `--lh-normal` (1.5), `--lh-relaxed` (1.7).

Note: `HeroSection.astro` hardcodes `font-size: 62px` for `.hero-title` directly in its scoped styles, overriding the token scale. This is a drift instance — the token `--t-display` (48px) and `--t-display-lg` (64px) exist but are not used for the hero headline.

---

## Spacing / Radius

**Spacing:** 8pt grid, fully token-based.

`--space-1` (4px) through `--space-24` (96px): 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24 (skips odd multiples intentionally).

Usage in components is partially token-based (hero uses `gap: 64px`, `padding: 56px 0 80px` as hardcoded px values, not referencing `--space-*` vars) — moderate drift in section-level spacing.

**Border radius:**

Full scale defined:
`--r-xs` (4px), `--r-sm` (8px), `--r-md` (12px), `--r-lg` (16px), `--r-xl` (20px), `--r-2xl` (28px), `--r-pill` (9999px).

Components use `var(--r-xl)`, `var(--r-pill)`, `var(--r-md)` etc. in scoped styles. Some `.btn` rules use hardcoded `border-radius: 10px` (sits between `--r-sm` and `--r-md`), which is a minor off-scale value.

**Shadow scale:** Both a semantic scale (`--shadow-sm/md/lg`) and a numbered scale (`--shadow-1/2/3`) are defined. Components use the numbered scale directly. The dual system is redundant.

---

## Astro Config + Integrations

**Astro version:** `^4.16.18` (Astro v4)

**Output mode:** `hybrid` — server-side rendering with opt-in static pages

**Adapter:** `@astrojs/cloudflare@11` — deploys as Cloudflare Workers + Pages via `wrangler`

**Integrations:**
- `astro-icon@^1.1.5` — SVG icon system (Lucide icons referenced throughout components)
- No React integration (`@astrojs/react` is absent)
- No Vue, Svelte, Solid, or other UI framework islands

**Site:** `https://connecta.education`

**Deployment target:** Cloudflare Workers (confirmed in `wrangler.jsonc` — `main: dist/_worker.js/index.js`, `compatibility_date: 2026-05-19`)

**Other tooling:**
- Vitest `^2.1.8` — unit tests
- Playwright `^1.49.0` + `@axe-core/playwright` — E2E + a11y
- Stryker `^9.6.1` — mutation testing
- Husky `^9.0.0` — pre-commit hooks
- `dependency-cruiser` — architecture boundary enforcement
- TypeScript strict mode throughout

**i18n:** EN/BG runtime switching via `data-i18n` attributes and locale JSON files (`public/locales/en.json`, `public/locales/bg.json`). Implemented in `src/shells/LanguageSwitcher.astro` + `src/adapters/translation-adapter.ts`.

**Analytics:** Microsoft Clarity (`@microsoft/clarity@^1.0.2`) — env var `PUBLIC_CLARITY_ID`

**Forms:** Tally.so embedded modal via script tag in `BaseLayout.astro`

**React islands:** None. Zero React in this codebase.

---

## Existing Component Patterns

**Architecture:** Ports-and-adapters (functional-first, documented explicitly in README and `CLAUDE.md`).

**Folder structure:**
- `src/components/` — pure presentational `.astro` components (props in, HTML out, no side effects). 25+ components total (all landing page sections).
- `src/shells/` — composition shells that may import adapters and manage state (7 files: `GoodTalkWidget.astro`, `LabCirclesWidget.astro`, `LanguageSwitcher.astro`, `PageRoot.astro`, `PilotForm.astro`, `STEMCirclesSection.astro`, `SparksWidget.astro`)
- `src/adapters/` — side-effect implementations: `analytics-adapter.ts`, `classifier-adapter.ts`, `form-adapter.ts`, `localstorage-adapter.ts`, `translation-adapter.ts`
- `src/ports/ports.ts` — TypeScript interface contracts

**Styling pattern:** Co-located scoped `<style>` blocks inside each `.astro` file. Global tokens from `src/styles/global.css` are applied via CSS var references inside those scoped blocks. There is no component library (no shadcn, Radix, MUI, etc.) — every component is hand-crafted.

**Button system:** Defined as global utility classes in `global.css` (`.btn`, `.btn-primary`, `.btn-dark`, `.btn-outline`, `.btn-secondary`, `.btn-disabled`). Applied via class names on `<button>` and `<a>` elements.

**Animation:** Pure CSS — keyframe animations (`hv-float`, `hero-fadein`) and `IntersectionObserver`-driven scroll reveals via the `.scroll-reveal` / `.is-visible` class toggle pattern defined in `BaseLayout.astro`. No JavaScript animation library (no GSAP, Framer Motion, Motion One, etc.).

---

## Tamagui Readiness

**Tamagui installed:** No. Absent from `package.json` (`dependencies` and `devDependencies`).

**React installed:** No. No `react`, `react-dom`, or `@astrojs/react` in any dependency.

**React Native target:** No. No `react-native`, `expo`, or native build tooling.

**What's missing for Tamagui:**
1. React itself (`react@^18`, `react-dom@^18`)
2. `@astrojs/react` integration (to enable React islands in Astro)
3. Tamagui core packages: `@tamagui/core`, `tamagui`, `@tamagui/config`
4. Tamagui Astro/Vite plugin for compilation (`@tamagui/vite-plugin`)
5. A `tamagui.config.ts` mapping existing tokens to Tamagui's theme system
6. Migration of component styles from scoped CSS vars → Tamagui `styled()` / `Stack` / `Text` primitives

The existing CSS token system is well-structured and maps conceptually to Tamagui themes, which would simplify migration — but every component would need to be rewritten from `.astro` + scoped CSS to React TSX + Tamagui primitives.

---

## Gap Analysis (what needs to change for Wisprflow-inspired direction)

1. **No animation library.** All current animation is pure CSS keyframes and `IntersectionObserver`. A Wisprflow-style design typically requires spring physics, gesture-driven transitions, and staggered orchestration. Missing: Framer Motion, Motion (formerly Motion One), or GSAP. Adding any of these to Astro requires a React or vanilla JS integration path.

2. **No React.** Wisprflow-style interactive UI patterns (tabs, drag, parallax, scroll-triggered counters) are trivial in React + Framer Motion. The current stack has no React islands at all. Adding `@astrojs/react` is low-friction, but every interactive component would need to be written as a React TSX file.

3. **No Tailwind.** The project uses a pure CSS variable system. A redesign using Tamagui or a utility-first approach would require either (a) adding Tailwind v4 alongside the existing CSS vars, or (b) migrating tokens to Tamagui's theme config. The token structure is clean enough to port directly.

4. **Type scale drift.** The `--t-*` tokens exist but are not consistently used in components. `HeroSection.astro` hardcodes `62px`. A redesign should enforce the token scale and clean up these drift instances.

5. **Spacing drift.** Section-level padding and gaps are frequently hardcoded in px rather than using `--space-*` tokens.

6. **Dual shadow system.** Both `--shadow-sm/md/lg` and `--shadow-1/2/3` are defined but serve the same purpose. One should be removed.

7. **Caveat font unused-ish.** Loaded from Google Fonts but no CSS variable defined for it. Either document its usage or drop it to improve FCP.

8. **No dark mode.** No `prefers-color-scheme` media query or `[data-theme="dark"]` override in `global.css`. Adding dark mode support would require defining inverse token values.

9. **i18n is runtime JS, not framework-native.** The current `data-i18n` + `localStorage` approach is hand-rolled. A Next.js migration would replace this with `next-intl` or similar.

---

## Architectural Flag: Astro vs Next.js for Tamagui compatibility

**Recommendation: Migrate to Next.js (App Router) before adding Tamagui.**

**Reasoning:**

Tamagui is a React-first framework. Its compilation model (`@tamagui/babel-plugin` / `@tamagui/vite-plugin`) is designed for React component trees — it statically extracts styles at build time from JSX. In Astro, you can run React islands, but:

1. Tamagui requires wrapping your app in `<TamaguiProvider>`, which in Astro means every page or layout would need a React shell — at which point you are writing a React app inside Astro's routing, not leveraging Astro's strengths.

2. Astro's scoped-CSS model and Tamagui's atomic CSS extraction are architecturally opposed. You can't use Tamagui's `styled()` on `.astro` components.

3. Cloudflare Workers adapter works equally well with Next.js (via `@cloudflare/next-on-pages`) and Astro, so deployment is not a constraint.

4. The current codebase has zero React. The effort to add React islands to Astro and wire up Tamagui is nearly equal to migrating the page structure to Next.js App Router with full React components.

**If Tamagui is the target UI layer**, the correct path is:
- Next.js 15 App Router (RSC-compatible, Cloudflare Workers via `@cloudflare/next-on-pages`)
- Tamagui `@tamagui/core` + `@tamagui/config` with a `tamagui.config.ts` that maps `--color-coral`, `--color-lime`, etc. to Tamagui theme tokens
- Framer Motion for scroll/gesture animations
- Migrate existing `.astro` components to `.tsx` React Server or Client Components

**If Astro must be kept** (e.g. content-heavy pages, SEO priority, team familiarity), the practical alternative is:
- Add `@astrojs/react` for interactive islands only
- Use Framer Motion (vanilla JS or React) for animation
- Keep the CSS variable token system as-is
- Skip Tamagui entirely — it adds no value without a React-native target

The deciding factor is whether there is a React Native mobile app planned. If yes → Next.js + Tamagui (shared token layer and eventually shared component primitives). If no → Astro + Framer Motion is simpler and lower risk.
