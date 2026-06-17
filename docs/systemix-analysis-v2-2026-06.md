# Systemix — Analysis v2
**Date:** 2026-06-11  
**Based on:** GitHub `origin/main` (commit `8a98b8a`) + v1 analysis  
**Focus:** What changed, what to keep, what to cut, and the clean v2 positioning

---

## What Changed Since v1 (the honest delta)

Every major weakness in v1 has been addressed. This is not a small iteration.

**Fixed: the streaming AI hero.** The new headline is stable and ICP-specific: *"You ship every day. Your system should learn every day too."* The meta-tag says it cleaner: *"Ship daily. Learn daily."* Both are testable, both speak to the pre-PMF founder, and neither changes on every load. The two running hero hypotheses can now actually close.

**Fixed: `npx systemix init` is real.** There's a `packages/cli/` directory, 20 acceptance tests (0 skipped), and a surfaces wizard that installs either design-system skills, hypothesis-validation skills, or both. The CTA now points to something that works.

**Fixed: PostHog is wired.** The `/ingest` reverse proxy bypasses ad blockers. There's a mutation test suite (82% score, up from 46%). A GitHub Actions workflow runs daily at 07:00 UTC, pulls landing engagement, writes it back to `contract/engagement/landing.mdx`, and opens a PR for human review. The evidence loop is mechanically closed. The engagement contract shows 0 visitors right now — but that's honest signal, not a null. The plumbing is real.

**Fixed: ICP is locked.** Every surface now says pre-PMF founder. The design-engineer framing is retired from the hero.

**Fixed: the contract model is coherent.** The hierarchy — Contract → Goals → Hypotheses → Evidence → Memory — is fully specified, implemented, and navigable. The "self-builds itself" claim is no longer aspirational: every GTM decision is tracked as a goal with pre-registered success criteria. The public `/contract` surface IS the demo.

**Fixed: autonomy is mechanical.** The `hermes.autonomy` field in `systemix.config.yaml` controls what the engine can write without human approval. Ghost/assisted/autonomous isn't a roadmap — it's config today, enforced by `src/lib/contract/write-policy.ts` with 98 lines of tested policy logic.

**Net from v1 → v2:** the proof problems are gone. What remains is a complexity problem and a positioning opportunity.

---

## The Complexity Problem (what still needs cutting)

The codebase and concept set are still carrying layers from all three thesis iterations. Now that the contract model is the clear winner, everything else needs to be evaluated against it.

### Concepts to retire or merge

**"Evidence layer"** as a named concept — it was the v2 positioning slogan. The concept is now just how the system works, not a product identity. The word "evidence" is good and should stay in the UI (evidence-posthog, evidence score, VerdictStrip) but "evidence layer" as a pitch doesn't need its own doc page.

**"Drift detection"** as a headline feature — it was the v1 product. It still lives in `content/docs/concepts/drift.mdx` and appears in the `/contract/tokens/*` records. It's still a valid *record type* but it's not a positioning claim. Demote it to an appendix, stop leading with it.

**"Design system" as a primary frame** — the contract model handles the design system as one of five goal types (`goal-type: design-system`). It's not gone; it's in its right place. But the nav, the docs intro, and the concept hierarchy should no longer lead with it. Route `/design-system` redirects to `/contract` — the IA migration already specifies this.

**"HITL"** as a named concept — Human-in-the-Loop is jargon. The user-facing name is already better: *the decision queue*. The four inbox verbs (Approve / Edit / Reject / Respond) from LangSmith are the right vocabulary. Keep the mechanics, drop the acronym from documentation.

**"Hermes"** the name is fine — it's the agent. But the docs shouldn't require understanding what Hermes is before understanding what Systemix does. Hermes is an implementation detail that becomes interesting after the concept is clear.

**The "Atlas" name** — per your note, retire it. The concept (persona-filtered map of agent workflows, each step typed by pattern) is genuinely good and should stay. The name just needs to go. Candidate replacements: **Workflows**, **Runs**, **Playbook** — the spec already has the right vocabulary (`pattern: chain | routing | parallelization | orchestration`, `kind: input | agent | human | tool | output`). Call it the **Workflow library** in docs and nav.

### Code to evaluate for removal

The following exist in the current repo but don't serve the contract model as the primary surface. Each needs a decision:

- `src/components/graph/SystemGraph3D.tsx` — **keep and promote** (see Strengths section)
- `src/app/(app)/design-system/*` — **redirect to /contract**; the workspace canvas is superseded
- `src/components/pipeline/WorkflowBuilder.tsx` — evaluate: is this the workflow authoring UI or is it the old pipeline builder? If the latter, retire it
- `src/lib/data/pipeline.ts` (2,146 lines) — this is the original skill definitions file. Most of these skills are now CLI-level (`packages/cli/`). The file should be audited for what's actually used vs. what's legacy
- `src/app/atlas/*` — keep the concept, rename the route to `/workflows` or `/runs`
- Mock data files (`src/lib/data/mock-projects.ts` — already deleted in origin/main, good)

---

## What to Keep and Why

### 1. The 3D Force Graph + Side Panel

`SystemGraph3D.tsx` (314 lines) and `SystemGraph.tsx` (617 lines) are the most underutilized asset in the codebase. The force graph renders the instance topology — agents, surfaces, workflows, signals — as a live spatial map. This is the right visualization for "an engine running your goals."

**What it should become:** The instance view. When you open `/config`, you see the force graph of your running instance — nodes for each agent, each goal, each active workflow — with status encoded as color/opacity (ghost = grey, running = bright, errored = red). Click a node: the side panel slides open showing the relevant contract page, the pending decisions for that goal, the last run's reasoning trace. This is a control panel that doesn't look like a control panel.

The pattern from the competitive scan is relevant here: Cognition/Devin's session permalink (every unit of work is shareable cold), GitHub Copilot's mission control overlay (reasoning-visible, not just actions). The force graph is the spatial version of that — you can hold the whole system in your peripheral vision while drilling into one node.

**Why it's a UI moat:** Knapsack uses a list. Fragments uses a list. LangSmith uses a table. A live spatial graph where the topology IS the understanding is genuinely different interaction design. It's not decoration — the spatial layout encodes relationships that a list destroys (which agent owns which workflow, which goals are connected, which signals feed which hypotheses).

**The side panel extension:** every node in the graph should open a consistent side panel with three sections: (1) current status + last action, (2) pending decisions for this node, (3) a link to the full contract page. This collapses the navigation into spatial interaction — you never leave the graph to understand the system.

### 2. The Workflow Library (ex-Atlas)

The concept from the Atlas spec is the right architecture: declarative workflow contracts in `contract/workflows/*.mdx`, with frontmatter that defines persona, pattern, steps, and edges. The `npx systemix atlas build` command generates the catalog. The renderer is client-agnostic — client-specific data is just the `contract/workflows/` directory.

**Why this matters for the engine framing:** the Workflow library is the engine's skill set — what it knows how to run. For a founder installing Systemix, the library shows them the menu of agent-driven tasks available to them. For a client deployment (Bastion context), the library is configured per-vertical: a cardiology deployment has `patient-context-update`, `care-plan-draft`, `insurance-pre-auth`; a GTM deployment has `landing-variant`, `onboarding-step`, `pricing-experiment`.

The four workflow patterns (`chain`, `routing`, `parallelization`, `orchestration`) are the right vocabulary — they match Anthropic's "Building Effective Agents" framework and will be understood by any technical founder using Claude Code.

**Rename to:** `/workflows` or `/playbooks`. Keep the `contract/workflows/*.mdx` structure exactly as spec'd.

### 3. The Docs

The Fumadocs integration with the in-app `/system` (now `/contract`) layer is solid. The concept pages have good bones — they just need to be rewritten to match the simplified concept set. Keep: the docs architecture, the dual-source setup (marketing docs at `/docs`, contract reference at `/contract`), the role chooser.

The zero-base research on the "Contract" surface is excellent writing guidance. The house style rules belong in a brief somewhere:
- No naked percentages ("+38% relative (3.1%→4.3%) · 2,114 sessions · 14 days")
- Attribute agency precisely ("Hermes proposed; Boyan approved 2026-06-09")
- Decisions are past-tense events with consequences
- Pre-register falsifiability before evidence arrives
- Publish the losers alongside the winners

### 4. The Contract Model Itself

The hierarchy (Contract → Goals → Hypotheses → Evidence → Memory) is clean and correct. The autonomy dial is the right abstraction. The write policy being mechanical (not prose) is the right engineering choice.

The "glass contract" insight from the research is genuinely differentiating: the public `/contract` surface lets a prospect watch a live instance mid-run — real goals, real hypotheses, real decisions pending. Nobody in the competitive landscape does this. Braintrust has case studies. LangSmith has an operator console. Langfuse has a shared demo project (closest analog). None of them expose the *reasoning* behind decisions with provenance, in a public-readable format, for a live production instance.

The demo IS the product. Keep everything that makes that true.

---

## The v2 Definition: Engine for Agentic Workflows

The v1 definition was: *"an agentic evidence layer."* That's accurate but inside-out — it describes the mechanism, not what the user gets.

The v2 definition, based on everything that's been built:

> **Systemix is an engine you give goals to.**
>
> You install it into your repo, write a contract — the brief, the goal, what success looks like, what failure looks like — and the engine runs agent workflows to pursue it. It ships variants, reads signals (PostHog, Vercel, Figma), synthesizes evidence with a local LLM, and brings you the decisions. Every result is written back into the contract. The engine that starts in ghost mode — proposing everything, writing nothing alone — earns autonomy as the evidence accumulates.

What changes vs. v1:
- **"Goals" replaces "hypotheses"** as the top-level noun a prospect hears. Hypotheses are what the engine generates to pursue goals. Goals are what humans give.
- **"Workflows" replaces "skills"** as the vocabulary for what the engine knows how to run. More legible, maps to the spec.
- **"Contract" replaces "evidence layer"** as the output artifact. The contract is the thing you end up with — a version-controlled record of what was tried, what worked, and why, readable by the next agent.
- **The autonomy arc is the product arc** — ghost today, autonomous over time. This is more honest than promising full automation on day one and more compelling than "just a sync tool."

---

## The Three Surfaces (simplified from current nav)

Current nav is still carrying too many destinations. After the cuts above, there are three surfaces. This is the right nav:

**Config** — the instance home. Force graph of the running topology. Decision queue. Runtime feed. Autonomy dial. This is where you operate the engine.

**Contract** — the living record. Everything the engine has done, learned, and decided. Public-readable for prospects. Operator-editable for the team. The sales demo is the same URL as the product.

**Workflows** (ex-Atlas) — the library of what the engine can run. Persona-filtered. Pattern-typed. Prototype screens attached to steps. This is where you see the menu and configure new goals.

Three nouns, three pages, one model. Everything else is a sub-page of one of these three.

The Docs site (`/docs`) is the fourth destination but it's a separate concern — it explains the engine to someone installing it for the first time. It doesn't compete with Config/Contract/Workflows in nav.

---

## The Positioning Decision

With the v2 framing, the three positioning options from v1 resolve differently now.

**As a standalone tool for pre-PMF founders (the current bet):** the landing and the contract surface are both built for this. The evidence is live (0 visitors right now, but the plumbing runs). The gap the tool fills — agents shipping things without the context of what was tried before — is real and gets worse as agent autonomy increases. This is the right primary bet.

The positioning line that fits the current landing is close to correct: *"You ship every day. Your system should learn every day too."* The sub-copy is still slightly abstract ("closes the loop the day each experiment resolves"). A sharper version: *"Every experiment your agent runs is recorded. The next one starts from what the last one proved."*

**As a Bastion deployment layer (the medium-term play):** the contract model IS Bastion's L2/L3 decision memory, just not named that yet. The `systemix.config.yaml` topology declaration (personas, agents, surfaces) maps directly to Bastion's Business Profile. The Workflow library is what Bastion's agent catalog needs — per-vertical, per-client, declarative. The autonomy dial (ghost → assisted → autonomous) is the Trust Ladder in configuration form.

The path here is: Systemix proves the loop with 10 external closures on the standalone product. The contract schema and CLI become the Bastion deployment kit. Client onboarding generates a `contract/` directory and a `systemix.config.yaml`. The Loop is Bastion's L3 made usable by non-engineers.

**As a client setup system (the freelancer/agency play):** the Atlas spec already describes this precisely: *"To make Atlas a Systemix feature, we replace one hand-authored TypeScript file with a catalog generated from the client's instance."* The same logic applies to the whole contract. `npx systemix init --client=acme-corp` sets up a client-specific contract directory, goal structure, and workflow library. The deliverable you hand a client is not a Figma file or a Storybook — it's a live engine running their goals. This is the highest-value version of the contractor story.

---

## The Simplification Plan

Here's the concept list before and after the cuts:

| Before | After | Action |
|---|---|---|
| Evidence layer | — | Retire as a concept name; keep "evidence" as a word |
| Drift detection | Token record | Demote to a record type, not a headline |
| HITL queue | Decision queue | Rename everywhere |
| Hypothesis | Hypothesis (under a goal) | Keep, but stop leading with it |
| Contract | Contract | Keep |
| Goal | Goal | Keep |
| Memory | Memory | Keep |
| Hermes | Hermes | Keep as agent name, not as a concept |
| Atlas | Workflow library | Rename |
| Design system surface | Design system (goal type) | Demote to goal type |
| TokenGuard | — | Merge into CLI or retire as a brand |
| Pipeline skills | Skills / Workflows | Consolidate naming |
| Autonomy dial | Autonomy | Keep |
| The Loop | The loop | Keep as informal shorthand, not a product name |

Target concept vocabulary (what a new user needs to learn, in order):
1. **The contract** — the living record you give to the engine
2. **Goals** — the outcomes you want
3. **Workflows** — what the engine runs to pursue them
4. **Evidence** — what it learns
5. **Memory** — what it keeps
6. **Autonomy** — how much it can do without you

Six nouns. That's the whole model. Every other word in the product is an implementation detail of one of these six.

---

## The Remaining Gap (honest)

The contract has 0 visitors. The GitHub Action runs daily and writes back zero. The PostHog engagement log entry for 2026-06-11 shows: *"0 unique visitors, 0 pageviews."* This is the honest state — the plumbing runs but the product hasn't been used by anyone outside the repo yet.

That's not a criticism — it's just the next step. The simplification work above (retiring redundant concepts, consolidating the nav to three surfaces, renaming Atlas → Workflows, demoting drift detection) is the prerequisite for distribution. You can't distribute a product where a new visitor has to understand 12 nouns before they understand the pitch.

After the simplification: one Show HN post with the glass contract as the demo. The landing shows the live contract with its 0-visitor engagement record and a pre-registered goal. Visitors see a product that is honest about where it is, confident about what it does, and provably running on itself. That combination is rare enough to get attention.

---

## Summary of What to Do Next (ordered)

1. **Consolidate nav to three surfaces:** Config, Contract, Workflows. Retire all other top-level routes as redirects.

2. **Rename Atlas → Workflows everywhere** — routes, CLI commands, config keys, docs. One find-replace pass.

3. **Cut the concept docs for "evidence layer" and "drift detection" as headline features.** Fold them into "records" in the Contract docs.

4. **Rename HITL to "decision queue"** across all UI copy and docs.

5. **Extend the force graph side panel** so every node click shows (a) status, (b) pending decisions, (c) link to contract page. This makes Config a spatial mission control rather than a settings page.

6. **Audit `src/lib/data/pipeline.ts`** — identify what's still referenced vs. legacy. Move live skill definitions to `packages/cli/`; delete the dead code.

7. **Get one external evidence loop closed.** Find a pre-PMF founder. Give them the CLI. Run one hypothesis. Close one experiment. The rest of the positioning strategy depends on having real receipts.

---

*Analysis v2 based on GitHub `origin/main` as of 2026-06-11. Reflects commits through `8a98b8a` (Phase E: landing + docs aligned to Contract model). Previous analysis at `docs/systemix-analysis-2026-06.md`.*
