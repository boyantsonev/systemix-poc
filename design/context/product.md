---
domain: product
owner: design-lead
updated: 2026-10-31
---
# Product — what the design-lead knows

What Systemix is for, who it is for, and what it does today. A decision here is
judged against the three pillars of the pitch and the evidence that the problem is real.

## What we know
- Pitch: "Systemix is an AI-native design system agent which deploys AI-native product design systems, keeps them from rotting and orchestrates design sprints." `wave-decisions.md DSC-19`
- The front door is the Claude Code plugin: score, three audits, design interview, Claude Design sync, and the product and build loops `plugin/plugins/systemix/README.md`
- Keep-from-rotting is strong: 18 blind runs gave the same score `docs/feature/ai-native-ds-kit-beta/launch-review.md § 1`
- Deploy is partial: the one-step scaffold is CLI-only, and npm still serves the unsafe 0.2.0 `launch-review.md § 1`, `wave-decisions.md DSC-7`
- A local app exists (`systemix app`, port 4400): docs, tokens, experiments, the approval queue; no loops or goals view yet `packages/app/README.md`
- The problem worth solving: agents build UI that drifts, and nobody remembers why a rule exists `wave-decisions.md DSC-1`
- The ICP is a hypothesis: 2–20-person product teams vs design-system maintainers; test both `wave-decisions.md DSC-9`
- Instances start at ghost; self-modification of skills and guardrails is always approved by a person `CLAUDE.md § Model`
## Numbers
- This repo's own score: 53 / 100 at commit 986a92fc; component consistency is the weakest area (3/10) `packages/cli/tests/acceptance/skills/fixtures/systemix-poc-986a92fca0cb.counters.json`
- Plugin installs: not measured yet
- Free scores served: 0 (the service is closed in production) `src/app/api/report/route.ts`
## Open bets
- A plugin in Claude's marketplace reaches the ICP better than `npx` `wave-decisions.md DSC-19`
- Decision memory (why a rule exists) is wanted; no demand evidence either way `wave-decisions.md DSC-13`
- The loops (goal → evals → pictures → build → measure) are what "orchestrates design sprints" means to a buyer
## Sources
- `docs/feature/ai-native-ds-kit-beta/README.md`
- `docs/feature/ai-native-ds-kit-beta/launch-review.md`
- `experiments/LEARNINGS.md`
## Questions the expert would ask
- Who exactly is this for, and what did they do the last time this hurt?
- Which pillar does it serve, and is the claim true today?
- What is the smallest version that tests the riskiest assumption?
- What does the person see first, and what do they do next?
- How will we know it worked: which eval, which bar?
- What does a person still have to approve, and is that the right place?
