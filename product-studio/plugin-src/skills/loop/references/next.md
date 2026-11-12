# Next: the coding agent's steps, up to the next person

Goal: the rest of the command. Empty means the one goal that waits on nobody. Several: list them
and ask.

`next` does the coding agent's part of the current step, and the steps after it, until a gate, a
person's step or the world is needed. Then it stops.

## 1 · Where is it

Run `{{CLI}} loops status --json` and find the goal.

- `waitsOn` is set: **stop**. Say who it waits on (role, holder, deputy), at which gate, and the
  `/{{PLUGIN}}:loop gate` lines. Never clear a gate yourself.
  - Except when the step is the coding agent's (`runs: agent`) and its output is missing, so the
    gate has nothing to rule on (build.plan with no `plan.md`): do that work first, as in section 2
    (show it, and after the yes write it), then stop at the gate.
- The goal is shipped or dropped: say so and stop.

Read the goal's `goal.md`, `evals.md` and `decisions.md`, then the step in
`studio/loops/product-loop.md` or `studio/loops/build-loop.md`: what it does, who runs it, its gate,
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
| product.design | Explore **2 to 3 variants in real code** on a draft branch, each built from the rules and tokens. See below. **At most 3 rounds.** Then stop at the gate: **a person picks** a variant, or none. |
| product.validate | The brief for the decide gate (`decide`). |
| build.plan | `plan.md` in the goal's folder: steps that each end working, which eval each closes, what the system must change, "Decisions for you". Then its gate. |
| build.code | With its holder: a draft branch from the latest default branch, one concern per commit, built against the rules. Never merge. |
| build.test | The project's own tests, then `{{CLI}} rules check --changed --json`. Mark each eval answered here pass or fail in `evals.md`. A failing eval goes back to build.code. |
| build.review | The pull request description and answers to review comments, when a person asks. A person merges. |
| build.ship | Release notes and the evals scorecard, and the brief. A person ships and tags. |
| build.measure | See below. |
| product.learn | See below. |

**product.design.** One round, one yes:

1. Show the plan: each variant in a line, its **full file list** (shared files included: a file
   two variants use is in both lists), the draft branch name, and the `step:` move. A missing
   fact (a price, a label) or a missing component: one question, with your **recommended** answer
   that the yes approves (for a fact, a visible `TODO` placeholder in the draft).
2. After the yes, write it all on the draft branch, then check each variant over every file it
   touches: `{{CLI}} rules check <its files> --json`. Quote each run's `result`, `blocks` and
   `flags`; never skip a file.
3. Run `{{CLI}} preview --json` (`{{ROOT}}/skills/shared/preview.md`) and give the **preview**
   path it printed for the tokens; the page doesn't show the variants, so name each by its files.
4. Stop at the gate in this same reply, with the gate lines. Never pick a variant.

**build.measure.** Same definitions every time.

1. Run `{{CLI}} evidence check --json`. Not `connected`: the analytics part is **not measured**.
   Say "not measured" and why, never a guess. Connecting a source is optional:
   `{{ROOT}}/skills/setup/references/analytics.md`.
2. Connected: the **event name equals the metric's name** in `evals.md`, and **every capture is
   tagged `variant`**. The capture code comes from the analytics vendor's own skill. Read numbers
   only from the connected source, each with its date range.
3. Draft one entry for `studio/evaluations.md`: date, goal, each eval with its result or "not
   measured", the source of each number. Mark `evals.md`. Show both as a diff, wait for a yes,
   then write. Not connected: this dated "not measured" entry is the **recommended** write, even
   when an older entry says the same; the goal stays at build.measure (moving on unmeasured is the
   person's call, a separate yes). Quote bars and kill-if lines with their file (`goal.md`).
4. Connectors, per `{{ROOT}}/skills/shared/connectors.md`: the analytics tools in step 2 when the
   session has them, and after the write the measurement page from
   `{{CLI}} connectors page measurement G-NNN --json`. Not connected: one line, and carry on.

**product.learn.** One learning. The step has no gate and no person's role, so no decision line
is written: the person's yes is a yes to a write, not a gate ruling.

1. Draft one learning: one sentence (300 characters or fewer), confidence (high, medium or low),
   a review-by date, and its source (the goal id and the `studio/evaluations.md` entry).
2. Draft at most **one** next-goal sentence. Propose it; **never open it**.
3. Show both and ask: "Add this learning? (yes / change something)". When the person answers
   with a change or a detail (a confidence, "it holds"), show the final bullet with it and ask once
   more; write on an explicit yes.
4. After the yes, strip `"`, `$` and backticks from the text and write it:
   `{{CLI}} learnings add --text "<sentence>" --confidence high --review-by YYYY-MM-DD --source "G-NNN, studio/evaluations.md" --json`
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
