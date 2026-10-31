---
name: next
description: Run the agent's part of a goal's next loop steps until the next person or gate, then stop and say who must look. Use for "continue G-001", "run the next step", "next".
argument-hint: "[G-NNN]"
---

Goal: **$ARGUMENTS** (empty = the one open goal; several open → list them and ask).

## 1. Where is it
Read `goal.md` (status, step, waiting) and the step in its loop file (body, runs, gate, reads, writes, note).
- shipped or dropped → say so, stop.
- waiting set → STOP. Say who it waits on, at which gate, and the /systemix:gate lines. Never clear waiting yourself.

## 2. Run steps until a person is needed
Do the step's work, write what it `writes`, then:
- the step has a gate → set `waiting:` to the gate's lead; for approve and decide gates write the brief (/systemix:decide <loop>.<step>); STOP with the question and the gate lines.
- the step is run by a person (`<role> + agent`) → prepare what they need, say what the step asks of them, help in the session; move `step` on only when they say it holds.
- the step runs the world → say what is awaited; stop.
- otherwise move `step` to the next step and continue.

Cross-loop: product.validate → build.plan; build.measure → product.learn; product.learn done → status: shipped.
Update `updated:` on every write; run `node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" loops check` before stopping.

## 3. Playbook
| step | the agent's part |
|---|---|
| product.design | the pictures the evals name, one source file each in `design/artifacts/`; publish each with the Artifact tool when this session has it (else the local hub serves it); a row each in artifacts.md |
| product.shape | take the design lead's comments, redraw, write each rule as a decision line |
| product.test | scenarios and an observer sheet; record what people did as decision lines |
| product.score | mark evals a picture can answer pass/fail; note the rest as build |
| product.validate | the brief (/systemix:decide product.validate) |
| build.plan | plan.md; a backend gap gets its own brief |
| build.hub | the frames in real component code on the prototype surface; run the parity eval |
| build.system | what frames needed twice into the design system (tokens, components, guardrails); version, changelog, release PR; guardrail changes are proposals a reviewer approves |
| build.code | a draft branch from the latest main; one concern per commit; a review guide |
| build.test | run the tests, then each eval answered at build.test; mark evals.md |
| build.review | the PR description; answer review comments |
| build.ship | release notes + evals scorecard; the brief |
| build.measure | the evaluation with last time's definitions: `/systemix:score`, screenshots, analytics (the PostHog plugin or MCP when installed); mark evals.md; a row in design/evaluations.md |
| product.learn | the learnings into experiments/LEARNINGS.md, and the next goal's sentence — proposed, never started |

## Rules
- Never rule: approving, deciding, merging, tagging, flipping a loop to agreed are a person's.
- Drafts need no merge. Push or open a PR only when asked.
- Stay inside the approved goal. If the work shows the goal or an eval is wrong, stop and say so — the fix is a rework or a new goal.
- Report each stop in four lines: what was done · what it produced (paths, links) · who must look and at what · the command they answer with.
