---
name: design-interview
description: Set up a design system from scratch when a repo has none. A short, conversational interview — your product, your people, and the associations behind your palette ("what colour is your primary user, what do you associate with it?") — then drafts design/DESIGN.md, tokens.css, and guardrails.mdx in your own voice. Every draft is proposed for approval (HITL); nothing is written until you say yes. The greenfield door; for a repo that already has UI, use /systemix:design-audit instead.
argument-hint: [instance-name]
---

# /systemix:design-interview — Set up a design system from scratch

Greenfield door: **$ARGUMENTS**

Point this at a repo with **no design system** and it interviews you into one — a
code-first `design/` folder (tokens + guardrails) that carries *your* signature and
that your agent will follow from then on.

## Guard first
- If `design/` already exists, **stop** and suggest `/systemix:design-audit` (that door reads
  your existing code and proposes fixes). Don't overwrite a system that's there.
- If the repo has substantial UI but no `design/`, offer `/systemix:design-audit` too — it can
  infer a starting palette from the code so the interview has a head start.

## The interview (ask, reflect, confirm — one thing at a time)

Keep it short and human. Reflect each answer back before moving on.

1. **What & who** — What is the product, in one line? Who is the primary user
   (the ICP / persona)? A secondary persona if there is one.
2. **The associations** — the heart of it. For the brand and the primary persona,
   ask the association questions and derive colour from meaning, not hex:
   - "If your product were a colour, what would it be — and what do you associate
     with that?"
   - "Your primary user — what colour are they? Calm? Urgent? Warm?"
   - "One word for how using it should feel."
   Turn the answers into a small semantic palette (background, foreground, primary,
   muted, accent, border) and a light/dark pair.
3. **Shape & density** — corners (sharp / soft), density (airy / compact), and the
   spacing rhythm. Derive `--radius` and the spacing base.
4. **Type** — one or two typefaces already in the repo (or system fonts), and the
   scale (tight / generous).
5. **The few components** — the 3–5 primitives this product actually needs first
   (e.g. Button, Card, Input). Not a kitchen sink.

## Draft the system (propose — do not write yet)

From the interview, draft three files and **show them inline**:

- `design/DESIGN.md` — the brief in the operator's own words, including the
  *associations* as the rationale ("primary is warm because …").
- `design/tokens.css` — the semantic palette + scale as CSS custom properties
  (`:root` + `.dark`), in the shape of the template. Code-first; the app imports this.
- `design/guardrails.mdx` — the rules, including the **anti-AI-slop** section (one
  component per concept, no inline primitives, consistent variant vocabulary, no
  mixed libraries, new pattern → ask first). Tuned to what they told you.

## HITL — nothing lands without a yes

Creating a design system is a `guardrail`-tier artifact: **always human-in-the-loop**,
even in autonomous mode. So:

1. Present the three drafts and ask for approval (edits welcome — it's their system).
2. Push a proposal card to the HITL feed (`.systemix/queue.json`) so the decision is
   visible in the dashboard and readable by other agents (the Systemix CLI's design feed):
   ```json
   {
     "id": "design-proposal-<slug>-<timestamp>",
     "type": "design-proposal",
     "filePath": "design/",
     "proposed": "New design system: <n> tokens, <m> guardrail groups",
     "context": "<one-line summary of the system you drafted>",
     "status": "pending",
     "requestedAt": "<ISO>"
   }
   ```
3. On approval, write `design/DESIGN.md`, `design/tokens.css`, `design/guardrails.mdx`
   and resolve the card. On edits, revise and re-propose.

## After setup
- Your agent now reads `design/guardrails.mdx` on every change (see the repo
  `CLAUDE.md`) and asks before breaking the system.
- `/systemix:drift-report` holds the code true to the tokens on every change.
- The two doors converge here: greenfield builds from this interview, existing repos
  build from `/systemix:design-audit` — both land in `design/`.
