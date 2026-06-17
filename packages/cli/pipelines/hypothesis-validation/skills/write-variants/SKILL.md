---
name: write-variants
description: Generate and implement variant copy or UI changes for a running experiment. Reads the hypothesis contract for context, proposes new variant text calibrated to the ICP, and optionally writes it to the relevant source files. Use to iterate on an experiment or add a third variant.
disable-model-invocation: false
argument-hint: <experiment-id>
version: "0.1.0"
last_updated: "2026-04-30"
min_cli_version: "1.1.0"
---

# Write Variants: $ARGUMENTS

## Purpose

Generate variant copy proposals calibrated to the hypothesis ICP and section. Optionally apply the variant to the source file so it can be shipped and measured. This skill bridges the experiment contract and the codebase.

## Steps

### Step 1 — Load the hypothesis

Read `experiments/<id>.mdx` (the `<id>` from `$ARGUMENTS`) directly — file-first, no MCP required.

If not found, ask the user for the experiment ID and retry.

Display:
- Hypothesis statement
- ICP
- Section
- Current variants (control + any existing variants)
- Status and any existing result/confidence data

### Step 2 — Load ICP context

Read the ICP from the contract (`icp` field). Apply the following ICP profiles to calibrate tone:

| ICP | Voice | Key pain | What they fear |
|-----|-------|----------|----------------|
| `ops-heavy-roles` | Direct, outcome-first | Process breaks silently | Invisible failures |
| `design-system-leads` | Technical credibility first | Token drift at scale | "Who changed this?" |
| `founding-engineers` | Speed + control | Shipping without knowing what broke | Regressions in production |
| `agencies` | Client trust, delivery confidence | Handoff errors | Looking bad in client demos |

If the ICP is not in this table, ask the user to describe the primary pain and fear.

### Step 3 — Generate variant proposals

Produce 2–3 variant options for the next iteration. For each:
1. **Copy** — headline + subheadline + CTA (if applicable)
2. **Rationale** — one sentence explaining what psychological lever it pulls vs the control
3. **ICP match score** — 1–5 stars, with justification

Format as a comparison table followed by reasoning.

### Step 4 — User selection

Present the variants and ask: "Which variant should I implement? (1/2/3 or write your own)"

If the user provides custom copy, acknowledge and proceed.

### Step 5 — Apply to source

Ask: "Apply variant to source code? [y/N]"

If yes:
1. Identify the source file from the hypothesis `section` field (e.g. `hero` → `src/app/page.tsx`)
2. Search for the control copy text in the file
3. Show a diff of the proposed change
4. Confirm with the user before writing

After writing, instruct the user:
- The variant is now live on the next deploy
- Run `/growth-audit <experiment-id>` in 7–14 days to review evidence
- When signal is strong, run `/close-experiment <experiment-id>` to record the result

### Step 6 — Update the contract

Update `experiments/<id>.mdx` to add the new variant under `variants:`:
```yaml
  variant_c: "<new copy>"
```

Use a direct file edit (no MCP tool needed — the file is local).
