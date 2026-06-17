---
name: growth-audit
description: Audit running hypothesis experiments against PostHog evidence. Reads design/decisions/ for running experiments, fetches cached evidence from component contracts, and produces a prioritized decision brief. Use weekly to close the evidence loop.
disable-model-invocation: false
argument-hint: [experiment-id]
version: "0.1.0"
last_updated: "2026-04-30"
min_cli_version: "1.1.0"
---

# Growth Audit: $ARGUMENTS

## Purpose

Cross-reference running hypothesis experiments with production evidence from PostHog. Produce an actionable brief: which experiments have enough signal to decide, which need more time, and which are stalled with no traffic.

## Steps

### Step 1 — Load running experiments

List `design/decisions/*.mdx` and keep the ones whose frontmatter has `status: running` — file-first, no MCP required. If `$ARGUMENTS` is provided, read only that experiment ID instead.

If no running experiments are found, report: "No running experiments. Use `/init-experiment` to create one." and stop.

### Step 2 — Load PostHog evidence per experiment

For each running experiment, read its `posthog-event` / `metric` fields and fetch the latest data via the PostHog MCP (segment by the `variant` property). If `posthog-event` is null, note it as "not yet instrumented — run /measure".

Summarise per experiment:
- Total renders in last 30 days
- Variant breakdown (renders + unique users per variant)
- Top pages where the component rendered

Also read the `evidence-social` field from the hypothesis contract frontmatter. If present, include social signal data alongside PostHog product data:

```
Social signals (from evidence-social):
  linkedin  2026-05-05  impressions: 2,400  clicks: 47  likes: 83  replies: 12
```

For experiments in early GTM phase (< 100 PostHog renders), social signals may be the primary evidence. Surface them prominently rather than flagging the experiment as "Insufficient".

### Step 3 — Score signal strength

For each experiment, compute a signal score:

| Renders | Signal |
|---------|--------|
| < 100   | Insufficient — too early to decide |
| 100–999 | Weak — directional only |
| 1000+   | Strong — decision-ready |

Flag any experiment that has been running > 30 days with < 100 renders as **stalled**.

### Step 4 — Produce decision brief

Output a Markdown table:

```
| ID | Hypothesis (truncated) | ICP | Renders | Signal | Recommendation |
|----|------------------------|-----|---------|--------|----------------|
| hero-vp-icp-match-2026-04 | Framing as hypothesis validation... | ops-heavy | 1,247 | Strong | Ready to close — run /close-experiment |
```

For each decision-ready experiment, provide:
- Which variant is leading (renders + % difference)
- Confidence estimate (% lift, directional)
- Recommended next action: `/close-experiment <id>` or `/write-variants <id>` for a new iteration

### Step 5 — Highlight top priority

Identify the single highest-signal experiment and lead with: "Top priority: <experiment-id> — <one sentence reason>."

If all experiments are insufficient, suggest: "No experiments are decision-ready. Consider running paid traffic to `/[section]` or widening ICP targeting."
