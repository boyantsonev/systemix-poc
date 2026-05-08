# Options Raw — Agentic Loop Thesis
**DIVERGE phase:** Phase 3 — Brainstorming
**Feature ID:** agentic-loop-thesis
**Date:** 2026-05-05

**IMPORTANT: This document contains generated options only. No evaluation language appears here. Evaluation happens in taste-evaluation.md.**

---

## HMW question

"How might we make every product decision start from accumulated evidence rather than accumulated opinion — regardless of who (or what) is making the next decision?"

**Validation check:**
- No embedded solution: PASS (does not say "via a contract file" or "via a dashboard")
- Outcome-oriented: PASS (accumulated evidence vs. accumulated opinion is the outcome)
- Broad enough for different approaches: PASS (doesn't presuppose file format, distribution mechanism, or ICP)
- Positive framing: PASS

---

## SCAMPER options (7 — one per letter)

### Option S: Substitute — Replace the artifact file as the evidence carrier with the agent's own memory layer

**SCAMPER lens:** Substitute — what if the core mechanism were replaced entirely?

**Core idea:** Instead of writing evidence into a structured file (DESIGN.md, hypothesis contract), evidence is stored in a persistent, queryable agent memory graph — the kind the MCP memory servers already prototype. Every agent session writes its decisions to a shared graph; every subsequent agent reads from that graph before acting. The artifact file remains pure code; the evidence layer is pure graph.

**Key mechanism:** An MCP memory server acts as the universal evidence broker. Each agent decision is a `(decision, artifact_reference, evidence, timestamp)` tuple stored in the graph. Any agent with MCP access reads the decision chain before acting on an artifact. No file modification required.

**Key assumption:** Agents will consistently be configured with the same MCP memory server, across machines, CI environments, and team members. The graph is the single source of truth; the file is not the evidence carrier.

**SCAMPER origin:** Substitute

**Closest competitor:** MCP Memory Keeper, mcp-memory-service (both prototype this pattern; neither closes the full hypothesis-to-evidence loop)

---

### Option C: Combine — Merge the hypothesis contract with the artifact it describes (the component IS the experiment)

**SCAMPER lens:** Combine — what if this job were merged with an adjacent job?

**Core idea:** The hypothesis contract and the design artifact are the same file. There is no separate `contract/hypotheses/hero-vp.mdx` — every component's DESIGN.md file IS the running hypothesis for that component. The frontmatter includes experiment state (`status: running | concluded`), variants, success criteria, and evidence. Writing a component and hypothesizing about it are the same act.

**Key mechanism:** Extend the DESIGN.md format (which Systemix adopts as its carrier per DISCOVER D5) with a full `experiments:` block in frontmatter. Every component has an open or concluded experiment attached. The `/init-experiment` command writes experiment fields into the existing component file; `/close-experiment` resolves them in place. No separate hypothesis file directory.

**Key assumption:** Every design decision is an experiment by definition. Teams will accept that their component files contain hypothesis and evidence blocks, not just token values and rationale prose. The cognitive model of "component = running experiment" must be acceptable to the design engineer ICP.

**SCAMPER origin:** Combine

**Closest competitor:** No competitor does this. DESIGN.md format is close but does not include experiment state natively.

---

### Option A: Adapt — Borrow W&B's "run" architecture for product decisions

**SCAMPER lens:** Adapt — what works well in a different domain?

**Core idea:** Directly adapt Weights & Biases' experiment tracking architecture for product/GTM decisions. A "run" in this context is any product experiment (A/B test, messaging test, feature launch). Each run logs: hypothesis, variants, metrics target, PostHog event config, start time, and result. Runs are attached to "artifacts" (components, tokens, landing page sections). The UI mirrors W&B's run comparison view. The CLI mirrors W&B's SDK: `systemix.init(run="hero-cta-color-test", artifact="--primary")`.

**Key mechanism:** W&B's architecture maps directly: hypothesis contract → run config; component → artifact; PostHog result → logged metric; evidence score → run health; HITL decision → run conclusion. The structural analogy is exact. Systemix is "W&B for product decisions."

**Key assumption:** Developers who already understand W&B's mental model will find the adaptation intuitive. The run/artifact abstraction is more familiar than the hypothesis-contract/DESIGN.md abstraction for the technical-founder ICP.

**SCAMPER origin:** Adapt

**Closest competitor:** Weights & Biases (ML domain), Braintrust (LLM eval domain) — neither covers the product/design domain

---

### Option M: Modify/Magnify — Make the evidence score the primary product surface (not the contract file)

**SCAMPER lens:** Modify/Magnify — what if the most important dimension were amplified?

**Core idea:** The evidence score (0–100) is the entire product. Every component, every token, every hypothesis has a score. The score is visible everywhere: in the CLI output, in the GitHub PR status check, in the Figma plugin badge, in the agent context. The contract file exists but is never surfaced directly to the user — it is the implementation. The score is the UX. High score = agent can trust this artifact. Low score = do not ship from this.

**Key mechanism:** The score aggregates: drift state (Figma parity), experiment age (how recent is the evidence), result quality (confidence level of the last experiment), and decision record presence (was there a HITL decision written?). The formula is public. Any score above 80 can be relied on by an agent. The score rises automatically as evidence accumulates; it decays if data goes stale or drift is detected.

**Key assumption:** A single number is the right UX for "is this artifact evidence-backed?" Teams will accept score-as-truth without needing to read the underlying contract. The score is gameable — teams must not optimize for score without generating real evidence.

**SCAMPER origin:** Modify/Magnify

**Closest competitor:** Fragments' readiness score is structurally analogous (single number for component readiness) but does not incorporate production experiment evidence.

---

### Option P: Put to other use — Position as the open standard registry for evidence-backed design decisions (the npm of design evidence)

**SCAMPER lens:** Put to other use — who else has this job? Could the solution serve them too?

**Core idea:** Systemix does not build a product — it publishes an open registry. The hypothesis contract schema and the DESIGN.md evidence extension are published as open specifications on a public registry (analogous to npm for packages, or OpenAPI for REST APIs). Any tool (Storybook, Knapsack, Figma, v0) can publish and consume evidence records. Systemix's business is hosting the registry and building the reference runtime. The moat is the standard, not the tool.

**Key mechanism:** A public registry URL (e.g., `registry.systemix.dev`) hosts evidence records: `GET /evidence/{component-id}` returns all experiment records for that component. Any agent, any tool, any CI pipeline can query it. Publishing evidence requires authentication; consuming it is open. Systemix's CLI is the canonical publisher; the registry is the canonical consumer surface. Think: the "npm install" of product evidence.

**Key assumption:** Tool fragmentation in the design system space is permanent. No single tool will own all three axes (contract format, drift detection, evidence write-back). A neutral registry that any tool can write to and any agent can read from is more durable than a vertically integrated tool. This is the GitHub/shadcn playbook: own the format and registry; let others build the editors.

**SCAMPER origin:** Put to other use

**Closest competitor:** No equivalent exists. The closest structural analogy is npm (package registry as the neutral layer below all package managers) or the CDISC standards body (evidence format as the neutral layer below all clinical trial tools).

---

### Option E: Eliminate — Remove the structured file entirely; make the evidence layer a pure annotation on the git commit

**SCAMPER lens:** Eliminate — what if we removed the most complex part?

**Core idea:** No DESIGN.md file, no hypothesis contract, no frontmatter. Evidence is stored as a structured git commit annotation. Every production-validated decision produces a git note (a git annotation attached to the commit that changed the artifact) with: what changed, why, what experiment concluded, what the evidence was, what the HITL decision was. Agents read git notes alongside the codebase. The evidence travels with the code history, not in a parallel file.

**Key mechanism:** `git notes add` attaches structured JSON to any commit. Systemix's CLI appends evidence notes when `/close-experiment` runs: `systemix evidence attach --commit HEAD --experiment hero-cta-color --result "+12% CTR at 91% confidence"`. Any agent with git access reads the notes. No new file format, no new schema, no dependency on a registry or database.

**Key assumption:** Git is the permanent record that every developer team already has. Evidence in git notes travels with the code, is version-controlled, and is accessible wherever the repo is accessible. Teams will accept git notes as the evidence layer without a dedicated UI.

**SCAMPER origin:** Eliminate

**Closest competitor:** Git history is the existing (insufficient) proxy for this. No tool currently writes structured evidence to git notes. This is the most minimal possible architecture.

---

### Option R: Reverse — Instead of writing evidence into artifacts, make artifacts declare their evidence requirements upfront (evidence-first design)

**SCAMPER lens:** Reverse — what if the workflow ran backwards?

**Core idea:** The current Systemix flow: build → experiment → write evidence back. The reversed flow: declare evidence requirements first → build to meet them → evidence accumulates naturally. Every component file begins with an `evidence-required:` block that specifies: what experiment must be run before this decision is final, what metric must be proven, what confidence level is sufficient. The product is not "evidence write-back" — it is "evidence requirement declaration." The loop closes because the requirement creates the pull.

**Key mechanism:** A `/require-evidence` command writes evidence requirements into a new component or token: `evidence-required: CTR improvement > 10% at 85% confidence on primary CTA color`. Hermes reads the requirement, connects it to a PostHog experiment config, and tracks evidence accumulation against the declared threshold. The component is marked "decision pending" until the requirement is met. Agents refuse to ship from a component with unmet evidence requirements.

**Key assumption:** Teams know what evidence they need before they know the evidence. Evidence requirements can be declared at design time, not only at decision time. This is the evidence-first design methodology — analogous to TDD (test-first development) applied to design decisions.

**SCAMPER origin:** Reverse

**Closest competitor:** No competitor does this. Acceptance criteria in Linear/Jira are the closest analog but are not evidence-typed or connected to production measurement.

---

## Crazy 8s supplements (structurally distinct from SCAMPER options)

### Option C8-1: The self-proving landing page — the site IS the experiment dashboard

**Core idea:** The Systemix landing page itself is a live hypothesis dashboard. Every positioning claim on the page is backed by a visible hypothesis contract: the hero headline is a running experiment with its current CTR, the evidence score badge is real (from Systemix's own PostHog), and visitors can see which claims have closed experiments behind them and which are still running. The product demonstrates itself by being the product. No separate "how it works" section needed — the site is the evidence.

**Key mechanism:** Every landing page component has a DESIGN.md contract committed in the repo. The evidence score badge on the site reads from live PostHog data. Visitors see: "Hero headline: 'Every component is a guess until production proves it' — Experiment running. Current CTR: 3.2%. Hypothesis: >4% CTR at 90% confidence." This is the "site is the documentation is the product is the experiment" thesis made literal and visible.

**Key assumption:** Transparency about the experiment state of the product's own positioning is a trust signal, not a liability. Visitors who understand the meta-narrative become advocates. This works for the pre-PMF founder ICP who is already running similar experiments.

**SCAMPER origin:** Crazy 8s supplement

**Closest competitor:** None. No product demonstrates its thesis by making its own GTM experiments publicly visible.

---

### Option C8-2: The HITL queue as the primary UX — evidence review is the product

**Core idea:** The primary interface is not a dashboard, not a contract browser, not a score — it is a HITL review queue. Every evidence proposal from Hermes appears as a card in the queue: "PostHog says variant B won. Here is the proposed update to the contract. Approve or reject." The entire UX is review-and-decision. The contract file is produced as a side effect of approving evidence cards, not as a primary artifact. This is the "Inbox Zero for product decisions" UX.

**Key mechanism:** Hermes continuously monitors PostHog for experiment significance. When a threshold is crossed, a card is generated in the HITL queue with: experiment result, proposed contract update, rationale draft, confidence level. The user approves, rejects, or modifies. Approved cards are written to the contract. Rejected cards are archived with the rejection rationale. The queue is the entire product surface — no need to know what a DESIGN.md file is.

**Key assumption:** Users want a task-based interface ("review this evidence card") rather than a file-based interface ("edit this contract"). The evidence review workflow is more intuitive than the file authoring workflow for non-engineer ICPs (ops directors, founders).

**SCAMPER origin:** Crazy 8s supplement

**Closest competitor:** Inbox Zero for email (analogous UX pattern). Linear's triage queue is structurally similar but for bugs, not evidence.

---

### Option C8-3: CLI-first, zero-UI architecture — the MCP server is the entire product

**Core idea:** No web dashboard. No landing page app (beyond marketing). The entire product is a CLI and an MCP server. `npx systemix init` installs the MCP server and CLI. All interactions happen inside Claude Code or Cursor via slash commands. The evidence score is a CLI output. The hypothesis contract is a file in the repo. The HITL decision is a CLI prompt. This is the minimal viable architecture: ship nothing that isn't the core loop.

**Key mechanism:** MCP server exposes: `get_evidence(component_id)`, `propose_evidence_update(component_id, evidence)`, `approve_evidence_update(proposal_id)`, `get_evidence_score(component_id)`. CLI exposes: `/init-experiment`, `/write-variants`, `/close-experiment`, `/evidence-pull`. No web app required. Evidence contracts are files in the repo. Deployment is `npx systemix init` — no account, no signup.

**Key assumption:** The Tier 1 ICP (design engineers using Claude Code/Cursor) never wants to leave their editor. A web dashboard adds cognitive overhead and a second product surface to maintain. The MCP server already provides everything an agent needs; the CLI provides everything a human needs.

**SCAMPER origin:** Crazy 8s supplement

**Closest competitor:** shadcn/ui (zero-UI, file-in-repo, CLI-driven — the distribution pattern, not the product category)

---

### Option C8-4: The open-standard extension play — Systemix as the IETF for design evidence

**Core idea:** Systemix's product is not a tool — it is a standards body. The team writes the DESIGN.md Production Evidence Extension Specification (a named extension to Google's DESIGN.md format), publishes it as a draft RFC-style document, and invites other tools (Storybook, Knapsack, Fragments, PostHog) to implement it. Systemix ships the reference implementation. The moat is being the author of the standard.

**Key mechanism:** The specification defines: the `x-systemix` frontmatter block schema, the `Production Evidence` H2 section format, the evidence score formula, and the HITL decision record format. Any tool that writes evidence into a DESIGN.md file must conform to the spec. Systemix's CLI is the reference implementation. The specification is maintained in a public GitHub repo with a changelog and an RFC process.

**Key assumption:** The design systems community will coalesce around a shared evidence format if one is proposed by a credible author. The "author of the standard" position is durable because standards bodies are not disrupted — they are extended. CDISC in clinical trials, OpenAPI in REST APIs, and DTCG in design tokens are structural analogs.

**SCAMPER origin:** Crazy 8s supplement

**Closest competitor:** DTCG (Design Tokens Community Group) — published the W3C design token format standard that Tokens Studio, Style Dictionary, and Figma all implement. Systemix would be doing the same for evidence.

---

## Option curation — converge to 6

### Full list of options generated

1. S — Agent memory graph (evidence in graph DB, not in file)
2. C — Component-IS-the-experiment (hypothesis merged into DESIGN.md)
3. A — W&B architecture adapted (run/artifact abstraction for product decisions)
4. M — Score as the primary product surface (contract is implementation)
5. P — Open standard registry (npm for design evidence)
6. E — Git notes as evidence layer (eliminate the file entirely)
7. R — Evidence-first design (declare requirements upfront, loop closes by pull)
8. C8-1 — Self-proving landing page (site is the experiment dashboard)
9. C8-2 — HITL queue as primary UX (evidence review is the product)
10. C8-3 — CLI-first, zero-UI (MCP server is the entire product)
11. C8-4 — Open-standard extension (Systemix as the IETF for design evidence)

### Merges and eliminations

**Merge: P (open registry) and C8-4 (open standard)** — These share the same mechanism (Systemix as format/standard author rather than tool builder) and the same key assumption (community adoption of a neutral standard). C8-4 is the more precise articulation. Merge into one option: "Open Standard Play." Eliminate P.

**Merge: A (W&B adaptation) and C8-3 (CLI-first zero-UI)** — These share the mechanism (developer-first, file-based, CLI-driven) and the same key assumption (Tier 1 ICP never leaves the editor). A provides the richer architectural analogy; C8-3 provides the cleaner distribution vision. Merge into one option: "Developer-First Run Architecture." Eliminate C8-3.

**Merge: C (component IS the experiment) and R (evidence-first design)** — These share the assumption that the design artifact and the experiment are the same act. C merges the contract into the component; R declares the evidence requirement into the component. These are sequential stages of the same conceptual model. R is more radical (evidence-first is more disruptive than evidence-merged). Keep R as the stronger structural option; eliminate C as a subset.

**Remaining after merges/eliminations:**
1. S — Agent memory graph
2. M — Score as primary UX
3. E — Git notes evidence layer
4. R — Evidence-first design (evidence requirements declared upfront)
5. C8-1 — Self-proving landing page
6. C8-2 — HITL queue as primary UX
7. A (merged with C8-3) — Developer-First Run Architecture
8. C8-4 (merged with P) — Open Standard Play

**Final curation to 6:** All 8 pass structural distinctiveness. Eliminate the two least tractable given Systemix's current assets:
- Eliminate S (agent memory graph): technically sound but requires solving portability across environments — directly contradicts the "evidence travels with the artifact" insight that is Systemix's core thesis. This is the opposite of the validated whitespace.
- Eliminate C8-1 (self-proving landing page): this is a *tactic* within any of the other options, not a standalone strategic direction. It is the dogfood mechanism, not the product direction.

**Final 6 curated options:**

| # | Name | SCAMPER origin |
|---|------|---------------|
| 1 | Developer-First Run Architecture | A + C8-3 |
| 2 | Score as Primary UX | M |
| 3 | Git Notes Evidence Layer | E |
| 4 | Evidence-First Design | R |
| 5 | HITL Queue as Primary UX | C8-2 |
| 6 | Open Standard Play | P + C8-4 |

---

## Curated 6 — final options with full format

### Option 1: Developer-First Run Architecture

**Core idea:** A user experiences Systemix entirely through their editor and CLI. `npx systemix init` creates a `.systemix/` directory with a runs manifest. Every experiment is a "run" (analogous to W&B's run concept): `systemix run start --hypothesis "darker primary converts better" --artifact "--primary" --event "cta_click"`. When PostHog reaches significance, `systemix run close --run hero-cta --result "+12% CTR"` writes evidence into the component's DESIGN.md. No web app required at any step. The MCP server serves run history to agents.

**Key mechanism:** The run/artifact abstraction maps W&B's proven architecture onto product decisions. Runs are structured JSON files in `.systemix/runs/`. The MCP server indexes all runs and serves them when an agent accesses a component. The evidence score is a CLI output (`systemix score --component Button`). HITL happens as a CLI prompt at run close time.

**Key assumption:** The Tier 1 ICP (design engineers using Claude Code/Cursor) will adopt a tool that lives entirely in their editor workflow. They do not want a second SaaS tab.

**SCAMPER origin:** A (Adapt — W&B architecture) + C8-3 (Crazy 8s — CLI-first)

**Closest competitor:** W&B (ML domain), shadcn/ui (distribution pattern), Braintrust CLI (LLM eval domain)

---

### Option 2: Score as Primary UX

**Core idea:** A user experiences Systemix as a number: the evidence score (0–100) per component. The score appears everywhere — in the CLI, in the GitHub PR check, in the Figma plugin badge, in the agent context header. The contract file is the implementation; the score is the interface. A design engineer sees "Button Primary: 87" in their PR status and knows the contract is agent-ready. A component below 60 blocks the PR. The score rises as evidence accumulates; it decays when data goes stale.

**Key mechanism:** The score formula is public and deterministic: drift state × 0.3 + experiment age factor × 0.2 + result confidence × 0.3 + decision record presence × 0.2. Any tool that reads DESIGN.md can compute the score independently. Systemix's CLI computes and caches it; the MCP server serves it; the GitHub Action enforces it in CI.

**Key assumption:** A single number is the right cognitive load reduction for "should I trust this artifact?" Teams will adopt score-as-gate without needing to understand the underlying contract. The score must be gaming-resistant (teams will not manufacture fake experiments to raise the score).

**SCAMPER origin:** M (Modify/Magnify — amplify the evidence score)

**Closest competitor:** Fragments' readiness score, Systemix's own GIGO score (both single-number readiness metrics, neither incorporate production evidence)

---

### Option 3: Git Notes Evidence Layer

**Core idea:** A user experiences Systemix as a git workflow extension. No new file format. When an experiment concludes, `systemix evidence attach` writes a structured git note to the commit that changed the artifact: `{experiment: "hero-cta-color", result: "+12% CTR", confidence: 0.91, decided: "promote", timestamp: "2026-05-01"}`. The git history is the evidence layer. Any agent with `git log --notes` access reads the full decision chain. The repo IS the evidence database.

**Key mechanism:** Git notes (`git notes add -m "..."`) attach arbitrary metadata to any commit without modifying history. Systemix writes structured JSON to notes at experiment close time. The MCP server reads notes alongside the file tree and serves them to agents as part of component context. No new dependencies beyond git itself.

**Key assumption:** Git is already the permanent shared record for every developer team. Evidence in git notes travels wherever the code travels — across machines, CI environments, and team members — without additional infrastructure. Git notes are already supported by GitHub, GitLab, and Bitbucket.

**SCAMPER origin:** E (Eliminate — remove the contract file, use git's existing infrastructure)

**Closest competitor:** Git history is the existing (insufficient) analog. No tool currently writes structured evidence to git notes.

---

### Option 4: Evidence-First Design

**Core idea:** A user's first action when creating a component is not writing the code — it is declaring the evidence requirement. `systemix require --component Button --evidence "CTR improvement > 10% at 85% confidence on primary CTA"`. The component is marked "decision pending" until the requirement is met. Hermes connects the requirement to a PostHog experiment. Evidence accumulates against the declared threshold. The component is "evidence-ready" when the requirement is satisfied. This is TDD applied to design decisions: declare the test before writing the code.

**Key mechanism:** The `evidence-required:` frontmatter block creates a pull mechanism instead of a push mechanism. Hermes monitors PostHog for events matching the declared metric. When the threshold is reached, Hermes proposes the evidence update and closes the requirement. Agents refuse to modify a component with unmet evidence requirements (the way a test suite refuses to pass with failing tests).

**Key assumption:** Teams are willing to think about evidence requirements at design time, not just at decision time. Evidence-first requires a shift in the design workflow — the evidence requirement is the design intent, not an afterthought. This is more disruptive to existing workflow than any other option.

**SCAMPER origin:** R (Reverse — declare requirements upfront; loop closes by pull, not push)

**Closest competitor:** TDD (test-first development) as a workflow analogy. Acceptance criteria in Jira/Linear are the closest adjacent product, but neither is evidence-typed or connected to production measurement.

---

### Option 5: HITL Queue as Primary UX

**Core idea:** A user experiences Systemix as an inbox. Every Hermes evidence proposal appears as a card: "PostHog says variant B won. Here is the proposed contract update. Approve / Reject / Modify." Approvals write to the contract. Rejections are archived with rationale. The queue is the entire UX — no contract browser, no score dashboard, no file editor. Users who do not know what DESIGN.md is can still make evidence-backed decisions.

**Key mechanism:** Hermes monitors PostHog continuously (or on a schedule). When an experiment reaches significance, a card is generated with: experiment result, proposed contract diff, Hermes rationale, confidence level. The card routes to the queue. The user's entire Systemix workflow is: open queue → review card → approve/reject → done. The contract is a side effect, not the interface.

**Key assumption:** The primary UX friction is not evidence generation or evidence storage — it is the review step. Making the review step as frictionless as "Inbox Zero" will drive adoption better than making the file format beautiful. Non-engineer ICPs (ops directors, founding engineers) are more comfortable with a card queue than with a contract file.

**SCAMPER origin:** C8-2 (Crazy 8s — HITL queue as primary surface)

**Closest competitor:** Linear's triage queue (structurally analogous UX pattern for issue review), Gmail (Inbox Zero as the mental model)

---

### Option 6: Open Standard Play

**Core idea:** Systemix's product is a specification, not a tool. The team publishes the "DESIGN.md Production Evidence Extension" as an open standard (draft RFC format, GitHub repo, changelog, versioning), invites Storybook, Knapsack, Fragments, and PostHog to implement it, and ships the reference runtime as the open-source implementation. The business is hosting the registry and building the toolchain for the standard. The moat is being the author of the format — not the author of the best tool.

**Key mechanism:** The specification defines: the `x-systemix` frontmatter block schema (or a more neutral name: `x-evidence`), the `Production Evidence` H2 section format, the evidence score formula, and the HITL decision record format. Any DESIGN.md-aware tool that adopts the spec can read and write evidence records. Systemix's MCP server queries any DESIGN.md file conforming to the spec, regardless of which tool authored it.

**Key assumption:** The design systems tooling space will fragment permanently across specialized tools (Storybook for stories, Fragments for drift, Knapsack for enterprise governance). A neutral evidence format that any tool can implement is more durable than a vertically integrated tool that competes with all of them. This is the OpenAPI or DTCG playbook applied to design evidence.

**SCAMPER origin:** P (Put to other use — serve the entire ecosystem, not just Systemix's ICP) + C8-4 (Crazy 8s — Systemix as the IETF for design evidence)

**Closest competitor:** DTCG (W3C design token format), OpenAPI (REST API spec), CDISC (clinical trial data standard), npm registry (package registry as neutral standard layer)

---

## Diversity test — each of the 6 options

| Option | Different mechanism? | Different assumption about user behavior? | Different cost/effort profile? | PASS |
|--------|---------------------|------------------------------------------|-------------------------------|------|
| 1 Developer-First Run | CLI + file-in-repo run architecture | Users never leave the editor | Low cost (no web app) — engineer build | PASS |
| 2 Score as Primary UX | Deterministic score computation + CI gate | Single number is sufficient cognitive interface | Low cost (computation only) — score formula | PASS |
| 3 Git Notes Layer | Git notes annotation system | Git is the universal evidence layer already | Minimal cost (git CLI wrapper) — near zero infra | PASS |
| 4 Evidence-First Design | Pull mechanism via declared requirements | Teams think about evidence before building | Medium cost (requirement declaration workflow) — workflow change | PASS |
| 5 HITL Queue UX | Card queue + Hermes monitoring pipeline | Review step is the primary friction point | High cost (queue UI, Hermes pipeline) — web app required | PASS |
| 6 Open Standard Play | Specification + registry + reference runtime | Fragmentation is permanent; neutral standard wins | Very high cost (community management + registry infra) — org not tool | PASS |

All 6 options pass the 3-point diversity test. No two options share the same mechanism, assumption, and cost profile.

---

## Eliminated options

| Option | Elimination reason |
|--------|-------------------|
| S — Agent memory graph | Contradicts validated whitespace: evidence in a graph DB is not co-located with the artifact — it recreates the disconnected-systems problem Systemix exists to solve. Merged with insight into the competitive research section. |
| C — Component IS the experiment | Merged into Option 4 (Evidence-First Design) as the less radical formulation of the same conceptual model. |
| C8-1 — Self-proving landing page | A tactic within any of the other options (specifically Option 1 or 5), not a standalone strategic direction. Valid execution tactic; not a product direction. |
| P — Open registry | Merged with C8-4 into Option 6 (Open Standard Play) — these are the same mechanism at different levels of articulation. |
| A (pure) — W&B adaptation | Merged with C8-3 into Option 1 (Developer-First Run Architecture) — the run architecture and the CLI-first distribution are the same direction. |
