---
id: G-002
slug: pitch-landing
title: The landing page rebuilt on the pitch — plugin-first hero, the three pillars, live proof, and transitions.dev reveal and loading motion
asked: "plan updates on the landing page and also enhancing the LP experience with https://github.com/Jakubantalik/transitions.dev reveal/loading animations"
status: open
step: product.shape
waiting:
lead: design-lead
repos: [systemix-poc]
opened: 2026-10-31
updated: 2026-10-31
---

# G-002 · The landing page rebuilt on the pitch

## The goal, as asked

> "plan updates on the landing page and also enhancing the LP experience with
> https://github.com/Jakubantalik/transitions.dev reveal/loading animations"

The founder approved the hero copy and the pillar cards and closed the running hero
experiment on 2026-10-31 (`experiments/LEARNINGS.md`).

## How I read it

**A. Copy and structure, then motion, in two PRs (recommended).** PR 1: the pitch-based hero,
the three pillar cards, live proof, trimmed sections. PR 2: the motion layer (motion tokens
first, then texts reveal, the hero generation moment, the score donut, the /report run
narration). Each lands and is reviewed on its own; the copy can go live without waiting
for the motion.

**B. Copy only.** The same structure without motion. Cheaper, and enough to say the pitch,
but leaves the "agent at work" story untold.

I recommend **A**.

## For whom

Visitors who arrive from Claude's plugin directory, the README or a shared report, and who
build UI with agents (`design/context/marketing.md`).

## In / Out

**In:** the plan in `docs/feature/ai-native-ds-kit-beta/launch-review.md § 3–4`: hero, three
pillars with honest tags, live proof, how it works, pricing with the €990 sprint, trimmed
credibility and FAQ, and the motion table.
**Out:** the Learning Kit page (decision pending), new analytics events, any transition inside
`plugin/` or `packages/cli/templates/` (the transitions.dev license).

## What is already true

- Plugin-first install is on the home page and /report (branch claude/gifted-goodall-3iib00) `src/components/systemix/LandingEvents.tsx`
- The hero experiment is closed; the next hero starts as a clean bet `experiments/landing-rebrand-hifi-2026-07.mdx`
- At this traffic a redesign is a craft decision, not an A/B test `experiments/LEARNINGS.md`
- transitions.dev may be used on our own site, with its comment kept; not redistributed in a kit `docs/feature/ai-native-ds-kit-beta/launch-review.md § 4`
- The site's design rules: tokens first, no raw values, both themes, phone width `design/context/design.md`

## Risks

- A pillar claim that is not true yet. The loops now ship, so "sprints" can say *in the plugin (beta)*; deploy stays *partial* until `/systemix:init` ships.
- Motion that hides content from crawlers, link previews or no-JS readers.
- The generation runtime (about 36 KB) slowing the first screen.

## Questions for the gate

1. Reading A (two PRs) or B? — I would take **A**.
2. The sprint pillar's tag: *in the plugin (beta)*, now that the build loop ships, or *with us*? — I would say **in the plugin (beta)**, with the €990 sprint offered beside it.
3. The hero's generation moment: once per visit, remembered in the browser? — I would say **yes**.
