# G-002 · plan

The plan is the copy deck (`docs/feature/ai-native-ds-kit-beta/copy-deck.md`) for PR 1 and the
motion table (`docs/feature/ai-native-ds-kit-beta/launch-review.md` § 4) for PR 2, approved on 2026-10-31.

| PR | What | Closes |
|---|---|---|
| 1 · copy and structure | the six-section landing · one vocabulary · /report and /audit trimmed · docs home on the plugin · "See it running on this repo" | E1, E2 |
| 2 · motion | motion tokens, texts reveal, the hero generation moment, the score donut, /report thinking states | E3, E4, E5, E6, E7, E8 |

## Decisions made while building
- PR 1: verified on localhost. The home page went from 1,001 words and 7 screens to 442 words and 4. /audit is one screen (108 words). No page scrolls sideways at 390 px, and every page reads in full with JavaScript off (E3 and E7 hold for PR 1; PR 2 re-checks them with the motion on).
- PR 1: E1 passes: the H1 and subline render word for word. E2 passes: Deploy (`/systemix:design-interview`, `/systemix:design-audit`), Keep (`/systemix:score`, `/systemix:drift-report`) and Sprint (`/systemix:goal`) all ship in the plugin; the tags say partial and beta where they are.
- PR 1: the hero's A/B seam (`landing-hero` flag, two variants) is gone: one hero, no experiment id on its section (learning landing-live-loop-2026-06: at this traffic a redesign is a craft decision). The install-copy events still carry the flag's value if one is ever set.
- PR 1: the "Pricing" section's anchor is #pricing; /kit now redirects there (it pointed at #services).
- PR 1: /report lost its FAQ (one link to the home page's FAQ instead); the home page's "What leaves my machine?" answer now says /systemix:score shows what it would send first.
- PR 1: deleted as unused once the sections went: the deep-dive mockups, the live loop feed, the humans/machines toggle, and the persona registry of the removed /for/<persona> pages with its test.
- PR 1: /report's sample-score grid scrolled sideways at phone width (no column set below the large breakpoint); fixed.
- PR 1: the sprint price lives in src/lib/pricing.ts as SPRINT (€990, 3 days), next to the full audit.

## Tested · not verified
- PR 1: the Vercel preview; this sandbox cannot reach preview URLs.
