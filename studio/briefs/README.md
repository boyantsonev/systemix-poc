# Briefs: the grammar of a decision brief

One file per brief: `studio/briefs/B-NNN-<slug>.md`, written by the coding agent before a gate or
for a free question, so whoever rules (the holder, or the deputy while the holder is away) decides
from the same facts and the questions the absent expert would ask. A brief never decides; it names
who rules. Numbers are global and never reused. `loops check` validates the frontmatter and
sections below.

```markdown
---
id: B-001
goal: G-001
gate: product.evals
role: reviewer
rules: <name>
context: [product, design]
date: YYYY-MM-DD
---
# The question, as a title
## Question
## Options
## What we already know
## Sources
## Who rules
```

- `goal` is the goal's id, or `question` for a free question; `gate` is the step ruled on, or
  `question`.
- `role` is the gate's role in the roster; `rules` is the holder, or `<name> as deputy`.
- `context` lists the context packs read.
- **Options**: two or three, each with what it costs, what it risks and whether it can be undone.
- **Sources**: every file and command read, and anything that couldn't be read.
- **Who rules**: the name and role, the expert's questions (answered or open), the option the
  coding agent would take, labelled recommendation, and an empty decision left for the person.
