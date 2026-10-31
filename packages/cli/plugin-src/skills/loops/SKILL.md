---
name: loops
description: Where every goal is in the product and build loops, who it waits on, and the commands that move it; sets the loops up in a repo that has none. Use when asked "where are we", "what's waiting on me", "loop status", "set up the loops", "product loop", "build loop".
---

# Systemix loops — status (and setup)

Read-only, unless the repo has no loops yet and the person asks to set them up.

## If `design/loops/` does not exist

Ask these, then stop for the answers; never invent people or tooling:

1. Who holds each role — `design-lead`, `engineering-lead`, `founder`, `reviewer` — and each role's deputy?
2. Is there a prototype surface (where pictures become real component code)? If not, say the build loop's Hub step will write to `design/hub/`.
3. How does the project test, tag and ship, and who are the first testers?
4. What must the agent never touch (customer data, secrets, production)?

With the answers: run `node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" loops init`, put the people into `design/loops/roster.md` (and the answer to 4 into the agent's `never:` line), and write real facts, each with its source, into `design/context/*.md`. Run `node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" loops check` until it passes. Both loops stay `status: draft` until a reviewer revises them.

## Status

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" loops check`. If it fails, show its errors first.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" loops status` and show its table, open goals first. A row that waits on nobody reads "agent — run /systemix:next G-NNN".
3. Under it, one line per person with what they have to do, and the commands:
   - `/systemix:goal <one sentence>` — open a goal
   - `/systemix:next [G-NNN]` — the agent's steps, up to the next person
   - `/systemix:gate approve|rework|drop [G-NNN] [note]` — a person's ruling
   - `/systemix:decide <loop.step>` — the brief before a gate
