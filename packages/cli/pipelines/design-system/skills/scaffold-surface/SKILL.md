---
name: scaffold-surface
description: Stand up (or attach) the experience surface where prototypes live and get measured — a landing + prototype host rendered from design/tokens.css. Scaffolds a minimal Vite/Next surface when there's none, or wires the design system + measurement into an existing app. Framework-agnostic; both modes are HITL.
argument-hint: [scaffold|attach] [framework: vite|next]
---

# /scaffold-surface — the experience surface

Set up the surface where you build prototypes and measure them: $ARGUMENTS

## Usage
```
/scaffold-surface                 # detect: attach to an existing app, or offer to scaffold one
/scaffold-surface scaffold vite   # scaffold a fresh Vite surface
/scaffold-surface attach          # wire the design system + measurement into the existing app
```

## What this does
The experience surface is the **landing + prototypes** real users hit and that you
measure (PostHog). It renders from the code-first design system (`design/tokens.css`).
This skill either scaffolds a minimal surface or attaches the design system + measurement
to an app you already have — framework-agnostic.

## Step 0 — Detect the mode
Look for an existing app (a `package.json` with next/vite/react, an `app/` or `src/` entry).
- App found → default to **attach**.
- None found → offer to **scaffold**.
Confirm the mode with the user before changing anything.

## Attach mode
1. **Tokens**: make the app's global CSS import `design/tokens.css` (or copy its `:root` / `.dark` blocks); components reference the tokens.
2. **Measurement**: wire PostHog once at the app root (provider / snippet) if it isn't already, so `/measure` can capture events. Reuse the project's existing PostHog setup if present.
3. Confirm the landing route and where prototypes will render.
4. Report what was wired. Next: `/init-experiment` → `/write-variants` → `/measure`.

## Scaffold mode
1. Propose a minimal surface (the user's framework; default Vite + React):
   - a `surface/` app that imports `design/tokens.css`
   - a landing page + a `prototypes/` area
   - PostHog wired at the root
2. **Show the file plan and wait for approval (HITL)** before writing.
3. Scaffold the files; install deps on request.
4. Report how to run it (dev server + URL) and that it's measured. Next: `/init-experiment`.

## Notes
- **Agnostic**: shadcn, Tailwind, or vanilla CSS — it only assumes the surface consumes the CSS variables in `design/tokens.css`.
- The surface is also where the marketing **landing** lives (landing validation) — the same loop measures it.
- Deploy it (e.g. Vercel) so PostHog heatmaps/funnels have a live URL.
