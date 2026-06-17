# Systemix — Honest Analysis & Positioning
**Date:** 2026-06-11  
**Author:** Claude (Cowork session)  
**Status:** Strategic review — not a roadmap, a diagnosis

---

## What Systemix Actually Is (the honest answer)

Systemix has gone through three distinct identity shifts, and right now it is all three at once:

**V1 — Alpha:** A token sync pipeline. CSS variables in `globals.css` → Figma variables, with drift detection between code and design. Useful engineering work. Completely contested market (Fragments, Supernova, Specify, Tokens Studio).

**V2 — Beta:** An evidence layer for design systems. MDX contracts + HITL approval + a local LLM (Hermes/Ollama) authoring rationale. "Storybook tells your agent what exists. Systemix tells it what worked." Differentiated, but the ICP was design engineers — a smaller, slower market than you need.

**V3 — Agentic Loop (current thesis):** A hypothesis validation loop for pre-PMF founders building with AI agents. Write a hypothesis, PostHog measures it, Hermes synthesizes the result, you close it in one click, evidence gets written back to an MDX contract in your repo. The next agent, sprint, or experiment starts from known ground — not a fresh guess.

**The honest single sentence:** Systemix is the infrastructure that closes the gap between "what PostHog measured" and "what your agent knows" — making every past decision permanently attached to the artifact it describes, readable by the next AI agent that touches it.

That is the right thesis. The problem is the product says three things at once, has tested zero of them with external users, and every hypothesis is still running with `result: null`.

---

## Design & UX

### What's working

**The visual design is genuinely good.** The dark theme with oklch color tokens, the flickering grid background fading into a radial gradient, the typography choices — this is a well-crafted surface. It looks like a product that takes design seriously, which is appropriate given the subject matter.

**The streaming AI hero is a clever concept.** Page loads, shows "thinking...", then streams the headline. It proves the agentic premise in the UI itself. Technically impressive and on-brand.

**The HITL queue component is thoughtful.** The idea of surfacing Hermes decisions as cards with approve/reject is exactly the right interaction model for the evidence write-back flow.

**The docs architecture is solid.** Fumadocs with MDX, proper navigation, concept pages for Hermes, HITL, drift, contracts. There's genuine care here.

### What's broken

**The streaming hero is a conversion liability.** Every visitor sees a different AI-generated headline. That means you have no consistent value proposition, no headline you can test, and no ability to run a proper A/B experiment on your own product's most important element. The headline that streams is also often abstract — AI-generated copy rarely outperforms human copy written from customer insight. Ironically, you have two running `hero-vp-icp-match` and `landing-hero-icp-pivot` hypotheses that can't close because the hero isn't stable enough to measure.

**The landing page message is still design-engineer.** Despite ICP resolution (D3, 2026-05-07) picking pre-PMF founders as primary, the live site still reads as a design system tool:
- "One loop. Design aligns. Engineering ships. Marketing measures. Business decides." — this is four audiences at once, none of them specifically addressed
- The CTA is "Subscribe for beta" — the softest possible ask
- There's no copy that speaks to a pre-PMF founder's actual pain: "three months later I'm rebuilding the same experiment and I can't find why I made that call"

**The scope is too visible.** The `/design-system/*`, `/atlas/*`, `/queue`, `/contract`, `/dashboard`, `/docs`, and `/projects` routes are all live. A new visitor who pokes around sees a product that is simultaneously a design system manager, an agent dashboard, a workflow builder, and a docs site. This reads as ambition without editing. It makes it hard to understand what the one thing this does is.

**The `npx systemix init` CTA is aspirational, not real.** It appears in docs and copy but there's no evidence the CLI is published and works. A developer who reads it and runs it in their terminal and gets nothing is a worse experience than not having the CTA at all.

**The evidence loop has never closed externally.** Both running hypotheses (`hero-vp-icp-match-2026-04`, `landing-hero-icp-pivot-2026-05`) have `result: null`. `evidence-posthog: null`. The product that promises to close evidence loops has not closed one. This is the central credibility problem.

---

## Code Quality & Complexity

### The good

The code quality is high at the component level. `src/lib/utils/color.ts` (oklch conversion pipeline) is a rigorous, well-implemented utility. The TypeScript is clean. The use of oklch as the internal color standard (ADR-002) shows real engineering discipline.

The architecture choices are sound: App Router with route groups, server components where they belong, streaming APIs for real-time feedback. The token pipeline (`npm run tokens` → `tokens.bridge.json`) is well-thought-out and reproducible.

The hypothesis contract schema is genuinely good product thinking — YAML frontmatter capturing id, ICP, variants, success criteria, decision criteria, evidence. This is a real primitive.

### The honest problems

**25,877 lines of TypeScript for a product with zero external users.** That's the central tension. The codebase is built for scale that hasn't been earned yet. Top files: `pipeline.ts` (2,146 lines), `docs.ts` (773), `components.ts` (594), `workflows.ts` (530). There's a `SystemGraph.tsx`, a `SystemGraph3D.tsx`, a `WorkflowCanvas.tsx`, a `WorkflowBuilder.tsx`.

**25 API routes.** For what is essentially a hypothesis-tracking tool with a PostHog integration and a local LLM. The API surface includes `/api/skill-chains`, `/api/workflows`, `/api/run`, `/api/runs`, `/api/bundle`, `/api/subscribe`, `/api/token-guard/runs`. This is infrastructure for a product that hasn't validated its core loop once.

**The design system workspace and the evidence loop are architecturally separate products sharing a codebase.** The `/workspace/*` canvas pages (component drift, token audit) serve the design-engineer ICP. The `contract/hypotheses/*.mdx` system, Hermes, HITL queue, and PostHog write-back serve the pre-PMF founder ICP. These are built alongside each other in the same repo, but a pre-PMF founder building with Claude Code doesn't need an oklch drift visualizer.

**The `.systemix/` state files (`agent-state.json`, `drift-history.json`, `sync-log.json`, `queue.json`, `proxy-config.json`) add local state management complexity** that a simpler architecture would put in Supabase or not persist at all at this stage.

**The meta-overhead is real.** There are docs for 10+ concepts (Hermes, HITL, drift, evidence layer, contracts, workflow atlas, hypothesis validation, quality score, instance model, figma MCPs), a `decisions/ADR.md` with 5+ ADRs, a `docs/feature/agentic-loop-thesis/` folder with discover/discuss/diverge sub-phases, a lean canvas, ICP definitions, problem validation, competitive research. All of it is excellent product thinking. But it is being managed as if this is a post-PMF product, not a product that needs one working loop and five real users.

---

## Problem-Solution Fit

### The right problem: axis (c)

The competitive analysis is thorough and correct. The genuinely uncontested space is:

**No existing product closes the loop from production measurement → structured, agent-readable, version-controlled evidence on the artifact that caused the measurement.**

PostHog knows variant B won. Your codebase does not. Your agent does not. Your next sprint does not. Six months later you're re-testing something you already know.

This is a real problem. It has past-behavior evidence (the HN thread verbatim language). It has market signal (Knapsack raised $20.8M on the adjacent "correctness" problem, leaving the "evidence" problem unaddressed). It has a technically clear gap.

### The right solution (partially built)

The mechanism — hypothesis contract → PostHog → Hermes → HITL → write-back → agent-readable — is architecturally sound and technically feasible. The MDX frontmatter format, the Ollama local LLM angle (no API key, no data leaves the machine), and the MCP server for agent context are all genuinely good ideas.

### What's misaligned

**The product is solving a problem that requires adoption momentum before it generates value.** The evidence loop is only valuable if:
- you ran an experiment and closed it with real data (requiring PostHog setup + active experimentation)
- a future decision touches the same area (requiring time and iteration cycles)
- an agent is in the loop that reads contracts (requiring Claude Code or Cursor as the dev tool)

For a pre-PMF founder who hasn't adopted this yet, the value proposition is "when you look back in three months, you'll be glad you did this." That is a future-state pitch, not a present-pain pitch. The hardest sell in product is "you won't notice this until it's too late."

**The local LLM requirement is a real setup cost.** Hermes via Ollama means the user installs Ollama, pulls a model (8B or 70B), keeps it running. For a technical founder this is a 15-minute one-time cost. But it is not zero, and it is not `npx systemix init`.

**The design system framing and the pre-PMF founder framing serve different people and confuse each other.** A founder who doesn't use Figma doesn't need Figma token sync. A design engineer who wants Figma parity doesn't need Hermes synthesizing GTM experiment results. These should be different products, or the design system features should be explicitly marked as one vertical the loop can apply to.

---

## Defining What Systemix Is (a working answer)

Here is a definition that is honest to the actual thesis and not contaminated by the earlier positioning:

> **Systemix is an agentic evidence layer.** It turns every product decision — what you tried, what you measured, what you concluded — into a structured, version-controlled file that lives in your repo, readable by the AI agents writing your next iteration. The evidence that justified a decision stays attached to the artifact that decision describes, forever, without any additional work after the decision is made.

The design system is the first vertical. The mechanism generalizes to any artifact that agents touch and humans decide about.

What makes this different from Notion, Slack, and PostHog combined (the current "solution"):
- **Structural**: frontmatter-validated schema, not prose. Agents can query it, not just read it.
- **Co-located**: the contract lives next to the code and design it describes. Not in a wiki that goes stale.
- **Closed**: evidence is written back at decision time, not retrospectively. The loop closes when the human approves — not six months later when someone remembers to update a doc.
- **Agent-readable**: the MCP server exposes contracts to Claude Code and Cursor. The agent sees prior evidence before acting, not after.

---

## Positioning Options

### Option A: Bastion Layer

Systemix maps cleanly onto Bastion's layer architecture, specifically L3 (Semantic Graph) and the Pattern Engine. Here's the honest mapping:

| Systemix primitive | Bastion layer | What it does |
|---|---|---|
| Hypothesis contract | L3 semantic graph | Every decision becomes a queryable node: what was tried, why, what it produced |
| Evidence write-back | L3 pattern engine | Temporal and sequence patterns detected from what decisions followed what outcomes |
| HITL queue | L4 The Bridge | Human approvals are the trust-ladder progression events |
| MCP server | L2 Business Profile | Any Bastion agent reads prior evidence before acting in a client context |
| Hermes | Herald (synthesis) | The synthesis engine already named — Hermes is Herald's design-system instance |

**The honest case for this:** Bastion needs a decision memory layer. Every enterprise deployment involves hundreds of decisions about workflows, agents, automations, and thresholds. Without structured evidence on each decision, every new Bastion session starts cold. Systemix's evidence loop is exactly what the "Semantic Graph" layer needs — not a generic Neo4j schema, but a battle-tested hypothesis-decision-evidence primitive.

**The honest case against:** Bastion is still in Phase 0 and working toward a cardiology POC. Positioning Systemix as a Bastion layer before Bastion has a client creates a dependency on an unshipped product. The risk is mutual lock-in: Systemix waits for Bastion to have clients; Bastion waits for Systemix to have a validated loop.

**Best path if pursuing this:** Don't integrate — converge. Run Systemix independently to prove the evidence loop works (get 10 closures). Then contribute the contract schema as Bastion's L3 decision-memory format. The integration is a Phase 2 move, not a Phase 0 one.

---

### Option B: Contractor / Freelancer Tool

A design engineer or freelance product consultant running multiple client engagements has a specific version of the evidence problem: they onboard a client, make design system decisions, deliver, and then 6 months later either the client asks "why did we choose this?" or the consultant comes back to a project they've forgotten.

**The honest case for this:** The contractor is technical, already pays for tooling, has a direct pain for "why did we do this?" questions from clients, and can absorb a 15-minute Ollama setup. The design-system framing (V1/V2) actually fits this audience better than the pre-PMF founder framing.

**The honest case against:** The market is small. Freelance design engineers number in the tens of thousands globally, not hundreds of thousands. The evidence loop value increases with team size and iteration speed — a solo contractor working on monthly retainers has slower feedback cycles than a startup running daily experiments. The "multiple client themes" copy in existing docs names this audience, but it's a niche within a niche.

**Best path if pursuing this:** Offer Systemix as a "client handoff kit" — when you finish a client project, you give them the evidence layer as part of the deliverable. The hypothesis contracts become client documentation that survives the contractor relationship ending. This is a positioning angle worth testing, but it's a distribution play, not a product identity.

---

### Option C: Client Setup System for Agentic Workflows

This is the most strategically interesting option and the least explored. The premise: when an agency, consultant, or Bastion deployment onboards a new client into an AI-native workflow, they use Systemix to:
- Initialize the hypothesis contract schema for that client
- Connect their PostHog (or analytics of choice)
- Configure Hermes with the client's domain context
- Set up the HITL workflow (who approves what)
- Define the evidence thresholds for their vertical

`npx systemix init --client=acme-corp` and you have a fully instrumented, evidence-tracking agentic system for that client. Every decision the agents make is tracked. Every experiment has a contract. Six months in, the client has a structured record of every decision made — not locked in a vendor's system, but in a git repo they own.

**The honest case for this:** This maps directly to Bastion's "Vertical Deployment Template" — the 6-step ghost-mode deployment sequence. The "assert discovery" and "business DNA snapshot" phases produce exactly the kind of context that belongs in Systemix contracts. The "pattern activation" phase (identifying automation Plays) is the Pattern Engine — and the evidence that a Play is worth activating comes from closed hypothesis contracts.

This also addresses a real gap in every agentic deployment: agentic systems are opaque. After six months, clients can't explain why the system does what it does. Systemix makes every past decision queryable.

**The honest case against:** This is a platform / infrastructure play, not a product play. It requires either (a) a services business wrapping it or (b) significant evangelism to get other consultants to adopt it as part of their delivery. It is harder to distribute than a standalone SaaS.

**Best path if pursuing this:** Pilot it internally with Bastion client deployments. Build it as Bastion's deployment kit first. If it proves valuable across 2-3 client deployments, open-source the schema and CLI and position as the de facto setup layer for agentic workflow implementations.

---

## The Verdict: What Should Happen Now

The analysis points to three distinct phases with clear gates between them.

**Phase 1 (next 60 days): Prove the loop once, externally.**

The product's credibility problem is that every hypothesis has `result: null`. Before any positioning decision matters, the evidence loop needs to close — not on your own Systemix, but with a real external user. Find one pre-PMF founder using Claude Code and PostHog. Run them through the loop. Close one experiment. Write back one frontmatter line. Get one approved HITL card. That single closure is more valuable than all the architectural sophistication currently in the codebase.

The landing page needs one change: stop streaming a different AI-generated headline every load. Pick one headline for the pre-PMF founder ICP and hold it stable long enough to measure. "Your last experiment's result is still in the repo. Your next one starts from there." Then measure.

**Phase 2 (60–120 days): 10 closures, then positioning.**

With 10 external evidence loops closed, you have real signal on:
- Which ICP actually uses it (pre-PMF founder, design engineer, or something unexpected)
- What the setup friction actually is (Ollama, PostHog config, repo integration)
- Whether the local LLM angle (Hermes) meets the 80% acceptance threshold or needs to be a hosted model
- Whether `npx systemix init` is the right entry point or if the Figma plugin is

These answers change the positioning. Don't pick Option A, B, or C before you have them.

**Phase 3 (120+ days): The positioning decision.**

If the 10 closures come from founders, pursue Option B/C (standalone tool + PLG). If they come from structured deployments (agencies, consultants), pursue Option C (client setup system). If Bastion has its first client by then, pursue Option A in parallel. These are not mutually exclusive — but they have different distribution motions and different ICP definitions.

---

## What Not to Do

These are based on the analysis above and are worth naming explicitly:

1. **Do not add more routes or features until the loop closes once externally.** The 25+ API routes and 25K lines of code are ahead of validation, not behind it.

2. **Do not run a dual-ICP landing page.** Design engineer and pre-PMF founder are different people. Pick one hero, one pain statement, one CTA. The ICP decision was already made (D3, 2026-05-07) — execute it.

3. **Do not position Systemix as a Bastion component before Bastion has clients.** Internal use is fine; public positioning as "Bastion's evidence layer" before Bastion is deployed creates confusion and mutual dependency without validation.

4. **Do not pursue the AI-generated hero for conversion.** A streaming headline is a demo, not a homepage. The hypothesis you actually want to test requires a stable stimulus. Fix the hero, then run the experiment the contracts are designed for.

5. **Do not invest in expanding the Figma MCP scope** until the PostHog write-back loop is the primary identity of the product. Figma is a data source, not the product.

---

## The Core Strength Worth Protecting

The hypothesis contract schema + HITL + evidence write-back is the right bet. The reason it is the right bet is simple: every team building with AI agents has the problem, the problem gets worse as agents get more capable, and nobody else is solving it at the artifact level. Knapsack solves it at the enterprise governance level. PostHog generates the data. Notion stores the notes. Nobody closes the loop.

The local LLM angle (Hermes/Ollama) is also genuinely defensible for 12–18 months. No design data leaves the machine. No API key. That unlocks a procurement conversation that cloud-native competitors cannot have.

The meta-narrative ("the product proves its own thesis — every GTM decision Systemix makes is tracked as a hypothesis contract") is a genuine positioning asset when it becomes operational. Right now it is aspirational. The moment a contract closes with external signal, it becomes real.

Systemix has something very few early products have: a thesis that holds up under pressure, a technical architecture that can prove it, and enough prior-thinking depth to know exactly what the risks are. The gap between that and a product people use is narrow — one closed loop, externally.

---

*Analysis based on full codebase review, docs/feature/agentic-loop-thesis/* discovery documents, contract/hypotheses/* running experiments, competitive research brief, beta brief, and ICP definition. Written 2026-06-11.*
