---
name: init-experiment
description: Create a new hypothesis contract in contract/hypotheses/. Prompts for hypothesis text, ICP, section, and variant copy. Writes the MDX frontmatter and rationale stub, then registers the experiment as running. Use before writing any variant code.
disable-model-invocation: false
argument-hint: <experiment-id>
version: "0.1.0"
last_updated: "2026-04-30"
min_cli_version: "1.1.0"
---

# Init Experiment: $ARGUMENTS

## Purpose

Create a new hypothesis contract MDX file in `contract/hypotheses/`. This is the first step in the hypothesis validation loop — you define the question, the variants, and the ICP before touching any code.

## Steps

### Step 1 — Determine the experiment ID

If `$ARGUMENTS` is provided, use it as the experiment ID (e.g. `hero-vp-icp-match-2026-04`). Otherwise ask the user:
- What section of the product does this experiment target? (e.g. `hero`, `pricing`, `onboarding`)
- What is the ICP for this experiment? (e.g. `ops-heavy-roles`, `design-system-leads`, `founding-engineers`)
- Construct an ID: `<section>-<short-description>-<YYYY-MM>`

### Step 2 — Collect the hypothesis

Ask the user:
1. **Hypothesis statement**: "If we [change X], then [outcome Y] will happen, measured by [metric Z]."
2. **Control variant** (`control`): the current version of the copy/UI/flow.
3. **Variant B** (`variant_b`): the proposed change.
4. Optionally: additional variants (`variant_c`, etc.)

### Step 3 — Define success criteria

Ask the user:
- Primary metric (e.g. `trial-signup-rate`, `cta-click-rate`)
- Threshold for declaring a winner (e.g. `≥20% lift`)
- Decision criteria: what does `promote`, `iterate`, and `kill` mean for this experiment?

### Step 4 — Write the contract file

Create `contract/hypotheses/<experiment-id>.mdx` with:

```
---
type: hypothesis
id: <experiment-id>
section: <section>
hypothesis: "<hypothesis statement>"
icp: <icp>
status: running
created: <today YYYY-MM-DD>
variants:
  control: "<control text>"
  variant_b: "<variant b text>"
result: null
decision: null
confidence: null
evidence-posthog: null
evidence-social: null
---

## Why This Hypothesis

<Ask the user for 1-2 sentences of rationale, or generate from the hypothesis statement.>

## Variants

**Control** (`control`): <control description>

**Variant B** (`variant_b`): <variant b description>

## Success Criteria

- Primary: <metric>
- Threshold: <threshold>

## Decision Criteria

- `promote`: <when to promote>
- `iterate`: <when to iterate>
- `kill`: <when to kill>
```

### Step 5 — Confirm

Read the created file back and confirm with the user:
- File path
- Experiment ID
- Status: `running`
- Next step: run `/growth-audit` after 7–14 days to review PostHog evidence.
