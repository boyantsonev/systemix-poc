---
name: loop
description: Take a goal from one sentence to shipped and measured, through the product and build loops, stopping at every gate for a person. Status, open a goal, run the agent's next steps, a person's ruling at a gate, or the decision brief before one. Only a person runs this command; a gate is a ruling, and the agent never rules.
argument-hint: "[status] | open <sentence> | next [G-NNN] | gate approve|rework|drop [G-NNN] [note] | decide <loop.step>"
disable-model-invocation: true
---

# /systemix:loop

The command as typed: **$ARGUMENTS**

The first word picks what to do. Read the matching reference in full before doing it; each one
holds the steps, the rules and the reply.

| First word | What it does | Read |
|---|---|---|
| *(nothing)* or `status` | Where every goal is and whose gate it waits on; sets the loops up in a repo that has none | `references/status-and-setup.md` |
| `open <one sentence>` | Opens a goal: brief, evals, an empty decision log; stops at the Evals gate | `references/open.md` |
| `next [G-NNN]` | Runs the agent's steps until the next person or gate, then stops | `references/next.md` |
| `gate approve\|rework\|drop [G-NNN] [note]` | Records the person's ruling and moves the goal on | `references/gate.md` |
| `decide <loop.step>` | The decision brief for a gate, so whoever holds the role decides from the same facts; never decides | `references/decide.md` |

The loops, the goals and the decision log live in `design/loops/` and `design/goals/`. The bundled
scan checks them: `node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" loops check`. Inside a loop, use
`/systemix:brief` before building and `/systemix:check` before review; neither rules on anything.

**A gate is a person's ruling.** Record a ruling only when the person typed it in this command
(`gate …`); `loops check` refuses a decision line whose person does not hold the gate's role, and
any line ruled by the agent. Never approve, decide, merge, tag or start a goal on your own.
