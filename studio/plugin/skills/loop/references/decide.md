# Decide: the brief before a ruling

What to brief: the rest of the command, a `G-NNN` or a free question.

`decide` writes `design/briefs/B-NNN-<slug>.md` so whoever rules (the holder, or the deputy while
the holder is away) decides from the same facts, with the questions the absent expert would ask.
It never decides.

## 1 · Which gate, which question

- **A goal** (`G-NNN`, or none and one goal waits): `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" loops status --json` gives the
  gate's role in `waitsOn`. The question is that gate's question for this goal ("Approve the
  evals for G-001?").
- **A free question**: find the role whose domains cover it in `design/loops/roster.md`. If two
  could own it, ask which.
- The goal waits on nobody and no question was given: say there is no gate to brief, and stop.

## 2 · Who rules

The holder of that role. If the roster marks them away today, the deputy. Name the person and say
which ("Ada Lovelace, holder" or "Grace Hopper, as deputy"). Never pick yourself.

## 3 · Gather

Follow `${CLAUDE_PLUGIN_ROOT}/skills/shared/context-pack.md` at **full** depth, with the context packs the
role's domains name. Add the rulings that touch the same files or words, from
`node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" loops decisions --json`. For a goal, read its `goal.md`, `evals.md`, `decisions.md` and,
for product or tech domains, the newest entry in `design/evaluations.md`.

## 4 · The expert's questions

Each context pack may list the questions its expert always asks. Answer each in the brief, or
mark it *open*. If the pack has none, draft three and **propose** them as a diff to that
`design/context/<pack>.md`. Write them there only after a yes. The brief still goes ahead without
them.

## 5 · Draft the brief

The id: the next free `B-NNN` after the highest in `design/briefs/`. Follow the grammar in
`design/briefs/README.md`; the frontmatter is `id`, `goal`, `gate`, `role`, `rules` (the person
who rules), `context` (the packs read) and `date`. Under a `# <question>` title the body has these
`##` headings, named exactly so (no "The options", no "Evidence"), in this order:

- **Question**: one sentence.
- **Options**: two or three, each with what it costs, what it risks, and whether it can be undone.
- **What we already know**: the context pack's block, as written there.
- **Sources**: every file, command and connector read. "Couldn't read" sources are listed too.
- **Who rules**: the name and role from step 2, the expert's questions (answered or *open*), the
  option you would take and why, labelled **recommendation**. Then an empty decision, left for
  the person, and the commands they rule with.

Nothing unsourced. A brief never says a ruling was made.

## 6 · Show, then write

Show the brief in full in this reply, every heading as written, never a summary; and the
context-pack diff from step 4 if any. Ask: **"Write B-NNN? (yes / change something)"**. After the
yes, write the brief (and the pack diff only if that was also approved). Run
`node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" loops check --json`.

## 7 · Reply

The path, who rules, and their choices:

    /product-studio:loop gate approve G-NNN [note]
    /product-studio:loop gate rework G-NNN <what>
    /product-studio:loop gate drop G-NNN <why>

A free question has no gate line: say the person records their answer as a decision in
`design/decisions/` if they want it kept.

If asked to "just decide": write the brief, say which option you would take, and say it is not a
decision until the person rules with `gate`.
