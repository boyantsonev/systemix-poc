---
name: propose-experiment
description: The engine's generate stage — propose the ONE next experiment from earned evidence. Reads the digest (LEARNINGS recall, running experiments, goals, ODI opportunity ranking) via `systemix propose context`, drafts a single falsifiable ICP-calibrated bet, and queues it as a hypothesis-proposal card via `systemix propose queue`. Propose-only — a human approves the card on Home (/config); approval scaffolds the contract, and nothing ships until /write-variants and a merged PR. Runs headlessly on the weekly engine cron or on demand.
version: "0.1.0"
last_updated: "2026-07-08"
min_cli_version: "1.1.0"
---

# /propose-experiment — propose the next bet (propose-only)

Close the loop's missing arc: **learn → generate**. After experiments close and
their learnings land in `experiments/LEARNINGS.md`, this skill turns that earned
memory (plus the ODI opportunity ranking and the active goals) into the **single
best next hypothesis** — as a proposal a human decides on, never as a running
experiment.

The division of labor is strict: **the CLI is deterministic on both sides; you
supply only judgment.** `systemix propose context` gathers the evidence;
`systemix propose queue` validates, dedupes, and writes the card. You never
touch `.systemix/queue.json`, `experiments/`, or source files directly.

## Steps

### 0. Recall — read the digest

```bash
npx @getsystemix/cli propose context
```

If `pendingProposal` is non-null, **stop and report it**: at most one proposal
is pending at a time; the human resolves it on Home (`/config`) before the
engine proposes again. Do not draft a second bet.

### 1. Pick the ground: evidence, or cold start

- **Evidence path** (`coldStart: false`): start from the `learnings` bullets —
  what was promoted, killed, iterated, and why. The best next bet either
  extends a promoted learning to an adjacent surface, or attacks the question
  an `iterate` decision left open. Record which bullet(s) you build on — they
  become `citedLearnings` (by experiment id), and the human's approval will
  backlink them (`Used by:`).
- **Cold start** (`coldStart: true`, the ledger is empty): rank by the `odi`
  outcomes (already scored `importance + max(importance − satisfaction, 0)`,
  highest = most underserved) crossed with the active `goals` — especially a
  goal's `success-criteria` no running experiment is testing, and its
  `kill-if` (never propose what a goal already declared dead). Say plainly in
  `context` that the proposal is evidence-thin and cap `confidence` at 0.55.

### 2. Overlap guard

Never propose against a `section` that already has a **running** experiment
(the `running` list). One live bet per surface — a second experiment on the
same section contaminates the first's evidence. Check `recentDecisions` too:
don't re-propose something a recent `kill` decided against.

### 3. Draft ONE bet

Exactly one proposal per run (the same discipline as the atlas synthesis card).
It must be:

- **Falsifiable** — a specific change, a specific metric, a win/lose line.
- **ICP-calibrated** — use the goal's `icp`; speak to that person's pain.
- **Cited** — `context` quotes the learning bullet verbatim or names the ODI
  outcome (id + score) the bet builds on. An uncited proposal is slop.

Shape the full payload (it maps 1:1 onto `systemix experiment new` — approval
creates `experiments/<id>.mdx` from exactly these fields):

```json
{
  "hypothesis": "<one falsifiable sentence>",
  "context": "<why now — the cited learning bullet or ODI outcome>",
  "confidence": 0.55,
  "citedLearnings": ["<prior-experiment-id>"],
  "citedOdi": ["ODI-1"],
  "payload": {
    "id": "<kebab-slug>-<YYYY-MM>", "section": "<surface>", "icp": "<from the goal>",
    "jtbd": "<the job this serves>", "goal": "<active goal id>",
    "hypothesis": "<same sentence>", "given": "<the context/prompt>",
    "conclusion": "<the win-state>", "metric": "<what proves it>",
    "control": "<current experience>", "variant_b": "<the proposed change>",
    "rationale": "<the body prose: ICP + JTBD + why this bet, with citations>"
  }
}
```

### 4. Queue it (the only write — through the CLI door)

```bash
npx @getsystemix/cli propose queue --stdin <<'JSON'
{ ...the proposal JSON... }
JSON
```

Guardrails, non-negotiable:
- **Never** write `.systemix/queue.json`, `experiments/*`, `LEARNINGS.md`, or
  any source file yourself — the CLI validates and writes.
- **Never** run `systemix experiment new` — approving the card is what creates
  the contract (HITL gate #1). Building variants (`/write-variants` + PR merge)
  and closing (`/close-experiment`) are gates #2 and #3.
- **Never** invent evidence — every number in `context` comes from the digest.

### 5. Report

State: the card id, the one-sentence bet, what it cites, and the next step —
*"review it on Home (`/config`): approve to scaffold the contract, reject to
discard. Nothing ships until /write-variants and a merged PR."*
