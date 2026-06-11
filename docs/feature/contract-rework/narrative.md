# The Narrative — Systemix Is an Engine You Give Goals To

**Derives from / evolves:** [`../systemix-rework/what-is-systemix.md`](../systemix-rework/what-is-systemix.md).
The loop is unchanged. What changes is what we say the engine *delivers*.

---

## The one-liner (new)

> **Systemix is an engine you give goals to.** You `npx systemix init` it into your repo and write
> the contract — *build this landing and prove it converts; stand up this design system and keep it
> honest; validate this agentic flow with real users* — and the engine ships variants, reads the
> signals, synthesizes evidence with Hermes, and brings you the decision. Everything it learns is
> written back into the contract.

### Why it evolves the old one-liner

| | Old (`what-is-systemix.md`) | New |
|---|---|---|
| Deliverable | "stands up and runs a **living design system**" | "**accomplishes and validates goals** — the design system is one of them" |
| Hero | the loop | the loop (unchanged) |
| The DS | the product | infrastructure the engine maintains while pursuing goals — a *record*, not a headline |
| Category we evoke | design-code sync tool | autonomous validation engine, supervised today |

The old definition isn't wrong — "stand up & keep the design system" survives as one goal type. It
was the *whole* one-liner; now it's a fifth of it.

## The ladder (decided: job now, vision as arc)

Every telling of Systemix — `/contract` index, marketing `/docs` intro, the landing — walks the same
three rungs, in this order:

1. **The job now (supervised).** Give Systemix a goal contract. It ships variants, reads PostHog /
   Vercel / Figma signals, Hermes synthesizes, decisions reach you in the HITL queue, outcomes are
   written back. Trust tier 0 — every write is a proposal. **Proof, not promise:** the flagship
   landing goal is live in production with six hypotheses of history and real PostHog evidence.
2. **The dial.** Autonomy is configuration, not roadmap — `hermes.autonomy` and `trust:` exist in
   `systemix.config.yaml` today. As evidence accumulates you raise it: Hermes auto-writes evidence,
   drafts hypotheses, appends memory. The write-access matrix in
   [`contract-model.md`](./contract-model.md) is the ladder made mechanical.
3. **The arc (1–2 years).** An autonomous engine that stands up an agentic design system from a
   brief and creates + validates agentic experiences end-to-end — through data, signals, and user
   research, with Atlas prototypes and flows as its research instruments. Humans set goals and
   review decisions; the engine does the rest. The MVP is this engine at trust tier 0.

Rule: **never state rung 3 without rung 1's proof in the same breath.** The demo instance is what
makes the vision claim survivable.

## Audience mechanics (decided: proof + operator)

The Contract surface is read by two people at once:

- **The prospect** opens the demo instance and reads real contracts running — goals with live
  status, hypotheses with real evidence, decisions with what-changed. The surface *is* the sales
  demo. Nothing is staged; staleness is honest (an experiment that ran out of traffic says so).
- **The operator** (founder / client team) reads the same pages to adjust the loop: approve queue
  cards in place, tune a goal's autonomy, add a hypothesis. Operator affordances appear on top of
  the prospect's reading surface — same pages, more buttons.

Writing rule for every contract page: **evidence-first, decision-visible.** Lead with what was
measured, show the decision that was made, show what changed in the repo because of it. A contract
page that can't answer "what did the engine do about it?" is not done.

House style, adopted from the zero-base track ([research §3](./research-zero-base.md); worked copy
templates in §3.2 — use them for Phase B authoring):

- **No naked percentages** — every number carries its denominator and window: "+38% relative
  (3.1% → 4.3%) · 2,114 sessions · 14 days". The denominator is what makes it evidence.
- **Attribute agency precisely** — "Hermes proposed; Boyan approved (2026-06-09)" quietly demos the
  trust tiers in every sentence.
- **Decisions are past-tense events with consequences** — "We retired variant A on June 9", never
  "we recommend".
- **Pre-register falsifiability** — "Done means" / "Kill if" timestamped into the goal before
  evidence arrives; the reader sees the goalposts never moved.
- **Publish the losers** — refuted hypotheses keep the same layout plus a "what we learned" line;
  the grey and red cards are what make the green ones convert.

Market gap this exploits (scan §1.4): the closest loop analog, Coframe, demos via retrospective
case studies — nobody in the category lets a prospect watch a live instance with full provenance.
The glass contract is the structural differentiator.

## The five goal types (the MVP catalog)

What we show Systemix being given — each is a goal contract on the demo instance:

| Goal type | Example `given:` | Today's reality |
|---|---|---|
| **Landing / surface** (flagship) | "Build a landing page based on the velocity-gap thesis and prove it converts pre-PMF founders." | LIVE — variant_b in production, PostHog collecting, 6 hypotheses of history |
| **Design system (infra)** | "Stand up a design system from Figma + code and keep it drift-free." | The existing token/component/drift pipeline, reframed as one goal instead of the whole surface |
| **Agentic experience (Atlas)** | "Design and validate the founder-loop flow with click-through prototypes and user research." | Atlas renders the prototypes; research evidence wiring is the new part |
| **Brand / theme** | "Make the instance wear client X's brand and validate perception." | `style-match` skill + HITL apply, reframed as a goal contract |
| **Self-improvement (meta)** — *proposed, unconfirmed* | "Audit your own loop and propose improvements." | `self_improvement:` block already in config — ⚠ founder selected a fifth type without naming it; confirm |

## A naming collision to resolve deliberately

The old slogan was "in sync with **evidence, not memory**" — *memory* meaning fallible human
recollection. The new model introduces **Memory** as a first-class contract section — *earned*
memory, written only from closed experiments with provenance. Same word, opposite valence. The
narrative must define it once, early: **"Memory in the contract is written from evidence — every
entry cites the experiment that earned it."** Avoid the bare old slogan going forward; if needed:
*"evidence-written memory, not vibes."*

## What we stop saying

- "Living styleguide" as the layer's identity (it's the Records appendix now).
- Component previews / token tables as a value prop (they're maintenance the engine does).
- "Design-code sync" as the category (it's one goal type's mechanics).
- Any vision claim not anchored to the demo instance's live evidence.
