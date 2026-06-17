# Systemix — the validation loop

The core is a **learning loop**: hypothesis → prototype → measure → validate →
learn. It lives in **`experiments/`** and is general — not design-bound. A design
system is an optional substrate in `design/`.

## The loop (run in Claude Code)
- **Set up:** `/init-experiment` (an assumption) → `/write-variants` (a prototype)
  → `/measure` (wire PostHog).
- **Capture:** `/close-experiment` records the decision + reason and appends the
  learning to `experiments/LEARNINGS.md` at the moment it's resolved.
- **Sync + improve:** `/drift-report` keeps code true to the design substrate
  (`design/tokens.css` + `design/guardrails.mdx`); Hermes proposes new/updated
  skills and guardrails as HITL cards.

## Guardrails
- **Autonomy dial** (`systemix.config.yaml`): ghost / assisted / autonomous.
  Instances start at **ghost** (propose-only); raising the dial is itself a
  decision. **Self-modification (skills + guardrails) is always HITL**, even in
  autonomous mode.
- If you use the design substrate: tokens are code-first in `design/tokens.css`;
  the rules live in `design/guardrails.mdx`. No raw hex/px in component code.
- Skills live in `.claude/skills/` (Claude Code discovers them automatically).

## Where things are
- `experiments/` — the loop: `<id>.mdx` experiments + `goals/`
- `experiments/LEARNINGS.md` — the synthesized memory (earned, cited, newest-first)
- `design/DESIGN.md` — the optional design substrate (tokens + guardrails)
- `.systemix/queue.json` — the HITL decision queue
