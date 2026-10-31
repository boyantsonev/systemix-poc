---
id: build
kind: build
order: 2
title: Build loop — plan · prototype · system · code · test · ship
status: draft
awaiting: [reviewer]
lead: engineering-lead
clock: a tag — the turn ends when a tagged build reaches its testers
updated: 2026-10-31
---

# Build loop — from a validated design to a build people use

A validated design becomes a plan, then real component code on a prototype
surface, then the product on a draft branch, tested against the goal's evals; a
reviewer approves it as code, it ships to its testers, and the agent measures it
the same way every time.

## Why

Builds that grew far past a reviewable size, and pins that moved to unmerged
branches, are why the plan is a gate and every step lands as its own reviewable PR.
Hub and System are the design sprint: Frame (the plan), Build (real component code)
and Systematize (what was needed twice graduates into the design system).

## Story
- **Plan** — The validated design becomes a plan: which repo, which steps, what the system and backend need. → plan
- **Prototype** — The pictures become real component code; the system keeps what they needed. → hub, system
- **Build** — The product on a draft branch, tested against the goal's evals, reviewed as code. → code, test, review
- **Ship** — To its testers, then measured the same way every time. → ship, measure

## Steps

### Plan
The agent writes the build plan — branches, steps that each end working and each
land as a reviewable PR, what the design system and the backend must change, which
eval each step closes — and the questions the engineering lead would ask.
- kind: frame
- runs: agent
- gate: approve · reviewer · with engineering-lead · context tech, product
- writes: design/goals, design/briefs
- note: Ends with "Decisions for you"; leaves room for "Decisions made while
  building" and "Tested · not verified". A backend gap gets its own brief.

### Hub
The pictures in real design-system code on a prototype surface — every frame
registered, every frame scored against its picture.
- kind: build
- runs: agent
- writes: design/hub
- note: A parity eval (code vs picture) is the bar; how a frame looks stays the
  design lead's call.

### System
What the frames needed twice graduates into the design system — parts, tokens,
guidelines, a version and a tag — and the product's pin moves to the tag.
- kind: build
- runs: agent
- gate: approve · reviewer · context design, tech
- writes: design
- note: A person merges and tags; the product pins to the tag in its own PR,
  never to an unmerged branch.

### Code
The design lead and the agent build the product on a draft branch — the screens
and the backend they need — so the review is of code, not of pictures.
- kind: build
- runs: design-lead + agent
- writes: design/goals
- note: One branch from the latest main; one concern per commit, its reason in
  the message; a review guide walks the path through them.

### Test
The build's tests, and the goal's evals marked pass or fail on it — on the
machines and devices the goal names.
- kind: measure
- runs: agent
- writes: design/goals
- note: A failing eval goes back to Code, not on to review.

### Review
A reviewer reviews the draft PR — the code, run on their own machine — and takes
it from there with the agent: merged, reworked or sent back.
- kind: build
- runs: engineering-lead + agent
- gate: approve · reviewer · with engineering-lead · context tech, product

### Ship
Tag it and send it to its testers — or hold it.
- kind: decide
- runs: agent
- gate: decide · reviewer · with design-lead, engineering-lead · context product, tech, business
- note: The agent prepares release notes and the evals scorecard; a person
  rules with /systemix:gate and a person tags. Internal testers first.

### Measure
The shipped build measured the same way every time — screenshots, the Systemix
counters and score, analytics (PostHog), the goal's evals — and compared with the
last version.
- kind: measure
- runs: agent
- writes: design/evaluations.md, design/goals
- note: Same viewport, same stages, same definitions every time.

## Open
- A reviewer to revise the loop — status stays draft until one has.
