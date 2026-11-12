---
id: build
kind: build
order: 2
title: Build loop · plan · code · test · ship · measure
status: agreed
awaiting: []
lead: engineering-lead
clock: a release; the turn ends when a shipped build has been measured
updated: 2026-01-10
---

# Build loop: from a validated design to a build people use

A validated design becomes a plan, then the product on a draft branch built against the rules,
tested against the goal's evals; a reviewer rules on shipping it, and the agent measures it the
same way every time.

## Why

Builds that grow past a reviewable size are hard to rule on. So every step lands as its own
reviewable pull request, and shipping is a person's ruling.

## Story
- **Plan**: the validated design becomes a plan of small steps, each one reviewable. → plan
- **Build**: the product on a draft branch, built against the rules and tested against the evals. → code, test
- **Ship**: to its people, then measured the same way every time. → ship, measure

## Steps

### Plan
The agent writes the build plan: branches, steps that each end working, what the design system
must change, which eval each step closes, and the questions the engineering lead would ask.
- kind: frame
- runs: agent
- writes: studio/goals, studio/briefs
- note: it ends with "Decisions for you"; the plan goes to the engineering lead with the code.

### Code
The engineering lead and the agent build the product on a draft branch against studio/rules.md.
- kind: build
- runs: engineering-lead + agent
- reads: studio/rules.md, studio/tokens.css
- writes: studio/goals
- note: one concern per commit, its reason in the message.

### Test
The build's tests, the rules check, and the goal's evals marked pass or fail on it.
- kind: measure
- runs: agent
- writes: studio/goals
- note: a failing eval goes back to Code, not on to Ship.

### Ship
Ship it to its people, or hold it.
- kind: decide
- runs: agent
- gate: decide · reviewer · with engineering-lead · context product, tech, business
- note: the agent prepares the release notes and the evals scorecard; a person rules and a person merges.

### Measure
The shipped build measured the same way every time: the goal's evals and, where analytics is
connected, the metric each eval names. Where it is not connected, the row says not measured.
- kind: measure
- runs: agent
- writes: studio/evaluations.md, studio/goals
- note: same definitions every time; every capture is tagged with its variant.

## Open
- None.
