---
id: product
kind: product
order: 1
title: Product loop — goal · evals · design · validate
status: draft
awaiting: [reviewer]
lead: design-lead
clock: a goal — one sentence typed as /systemix:goal; the turn ends when a reviewer says build it, reshape it or drop it
updated: 2026-10-31
---

# Product loop — from one sentence to a design worth building

A person types a goal in one sentence; the agent writes the brief and the evals
first — what must be true for it to count as done — then draws the pictures;
the design lead shapes them and tries them with people, and a reviewer says
build it, reshape it or drop it. What the build measures picks the next goal.

## Why

Direction that lives in chat is lost by the next session, approvals given in chat
leave no record, and work that had a bar before it was drawn goes well. So the goal
and its evals are written first, in the repo, and approved together at one gate.

## Story
- **Goal** — One sentence becomes a brief, and the evals that say when it is done. → goal, evals
- **Design** — Pictures drawn to meet the evals; the design lead shapes them and tries them with people. → design, shape, test
- **Validate** — Scored against the evals: build it, reshape it, or drop it. → score, validate
- **Learn** — What the build measured comes back and points to the next goal. → learn

## Steps

### Goal
The agent turns the sentence into a brief — every reading of it and the one it
recommends, who it is for, what is in and out, what the repo already holds, the
risks, the questions for the gate.
- kind: frame
- runs: agent
- reads: design/context/product.md, experiments/LEARNINGS.md, design/goals/README.md
- writes: design/goals
- note: Two readings are never picked between silently — the brief names both
  and recommends one; the reviewer picks.

### Evals
What must be true for the goal to count as done — each eval checkable, with the
command or observation that checks it, the bar it must clear and the step that
answers it.
- kind: frame
- runs: agent
- gate: approve · reviewer · with design-lead · context product, design, tech
- writes: design/goals
- note: The goal and its evals are approved together. The build loop's tests
  prove these evals; an eval found while building is added here and shown at
  the next gate, never slipped in.

### Design
The agent draws the pictures the goal needs — every screen and state the evals
name — from the design system's parts.
- kind: build
- runs: agent
- writes: design/artifacts, design/goals
- note: Pictures, not code. Each one is published (a claude.ai artifact, or a page
  the local design hub serves) and listed in artifacts.md with the script that draws
  it and its link. A build-only goal may skip pictures; the Evals gate says so.

### Shape
The design lead shapes the pictures — comments, redraws, the rules that come out
of it — with the agent, until they hold.
- kind: build
- runs: design-lead + agent
- writes: design/artifacts, design/goals
- note: A rule said while shaping is written as a decision line; the design
  system takes it at the build loop's System step.

### Test with people
People try the pictures on the goal's scenarios; what they did, said and missed
is written down; redraw and try again until it holds.
- id: test
- kind: measure
- runs: design-lead + agent
- writes: design/goals
- surface: none
- note: Use realistic scenarios, never real customer data or credentials.

### Score
The agent scores the pictures against the evals a picture can answer, and marks
the ones only a build can.
- kind: measure
- runs: agent
- writes: design/goals
- surface: none

### Validate
Build it, reshape it, or drop it — from the scored pictures, what people did,
and the evals still open.
- kind: decide
- runs: agent
- gate: decide · reviewer · with design-lead, engineering-lead · context product, design, tech
- writes: design/goals
- note: The agent prepares the brief (/systemix:decide); a person rules with
  /systemix:gate. "Build it" hands the goal, its evals and the validated
  pictures to the build loop's Plan.

### Learn
What the build measured and what its testers did, written where the next goal
reads it — and the next goal proposed, or set by a person.
- kind: record
- runs: agent
- writes: experiments/LEARNINGS.md, design/goals
- note: The agent proposes the next sentence; it never starts a goal on its own.

## Open
- A reviewer to revise the loop — status stays draft until one has.
