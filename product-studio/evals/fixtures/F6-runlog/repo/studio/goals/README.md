# Goals: the grammar of a goal folder

One folder per goal: `studio/goals/G-NNN-<slug>/`. Numbers are global and never reused.

- `goal.md`: frontmatter `id, title, status, step, opened`; sections Success criteria, Kill if, Context.
- `evals.md`: five to twelve evals, one table row each (id, must be true, checked by, bar, answered at, status).
- `decisions.md`: append-only, one line per ruling:
  `- <YYYY-MM-DD> · <gate> · <approve|rework|drop> · by <name> · brief: <B-NNN|none>[ · note: …]`
- `plan.md` from build.plan on.

`step` is `<loop>.<step>`, where the goal is now. Only a person's ruling moves it past a gate.
