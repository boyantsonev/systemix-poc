---
description: Trigger Hermes to synthesize evidence from a contract and queue a HITL decision.
argument-hint: [experiment-name or "all"]
---

# /hermes — Run Hermes Synthesis

Triggers Hermes (local Ollama LLM) to read an experiment contract, synthesize the evidence against prior decisions, and write a recommendation to the HITL queue.

## Usage
```
/hermes hero-cta
/hermes all   # synthesize all contracts with status: evidence-ready
```

## Steps

1. **Resolve the target contract(s)**:
   - Named experiment: read `design/decisions/[name].mdx`
   - `all`: find all contracts with `status: evidence-ready`

2. **Check Ollama is running**:
   ```bash
   curl -s http://localhost:11434/api/tags
   ```
   If not: show setup instructions and stop.

3. **Build the Hermes prompt** — include:
   - Full contract frontmatter + prose body
   - Evidence section (baseline, variant, confidence, sessions)
   - Prior experiment history (any previous Evidence sections)
   - The hypothesis and what was tested

4. **Run Hermes via Ollama API**:
   ```bash
   curl http://localhost:11434/api/generate -d '{
     "model": "hermes3",
     "prompt": "[built prompt]",
     "stream": false
   }'
   ```

5. **Parse Hermes output**:
   - Decision: `promote-variant` / `run-longer` / `reject`
   - Rationale (1-3 sentences)
   - Confidence: high / medium / low

6. **Write back to the contract**:
   ```yaml
   hermes-decision: promote-variant
   hermes-confidence: high
   hermes-at: [today]
   status: awaiting-hitl
   ```
   And append to the prose:
   ```
   ### Hermes Synthesis — [date]

   [Hermes rationale prose]
   ```

7. **Queue the HITL card**: Write to `design/.state/queue.json`.

8. **Report**: Synthesis written, HITL card queued. Check Dashboard → Queue to approve.

## Notes
- Requires Ollama at `localhost:11434`. Any Ollama-compatible model works — `hermes3` is the default.
- Install: `brew install ollama && ollama pull hermes3`
- Hermes reads the full contract history to avoid re-proposing directions already rejected.
- After synthesis, approve or reject from the HITL queue at /queue.
