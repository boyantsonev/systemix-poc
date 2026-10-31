# Systemix as a self-improving agent: plan and evaluation

**Date:** 2026-10-31 · **Status:** DRAFT · **Goal:** G-001 (`design/goals/G-001-self-improving-agent/`),
waiting at the Evals gate · **Decisions:** DSC-19 (pitch), DSC-20 (sprint price), DSC-21 (loops, PostHog)

## 1. What "self-improving" means here

Systemix improves two things, and the rules differ:

1. **The customer's design system.** The agent deploys it, keeps it from rotting and runs the
   sprints that grow it. It proposes; a person rules at every gate.
2. **Itself.** What a turn measured becomes a learning, the learning shapes the next goal, and a
   better skill or rubric is proposed as an approval card. Nothing about Systemix changes itself
   without a person's approval and passing evals (`CLAUDE.md § Model`: self-modification is
   always approved by a person).

The engine is three loops over one memory:

```
market loop (experiments/)  ──LEARNINGS──▶  product loop (goal → evals → pictures → validate)
        ▲                                              │ validated design
        │                                              ▼
        └────────── measure ◀──  build loop (plan → hub → system → code → test → review → ship → measure)
```

The build loop's Hub and System steps are the design sprint (Frame, Build, Systematize).

## 2. The agent, piece by piece

| Piece | Today | Gap | Effort |
|---|---|---|---|
| **Runtime**: the Claude Code plugin | 0.2.0: score, 3 audits, interview, Claude Design sync, 5 loop skills, local scan, MCP for the paid report | — | done |
| **Product and build loops** | Templates, checker (`systemix loops check`), `/systemix:loops`, `goal`, `next`, `gate`, `decide`; dogfooded on this repo with G-001 and G-002 | Loops stay `draft` until a reviewer revises them | done |
| **Gates** | `/systemix:gate` can only be run by a person; decision lines are checked | The app's approval queue (experiments) and the gate are two mechanisms | later: one queue |
| **Market loop** | `experiments/`, `/init-experiment` … `/close-experiment`, daily runner, weekly engine (CLI) | Not in the plugin | 1–2 days |
| **Artifacts** (pictures) | The rule exists: a source file in `design/artifacts/`, published copy, a row in artifacts.md, checked | No picture scripts yet; the artifact tool exists only in some sessions | per goal |
| **Local design hub** | `systemix app` (port 4400): docs, tokens, experiments, approval queue | No goals, loops, briefs, artifacts or evaluations views; not in the plugin | 3–4 days |
| **Keep from rotting, continuously** | On demand (`/systemix:score`, `/systemix:drift-report`) | A hook that checks the agent's own UI edits before the turn ends | 1–2 days |
| **Deploy** | Interview, audit proposals, Claude Design sync | `/systemix:init` in the plugin (design/ + loops + CLAUDE.md block, ghost mode) | 1 day |
| **Measure** | Score and counters; PostHog events in this site; `design/evaluations.md` | The build.measure step reading PostHog through its plugin | 1–2 days |
| **Learn and self-improve** | `product.learn` step; `/hermes` proposes skill changes (CLI) | Approval cards for skill changes in the plugin; `claude plugin eval` suites as the gate | 2–3 days |
| **Schedule** | Daily and weekly crons in this repo | For customers: `claude -p "/systemix:next"` in CI, opt-in | later |

## 3. PostHog: integrate, don't duplicate

From PostHog's docs, read through search summaries; not verified verbatim, so check before
building on it:

- PostHog has an **official Claude Code plugin** (Anthropic-verified, from `posthog/ai-plugin`) and a **hosted MCP** (`mcp.posthog.com`; EU: `mcp-eu.posthog.com`) with OAuth or a personal API key. It covers insights, SQL, flags, experiments, surveys, session replay, error tracking and a **signals** inbox.
- **PostHog AI** is the in-app agent, billed in credits.
- **Self-driving** (open beta) runs scheduled "scouts" over your data. They raise signals, an agent investigates each one, and it opens a PR for a person to review. External agents can claim reports.

What Systemix does with it:

- **Integrate.** Recommend PostHog's plugin as a companion. At `build.measure` and in the market loop, read insights, survey answers and signals through it. Systemix never holds a PostHog key. Later, Systemix could claim design-related reports from the signals inbox.
- **Don't duplicate.** Generic signal-to-PR fixing (errors, replays) is PostHog's. Systemix keeps what PostHog has no concept of: the design system, its guardrails, the decision memory, and goals with evals and gates.

## 4. Build order for G-001 (after the gates)

Each step lands as one reviewable PR; the eval it closes is in brackets.

1. **Loops in the plugin**: on this branch (E1 partly, E2, E3).
2. **Hub in the plugin**: `/systemix:hub` starts the local app from the plugin; new views for goals, loops, briefs, artifacts and evaluations (E4).
3. **Artifacts**: picture sources in `design/artifacts/`, published with the artifact tool where available, always served by the hub (E5).
4. **Drift guard hook**: checks the agent's own UI edits (E6).
5. **`/systemix:init`**: deploy in one step (E1).
6. **Measure**: build.measure with the score and PostHog through its plugin (E7, E10).
7. **Self-improvement**: skill-change proposals as approval cards, gated by `claude plugin eval` suites in CI (E8).
8. **Dogfood turn**: the founder runs one goal end to end on this repo (E9).

## 5. Evaluation: is the plan sound?

- **It matches the pitch.** Deploy is init plus the interview. Keep is the score, the hook and measurement. Sprints are the loops.
- **It matches the rules.** Code-first, engine = Claude Code, ghost by default, a person approves self-modification, and nothing leaves the machine without a yes.
- **The biggest risk is evidence, not code.** G1 is 0 of 5 interviews. Build only what the dogfood turn needs, and run the interviews in parallel: the loops make "decision memory" demonstrable, which is the thing DSC-13 says nobody has asked for yet.
- **Cost is manageable**: about 2–3 weeks of build loop, mostly reuse (the app, the scan, the experiment loop).
