# Loops: the grammar of a loop file

A loop is one markdown file, `<name>-loop.md`, in this folder. The coding agent and the checker
(`loops check`) read the same grammar, so every session sees the same picture. A new loop is one
new file; nothing else changes.

Two loops run here over one memory (`studio/LEARNINGS.md`): the **product loop** (from one
sentence to a design worth building) and the **build loop** (from a validated design to a
measured build). `joins.md` names the files one loop hands the other.

```markdown
---
id: product                  # joins refer to steps as <id>.<step>
kind: product                # one lowercase word
order: 1                     # display order
title: Product loop: goal · evals · design · validate · learn
status: draft                # draft | agreed
awaiting: [reviewer]         # roles that have not revised it yet; [] when nobody
lead: design-lead            # a role
clock: what advances the loop, in one phrase
updated: YYYY-MM-DD
---
## Why
## Story
- **Phase name**: one sentence a non-engineer nods at. → step, step
## Steps
### Step label            (id = the lowercased label)
One paragraph: what happens.
- kind: frame | build | measure | decide | record
- runs: agent | <role> | <role> + agent | world
- gate: <act> · <lead role> [· with <role>, <role>] [· context <pack>, <pack>]
- reads: path, path
- writes: path, path
- note: one line of why
## Open
```

Rules the checker enforces:

- **Gate acts**: `approve` (the holder or the deputy) or `decide` (a person, with the named roles'
  positions). Every gate names at least one context pack, and each pack exists in `studio/context/`.
- **runs**: `agent` (the coding agent), `<role> + agent`, or `world` (waiting on people, traffic or
  time). Roles, never people: a person's name where a role belongs is an error.
- Exactly **one `decide` step per loop**, led by a person.
- Every step belongs to exactly one Story phase.
- Every path in `reads`, `writes` and a join's `carries` exists.

A gate is a point where a person rules (approve, rework or drop) before the agent goes on. The
roster (`roster.md`) says who holds each role.
