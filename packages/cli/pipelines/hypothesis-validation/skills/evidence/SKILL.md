---
description: Pull PostHog experiment results and write the outcome into the MDX contract.
argument-hint: [experiment-name]
---

# /evidence — Pull Experiment Evidence

Reads PostHog experiment results and writes the outcome back into the MDX contract frontmatter. Queues a HITL card for Hermes to synthesize.

## Usage
```
/evidence hero-cta
/evidence hero-cta --sessions 1200 --control 3.2% --variant 4.7% --confidence 0.87
```

## Steps

1. **Read the experiment contract** from `contract/experiments/[name].mdx`.

2. **Collect evidence** — two modes:
   a. **Manual input**: Use `--sessions`, `--control`, `--variant`, `--confidence` if provided.
   b. **PostHog API**: If `POSTHOG_API_KEY` is available, fetch experiment results for the flag key in the contract.

3. **Validate significance**: Flag if confidence < 0.80. Don't block — just note.

4. **Write evidence back into the contract frontmatter**:
   ```yaml
   last-experiment: [name]
   last-result: variant-b-wins  # or: no-winner, control-wins, insufficient-data
   confidence: 0.87
   sessions: 1240
   baseline-rate: 0.032
   variant-rate: 0.047
   evidence-date: [today]
   status: evidence-ready
   ```

5. **Write the evidence section in prose**:
   ```
   ### Evidence — [date]

   Variant B outperformed control by +47% CTR at 87% confidence
   across 1,240 sessions. Consistent across all scroll depths.
   ```

6. **Queue a HITL card**: Add an entry to `.systemix/queue.json` for Hermes synthesis.

7. **Report**: Contract updated, HITL card queued. Next: run `/hermes [name]` or check the Dashboard → Queue.

## Notes
- The prose evidence section is what Hermes reads before synthesizing. Write it clearly.
- If confidence is below threshold, status stays `running` — run the experiment longer.
- Run `/hermes [name]` after this to trigger Hermes synthesis.
