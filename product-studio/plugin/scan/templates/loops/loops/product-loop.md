---
id: product
kind: product
order: 1
title: Product loop · goal · evals · design · validate · learn
status: draft
awaiting: [reviewer]
lead: design-lead
clock: a goal, one sentence typed as loop open; the turn ends when a reviewer says build it, reshape it or drop it
updated: {{TODAY}}
---

# Product loop: from one sentence to a design worth building

A person types a goal in one sentence. The coding agent writes the goal and its evals first (what
must be true for it to count as done), then explores the design in real code; a reviewer says
build it, reshape it or drop it. What the build measures picks the next goal.

## Why

Direction that lives in chat is lost by the next session, and approvals given in chat leave no
record. So the goal and its evals are written in the repo first and approved together at one gate.

## Story
- **Goal**: one sentence becomes a goal, and the evals that say when it is done. → goal, evals
- **Design**: two or three variants in real code, each checked against the rules. → design
- **Validate**: build it, reshape it, or drop it. → validate
- **Learn**: what the build measured comes back as a cited learning and points to the next goal. → learn

## Steps

### Goal
The coding agent turns the sentence into a goal: every reading of it and the one it recommends, who
it is for, what is in and out, what the repo already holds, and the questions for the gate.
- kind: frame
- runs: agent
- reads: studio/context/product.md, studio/LEARNINGS.md, studio/goals/README.md
- writes: studio/goals
- note: two readings are never picked between silently; the goal names both and recommends one.

### Evals
What must be true for the goal to count as done: each eval checkable, with the command or
observation that checks it, the bar it must clear and the step that answers it.
- kind: frame
- runs: agent
- gate: approve · reviewer · with design-lead · context product, design
- writes: studio/goals
- note: the goal and its evals are approved together; an eval found later is shown at the next
  gate, never slipped in.

### Design
The coding agent explores two or three variants in real code on a draft branch, each checked
against studio/rules.md and shown on the preview page, for at most three rounds.
- kind: build
- runs: agent
- reads: studio/rules.md, studio/tokens.css
- writes: studio/goals
- note: a person picks between the variants at the Validate gate, never the coding agent.

### Validate
Build it, reshape it, or drop it: from the variants, their check results and the evals still open.
- kind: decide
- runs: agent
- gate: decide · reviewer · with design-lead, engineering-lead · context product, design, tech
- writes: studio/goals
- note: the coding agent prepares the brief; a person rules. Build it hands the goal to the build
  loop's Plan; reshape it goes back to Design.

### Learn
What the build measured, written where the next goal reads it, as one cited learning; and at most
one next-goal sentence proposed.
- kind: record
- runs: agent
- reads: studio/evaluations.md
- writes: studio/LEARNINGS.md, studio/goals
- note: the coding agent proposes the next sentence; it never opens a goal on its own.

## Open
- A reviewer to revise this loop: it stays draft until one has, then they flip it to agreed.
