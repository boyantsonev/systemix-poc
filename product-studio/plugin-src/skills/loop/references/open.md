# Open a goal

The goal as typed: the rest of the command. If it is empty, ask for one sentence and stop.

`open` turns one sentence into `studio/goals/G-NNN-<slug>/`: `goal.md`, `evals.md` with 5 to 12
evals, and an empty `decisions.md`. Then it stops at the Evals gate. Nothing is written before the
person says yes, and nothing moves the goal after the gate.

## 1 · Before anything

- No `studio/loops/`: say the loops aren't set up, offer `/{{PLUGIN}}:loop setup`, and stop.
- Run `{{CLI}} loops status --json`. If a goal already waits on the same person, say so (a new
  goal adds to their pile). Don't refuse.
- If an open goal reads the same, ask whether this is new or a correction. A change of direction
  for an approved goal is a new goal.
- Pick a slug of 2 to 4 lowercase words, joined by hyphens.

## 2 · The last check

Run `{{CLI}} runs list --command check --json` and take the newest row. Quote its `result`,
`blocks` and `flags` as "the last check (<run id>, <date>)". No row: say "no check has run yet".
Never call anything else "the latest check".

## 3 · Research

Follow `{{ROOT}}/skills/shared/context-pack.md` at **full** depth, for the goal's words.

- When subagents are available, run the sources in parallel: one for this repo (context packs,
  decisions, learnings, rulings, recent branches), one for the design system (`studio/DESIGN.md`,
  `{{CLI}} rules list --json`), one for the outside world if the goal touches it (a platform, a
  store, a regulation: a primary source only).
- No subagents: read the same sources yourself, one after another.
- No web: the outside source goes under "Couldn't read", with why. Never fill it from memory.

Bring back facts with their sources, not file dumps.

## 4 · Offer the job step, when the sentence names no outcome

If the sentence says what to build but not what a person gets from it ("add a CSV export" with no
"so that…"), offer once: "Map the job first? It ranks what people need, as a beta, by hand." On a
yes follow `{{ROOT}}/skills/loop/references/jobs.md`, then come back here with the sentence the
person picks. On a no, carry on.

## 5 · Draft, and show it

`goal.md`, in the sections the CLI writes:

- **Success criteria**: what is true when this is done, in what people see.
- **Kill if**: what would make us stop.
- **Context**: what is already true, each fact with its source; the learning ids it builds on
  (`L-NNN`); conflicts named, never picked between silently. If the sentence has two readings,
  name both and recommend one; the person picks at the gate.

`evals.md`: 5 to 12 rows. Each is checkable (a command, a script, or an observation a person
makes; never "looks good"), has a bar, and names the step that answers it (`product.design` for
what a variant shows, `build.test` or `build.measure` for what only a build can). At least one is
about a person using it, not only the software.

Show both in full, then: **"Write G-<next> with these? (yes / change something)"**.

## 6 · Write, after the yes

Strip `"`, `$` and backticks from the sentence, then:

```bash
{{CLI}} loops goal new <slug> --title "<the sentence>" --json
```

It prints `{id, dir, files[]}`. Fill the sections of `goal.md` and the rows of `evals.md` in that
`dir`, exactly as shown. Leave `decisions.md` empty. Don't touch the frontmatter the CLI wrote.

Run `{{CLI}} loops check --json`. It must print `ok: true`.

## 7 · Stop at the Evals gate

Reply with the id and title, the reading you recommend in one line, the evals as a short list, the
questions for the gate, and the person's choices:

    /{{PLUGIN}}:loop gate approve G-NNN              as written
    /{{PLUGIN}}:loop gate approve G-NNN <changes>    with changes
    /{{PLUGIN}}:loop gate rework G-NNN <what>
    /{{PLUGIN}}:loop gate drop G-NNN <why>
    /{{PLUGIN}}:loop decide G-NNN                    a brief first, for a deputy

**The issue.** If `{{CLI}} connectors check --json` shows `tracker` ready, offer the goal's issue
from `{{CLI}} connectors issue G-NNN --json`, and with `slack` ready the gate notice from
`{{CLI}} connectors notice gate G-NNN --json`, per `{{ROOT}}/skills/shared/connectors.md`. Not
connected: one line ("GitHub issues not connected"), and carry on.

**Hard stop.** No design, plan or code in the same turn. No commit, push or pull request unless
asked.

## Rules

- Open a goal only when a person typed `open`.
- Plain words; gloss gate, holder and deputy the first time.
- The run-log row carries the new `goal` id and `result: "stopped-at-gate"` (or `proposed` when the
  person did not say yes).
