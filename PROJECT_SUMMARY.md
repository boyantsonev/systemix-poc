# Systemix — Project Summary

**Live:** https://systemix-alpha.vercel.app
**Stack:** Next.js 16, Tailwind CSS v4 (oklch), shadcn/ui new-york, TypeScript
**Updated:** 2026-04-06

---

## What It Is

Systemix is an interactive design system workspace — a localhost/Vercel layer that acts as the single source of truth between Figma and code. Not just a token pipeline, but a canvas for each component, page, and variable in your design system. Think Storybook, but with editable canvases and LLM-powered user testing built in.

## Core Concept

Extract design tokens from Figma → render them in Next.js → detect drift between design and code → expose everything on interactive canvas pages. Future: AI-assisted user testing, prototype iteration, and feedback collection — all from the same layer.

## Architecture

- **Workspace** (`/workspace/*`) — one canvas page per component/token set
  - `/workspace/variables` — all 47 tokens, drift status vs Figma, hex→oklch comparison
  - `/workspace/combobox` — isolated component preview with token audit and drift callouts
- **MCP servers** — Figma REST (read), Figma Console (write), Vercel, GitHub
- **Skills** (slash commands) — `/tokens`, `/component`, `/deploy`, `/sync-to-figma`, `/drift-report`, etc.
- **`.systemix/`** — JSON files: `tokens.bridge.json`, `systemix.json` (Figma variableIds), `agent-state.json`
- **`scripts/token-converter.ts`** — `npm run tokens` → regenerates bridge.json from globals.css

## Token System

- CSS source: `src/app/globals.css` — oklch color space, Tailwind v4 `@theme inline`
- Figma naming: verolab shadcn kit uses `base/*` → maps to `--*` CSS vars (e.g., `base/accent` → `--accent`)
- Drift detection: Figma hex values converted to oklch via `src/lib/utils/color.ts` (Björn Ottosson matrices)
- 3 critical mismatches found: `--accent` (yellow vs near-white), `--border`, `--input` (black vs light gray)

## Key Data Files

- `src/lib/data/variables.ts` — 47 tokens with real Figma values (fetched 2026-04-06 from verolab kit)
- `src/lib/utils/color.ts` — hex→OKLCH converter, deltaE perceptual distance, driftLabel
- `src/lib/data/pipeline.ts` — 15 skill definitions

## Tracking

- Linear project: `linear.app/bastion-labs/project/systemix-pivot-fb8e9940d32a`
- Issues: BAST-106–137 (32 issues, 6 milestones)
- Figma file (token bridge): key `h1m7dfFILe1wGSfxwQ6U02`
- Figma design kit (verolab shadcn): key `VevEvC0Ime1LHAlgz3PkPI`

## Pending Next Steps

1. Connect Figma URL input → populate Figma column dynamically (BAST-110)
2. Add `/pipeline` page to workspace canvas
3. Scaffold `packages/figma-plugin/` (BAST-111)
4. Cut fake dashboard/metrics pages from nav (BAST-106)
5. Push tokens to Figma via `/sync-to-figma`
