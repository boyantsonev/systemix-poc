---
name: systemix-init
description: Initialize a fresh Systemix instance and co-author experiment #1 — the contract (the living agreement) + the first experiment as an AI workflow built around an ICP/JTBD (given prompt → steps → conclusion), measured. Run once, at the start.
disable-model-invocation: false
argument-hint: [instance-name]
version: "0.1.0"
last_updated: "2026-06-18"
min_cli_version: "1.1.0"
---

# Systemix Init: $ARGUMENTS

## Purpose

Stand up a fresh Systemix instance from a blank slate and define its first experiment **with** the founder. The **contract** is the living doc (`contract/index.mdx`); the artifact is the **running experiment** (`experiments/<id>.mdx`) — a hypothesis about an **AI workflow** for a specific **ICP / job-to-be-done**, shown as that workflow (given prompt → agent steps → conclusion) and measured. Everything is files; the app renders them; the three doors (this skill · `systemix experiment` · the `experiment_*` MCP) edit the same files.

This is a conversation, not a form. Ask one thing at a time, reflect it back, and only write files once the founder confirms.

## Steps

### Step 1 — The brief (the contract)
Ask the founder, in their words:
- What is this instance for? (one paragraph — the product or idea)
- Who is it for? (the **ICP** — a user type, role, or segment)
- What **job** are they trying to get done? (the **JTBD**)
- What does the engine's job become here?

Write `contract/index.mdx` — the living agreement. Keep the existing managed structure if present (`## Brief`, `## Autonomy`, `## Goals`, `## Memory`, `## Decision log`), replacing the prose with the founder's answers. The `## Goals` / `## Memory` embeds stay (they render the loop live). Do NOT invent goals — the founder gives goals.

### Step 2 — The hypothesis
A Systemix experiment is AI-native: it tests an **AI workflow**, not just copy. Ask:
- **Hypothesis**: "If we [build/change this AI workflow] for [the ICP doing the JTBD], then [outcome], measured by [metric]."
- **Given**: the prompt / starting context the workflow runs from (what the user or agent starts with).
- **Conclusion**: the win-state — what "it worked" looks like, in one line.

### Step 3 — The AI workflow (the artifact)
This is the heart. Co-design the workflow as a small DAG of typed steps from **given → … → conclusion**. Step kinds:
`input` (the given/prompt) · `agent` (agent reasoning) · `router` (branches) · `parallel` (fan-out) · `tool` (a tool / MCP call) · `human` (HITL) · `output` (the conclusion).

Ask the founder to walk the flow; propose a first draft (3–6 steps) and refine. Each step: a short label + a one-line note (+ an optional agent name). Then the edges (from → to).

### Step 4 — Measurement
- **Metric**: the primary KPI (e.g. `cta-click-rate`, `task-completion`).
- **PostHog event**: the event that measures it — or `null` if signal wiring isn't set up yet (that's fine; the experiment still runs and evidence lands later). If no PostHog key is configured, say so and continue — connecting a data source is its own step: **`/connect-signal`** (run it when you're ready to measure).

### Step 5 — Write experiment #1
Construct the id `<section>-<short-desc>-<YYYY-MM>`, then write `experiments/<id>.mdx`:

````
---
type: experiment
id: <id>
section: <section>
icp: <icp>
jtbd: "<job-to-be-done>"
hypothesis: "<hypothesis>"
given: "<the prompt / starting context>"
conclusion: "<the win-state>"
status: running
metric: <metric, or null>
variants:
  control: "<current / baseline>"
  variant_b: "<the proposed workflow>"
workflow:
  steps:
    - id: given
      kind: input
      label: "<the prompt>"
      note: given
    - id: <step-id>
      kind: agent          # input | agent | router | parallel | tool | human | output
      label: "<what happens>"
      note: "<detail>"
      agent: <optional agent name>
    - id: conclusion
      kind: output
      label: "<the win-state>"
      note: conclusion
  edges:
    - from: given
      to: <step-id>
    - from: <step-id>
      to: conclusion
posthog-event: <event, or null>
result: null
decision: null
confidence: null
evidence-posthog: null
evidence-social: null
created: <today YYYY-MM-DD>
review-by: null
---

## Why this hypothesis
<1–2 sentences: the ICP + JTBD, and why this workflow is the bet.>

## Given
<the prompt / starting context the workflow runs from.>

## The AI workflow
<prose walk-through of the steps; the frontmatter `workflow` renders the diagram.>

## Conclusion
<what success looks like — the win-state and how the metric proves it.>

## Decision criteria
- `promote`: <when the bet wins>
- `iterate`: <when it's promising but short>
- `kill`: <when to drop it>
````

### Step 6 — Confirm + next
Read the file back and confirm with the founder: id, ICP/JTBD, the workflow shape, the metric. Then:
- `systemix experiment list` shows it (the CLI door).
- It renders at `/experiments/<id>` as its AI workflow (given → steps → conclusion).
- Next: connect a signal (`/connect-signal`) so it can measure, build the variant, wire the metric (`/measure`), then `/growth-audit` once evidence lands.

## Notes
- Files are the truth; the app renders them. Editing the MDX — here, via `systemix experiment`, or the `experiment_*` MCP — updates the contract.
- Never invent goals or raise autonomy; those are the founder's. Self-modification stays HITL.
