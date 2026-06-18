---
type: design-system
instance: your-instance
icp: your-icp
created: 2026-01-01
updated: 2026-01-01
---

# Design System

An **optional substrate** for the loop — the design-system-as-object your
prototypes build from. Tokens are code-first in [`tokens.css`](./tokens.css); the
rules the drift check enforces live in [`guardrails.mdx`](./guardrails.mdx).

> The learning loop itself lives in **`experiments/`** and does not depend on this
> folder. Validated learnings are captured in `experiments/LEARNINGS.md`.

## Brief

<!-- One paragraph: what is this design system for, who is the ICP? Replace this. -->

A code-first, context-based design system. Tokens live in `design/tokens.css`; the
rules the engine enforces live in `design/guardrails.mdx`.

## Guardrails

The design rules the drift check and the engine enforce — token usage, spacing,
type scale, accessibility — live in [`guardrails.mdx`](./guardrails.mdx). When
drift recurs, the engine proposes a tighter guardrail (always HITL).

## Tokens

Canonical token values live in [`tokens.css`](./tokens.css) (the app imports these).
Keep them code-first; `/claude-design-sync` updates them from a Claude Design export.
