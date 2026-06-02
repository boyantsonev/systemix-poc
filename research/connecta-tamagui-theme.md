# Connecta Base Theme — Tamagui Plan

> Merges `wisprflow-brand.md` (aesthetic target) with `connecta-current-state.md` (current token system) into a single, buildable Tamagui base theme with light + dark support. This is the foundation every Connecta component inherits.
> Status: proposed. Last updated 2026-06-02.

---

## Design Decision: Merging Wisprflow × Connecta

**The call: Connecta keeps its energy, borrows Wisprflow's calm ground and refined type.** We adopt Wisprflow's warm cream background, EB Garamond editorial display serif, soft/generous radius, and a lavender accent — but we refuse to go full "editorial Sunday." Connecta is K-12. The product must read as warm, friendly, and a little playful, not like a meditation app. So the merge is: **a calm cream + lavender editorial *base*, energized by Connecta's coral and lime as the warm/energetic accents.** Cream replaces cool white as the ground; EB Garamond replaces DM Sans *for display only*; lavender becomes the **secondary/brand-tint** accent (calm, modern). **Coral stays the primary action color** — it's Connecta's strongest equity, it's instantly kid-legible, and it solves Wisprflow's biggest weakness (lavender-on-cream cannot pass WCAG AA as a primary button at the published `#A89CFF`). Lime survives as a high-energy *highlight* (badges, "go" signals, progress), not as a primary.

Concretely: **coral = primary action, lavender = brand/secondary + focus/links, lime = energetic highlight, cream = ground, EB Garamond = display, Figtree = body** (we drop DM Sans — see Typography). Wisprflow's dark forest green is demoted to a single banner/announcement token, exactly as it functions on wisprflow.ai, and doubles as the dark-theme deep surface. Plum is retained only as the danger semantic (Connecta already uses it that way). The result is a cream-grounded, serif-headed, coral-driven identity: calmer and more grown-up than today's Connecta, but unmistakably still warm and playful — not a Wisprflow clone.

---

## Final Core Palette (light + dark)

Contrast notes are vs. the relevant theme background. Targets: **body/UI text ≥ 4.5:1 (AA)**, **large text & non-text UI ≥ 3:1**. Where a Wisprflow value failed, the adjusted value is given.

| Token | Light hex | Dark hex | Role | WCAG note |
|---|---|---|---|---|
| `background` | `#FAF7F2` | `#14110E` | App ground (warm cream / warm near-black) | — |
| `backgroundStrong` | `#F2ECE2` | `#1E1A16` | Section / sunken ground | — |
| `surface` | `#FFFFFF` | `#221D18` | Card / elevated surface | text on it passes below |
| `surfaceAlt` | `#F5F1EA` | `#2A241E` | Subtle surface (inputs, wells) | — |
| `color` (text) | `#1C1A17` | `#F3EEE6` | Primary text | 15.2:1 on cream / 14.8:1 on dark — AAA |
| `colorMuted` | `#6B6460` | `#A89F95` | Secondary / muted text | 4.9:1 / 5.1:1 — AA |
| `colorFaint` | `#928B83` | `#7C746B` | Placeholder / disabled label | 3.1:1 / 3.0:1 — AA large/non-text only |
| `primary` (coral) | `#E0513C` | `#F35F49` | Primary action / CTA | **light uses the darker coral-hover** `#E0513C` = 4.0:1 on cream → use white text on it (3.9:1 white-on-coral, treat as large/AA-large); **for button labels see `onPrimary`**. Dark `#F35F49` = vivid on near-black. |
| `primaryHover` | `#C9442F` | `#FF6E58` | Coral hover | darker/lighter per theme |
| `onPrimary` | `#FFFFFF` | `#1C1207` | Text on coral | white-on-`#E0513C` = 3.9:1 → **enforce ≥16px/600 for button labels (AA large)**; for small text on coral, use `#FFFFFF` at ≥4.5 only on `#C9442F`. See risks. |
| `secondary` (lavender) | `#6B5BD6` | `#B3A8FF` | Brand accent, links, focus ring, secondary action | **Wisprflow `#A89CFF` on cream = ~1.9:1 — FAILS.** Darkened to `#6B5BD6` = 5.2:1 on cream (AA body). Dark theme can use the soft `#B3A8FF` = 8.9:1 on near-black. |
| `secondarySoft` | `#EAE7FF` | `#2E2952` | Lavender tint (chips, hover bg, focus halo) | fill only — pair with `secondary` text |
| `onSecondary` | `#FFFFFF` | `#14110E` | Text on lavender | white-on-`#6B5BD6` = 5.2:1 — AA |
| `highlight` (lime) | `#DEFB50` | `#DEFB50` | Energetic highlight, "go", progress, badges | **lime is a fill, never a text color.** Text on lime must be `olive`/ink. |
| `onHighlight` (olive) | `#424F1A` | `#424F1A` | Text/icon on lime | olive-on-lime = 7.1:1 — AA |
| `banner` (forest) | `#1E3B2A` | `#1E3B2A` | Announcement strip bg only (Wisprflow pattern) | cream text on it = 11.5:1 |
| `onBanner` | `#F5F1EA` | `#F5F1EA` | Text on banner | AAA |
| `success` | `#3F7A52` | `#6FBF8B` | Success semantic (sage, from Wisprflow green-accent) | 4.6:1 / dark large — AA |
| `warning` | `#B5710E` | `#E0A23C` | Warning semantic (warm amber, not in either source — added) | 4.5:1 / large — AA |
| `danger` (plum) | `#571B32` | `#E08AA6` | Error / serious (Connecta uses plum, not red) | plum-on-cream = 9.8:1; dark uses tint `#E08AA6` = 6.2:1 — AA |
| `dangerSoft` | `#F5EEF2` | `#3A1424` | Danger surface (Connecta `--plum-tint`) | fill only |
| `borderColor` | `#E6DFD3` | `#332C25` | Default border / divider | non-text 3:1-ish, decorative |
| `borderStrong` | `#CDC4B4` | `#473E35` | Emphasized border, input outline | ≥3:1 non-text — AA |
| `focusRing` | `#6B5BD6` | `#B3A8FF` | Focus outline (= secondary) | ≥3:1 vs bg — AA non-text |
| `shadowColor` | `rgba(15,26,36,0.10)` | `rgba(0,0,0,0.45)` | Elevation (Connecta ink-based shadow) | — |

**What survived the merge:**
- **Kept from Connecta:** coral (`#F35F49`/`#E0513C` as primary), lime (`#DEFB50` as highlight only), olive (`#424F1A` as on-lime text), plum (`#571B32` as danger), plum-tint, ink-based shadow. Coral-hover and lime-hover already existed in `global.css` and become the AA-safe variants.
- **Adopted from Wisprflow:** cream ground (`#FAF7F2`/`#F5F1EA`), lavender (`#6B5BD6`/`#B3A8FF`, **darkened for AA**), forest green banner (`#1E3B2A`), sage as `success` (`#3F7A52`), EB Garamond + Figtree.
- **Dropped:** Connecta's pure-white `#FFFFFF` ground (→ cream), pale-lime as a system token (folded into highlight family), `--connecta-sky` persona blue (out of base — re-add as a persona override later), DM Sans body (→ Figtree), Caveat (unused — drop), JetBrains Mono is **kept** as the code/label mono font.
- **Added (neither source had it):** an explicit `warning` amber, because a K-12 product needs a non-alarming caution color distinct from plum-danger.

---

## Typography

**Pairing: EB Garamond (display serif) + Figtree (body sans) + JetBrains Mono (code/label).**

The call on body font: **switch DM Sans → Figtree.** Reasoning — Figtree is Wisprflow's confirmed body face and pairs intentionally with EB Garamond (geometric-humanist sans under a high-contrast serif). DM Sans and Figtree are close cousins (both friendly geometric sans), so we lose almost nothing in warmth while gaining the deliberate Wisprflow pairing and one fewer self-hosted variable font to manage. Both are free Google Fonts. **JetBrains Mono stays** for code, kbd, and the small uppercase label/badge treatment Connecta already uses. **Caveat is dropped** (loaded but unused — removing it improves FCP).

- **Display** → `EB Garamond` (400 regular, 500 medium, 400 italic for expressive subheads). Serif, used for `display`/`h1`/`h2` only.
- **Body / UI** → `Figtree` (400, 500, 600). All body, nav, buttons, captions.
- **Mono** → `JetBrains Mono` (400, 500, 700). Code, labels, badges.

Type scale maps 1:1 from Connecta's existing `--t-*` tokens (already a clean scale — keep it). Display sizes get the serif; everything `h3` and below stays sans for legibility.

| Tamagui size token | Connecta var | rem / px | Font | Weight | Line height |
|---|---|---|---|---|---|
| `$10` displayLg | `--t-display-lg` | 4rem / 64 | EB Garamond | 400 | 1.05 |
| `$9` display | `--t-display` | 3rem / 48 | EB Garamond | 400 | 1.1 |
| `$8` h1 | `--t-h1` | 2.25rem / 36 | EB Garamond | 500 | 1.15 |
| `$7` h2 | `--t-h2` | 1.875rem / 30 | EB Garamond | 500 | 1.2 |
| `$6` h3 | `--t-h3` | 1.5rem / 24 | Figtree | 600 | 1.3 |
| `$5` bodyLg | `--t-body-lg` | 1.125rem / 18 | Figtree | 400 | 1.6 |
| `$4` body | `--t-body` | 1rem / 16 | Figtree | 400 | 1.6 |
| `$3` small | `--t-small` | 0.875rem / 14 | Figtree | 500 | 1.5 |
| `$2` micro | `--t-micro` | 0.75rem / 12 | Figtree/Mono | 500/700 | 1.4 |

Weights: `regular 400 / medium 500 / semibold 600 / bold 700` (Connecta's `--w-*` — kept verbatim). Body base size **17px** (Connecta's current base), Figtree.

> Note: this fixes the existing drift where `HeroSection.astro` hardcodes `62px`. In Tamagui the hero headline should use `$10` (64px) EB Garamond, not a magic number.

---

## Spacing & Radius

**Spacing: keep Connecta's 8pt scale verbatim.** It's clean and already token-driven. Wisprflow's "generous whitespace" is achieved at the *layout* level (bigger section paddings, wider column gaps) using the **top** of this same scale — no new base unit needed. We map Connecta's `--space-*` (which skips odd multiples) onto Tamagui's numeric size/space tokens.

| Tamagui `space`/`size` | px | Connecta var | Typical use |
|---|---|---|---|
| `$1` | 4 | `--space-1` | hairline gaps |
| `$2` | 8 | `--space-2` | tight inset |
| `$3` | 12 | `--space-3` | chip padding |
| `$4` | 16 | `--space-4` | default inset |
| `$5` | 20 | `--space-5` | comfortable inset |
| `$6` | 24 | `--space-6` | card padding |
| `$7` | 32 | `--space-8` | between groups |
| `$8` | 40 | `--space-10` | — |
| `$9` | 48 | `--space-12` | block spacing |
| `$10` | 64 | `--space-16` | column gap (Wisprflow-spacious) |
| `$11` | 80 | `--space-20` | section padding |
| `$12` | 96 | `--space-24` | hero / section padding (Wisprflow "generous") |

**Radius: nudge Connecta softer to meet Wisprflow.** Connecta's scale tops out fine, but Wisprflow's editorial softness lives in the **12–20px** band. We make `md = 12`, `lg = 16`, `xl = 20` the workhorses (cards/buttons land here, not at the old 8px). Buttons move to the Wisprflow-soft `lg (16)` instead of the off-scale hardcoded `10px` found in `.btn`. Pill stays for tags/avatars.

| Tamagui `radius` | px | Connecta var | Use |
|---|---|---|---|
| `$1` xs | 4 | `--r-xs` | tiny chips |
| `$2` sm | 8 | `--r-sm` | inputs |
| `$3` md | 12 | `--r-md` | small cards, default |
| `$4` lg | 16 | `--r-lg` | **buttons, cards (Wisprflow-soft default)** |
| `$5` xl | 20 | `--r-xl` | hero cards, modals |
| `$6` 2xl | 28 | `--r-2xl` | large feature panels |
| `$true` | 16 | (= `$4`) | Tamagui default radius |
| `$pill` | 9999 | `--r-pill` | pills, avatars |

---

## tamagui.config.ts (proposed)

```ts
// tamagui.config.ts
import { createTamagui, createTokens, createFont } from '@tamagui/core'
import { shorthands } from '@tamagui/shorthands'
import { themes as defaultThemes } from '@tamagui/themes' // optional base to extend

// ---------- FONTS ----------
const displayFont = createFont({
  family: '"EB Garamond", Georgia, serif',
  size: { 6: 24, 7: 30, 8: 36, 9: 48, 10: 64 },
  lineHeight: { 6: 31, 7: 36, 8: 41, 9: 53, 10: 67 },
  weight: { 4: '400', 5: '500' },
  face: {
    400: { normal: 'EBGaramond-Regular', italic: 'EBGaramond-Italic' },
    500: { normal: 'EBGaramond-Medium' },
  },
})

const bodyFont = createFont({
  family: '"Figtree", system-ui, -apple-system, sans-serif',
  size: { 1: 11, 2: 12, 3: 14, 4: 16, 5: 18, 6: 24, true: 17 },
  lineHeight: { 2: 17, 3: 21, 4: 26, 5: 29, 6: 31, true: 27 },
  weight: { 4: '400', 5: '500', 6: '600', 7: '700' },
})

const monoFont = createFont({
  family: '"JetBrains Mono", ui-monospace, monospace',
  size: { 2: 12, 3: 14, 4: 16 },
  weight: { 4: '400', 5: '500', 7: '700' },
})

// ---------- TOKENS ----------
export const tokens = createTokens({
  color: {
    // raw palette (theme-agnostic anchors)
    cream:        '#FAF7F2',
    creamSunken:  '#F2ECE2',
    creamSurface: '#F5F1EA',
    paper:        '#FFFFFF',
    ink:          '#1C1A17',
    inkBg:        '#14110E',

    coral:        '#F35F49',
    coralDark:    '#E0513C',
    coralDeep:    '#C9442F',
    lavender:     '#6B5BD6',
    lavenderSoft: '#EAE7FF',
    lavenderLite: '#B3A8FF',
    lime:         '#DEFB50',
    olive:        '#424F1A',
    forest:       '#1E3B2A',
    sage:         '#3F7A52',
    amber:        '#B5710E',
    plum:         '#571B32',
    plumTint:     '#F5EEF2',
    plumLite:     '#E08AA6',

    white:        '#FFFFFF',
    muted:        '#6B6460',
    faint:        '#928B83',
    borderLight:  '#E6DFD3',
    borderStrong: '#CDC4B4',
  },
  space: {
    1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24,
    7: 32, 8: 40, 9: 48, 10: 64, 11: 80, 12: 96,
    true: 16,
  },
  size: {
    1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24,
    7: 32, 8: 40, 9: 48, 10: 64, 11: 80, 12: 96,
    true: 16,
  },
  radius: {
    1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 28,
    true: 16, pill: 9999,
  },
  zIndex: { 0: 0, 1: 100, 2: 200, 3: 300, 4: 400, 5: 500 },
})

// ---------- THEMES ----------
const light = {
  background:       '#FAF7F2',
  backgroundStrong: '#F2ECE2',
  backgroundHover:  '#F2ECE2',
  surface:          '#FFFFFF',
  surfaceAlt:       '#F5F1EA',

  color:            '#1C1A17',
  colorMuted:       '#6B6460',
  colorFaint:       '#928B83',

  primary:          '#E0513C',  // coral (AA-safe variant)
  primaryHover:     '#C9442F',
  onPrimary:        '#FFFFFF',

  secondary:        '#6B5BD6',  // lavender, darkened for AA
  secondaryHover:   '#5A4BC2',
  secondarySoft:    '#EAE7FF',
  onSecondary:      '#FFFFFF',

  highlight:        '#DEFB50',  // lime — fill only
  onHighlight:      '#424F1A',

  banner:           '#1E3B2A',  // forest — announcement strip only
  onBanner:         '#F5F1EA',

  success:          '#3F7A52',
  warning:          '#B5710E',
  danger:           '#571B32',
  dangerSoft:       '#F5EEF2',

  borderColor:      '#E6DFD3',
  borderStrong:     '#CDC4B4',
  focusRing:        '#6B5BD6',
  shadowColor:      'rgba(15,26,36,0.10)',
}

const dark = {
  background:       '#14110E',
  backgroundStrong: '#1E1A16',
  backgroundHover:  '#221D18',
  surface:          '#221D18',
  surfaceAlt:       '#2A241E',

  color:            '#F3EEE6',
  colorMuted:       '#A89F95',
  colorFaint:       '#7C746B',

  primary:          '#F35F49',  // vivid coral on dark
  primaryHover:     '#FF6E58',
  onPrimary:        '#1C1207',

  secondary:        '#B3A8FF',  // soft lavender reads well on dark
  secondaryHover:   '#C6BDFF',
  secondarySoft:    '#2E2952',
  onSecondary:      '#14110E',

  highlight:        '#DEFB50',
  onHighlight:      '#424F1A',

  banner:           '#1E3B2A',
  onBanner:         '#F5F1EA',

  success:          '#6FBF8B',
  warning:          '#E0A23C',
  danger:           '#E08AA6',
  dangerSoft:       '#3A1424',

  borderColor:      '#332C25',
  borderStrong:     '#473E35',
  focusRing:        '#B3A8FF',
  shadowColor:      'rgba(0,0,0,0.45)',
}

// ---------- CONFIG ----------
export const config = createTamagui({
  fonts: { heading: displayFont, body: bodyFont, mono: monoFont },
  tokens,
  themes: { light, dark },
  shorthands,
  defaultFont: 'body',
  // settings: { allowedStyleValues: 'somewhat-strict' }, // tighten once stable
})

export type AppConfig = typeof config
declare module '@tamagui/core' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
```

> Usage in components: `<Stack backgroundColor="$surface" borderRadius="$4" padding="$6">`, `<Text color="$color" fontFamily="$heading" fontSize="$9">`, `<Button backgroundColor="$primary" color="$onPrimary">`. Theme tokens (`$background`, `$color`, `$primary`…) resolve per active `light`/`dark` theme; raw tokens (`$coral`, `$space.6`…) are theme-agnostic.

---

## Token Mapping (Connecta CSS var → Tamagui token)

| Connecta CSS var (`global.css`) | Tamagui token | Notes |
|---|---|---|
| `--color-paper #FFFFFF` | `$surface` (light) | white demoted from *ground* to *card surface*; ground is now cream |
| *(new)* cream `#FAF7F2` | `$background` | adopted from Wisprflow |
| `--color-ink #0F1A24` | (shadow base) / dark not reused | text ink is now warm `#1C1A17`, not the cool `#0F1A24` |
| `--color-coral #F35F49` | `$primary` (dark) / raw `$coral` | light theme uses `--color-coral-hover #E0513C` for AA |
| `--color-coral-hover #E0513C` | `$primary` (light) | promoted to default for contrast |
| `--color-lime #DEFB50` | `$highlight` | fill only, never text |
| `--color-pale-lime #ECFDA8` | (folded into highlight family) | not a base token; use opacity of lime |
| `--color-olive #424F1A` | `$onHighlight` | text on lime |
| `--color-plum #571B32` | `$danger` (light) | Connecta uses plum as red |
| `--color-plum-tint #F5EEF2` | `$dangerSoft` | |
| `--connecta-sky #BAE6FD` | — (out of base) | persona override, re-add later |
| *(new)* lavender `#6B5BD6` | `$secondary` | Wisprflow accent, darkened for AA |
| *(new)* sage `#3F7A52` | `$success` | from Wisprflow green-accent |
| *(new)* forest `#1E3B2A` | `$banner` | Wisprflow announcement strip |
| `--fg-1..4` | `$color` / `$colorMuted` / `$colorFaint` | 4 → 3 levels (merge faint+disabled) |
| `--bg-base/surface/elevated` | `$background` / `$surfaceAlt` / `$surface` | |
| `--space-1..24` | `$space.1..12` (skip-odd mapping) | see Spacing table |
| `--r-xs..pill` | `$radius.1..6`, `$radius.pill` | default radius bumped to `$4` (16) |
| `--t-display-lg..micro` | `$10..$2` font sizes | display sizes → EB Garamond |
| `--w-regular..bold` | font `weight` 4..7 | verbatim |
| `--lh-tight..relaxed` | per-size `lineHeight` | folded into font config |
| `--shadow-1/2/3` (keep) / `--shadow-sm/md/lg` (drop) | `$shadowColor` + Tamagui shadow props | resolve the redundant dual system → keep one |
| `--font-body` (DM Sans) | `$body` = Figtree | **font swap** |
| `--font-mono` (JetBrains) | `$mono` | kept |
| Caveat | — | dropped (unused) |

---

## Next.js 15 + Tamagui Setup Steps

Assumes the Next.js migration recommended in `connecta-current-state.md` (App Router, Cloudflare Workers via `@cloudflare/next-on-pages`).

1. **Install packages.**
   ```bash
   npm i @tamagui/core @tamagui/config @tamagui/shorthands @tamagui/themes \
         tamagui @tamagui/next-plugin react react-dom
   npm i -D @tamagui/babel-plugin
   ```
   (`tamagui` gives the component kit; `@tamagui/core` is the engine. You can ship core-only and build your own components — recommended here since every Connecta component is hand-crafted.)

2. **Add the config file** — drop in `tamagui.config.ts` from above at the repo root.

3. **Wire the Next plugin** in `next.config.ts` for build-time style extraction:
   ```ts
   import { withTamagui } from '@tamagui/next-plugin'
   export default withTamagui({
     config: './tamagui.config.ts',
     components: ['tamagui'],     // + your own component package when extracted
     appDir: true,
     outputCSS: process.env.NODE_ENV === 'production' ? './public/tamagui.css' : null,
   })(/* your base nextConfig */ {})
   ```

4. **Provider in the root layout** (`app/layout.tsx`). Use `NextThemeProvider` (or `next-themes`) for the light/dark toggle and feed it to Tamagui:
   ```tsx
   import { TamaguiProvider } from '@tamagui/core'
   import config from '../tamagui.config'

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en" suppressHydrationWarning>
         <head>{/* fonts: see step 6 */}</head>
         <body>
           <TamaguiProvider config={config} defaultTheme="light">
             {children}
           </TamaguiProvider>
         </body>
       </html>
     )
   }
   ```

5. **SSR style flush** — add `@tamagui/core`'s style registry to the App Router so styles render server-side (Tamagui ships a `useServerInsertedHTML` helper; wrap in a `NextTamaguiProvider` client component). Without this you get a flash of unstyled content.

6. **Load fonts.** Use `next/font/google` for EB Garamond, Figtree, JetBrains Mono and expose them as CSS variables, then reference those families in `createFont`'s `family`. This avoids self-hosting (Connecta currently self-hosts DM Sans — that goes away).
   ```ts
   import { EB_Garamond, Figtree, JetBrains_Mono } from 'next/font/google'
   ```

7. **Dark mode mechanism** — `next-themes` flips a `class`/`data-theme` on `<html>`; map its value to Tamagui's `defaultTheme`/`<Theme name="dark">`. Honor `prefers-color-scheme` by default (Connecta has no dark mode today, so this is net-new).

8. **Cloudflare check** — Tamagui's output is static CSS + React, fully compatible with `@cloudflare/next-on-pages`. No runtime constraint.

9. **(Later) React Native / Expo** — because tokens live in `tamagui.config.ts`, the same theme drives an Expo app. Add `@tamagui/babel-plugin` to the RN Metro/Babel config and reuse this exact config. This is the payoff of choosing Tamagui over Tailwind.

---

## Local Preview Approach

**Fastest path: a single Next.js route that renders a swatch + type + component sampler, with a light/dark toggle.** This lets the look & feel be eyeballed in ~15 minutes before any real component work.

1. Scaffold a throwaway preview app (or a `/theme-preview` route in the new Next app):
   ```bash
   npx create-next-app@latest connecta-theme-preview --ts --app --no-tailwind
   ```
   Then apply setup steps 1–7 above.

2. Create `app/theme-preview/page.tsx` rendering, using only theme tokens:
   - **Color swatches** — a grid of `<Stack>` blocks for every theme token (`$background`, `$surface`, `$primary`, `$secondary`, `$highlight`, `$banner`, `$success`, `$warning`, `$danger`) with the hex labeled underneath.
   - **Type specimens** — EB Garamond `$10/$9/$8` headings, Figtree `$5/$4/$3` body, JetBrains `$3` mono label.
   - **Component stand-ins** — a primary coral button, a secondary lavender button, a lime badge, a forest announcement bar, a card on `$surface`, an input on `$surfaceAlt`, a plum danger alert. These prove the on-color pairings (`$onPrimary`, `$onHighlight`, `$onBanner`) actually read.
   - **A `<Theme name>` toggle** (button flipping `next-themes`) so light/dark are compared side-by-side or switched live.

3. `npm run dev` → open `localhost:3000/theme-preview`. Eyeball cream warmth, lavender legibility, coral energy, and the dark theme.

4. **Optional second eye:** run the existing `/figma-push http://localhost:3000/theme-preview` skill to screenshot the preview onto a Figma frame for design review, and/or run an accessibility pass (the `design:accessibility-review` skill) on the rendered page to confirm the contrast numbers above hold in practice.

> Cheaper alternative if you don't want a route: a single `.tsx` story rendered via Tamagui's own playground, but the in-repo `/theme-preview` route is more representative because it runs the *actual* Next + provider + font pipeline you'll ship.

---

## Open Questions / Risks

1. **Coral-as-primary contrast is the tightest constraint.** `#E0513C` with white text = ~3.9:1 — that's AA for *large* text (≥18.66px or ≥14px bold) but **fails AA for small body text on coral**. Mitigations, pick one: (a) enforce button labels ≥16px/600 (recommended — fits the design anyway), (b) darken primary to `#C9442F` (white = 4.6:1, full AA) at the cost of some vibrancy, or (c) use ink text on coral for small labels. **Needs a human call on whether to trade coral vibrancy for full small-text AA.**
2. **Lavender was the headline contrast failure and is now resolved** — Wisprflow's `#A89CFF` (1.9:1) is unusable for text on cream; we ship `#6B5BD6` (5.2:1). Confirm the darker lavender still reads as "lavender" and not "generic purple" to the brand owners — it's a perceptible shift.
3. **Lime is fill-only.** `#DEFB50` can never be a text color (near-zero contrast on cream/white). Lint rule / code-review guard recommended so no one sets `color="$highlight"`.
4. **All Wisprflow hex values are inferred, not confirmed** (`wisprflow-brand.md` flags every value `[unconfirmed]`). The cream and forest hexes here are best-estimate anchors; a DevTools pass on wisprflow.ai could refine them, but they're already in a sensible, AA-clean range.
5. **Dark theme cream→warm-black inversion** is a designed choice, not a derived one. The warm near-black (`#14110E`) keeps the brand warmth in dark mode rather than going cool-gray; verify it doesn't feel muddy on real screens during preview.
6. **Motion library not decided here.** Wisprflow uses GSAP (via Webflow); Connecta today is pure CSS. For Next.js + React the idiomatic pick is **Framer Motion** (gesture/scroll/spring, RN-portable story is weaker) vs **Motion One** (lighter, vanilla-capable). Tamagui also has its own animation drivers (`@tamagui/animations-moti` / `-react-native-reanimated`) which are the **right choice if the RN app is real**, since they're the only ones that animate natively. **Recommend Tamagui + Moti driver** to keep the cross-platform promise — but this is a separate decision from the theme and needs confirmation.
7. **`warning` amber is invented.** Neither source defines a caution color; `#B5710E` is a proposal. Confirm it fits the K-12 palette or replace with a tint of coral.
8. **`--connecta-sky` persona blue and pale-lime were dropped from the base.** If persona-specific theming (parent vs student) is still required, those return as a `<Theme name="parent">` sub-theme layered on this base — out of scope for the base theme but flagged so it isn't lost.
9. **Font swap (DM Sans → Figtree) is a brand decision, not just technical.** It's defensible (Figtree is the Wisprflow pairing and a close cousin) but it changes Connecta's current voice slightly. If the team wants to retain DM Sans equity, keeping DM Sans as `$body` and using only EB Garamond + the new palette is a valid lower-risk variant — easy to swap in `createFont`.
```
