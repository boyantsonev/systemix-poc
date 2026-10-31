---
id: B-002
gate: product.evals
role: reviewer
decides: Boyan
needs: holder or deputy
context: [product, design, tech]
date: 2026-10-31
---
# G-002: approve the landing rework's reading and nine evals?

## The question
Approve G-002's brief and evals together, so the agent can draw the new page as pictures
(hero, pillars, proof, motion frames) for you to shape before any code changes.

## Options
1. **Approve reading A** (copy and structure, then motion, as two PRs). About 2–3 days.
2. **Approve reading B** (copy only). About 1 day; the motion waits.
3. **Rework** (for example a different hero line).

## Evidence
- You approved the hero copy and the pillar cards and closed the hero experiment on 2026-10-31 `experiments/LEARNINGS.md`
- The motion plan and its license limits `docs/feature/ai-native-ds-kit-beta/launch-review.md § 4`
- Plugin-first install already ships on the branch `src/components/systemix/LandingEvents.tsx`
- ~100 visitors a month: treat it as craft, not a test `design/context/marketing.md`

## Recommendation
Option 1. The copy can go live in the first PR while the motion is shaped. Reversible: yes,
each PR reverts on its own.

## What the reviewer would ask
- *Is every claim true today?* E2 checks it card by card; the sprint tag is the open one (question 2).
- *Does it hold at phone width and in both themes?* E7, and the design pack's questions.
- *Will motion hurt the first screen or search?* E3, E4 and E5.

## Decision
Approved as written by Boyan (reviewer), 2026-10-31: "go", then "yes". Reading A; the questions answered as the brief proposed.
