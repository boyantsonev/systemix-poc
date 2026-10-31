---
id: G-004
slug: one-model
title: Prune Systemix to one model — deferred code out, one meaning for goal, loop and decision store, the hosted control plane off production, and docs that describe what ships
asked: "go with your recommendations" — accepting the proposed goal "Prune Systemix to one model of goals, loops and decisions" (repo-review.md § 3, phases 4–5)
status: open
step: product.evals
waiting: reviewer
lead: engineering-lead
repos: [systemix-poc]
opened: 2026-10-31
updated: 2026-10-31
---

# G-004 · Prune Systemix to one model

## The goal, as asked

> "go with your recommendations" — accepting the proposed goal "Prune Systemix to one model of goals,
> loops and decisions" (`docs/feature/ai-native-ds-kit-beta/repo-review.md` § 3, phases 4–5).

## How I read it

**A. Prune, then unify, in two PRs (recommended).** PR 1 removes Deferred and dead code: TokenGuard
and mcp-proxy, about 25 unused routes, hooks and components, unused dependencies, the hosted control
plane on production (D2), and moves Figma behind `systemix labs` (D5). PR 2 gives every name one
meaning: `experiments/objectives` (D3), `systemix experiment run` for the experiment runner, one
decision store, one canonical log per kind, one layout file for every path; then CLAUDE.md and the
README rewritten, and lint and typecheck made CI gates. Old command names keep working for one minor
version with a notice. About 4–5 days. Build-only.

**B. Prune only.** Smaller, but the double meanings stay, and agents keep mixing up the two goals and
the two loops.

I recommend **A**, after G-003's PR 1 (it touches the same routes).

## For whom

Agents and people reading this repo: one name, one meaning (`design/context/tech.md`).

## In / Out

**In:** review section 1 "Dead weight and two models", D2, D3, D5, CI lint and typecheck.
**Out:** safety fixes (G-003), new features (G-001), the landing (G-002).

## What is already true

- The dead code, double meanings and docs drift, each located `docs/feature/ai-native-ds-kit-beta/repo-review.md § 1`
- The founder decided D2, D3 and D5 on 2026-10-31 `wave-decisions.md DSC-22`
- CLAUDE.md defers TokenGuard, the Figma plugin and the Next.js control plane `CLAUDE.md § Deferred`
- eslint reports 728 errors today, mostly in packages/ and plugin/ `repo-review.md § 1`

## Risks

- Someone uses an old command or path: aliases with a notice for one minor version.
- A route looks dead but a doc or skill links to it: a search of docs and skills before each removal.

## Questions for the gate

1. Reading A or B? — I would take **A**.
2. Build-only, no pictures, product.test waived? — I would say **yes**.
