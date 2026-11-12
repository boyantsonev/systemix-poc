# Loop status, and setting the loops up

Read by `/product-studio:loop`, `/product-studio:loop status`, `/product-studio:loop setup` and by
`/product-studio:setup --loops`. Both doors run the same steps from this one file.

Status is read-only. Setup writes files only after a yes.

## Which part

- `studio/loops/` exists and the person did not ask for setup: **Status**.
- `studio/loops/` is missing, or the person typed `setup`: **Setup**. If they typed `status` in a
  repo with no loops, say there are none yet and offer setup in one line. Don't start it unasked.

## Status

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" loops check --json`. If `ok` is false, show each problem (`file`, `line`,
   `message`) first. Fix nothing in a status run; say which subcommand would fix it.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" loops status --json`. Show one row per goal from its `goals[]`, open goals first:

   | Goal | Title | Step | Waits on |
   |---|---|---|---|

   `Waits on` reads "<waitsOn.role> · holder <holder>[ · deputy <deputy>]"; gloss gate and holder
   above the table. When `waitsOn` is null the row reads "the coding agent: run
   `/product-studio:loop next G-NNN`". Add the `lastRuling` when there is one. Never work out a step
   yourself; quote the JSON.
3. Under the table, one line per person with what they owe ("Ada Lovelace: the Evals gate on
   G-001").
4. The commands, once:
   - `/product-studio:loop open <one sentence>`: open a goal
   - `/product-studio:loop next [G-NNN]`: the coding agent's steps, up to the next person
   - `/product-studio:loop gate approve|rework|drop [G-NNN] [note]`: a person's ruling
   - `/product-studio:loop decide [G-NNN | question]`: the brief before a ruling
5. No goals yet: say so, and suggest the first goal from Setup step 6.

## Setup

The roster names people. Never invent one, and never write a placeholder into a file.

### 1 · Solo or team

Solo is the default: one person holds every role and there is no deputy. Read the name with
`git config user.name` and ask "Hold every role as <name>?". If git has no name, ask for one.

A team is opt-in: the person says so. Then ask for the holder of each role in the loop templates
(for example design-lead, engineering-lead, reviewer) and who stands in for each. The build.code
step is held by engineering-lead unless the person names another role.

### 2 · Four questions, one per turn

Ask one question, then wait: one question mark per reply, no follow-ups in the same turn. Note
what you see in the repo as your guess inside that question. Skip one the person already
answered. Never add a fifth.

1. **Surface.** Where does the work show up: the product UI, marketing pages, email, docs? Which
   folders?
2. **Shipping.** How do you test, tag and ship, and who tries it first?
3. **Never touch.** What must the coding agent never touch (customer data, secrets, production,
   billing)?
4. **Ask first.** What must it always ask about before doing?

### 3 · Show what will be written

Run the init as a dry run, with the flags the answers gave. Never rely on `git config user.name`
when it is the coding agent's name or empty: name the person with `--holder`. Solo names the same
person for every role, so the roster can't fall back to anyone else:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" loops init --dry-run --json
node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" loops init --holder design-lead="<name>" --holder engineering-lead="<name>" --holder reviewer="<name>" --dry-run --json
node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" loops init --preset team --holder design-lead="<name>" --holder engineering-lead="<name>" --dry-run --json
```

In the reply that asks for the yes, list every path of `written[]` and `kept[]` one per line
(quoted from the dry run, never "the files above"), then the context facts you will add to
`studio/context/{product,design,tech,business,marketing}.md`. Each fact is one line with its
source: a file path, or "said by <name> in setup, <date>". The never-touch answer goes into the
coding agent's `never:` line in the roster. Ask: **"Write these? (yes / change something)"**.

### 4 · Write, after the yes

Run the same command without `--dry-run`. If it exits with `{error:"need-holder"}`, ask for the
name and stop. Then add the context facts, exactly as shown. Run `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" loops check --json`
until `ok` is true. Quote the roster's `- holder:` lines in the reply, so the person sees who
holds each role (solo: the same name on every role, and no deputy). Fix only lines this run wrote; never fill a gap with a made-up person or fact.

### 5 · From draft to agreed

Both loops start as `status: draft`. Say this plainly: a reviewer (whoever holds that role) reads
`studio/loops/product-loop.md` and `studio/loops/build-loop.md`, changes what doesn't fit, and
flips `status: draft` to `status: agreed` themselves, in their own commit. The coding agent never
flips it. The loops still run while they are drafts.

### 6 · The first goal

Suggest one small goal that exercises every step: **fix one small visible drift**. If a check has
run, pick one finding from the newest check row (`node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" runs list --command check --json`).
Give the command and don't run it:

    /product-studio:loop open Fix one small visible drift: <the finding, in plain words>

## Reply

Status: the table, what each person owes, the commands. Setup: what was written, that the loops are
drafts until a reviewer agrees them, and the first goal command. Then the four-line stop report
from the SKILL.md, and the run-log step.
