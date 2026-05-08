# Lean Canvas — Systemix (Agentic Loop Thesis)

**Discovery run:** agentic-loop-thesis
**Date:** 2026-05-05
**Phase:** 4 — Market Viability (produced under the agentic-loop thesis framing)
**Prior canvas:** n/a — this canvas supersedes the implicit Beta positioning canvas
**Status:** First draft. All risk assessments based on secondary research and first-principles reasoning. Requires customer interview validation before G4 gate passes.

---

## Canvas

### 1. Problem

Top 3 problems, ranked by evidence strength:

**P1 (HIGH EVIDENCE):** Evidence from experiments does not survive context switches. Three months after a test closes, the rationale is in Slack, the data is in PostHog, and neither is accessible when the next related decision is made. Teams — and the AI agents assisting them — repeat mistakes and unmake validated decisions.

**P2 (HIGH EVIDENCE — competitive whitespace):** Experiment results and the artifacts they justify live in separate, disconnected systems. PostHog knows variant B won. The codebase does not. The Figma token does not. The agent writing the next iteration does not. No existing tool closes this loop.

**P3 (MEDIUM EVIDENCE — growing urgency):** AI coding agents (Claude Code, Cursor, Codex) operate without access to the prior experiment history that informs the decision they are automating. The agent ships the token that was last in the file — not the one production validated. As agentic coding becomes the default workflow, the cost of this gap compounds.

**Existing alternatives (how the problem is currently "solved"):**
- Notion docs (go stale, written after the fact, not read by agents)
- PostHog dashboards (read-only, no rationale, no link to artifact)
- Git history (records what shipped, not why, not what the alternatives were)
- Slack threads (ephemeral, unsearchable at decision time)

---

### 2. Customer Segments

**Primary ICP (highest-confidence for agentic loop thesis):**
Pre-PMF founders and small product teams (1–5 people) building with AI agents — Claude Code, Cursor, v0. They run frequent GTM experiments (messaging, pricing, onboarding). They use PostHog or Statsig. They have no structured hypothesis tracking. They feel the "rewriting from scratch three months later" pain personally.

**Secondary ICP (Beta positioning — slower cycle, more contested):**
Design engineers and platform teams at Series A–C startups (5–25 people) who already pay for Storybook + Chromatic + PostHog and feel the "agent shipped the wrong token" pain weekly. This ICP is valid but overlaps with Knapsack's and Fragments' competitive footprint.

**Segment by JTBD, not demographics:**
- Job: "Keep the evidence that justified this decision permanently attached to the artifact, readable by the next actor (human or agent)"
- Both ICPs share this job. Primary ICP has faster feedback cycle and no current solution. Secondary ICP has longer integration cycle and partial existing solutions.

**Early adopters:** Founders of pre-PMF SaaS products using Claude Code who have already tried to solve this with Notion + PostHog and experienced the failure mode.

---

### 3. Unique Value Proposition

**Primary (for pre-PMF founder ICP):**
"The experiment that won in March is still there in October — attached to the code, readable by your agent, written at the moment you decided."

**Alternative framings tested in the hypothesis contract:**
- Control: "Design systems shouldn't lie. Systemix keeps them honest." (designer-first, too narrow for agentic thesis)
- Variant B: "Ship faster. Measure everything. Let Hermes close the loop." (velocity frame, aligns with agentic thesis)

**High-concept:** "PostHog tells you variant B won. Systemix writes that result into the contract — so the next sprint, and the next agent, starts from known ground."

**What makes it unique vs. alternatives:**
- Notion: passive, not written at decision time, not readable by agents
- PostHog/Statsig: generates the data, doesn't attach it to the artifact
- Knapsack: sells "correctness" (sync), not "evidence" (why); enterprise buyer
- Google DESIGN.md: format standard, not a runtime that writes evidence back

---

### 4. Solution

Top 3 features mapped to top 3 problems:

**S1 → P1:** Hypothesis contract as a first-class file in the repo. YAML frontmatter captures hypothesis, ICP, variants, success criteria at creation time. Not a wiki entry created after the fact — a structured file committed alongside the code it describes.

**S2 → P2:** Evidence write-back loop. `/close-experiment` pulls PostHog results + social signal data into the contract at decision time. `x-systemix` frontmatter extension attaches experiment outcome to the DESIGN.md token contract. The loop that currently does not close closes automatically.

**S3 → P3:** MCP server makes contracts queryable by agents. Any Claude Code skill (`/component`, `/generate`, `/growth-audit`) reads the contract before acting. The agent sees the evidence, not just the current value.

**Supporting mechanism (from beta brief):**
Hermes-3 (local LLM via Ollama) reads PostHog event stream and proposes contract updates. HITL approval keeps humans in the loop at the decision point. Evidence score (0–100) gives a single number indicating how much of the contract is backed by evidence vs. opinion.

---

### 5. Channels

**Primary (open source / developer PLG):**
- `npx systemix init` as the installation primitive
- Show HN for the blog post (distribution sequence already planned in `docs/blog/evidence-layer-post.md`)
- GitHub trending (the `contract/hypotheses/` schema is open — designed to be adopted without the Systemix tooling)
- Claude Code / Cursor MCP marketplace (when available)

**Secondary:**
- DM outreach to pre-PMF founders using PostHog (identified via PostHog community, YC Slack, indie hackers channels)
- X / LinkedIn thread from the blog post distribution plan
- Design Systems Slack (for secondary ICP — design engineers)

**Not yet validated:**
- Paid acquisition (explicitly deferred in beta brief until 10 Tier 1 design partners using the evidence loop weekly)
- Product Hunt (timing TBD)
- Figma plugin store (secondary distribution, not primary)

**Channel confidence:** Medium. The distribution plan is coherent and the channels are right for the ICP. But no channel has been tested. The HN post has not shipped. Zero external validation of which channel converts.

---

### 6. Revenue Streams

**Current state:** No revenue. Open source with no monetization layer.

**Candidate models (from beta brief):**

| Model | Tier | Rationale |
|---|---|---|
| Open source core | Free | Schema + CLI + local Hermes = zero-cost. Drives adoption. |
| Hosted tier | $20–$100/seat/month | Cloud Hermes, hosted evidence dashboard, PostHog managed integration |
| Evidence score API | Usage-based | Third-party agents query contract evidence via API; pay per call |
| Enterprise (deferred) | $50k+ ACV | SSO, SOC 2, SLA — not addressable in current state |

**Willingness-to-pay evidence:** Weak. Knapsack's funding confirms the adjacent problem is paid ($20.8M raised). Zeroheight's $39–$49/editor/month gives a pricing ceiling for the design engineer ICP. But no direct evidence that teams will pay specifically for hypothesis-validation-as-a-service. This is the most critical G4 gap.

**Recommendation:** defer monetization decision until 10 active users are running the evidence loop weekly and can be asked directly: "what would you pay to not lose this?"

---

### 7. Cost Structure

**Current (lean):**
- Solo founder (time cost, no salary)
- Vercel hosting (minimal — Next.js static + edge functions)
- Supabase (free tier for now)
- Ollama/Hermes-3 (local — zero cloud cost for the product itself)

**Scale costs (if hosted tier ships):**
- Cloud LLM inference (if Hermes-3 acceptance rate falls below 80% threshold, switch to hosted model — cost structure changes significantly)
- PostHog API quota (read costs when scaling evidence pull across many customers)
- Support and onboarding (at 10+ design partners, becomes non-trivial)

**Cost structure risk:** The local-LLM angle (Hermes-3 via Ollama) is the structural cost advantage. If the 80% acceptance rate threshold is not met (R4 from beta brief), the model switches to a hosted LLM and margin collapses. SPIKE 1 (run Hermes on a real customer file) is the cost-structure validation experiment.

---

### 8. Key Metrics

| Metric | Current | Target (90 days) | Evidence source |
|---|---|---|---|
| Active hypothesis contracts | 1 (self) | 10 (external) | Contract files in partner repos |
| Evidence loops closed | 0 | 5 (external) | `decision: promote/iterate/kill` filed in contracts |
| `npx systemix init` installs | 0 | 50 | npm download count |
| HN Show HN engagement | 0 | >50 points, >20 comments | HN post metrics |
| Social signal logged | 0 | 1 (from blog post itself) | `evidence-social` field in blog post contract |
| Hermes acceptance rate | untested | >80% unmodified | SPIKE 1 result |

**North star metric:** Number of evidence loops closed externally (decision written to a contract from a PostHog result that was not authored by the founder). This is the only metric that confirms the product works outside dogfood conditions.

---

### 9. Unfair Advantage

**Genuine advantages (hard to copy quickly):**

**A1 — The meta-narrative (the site is the experiment):** No competitor can run the "product proves its own thesis" narrative because they are not structured as an agentic learning loop. This is a positioning advantage, not a technical one — but positioning advantages in a new category matter. The hypothesis contracts in the repo, the public evidence feed, the blog post as a live experiment: this is a narrative moat if it becomes operational.

**A2 — Local LLM positioning:** Hermes-3 via Ollama means no API key, no design data leaving the machine. Knapsack and Fragments use cloud LLMs through MCP. For the Tier 1 buyer who is already wary of sending proprietary product data to third parties, local inference is a procurement unlock. Unfair advantage window: 12–18 months before local model quality is commoditised by frontier providers.

**A3 — The open schema as a network effect:** The `contract/hypotheses/` schema is designed to be adopted without the Systemix tooling. If the pattern (hypothesis + evidence write-back in a structured file) is adopted independently (as Contentlayer was before it), Systemix becomes the reference implementation of a community standard rather than a proprietary tool. This is the GitHub/shadcn playbook: give away the schema, sell the hosted runtime.

**A4 — Dogfood credibility:** Every positioning decision in Systemix's GTM is being tracked as a hypothesis contract. When the first contracts close with real evidence, the product has a proof of its own thesis that no competitor can manufacture. This is a trust signal, not a technical moat — but it is unique.

**Weak / contested advantages (not unfair):**
- MDX-as-contract format: contested by Google DESIGN.md
- Drift detection: contested by Fragments
- Agent-native MCP server: Knapsack, Storybook, Fragments all ship MCP servers

---

## 4 Big Risks Assessment

### Value risk — Will customers want this?

**Risk level: HIGH (red)**
- No external customer has used the evidence loop
- No willingness-to-pay signal for hypothesis-validation-as-a-category
- The pre-PMF founder ICP has not been interviewed
- The macro thesis (AI commoditises "how") is logical but not empirically confirmed at product level

**Validation path:** 5 founder interviews (past behavior: "tell me about the last time you made a decision without the context from the prior experiment"), fake-door test on the blog post (measure install rate from `npx systemix init` CTA), DM outreach to 10 PostHog community members

---

### Usability risk — Can customers use this?

**Risk level: MEDIUM (amber)**
- The CLI flow (`npx systemix init` → `/init-experiment` → run → `/close-experiment`) is simple in concept
- No usability testing has occurred with external users
- The Hermes-3 HITL flow requires a local Ollama install — this is a non-trivial setup step for non-engineer ICPs. For the pre-PMF founder ICP (likely technical), this is low friction. For ops-heavy roles (hypothesis contract's ICP), this may be a hard blocker.

**Validation path:** SPIKE 1 — run a real customer through the full loop with screen recording. Target: task completion >80%, setup time <15 minutes for a technical founder.

---

### Feasibility risk — Can we build this?

**Risk level: MEDIUM (amber)**
- The architecture is proven at the dogfood level (hypothesis contract exists, MCP server exists, PostHog integration is designed)
- The PostHog write-back loop (SPIKE 3 from beta brief) has not been shipped end-to-end
- Hermes-3 continuous authoring quality is unvalidated (SPIKE 1 from beta brief)
- MDX frontmatter as a write-back target has known brittleness risks (Contentlayer precedent)

**Validation path:** SPIKE 3 (PostHog → contract write-back) is the feasibility-critical spike. Build the smallest possible end-to-end: one experiment, one PostHog event, one frontmatter line updated. Verify that a fresh agent reading the contract sees the evidence and proposes a correct next action.

---

### Viability risk — Does the business model work?

**Risk level: HIGH (red)**
- No revenue
- No pricing signal from external customers
- The open-source-core model risks giving away the product without capturing value (the schema is intentionally open)
- LTV > 3x CAC math cannot be run without any data on either side

**Validation path:** After 10 active external users are using the evidence loop, run a "what would you pay" conversation (past-behavior framing: "if this went away tomorrow, what would you do and what would that cost you?"). Use this to set initial hosted tier pricing. Do not set pricing before this conversation.

**Viability summary:** The viability risk is real but not fatal at this stage. The open-source-core strategy correctly prioritises adoption over revenue in the category-creation phase. The risk becomes critical at the 6-month mark if there is no willingness-to-pay signal from any external user.

---

## Go/No-Go Recommendation

**Decision: Conditional go on the agentic-loop thesis direction, with mandatory validation gates.**

**Go conditions:**
- The blog post ships and generates measurable signal (install count, HN engagement, DM responses from founders describing the problem in their own words)
- 5 pre-PMF founder interviews confirm the "experiment that forgot what it learned" problem in past-behavior terms
- SPIKE 3 (PostHog write-back) completes successfully

**Pivot conditions:**
- HN post generates zero engagement on the evidence-loop framing (suggests the problem is not named correctly)
- Founder interviews produce "I would use this" (future intent) but no past-behavior examples of the pain — this suggests the problem is theoretical, not felt
- SPIKE 3 fails technically — the write-back architecture does not work reliably

**Kill conditions:**
- 5 founder interviews and zero willingness to describe a past instance of the problem → the macro thesis (Claim B) is premature
- PostHog write-back cannot be built reliably within 60 days → the integration is not viable with current resources

**ICP decision (required before distribution):** Resolve which ICP is primary — pre-PMF founder (blog post) or design engineer (Beta positioning). Cannot run dual-ICP distribution on a single landing page. The current copy spec is written for the design engineer. The blog post targets the founder. One must be primary.
