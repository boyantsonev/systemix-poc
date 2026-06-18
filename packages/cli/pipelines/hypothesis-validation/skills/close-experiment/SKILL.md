---
name: close-experiment
description: Close a running experiment — record the result + decision in experiments/<id>.mdx, append the learning to experiments/LEARNINGS.md (the Memory ledger), and queue a HITL decision card in .systemix/queue.json. File-first (engine = Claude Code); no external service required. Use when PostHog evidence is decision-ready.
disable-model-invocation: false
argument-hint: <experiment-id>
version: "0.3.0"
last_updated: "2026-06-17"
min_cli_version: "1.1.0"
---

# Close Experiment: $ARGUMENTS

## Purpose

Record the outcome of a running experiment and **write the learning back into the
loop's memory**. This closes the loop: PostHog evidence → decision →
`experiments/LEARNINGS.md` → the next iteration starts from evidence. File-first —
read and write `experiments/` directly.

## Steps

### Step 1 — Load the experiment
Read `experiments/<id>.mdx` (the `<id>` from `$ARGUMENTS`). Show the
assumption/hypothesis, the variants, and the current evidence in its frontmatter.

### Step 2 — Read the evidence
Using the experiment's `posthog-event` / `metric` (wired by `/measure`), fetch the
latest data via the PostHog MCP. Compute:
- Total samples; per-variant counts and % share
- Leading variant and lift over control (%)
- Confidence: ≥20% lift AND ≥100 samples → `high` (0.85); 5–20% → `medium` (0.6);
  below 5% → `low` (0.3)

### Step 3 — Determine the decision
| Evidence | Decision |
|---|---|
| High confidence, variant beats control | `promote` |
| Medium confidence, positive direction | `iterate` |
| Low confidence / no clear winner | `iterate` or `no-action` |
| Variant worse than control, high confidence | `kill` |

Ask the user to confirm: "Recommended: `<decision>`. Confirm or override?"

### Step 4 — Write the result into the experiment
Edit the frontmatter of `experiments/<id>.mdx`:
- `status: complete`
- `result: "<one-line result summary>"`
- `decision: <decision>`
- `confidence: <0.0–1.0>`
- `review-by: <today + 90 days, YYYY-MM-DD>`

### Step 5 — Capture the learning in LEARNINGS.md  ← the point of the loop
Append one bullet to the **`## Memory`** section of `experiments/LEARNINGS.md`, newest
first (replace the `*No entries yet.*` placeholder on the first write). Use exactly
this format so the ledger stays machine-readable:

```
- **<YYYY-MM-DD> · <short title>** — confidence <c> · from [<id>], decision: <decision>. <one-sentence reason>. Review by: <YYYY-MM-DD>. Used by: —
```

Every entry MUST cite the experiment `[<id>]` (provenance) and carry a review-by date.

### Step 6 — Queue the decision for review (HITL)
Append a card to the `cards` array in `.systemix/queue.json` (create the file as
`{ "cards": [] }` if absent; never clobber existing cards):

```json
{
  "id": "decision-<id>-<timestamp>",
  "type": "decision",
  "experimentId": "<id>",
  "decision": "<decision>",
  "confidence": <c>,
  "summary": "<result summary>",
  "status": "pending",
  "requestedAt": "<ISO timestamp>"
}
```

### Step 7 — Recommend the next action
- `promote`: apply the winning variant to source (`/write-variants <id>` → apply); archive the loser.
- `iterate`: `/write-variants <id>` for a stronger variant; re-run.
- `kill`: archive; revisit the ICP/section, maybe `/init-experiment` with a new framing.
- `no-action`: monitor; `/growth-audit <id>` in 7 days.

> **Autonomy:** writing the result + the Memory entry follows the dial in
> `systemix.config.yaml` — ghost = propose via the queue card only; assisted /
> autonomous = write + log. The decision card always lands in the queue as the
> human record. (Self-modifying skills/guardrails is a separate, always-HITL path —
> see `/hermes`.)
