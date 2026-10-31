---
name: goal
description: Open a goal from one sentence a person typed. Writes design/goals/G-NNN-<slug>/ (brief, evals, empty decision log), then stops at the Evals gate. Use only when a person asks to start a goal; never on your own initiative.
argument-hint: <the goal, in one sentence>
---

The goal as typed: **$ARGUMENTS**. If empty, ask for the sentence and stop.
Read `design/loops/product-loop.md` and `design/goals/README.md` first. No loops yet → run /systemix:loops to set them up, and stop.

## 1. Before writing
- Check the queue (`node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" loops status`): if a goal already waits on a person, say so (a new goal adds to their pile). Do not refuse.
- Is it already a goal? If an open goal reads the same, ask whether this is new or a correction. A change of direction for an approved goal is a new goal.
- Next free G-NNN; a slug of 2–4 lowercase words.

## 2. Research, in parallel (subagents; facts with sources, not file dumps)
- This repo: the context packs the Evals gate names, `experiments/LEARNINGS.md`, `node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" loops decisions` for rulings touching the goal's words, the newest work on what the goal names (recent branches, open PRs).
- The design system: `design/DESIGN.md`, `design/guardrails.mdx`, and the latest `/systemix:score` or counters if present.
- The world, if the goal touches it (a platform, a store, a regulation): the requirement from a primary source.

## 3. Write the folder
- `goal.md`: frontmatter (status: open, step: product.evals, waiting: reviewer, lead: the role the sentence implies); body in the README's order. Never pick between two readings silently. Nothing unsourced under "What is already true".
- `evals.md`: 5–12 evals, each checkable with a bar and the step that answers it; at least one about the person using it.
- `decisions.md`: the heading only: `# G-NNN · decisions`.

## 4. Check, then stop
Run `node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" loops check`. Reply with: id and title, the recommended reading in one line, the evals as a short list, the questions for the gate, and:

    /systemix:gate approve G-NNN            — as written
    /systemix:gate approve G-NNN <changes>  — with changes
    /systemix:gate rework G-NNN <what>
    /systemix:gate drop G-NNN <why>

HARD STOP. Do not draw, plan or build in the same turn.

Rules: open a goal only when a person asked; no commit, push or PR unless asked; plain language, gloss each technical term the first time.
