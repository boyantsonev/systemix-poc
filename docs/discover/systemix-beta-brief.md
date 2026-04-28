# Systemix Beta — Competitive Differentiation Brief

**Author:** Product Trend Researcher (synthetic)
**Prepared for:** Boyan Tsonev, founder
**Date:** 2026-04-28
**Decision being supported:** Whether to ramp distribution work (CLI publish, Figma plugin submission, paid marketing) on the Beta thesis as currently scoped.

---

## 1. Executive summary

**Verdict: Qualified go, with one mandatory pivot in framing and one mandatory de-risking spike before any paid distribution.**

The three-axis loop the team is betting on — (a) LLM continuously authoring MDX contracts, (b) Figma↔code drift with HITL rationale capture, (c) a PostHog-style production evidence loop writing measured outcomes back to the contract — does not exist as a single integrated product anywhere on the market today. That is a real wedge. But two of the three axes are now contested by well-funded incumbents shipping in the same window Systemix Beta is targeting:

- Axis (a) is being commoditised by **Google's DESIGN.md** (open-sourced April 2026, MDX-shaped frontmatter + rationale prose, Apache 2.0, explicit "de facto standard" play). [Google Blog](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/)
- Axis (b) is contested by **Fragments** (drift dashboard + MCP server, shipping now) and **Knapsack's Intelligent Product Engine** ($10M Series A Oct 2025, GA March 2026, MCP server + ingestion engine). [TechCrunch](https://techcrunch.com/2025/10/09/knapsack-picks-up-10m-to-help-bridge-the-gap-between-design-and-engineering-teams/), [Fragments](https://www.usefragments.com)
- Axis (c) — the production-evidence-writes-back-to-contract loop — is the genuinely uncontested axis. **No competitor surveyed does this.** Luro tracks adoption but does not write back to contracts. Storybook's manifests are JSON, do not capture rationale or production data, and the schema is explicitly "not yet stable." [Storybook docs](https://storybook.js.org/docs/ai/manifests)

The "sit alongside Storybook" framing is **defensible only if axis (c) is the load-bearing pillar**. If Beta leads with axes (a) or (b), Systemix is competing head-on with Google and a Series-A-funded incumbent on axes where it has weeks of lead time, not years.

**Confidence calibration:** ~70% confidence in the qualified-go. ~30% probability that DESIGN.md or Knapsack closes the entire wedge within 12 months by adding a usage-feedback edge to their existing graphs.

---

## 2. Problem statement with evidence

**Is design-code drift a paid problem?** Yes, but the buyer for the *drift-detection* slice is now crowded. The buyer for the *closed-loop evidence* slice is genuinely unserved.

Evidence the underlying problem is paid:

- **Knapsack closed a $10M Series A in October 2025** (total funding $20.8M) explicitly to "bridge the gap between design and engineering." The CEO openly states "it's an enterprise product with enterprise pricing" and lists Fortune 1000 customers. One named outcome: a pharmaceutical client compressed launch from 15 months to 2–3. [TechCrunch](https://techcrunch.com/2025/10/09/knapsack-picks-up-10m-to-help-bridge-the-gap-between-design-and-engineering-teams/), [SaaS News](https://www.thesaasnews.com/news/knapsack-raises-10-million-in-series-a)
- **Supernova has raised $25.2M across 11 investors** with explicit design-system-management positioning. [Crunchbase via search](https://pitchbook.com/profiles/company/224500-42)
- **Zeroheight charges $39–$49 per editor per month** (Starter $149/mo, Team $399/mo, Enterprise custom). Per-editor pricing model means a 20-editor design system org pays ~$10k–$20k/year minimum, before Enterprise lift. [Zeroheight pricing](https://zeroheight.com/pricing/)
- **Job market signal:** ZipRecruiter shows 799 active "design system" listings at $100k–$173k base; Indeed shows 4,118 "UX Design System Lead" postings as of April 2026. [ZipRecruiter](https://www.ziprecruiter.com/Jobs/Design-System), [Indeed](https://www.indeed.com/q-Ux-Design-System-Lead-jobs.html)
- **Hacker News thread (47832366)** captures the verbatim pain: "designing a button in Figma, having an engineer rebuild it in React, setting up Storybook documentation, then spending the rest of the project keeping three versions of the same button in sync" — the "single source of truth" becoming "four sources of partial truth." This is the Systemix problem statement, in customers' own words. [HN thread](https://news.ycombinator.com/item?id=47832366)
- **Industry framing has shifted** — multiple 2026 trend write-ups now describe "design drift" as "the single greatest drain on digital ROI" and treat it as a monitored failure mode with self-healing loops modelled on IBM's MAPE-K framework. The vocabulary itself is now established; the buyer doesn't need to be educated on the problem. [Sebastien Powell](https://www.sebastienpowell.com/blog/solving-the-design-development-drift), [Ryda Rashid (Medium)](https://rydarashid.medium.com/design-systems-in-2026-predictions-pitfalls-and-power-moves-f401317f7563)

**What is *not* obviously paid:** the specific axis Systemix Alpha shipped (DTCG-extended JSON contract + GIGO score + MCP serve) is now a feature inside larger platforms, not a standalone product. Tokens Studio, Style Dictionary, Figma Variables, Code Connect, Specify, and Supernova all cover variants of this. Systemix's defensibility on the Alpha scope alone is approximately zero.

The Beta thesis (continuous MDX authoring + production evidence write-back) is the bet that *measured outcome-driven contracts* are paid, not just *synced contracts*. That bet is plausible because the incumbents have all stopped at "we can sync" and none have shipped "we can prove what works." But it is unproven — there is no public ARR or pricing-page evidence that any tool has successfully sold a closed-loop evidence product to design system teams yet.

---

## 3. Buyer hypothesis

**Three candidate buyers, ranked by realism.**

### Tier 1 (most realistic): AI-tooling-forward design engineers and platform teams (5–25 people, Series A–C startups)
- They already pay for Storybook + Chromatic + a documentation tool, so the budget exists.
- They are already running PostHog/Statsig and already running Cursor/Claude Code, so the integration premise is plausible to them.
- They feel the "AI hallucinates the wrong token" pain weekly, not monthly. Verbatim from HN: "Component A using #3B82F6 blue while Component B uses #2563EB blue — subtly different colors accumulating." [Hacker News](https://news.ycombinator.com/item?id=47832366), [UX Planet](https://uxplanet.org/claude-code-figma-design-system-498573c5d357)
- Distribution path: shadcn-style CLI, Cursor/Claude Code MCP install, GitHub trending.
- Price tolerance: $20–$100/seat/mo, or fully open-source with a hosted tier.

### Tier 2 (real but slow): Enterprise design system leads at Fortune 1000s
- This is Knapsack's stated buyer. Six-figure ACVs, 12+ month sales cycles, procurement, SOC 2 required.
- Systemix is not currently set up to win this buyer — no SSO, no SOC 2, no enterprise Supabase posture, no named-account selling.
- **Skip this tier for now.** It is real, but Systemix would lose head-to-head on every dimension Knapsack already beats them on.

### Tier 3 (speculative): Agencies and consultancies running multi-brand systems
- The team's own copy already targets this ("Consultancies managing multiple client themes"). It is a plausible niche but a small one. Branchless ICPs in this segment rarely hit the LinkedIn-discoverable ARR scale that justifies paid acquisition.
- Useful as a design-partner pool, not as the GTM core.

**Recommendation:** anchor positioning on Tier 1 (AI-native product teams shipping with Cursor/Claude Code/v0 + PostHog). The Tier 1 buyer is the only one whose existing toolchain *already contains* all three sides of the Systemix loop (MDX/Markdown, Figma, PostHog) and who would treat the integration as additive rather than replatforming.

---

## 4. Competitive landscape

Each cell scores: **covers** (does this end-to-end), **partial** (does part of this credibly), or **no** (no evidence of this capability).

### Axis definitions
- **(a) LLM-authored MDX contracts** — A live model writes structured frontmatter + rationale prose into a versioned design-system contract on a continuous basis, not a one-shot generator.
- **(b) Figma↔code drift with rationale capture + HITL** — The system detects divergence between design and code, captures *why* a value was chosen, and routes ambiguous cases to a human approver.
- **(c) Production evidence loop** — Measured outcomes (analytics, A/B tests, conversions) are written back into the component-level contract, becoming part of its decision history.

| Competitor | (a) LLM-authored MDX | (b) Drift + HITL + rationale | (c) Production write-back | Source |
|---|---|---|---|---|
| **Google DESIGN.md** | **Covers.** YAML frontmatter + 9 markdown sections of rationale; explicit MDX-shaped spec; designed as a portable artifact agents read. | **No.** Spec only diff-compares two DESIGN.md versions. No live Figma↔code reconciliation, no HITL. | **No.** | [Google Blog](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/), [GitHub](https://github.com/google-labs-code/design.md) |
| **Storybook 9 / 10.3 (MCP)** | **Partial.** MDX docs are *sources* for an auto-generated JSON manifest. The manifest is the contract; MDX is the input. No live LLM authoring of MDX. | **No.** Storybook does not detect Figma↔code drift. Chromatic (sister product) does visual regression but on built code only. | **No.** | [Storybook AI](https://storybook.js.org/docs/ai), [Storybook MCP](https://storybook.js.org/blog/storybook-mcp-for-react/), [Manifests](https://storybook.js.org/docs/ai/manifests) |
| **Knapsack (IPE, GA Mar 2026)** | **Partial.** "Living system of record" + MCP server. Format is proprietary, not MDX. No public evidence of LLM continuously authoring contracts. | **Partial.** Ingestion engine reads Figma + code; governance workflow exists. HITL workflows are present but rationale-capture format is not specified publicly. | **No.** Mentions "performance data" ingestion but no documented PostHog-style write-back to contracts. | [Knapsack IPE blog](https://www.knapsack.cloud/blog/the-trail-ahead-knapsacks-intelligent-product-engine), [TechCrunch](https://techcrunch.com/2025/10/09/knapsack-picks-up-10m-to-help-bridge-the-gap-between-design-and-engineering-teams/) |
| **Supernova** | **No.** AI-powered prototyping and exporters; no live LLM authoring of contracts. | **Partial.** Figma sync (variables, extended collections) + design-to-code rendering. No HITL rationale workflow surfaced in product. | **No.** | [Supernova](https://www.supernova.io/), [March 2026 update](https://www.supernova.io/blog/march-2026-product-updates-figma-collections-prototyping-templates) |
| **Zeroheight** | **Partial.** "Built-in AI tools write, build and audit your docs for you." Not MDX-as-contract; documentation-as-rendered-page. | **Partial.** Syncs Figma + Storybook + repo "so nothing drifts out of line." Drift surfacing exists; structured HITL rationale capture is not the primary UX. | **No.** | [Zeroheight homepage](https://zeroheight.com/), [Figma Make connector](https://zeroheight.com/figma-make/) |
| **Specify / Tokens Studio / Style Dictionary** | **No.** Token transformation pipelines, not contracts with rationale. | **Partial.** Tokens Studio + GitHub sync surface conflicts at PR time. No first-class rationale capture. | **No.** | [Tokens Studio docs](https://docs.tokens.studio/transform-tokens/style-dictionary), [Inhaq Figma to Code](https://inhaq.com/blog/figma-to-code-design-engineer-workflow) |
| **Fragments (usefragments.com)** | **No.** Governance dashboard, not authored documentation. | **Covers (the most direct overlap with Systemix Alpha).** Token sync, drift tracking, readiness score (analogous to GIGO), MCP server, PR-blocking checks. HITL rationale workflow is not publicly described in detail. | **No.** No production-analytics write-back evidenced. | [Fragments](https://www.usefragments.com) |
| **Luro** | **No.** | **Partial.** Figma sync, 1:1 component analytics. No drift-with-rationale workflow. | **Partial — closest to (c).** Tracks live component adoption and Figma usage analytics. **But the data does not write back into a structured contract** — it is dashboard-only. | [Luro](https://luroapp.com/), [Component tracking blog](https://luroapp.com/posts/component-tracking-is-here/) |
| **Anima / Locofy / Builder.io** | **No.** Figma→code generators. | **No.** No closed-loop rationale system. (Builder.io has visual editing + Figma import, not drift reconciliation.) | **No.** | [Pixel Perfect HTML comparison](https://www.pixelperfecthtml.com/figma-to-code-plugins-anima-vs-locofy-vs-hand-coding/) |
| **v0 / Magic Patterns / Lovable / Bolt** | **No.** Generative UI tools, single-shot, no contract layer. | **No.** | **No.** | [Working with Figma in v0 (Vercel)](https://vercel.com/blog/working-with-figma-and-custom-design-systems-in-v0), [v0 docs design systems](https://v0.app/docs/design-systems) |
| **Storyblok / Tina / Contentlayer** | **Precedent only.** MDX + frontmatter is the proven content-modelling pattern; Contentlayer auto-types frontmatter, validates schemas. **None target design systems.** | **No.** | **No.** | [Contentlayer GitHub](https://github.com/contentlayerdev/contentlayer) |
| **Mutiny / AB Tasty / Statsig** | **No.** | **No.** Experimentation platforms; no awareness of design-system contracts. | **Partial — they generate the data Systemix wants.** Statsig + PostHog can attribute conversions to component variants if instrumented. **None write back to a design-system contract.** | [Statsig design system experimentation](https://www.statsig.com/perspectives/design-system-experimentation), [PostHog experiments](https://posthog.com/experiments) |
| **Chromatic / Applitools** | **No.** | **Partial.** Visual regression detects rendered drift. Applitools shipped a Figma plugin in Jan 2026 comparing production screenshots against Figma. **No contract-level rationale capture.** | **No.** | [Chromatic design systems](https://www.chromatic.com/solutions/design-systems), [Bug0 visual regression](https://bug0.com/knowledge-base/visual-regression-testing-tools) |
| **Figma (native)** | **No.** | **Partial.** Code Connect + Dev Mode + MCP server expose design data; no contract format with rationale. | **No.** | [Figma to code workflow](https://inhaq.com/blog/figma-to-code-design-engineer-workflow) |

**The single competitor who covers two of three axes credibly:** Knapsack (partial on (a) and (b), no on (c)) — but they are an enterprise sale aimed at a buyer Systemix cannot reach. The single competitor most directly threatening on the Systemix Alpha wedge: Fragments. The single competitor most directly threatening on the Beta MDX-as-contract wedge: Google DESIGN.md.

---

## 5. Differentiation map — where the wedge actually is

The empty cell in the table above is the entire (c) column except for Luro (dashboard only) and Statsig/PostHog (data source only, no write-back). **Nobody closes the loop from PostHog event → MDX frontmatter line.**

That is the wedge. Specifically:

> Systemix Beta is the only product where a measurement made in production (e.g. "Variant B converted +12%") becomes a structured, queryable, agent-readable line of evidence inside the component's own contract — and where the LLM that authored the original contract can read that evidence back and propose the next iteration.

This is a different value proposition from "we sync Figma and code." It is closer to: **"we are the experiment-logging layer for your design system."** Or: **"every component is a hypothesis with attached evidence."**

Three reasons this is defensible for 12–18 months:

1. **The integrations are non-trivial.** PostHog/Statsig events → component identity → MDX frontmatter requires a stable component-fingerprinting layer. Storybook manifests don't ship this; Knapsack hasn't shipped it; Luro tracks adoption but not experiment outcomes. Building the bridge is real engineering work, not a weekend feature.
2. **The buyer overlap is unusual.** PostHog buyers and design-system buyers rarely sit in the same procurement loop. A tool that bridges them has to speak both languages — a small surface area that the incumbents above have not budgeted for.
3. **The local LLM angle (Hermes-3 via Ollama) is genuinely differentiated.** Knapsack and Fragments use cloud LLMs through MCP. Hermes-3 running locally means contract authoring happens in the developer's loop, not on a vendor's servers — privacy, cost, and latency all flip in Systemix's favour for the Tier 1 buyer who is already wary of sending design data to third parties. [Nous Research Hermes Agent](https://hermes-agent.nousresearch.com/docs/getting-started/quickstart), [Ollama Hermes integration](https://docs.ollama.com/integrations/hermes)

The mandatory framing pivot: **stop calling Systemix Beta "the memory layer for design systems" and start calling it "the evidence layer for design systems."** Memory is what Knapsack ships with their "Living System of Record." Evidence is the cell nobody else fills.

The "sit alongside Storybook" framing **survives**, but only if it is rephrased: "Storybook tells your agent what components exist. Systemix tells your agent which ones actually worked." That is a precise complement, not a competitor.

---

## 6. Risks to the hypothesis

Ranked by probability × severity.

### R1 (HIGH): Google DESIGN.md becomes the de facto contract format and Systemix's MDX is now competing with a Google-shaped standard
The Apache 2.0 open-sourcing in April 2026 is an explicit "OpenAPI for design systems" land-grab. [Google Blog](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/) The DESIGN.md format already covers 9 sections with frontmatter + rationale — overlapping ~70% with the Systemix MDX contract proposal. **Mitigation:** adopt DESIGN.md as the contract format and position Systemix as the runtime that authors, validates, and writes evidence back into DESIGN.md files. Do not invent a parallel format. This is a one-line strategy decision and it materially de-risks the wedge.

### R2 (HIGH): Knapsack's IPE GA in March 2026 ships a feedback-data ingestion path before Systemix ships its production-evidence loop
Knapsack's blog explicitly mentions ingesting "performance data" into the system of record. [Knapsack IPE blog](https://www.knapsack.cloud/blog/the-trail-ahead-knapsacks-intelligent-product-engine) If they generalise this to A/B-test outcomes within ~6 months, Systemix's wedge collapses for the enterprise buyer. **Mitigation:** Tier 1 (the Cursor + Claude Code + PostHog crowd) is not Knapsack's buyer. Stay below Knapsack's enterprise floor and ship axis (c) within ~90 days, before Knapsack's general-availability dust settles.

### R3 (MEDIUM-HIGH): Fragments expands from drift-detection into rationale capture
Fragments already ships the readiness score, MCP server, PR enforcement, and token drift dashboard — the entire Systemix Alpha scope. [Fragments](https://www.usefragments.com) Their next logical move is rationale capture (a small product addition), at which point they become a direct overlap on axis (b) with shipped product, paying customers, and a waitlist. **Mitigation:** axis (c) is the moat. Lead with it.

### R4 (MEDIUM): Hermes-3 quality is insufficient for continuous contract authoring
Hermes-3 (Nous Research, available 3B/8B/70B/405B via Ollama) is positioned as an agentic generalist with good function calling. [Ollama Hermes 3](https://ollama.com/library/hermes3) But continuous authoring of structured frontmatter + rationale prose against a moving Figma file is a hard task. If output quality is below ~85% acceptance rate at HITL review, the loop becomes a chore, not a productivity unlock. **Mitigation:** open SPIKE 1 immediately with a real Figma file, real PostHog events, and a real reviewer. Target metric: >80% Hermes-authored contract entries accepted unmodified.

### R5 (MEDIUM): MDX-as-contract is too brittle in practice
Contentlayer (the closest precedent for MDX-frontmatter-as-typed-data) was abandoned by its maintainers and forked as Contentlayer2 by community volunteers. [Contentlayer2](https://github.com/timlrx/contentlayer2) That is a small but real signal that MDX-frontmatter-as-schema is fragile when the schema evolves. **Mitigation:** validate frontmatter against a JSON Schema (the schema is the real contract; MDX is the carrier). Treat MDX brittleness as a known engineering risk, not a thesis-level one.

### R6 (LOW-MEDIUM): Storybook adds AI-authoring of MDX docs
Storybook's MCP server already generates docs manifests from MDX. The product team's "Story Generator" is one feature step away from an LLM-authored MDX docs flow. [Storybook AI](https://storybook.js.org/docs/ai) But Storybook's manifest is JSON, not MDX-with-rationale, and the schema is still in preview. The team has historically focused on testing infrastructure rather than rationale capture. Probability of full overlap inside 12 months: low. **Mitigation:** none required this quarter.

### R7 (LOW): Figma ships native code parity that obviates drift detection
Code Connect + Dev Mode + Figma MCP cover the design-side surface. But Figma's product motion has been "expose the data, let the ecosystem build on top" — the company has shown no appetite for becoming a code-side reconciliation engine. Probability inside 12 months: low.

---

## 7. Recommended next moves (ranked, time-boxed)

**Before any paid distribution work.** All of the below should complete within ~6 weeks. Each is a kill-or-confirm step.

### Move 1 (week 1): Reframe Beta positioning — kill "memory layer," ship "evidence layer"
- Update the systemix-blond.vercel.app landing copy. Headline candidate: *"Your design system is full of opinions. Systemix is the one with evidence."*
- Drop "memory layer" entirely — that is Knapsack's "Living System of Record" by another name and you will lose that comparison.
- **Verify:** show new copy to 5 Tier 1 buyers (design engineers using Cursor + PostHog). Ask: "in one sentence, what does this product do?" If 3+ say something close to "writes production evidence into design contracts," the framing works.

### Move 2 (week 1–2): Adopt DESIGN.md as the contract carrier
- Make Systemix's contract.json a *typed view* of a DESIGN.md file, not a parallel format.
- Map the existing GIGO + drift fields into DESIGN.md frontmatter extensions.
- **Verify:** a Systemix-authored DESIGN.md file is consumable by Stitch and by a competitor that reads DESIGN.md (e.g. v0 with shadcn, per [v0 design systems docs](https://v0.app/docs/design-systems)). If the file works in both, the strategy holds.

### Move 3 (week 2–4): Close SPIKE 3 — the PostHog write-back loop — first, before SPIKES 1 and 2
- This is the only spike whose success or failure changes the company. SPIKEs 1 and 2 (Hermes authoring, MDX-as-contract) are engineering questions; SPIKE 3 is the *thesis*.
- Build the smallest possible end-to-end: a single component, a single PostHog event, a single MDX frontmatter line that updates when the experiment concludes.
- **Verify:** can a fresh agent (Claude Code with the Systemix MCP) read the contract, see the experiment outcome in frontmatter, and propose a code change citing the evidence? If yes, the loop is real. If no, the thesis breaks here.

### Move 4 (week 3–5): Run SPIKE 1 (Hermes-3) on a real customer file, not a synthetic one
- Get a design partner (one of the Tier 1 buyers; an early-stage YC startup using Claude Code + PostHog is the ideal shape) to give you read access to their Figma, repo, and PostHog.
- Run Hermes-3 (8B or 70B) authoring contracts against that file for 7 days.
- **Verify metric:** % of Hermes-authored contract entries accepted unmodified at HITL review. Target ≥ 80%. Below 70%, the local-LLM angle becomes a liability rather than a moat — switch to a hosted model and re-evaluate.

### Move 5 (week 4–6): Publish two artifacts that establish category authorship
- A blog post: *"The Evidence Layer — why design systems need a feedback loop, not a memory layer."* Publish to HN and the Design Systems Slack. The HN thread (47832366) confirms there is an audience for this framing.
- A GitHub repo: `systemix/design-md-evidence-spec` — a draft extension to Google's DESIGN.md frontmatter for production-evidence fields. Position Systemix as the reference implementation of the spec, not a proprietary tool. This is the cheapest possible moat against R1.

### Move 6 (week 6, gated on Moves 1–5): Distribution work
- Only after Moves 1–5 succeed: publish `@systemix/cli` to npm, submit Figma plugin, publish GitHub Action.
- Paid acquisition decision: defer until you have 10 Tier 1 design partners using the evidence loop weekly. The ARR math doesn't work on Tier 1 buyers without strong product-led growth signal — and you don't have the signal yet.

### What to *not* do before Moves 1–5 succeed
- Do not pursue Knapsack's enterprise buyer. You will lose every bake-off this year.
- Do not chase the Storybook crowd directly. Position alongside, not against.
- Do not invest in expanding the Figma plugin scope. The plugin is a distribution channel, not the product.
- Do not productise TokenGuard as a separate brand yet. It is a real feature and a real differentiator on cost, but the "two products" cognitive load will hurt the Beta narrative. Keep it inside the Systemix Beta envelope.

---

## Sources cited

**Direct competitor primary sources:**
- [Google Blog — DESIGN.md open-sourced](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/)
- [google-labs-code/design.md GitHub spec](https://github.com/google-labs-code/design.md)
- [Storybook AI overview](https://storybook.js.org/ai)
- [Storybook MCP for React announcement](https://storybook.js.org/blog/storybook-mcp-for-react/)
- [Storybook manifests docs](https://storybook.js.org/docs/ai/manifests)
- [Knapsack — IPE blog](https://www.knapsack.cloud/blog/the-trail-ahead-knapsacks-intelligent-product-engine)
- [TechCrunch — Knapsack $10M Series A](https://techcrunch.com/2025/10/09/knapsack-picks-up-10m-to-help-bridge-the-gap-between-design-and-engineering-teams/)
- [Supernova homepage](https://www.supernova.io/)
- [Supernova March 2026 product updates](https://www.supernova.io/blog/march-2026-product-updates-figma-collections-prototyping-templates)
- [Zeroheight homepage](https://zeroheight.com/) and [pricing](https://zeroheight.com/pricing/)
- [Fragments (usefragments.com)](https://www.usefragments.com)
- [Luro homepage](https://luroapp.com/) and [component tracking blog](https://luroapp.com/posts/component-tracking-is-here/)
- [Tokens Studio — Style Dictionary integration](https://docs.tokens.studio/transform-tokens/style-dictionary)
- [Statsig — design system experimentation](https://www.statsig.com/perspectives/design-system-experimentation)
- [PostHog — experiments](https://posthog.com/experiments)
- [Chromatic — design systems solution](https://www.chromatic.com/solutions/design-systems)
- [Vercel — working with Figma in v0](https://vercel.com/blog/working-with-figma-and-custom-design-systems-in-v0)
- [v0 docs — design systems](https://v0.app/docs/design-systems)
- [Contentlayer GitHub](https://github.com/contentlayerdev/contentlayer)
- [Contentlayer2 (community fork)](https://github.com/timlrx/contentlayer2)
- [Nous Research — Hermes Agent quickstart](https://hermes-agent.nousresearch.com/docs/getting-started/quickstart)
- [Ollama — Hermes integration](https://docs.ollama.com/integrations/hermes)
- [Ollama — hermes3 model](https://ollama.com/library/hermes3)

**Market and signal sources:**
- [Hacker News — Figma's woes (item 47832366)](https://news.ycombinator.com/item?id=47832366)
- [Sebastien Powell — Solving the design-development drift](https://www.sebastienpowell.com/blog/solving-the-design-development-drift)
- [Ryda Rashid — Design Systems in 2026 (Medium)](https://rydarashid.medium.com/design-systems-in-2026-predictions-pitfalls-and-power-moves-f401317f7563)
- [Inhaq — Figma to Code: Design Tokens & Dev Mode 2026](https://inhaq.com/blog/figma-to-code-design-engineer-workflow)
- [UX Planet — Claude Code + Figma Design System](https://uxplanet.org/claude-code-figma-design-system-498573c5d357)
- [Bug0 — Best Visual Regression Testing Tools 2026](https://bug0.com/knowledge-base/visual-regression-testing-tools)
- [ZipRecruiter — Design System jobs](https://www.ziprecruiter.com/Jobs/Design-System)
- [Indeed — UX Design System Lead jobs](https://www.indeed.com/q-Ux-Design-System-Lead-jobs.html)
- [SaaS News — Knapsack $10M Series A](https://www.thesaasnews.com/news/knapsack-raises-10-million-in-series-a)
- [Pixel Perfect HTML — Anima vs Locofy comparison](https://www.pixelperfecthtml.com/figma-to-code-plugins-anima-vs-locofy-vs-hand-coding/)
- [Zeroheight Figma Make connector](https://zeroheight.com/figma-make/)
