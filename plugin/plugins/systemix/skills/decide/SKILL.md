---
name: decide
description: Prepare a decision brief for a gate so whoever holds the role this week — or the deputy — decides from the same facts and asks the questions the absent expert would have asked. Writes design/briefs/B-NNN-<slug>.md; never decides.
argument-hint: <loop.step | "question"> [--as deputy]
---

For: **$ARGUMENTS**

1. Find the gate: loop.step → the step's gate (act, lead, with, needs or the act's default, context). A free-text question: ask which role owns it (the roster's domains), and use that role's packs.
2. Who decides today: the role's holder, or the deputy if an `away:` range covers today. Say so in the header.
3. Read in order: the gate's context packs; `node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" loops decisions` for earlier rulings touching the same files or words; `experiments/LEARNINGS.md`; the step's `reads:`; the latest row of `design/evaluations.md` when the domain is product or tech.
4. Write the brief with the grammar in `design/briefs/README.md`: the question, options (what each costs and risks), evidence (each with its source), one recommendation (reversible: yes or no, and how), what the role would ask (each answered or marked *open*), and an empty Decision.
5. Print the path and the decision line to paste once ruled.

Rules: never decide (if asked to "just decide", write the brief and say which option you would take — it is not a decision until a role signs the line). Nothing unsourced. The expert's questions are not optional — if the pack has none, add them there first. Write one for every approve and decide gate; for review only when the reviewer is a deputy.
