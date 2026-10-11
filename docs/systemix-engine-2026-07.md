# The Systemix Engine — the self-driving loop (2026-07)

## 1. Thesis

Systemix's loop is only a loop if it closes. Until now it automated
**measure → synthesize → learn up to the human close** (daily evidence crons +
the Ralph runner queueing close-proposal cards) but the **learn → generate →
hypothesis → build arc was manual**: a human framed every next bet, a human
wrote every variant. The engine closes the arc:

```
generate → build → measure → synthesize → learn → generate → …
```

**Engine = Claude Code on a GitHub Actions spine.** No external service, no
local model, no subscription infrastructure — the repo runs its own growth
loop, and `npx @getsystemix/cli init` vendors the same engine into any repo. This is
what the $249 AI Kit *is*: not a folder of skills, but a growth loop that runs
itself in your repo and proposes your next bet every week.

The invariant at every stage: **the engine proposes, a human decides.**

## 2. Stage map

| Stage | Kind | Cadence | Entry point | Reads | Writes |
|---|---|---|---|---|---|
| **Generate** | LLM (judgment) + deterministic CLI (I/O) | weekly Mon 06:00 UTC (`systemix-engine.yml`) | `/propose-experiment` → `systemix propose context` / `propose queue` | `experiments/LEARNINGS.md`, `experiments/*.mdx`, `experiments/goals/`, `docs/product/jobs.yaml` (ODI), `.systemix/queue.json` | ONE `hypothesis-proposal` card → `.systemix/queue.json` |
| **Hypothesis** (approve) | human | on demand (Home `/config`) | app `PATCH /api/queue` | the card payload | `experiments/<id>.mdx` via `createExperiment` + `Used by:` backlinks via `markLearningUsed` |
| **Build** | LLM + human merge | increment 2 (see §5) | `/write-variants` + `/measure` | the contract | source variants + instrumentation, as a **draft PR** |
| **Evidence pull** | deterministic | daily 07:00 UTC (`systemix-evidence.yml`) | `systemix evidence … pull` | PostHog HogQL | `evidence-posthog` frontmatter blocks |
| **Advance / synthesize** | deterministic | daily 07:30 UTC (`systemix-loop.yml`) | `systemix loop` (Ralph sweep) | fresh evidence, `hermes.thresholds` | `close-proposal` cards |
| **Close** | human | on demand | `/close-experiment`, `systemix experiment close`, or the app card | the evidence | `status: complete`, result/decision/confidence |
| **Learn** | deterministic side-effect of the close | with the close | `appendLearning` (3 byte-identical writers) | — | the memory bullet in `experiments/LEARNINGS.md` |

The division inside the generate stage is strict: **the LLM supplies judgment
only.** `systemix propose context` (deterministic, read-only) assembles the
digest; the model picks and drafts ONE bet; `systemix propose queue`
(deterministic) validates, dedupes, and atomically writes the card. The model
never touches `queue.json`, `experiments/`, or source files. In CI this is
enforced, not just prompted: the workflow's `--allowedTools` grants only
`Bash(… propose:*)` + read tools.

## 3. The hypothesis-proposal card

```json
{
  "id": "hypothesis-proposal-<payload.id>-<ts>",
  "type": "hypothesis-proposal",
  "experimentId": "<payload.id>",
  "goal": "<active goal id>",
  "hypothesis": "<one falsifiable sentence>",
  "context": "<why now — cites a learning bullet verbatim or an ODI outcome>",
  "confidence": 0.55,
  "citedLearnings": ["<prior-experiment-id>"],
  "citedOdi": ["ODI-1"],
  "payload": { "…": "maps 1:1 onto `systemix experiment new` fields" },
  "proposedBy": "engine-propose",
  "status": "pending"
}
```

Lifecycle:

- **pending** — queued by the engine. **At most ONE pending proposal globally**
  (`pushHypothesisProposal` dedupes; the skill stops if one exists). This caps
  PR noise and keeps the queue a decision surface, not a backlog.
- **approved** (Home → `PATCH /api/queue`) — `createExperiment(payload.id,
  payload)` scaffolds `experiments/<id>.mdx` (`status: running`), and each
  `citedLearnings` entry gets its `Used by:` backlink flipped. Approval creates
  the **contract only** — the loop runner will correctly report
  `blocked:not-measured` until `/write-variants` + `/measure` run. Guarded by
  `assertWriteAllowed({ artifact: "hypothesis", humanApproved: true })`.
- **rejected / deferred** — status flip only; nothing is created. The next
  weekly run may propose again (a rejected id is not blocked, but the digest
  shows `recentDecisions` so the skill won't re-pitch a fresh kill).

Citation discipline: `context` is **required** and must cite a learning bullet
or an ODI outcome — the CLI rejects uncited proposals. An uncited proposal is
slop by definition.

## 4. HITL gates × the autonomy dial

Three gates, absolute at every tier:

1. **Hypothesis approval** — the card on Home. Ghost/assisted/autonomous all
   stop here today.
2. **PR merge** — variants + instrumentation ship only through a human-merged
   PR.
3. **Close** — no code path closes an experiment autonomously; the learn write
   is chained to the human close.

What the dial (ghost → assisted → autonomous, `trust.hermes_tier`) may relax
later is the *volume* of low-risk writes between the gates (e.g. auto-applying
instrumentation), **never the gates themselves**. Self-modification (skills,
guardrails, workflows) stays always-HITL per the write-policy, even at
autonomous.

## 5. Increment 2 — the build stage (designed, not built)

When a `hypothesis-proposal` card is **approved and merged to main**, a second
workflow (`systemix-build.yml`, future) can:

1. Trigger on push to main when `experiments/*.mdx` gains a new running
   contract with empty variants (or on `workflow_dispatch <id>`).
2. Run `claude-code-action` with `/write-variants <id>` then `/measure <id>` —
   the skills already encode the ICP calibration and the instrumentation
   pattern; the containment story is the same (allowlist scoped to the repo's
   source dirs + the CLI).
3. Open a **draft PR** via the same `create-pull-request` pattern (branch
   `systemix/engine-build-<id>`); the human merge is gate #2.

Out of the walking skeleton deliberately: variant code touches product source,
so it deserves its own containment review (which paths the action may edit,
how `write-policy` maps to file globs) before an LLM writes it on a schedule.

## 6. Cold start

While `LEARNINGS.md` is empty (`coldStart: true` in the digest), the skill
falls back to **ODI ranking × goal gaps**: the top underserved outcomes from
`docs/product/jobs.yaml` (score recomputed as
`importance + max(importance − satisfaction, 0)`, never trusted from the file)
crossed with active goals' `success-criteria` no running experiment tests —
minus anything a goal's `kill-if` already declared dead. Cold-start proposals
must say they are evidence-thin and cap `confidence` at 0.55. The honest
failure mode is a low-confidence card, not a confident guess.

## 7. The kit story

`npx @getsystemix/cli init` now vendors the full engine:

- `.claude/skills/propose-experiment/` (via the hypothesis-validation
  manifest) — plus the rest of the loop skills, as before.
- `.github/workflows/systemix-engine.yml` (from `templates/github/`) — the
  weekly propose cron, skip-if-present.
- The per-instance `CLAUDE.md` block — including **"Recall before building"**:
  every agent session in the repo recalls `experiment learnings --recent 5`
  before product changes, cites learning ids in PRs, and backlinks with
  `experiment used`. This is how the loop's memory feeds the *development*
  workflow, not just the growth loop.

Buyer requirements (documented in the init summary): GitHub Actions enabled +
two secret sets — `POSTHOG_API_KEY`/`POSTHOG_PROJECT_ID` (evidence) and
`ANTHROPIC_API_KEY` (the weekly LLM stage). Missing secrets = graceful skip,
never a red build. Cost: one short model run per week over a compact digest —
cents, capped by `--max-turns 15`.

Why this makes the $249 buy legible: "skills + artifacts" is a folder;
**"a scheduled engine that reads your evidence, proposes your next experiment
weekly, and never ships without your approval" is a product.**

## 8. Known debt (deliberately untouched here)

- **Two-queue split** — the engine uses `.systemix/queue.json` `{cards}` (the
  app's real surface). The MCP `hitl-queue.json` `{tasks}` path (used only by
  the not-yet-generated atlas workflow) remains separate; unify later.
- **Two `evidence-posthog` shapes** — the loop's per-variant block vs
  `evidence experiment pull`'s visitors/rate funnel. Known follow-up.
- **Dormant local scheduler** (`packages/cli/src/scheduler/`,
  `commands/schedule.js`) — crontab machinery with every write TODO-gated.
  GitHub Actions won the spine; recommend deleting the scheduler in its own PR.
- **Atlas overlap** — `/propose-experiment` is the single-agent form of the
  atlas workflow's Audit phase. Deliberate: atlas remains the future
  multi-agent variant; both funnel through the same one-card discipline.
- **`/kit` page copy** — "the engine runs on a schedule" bullet lands after
  the PR #107 rebrand merges (one line, avoids conflict).
