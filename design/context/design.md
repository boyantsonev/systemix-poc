---
domain: design
owner: design-lead
updated: 2026-10-31
---
# Design — what the design-lead knows

The Systemix design system as it runs on this site: tokens, components, guardrails,
and how a design change is judged (follows the system, adds a token first, holds in
both themes and at phone width).

## What we know
- Tokens are canonical in CSS: `src/app/globals.css` (oklch), described by `design/DESIGN.md` `CLAUDE.md § Key Files`
- Code-first; Figma is an optional adapter, not the spine `CLAUDE.md § Model`
- Rules live in `design/guardrails.mdx`; no raw hex, px or ad-hoc font sizes; add a token first `design/guardrails.mdx`
- The site's look: dark warm paper, amber accent, Chakra Petch display, mono labels `src/app/globals.css`
- Motion from transitions.dev is allowed on the site, not inside the kit or plugin without a Business plan `docs/feature/ai-native-ds-kit-beta/launch-review.md § 4`
## Numbers
- Overall score 53 / 100; component consistency 3/10, token discipline 5/10, drift control 5/10 `packages/cli/tests/acceptance/skills/fixtures/systemix-poc-986a92fca0cb.counters.json`
- 194 custom properties in the token source `systemix audit counters --summary` (2026-10-29)
- Arbitrary font sizes: 100% of font-size utilities are arbitrary or unmapped (same fixture)
- Components nothing imports: 24.5% of those outside components/ui (same fixture)
## Open bets
- Motion tokens (durations, easings, blur) belong in globals.css before any transition ships
- Mapping the type scale into the theme lifts token discipline more than any other single change
## Sources
- `design/DESIGN.md`, `design/guardrails.mdx`, `src/app/globals.css`
- `/systemix:score` and `/systemix:drift-report` on this repo
## Questions the expert would ask
- Which tokens and components does it use, and does it add a token before using a new value?
- Does it reuse the shared primitives instead of rebuilding one inline?
- Does it hold in light and dark, and at phone width (about 390 px)?
- Does `/systemix:drift-report` come back clean on the changed files?
- Is it readable with reduced motion and at AA contrast?
