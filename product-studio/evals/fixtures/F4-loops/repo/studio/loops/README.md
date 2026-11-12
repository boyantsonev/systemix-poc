# Loops: the grammar of a loop file

A loop is one markdown file, `<name>-loop.md`, in this folder. The coding agent and the checker
(`loops check`) read the same grammar, so every session sees the same picture. A new loop is one
new file; nothing else changes.

Two loops run here over one memory (`studio/LEARNINGS.md`): the **product loop** (from one
sentence to a design worth building) and the **build loop** (from a validated design to a
measured build). `joins.md` names the files one loop hands the other (a **join**), and
`roster.md` names who holds each role (the **roster**; the person is the **holder**, their
stand-in the **deputy**).

```markdown
---
id: product                  # joins refer to steps as <id>.<step>
kind: product                # one lowercase word
order: 1                     # display order; a goal starts in the first loop
title: Product loop · goal · evals · design · validate · learn
status: agreed                # draft | agreed
awaiting: []         # roles that have not revised it yet; [] when nobody
lead: design-lead            # a role
clock: what advances the loop, in one phrase
updated: YYYY-MM-DD
---
## Why
## Story
- **Phase name**: one sentence a non-engineer nods at. → step, step
## Steps
### Step label            (id = the lowercased label, unless `- id:` overrides it)
One paragraph: what happens.
- kind: frame | build | measure | decide | record
- runs: agent | <role> + agent | world
- gate: <act> · <lead role> [· with <role>, <role>] · context <pack>, <pack>
- reads: path, path
- writes: path, path
- note: one line of why (indented lines continue it)
## Open
```

Rules the checker enforces:

- **Gate acts**: `approve` (the holder or the deputy) or `decide` (a person, with the named
  roles' positions). A **gate** is a point where a person rules (approve, rework or drop) before
  the coding agent goes on. Every gate names at least one context pack, and each pack exists in
  `studio/context/`.
- **runs**: `agent` (the coding agent), `<role> + agent` (a person's step: it moves on when they
  say it holds, recorded as a decision line), or `world` (waiting on people, traffic or time).
  Roles, never people: a person's name where a role belongs is an error. The coding agent never
  holds a gate.
- Exactly **one `decide` step per loop**, led by a person.
- Every step belongs to exactly one Story phase.
- Every path in `reads`, `writes` and a join's `carries` exists, or is one the layout names.
- A loop is `draft` until every role in `awaiting` has revised it; that role's holder flips it to
  `agreed` and empties `awaiting`, in their own commit. The coding agent never flips it.

How a ruling moves a goal: **approve** moves it to the next step (across a join where one starts);
**rework** keeps it at the step, or, at a decide gate, sends it back to the loop's last build step;
**drop** closes it.
