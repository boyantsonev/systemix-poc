---
domain: marketing
owner: design-lead
updated: 2026-10-31
---
# Marketing — what the design-lead knows

The site, the channels and the message. A change is judged by whether the claim is
true today, whether it can be measured, and whether it brings the ICP one step closer.

## What we know
- The canonical site is getsystemix.vercel.app `CLAUDE.md § Names & environments`
- Plugin-first install on the home page and /report; the hero is being replaced by the pitch-based version (founder, 2026-10-31) `experiments/LEARNINGS.md`
- PostHog EU through the /ingest proxy; the AARRR events are defined in one file `src/lib/analytics/funnel.ts`
- Low-traffic landing bets do not reach statistical confidence; treat them as craft, not tests `experiments/LEARNINGS.md (landing-live-loop-2026-06)`
- Close a running hero bet in the same change that replaces it `experiments/LEARNINGS.md (landing-rebrand-hifi-2026-07)`
- Distribution: our own marketplace now, Anthropic's plugin directory once the public repo exists `docs/feature/ai-native-ds-kit-beta/funnel-plan.md § 8`
## Numbers
- About 100 visitors a month `docs/feature/ai-native-ds-kit-beta/discover/current-state.md`
- 1 GitHub star `wave-decisions.md DSC-6`
- Conversions are mostly mailto links: PostHog sees the click, not the email `funnel-plan.md § 3`
## Open bets
- Claude's plugin marketplace brings more of the ICP than the site does
- A shared report (utm_source=quick-report) brings the next visitor
## Sources
- `src/lib/landing/content.ts`, `src/lib/analytics/funnel.ts`, `experiments/LEARNINGS.md`
## Questions the expert would ask
- Is every claim on the page true today, pillar by pillar?
- Which event measures it, and does it fire?
- Which channel brings the ICP, and what do they do next?
- What is the one message, and does the page say it in the first screen?
