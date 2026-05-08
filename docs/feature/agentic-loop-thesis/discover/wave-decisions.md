# Wave Decisions — Agentic Loop Thesis

**Discovery run:** agentic-loop-thesis
**Date:** 2026-05-05
**Purpose:** Key decisions, validated/invalidated assumptions, confidence levels, and recommended actions for handoff to product-owner.

---

## Decision framework

Each decision is structured as:
- **Assumption:** the belief being tested
- **Evidence for / against**
- **Confidence level:** HIGH (>70%) / MEDIUM (40–70%) / LOW (<40%)
- **Risk score** (using assumption testing framework: Impact × 3 + Uncertainty × 2 + Ease × 1)
- **Recommended action**

---

## D1 — Is the agentic loop thesis the right zoom level for Systemix's identity?

**Assumption:** Systemix is best understood as a meta-level agentic learning loop (the site = the documentation = the product = the experiment), not as a specific design-system tool.

**Evidence FOR:**
- The hypothesis contract infrastructure, the blog post, the evidence-loop mechanism, and the dogfood signal all describe a general-purpose pattern (any team running experiments with AI agents) not a design-system-specific one
- The competitive landscape confirms that the design-system positioning faces three strong incumbents (Knapsack, Fragments, Google DESIGN.md) while the evidence-loop mechanism is uncontested across any domain
- First-principles logic: if AI commoditises execution, the constraint shifts upstream. A tool positioned at the constraint is positioned at the right level.

**Evidence AGAINST:**
- The Beta positioning is approved and ship-ready (copy spec is FINAL)
- The design-system context provides a technically concrete, testable, demonstrable instance of the mechanism. The meta-level thesis is harder to demonstrate without a specific use case.
- The ICP for the meta-level thesis (pre-PMF founders) is unvalidated. The ICP for the Beta positioning (design engineers at Series A–C) has surrogate validation from Knapsack's funding and HN signals.

**Confidence:** MEDIUM (50%)

**Risk score:**
- Impact if wrong: 3 (if the meta-level is wrong, the product is positioned too abstractly and loses the concrete design-system wedge it already has)
- Uncertainty: 2 (directional signals are consistent, but no external customer has confirmed the meta-level framing)
- Ease of testing: 1 (the blog post publication + HN response is a 1-day test)

**Risk score: (3×3) + (2×2) + (1×1) = 9+4+1 = 14 — test first.**

**Recommended action:** Do not abandon Beta positioning. Run the blog post to test whether the meta-level framing resonates with the pre-PMF founder ICP. If HN engagement and install signal confirm it, the thesis is validated and the landing page can be updated to reflect the broader framing. If no signal, stay with the concrete design-system positioning. The blog post is a $0 test.

---

## D2 — Are the Beta positioning and the agentic loop thesis the same thing at different zoom levels, or genuinely in tension?

**Assumption:** They are zoom levels — design-system evidence loop is one instance of the general agentic evidence loop pattern.

**Evidence FOR:**
- The mechanism is identical: write evidence back to the artifact at decision time, make it queryable by the next actor (human or agent). Whether the artifact is a design token contract or a hero-messaging hypothesis file is an implementation detail.
- The blog post explicitly uses GTM experiments as the example but names the pattern ("evidence layer") in the same terms as the design-system copy spec.
- The JTBD (preserve decision evidence across context switches) applies to both ICPs without modification.

**Evidence AGAINST:**
- The integration requirements are different: design-system loop requires Figma + PostHog + local LLM + DESIGN.md. GTM experiment loop requires PostHog + social signal CLI + hypothesis contract. Different setup complexity, different buyer journey.
- The design engineer buyer has a concrete existing pain (drift) that motivates purchase. The pre-PMF founder has a diffuse, periodic pain (losing experiment context) that may not motivate the same urgency.
- The landing page cannot serve both ICPs without segmentation. Running both simultaneously risks diluting both.

**Confidence:** HIGH (75%) that they are zoom levels, not competing claims.

**Risk score:**
- Impact if wrong: 2 (if they are genuinely in tension, the product needs to choose one ICP explicitly — a significant strategic decision but not fatal)
- Uncertainty: 2 (the mechanism is architecturally unified; the question is positioning, not product design)
- Ease of testing: 1 (the ICP resolution can be settled in a single alignment session with PM + Designer + Engineer)

**Risk score: (2×3) + (2×2) + (1×1) = 6+4+1 = 11 — test soon.**

**Recommended action:** Treat them as zoom levels with an explicit segmentation decision. The landing page serves the design-engineer ICP (Beta positioning, copy spec approved). The blog post serves the pre-PMF founder ICP (meta thesis). Both routes lead to `npx systemix init`. After 30 days of data from both channels, revisit which ICP converts at a higher rate and concentrates the product narrative there.

---

## D3 — Which ICP is primary for the next 90 days?

**Assumption (currently unresolved):** The pre-PMF founder ICP (blog post) is the right primary ICP because the feedback cycle is faster and the meta-level thesis is more defensible.

**Evidence FOR pre-PMF founder as primary:**
- GTM experiments close in days or weeks, not quarters. The evidence loop is usable and closable faster.
- The "site is the product is the experiment" meta-narrative is only possible if the founder ICP is primary (Systemix's own GTM is the first instance)
- The blog post distribution targets exactly this ICP and can generate signal within 72 hours of publication
- The pre-PMF founder ICP is less contested — no funded competitor is positioning for this buyer

**Evidence FOR design engineer as primary:**
- The Beta positioning is approved, copy is FINAL, and the landing page already targets this ICP
- The design-engineer pain (drift, agent-incorrect-token) is more acute and more frequent (weekly, not monthly)
- Surrogate willingness-to-pay evidence exists (Knapsack's $10M, Zeroheight pricing)
- The technical architecture (DESIGN.md, Figma integration, Hermes authoring) is built for this ICP

**Evidence AGAINST both simultaneously:** The hypothesis contract ICP (`ops-heavy-roles`) is a third option that appears in neither the blog post nor the copy spec. This inconsistency must be resolved — it suggests the ICP thinking has not been fully unified across the product.

**Confidence:** LOW (35%) on either ICP being definitively "right" without customer interview data.

**Risk score:**
- Impact if wrong: 3 (wrong primary ICP means misaligned distribution, messaging, and product roadmap)
- Uncertainty: 3 (no interview data, three competing ICP candidates, inconsistency across documents)
- Ease of testing: 1 (5 interviews can be scheduled in one week)

**Risk score: (3×3) + (3×2) + (1×1) = 9+6+1 = 16 — highest priority assumption to test.**

**Recommended action:** This is the single most important open question. Before any distribution work, run 5 interviews with each ICP candidate. The interview that produces more past-behavior pain descriptions with commitment signals identifies the primary ICP. Do not split distribution budget until this is resolved. The blog post publication provides a natural experiment: which ICP self-selects via the HN and LinkedIn channels?

---

## D4 — Is the "site builds itself" meta-narrative operational or aspirational?

**Assumption:** The thesis claim ("Systemix builds itself by running experiments") is a current-state description.

**Evidence FOR (operational):**
- The hypothesis contract infrastructure exists and is committed in the repo
- The founder is using the contract format for their own GTM experiments
- The blog post is being written using the blog post's own evidence loop pattern (the blog post distribution is itself a hypothesis)

**Evidence AGAINST (still aspirational):**
- `result: null` in the running hypothesis contract — the loop has not closed
- No evidence from PostHog has been written back to any contract
- The "site is the experiment" claim cannot be demonstrated until at least one contract closes with external evidence

**Confidence:** LOW (25%) that the meta-loop is operational. HIGH (85%) that it is achievable within 60 days once the blog post ships and the PostHog write-back spike completes.

**Risk score:**
- Impact if wrong: 2 (if the meta-loop never operationalises, the narrative is hollow but the tactical product still has value)
- Uncertainty: 1 (the mechanism is built; the loop just hasn't closed yet — low uncertainty about whether it can work)
- Ease of testing: 1 (publish the blog post, run `/close-experiment` when evidence comes in — can be done in days)

**Risk score: (2×3) + (1×2) + (1×1) = 6+2+1 = 9 — test soon.**

**Recommended action:** Publish the blog post, track the `npx systemix init` install signal as a PostHog event, write the result back to a contract for the blog post hypothesis. This closes the loop publicly and operationalises the meta-narrative. This is the single most effective action to make the thesis credible.

---

## D5 — Should DESIGN.md be adopted as the contract carrier?

**Assumption (from beta brief Move 2):** Adopt Google's DESIGN.md as the contract format. Position Systemix as the runtime that authors, validates, and writes evidence back into DESIGN.md files.

**Evidence FOR:**
- DESIGN.md is Apache 2.0, explicitly designed as a portable artifact agents read
- ~70% overlap with Systemix's existing MDX contract fields
- Adopting it mitigates R1 (Google format becoming the de facto standard and Systemix competing with Google)
- The copy spec already references "DESIGN.md-shaped contract" in the BottomCTA

**Evidence AGAINST:**
- DESIGN.md does not have a `x-systemix: evidence-posthog` extension approved yet — this is Systemix's contribution, and the format must preserve unknown frontmatter keys for this to work
- The format is new (April 2026) and adoption outside Google/Stitch is unproven
- Adopting a Google format invites Google comparison rather than Systemix being the format-neutral runtime

**Confidence:** HIGH (70%) that adopting DESIGN.md is the right move.

**Risk score:**
- Impact if wrong: 2 (if DESIGN.md is not adopted, the only cost is running a parallel format — manageable, not fatal)
- Uncertainty: 2 (the format is real and the linter already exists; the uncertainty is whether the community adopts it)
- Ease of testing: 1 (Move 2 from the beta brief is a 1–2 week spike)

**Risk score: (2×3) + (2×2) + (1×1) = 6+4+1 = 11 — test soon.**

**Recommended action:** Implement Move 2 from the beta brief (map existing contract fields to DESIGN.md frontmatter extensions). Verify that a Systemix-authored DESIGN.md passes the official Stitch linter. This is a one-week spike with a binary outcome.

---

## D6 — Is the macro thesis (AI commoditises "how") correct and timely?

**Assumption (Claim B from problem-validation.md):** AI is already commoditising execution ("how"), making problem discovery and hypothesis validation the new scarce resource. This shift is happening now, not in 24 months.

**Evidence FOR:**
- Claude Code, Cursor, v0, Bolt are already the default coding workflow for a significant segment of early-adopter founders
- "Vibe coding" is a named practice in mainstream developer discourse (2025–2026)
- YC batch composition is shifting toward AI-native products with non-technical founders
- The blog post ICP (pre-PMF founder using Claude Code) is a real, growing population

**Evidence AGAINST:**
- The shift is still early-adopter. The median developer is not yet using Claude Code as their primary workflow.
- The macro claim is a 5–10 year thesis. The specific "pay for hypothesis validation" behaviour has not been demonstrated at scale.
- JTBD methodology (which solves the same problem at the process level) has existed for 20 years without producing a dominant software category. If the job is real, why hasn't software solved it before?

**Critical challenge (Mom Test applied to Claim B):**

What evidence would disprove this?
- If pre-PMF founders, when interviewed, describe their constraint as "we can't build fast enough" (execution constraint), not "we don't know what to build" (direction constraint) → Claim B is premature.
- If the tools practitioners use for problem discovery (Notion, FigJam, Miro, JTBD interviews) are not experiencing demand pressure → the urgency is theoretical.
- If the blog post generates zero "I've been looking for this" signals and only generates "interesting idea" signals → the problem is not felt acutely enough to pull the buy.

**Confidence:** LOW-MEDIUM (35%) that the macro thesis is timely NOW. MEDIUM-HIGH (60%) that it will be timely within 12–24 months.

**Risk score:**
- Impact if wrong: 3 (the entire meta-level positioning is built on Claim B; if it's wrong or early, the positioning needs to revert to the concrete Beta thesis)
- Uncertainty: 3 (no customer interview data, no willingness-to-pay signal, no adjacent category evidence of "hypothesis validation software" as a paid category)
- Ease of testing: 1 (5 founder interviews + the blog post HN signal = 2-week test)

**Risk score: (3×3) + (3×2) + (1×1) = 9+6+1 = 16 — test first, same priority as D3.**

**Recommended action:** Do not lead the landing page with the macro thesis. Use it as the strategic frame for internal decision-making. Let the blog post test whether the ICP responds to the problem statement. The macro thesis should be in the "why Systemix exists" section, not the hero. The hero should be the concrete, testable, specific problem (the experiment that forgot what it learned).

---

## Validated assumptions (HIGH confidence, do not test further this cycle)

| # | Assumption | Confidence | Evidence |
|---|---|---|---|
| V1 | Design-code drift is a real, paid problem at enterprise scale | HIGH | Knapsack $10M Series A, Supernova $25.2M, Zeroheight pricing data |
| V2 | Axis (c) — production evidence write-back to contract — is uncontested by any funded competitor | HIGH | Competitive table in beta brief; Luro does dashboard-only; Statsig/PostHog generate data but no write-back |
| V3 | "Evidence layer" (not "memory layer") is the correct positioning word | HIGH | Beta brief analysis, copy spec approval, direct overlap with Knapsack's "Living System of Record" makes memory positioning undefensible |
| V4 | Local LLM (Hermes-3 via Ollama) is a meaningful technical differentiator for 12–18 months | HIGH | Competitive landscape confirms all other MCP-native tools use cloud LLMs |
| V5 | Google DESIGN.md is the right base format to adopt and extend | HIGH | Apache 2.0, ~70% field overlap, explicit portability design, "Stitch" linter already published |

---

## Invalidated assumptions (disconfirmed — do not build on these)

| # | Assumption | Confidence it's wrong | Evidence |
|---|---|---|---|
| I1 | "Memory layer" is a defensible positioning | HIGH | Knapsack's "Living System of Record" owns this term with $20.8M in backing |
| I2 | The Alpha scope (DTCG-extended JSON contract + GIGO score) is defensible alone | HIGH | Fragments covers the entire Alpha scope with shipping product and a waitlist; Systemix's defensibility on Alpha alone is "approximately zero" (beta brief) |
| I3 | Design-system enterprise buyers (Tier 2 — Fortune 1000) are reachable by Systemix this year | HIGH | No SSO, no SOC 2, no named-account selling; Knapsack wins every bake-off on these dimensions |
| I4 | Expanding the Figma plugin scope is a priority | HIGH | "The plugin is a distribution channel, not the product" (beta brief) |

---

## Open decisions requiring resolution before product-owner handoff

| Decision | Owner | Method | Deadline | Risk if deferred |
|---|---|---|---|---|
| Which ICP is primary? | PM + Designer + Engineer (cross-functional session) | 5 interviews per ICP + alignment session | Before distribution work | Misaligned landing page, blog post, and product roadmap |
| Is SPIKE 3 (PostHog write-back) technically feasible? | Engineer | Build smallest end-to-end in 1 sprint | Within 30 days | If infeasible, the core value prop of axis (c) is undeliverable |
| Does the blog post generate signal? | PM | Publish + measure 72-hour HN response | Blog post publish day | Without this signal, all ICP hypotheses remain unvalidated |
| Does Hermes-3 meet the 80% acceptance rate threshold? | Engineer | SPIKE 1 with a real customer Figma file | Within 45 days | If below 70%, local LLM positioning becomes a liability |
| Is the meta-loop operational before HN launch? | PM | Close at least one hypothesis contract with real evidence | Before Show HN | Without a closed loop, the meta-narrative is aspirational, not demonstrated |

---

## Confidence level summary

| Thesis component | Confidence | Status |
|---|---|---|
| Design-code drift is a real, paid problem | HIGH | Validated |
| Production evidence write-back is uncontested whitespace | HIGH | Validated |
| Pre-PMF founder is a valid primary ICP | LOW | Hypothesis — test now |
| The macro thesis (AI commoditises "how") is timely | LOW-MEDIUM | Speculative — test before leading with it |
| The agentic loop mechanism works end-to-end | MEDIUM | Feasibility proven at dogfood level; external validation pending |
| The two ICPs are zoom levels, not competing claims | MEDIUM-HIGH | Architecturally true; positioning resolution required |
| Systemix can build a viable business on this thesis | LOW | No revenue, no external users, no willingness-to-pay signal |

---

## Recommended handoff sequence to product-owner

**Before handoff, complete:**
1. Publish the blog post (creates the first external signal)
2. Run 5 founder interviews (closes G1 formally)
3. Resolve ICP decision in a cross-functional session
4. Complete SPIKE 3 (PostHog write-back feasibility)
5. Close at least one hypothesis contract with real external evidence

**At handoff, deliver:**
- Primary ICP: one named segment with a validated past-behavior problem statement
- Validated opportunity: the axis (c) whitespace, confirmed by competitive research and (pending) customer interviews
- Tested positioning: "evidence layer" framing, with HN engagement data as the first external signal
- Lean Canvas with G4 risks assessed and at least value risk moved from red to amber
- One closed hypothesis contract demonstrating the meta-loop is operational
