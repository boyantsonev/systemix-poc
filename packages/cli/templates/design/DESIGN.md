---
type: design-system
instance: your-instance
icp: your-icp
autonomy: ghost
created: 2026-01-01
updated: 2026-01-01
---

# Design System

The living agreement between your team and the engine: the brief, the goals it
must pursue and validate, the design guardrails it enforces, and everything it
has learned. **This file is the source of truth — read it first.** The skills that
maintain it live in `.claude/skills/` (Claude Code discovers them automatically).

## Brief

<!-- One paragraph: what is this design system for, who is the ICP, what is the
engine's job? Replace this. -->

A code-first, context-based design system. Tokens live in `design/tokens.css`; the
rules the engine enforces live in `design/guardrails.mdx`; experiments and their
evidence live in `design/decisions/`. The loop is the product: build a prototype →
measure it → decide → write the reason back here → the next iteration starts from
evidence.

## Autonomy

One dial, three levels: **ghost** proposes everything and writes nothing alone;
**assisted** writes the low-risk changes and proposes the rest; **autonomous**
writes most things. The covenant: **humans give goals**, and the engine never
modifies its own skills or guardrails without a human approving — even in
autonomous mode.

This instance is at **ghost**. Every write arrives as a proposal in the decision
queue (`design/.state/queue.json`); nothing lands without an approval.

## Goals

<!-- Humans give goals. One bullet per goal; link to design/goals/<id>.mdx. -->

- _No goals yet. Add one in `design/goals/` and link it here._

## Memory

Memory is written only from closed experiments — every entry cites the experiment
that earned it, with a confidence and a review-by date. Entries are appended here
(newest first) when an experiment's decision is approved; nothing is hand-written.

*No entries yet.* The first entry lands when the first experiment closes.

## Decision log

Every write the engine makes starts as a proposal in the queue
(`design/.state/queue.json`). Resolved decisions are recorded here and in the
relevant `design/decisions/<id>.mdx`.

_No decisions yet._

## Guardrails

The design rules the drift check and the engine enforce — token usage, spacing,
type scale, accessibility — live in [`design/guardrails.mdx`](./guardrails.mdx).
When drift recurs, the engine proposes a tighter guardrail (always HITL).

## How this gets maintained

The loop runs in Claude Code via the vendored skills in `.claude/skills/`:

- **Capture:** `/init-experiment` → `/write-variants` → `/measure` →
  `/close-experiment` appends the decision + reason to the **Memory** section above.
- **Sync + improve (scheduled):** a drift check keeps code true to
  `design/tokens.css` + `design/guardrails.mdx`; the engine then proposes
  improvements to the skills and guardrails as HITL cards.
