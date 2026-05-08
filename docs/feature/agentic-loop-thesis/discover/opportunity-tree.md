# Opportunity Tree — Agentic Loop Thesis

**Discovery run:** agentic-loop-thesis
**Date:** 2026-05-05
**Phase:** 2 — Opportunity Mapping
**Source evidence:** Beta brief (competitive research), blog post (positioning), hypothesis contract (dogfood), copy spec (validated positioning)

**Note on scoring:** Opportunity Algorithm requires importance + satisfaction scores from 5+ interviews. No interviews exist. Scores below are estimated from secondary research signals (funding data, HN verbatim, competitive gaps). Mark all scores [ESTIMATED — requires interview validation].

---

## Desired outcome (from ICP perspective)

Working from the pre-PMF founder ICP articulated in the blog post (the highest-conviction candidate for the agentic-loop thesis):

**"Minimize the time and cognitive load required to retrieve the evidence behind a past product decision and apply it to the next decision — without leaving the agentic workflow."**

Secondary outcome (design engineer ICP from Beta positioning):

**"Minimize the likelihood that an AI agent ships a component variant whose production evidence contradicts what we already know."**

Both outcomes point at the same mechanism: decisions need durable evidence attached at the point of creation, readable by the next actor (human or agent).

---

## Opportunity Solution Tree

```
DESIRED OUTCOME
"Every product decision starts from known ground, not a fresh guess."
          |
          +-- OPP-1: Evidence does not survive context switches (score: 16 est.)
          |         +-- Solution: Hypothesis contract as a first-class file in repo
          |         +-- Solution: /close-experiment writes rationale at decision time
          |         +-- Solution: MCP server makes contracts queryable by any agent
          |
          +-- OPP-2: Experiment results and design artifacts live in separate systems (score: 14 est.)
          |         +-- Solution: PostHog evidence pull writes back to contract frontmatter
          |         +-- Solution: Social signal CLI logs engagement to the hypothesis file
          |         +-- Solution: DESIGN.md extension (x-systemix block) as the write-back format
          |
          +-- OPP-3: Agent has no awareness of prior experiments when generating (score: 14 est.)
          |         +-- Solution: /component skill reads contract before generating any line
          |         +-- Solution: HITL queue surfaces contradictions between agent proposal and evidence
          |         +-- Solution: Evidence score gates agent confidence level in output
          |
          +-- OPP-4: The loop closes manually if at all (score: 12 est.)
          |         +-- Solution: Hermes reads PostHog event stream and proposes contract update
          |         +-- Solution: /growth-audit cross-references social + PostHog + contract state
          |         +-- Solution: Automated HITL prompt when experiment reaches significance threshold
          |
          +-- OPP-5: No shared language between "what we're testing" and "what we're building" (score: 11 est.)
          |         +-- Solution: Hypothesis contract schema as the shared artifact (YAML frontmatter)
          |         +-- Solution: Evidence score visible in dashboard alongside token/drift score
          |         +-- Solution: ICP field in contract creates segmentation-aware evidence trail
          |
          +-- OPP-6: Meta-loop (Systemix builds itself) is aspirational but not operational (score: 9 est.)
                    +-- Solution: Ship contracts for every major Systemix positioning decision
                    +-- Solution: Publish evidence feed publicly (site as experiment log)
                    +-- Solution: Hypothesis contract status visible on the landing page itself
```

---

## Opportunity scoring detail

### OPP-1: Evidence does not survive context switches

**Problem articulated in customer language (HN + blog post):**
"Three months later you're rewriting the hero again, and you have no idea why you made the last call. The PostHog data is still there if you dig for it. But the reasoning is gone."

**Importance (estimated):** 9/10
- Rationale: Every product team running iterative experiments faces this. The pain compounds: each subsequent decision made without prior context creates a worse baseline. The cost is not just time — it's repeated mistakes.
- Supporting signal: The hypothesis contract exists in Systemix's own repo because the founder experienced this problem directly. Dogfood signal, but a genuine one.

**Satisfaction (estimated):** 2/10
- Rationale: No current tool writes rationale back to the artifact automatically. Notion docs go stale (nobody writes them at decision time). Slack threads are unsearchable. PostHog is read-only. Git has what shipped, not why.
- Supporting signal: Competitive landscape confirms the (c) axis is uncontested.

**Score: 9 + max(0, 9-2) = 9 + 7 = 16 [ESTIMATED]**
**Status: Pursue — highest-priority underserved need.**

---

### OPP-2: Experiment results and design artifacts live in separate systems

**Problem articulated in customer language (blog post):**
"Evidence lands in three places that never talk to each other: your code, your analytics, your social signals."

**Importance (estimated):** 8/10
- Rationale: The integration gap is structural. PostHog does not know what Figma token drove the variant. The repo does not know which PostHog experiment validated the current token value. This is not a workflow problem — it is an architectural gap.
- Supporting signal: The copy spec example (the YAML frontmatter with `x-systemix: evidence-posthog`) is the most concrete articulation of what closing this gap looks like.

**Satisfaction (estimated):** 2/10
- Rationale: No competitor closes this loop. Luro tracks adoption (dashboard-only, no write-back). Statsig generates the data but has no design-system contract layer. The gap is confirmed uncontested.

**Score: 8 + max(0, 8-2) = 8 + 6 = 14 [ESTIMATED]**
**Status: Pursue — directly addresses the uncontested whitespace.**

---

### OPP-3: Agent has no awareness of prior experiments when generating

**Problem articulated in customer language (copy spec):**
"Your agent reads the current token value but not the experiment that set it. It ships whichever color was in the file last — not the one production validated."

**Importance (estimated):** 8/10
- Rationale: As agentic coding (Claude Code, Cursor, Codex) becomes the default workflow, agents will increasingly make decisions that human engineers used to make. Without experiment history, the agent will repeat mistakes and undo validated decisions. This problem grows in severity as agent usage grows.
- Supporting signal: The copy spec and blog post both use this as the primary pain point for the Tier 1 buyer.

**Satisfaction (estimated):** 2/10
- Rationale: No MCP-native tool serves experiment history to code agents. Storybook's MCP server surfaces component structure but not production evidence. Google DESIGN.md is a spec format, not a runtime.

**Score: 8 + max(0, 8-2) = 8 + 6 = 14 [ESTIMATED]**
**Status: Pursue — identical score to OPP-2, addresses agent-native workflow which is the growth vector.**

---

### OPP-4: The loop closes manually if at all

**Problem articulated in customer language (blog post):**
"The loop should close: run an experiment, measure it, write down what you learned, and start the next decision from known ground. Nothing in the current toolchain makes that happen automatically. So it doesn't happen."

**Importance (estimated):** 7/10
- Rationale: The manual step is the failure point. Teams intend to close the loop; the documentation (Notion, Confluence) exists to prove intent. But at the moment of decision (when results come in), closing the loop is a separate job from the primary job, so it doesn't happen. Automation of this specific moment is the value.
- Supporting signal: The Hermes authoring proposition in the Beta brief directly addresses this (Hermes reads PostHog result, proposes contract update, HITL approves).

**Satisfaction (estimated):** 2/10
- No tool closes the loop automatically. Zapier/Make could theoretically automate it, but nobody has assembled the specific flow.

**Score: 7 + max(0, 7-2) = 7 + 5 = 12 [ESTIMATED]**
**Status: Pursue (score 12, borderline — pursue because it is the mechanism that makes OPP-1, OPP-2, OPP-3 persistent rather than requiring re-intervention each cycle).**

---

### OPP-5: No shared language between "what we're testing" and "what we're building"

**Problem articulated in customer language (hypothesis contract):**
The hypothesis contract's ICP field and variant fields create a link between the testing context (who we tested with, what we measured) and the build artifact (the component or token). Without this link, test results cannot be attributed to decisions.

**Importance (estimated):** 7/10
**Satisfaction (estimated):** 3/10 (adjacent tools like Linear + PostHog create partial linkage, but not at the component/token level)

**Score: 7 + max(0, 7-3) = 7 + 4 = 11 [ESTIMATED]**
**Status: Evaluate — important but partially addressed by existing workflow tools. The unique contribution is the ICP-aware, component-level attribution, not the linking pattern itself.**

---

### OPP-6: The meta-loop (Systemix builds itself) is aspirational but not operational

**Problem:** The thesis claims "the site is the documentation and the product and the experiment itself." This is the most differentiated claim in the thesis — if true, it creates a unique narrative (the product proving its own thesis). But the hypothesis contracts have null results and the meta-loop is not closed.

**Importance (estimated):** 6/10 (high narrative value, moderate product value)
**Satisfaction (estimated):** 1/10 (nothing even attempts this)

**Score: 6 + max(0, 6-1) = 6 + 5 = 11 [ESTIMATED]**
**Status: Evaluate — strategically important for the meta-narrative but not a customer job in itself. Defer until OPP-1 through OPP-4 are shipped and the loop is operationally closed on Systemix's own GTM.**

---

## Top opportunities ranked

| Rank | Opportunity | Score | Strategic priority |
|---|---|---|---|
| 1 | OPP-1: Evidence does not survive context switches | 16 | Primary — this is the core JTBD |
| 2 | OPP-2: Results and artifacts in separate systems | 14 | Primary — architectural whitespace |
| 3 | OPP-3: Agent has no awareness of prior experiments | 14 | Primary — growing urgency with agent adoption |
| 4 | OPP-4: Loop closes manually if at all | 12 | Pursue — this is the automation mechanism for 1-3 |
| 5 | OPP-5: No shared language between test + build | 11 | Evaluate — partially served |
| 6 | OPP-6: Meta-loop not operational | 11 | Evaluate — strategic narrative, not customer job |

**G2 gate assessment:** Top 3 opportunities score above 8 (all 14+). However, all scores are estimated. G2 formally requires scores derived from 5+ interviews. Gate passes conditionally on the same condition as G1.

---

## JTBD at the right level of abstraction

The opportunity space reveals a single, well-formed job-to-be-done that subsumes the tactical instances (design system drift, GTM experiment memory, agent context):

**Core JTBD:** "When I make a product decision informed by evidence, help me ensure that evidence stays permanently attached to the artifact it justified — so the next decision, by me, my team, or an agent, starts from known ground."

**Job steps map:**

| Step | Current state (unsatisfied) | Systemix role |
|---|---|---|
| Define | Teams define hypotheses verbally or in Notion, unstructured | /init-experiment writes structured contract at definition time |
| Locate | Evidence lives in PostHog, Slack, git — no single retrieval point | MCP server makes all contract evidence queryable by agents |
| Prepare | Running an experiment requires manual PostHog setup disconnected from the hypothesis | /write-variants scaffolds variant structure and connects to PostHog event names |
| Confirm | No mechanism to know when an experiment has enough data to decide | Confidence threshold in YAML triggers HITL prompt at significance |
| Execute | Decision made verbally or in Slack, not recorded | /close-experiment writes decision + rationale at the moment it is made |
| Monitor | No live view of which hypotheses are open, which are stalled, which are ready | /growth-audit surfaces the state of all running contracts |
| Modify | Results do not flow back to the artifact that was changed | PostHog write-back, DESIGN.md extension, evidence score update |
| Conclude | Next cycle starts with no institutional memory from prior cycle | Contract is the permanent record; agent reads it on next /component or /generate call |

**Job map coverage: 8/8 steps have a Systemix mechanism mapped.** This is notable — the product is architecturally complete at the JTBD level even though execution is early.

---

## Tension resolution: Beta positioning vs. agentic loop thesis

The opportunity tree makes the relationship clear:

- **The Beta positioning** (evidence layer for design systems) is the best current instantiation of OPP-2 + OPP-3. It is technically concrete, testable, and addresses a paid segment.

- **The agentic loop thesis** describes the full JTBD (OPP-1 through OPP-4 together) at the mechanism level, independent of the design-system context.

**They are zoom levels, not competing claims** — with one important caveat. The design-system ICP (design engineer at Series A–C startup) and the pre-PMF founder ICP (blog post) have different primary jobs:

- Design engineer: "minimize agent error on token/component decisions"
- Pre-PMF founder: "don't lose the reasoning behind GTM decisions"

Both use the same mechanism. But the design engineer's job is a longer, more complex integration sale. The pre-PMF founder's job has a shorter feedback loop (experiments close in days, not quarters) and is closer to the thesis's "build itself" claim.

**Recommendation:** prioritize the pre-PMF founder ICP for the next 90 days as the primary test of the meta-level thesis. The design-system ICP remains valid but is a longer cycle and more contested. Validate the faster-feedback ICP first. If the loop closes on GTM experiments (faster cycle), the design-system loop (slower cycle) has a proven mechanism to build on.
