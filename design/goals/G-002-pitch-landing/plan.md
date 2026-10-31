# G-002 · plan

The plan is the copy deck (`docs/feature/ai-native-ds-kit-beta/copy-deck.md`) for PR 1 and the
motion table (`docs/feature/ai-native-ds-kit-beta/launch-review.md` § 4) for PR 2, approved on 2026-10-31.

| PR | What | Closes |
|---|---|---|
| 1 · copy and structure | the six-section landing · one vocabulary · /report and /audit trimmed · docs home on the plugin · "See it running on this repo" | E1, E2 |
| 2 · motion | motion tokens, texts reveal, the hero generation moment, the score donut, copy morph, FAQ accordion, /report thinking states | E3, E4, E6, E7, E8 (E5 on the preview) |

## Decisions made while building
- PR 1: verified on localhost. The home page went from 1,001 words and 7 screens to 442 words and 4. /audit is one screen (108 words). No page scrolls sideways at 390 px, and every page reads in full with JavaScript off (E3 and E7 hold for PR 1; PR 2 re-checks them with the motion on).
- PR 1: E1 passes: the H1 and subline render word for word. E2 passes: Deploy (`/systemix:design-interview`, `/systemix:design-audit`), Keep (`/systemix:score`, `/systemix:drift-report`) and Sprint (`/systemix:goal`) all ship in the plugin; the tags say partial and beta where they are.
- PR 1: the hero's A/B seam (`landing-hero` flag, two variants) is gone: one hero, no experiment id on its section (learning landing-live-loop-2026-06: at this traffic a redesign is a craft decision). The install-copy events still carry the flag's value if one is ever set.
- PR 1: the "Pricing" section's anchor is #pricing; /kit now redirects there (it pointed at #services).
- PR 1: /report lost its FAQ (one link to the home page's FAQ instead); the home page's "What leaves my machine?" answer now says /systemix:score shows what it would send first.
- PR 1: deleted as unused once the sections went: the deep-dive mockups, the live loop feed, the humans/machines toggle, and the persona registry of the removed /for/<persona> pages with its test.
- PR 1: /report's sample-score grid scrolled sideways at phone width (no column set below the large breakpoint); fixed.
- PR 1: the sprint price lives in src/lib/pricing.ts as SPRINT (€990, 3 days), next to the full audit.

- PR 2: built as planned (launch-review.md § 4): texts reveal on the hero (at first paint) and on every section heading (on scroll, from SectionTrack's observer), skeleton reveal on the cards, the UI generation in skeleton-texts mode on the hero's "What you get" card once per visit, the score as a donut with number pop-in, text morph on the copy buttons, the FAQ as an accordion, thinking states on /report.
- PR 2: the motion tokens are prefixed --motion-*: the site already had --duration-fast and --ease-out with other values.
- PR 2: the generation runtime (ui-generation.js and text-image-generation.js, which it imports) is vendored unchanged in src/vendor/transitions/ with its license and loaded with a dynamic import, so it is not in the first page load.
- PR 2: E3 passes: with JavaScript off every text on / and /report is visible and every FAQ answer is open. E4 passes: with reduced motion, 0 animations run on / and /report. E7 passes: no page scrolls sideways at 390 px with the motion on. E6 and E8 pass by test (src/lib/motion/motion.test.ts): no raw duration or easing in the motion code, every token defined, nothing from transitions.dev in plugin/ or packages/cli/templates/, the license comment in every snippet.
- PR 2: the hero's rise starts at opacity 0.01, not 0. From 0, Chrome reports the LCP only once the H1 has faded in (1.4–1.6 s on the dev server at 4× CPU slowdown on a phone profile); from 0.01 it is 0.4–0.5 s, the same as with motion off. CLS 0 in every run.
- PR 2: the FAQ's closed state needs only JavaScript (html.js), not motion, so readers who reduce motion still get an accordion, without the animation.
- PR 2: the layout's default title and description (used by link previews) still said "Stop your design system from rotting"; they now carry the pitch.

## Tested · not verified
- PR 2: E5 (Lighthouse mobile on the Vercel preview). Measured instead on the dev server: LCP 0.4–0.5 s, CLS 0. A production build cannot run in this sandbox (it cannot fetch Google Fonts).
- PR 1: the Vercel preview; this sandbox cannot reach preview URLs.
