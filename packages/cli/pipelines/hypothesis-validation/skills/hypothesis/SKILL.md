---
description: Define a hypothesis. Creates an MDX contract file for what you're testing.
argument-hint: [experiment-name] [optional: component or page]
---

# /hypothesis — Define a Hypothesis

Creates (or updates) an MDX contract for an experiment. The contract is the single source of truth for what you're testing, what Hermes reads when evidence arrives, and what agents reference before making decisions.

## Usage
```
/hypothesis hero-cta
/hypothesis checkout-button "Does the green button outperform the grey one on CTR?"
```

## Steps

1. **Parse arguments from $ARGUMENTS**:
   - Experiment name (slug) — used as the contract filename
   - Optional: hypothesis statement in quotes

2. **Check if a contract already exists** at `design/decisions/[name].mdx`. If it does, read it and show the current state before asking what to update.

3. **Ask the user if not provided**:
   - What component or page is this experiment on?
   - What is the hypothesis? ("We believe [X] will achieve [metric] because [rationale]")
   - What metric are you tracking? (CTR, conversion, scroll depth, etc.)
   - What is the current baseline value?
   - What are the variants? (control / variant-b, etc.)

4. **Write the MDX contract**:

```mdx
---
component: [component-or-page]
status: draft
metric: [metric-name]
baseline-rate: [value]
variants: [control, variant-b]
posthog-event: [event-name]
figma-node: [if provided]
last-updated: [today]
---

## [Experiment Name]

[Hypothesis statement in prose]

### What we're testing

[Description of the variants and what differs between them]

### Metric

[Metric name] — current baseline: [value]

### Evidence

*No evidence yet. Run `/measure` to add instrumentation, then `/experiment` to set up the A/B test.*
```

5. **Report**:
   - Contract written at: `design/decisions/[name].mdx`
   - Next step: run `/measure [component]` to add PostHog instrumentation

## Notes
- Contracts live in `design/decisions/` by default
- The frontmatter is machine-readable — Hermes and the MCP server read it
- The prose body is human-readable — write it so a future agent understands what was tested and why
