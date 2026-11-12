# Goals: the grammar of a goal folder

One folder per goal: `studio/goals/G-NNN-<slug>/`. Numbers are global and never reused.
`loops goal new <slug> --title "<one sentence>"` makes the folder; `loops check` refuses anything
malformed.

## goal.md

```markdown
---
id: G-001
title: The goal, in one sentence
status: open
step: product.evals
opened: YYYY-MM-DD
---
# The goal, in one sentence
## Success criteria
## Kill if
## Context
```

- `status`: `open`, `building` (the build loop has it), `shipped` or `dropped`.
- `step`: `<loop>.<step>`, where the goal is now. Only a person's ruling moves it past a gate.
- **Success criteria**: what is true when this is done, in what people see.
- **Kill if**: what would make us stop.
- **Context**: what is already true, each fact with its source, and the learnings it builds on
  (`L-NNN`).

## evals.md

| id | must be true | checked by | bar | answered at | status |
|---|---|---|---|---|---|
| E1 | A new person finishes the task without help | 5 observed sessions | 5 of 5, each under 2 min | build.test | open |

- Five to twelve evals, in one table. At least one is about a person using it, not only the software.
- **checked by**: a command, a script, or an observation a person makes; never "looks good".
- **answered at**: the `<loop>.<step>` that answers it: `product.design` for what a variant shows,
  `build.test` or `build.measure` for what only a build can.
- **status**: `open`, `pass`, `fail` or `waived` (only at a gate, with the decision line that
  names it).

## decisions.md

Append-only, one line per ruling, written by `loops gate`:

```markdown
- YYYY-MM-DD · product.evals · approve · by <name> · brief: none
- YYYY-MM-DD · product.validate · rework · by <name> · brief: B-002 · note: the person's own words
```

The gate is the step ruled on; the ruling is `approve`, `rework` or `drop`; the name is the holder
of the step's role or its deputy, as the roster names them. The name is taken at its word, which is
weak on a shared machine or in CI.

## plan.md (from build.plan on)

Steps that each end working and each land as a reviewable pull request, which eval each closes,
what the design system must change, **Decisions for you**, **Decisions made while building** and
**Tested · not verified**.
