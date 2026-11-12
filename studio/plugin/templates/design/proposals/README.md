# Proposals: how the studio asks to improve itself

Each file here is one improvement the studio's admin run proposes from evidence: runs in the run
log (`design/.studio/runs.jsonl`) or a failing eval. A proposal changes nothing on its own. A
person named in `design/loops/roster.md` rules on it, and only then is anything applied.

## The file

`P-NNN-<slug>.md`, where the slug is two to four lowercase words joined by `-`.

```markdown
---
id: P-NNN
title: <one line>
target: client
kind: rule-fix
evidence: [<run ids or eval names, at least one>]
status: New
decided_by: null
decided_at: null
evals_before: null
evals_after: null
created: YYYY-MM-DD
---
## Problem
One paragraph: what happened, with the counts from the digest.

## Change
For a `client` target: a fenced `diff` block holding a unified diff against this repo's files.
For a `plugin` target: the change in words, with no diff.

## How it will be checked
The admin eval check or eval case that shows the change worked.
```

- `target`: `client` changes this repo's `design/` data. `plugin` changes the studio's own skills,
  triggers or scan; it is never applied here and becomes an upstream issue draft instead.
- `kind`: `wording`, `trigger`, `rule-fix`, `new-rule`, `new-eval` or `bug`.
- `status`: `New` → `Approved` or `Declined`; an approved client proposal then becomes `Shipped`,
  or `Failed` when applying it broke a check that passed before (the change is reverted).

## The commands

- `proposals lint`: every file well formed. `admin eval` runs it.
- `proposals list [--status s]` and `proposals next-id`.
- `proposals decide P-NNN approve|decline --by "<name>" [--why "…"]`: a holder or deputy in the
  roster rules. A decline needs the why. Approving a plugin proposal prints the issue draft
  (counts and ids, no paths, no notes); nothing is filed without a person's yes.
- `proposals apply P-NNN`: an approved client proposal. It runs `admin eval`, applies the diff with
  `git apply`, runs `admin eval` again, and reverts and marks `Failed` on any regression.

At most 3 proposals are written per admin run, each with at least one piece of evidence. No
evidence, no proposal. The thresholds, the cap and the rating frequency are not configurable here;
changing them is itself a plugin proposal.
