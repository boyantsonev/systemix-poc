---
id: B-001
gate: product.evals
role: reviewer
decides: Boyan
needs: holder or deputy
context: [product, design, tech]
date: 2026-10-31
---
# G-001: approve the reading and the ten evals for the self-improving agent?

## The question
Approve G-001's brief and its evals together, so the agent can draw the pictures
(the hub's views, the gate flow, the hook's message). Needed before any picture is drawn.

## Options
1. **Approve reading A with the ten evals.** About 2–3 weeks of build loop in 6–8 PRs. Risk: building ahead of the G1 interviews.
2. **Approve with changes** (for example drop E9, or move the hook to a later goal). Smaller first turn; the self-improving claim waits.
3. **Rework toward reading C** (the hub only). About 3 days; does not make Systemix self-improving.
4. **Drop.** Keep selling the score and audits; the pitch's sprint pillar stays thin.

## Evidence
- The loops, checker and five skills already ship and pass their tests `packages/cli/tests/acceptance/loops/loops.test.js`
- The local app exists and needs two small dependencies `packages/app/package.json`
- Claude Code installs plugin dependencies from a lockfile at the plugin root `docs/feature/ai-native-ds-kit-beta/funnel-plan.md § 8`
- PostHog ships its own Claude Code plugin and MCP, and a Self-driving beta that opens PRs from signals (search summaries of posthog.com docs) `design/goals/G-001-self-improving-agent/goal.md`
- G1 interviews: 0 of 5 `docs/feature/ai-native-ds-kit-beta/discover/wave-decisions.md`
- Learning: low-traffic bets don't settle anything; decide by craft and by people `experiments/LEARNINGS.md`

## Recommendation
Option 1, with the five questions answered as the brief proposes (A; hub inside the plugin;
PostHog through its own plugin; self-skill changes as gated proposals; repo file is the
master). It is the shortest path to a demo that shows all three pillars on this repo.
Reversible: yes. Each step lands as its own PR; dropping the goal after any of them leaves a
working plugin.

## What the reviewer would ask
- *Who is this for, and what did they do last time?* Only the founder so far; buyers are untested. **Open.** Run the G1 interviews in parallel.
- *Which pillar does it serve?* All three: deploy (init), keep (hook, measure), sprints (the loops).
- *What breaks for someone already using it?* Nothing: new skills and a new command; the existing ones are unchanged.
- *Does anything leave the machine?* Only the report results file after a yes, and what the person configures (E10).
- *How do we roll it back?* Revert the PR, or uninstall the plugin; the loop files are plain markdown.

## Decision
_(left for the person)_
