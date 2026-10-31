# Goals — the grammar of a goal folder

One folder per goal: `design/goals/G-NNN-<slug>/`. Numbering (`G-NNN`, `B-NNN`,
`E1…`, `A1…`) is global and never reused. `systemix loops check` refuses anything
malformed.

## goal.md

```yaml
---
id: G-001
slug: two-to-four-words
title: the agent's reading of the sentence (the gate may correct it)
asked: the sentence exactly as typed
status: open           # open | building | shipped | dropped
step: product.evals    # <loop>.<step> — where the goal is now
waiting: reviewer      # role whose gate it waits on; empty while the agent works
lead: design-lead      # the role that leads this goal
repos: [this-repo]
opened: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

`step` and `waiting` are the goal's whole state. `waiting` set means a person must
rule before the agent may go on; only `/systemix:gate` clears it.

Body, in this order: **The goal, as asked** (quoted) · **How I read it** (every
reading A, B…, what each builds and costs, the one recommended and why) · **For
whom** · **In / Out** · **What is already true** (facts, each with its source) ·
**Risks** · **Questions for the gate** (only what changes what gets built, each with
the option the agent would take).

## evals.md

| id | must be true | checked by | bar | answered at | status |
|---|---|---|---|---|---|
| E1 | A new user finishes sign-up without help | 5 observed sessions | 5 of 5, each < 2 min | build.test | open |

- **checked by**: a command, a script, or an observation a person makes; never "looks good".
- **answered at**: `product.score` for what a picture shows; `build.test` or `build.measure` for what only a build can.
- **status**: `open` · `pass` · `fail` · `waived` (only at a gate, with the decision line that waived it).
- Five to twelve evals; at least one about the person using it, not only the software.

## decisions.md

Append-only, one line per ruling:

```markdown
- **YYYY-MM-DD · Evals approved with changes.** Reading A; E4 raised to 60 s. (reviewer: Ada · context product, design, tech · brief B-002)
```

Title = step label + ruling. Body = the person's own words, never reworded. Trailing
`(…)` = gate role, person (`as deputy` when standing in), context packs, brief id.

## artifacts.md (from `product.design` on)

| id | shows | evals | source | artifact | published |
|---|---|---|---|---|---|
| A1 | the sign-up screen — empty, error, done | E1, E2 | design/artifacts/signup.html | https://… | YYYY-MM-DD |

The source file is the master; the published link is its copy. Republish to the same
link so comment threads survive. A build-only goal writes one line: `No pictures — <why>`.

## plan.md (at `build.plan`)

Branches · steps that each end working and each land as a reviewable PR · what the
design system and the backend must change · which eval each step closes ·
**Decisions for you** · **Decisions made while building** · **Tested · not verified**.
