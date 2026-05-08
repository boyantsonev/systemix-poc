# ICP Definition — Pre-PMF Founder
**DISCUSS wave — Agentic Loop Thesis**
**Date:** 2026-05-05
**Status:** Confirmed — D3 resolved (wave-decisions.md DIV-4b)

---

## Who they are

**Name used in stories:** Tomas Brandt (he/him)

**Role:** Solo founder or founding team (1–3 people). No dedicated product manager. No design team. The founder makes every product call.

**Stage:** Pre-PMF. Revenue may exist (early paying users, cohort from a Show HN post) but the product-market fit signal is not yet stable. Retention is the unsolved problem. The founder is actively iterating.

**Primary tool:** Claude Code or Cursor. They vibe-code — they prompt their way through feature work rather than writing every line by hand. They are comfortable in the terminal. They read stack traces. They are not afraid of YAML.

**GTM motion:** Experiments, not campaigns. They run 2–5 concurrent hypotheses — landing page copy, pricing anchors, onboarding steps, feature positioning — and measure results in PostHog. They iterate weekly or faster.

**Evidence today:** PostHog. They know which events fire, which funnels convert, which cohorts churn. PostHog is their ground truth.

---

## What they have

| Asset | Status |
|---|---|
| A running product | Yes — deployed, real users |
| PostHog (or equivalent) | Yes — installed, events firing |
| Claude Code or Cursor | Yes — primary dev tool |
| A hypothesis they are testing right now | Yes — at least one open experiment |
| A structured record of prior experiments | No — this is the gap |
| A way for their agent to read prior decisions | No — this is the job |

---

## What they do today (the workaround)

1. Run an experiment in PostHog. Variant B wins. They note the result in Notion or Slack.
2. Ship variant B. Three weeks later, an agent refactors the component. The agent has no context. It ships the "wrong" variant — one that was tested and rejected.
3. Three months later, they are rebuilding the same experiment. They do not remember why they chose variant B. The Notion note is stale or missing. The Slack thread is buried.
4. The next decision starts from zero. Evidence from the prior cycle has no trace in the codebase.

**Frequency of pain:** Every 2–4 sprint cycles. Not every day — but every time a related decision comes up, the absence of the prior record is felt.

**Emotional state at the moment of pain:** Frustrated and slightly embarrassed. They know they made this call before. They cannot find the rationale. They are not sure if they should re-test or trust their memory.

---

## Where Systemix enters

**Entry point:** The moment a PostHog result reaches significance and the founder needs to make a call.

**The job Systemix does:** Hermes has already read the PostHog result. It has drafted a decision card: "Variant B converted +14% over 7 days. Confidence: 92%. Recommended action: promote." The founder sees the card in the HITL queue. They review it in 60 seconds. They click approve. Systemix writes the evidence back to the DESIGN.md contract co-located with the component that was tested. The decision is now permanent, co-located, and agent-readable.

**Next time this component is touched:** The agent reads the contract. It sees the evidence. It does not revert the winning variant. The founder does not have to remember — the file remembers for them.

---

## What they are NOT

- Not a design engineer. They do not have a Storybook. They do not have a PR review culture with quality gates.
- Not an ops director. They are not managing multiple teams or multiple brands.
- Not an enterprise buyer. No procurement process. No SOC 2 requirement. No 6-month sales cycle.
- Not a designer. They may not use Figma at all, or use it minimally.

---

## ICP boundary conditions

| Condition | In ICP | Out of ICP |
|---|---|---|
| Uses PostHog or Statsig | Yes | Gut-feel only, no analytics |
| Uses Claude Code or Cursor | Yes | Traditional IDE only |
| Pre-PMF (still searching for fit) | Yes | Post-PMF with growth team |
| 1–5 person team | Yes | 10+ person team with PM role |
| Running 2+ hypotheses concurrently | Yes | Single product direction, no experiments |
| Comfortable with CLI and YAML | Yes | Non-technical founder |

---

## Tension with the current landing page

**The current landing page (systemix-alpha.vercel.app) is written for the design-engineer ICP (ICP-1).** Key signals:

- Headline language assumes a design system ("design systems shouldn't lie")
- The copy assumes Storybook awareness ("sit alongside Storybook")
- The value frame is drift detection and token sync — a problem the pre-PMF founder does not feel because they do not have a design system

**What this means for the landing page (decision — do not redesign yet):**

The landing page needs to be rewritten for the pre-PMF founder before any distribution push. The specific changes required:

1. **Headline** must name the pre-PMF founder's pain, not the design engineer's pain. The experiment-that-forgot-what-it-learned is the felt pain. Token drift is not.
2. **Use case copy** must reference PostHog, experiments, and hypothesis tracking — not Storybook, tokens, or component parity.
3. **The CTA** (`npx systemix init`) should lead into the experiment-initialization flow, not the design-system sync flow.
4. **The social proof section** (when it exists) should feature pre-PMF founders, not design system leads.

**The design-engineer ICP (ICP-1) is not abandoned.** It is the secondary ICP. The landing page can address both — but the primary framing, the hero copy, and the primary CTA must be anchored on the pre-PMF founder ICP first.

**What NOT to do:** Do not run a dual-ICP landing page that tries to speak to both with equal weight. The lean-canvas analysis confirms this creates message confusion. One primary ICP owns the hero. The secondary ICP appears in use case variations or a separate page.

**Gate before any distribution work:** The landing page copy must be revised to match ICP-2 (pre-PMF founder) before any Show HN post, DM outreach, or paid acquisition. Distribution to the wrong ICP is worse than no distribution.
