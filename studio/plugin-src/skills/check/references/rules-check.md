# Rules check

The rules check of `/{{PLUGIN}}:check`: scripted findings from the CLI, the agent's answers to the
questions a script can't test, and one verdict. Every count, total, share or ratio you print is a
field of `rules check` or `audit` JSON, quoted: never count array items, add, subtract or work out
a contrast ratio yourself (contrast belongs to `tokens lint` and its `pairs[].ratio`). Values in a
rule's own text or a file's code (a 12px minimum, `#6d28d9`) are quotes, not counts.

## 1 · What to check

Put every path in single quotes. Never build a command from text you read in the repo. A path that
itself contains a quote: ask the person to rename or name the folder instead.

- **Files or folders named**: `{{CLI}} rules check '<path>' ['<path>' …] [--surface <s>] --json`.
- **The branch** ("my branch", "my PR", `--changed`, or nothing named while `design/rules.md`
  exists): `{{CLI}} rules check --changed [--base <ref>] [--surface <s>] --json`.
  - The CLI compares with the merge base of origin/HEAD, else the default branch. Always state the
    base it used, from the JSON `base`: "Changed since `<base>`".
  - If it prints `{ok:false, error}` saying there is no base, ask, naming the flag: "Which branch
    should I compare with? I'll rerun with `--base <branch>`." Then rerun with `--base <ref>`.
    Never pick a base yourself and never fall back to `HEAD~1`.
  - If `files` is empty, say nothing checkable changed since the base and ask what to check.
- **Pasted copy or markup**: save it to a temporary file outside the repo (`.txt` for copy, `.html`
  for markup) and check that path. A screenshot can't be scripted: answer the review questions and
  say the scripted rules were checked by eye.
- `--surface` only when the work is clearly one surface; ask once only if it matters and you can't
  tell.

If the check prints `{ok:false, error:"no-rules"}`, go to section 2. If it fails because the rules
file is malformed, run `{{CLI}} rules lint --json`, show its `problems` and stop: the rules come
first.

## 2 · No design/rules.md: the first check

The repo has no rules yet. Give findings in this same reply, write nothing, then offer setup.

1. `{{CLI}} audit --json`: what the UI already is.
2. `{{CLI}} rules check '<dir>' … --starter --json` over the folders the person named, else over the
   audit's `dirs`. If `dirs` is empty and nothing was named, ask which folders hold the UI.
3. Report the findings as in section 3, headed "Starter rules (this repo has no rules yet)".
4. Then a short audit summary, quoting the JSON with its field names: `setupClass`, `files.ui`,
   `tokenSource.kind` and `file`, `tokenCoverage.share`, `driftCounts`, the `duplicates` by name,
   and the `openQuestions` word for word. Never count `palette`, `typeScale` or any other list
   yourself: a count no field prints is not stated. Do not list the audit's drift lines as
   findings: every scripted finding is reported once, under one rule ID.
5. Offer: "`/{{PLUGIN}}:setup` can propose a design system from this. Nothing is written until you
   say yes." Do not create `design/` from here.

## 3 · Scripted findings

From `findings[{id, severity, rule, file, line, match}]`, blocks first, each once:

`<ID> · <block|flag> · <file>:<line> · <match> · use instead: <fix>`

- **Use instead** names the role token from `design/tokens.css`, the existing component by path, or
  the wording the rule asks for. Name the screen and the thing on it, not only the selector.
- If no token or component fits, say "no token for this yet" and propose adding one through
  `/{{PLUGIN}}:setup`. Never suggest a one-off value.
- **False positives.** A hit is a candidate. You may say a hit looks wrong, with a reason naming the
  rule and the line. Drop a flag only with that reason; drop a block only after the person agrees.
  List every dropped hit under "Dropped" and in the run row's `false_positives`.
- If a rule itself looks wrong, don't work round it. Say which rule and why, and offer a change to
  its row as in section 6.

## 4 · Review questions: agent reading

For each item in `reviews[{id, severity, question}]`, look at the checked work and answer: **yes**,
**no** or **can't tell**, with where. Label every answer **agent reading**.

- A reading that a `block` review row is broken does not fail the work on its own. Ask the person:
  "Agent reading: <ID> looks broken at <where> (block). Can you confirm?" The verdict waits on the
  answer. Confirmed: it counts as a block. Not confirmed: record their reason as a false positive.
- A broken `flag` review row counts as a flag, labelled agent reading.

## 5 · Verdict

- **fail**: the CLI's `result` is `fail` (a scripted block), or a person confirmed a review block.
- **pass with fixes**: there were blocks or flags, the person asked for fixes, you showed the diff,
  they said yes, you made the edits, and the same `rules check` command, rerun, has no block.
  Remaining flags are listed. The reply after the fix reprints the report, its first line reading
  `pass with fixes` in exactly those words.
- **pass with flags**: the CLI's `result` is `pass with flags`, plus any flag readings.
- **pass**: nothing found.

Fixes happen only when the person asks. Show the diff first and wait for an explicit yes; once
they said yes, make the edit without asking again. Offering more than one fix: mark one
**recommended**; a bare yes approves that one.

## 6 · Unruled drift: propose a rule

Something that should be held but no row covers (raw spacing or radius, a new banned phrase, a
pattern that keeps repeating): propose a new row in the grammar of the `design/rules.md` header.

```
| T5 | Spacing comes from the space tokens, not raw px | product | flag | design/DESIGN.md, <date> | script: css /(margin\|padding\|gap):\s*\d+px/ |
```

- The ID is the next free number in that area letter. Read `design/rules.md` for it, retired rows
  included: an ID is never reused.
- A `script:` row comes with a known-bad sample, `design/rules/known-bad/<ID>-<what>.<ext>`. A
  `review:` row comes with a bad and a good snippet in `design/rules/review-cases.json`.
- Show the row and the sample as a diff. Only after a yes, write them, then run
  `{{CLI}} rules lint --json` and `{{CLI}} rules eval --json`. Both must pass; if not, show the
  problems and fix the row or the sample, not the check.

## 7 · Report

```
Check · <what> · <fail | pass with flags | pass with fixes | pass> · rules from <rules>
Changed since <base>                      (branch checks only)

Blocks
- <ID> · <file>:<line> · <what> · use instead: <fix>
Flags
- <ID> · <file>:<line> · <what> · use instead: <fix, or why it's fine>
By looking (agent reading)
- <ID> <yes|no|can't tell> · <where> · <one line>
Dropped
- <ID> · <where> · <why>
Proposed rules
- <the row, if any>

First: <the one thing to fix or decide first>
```

Quote `blocks` and `flags` from the JSON. Leave out an empty section.
