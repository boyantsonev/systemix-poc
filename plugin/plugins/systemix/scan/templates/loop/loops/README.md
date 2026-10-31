# Loops — the grammar of a loop file

A loop is one markdown file, `<name>-loop.md`, in this folder. The agent and the
checker (`systemix loops check`) read the same grammar, so every session sees the
same truth. A new loop is one new file; nothing else changes.

```markdown
---
id: product                  # joins refer to steps as <id>.<step>
kind: product                # one lowercase word: market | product | build | quality …
order: 2                     # optional — display order
title: Product loop — goal · evals · design · validate
status: draft                # draft | agreed
awaiting: [reviewer]         # roles that have not revised it yet; [] when nobody
lead: design-lead            # a role
clock: what advances the loop, in one phrase
updated: YYYY-MM-DD
---
# Title (ignored — frontmatter carries it)

The first paragraph is the summary.

## Why
## Story
- **Phase name** — one sentence a non-engineer nods at. → step, step
## Steps
### Step label            (id = lowercased label, unless `- id:` overrides)
One paragraph — what happens.
- id: optional-override
- kind: frame | build | measure | decide | record
- runs: agent | <role> | <role> + agent | code | world
- gate: <act> · <lead role> [· with <role>, <role>] [· needs <quorum>] [· context <pack>, <pack>]
- reads: path, path
- writes: path, path
- surface: path | none
- note: one line of why (indented lines continue it)
## Open
```

Rules the checker enforces:

- **Gate acts:** `review` (one reviewer), `approve` (holder or deputy), `decide` (a
  person, with the named roles' positions). Every `approve` and `decide` gate names
  at least one context pack, and each pack exists in `design/context/`.
- **`runs`:** `agent`, `<role> + agent`, `code` (automation) or `world` (waiting on
  testers, traffic or time). Roles, never people: a person's name where a role belongs
  is an error.
- Exactly **one `decide` step per loop**, led by a person.
- Every step belongs to exactly one Story phase.
- A loop is `draft` until every role in `awaiting` has revised it; that role's holder
  flips it to `agreed` and empties `awaiting`.
- Every path in `reads`, `writes`, `surface` and a join's `carries` exists.

Systemix runs three loops over one memory (`experiments/LEARNINGS.md`): the
**market loop** (the experiments in `experiments/`), the **product loop** and the
**build loop** in this folder. The build loop's Hub and System steps are the design
sprint: Frame, Build, Systematize.
