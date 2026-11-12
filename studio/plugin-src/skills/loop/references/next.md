# Next: the coding agent's steps, up to the next person

Goal: the rest of the command. Empty means the one goal that waits on nobody. Several: list them
and ask.

`next` does the coding agent's part of the current step, and the steps after it, until a gate, a
person's step or the world is needed. Then it stops.

## 1 · Where is it

Run `{{CLI}} loops status --json` and find the goal.

- `waitsOn` is set: **stop**. Say who it waits on (role, holder, deputy), at which gate, and the
  `/{{PLUGIN}}:loop gate` lines. Never clear a gate yourself.
- The goal is shipped or dropped: say so and stop.

Read the goal's `goal.md`, `evals.md` and `decisions.md`, then the step in
`design/loops/product-loop.md` or `design/loops/build-loop.md`: what it does, who runs it, its gate,
what it reads and writes. Read the rules that apply with `{{CLI}} rules list --surface <surface> --json`.

## 2 · Run until a person is needed

For each step:

1. Do the coding agent's part (the playbook below; a step with no row: do what its text says).
2. Show what you will write as a file list or diff. Wait for an explicit yes. Then write it.
3. Move on by who runs the step:
   - **The coding agent alone, no gate**: after the yes, set the goal's `step:` in `goal.md` to
     the next step (it is in the file list you showed) and go on.
   - **A gate**: stop. For an approve or decide gate, offer the brief
     (`/{{PLUGIN}}:loop decide G-NNN`). Give the gate lines.
   - **A person with the coding agent** (for example build.code, held by engineering-lead unless
     the roster says otherwise): prepare what they need and help in the session. The step moves
     only after their "it holds" is recorded as a decision line:
     `{{CLI}} loops gate G-NNN approve --by "<their name>" --note "it holds" --brief none --json`,
     after you showed the line and they said yes.
   - **The world** (testers, a store review, a release window): say what is awaited and stop.

Run `{{CLI}} loops check --json` before every stop. It must print `ok: true`.

## 3 · Playbook

| Step | The coding agent's part |
|---|---|
| product.design | Explore **2 to 3 variants in real code** on a draft branch, each built from the rules and tokens. Check each with `{{CLI}} rules check <its files> --json` and quote the verdict. Render the tokens with `{{CLI}} preview --json` (see `{{ROOT}}/skills/shared/preview.md`) and point to each variant. **At most 3 rounds.** Then stop at the gate: **a person picks** a variant, or none. |
| product.validate | The brief for the decide gate (`decide`). |
| build.plan | `plan.md` in the goal's folder: steps that each end working, which eval each closes, what the system must change, "Decisions for you". Then its gate. |
| build.code | With its holder: a draft branch from the latest default branch, one concern per commit, built against the rules. Never merge. |
| build.test | The project's own tests, then `{{CLI}} rules check --changed --json`. Mark each eval answered here pass or fail in `evals.md`. A failing eval goes back to build.code. |
| build.review | The pull request description and answers to review comments, when a person asks. A person merges. |
| build.ship | Release notes and the evals scorecard, and the brief. A person ships and tags. |
| build.measure | See below. |
| product.learn | See below. |

**build.measure.** Same definitions every time.

1. Run `{{CLI}} evidence check --json`. Not `connected`: the analytics part is **not measured**.
   Say "not measured" and why, never a guess. Connecting a source is optional:
   `{{ROOT}}/skills/setup/references/analytics.md`.
2. Connected: the **event name equals the metric's name** in `evals.md`, and **every capture is
   tagged `variant`**. The capture code comes from the analytics vendor's own skill. Read numbers
   only from the connected source, each with its date range.
3. Draft one entry for `design/evaluations.md`: date, goal, each eval with its result or "not
   measured", the source of each number. Mark `evals.md`. Show both, wait for a yes, then write.

**product.learn.** One learning, written only after a ruling.

1. Draft one learning: one sentence (300 characters or fewer), confidence (high, medium or low),
   a review-by date, and its source (the goal id and the `design/evaluations.md` entry).
2. Draft at most **one** next-goal sentence. Propose it; **never open it**.
3. Show both. The step's holder rules: their "it holds" is recorded with `loops gate` (step 2
   above). Nothing goes into the ledger before that line exists.
4. After the line, and with a yes, strip `"`, `$` and backticks from the text and write it:
   `{{CLI}} learnings add --text "<sentence>" --confidence high --review-by YYYY-MM-DD --source "G-NNN, design/evaluations.md" --json`
   (the person's confidence in place of `high`). It prints `{id, line}`.
5. For each learning this goal built on (the `L-NNN` ids in its `goal.md`):
   `{{CLI}} learnings used L-NNN --by G-NNN --json`.

## Rules

- Never rule. Approving, deciding, merging, tagging, publishing and flipping a loop to agreed are a
  person's.
- Drafts need no merge. Push or open a pull request only when asked.
- Stay inside the approved goal. If the work shows the goal or an eval is wrong, stop and say so:
  the fix is a rework at the gate or a new goal.
- Stop with the four-line report from the SKILL.md.
