---
id: G-005
slug: free-plugin
title: Systemix is one free plugin with four commands — setup, brief, check, loop — and the site says so, with a sponsor link and setup for a client's product from a starting price
asked: "go with your recommendations, sponsor link yes. but 3 days would not be enough for the discovery … so no price, just starting from is probably a good orientation for clients"
status: building
step: build.code
waiting:
lead: engineering-lead
repos: [systemix-poc]
opened: 2026-11-12
updated: 2026-11-12
---

# G-005 · One free plugin, four commands

## The goal, as asked

> "lets rethink everything and simplify - this could be just a plugin, and its free, making the
> whole think a magnet", then, on the recommendation: "go with your recommendations, sponsor link
> yes. but 3 days would not be enough for the discovery. I spent 4 weeks probably building all of
> the design system, web app, landing pages, etc - serving as discovery for the use cases of the
> plugin. So this is not realistic. It depends on the product and client that this is going to be
> implemented, so no price, just starting from is probably a good orientation for clients"

## How I read it

The helloBill kit (Nov 2026) converged, after a month of use, on one plugin with three commands
(brief, check, loop) reading one rules file. Systemix takes that shape, generalised, plus setup:

| Command | Job | Folds in |
|---|---|---|
| `/systemix:setup` | The design system and `rules.md` from the code, or by interview | design-audit, design-interview, claude-design-sync |
| `/systemix:brief` | Before building: the rules that apply, what to start from | new |
| `/systemix:check` | After building: pass, flag or fail per rule, plus the free score | score, drift-report, readiness-audit |
| `/systemix:loop` | Goal to shipped, a person at every gate | loops, goal, next, gate, decide |

**PR 1, the plugin:** the four commands; `systemix rules init|lint|check|eval` (rules as data, a
pattern per rule, known-bad evals); no MCP server, no license key, nothing sent anywhere.
**PR 2, the site:** one page for the free plugin, a sponsor link, and "set up for your product,
from €…"; the quick report, the audit page and the report service go.

## For whom

Product teams building UI with Claude Code, who install the plugin from Claude's directory or the
README (`design/context/marketing.md`). The paying client is the team that wants it set up for
their product.

## In / Out

**In:** the plugin, the scan's `rules` command, the site and its pricing, the docs that name the
old commands. **Out:** the CLI's other commands (they stay as they are), helloBill's own content
(the method and file shapes only; their brand, people and links stay out of this repo).

## What is already true

- The helloBill kit converged on one plugin, three commands and a rules file `founder's kit, 2026-11-12 (not in this repo)`
- The quick report was never on sale: no checkout, the report service closed `design/goals/G-003-safe-to-publish/plan.md`
- The loop gates are typed by a person; the agent never rules `design/goals/G-003-safe-to-publish/evals.md`
- Discovery for one product took about four weeks `founder, 2026-11-12`

## Risks

- Users of the old commands (`/systemix:check --score`, `/systemix:loop gate` …) find them gone. The plugin is
  0.x and has no known users yet; the README lists what replaced what.
- `/systemix:loop` must stay person-only (a gate is a ruling), so the agent cannot start it.

## Questions for the gate

1. The starting price for setup: what figure? — the founder's to name; the site shows a
   placeholder until then.
