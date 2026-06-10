---
track: zero-base
date: 2026-06-10
inputs: vision brief only — no repo files read (no content/docs/, no src/, no contract/, no docs/feature/)
method: web research (2025–2026 sources) + first-principles IA design
purpose: fresh-eyes plan to be reconciled against the separately-written grounded plan
---

# Systemix "Contract" Surface — Zero-Base Research

The brief in one sentence: a team installs an engine into their repo, hands it a living MDX Contract (brief + goals + memory), the engine ships variants, reads signals (PostHog / Vercel / Figma), a local LLM (Hermes) synthesizes evidence, decisions route through a human-in-the-loop queue under an autonomy dial, and outcomes are written back into the contract — which doubles as a public, read-only sales demo.

This report answers: how does the 2026 market present "give it a goal → watch it run → audit the evidence"; what is the ideal page inventory for a dual proof+operator surface; how should the documents be written so they sell; and what would a team anchored on design-system docs get wrong.

---

## 1. Competitive scan

### 1.1 Eval / AI-observability platforms

**Braintrust** — [braintrust.dev](https://www.braintrust.dev/) · [docs/evaluate](https://www.braintrust.dev/docs/evaluate) · [agent observability guide](https://www.braintrust.dev/articles/agent-observability-complete-guide-2026)

- IA nouns: **Logs/Traces, Evals (dataset + task + scorers), Experiments, Datasets, Scorers, Topics, Loop** (their optimizing agent is literally named "Loop"). Notably they do *not* lead with "playground" or "agents" — "evals" carry the experimentation function.
- The defining property: **experiments are immutable, comparable records** of eval runs — you can diff run N against run N-1 and wire them into CI to catch regressions. Immutability is what makes them citable.
- Homepage narrative is Problem → Solution → Proof → Action: "AI fails differently than normal software… drifts and regresses silently," then customer-quantified outcomes (Coursera "45x more feedback with AI grading," Notion "<24hrs to deploy a new frontier model"). $80M Series B (Feb 2026), customers include Notion, Stripe, Vercel, Replit.
- Weakness worth copying *around*: their own benchmark claims appear without displayed values — a claim without the number right there reads as marketing, not evidence.

**LangSmith / LangChain** — [langsmith](https://www.langchain.com/langsmith) · [observability docs](https://docs.langchain.com/langsmith/observability) · [LangSmith Fleet](https://www.langchain.com/blog/introducing-langsmith-fleet) · [Agent Inbox](https://github.com/langchain-ai/agent-inbox) · [ambient agents](https://www.langchain.com/blog/introducing-ambient-agents)

- IA nouns: **Traces → Runs (spans), Sessions/Threads, Datasets, Experiments, Annotation Queues, Dashboards**; 2026 additions: **Fleet** (enterprise workspace for a fleet of agents) and **Agent Inbox**.
- The Agent Inbox is the canonical HITL UX: modeled on "an email inbox crossed with a support ticketing system," with four verbs — **approve, edit, reject, respond** — across all agents in one place. Steal those four verbs; they're becoming the de-facto vocabulary.
- Fleet's audit framing: "which agent acted, on whose behalf, with what credentials, and what it did at each step." Identity + permission attached to every trace — that's the enterprise trust pattern.
- Annotation queues close the loop: human feedback on production traces flows back into datasets for the next eval run. Their persuasion gap: it's an operator console; a prospect can't *read* it — there's no narrative layer over the traces.

**Langfuse** — [demo project](https://langfuse.com/docs/demo) · [sessions](https://langfuse.com/docs/observability/features/sessions)

- IA nouns (left nav of the demo, exactly): **Tracing, Sessions, Prompts, Scores, Datasets**.
- The most directly relevant move in the whole scan: a **public, view-only demo project with real data** — visitors browse live traces from a shared chatbot, "from all users — not just yours. This is intentional so you can explore diverse examples." This is "the docs surface IS the sales demo" already practiced: the product demos itself by exposing a real running instance read-only. Systemix's public PROOF mode is this pattern, plus narrative.

**OpenAI Evals** — [evals guide](https://developers.openai.com/api/docs/guides/evals) · [evals.openai.com](https://evals.openai.com/) · [agent evals](https://developers.openai.com/api/docs/guides/agent-evals)

- The cautionary tale: the standalone Evals dashboard goes **read-only Oct 31, 2026 and shuts down Nov 30, 2026**; OpenAI is folding evaluation into **datasets and trace grading** — i.e., into the surfaces where the work already lives. Lesson for Systemix: a separate "results console" detached from the artifact dies. Evidence must live in the contract document itself (which the brief already gets right — write-back into MDX is the moat; treat this as confirmation, not open question).

### 1.2 Experimentation platforms

**Statsig** — [How to read experiment results (Pulse)](https://docs.statsig.com/pulse/read-pulse/) · [Pulse](https://docs.statsig.com/pulse/)

- The best-documented evidence surface in the scan. Results page = three blocks, top to bottom: **Exposures chart** (who got enrolled, over time) → **Scorecard** (primary + secondary metric lifts) → **Dimensions** (breakdowns).
- Persuasion mechanics worth copying exactly:
  - **Delta (%)** with explicit formula ((Test − Control) / Control), **confidence intervals** at a stated significance level, **green / red / grey** color semantics — grey for "not significant" is honesty rendered as color.
  - **Hover reveals the raw statistics** behind every lift — progressive disclosure from headline to math.
  - Methodology disclosures inline ("99.9% winsorization applied," CUPED, sequential testing) — the fine print is *on the page*, which reads as confidence, not clutter.
- Pulse results now stream within 10–15 minutes of starting a rollout — "evidence freshness" is a product feature they market.

**Eppo → Datadog Experiments** — [acquisition](https://www.datadoghq.com/blog/datadog-acquires-eppo/) · [TechCrunch](https://techcrunch.com/2025/05/05/datadog-acquires-eppo-a-feature-flagging-and-experimentation-platform/) · [geteppo.com](https://www.geteppo.com/) · [Statsig's analysis](https://www.statsig.com/blog/datadog-acquires-eppo)

- Eppo's brand *was* statistical rigor — confidence intervals as the product. Acquired for ~$220M (May 2025) and being fused with observability: "statistical canary testing automated based on errors, infrastructure metrics, and product telemetry."
- Strategic read: experimentation is converging with observability into one evidence plane (Datadog: "test changes, analyze behavior, measure business impact… in a single platform"). Systemix's bet — experiment results, deploy state, and design state in one contract — is the same convergence run inside the client's repo instead of a SaaS console.

### 1.3 Autonomous coding agents (the "watch it run" masters)

**Cognition / Devin** — [Devin manages Devins](https://cognition.ai/blog/devin-can-now-manage-devins) · [release notes 2026](https://docs.devin.ai/release-notes/2026) · [Devin 2.0](https://cognition.ai/blog/devin-2)

- IA nouns: **Sessions** (the atomic unit — each with "its own session link, so you can inspect its work or message it directly"), **Playbooks** (reusable prompts for repeated tasks), **Knowledge** (org-specific notes Devin consults automatically *and proposes additions to* — an agent-curated memory with human approval, exactly Systemix's memory write-back pattern), **Trajectories** (full replayable record: shell, file, browser, git, MCP activity — searchable and filterable).
- The coordinator session "reads the full trajectories of its managed Devins to understand what worked, what didn't, and where they got stuck" — agents auditing agents, surfaced to humans.
- Pattern to steal: **the session permalink.** Every unit of work is shareable and inspectable cold. A Systemix hypothesis page should be that: a link you can drop in a sales email.

**GitHub Copilot coding agent / Agent HQ** — [agents panel](https://github.blog/news-insights/product-news/agents-panel-launch-copilot-coding-agent-tasks-anywhere-on-github/) · [mission control](https://github.blog/ai-and-ml/github-copilot/how-to-orchestrate-agents-using-mission-control/) · [features](https://github.com/features/copilot/agents)

- IA nouns: **Tasks** (assign an issue to Copilot), **Agents panel / mission control** (a lightweight overlay on every page — note: overlay, not destination), **Session logs**.
- Their stated insight, verbatim: "Session logs show reasoning, not just actions. They reveal misunderstandings before they become pull requests." Reasoning-visible logs are the difference between an audit trail and a black box.
- Mission control verbs: watch real-time logs, **steer mid-run (pause, refine, restart)** across repos. The output is always a familiar artifact — a draft PR — which is why audit feels natural. Systemix equivalent: the output of every loop turn is a contract diff.

**OpenAI Codex (cloud)** — [codex cloud](https://developers.openai.com/codex/cloud) · [upgrades](https://openai.com/index/introducing-upgrades-to-codex/)

- IA nouns: **Tasks** (kick off from editor/terminal/web, monitor, then **apply the resulting diff locally**), code review that "matches the stated intent of a PR to the actual diff" and *executes the code* to validate.
- Pattern: intent-vs-diff checking — the reviewer's job is to verify the change matches the claim. A Systemix decision entry should always pair the claim with the diff it produced.

**Replit Agent 3** — [announcement](https://blog.replit.com/introducing-agent-3-our-most-autonomous-agent-yet) · [app testing](https://docs.replit.com/core-concepts/agent/app-testing) · [self-testing](https://blog.replit.com/automated-self-testing)

- IA nouns: **Checkpoints** (rollback-able bundles of completed work), **Autonomy Level** (user-facing dial, "Low" to "Max" — the closest shipping analog to ghost → balanced → high), live progress on web + phone.
- Their single most persuasive artifact: the **test browser** — you literally watch the agent's cursor click through the app it built, then it "replies back with a summary of its tests." Showing the verification act, not just asserting it, is what makes autonomy believable. Systemix analog: show Hermes's synthesis run and the signal queries it made, not just its conclusion.

**Vercel Agent & v0** — [agent docs](https://vercel.com/docs/agent) · [PR review](https://vercel.com/docs/agent/pr-review) · [investigations](https://vercel.com/blog/vercel-agent-can-now-run-ai-investigations) · [the new v0](https://vercel.com/blog/introducing-the-new-v0)

- IA nouns: **Code Review** and **Investigations** (skills of one named teammate-agent). Two patterns to steal:
  - **Validation before suggestion:** Agent "generates patches and runs them in secure sandboxes with your real builds, tests, and linters… Only validated suggestions appear in your PR." Pre-validated proposals are what make one-click approval feel safe — directly applicable to the HITL queue (a Hermes proposal should arrive pre-verified: built, linted, screenshot attached).
  - **Investigations as narrative:** alert → agent queries logs/metrics around the alert window → root-cause narrative + remediation plan. An investigation *write-up* is the persuasive unit, not the raw telemetry.
- v0 (Feb 2026 relaunch) shows task decomposition in the UI — plans multi-step work, shows subtasks. Transparent planning is now table stakes.

### 1.4 Autonomous experimentation / growth agents (closest product analog)

**Coframe** — [coframe.com](https://www.coframe.com/) · [the math behind the optimizers](https://www.coframe.com/post/the-math-behind-coframes-optimizers) · [L-Nutra case study](https://www.coframe.com/post/coframe-drives-1-5m-in-profit-with-ai-driven-web-experimentation-for-l-nutra) · [Product Hunt](https://www.producthunt.com/products/coframe)

- Pitch: "Let your website optimize itself" — generative A/B testing where each new variant ("arm") is informed by data from previous arms; acquired HaystacksAI (Mar 2026) to build an "Autonomous Growth Agent."
- This is the closest thing to Systemix's loop in market — ship variants → read signals → learn → ship again. Two observations:
  - Their proof surface is **dollar-quantified case studies** ("$1.5M+ in profit for L-Nutra") and a "math behind it" explainer — credible, but **retrospective**: you read about what Coframe did for someone else.
  - Nobody in this category lets a prospect **watch a live instance run with full provenance**. Coframe's loop is a black box you trust because of case studies. Systemix's differentiator is structural: the contract is glass — live goals, live queue, decisions with evidence, in the client's own repo. That's the gap to drive a truck through.

### 1.5 HITL & autonomy-governance patterns (cross-cutting)

Sources: [Mavik Labs — HITL review queues 2026](https://www.maviklabs.com/blog/human-in-the-loop-review-queue-2026/) · [Cordum — 5 production patterns](https://cordum.io/blog/human-in-the-loop-ai-patterns) · [LangChain HITL docs](https://docs.langchain.com/oss/python/langchain/human-in-the-loop) · [escalation design](https://www.digitalapplied.com/blog/human-in-the-loop-escalation-design-ai-agents-2026) · [AI PM governance outlook](https://aipmtools.org/articles/future-of-ai-product-management)

- Consensus framing: **"the goal is controlled autonomy, not full autonomy"** — agents act within boundaries, escalate when policy says so.
- **Oversight level is a property of the decision, not the system.** Tiers exist (CSA/NIST profiles define four, fully-supervised → fully-autonomous) but routing is per-decision by risk/confidence/policy. Systemix's trust tiers should therefore express themselves as *per-decision-type rules*, not one global switch.
- Confidence-band routing is the standard mechanic (e.g., >90% auto-execute, 70–90% queue for review, <70% reject/escalate); healthy escalation rate ~10–15% — if everything escalates the agent is weak, if nothing does you're blind.
- Queue-item UX requirements, verbatim from the literature: show **"why it needs review" and "what will happen next."** Every Systemix queue card needs both lines.
- Market signal: analysts predict that by 2028 **"the ability to control, audit, and constrain what AI agents do autonomously will overtake raw capability as the primary selection criterion."** The autonomy dial + decision ledger isn't a settings page — it's the thing enterprise buyers will be buying.

### 1.6 Synthesis — naming and persuasion patterns

**Naming map across the market:**

| Concept | Market names | Recommendation for Systemix |
|---|---|---|
| Unit of intent | Task (GitHub, Codex), Goal (PM tools), Issue | **Goal** — already right; "task" undersells validation |
| Unit of work | Session (Devin), Run (LangSmith), Checkpoint (Replit) | **Run** for one loop turn; keep "session" out (clashes with analytics sessions) |
| Unit of proof | Experiment (Braintrust/Statsig), Eval, Hypothesis (science) | **Hypothesis** — more honest than "experiment"; carries falsifiability |
| Audit record | Trace/Trajectory (LangSmith/Devin), Session log (GitHub) | **Activity** (ledger) for humans; trajectory-level detail behind it |
| Human gate | Agent Inbox (LangChain), Queue, Review | **Queue** with the four inbox verbs: approve / edit / reject / respond |
| Learned state | Knowledge (Devin), Memory, Dataset | **Memory** — already right; Devin validates agent-proposed + human-approved memory |
| Governance | Autonomy Level (Replit), trust tiers, permissions (Fleet) | **Autonomy** as a named contract clause with per-decision rules |
| The whole agreement | (nobody has this) | **Contract** — unoccupied naming territory; own it |

"Contract" is the differentiated noun: nobody in the scan binds goals + evidence + memory + governance into one signed-feeling document. Closest neighbors are Devin's Knowledge (memory) and Fleet's permissions (governance), but they're scattered settings, not a legible agreement.

**What makes evidence surfaces persuasive (the seven mechanics):**

1. **Immutability + permalink** — Braintrust experiments, Devin session links. A claim you can cite beats a dashboard you can filter.
2. **Progressive disclosure of rigor** — Statsig's scorecard → hover → raw stats; headline first, math one click down, never hidden.
3. **Honest color semantics** — grey for non-significant; methodology fine print on the page.
4. **Reasoning visible, not just actions** — GitHub session logs; show *why* the agent did it.
5. **Show the verification act** — Replit's cursor clicking the app; Vercel running patches in sandboxes before suggesting. Watching validation happen > being told it happened.
6. **Real instance, read-only** — Langfuse's public demo project with live shared data. The product demos itself.
7. **Outcome-quantified narrative** — Braintrust's "45x," Coframe's "$1.5M": numbers attached to named decisions and customers.

**What fails:** operator consoles with no narrative layer (a prospect can't read LangSmith); standalone results dashboards divorced from the working artifact (OpenAI Evals, deprecated); claims without displayed values (Braintrust's own benchmarks); black-box loops trusted only via retrospective case studies (Coframe).

---

## 2. Greenfield IA

### 2.1 Design principles

- **P1 — One corpus, two lenses.** Public PROOF and OPERATOR are the same pages with role-gated affordances (queue buttons render read-only when unauthenticated). Never fork into marketing site + admin app: the entire pitch is "you are looking at the real thing."
- **P2 — Three atomic units.** The **Hypothesis** is the unit of proof, the **Decision** is the unit of accountability, the **Memory entry** is the unit of compounding value. Each gets first-class pages, stable permalinks, and an index. Everything else is grouping.
- **P3 — Every page answers, in order:** What's the verdict? What's the evidence? What changed because of it?
- **P4 — The trust ladder is click-depth.** Claim → decision → Hermes synthesis → raw signal query (PostHog/Vercel/Figma). Four layers, every layer linkable, no dead ends.
- **P5 — Time is rendered everywhere.** "As of" stamps, evidence windows, freshness indicators, review-by dates. A proof surface that could be stale is not a proof surface.
- **P6 — Motion above the fold on entry pages.** Live counters, last-action timestamps, pending-queue depth. Prospects must catch the engine mid-stride.

### 2.2 Page inventory

**1. Now** — route `/` (entry for both audiences)
- **Job:** answer "is this thing alive and what is it doing?" in ten seconds; route operators to the queue, prospects down the narrative ladder.
- **Above the fold:** engine status strip (autonomy tier · last action + timestamp · signals health dots for PostHog/Vercel/Figma) · the latest decision card (one sentence + what changed) · pending decisions count → links to Queue · active goals with progress-toward-validation bars · a live activity ticker (last 5 ledger events).
- Below: "how to read this contract" 60-second orientation + the narrative ladder (the concrete job today → the rising-autonomy arc).

**2. Contract** — route `/contract` (the root document)
- **Job:** the canonical agreement — what the team asked for, the rules of engagement, the state of play. For prospects it reads as "this is what you'd sign"; for operators it's the source of truth they edit via decisions.
- **Above the fold:** the brief (2–3 paragraphs, plain language) · the goal ledger (each goal: statement, status, evidence count) · the autonomy clause summary (what Hermes may write vs must propose, per tier) · memory digest (top 5 highest-confidence learnings) · contract metadata (instance, repo, created, last amended — with a link to the amendment diff).

**3. Goals index + Goal pages** — routes `/goals`, `/goals/[slug]`
- **Job (index):** show the portfolio of bets, ranked by activity, not alphabetically.
- **Job (goal page):** one mission, fully legible: what done means, how it'll be falsified, what's been tried, what was decided.
- **Above the fold (goal page):** goal statement in plain words · **"Done means"** block (validation criteria with target metric, threshold, window) · **"Kill if"** block (pre-registered failure criteria) · status + progress against the evidence threshold · hypothesis ladder (each: one-line bet + verdict chip).
- Below: decisions under this goal · memory written from this goal · linked records touched.

**4. Hypothesis pages ("proof cards")** — route `/goals/[slug]/h/[id]` (canonical permalink)
- **Job:** the atomic sales asset — a self-contained, citable proof unit you could paste into an email. Verdict-first, evidence-backed, decision-closed.
- **Above the fold:** the bet ("We believe X for ICP Y because Z; we'll know if METRIC moves past T") · **verdict strip** (VALIDATED / REFUTED / RUNNING / RETIRED · relative lift · n with denominator · window · confidence — grey styling when not significant) · what shipped (variant description + visual diff/screenshot).
- Below: evidence stream (each signal read, timestamped, source-linked) · Hermes synthesis (the reasoning, quoted, attributed, with model + date) · the decision block (proposed by / decided by / route taken / contract diff link) · "changed because of this" (links to memory entries + records).

**5. Decisions ledger** — routes `/decisions`, `/decisions/[id]`
- **Job:** the accountability spine — every decision ever, machine and human, queryable. This is what enterprise buyers will diligence (governance over capability by 2028).
- **Above the fold (index):** filterable ledger — date · decision one-liner · proposed by (Hermes/human) · route (auto-applied at tier X / HITL approved / HITL rejected / overridden) · goal · evidence link.
- **Decision page:** the proposal as written · evidence cited at decision time (frozen snapshot — what was known then) · why it routed where it did (the tier rule that fired) · the human action if any · **the contract diff (MDX before/after)** · rollback annotation if later reversed.

**6. Queue** — route `/queue` (operator home; read-only when public)
- **Job (operator):** clear the pending decisions with confidence and minimal clicks.
- **Job (prospect):** watch governance happen — pending items are proof the human is in the loop, not decoration.
- **Above the fold:** pending cards ranked by impact × staleness; each card: Hermes's recommendation + confidence · evidence summary (3 bullets, each source-linked) · **"why this needs you"** (the rule that escalated it) · **"what happens next"** on approve vs reject · the four verbs: **Approve / Edit / Reject / Respond** · aging indicator (queued 2d).
- Below: recently cleared items with outcomes; escalation-rate stat for the month (target band ~10–15% visible — honesty about how often the human is needed).

**7. Activity** — route `/activity` (the flight recorder)
- **Job:** "watch it run" as a ledger — chronological, interleaved engine actions (shipped variant, read signal, ran synthesis, wrote memory, opened queue item) and human actions (approved, edited, rejected), with timestamps and links into the objects.
- **Above the fold:** the live feed, filterable by goal / actor (Hermes vs human) / source (PostHog/Vercel/Figma) / event type. Each row links to its hypothesis/decision. Reasoning excerpt expandable inline (GitHub's lesson: reasoning, not just actions).

**8. Memory** — route `/memory`
- **Job:** the compounding asset — what the engine now knows about this product and its users, with receipts. For sales this is the page that says "fire us and you keep this; it's in your repo."
- **Above the fold:** memory entries as claim cards: durable claim in bold · confidence (with n) · provenance (which hypothesis/decision, dated) · **review-by date** (claims expire; stale claims get flagged for re-validation) · **"used by"** backlinks — which later runs consulted this entry (the loop visibly eating its own learning).

**9. Signals** — route `/signals`
- **Job:** the trust foundation — show the raw inputs are real, flowing, and queryable.
- **Above the fold:** connection cards for PostHog / Vercel / Figma: status · last successful read · current sampling window · events tracked · link to the underlying query for the most recent evidence. Degraded states shown honestly (a yellow "Figma token expired 2d ago" builds more trust than hiding it).

**10. Autonomy** — route `/autonomy`
- **Job:** render the dial as a contract clause with a track record, not a settings toggle.
- **Above the fold:** current tier (ghost / balanced / high) · the capability matrix — rows = decision types (copy variant, token change, component change, experiment close, memory write), columns = tiers, cells = *may write* / *must propose* / *may not* · **track record:** proposals made / approved / edited / rejected / overridden per month, and auto-actions later reversed · promotion criteria ("balanced → high requires 30 days at <5% override rate").
- Operator affordance: change tier = itself a decision that lands in the ledger.

**11. Records** — routes `/records/tokens`, `/records/components`, `/records/workflows`
- **Job:** the appendix — design tokens, components, workflow definitions as *evidence of execution*, each stamped with sync status and the decisions that touched it.
- **Above the fold (per record):** the artifact (token table / component preview / workflow map) · drift/sync status with timestamp · "amended by" decision links. Explicitly subordinate in nav — these support the story; they are not the story.

### 2.3 Navigation model

- **Primary nav (7 items max):** Now · Contract · Goals · Decisions · Memory · Activity · **Operate** (Queue, Signals, Autonomy grouped — visible read-only to the public, actionable to operators).
- **Mode behavior, not mode pages:** unauthenticated visitors get PROOF defaults (Now opens with narrative ladder expanded; queue verbs render as "watch only"); authenticated operators get Queue as their landing redirect and keyboard-driven clearing. Same URLs throughout — a prospect's bookmark becomes an operator's bookmark after the deal.
- **Cross-linking discipline:** every verdict links to its decision; every decision links to its evidence and its diff; every memory entry links to its source hypothesis and forward to its consumers. The four-layer trust ladder (P4) must never dead-end.
- **Launch requirement:** the public demo instance must be Systemix running on Systemix's own contract — real goals, real queue, real losses. Langfuse proves view-only-real-data works; Coframe proves retrospective case studies are the weaker substitute. Never seed with sample data.

### 2.4 Three strongest ideas (ranked)

1. **Verdict-first proof cards with permalinks.** Every hypothesis page is a self-contained sales asset: bet → verdict strip → evidence → decision → what changed, with the four-layer drill-down. The unit of marketing equals the unit of work.
2. **The Decisions ledger with contract diffs.** Every decision shows the MDX before/after it caused, who/what decided, and the rule that routed it. Audit trail = changelog = governance demo, one surface — and it's the thing enterprise buyers will be selecting on by 2028.
3. **One corpus, two lenses.** `/queue` is the operator's homepage; the live "Now" strip is the prospect's homepage; identical URLs, role-gated verbs. The demo is real because it *is* the product.

---

## 3. Narrative voice

### 3.1 Writing patterns for documents that double as proof

1. **Inverted pyramid of proof.** Verdict → number-with-denominator → method → raw link. Never make a reader scroll to learn whether it worked.
2. **No naked percentages.** Every number carries its denominator and window: "+38% relative (3.1% → 4.3%), 2,114 sessions, 14 days." A bare "+38%" is marketing; the denominator is what makes it evidence (Statsig's scorecard discipline).
3. **Attribute agency precisely.** "Hermes proposed; Boyan approved (2026-06-09)." Naming what the machine did vs the human is the honesty that makes autonomy claims credible — and it quietly demos the trust-tier system in every sentence.
4. **Decisions are past-tense events with consequences.** Not "we recommend leading with the install command" but "We retired variant A on June 9. The hero now leads with the install command." Show the world changed.
5. **Pre-register falsifiability.** "Done means" and "Kill if" are written into the goal *before* evidence arrives, visibly timestamped. When the verdict lands, the reader can see the goalposts never moved — the single strongest rhetorical device available, and almost free since the contract is versioned.
6. **Memory entries are instructions to the future, with expiry.** Claim + confidence + provenance + review-by + implication ("lead founder-facing copy with drift-pain, never tool-lists"). A learning that doesn't change future behavior is trivia.
7. **Losses keep the same layout as wins.** A REFUTED card with full evidence and a "what we learned" line is what makes the VALIDATED cards believable. Grey is a color in the palette (Statsig); use it.
8. **Plain bet language, rigor one layer down.** "We believe… because… We'll know if…" in the body; CUPED/winsorization/significance detail in an expandable methods note. Both audiences served on one page.

### 3.2 Worked examples

**Goal statement** (top of `/goals/landing-converts-founders`):

```mdx
## G-03 — Prove the landing page converts design-led founders

**Job:** Ship a landing page for ICP "design-led founding teams" and prove it
converts — not ship it and hope.

**Done means:** `install_command_copied` ≥ 4% of unique sessions, over ≥ 2,000
sessions, sustained across two consecutive weeks.
**Kill if:** < 1.5% after 4,000 sessions → escalate to operator with a
repositioning proposal.
*Criteria registered 2026-04-12, before any variant shipped. Unchanged since.*

**Status:** RUNNING — 3 hypotheses: 1 validated · 1 refuted · 1 live.
**Evidence so far:** 6,400 sessions read · 2 decisions taken · 2 memory entries written.
```

**Hypothesis card** (above the fold of a proof card):

```mdx
### H-07 — Velocity-gap hero beats capability-list hero

**Bet:** Founders feel the pain of drift, not missing features. Leading with
"you ship every day — your system should learn every day" will out-convert
the capability list for ICP design-led founders.

**Verdict: VALIDATED** ✓
+38% relative on `install_command_copied` (3.1% → 4.3%) · 2,114 sessions ·
14 days · p = 0.03 → [Hermes synthesis] → [raw PostHog query]

**Shipped:** variant B hero copy + CTA reorder ([visual diff]) · 2026-05-26
**Decision:** Hermes proposed *promote B, retire A* (confidence 0.87 — above
the balanced-tier threshold for copy, so it queued for review). Approved by
Boyan, 2026-06-09 → [decision D-21, contract diff]
**Changed because of this:** variant B is now the default · memory M-22 written.
```

**Memory entry** (a card on `/memory`):

```mdx
**M-22 — Founders respond to drift-pain framing, not capability framing.**

Confidence: HIGH (1 validated experiment, n = 2,114; no contradicting evidence).
Provenance: H-07 under G-03 · decided 2026-06-09 (Hermes proposed, human approved).
Review by: 2026-09-09 — re-validate if the ICP or hero changes.

**Implication for future runs:** lead all founder-facing copy with the gap
between shipping speed and system learning. Do not lead with tool integrations.

Used by: R-31 (pricing-page variant generation, 2026-06-14) · R-35 (onboarding email).
```

---

## 4. Top 10 deltas

What a team anchored on an existing design-system-docs implementation would miss or get wrong — specific and opinionated:

**1. The converting object is the decision, not the component.**
DS-docs instinct organizes by artifact (tokens, components, pages). Here the thing a prospect buys and an auditor checks is "a decision with evidence attached." Decisions need first-class pages, permalinks, an index, and the contract diff they caused. If `/decisions` doesn't exist as a top-level surface, the product's accountability story doesn't exist.

**2. Status and time are content, not metadata.**
DS docs are written to be timeless; proof surfaces die when timeless. Verdict chips, "as of" stamps, evidence windows, freshness indicators, review-by dates — rendered from loop data, never hand-written prose (which goes stale and silently falsifies the product's own claims). Every page is a state machine first, an article second.

**3. Pre-registration is the killer rhetorical device — and docs teams won't think of it.**
"Done means" + "Kill if" written into the goal contract *before* evidence arrives, timestamped, visibly unchanged. It costs nothing (the contract is versioned) and it's what separates "we ran experiments" from "we cannot cheat." No doc-shaped habit produces this; it must be designed in.

**4. One corpus, two lenses — never fork.**
The reflex is to build a marketing site that *describes* the operator app. The brief's whole trick is that the same pages serve both: role-gated verbs, not duplicated surfaces. The moment a "demo" page diverges from the real instance, the proof claim ("watch real contracts run") is dead.

**5. Proof mode must show motion from a real running instance.**
A DS-docs team will write excellent "how it works" pages with screenshots. Prospects need a live queue depth, a ticking activity ledger, a last-action timestamp from minutes ago — and it must be the dogfood instance (Systemix on Systemix), never seeded sample data. Langfuse demos with live shared data; Coframe hides its loop behind case studies. Be Langfuse, not Coframe.

**6. Persuasion depth is the provenance chain.**
A chart is an assertion; a chain is evidence. Every claim must click through four layers: claim → decision → Hermes synthesis (quoted, attributed, dated) → raw signal query. DS docs never need citations; this surface is *only* citations. Any dead end in the chain is where a skeptical buyer stops believing.

**7. Publish the losers.**
Docs culture curates; evidence culture discloses. Refuted and retired hypotheses keep the same layout, the same prominence, and a "what we learned" line. A contract showing only wins reads as a brochure; the grey and red cards are what make the green ones convert.

**8. Autonomy is a contract clause with a track record, not a settings page.**
The dial would get built as a config toggle. It must render as a legible capability matrix (what Hermes may write vs must propose, per decision type, per tier) *plus* the receipts: proposals approved/edited/rejected/overridden rates, auto-actions later reversed, promotion criteria. Governance-with-evidence is becoming the primary enterprise buying criterion — this page is sales material, not admin.

**9. Memory is forward-looking claims, not an archive.**
The docs habit treats finished work as changelog. Memory entries are durable claims with confidence, provenance, expiry (review-by), and an implication — and the surface must show them being *consumed* ("used by run R-31"). Memory nobody visibly uses is a graveyard; memory with backlinks is the compounding asset that justifies "evidence becomes memory."

**10. The design system is the appendix, not the product.**
The team's deepest competence — tokens, components, drift — is precisely what must be demoted: records stamped with sync status and "amended by decision D-x," filed under `/records`. If the IA leads with the component catalog, Systemix reads as another zeroheight/Storybook/Supernova, and the actual category — an accountable goal-running engine — becomes invisible.

---

## Appendix: source list

- Braintrust: https://www.braintrust.dev/ · https://www.braintrust.dev/docs/evaluate · https://www.braintrust.dev/articles/agent-observability-complete-guide-2026
- LangSmith/LangChain: https://www.langchain.com/langsmith · https://docs.langchain.com/langsmith/observability · https://www.langchain.com/blog/introducing-langsmith-fleet · https://github.com/langchain-ai/agent-inbox · https://www.langchain.com/blog/introducing-ambient-agents · https://docs.langchain.com/oss/python/langchain/human-in-the-loop
- Langfuse: https://langfuse.com/docs/demo · https://langfuse.com/docs/observability/features/sessions
- Statsig: https://docs.statsig.com/pulse/read-pulse/ · https://docs.statsig.com/pulse/
- Eppo/Datadog: https://www.datadoghq.com/blog/datadog-acquires-eppo/ · https://techcrunch.com/2025/05/05/datadog-acquires-eppo-a-feature-flagging-and-experimentation-platform/ · https://www.geteppo.com/ · https://www.statsig.com/blog/datadog-acquires-eppo
- OpenAI Evals: https://developers.openai.com/api/docs/guides/evals · https://evals.openai.com/ · https://developers.openai.com/api/docs/guides/agent-evals
- Devin/Cognition: https://cognition.ai/blog/devin-can-now-manage-devins · https://docs.devin.ai/release-notes/2026 · https://cognition.ai/blog/devin-2
- GitHub Copilot agents: https://github.blog/news-insights/product-news/agents-panel-launch-copilot-coding-agent-tasks-anywhere-on-github/ · https://github.blog/ai-and-ml/github-copilot/how-to-orchestrate-agents-using-mission-control/ · https://github.com/features/copilot/agents
- OpenAI Codex: https://developers.openai.com/codex/cloud · https://openai.com/index/introducing-upgrades-to-codex/
- Replit Agent 3: https://blog.replit.com/introducing-agent-3-our-most-autonomous-agent-yet · https://docs.replit.com/core-concepts/agent/app-testing · https://blog.replit.com/automated-self-testing
- Vercel Agent / v0: https://vercel.com/docs/agent · https://vercel.com/docs/agent/pr-review · https://vercel.com/blog/vercel-agent-can-now-run-ai-investigations · https://vercel.com/blog/introducing-the-new-v0 · https://v0.app/
- Coframe: https://www.coframe.com/ · https://www.coframe.com/post/the-math-behind-coframes-optimizers · https://www.coframe.com/post/coframe-drives-1-5m-in-profit-with-ai-driven-web-experimentation-for-l-nutra · https://www.producthunt.com/products/coframe
- HITL/governance: https://www.maviklabs.com/blog/human-in-the-loop-review-queue-2026/ · https://cordum.io/blog/human-in-the-loop-ai-patterns · https://www.digitalapplied.com/blog/human-in-the-loop-escalation-design-ai-agents-2026 · https://aipmtools.org/articles/future-of-ai-product-management
