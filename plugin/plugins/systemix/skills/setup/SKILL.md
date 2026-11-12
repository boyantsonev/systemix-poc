---
name: setup
description: Set up this repo's AI-native design system — design/DESIGN.md, tokens.css, guardrails.mdx and rules.md (every rule as a row an agent can check) with known-bad evals — from the code that already ships, from a short interview when there is no UI yet, or from a Claude Design output. Proposes every file and writes only after a yes. Optionally sets up the product and build loops. Use when asked to "set up a design system", "create our rules", "audit my UI", "start from scratch", "import from Claude Design", or "/systemix:setup".
argument-hint: "[--from code|interview|claude-design <link>] [--loops]"
---

# /systemix:setup

Builds the design system this repo's agents will read, as files you own: `design/DESIGN.md`,
`design/tokens.css`, `design/guardrails.mdx` and `design/rules.md`, plus
`design/evals/rules/` (one known-bad sample per scripted rule). **Nothing is written until the
person says yes**: show each file, or its diff, first. Ghost mode: propose, never apply.

The scan: `SCAN='node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js"'`. Run it from the repo root.

## 1. Where to start from

Pick the door from what is in the repo (or `--from`), and say which and why in one line:

| The repo has | Door | Follow |
|---|---|---|
| UI code, no `design/` | **From the code**: infer the tokens and patterns that already ship, find drift and duplicates, propose the `design/` starter | `references/design-audit/guide.md` |
| No UI yet | **By interview**: the product, its people, and the associations behind the palette, then drafts in their voice | `references/design-interview/guide.md` |
| A Claude Design link or export | **From Claude Design**: its tokens and component styles into `design/` | `references/claude-design-sync/guide.md` |
| `design/` already | Skip to step 2 | — |

Read the guide in full and follow it. The guides name each other (design-audit, drift-report,
readiness-audit): those are guides, not commands; drift-report and readiness-audit are in
`/systemix:check`. Where a guide says to run `audit counters`, use `$SCAN audit counters`.

## 2. The rules as data

1. `$SCAN rules init --dry-run`, then, after a yes, `$SCAN rules init`: a starter `design/rules.md`
   (tokens, components, accessibility, voice) and its known-bad samples.
2. Make it this product's: from `design/DESIGN.md`, `design/guardrails.mdx`, the brand's voice and
   any legal copy rules the person gives, propose rows — an ID, the rule, the surfaces, block or
   flag, the source with its date, and a test (`script: <where> /pattern/` when a pattern can
   catch it, else `review: <question>`). Remove starter rows that don't apply. Show the table;
   write it after a yes.
3. For every new scripted rule, add one known-bad sample to `design/evals/rules/known-bad/`
   named `<ID>-<what>.<ext>`, and keep a known-good file that follows every rule.
4. `$SCAN rules lint` and `$SCAN rules eval` until both pass. A rule whose sample is missed is
   not ready: fix the pattern, not the sample.

## 3. --loops: the product and build loops (optional)

Only if the person asks: follow the setup part of `/systemix:loop` (who holds each role, the
prototype surface, how the project ships, what the agent must never touch), then
`$SCAN loops init` and `$SCAN loops check`.

## Reply

What was written (paths), what is still a proposal, and the first command to run next:
`/systemix:check <a folder of UI>` to see where the code stands against the new rules.
