---
id: G-003
slug: safe-to-publish
title: Make Systemix safe to merge and publish — no private notes or retired offers on the site, no data loss or unasked writes in the CLI, and an agent that can never rule
asked: "go with your recommendations" — accepting the proposed goal "Make Systemix safe to merge and publish" (repo-review.md § 3, phases 1–3)
status: building
step: build.code
waiting:
lead: engineering-lead
repos: [systemix-poc]
opened: 2026-10-31
updated: 2026-10-31
---

# G-003 · Make Systemix safe to merge and publish

## The goal, as asked

> "go with your recommendations" — accepting the proposed goal "Make Systemix safe to merge and
> publish" (`docs/feature/ai-native-ds-kit-beta/repo-review.md` § 3, phases 1–3).

## How I read it

**A. Fixes 1–19 of the review, build-only, in three PRs (recommended).** PR 1 makes the branch safe
to merge (fixes 1–7). PR 2 makes the CLI safe to publish (8–12, and the local free score, D1).
PR 3 removes every way for the agent to rule (13–17) and the Supabase dual-write (D4). No pictures:
a build-only goal; the Evals gate says so. About 5 days.

**B. Only PR 1.** Enough to merge this branch, but npm keeps serving the unsafe 0.2.0 and the agent
can still approve its own cards.

I recommend **A**.

## For whom

Everyone who installs Systemix from npm or the plugin, and the founder, whose approvals must be the
only approvals (`design/context/tech.md`).

## In / Out

**In:** review fixes 1–19, D1 and D4, CI checks for the plugin build, the loops and the hub.
**Out:** pruning and renaming (G-004), new features (G-001), the landing rework (G-002), publishing
to npm (the founder's, after PR 2).

## What is already true

- Each finding, with file and line, and which were re-checked by hand `docs/feature/ai-native-ds-kit-beta/repo-review.md § 1`
- Tests pass today: CLI 2,022, app 218, hub `node --test` `repo-review.md`
- npm `latest` for @getsystemix/cli is 0.2.0, which has the init data-loss bug `wave-decisions.md DSC-7`
- The founder decided D1 and D4 on 2026-10-31 `wave-decisions.md DSC-22`

## Risks

- The free score computed locally changes what the report service counts (no `score_served` from the plugin); the web funnel keeps install and checkout events.
- Removing click-approve before `systemix experiment ack` exists would leave cards with no way to be approved: the command lands first.

## Questions for the gate

1. Reading A (three PRs) or B? — I would take **A**.
2. Build-only, no pictures, and product.test waived? — I would say **yes**.
