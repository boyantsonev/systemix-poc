---
title: DESIGN.md
description: Systemix's own design system — TVA · Amber Mainframe, v1.1.
version: alpha
name: TVA · Amber Mainframe
# The values below are a MIRRORED SNAPSHOT of src/app/globals.css (dark
# theme, the default) — CSS stays canonical (code-first). Update globals.css
# first, then re-sync this block; nothing here drives the build.
colors:
  background: "#16100A"
  foreground: "#EFE5D3"
  primary: "#FF9E3D"
  muted: "#271E14"
  accent: "#2B2417"
  destructive: "#FF6A4A"
  border: "#3A2A12"
  success: "#B7C46A"
  warning: "#FFD84D"
  highlight: "#FFC24D"
typography:
  sans:
    fontFamily: "Chakra Petch"
  display:
    fontFamily: "Chakra Petch"
  label:
    fontFamily: "Chakra Petch"
  mono:
    fontFamily: "JetBrains Mono"
rounded:
  base: 0.3125rem
  screen: "calc(var(--radius) * 2)"
spacing:
  base: 0.25rem
components:
  terminal:
    rounded: screen
  crt-panel:
    rounded: screen
  filed-btn:
    textColor: foreground
    typography: mono
    rounded: "0"
---

# TVA · Amber Mainframe — the Systemix design system

**v1.1** · warm amber phosphor on a dim, lifted base with a *scoped* soft-CRT
treatment. Renders the product as a warm 1971 computer room — bureaucratic,
quietly powerful, legible. Full spec:
`docs/feature/rebrand-hifi/design/design.md` (+ `tva-theme.css`, the token
source of truth). Live tokens: `src/app/globals.css`.

This file follows the open [DESIGN.md spec](https://github.com/google-labs-code/design.md)
(Apache-2.0) — YAML frontmatter carries a mirrored snapshot of the CSS
tokens, the sections below carry the rationale. Unlike a static Stitch
export, this instance also has a [Loop](#loop): the system is meant to
evolve from evidence, not just describe current state.

## Overview

TVA · Amber Mainframe is a warm, bureaucratic, quietly powerful interface —
a 1971 computer room, legible above all. Six principles govern it:

1. **Warm, never cold.** The palette is fully warm — no blue, no cool grey.
2. **Glow is elevation.** Importance is a soft bloom and a hotter border,
   never a hard neon edge.
3. **Legibility first, atmosphere second.** Since v1.1, dark body text is warm
   white (`#EFE5D3`); amber lives in labels, values, glows, and actions. The
   CRT effect is scoped to screen surfaces (`.terminal`, `.crt-panel`) — text
   sections sit on clean paper/ink inside the soft grid.
4. **Mechanical, not organic, motion.** Short transitions that settle hard.
5. **Tokens over forks.** Light/dark, radius, and CRT strength are attribute-
   driven token swaps; component CSS never branches on theme.
6. **Bureaucracy as identity.** Mono labels, reference IDs, deadpan copy.

## Colors

Three tiers (W3C style): primitives (hex ramps, `--screen-*`, glow values) →
**semantic** (`--background`, `--primary`, `--highlight`, … — the layer
components consume) → component (kept near-empty; state tints are *derived*
via `color-mix` + the `--tint-*` knobs, never stored).

Key semantics: `--accent` is the *subtle hover surface* (warm neutral), NOT
the brand amber — the vivid amber is `--highlight`. Status = `--success`
(olive) / `--warning` / `--destructive`. The terminal stays a lit CRT in both
themes via the theme-independent `--screen-*` set.

## Typography

Role fonts only, referenced by name, never picked ad hoc:

- `--font-sans` (body) and `--font-display` (headings) — Chakra Petch.
- `--font-mono` (data) — JetBrains Mono.
- `--font-label` (uppercase-tracked labels) — Chakra Petch, via the
  `tva-label` utility.

## Layout

Marketing surfaces use the **soft grid**: a hairline-framed container
(`GridFrame`, max 1200px) whose sections are bordered cells; hero rows split
into copy | facts | tools columns. App surfaces use panel cards on the
`--radius-screen` radius with `--shadow-panel` elevation.

## Elevation & Depth

Importance is bloom, not height. Resting panels use `--shadow-panel`;
floating elements (popovers, toasts) use `--shadow-pop`. The CRT glow is
**scoped**: `.terminal` (the lit tube) and `.crt-panel` only — never a global
overlay, never scanlines over long-form text.

## Shapes

Radius is dial-driven (`data-radius`: `sharp` · `soft` · `round`), never
hardcoded per component. Large panels and the terminal use `--radius-screen`
(double the base radius). Buttons are rectangles, not pills — one
high-emphasis primary action per view.

## Components

The one distinct component pattern is the **terminal / CRT panel**
(`.terminal`, `.crt-panel`): `--radius-screen` corners, `--shadow-panel`
elevation, theme-independent `--screen-*` colors so it stays a lit tube in
both light and dark mode. All other components are plain panel cards on the
semantic token set above — see source for the full inventory.

**`filed-btn`** — the flagship CTA style, `variant="default"` on the shared
shadcn `Button` (`src/components/ui/button.tsx`): a sharp-cornered,
corner-bracket frame with a diagonal solid-fill wipe on hover, set in
`--font-mono` uppercase-tracked type rather than the usual `--font-label`.
Built on top of shadcn, not instead of it — its visual rules live in
`globals.css` as a plain, deliberately unlayered `.filed-btn` class
(Tailwind's `@layer utilities` always outranks `@layer base`, so a bespoke
effect this specific has to sit outside both to reliably win the cascade).
It owns only its chrome (frame, wipe, hatch, color inversion, type), not box
dimensions — those still come from the Button's `size` prop, so `filed-btn`
composes correctly at any size. The plain filled style it replaced as the
default lives on as `variant="solid"`, for the rare case that shouldn't
carry the bracket frame (e.g. a dense control inside a settings dialog).
`filed-btn` isn't meant for icon-only buttons — those keep using `ghost`/
`outline` as before. Reserve it for the single highest-emphasis action on a
view — never two `filed-btn`s side by side.

## Do's and Don'ts

- **Do** reference a semantic token (`bg-primary`, `text-success`,
  `var(--highlight)`) for color. **Don't** use raw hex in components or
  styles — exceptions: the token source (`globals.css`) and product mockups
  (`DeepDiveMockups.tsx`).
- **Don't** use raw Tailwind palette classes (`text-blue-500`,
  `bg-emerald-400`, …) — the system has no blue, and even warm palette
  classes bypass the theme.
- **Do** derive state tints with `color-mix` (`--tint-weak` / `--tint-mid` /
  `--tint-line`). **Don't** store a new tint token.
- **Do** use role fonts and radius-dial classes (`rounded-md` / `rounded-lg`
  / `--radius-screen`). **Don't** hardcode a pixel radius.
- **Do** keep the CRT effect scoped to `.terminal` / `.crt-panel`. **Don't**
  reintroduce a global overlay.
- **Do** keep body text at ≥ 4.5:1 contrast (dark body `#EFE5D3` is 15.1:1;
  muted `#B39B6E` is 7.0:1 — muted for secondary text only), show a visible
  `:focus-visible` ring, respect `prefers-reduced-motion`, and pair status
  with icon + text, never color alone.

Self-modification of these rules is **always human-in-the-loop**, at any
autonomy tier. Propose the change with rationale; a human approves. The
**Drift Report** skill (`scripts/drift-report.ts`) audits the codebase
against `design/guardrails.mdx` — the enforcement source; this section is
its readable digest.

## Loop

What makes this DESIGN.md more than a static export: the system is meant to
evolve from evidence. `experiments/` is where prototypes get measured
(PostHog); validated learnings land in `experiments/LEARNINGS.md`. Before any
product/UI change, recall what's already been learned —
`npx @getsystemix/cli experiment learnings --recent 5` — and don't contradict a
high-confidence learning without flagging it.

When drift or a learning suggests a rule change, the engine proposes a
tighter `guardrails.mdx` entry — never a silent edit. A human approves every
change to this system, at any autonomy tier.

## Voice

The interface is a polite, faintly menacing institution. Confirmations are
deadpan ("Timeline filed."), empty states are institutional, errors stay calm.
Never chirpy, never emoji. Marketing copy is plain English, outcome-first —
and never says "the loop".
