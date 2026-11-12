# Decide: the brief before a ruling

What to brief: the rest of the command, a `G-NNN` or a free question.

`decide` writes `design/briefs/B-NNN-<slug>.md` so whoever rules (the holder, or the deputy while
the holder is away) decides from the same facts, with the questions the absent expert would ask.
It never decides.

## 1 · Which gate, which question

- **A goal** (`G-NNN`, or none and one goal waits): `{{CLI}} loops status --json` gives the
  gate's role in `waitsOn`. The question is that gate's question for this goal ("Approve the
  evals for G-001?").
- **A free question**: find the role whose domains cover it in `design/loops/roster.md`. If two
  could own it, ask which.
- The goal waits on nobody and no question was given: say there is no gate to brief, and stop.

## 2 · Who rules

The holder of that role. If the roster marks them away today, the deputy. Name the person and say
which ("Ada Lovelace, holder" or "Grace Hopper, as deputy"). Never pick yourself.

## 3 · Gather

Follow `{{ROOT}}/skills/shared/context-pack.md` at **full** depth, with the context packs the
role's domains name. Add the rulings that touch the same files or words, from
`{{CLI}} loops decisions --json`. For a goal, read its `goal.md`, `evals.md`, `decisions.md` and,
for product or tech domains, the newest entry in `design/evaluations.md`.

## 4 · The expert's questions

Each context pack may list the questions its expert always asks. Answer each in the brief, or
mark it *open*. If the pack has none, draft three and **propose** them as a diff to that
`design/context/<pack>.md`. Write them there only after a yes. The brief still goes ahead without
them.

## 5 · Draft the brief

The id: the next free `B-NNN` after the highest in `design/briefs/`. Use the frontmatter and
heading order that `design/briefs/README.md` shows. The body has these sections, in this order:

- **Question**: one sentence.
- **Options**: two or three, each with what it costs, what it risks, and whether it can be undone.
- **What we already know**: the context pack's block, as written there.
- **Sources**: every file, command and connector read. "Couldn't read" sources are listed too.
- **Who rules**: the name and role from step 2, the expert's questions (answered or *open*), the
  option you would take and why, labelled **recommendation**. Then an empty decision, left for
  the person, and the commands they rule with.

Nothing unsourced. A brief never says a ruling was made.

## 6 · Show, then write

Show the brief in full, and the context-pack diff from step 4 if any. Ask: **"Write B-NNN?
(yes / change something)"**. After the yes, write the brief (and the pack diff only if that was
also approved). Run `{{CLI}} loops check --json`.

## 7 · Reply

The path, who rules, and their choices:

    /{{PLUGIN}}:loop gate approve G-NNN [note]
    /{{PLUGIN}}:loop gate rework G-NNN <what>
    /{{PLUGIN}}:loop gate drop G-NNN <why>

A free question has no gate line: say the person records their answer as a decision in
`design/decisions/` if they want it kept.

If asked to "just decide": write the brief, say which option you would take, and say it is not a
decision until the person rules with `gate`.
