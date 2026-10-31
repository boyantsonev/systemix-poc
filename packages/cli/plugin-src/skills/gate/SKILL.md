---
name: gate
description: A person's ruling at a gate — approve, rework or drop a waiting goal. Writes the decision line and moves the goal on. Only a person types this; the agent never runs it on its own.
argument-hint: approve | rework | drop  [G-NNN]  [note]
disable-model-invocation: true
---

The ruling as typed: **$ARGUMENTS**

## 1. Read the ruling
Verb = first word (approve | rework | drop; else ask and stop). Goal = a G-NNN in the words, else the one goal with `waiting` set (several → ask). Note = the rest, kept exactly as written.
If `waiting` is empty, there is no gate: say which step it is at and stop.

## 2. Who is ruling
`git config user.name`, matched to a holder in `design/loops/roster.md`. The gate's lead role must be held by that person, or they stand in as deputy: they hold the role that the lead role names as its `deputy:` (`loops check` refuses any other name, and refuses the agent). No match → ask who is ruling and as which role. Never guess a person.

## 3. What each verb does
| verb | approve gate | decide gate |
|---|---|---|
| approve | output accepted; step → next step | "build it" (product.validate) · "ship it" (build.ship) |
| rework | back to the step that redoes it | "reshape it" · "hold it and fix" |
| drop | status: dropped | the same |

Approve with a note that changes something = approved with changes: make exactly those changes first, list them, then move on.
Rework defaults: product.evals → product.goal · product.validate → product.shape · build.plan → build.plan · build.system → build.hub · build.review → build.code · build.ship → build.code.
Status: building once product.validate is approved; shipped once product.learn is done.

## 4. Write it down
Append one line to `decisions.md`:
`- **YYYY-MM-DD · <Step> <ruling>.** <the person's note, word for word> (<role>: <person>[ as deputy] · context <packs> · brief B-NNN)`
Update `goal.md`: step, waiting empty, status, updated. Run `node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" loops check`.

## 5. Reply
One line of what was recorded, the new step, and the next command (usually /systemix:next G-NNN). Do not start the next step unless the note asked ("approve, and carry on").
