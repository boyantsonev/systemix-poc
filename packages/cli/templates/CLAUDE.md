# Systemix — design system loop

Your design system lives in **`design/`** and is the source of truth. **Read
`design/DESIGN.md` first** — it carries the brief, the goals, the decision/memory
ledger, and links to everything else.

## The loop (run in Claude Code)
- **Set up:** `/init-experiment` (an assumption) → `/write-variants` (a prototype)
  → `/measure` (wire PostHog).
- **Capture:** `/close-experiment` records the decision + reason into the Memory
  section of `design/DESIGN.md` at the moment it's resolved.
- **Sync + improve:** `/drift-report` keeps code true to `design/tokens.css` +
  `design/guardrails.mdx`; Hermes proposes new/updated skills and guardrails as
  HITL cards.

## Guardrails
- Tokens are code-first in `design/tokens.css`; the rules live in
  `design/guardrails.mdx`. No raw hex/px in component code.
- **Autonomy dial** (`systemix.config.yaml`): ghost / assisted / autonomous.
  Instances start at **ghost** (propose-only); raising the dial is itself a
  decision. **Self-modification (skills + guardrails) is always HITL**, even in
  autonomous mode.
- Skills live in `.claude/skills/` (Claude Code discovers them automatically).

## Where things are
- `design/DESIGN.md` — source of truth (brief · goals · memory · decisions)
- `design/guardrails.mdx` — the design rules the drift check enforces
- `design/tokens.css` — canonical tokens (the app imports these)
- `design/decisions/` — experiments + evidence
- `.systemix/queue.json` — the HITL decision queue
