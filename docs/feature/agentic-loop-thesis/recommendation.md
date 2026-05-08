# Recommendation — Agentic Loop Thesis
**DIVERGE output — handoff to product-owner (DISCUSS wave)**
**Feature ID:** agentic-loop-thesis
**Date:** 2026-05-05
**Scoring source:** docs/feature/agentic-loop-thesis/diverge/taste-evaluation.md

---

## Top 3 options

### Option 3: Git Notes Evidence Layer — Score 4.533

**Why it scores well:**
- T1 Subtraction: 5/5. Nothing can be removed. Git + a CLI wrapper + structured JSON. The core value (evidence co-located with the artifact, readable by agents) is delivered with the minimum possible mechanism.
- T3 Progressive Disclosure: 5/5. First interaction is one command — `systemix evidence attach`. The full depth (MCP server, agent integration, cross-repo querying) is entirely hidden until the user is ready.
- T4 Speed-as-Trust: 5/5. `git notes add` is a local git operation — instant. No network dependency for the core action. The architecture inherits git's speed and reliability without adding any new infrastructure.

**Core trade-off:** Discoverability is the sacrifice. Git notes are obscure — most developers don't know they exist, and there is no visual affordance that a commit has evidence attached. The evidence layer is invisible unless you know to look for it. This is the right property for an agent (agents read programmatically), but it creates an onboarding challenge for humans who expect a UI.

**Key risk:** The viability score is 3/5. Git notes have limited portability in certain workflows (some git hosting providers strip notes on push; shallow clones lose notes). If the Tier 1 ICP is using GitHub Actions with shallow checkouts, evidence notes may not be accessible in CI. This is a solvable engineering problem (configure `--notes` on clone; push notes explicitly) but it adds setup friction that the discoverability problem compounds.

**Hire criteria:** A pre-PMF founder who is already comfortable with git as their primary workflow tool, who wants to add evidence to their existing git history without adopting a new file format or a new web application, and who is building with Claude Code or Cursor where MCP access to git notes is trivial to configure.

---

### Option 2: Score as Primary UX — Score 4.517

**Why it scores well:**
- T1 Subtraction: 5/5. The score IS the product. Nothing can be removed without breaking the core value proposition — the score needs a computation (evidence collection), a formula (deterministic and public), a gate (PR status check), and an agent-readable output. All four elements are load-bearing.
- T4 Speed-as-Trust: 5/5. The score is computed deterministically from local file state + PostHog API. The PR gate is immediate. Every action produces an instant visible number. No blocking wait states anywhere in the primary flow.
- T2 Concept Count: 4/5. One new concept (the evidence score, 0–100) well-anchored to familiar mental models (credit score, test coverage percentage, quality gate). Maps to existing vocabulary without introducing new abstractions.

**Core trade-off:** The score is gameable. Teams who understand the formula can manufacture fake experiments or accept low-confidence results to raise the score. The score's integrity depends on the honesty of the evidence it aggregates — and there is no enforcement mechanism for evidence quality short of a trusted third-party source (PostHog, Statsig). If the evidence source is faked, the score is meaningless. This is a cultural risk as much as a technical one.

**Key risk:** The PR gate is the forcing function that creates adoption — but it is also the point of most resistance. Design engineers whose components are below 80 will push back against the gate blocking their PRs. The gate will be disabled or configured out unless there is strong team alignment on the evidence culture before the gate is introduced.

**Hire criteria:** A design-engineering team that already has a PR review culture with quality gates (Chromatic visual regression, TypeScript strict mode, test coverage thresholds), and who are willing to add an evidence threshold to their existing gate suite. The score works best in teams where the "evidence culture" is already established and the score provides a visible number for something the team was already trying to do manually.

---

### Option 5: HITL Queue as Primary UX — Score 3.767

**Why it scores well:**
- T2 Concept Count: 5/5. Zero new concepts for first-time use. A card queue is universally understood. The user sees "Hermes found evidence. Approve?" — nothing more is required for the first action. The underlying DESIGN.md contract is completely invisible at first interaction.
- T1 Subtraction: 4/5. The queue concept is clean: card → review → approve/reject. The three elements are necessary. The Hermes pipeline is invisible. Minor room for simplification in the routing logic (who sees which cards) but this doesn't affect first use.

**Core trade-off:** The queue has multiple wait points before the first card appears. Hermes must run, PostHog must reach significance, and the threshold must be crossed — before the user sees any value. For a pre-PMF founder running a 5-day experiment, the first card may arrive in a week. For a design engineer whose components are low-traffic, the first card may arrive in a month. The queue is the right UX once evidence is flowing; it is a poor onboarding experience before the first evidence event.

**Key risk:** This option requires the most complex build (Hermes monitoring pipeline + web application UI + routing logic), has the highest infrastructure cost, and the HITL card generation is the most technically novel component. The feasibility score of 3/5 reflects real build risk: SPIKE 3 (PostHog write-back) has not shipped end-to-end, and the HITL queue adds a layer on top of that.

**Hire criteria:** A founding engineer or ops director who manages experiments across multiple systems (PostHog + Slack + Notion) and wants a single inbox for "what did we learn and what should we update?" They are not primarily a design engineer — they are the person who bridges experiment results and product decisions, and they want that job to feel like email triage rather than file editing.

---

## Recommendation

**Proceed with Option 2 (Score as Primary UX) as the execution direction, using Option 3 (Git Notes Evidence Layer) as the distribution and agent-integration mechanism.**

**Rationale:**

The scoring matrix separates Options 2 and 3 by only 0.016 (4.517 vs 4.533) — within any reasonable margin of uncertainty given that all DVF scores are estimated (no customer interview data). The decision cannot be made on the matrix alone; the tiebreak is strategic.

Option 3 (Git Notes) scores higher on the matrix because of its radical simplicity and zero infrastructure cost. It is the right architecture for the evidence-co-location mechanism. However, Option 3's viability weakness is decisive: git notes are invisible, ungameable, and non-discoverable. For a product that needs to prove its thesis by demonstrating that the loop closes, an invisible mechanism cannot demonstrate anything publicly. The "site is the experiment" meta-narrative requires visibility.

Option 2 (Score as Primary UX) scores marginally lower because the score concept requires one explanation. But the score is the visibility layer the thesis needs. When a design engineer's PR is blocked because the evidence score is below 80, the loop is visibly closed — to the engineer, to the team, to any observer reading the CI log. The score is the demonstration artifact.

**The synthesis:** Build the evidence layer using git notes as the storage mechanism (Option 3's architecture — minimal, portable, no new file format required), and surface it as an evidence score as the primary UX (Option 2's interface). The git note is the write mechanism; the score is the read mechanism. These are complementary, not competing.

This synthesis is not a compromise — it is architecturally consistent. The evidence score can be computed from git notes (the source of truth) plus PostHog (the live signal). The score is the deterministic output of the git notes input. Option 3's simplicity + Option 2's visibility = the strongest possible implementation of the validated job.

**The decision for DISCUSS:** Proceed with the Score + Git Notes synthesis direction. The three non-negotiable elements are: (1) evidence stored in git notes co-located with the commit that changed the artifact, (2) an evidence score (0–100) that is computed deterministically and surfaced in PR status checks and the MCP agent context, (3) the PR gate blocks shipping from a component whose score falls below a configurable threshold (default 80). Everything else — web dashboard, queue UI, open standard work — is deferred until the first 10 external users have evidence scores above 80 on at least one production component.

---

## Dissenting case

**The dissent: Option 5 (HITL Queue as Primary UX) deserves serious consideration and was the closest alternative to the top 2.**

The dissenting argument: this product serves two ICPs (design engineers and pre-PMF founders), and they have different first interactions with the evidence layer. The design engineer is comfortable with a score gate in a PR — this is their natural workflow. But the pre-PMF founder, whose experiment cycle is measured in days and whose evidence is GTM signal (social + PostHog + founder judgment), does not have a PR workflow to gate against. The pre-PMF founder needs an inbox, not a score.

If the ICP decision (DISCOVER D3, the highest-risk unresolved decision) resolves toward the pre-PMF founder as primary, Option 5 becomes the correct direction and the Score + Git Notes synthesis is the wrong architecture. The HITL queue serves the pre-PMF founder ICP more directly; the score serves the design engineer ICP.

The scoring matrix favors Option 2+3 synthesis because Speed-as-Trust is weighted at 30% and Option 5 scores 3/5 on that criterion (the queue has wait points). If the weight on Speed-as-Trust were reduced to 20% and DVF were raised to 25%, Option 5 would score approximately 3.7 — unchanged, and the matrix order would be preserved. The dissent is not strong enough to overturn the recommendation on the basis of weight adjustment.

The dissent is recorded because: if the ICP resolution session (DISCOVER D3) confirms the pre-PMF founder as primary, the DISCUSS wave should re-evaluate Option 5 before committing to the synthesis direction. The recommendation is right for the design-engineer ICP; it may be wrong for the pre-PMF founder ICP.

---

## Decision statement for DISCUSS wave

**Proceed with the Score + Git Notes synthesis (Options 2 and 3 combined), assuming:**
1. The ICP resolution session confirms the design engineer ICP as primary for the next 90 days (or confirms both ICPs are equally valid, making the PR-gate forcing function acceptable)
2. SPIKE 3 (PostHog evidence write-back) is technically feasible within 60 days (the synthesis requires PostHog → git note → score computation to work end-to-end)
3. Git notes are not stripped by the team's CI environment (requires a 1-hour feasibility check against the actual GitHub Actions configuration)

**If assumption 1 fails** (pre-PMF founder is the primary ICP): revisit Option 5 (HITL Queue) in the DISCUSS wave before committing to the synthesis.

**If assumption 2 fails** (PostHog write-back is not feasible): the git notes mechanism still works for manual evidence attachment; the score degrades gracefully (lower score for components with no PostHog evidence); proceed with reduced scope.

**If assumption 3 fails** (git notes are stripped in CI): migrate the evidence storage from git notes to a `.systemix/evidence/` directory structure (lightweight files, same portability as the codebase, slightly higher file count overhead). The score computation logic is unchanged.

**This is not a decision to pursue both Options 2 and 3 as separate products.** The synthesis direction means: Option 3's architecture for storage, Option 2's interface for surface. They are one product.
