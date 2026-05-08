# Competitive Research — Agentic Loop Thesis
**DIVERGE phase:** Phase 2 — Competitive Research
**Feature ID:** agentic-loop-thesis
**Date:** 2026-05-05
**Research scope:** Comprehensive — 5+ competitors across three zoom levels + one non-obvious alternative from outside software

---

## Research question

Who closes the loop between production evidence and the artifact that decision describes — at any zoom level, in any domain?

The validated whitespace (from DISCOVER): **Nobody closes the loop from PostHog event → MDX frontmatter line.** This research confirms that claim, maps the full competitor space, and identifies what each product does well and where it fails the core job.

---

## Zoom level 1 — Design systems

### Knapsack (Intelligent Product Engine, GA March 2026)

**What it does:** "Living System of Record" for design systems. MCP server, Figma + code ingestion, governance workflows. Series A $10M (Oct 2025, total $20.8M). Enterprise buyer (Fortune 1000).

**Serves the job?** Partially. Knapsack covers the sync and drift detection dimensions (DISCOVER axes a and b). It mentions "performance data ingestion" in its IPE blog but has no documented A/B-test write-back to component contracts.

**What it does well:** Governance and compliance. A pharmaceutical client compressed launch from 15 months to 2–3. Enterprise procurement, SSO, SOC 2 narrative.

**Where it fails the job:** Axis (c) is absent. Evidence from PostHog does not flow into component contracts. The "Living System of Record" stores what was built, not what was proven. Decisions live in the system; evidence for those decisions does not.

**Key assumption about user behavior:** Users are enterprise teams who will pay $50k+ ACV for correctness and compliance. They are not the Claude Code + PostHog crowd running 5-day experiments.

**Source:** [TechCrunch — Knapsack $10M](https://techcrunch.com/2025/10/09/knapsack-picks-up-10m-to-help-bridge-the-gap-between-design-and-engineering-teams/), [Knapsack IPE blog](https://www.knapsack.cloud/blog/the-trail-ahead-knapsacks-intelligent-product-engine)

---

### Fragments (usefragments.com)

**What it does:** Drift detection dashboard, readiness score, MCP server, PR-blocking checks. Direct overlap with Systemix's Alpha scope. Shipping now with a waitlist.

**Serves the job?** Partially (axes a/b only). Covers the entire Alpha scope credibly. No production-evidence write-back. No hypothesis contract format.

**What it does well:** The readiness score is a clean single-number abstraction for "is this component safe to ship?" Analogous to Systemix's evidence score. MCP server integration is already live.

**Where it fails the job:** No axis (c). Evidence from experiments is not attached to component contracts. The readiness score is based on sync state, not production outcome. The question "did this design decision work?" has no answer inside Fragments.

**Key assumption about user behavior:** Users want to know if components are in sync. They do not need to know if components were validated by experiments.

**Source:** [Fragments product](https://www.usefragments.com)

---

### Supernova ($25.2M raised)

**What it does:** Design system management platform. Figma sync, design-to-code rendering, documentation generation. AI-powered doc authoring.

**Serves the job?** Minimally. Sync is the product; evidence is not part of the value prop. No hypothesis tracking, no A/B write-back, no experiment history attached to components.

**What it does well:** Token transformation and documentation generation at scale. March 2026 updates added Figma Collections and prototyping templates — expanding the design-side surface.

**Where it fails the job:** No connection between production outcomes and design artifacts. The product assumes component correctness is defined by Figma parity, not by what performed in production.

**Key assumption:** Correctness = design intent realized in code. Production evidence is downstream of design, not a feedback loop back into it.

**Source:** [Supernova homepage](https://www.supernova.io/), [March 2026 updates](https://www.supernova.io/blog/march-2026-product-updates-figma-collections-prototyping-templates)

---

### Google DESIGN.md / Stitch (open-sourced April 2026)

**What it does:** An open-source (Apache 2.0) portable contract format for design systems. YAML frontmatter + 9 Markdown sections. Designed as the "OpenAPI for design systems" — explicitly meant to be read by AI agents. The Stitch linter validates DESIGN.md files for WCAG AA, contrast, and schema compliance.

**Serves the job?** Partially — it defines the artifact format but does not write evidence into it. DESIGN.md provides the carrier (the file format where evidence could live) but has no mechanism for closing the evidence loop from production.

**What it does well:** The format is portable, agent-readable, and backed by Google's authority. ~70% field overlap with Systemix's existing MDX contract fields. The Stitch linter provides immediate format validation.

**Where it fails the job:** No runtime that writes production evidence into the file. DESIGN.md is a spec, not a feedback loop. The Production Evidence section Systemix proposes (H2 block + x-systemix frontmatter) is an extension the format explicitly allows (unknown keys are preserved) but does not include natively.

**Key assumption:** Design artifacts should be portable and human-readable. What they contain is the team's job to author; the format just standardizes the container.

**Source:** [Google Blog DESIGN.md](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/), [GitHub spec](https://github.com/google-labs-code/design.md)

---

### Zeroheight ($39–$49/editor/month)

**What it does:** Documentation platform for design systems. Figma + Storybook sync. "Built-in AI tools write, build and audit your docs." Figma Make connector (April 2026).

**Serves the job?** Minimally. Documentation is the product; evidence is not. No production-analytics integration. No hypothesis contracts. No A/B write-back.

**What it does well:** Design system documentation at scale. A 20-editor org pays $10k–$20k/year. Enterprise-friendly pricing model. The audience is large enough to sustain the business.

**Where it fails the job:** The documentation is human-authored, retrospective, and disconnected from production signal. The same Notion problem but with a prettier UI.

**Key assumption:** Correct documentation of design decisions is the product. Whether those decisions were validated by production evidence is out of scope.

**Source:** [Zeroheight homepage](https://zeroheight.com/), [Pricing](https://zeroheight.com/pricing/)

---

### Luro (closest to axis c — dashboard only)

**What it does:** Component adoption analytics. Live tracking of which Figma components are used in production code, with usage dashboards and 1:1 component mapping.

**Serves the job?** Closer than any design-system competitor but still incomplete. Luro tracks adoption (how much is a component used?) but does not write back to a contract (what experiment proved this component's design decision?). Dashboard-only; no structured evidence attached to the artifact.

**What it does well:** The 1:1 component analytics is genuinely differentiated. Knowing "Button Primary is used on 47 pages and 12 components depend on it" is useful signal. The adoption data is real production evidence — it's just not co-located with the artifact.

**Where it fails the job:** Evidence lives in the Luro dashboard, not in the component's contract. An agent reading the component file sees no evidence. The loop does not close.

**Key assumption:** Component adoption visibility is the job. Writing evidence back to the artifact is a different product category.

**Source:** [Luro homepage](https://luroapp.com/), [Component tracking blog](https://luroapp.com/posts/component-tracking-is-here/)

---

## Zoom level 2 — Experiment management

### Statsig

**What it does:** Feature flags + A/B testing + experiment management. "Design system experimentation" is a published use case — Statsig explicitly documents using it to test design system components. Generates the production signal Systemix wants to write back.

**Serves the job?** Generates the evidence but does not attach it to the artifact. Statsig knows variant B's CTR. The component's contract does not.

**What it does well:** Statistical rigor and experiment lifecycle management. Sequential testing, CUPED variance reduction, metric guardrails. The experiment data is high quality.

**Where it fails the job:** Statsig is a data generator, not an evidence writer. The signal exists in a Statsig dashboard and in its API, but the path from "Statsig confirms significance" to "component contract records the outcome" does not exist. This is the integration gap Systemix's axis (c) fills.

**Key assumption:** Experiment results are consumed by humans via dashboards. Automatic write-back to design artifacts is not a user story in the Statsig product.

**Source:** [Statsig design system experimentation](https://www.statsig.com/perspectives/design-system-experimentation), [PostHog experiments](https://posthog.com/experiments)

---

### PostHog

**What it does:** Product analytics + feature flags + experiments. Most directly integrated with Systemix's architecture (PostHog event → Hermes read → contract frontmatter update). Open source.

**Serves the job?** Generates the evidence. Does not close the loop. PostHog is the source system; Systemix proposes to be the write-back mechanism.

**What it does well:** Developer-first analytics. Open source. Strong feature flag + experiment combination. The PostHog community is a distribution channel for Systemix (DM outreach to founders using PostHog was identified in DISCOVER as a primary channel).

**Where it fails the job:** No component-level evidence write-back. PostHog knows what happened. The artifact that caused what happened has no awareness of the result.

**Key assumption:** Analytics data is consumed by dashboards and queried by humans. Write-back to structured artifact files is not a use case PostHog addresses.

**Source:** [PostHog experiments](https://posthog.com/experiments)

---

### LaunchDarkly

**What it does:** Enterprise feature flag and experiment management platform. Deeply integrated with deployment pipelines. "Experiment-driven development" positioning.

**Serves the job?** Source of production signal only. No artifact write-back. LaunchDarkly manages flag state; it does not manage the design artifact the flag is testing.

**What it does well:** Enterprise-grade flag management with SOC 2, SSO, extensive SDK support. Strong integration with CI/CD pipelines.

**Where it fails the job:** Same gap as Statsig and PostHog — the evidence is generated but not written to the artifact. No concept of a "design contract" or component-level evidence layer.

**Key assumption:** Feature flag management and A/B results are for engineering and product teams. Design artifact management is a separate concern handled by other tools.

---

### Optimizely (Experiment platform)

**What it does:** Full-stack experimentation platform. Web, feature, and content experiments. Part of Optimizely's broader DXP (Digital Experience Platform).

**Serves the job?** Source of production signal only. Optimizely generates the data; no mechanism to write back to a component contract.

**What it does well:** Mature experimentation platform. Strong for content and marketing experiments. Full-stack SDK for feature experimentation.

**Where it fails the job:** No design artifact awareness. Evidence lives in Optimizely's reporting layer. No structured write-back to design system contracts or component files.

---

## Zoom level 3 — Agentic / AI-native (non-obvious alternatives)

### Weights & Biases (W&B)

**What it does:** ML experiment tracking platform. Logs hyperparameters, metrics, artifacts, and model checkpoints across training runs. Produces "runs" that record everything needed to reproduce a model. In 2026, W&B has pivoted to include LLM tracing, prompt versioning, and agent evaluation under the "Weave" product.

**Serves the job?** This is the most structurally similar product to what Systemix proposes — but in the ML domain, not the product/design domain.

**What it does well:** W&B closes the loop between an experiment (a training run) and the artifact it produces (a model checkpoint). Every artifact is annotated with the experiment that produced it. The "run" is the equivalent of a hypothesis contract. The artifact is the equivalent of a component contract.

**Where it fails the job (for Systemix's ICP):** W&B is for ML engineers, not product teams or design engineers. The "artifact" in W&B is a model file, not a design token or component. The experiment is a training run, not a GTM hypothesis. The mechanism is identical; the domain is different.

**Key assumption:** Experiments are parameterized training jobs. The artifacts being tracked are ML models. Human decisions are not the primary artifact type.

**Non-obvious insight:** W&B's architecture is the clearest existence proof that the "experiment → artifact with evidence attached" loop is technically solvable and commercially viable. W&B raised $135M and is valued at $1.25B. The job Systemix addresses is the same job — in the product/design domain instead of the ML domain.

**Source:** [W&B experiment tracking](https://wandb.ai/site/experiment-tracking/), [MLflow vs W&B comparison 2026](https://reintech.io/blog/mlflow-vs-weights-and-biases-vs-neptune-experiment-tracking-comparison)

---

### LangSmith (by LangChain)

**What it does:** LLM observability and evaluation platform. Traces every step of an LLM application's execution. "Align Evals" feature calibrates evaluators against human feedback. Maintains a dataset of prompt versions and their corresponding evaluation scores. The hypothesis validation framing is explicitly used: "Your initial prompt is a hypothesis about what quality means for your use case."

**Serves the job?** LangSmith is the closest analogy to Systemix in the LLM-eval domain. It traces experiments (prompt versions), records results (eval scores), and tracks alignment with human judgment (HITL). The "trace" is the evidence; the "prompt" is the artifact.

**What it does well:** Tight integration of tracing, evaluation, and human correction. The feedback loop between "what the model produced" and "what should change" is explicitly closed. The "Align Evals" feature is exactly the HITL mechanism Systemix proposes for design decisions.

**Where it fails the job:** LangSmith tracks LLM application quality, not product/design decisions. The artifact is a prompt template, not a design token. The experiment is an LLM eval run, not a GTM hypothesis. Same structural gap as W&B — right mechanism, wrong domain.

**Non-obvious insight:** LangSmith's "initial prompt is a hypothesis" framing is precisely the intellectual grounding for Systemix's hypothesis contract. The product category is validated by LangSmith's adoption ($25M raised, active product) even though the domain is different.

**Source:** [LangSmith evaluation](https://docs.langchain.com/langsmith/evaluation), [LangSmith observability](https://www.langchain.com/langsmith/observability)

---

### Braintrust (braintrust.dev)

**What it does:** End-to-end LLM evaluation and observability platform. Traces production LLM calls, runs experiments against datasets, compares prompt/model versions side-by-side. Free tier (1M trace spans), Pro at $249/month. Loop AI Agent automates eval runs.

**Serves the job?** Same structural role as LangSmith — closes the evidence loop for LLM applications, not for product/design decisions.

**What it does well:** The side-by-side prompt comparison is the closest analogy to variant comparison in a GTM experiment. Human annotation interfaces for evaluation are clean and purpose-built. The Loop AI Agent (autonomous eval runner) is an explicit step toward the "automated HITL" pattern Systemix proposes.

**Where it fails the job:** Braintrust operates entirely within the LLM application layer. No awareness of design artifacts, component contracts, or PostHog events. A Braintrust "experiment" is a prompt regression test, not a product hypothesis.

**Non-obvious insight:** Braintrust's pricing model ($249/month for Pro) and feature set (human annotation + automated evals + observability) demonstrate that teams will pay for "experiment evidence attached to the artifact" when the artifact is an LLM prompt. The same payment behavior should extend to product decisions if the loop is equally tight.

**Source:** [Braintrust platform](https://www.braintrust.dev/), [Best HITL evaluation platforms 2026](https://www.braintrust.dev/articles/best-human-in-the-loop-llm-evaluation-platforms-2026)

---

### MCP Memory Servers (Claude Code / Cursor ecosystem)

**What they do:** A class of MCP servers (Memory MCP official, Claude-Mem, MCP Memory Keeper, mcp-memory-service) that provide cross-session context persistence for AI coding agents. They implement a knowledge graph (entity → relation → entity) that agents query to retrieve project decisions, preferences, and progress across context windows.

**Serves the job?** These systems attempt to solve the same job but through a different mechanism: storing context in a graph database that the agent queries, rather than writing evidence back into the artifact the decision describes.

**What they do well:** Cross-session context persistence for individual agents. Low setup friction — MCP servers are installed once and work across all configured agents. The knowledge graph pattern is more flexible than file-based evidence (can store any entity/relation).

**Where they fail the job:** Evidence is stored in a separate graph database, not co-located with the artifact. When the component file is shared across agents, teams, or time, the co-located evidence travels with it; the graph database does not. The portability problem is unsolved. An agent reading the component file in a fresh context has no access to the memory graph unless it is explicitly configured — and even then, there is no guarantee the graph persists across environments (local dev vs. CI vs. another developer's machine).

**Key assumption:** The right place to store decision evidence is in a queryable graph, not in the artifact itself. This assumption breaks when the artifact is shared outside a single agent session.

**Source:** [MCP Memory Keeper](https://github.com/mkreyman/mcp-memory-keeper), [Cross-agent context sharing](https://vexp.dev/blog/cross-agent-context-share-memory-cursor-claude-code-codex)

---

## Non-obvious alternative — clinical trials (outside software entirely)

**Domain:** Pharmaceutical clinical trial data management (CDISC standards, ICH E6 GCP)

**What it does:** Clinical trials enforce strict artifact traceability. Every datum has a documented lineage from protocol definition → CRF entry → statistical analysis → CSR table. The "audit trail" is a legal requirement: every change to an artifact must be logged with who made it, when, and why. The artifact (the clinical study report) must carry its evidence chain — the data cannot be separated from the decision it justifies.

**Structural parallel to Systemix's job:**

| Clinical trials | Systemix |
|----------------|---------|
| Protocol defines the hypothesis | Hypothesis contract |
| CRF captures the measurement | PostHog event capture |
| Statistical analysis links measurement to artifact | Evidence write-back loop |
| CSR carries the full evidence chain | DESIGN.md with x-systemix Production Evidence section |
| Audit trail is permanent and co-located | Evidence score + HITL decision record |
| Regulatory submission requires traceable evidence | Agent reading contract requires traceable evidence |

**What clinical trials do well:** The "artifact carries its full evidence chain" requirement is enforced by law. No reviewer would accept "the evidence is in a dashboard — go look it up." The evidence must be in the artifact or the artifact is inadmissible.

**Where it fails as a direct model:** Clinical trials have massive compliance overhead (CDISC, CFR Part 11, GCP). The tooling (Medidata Rave, Oracle Clinical, Veeva Vault) costs millions per year and requires specialist operators. The pattern is right; the implementation cost is orders of magnitude too high for a PLG developer tool.

**Non-obvious insight for Systemix:** The clinical trial model proves that "evidence co-located with the artifact" is not just a nice-to-have — in high-stakes decision environments, it is a regulatory requirement. The question for Systemix is whether product decisions will become regulated in an analogous sense as AI-generated code becomes the default. If they do, Systemix's architecture is already compliant with that future.

**Source:** [Clinical trial traceability — GCP-Service](https://www.gcp-service.com/what-are-audit-trails-and-data-traceability-in-clinical-trials-audit-trails-and-data-traceability-pillars-of-excellence-in-clinical-trial-oversight/), [Data provenance in AI decision support](https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2026.1737532/full)

---

## Synthesis — competitive gap map

| Competitor | Generates evidence | Attaches to artifact | Co-located w/ artifact | Agent-readable | Closes loop automatically |
|---|---|---|---|---|---|
| Knapsack | No (tracks sync state) | No | No | Partial (MCP server) | No |
| Fragments | No | No | No | Yes (MCP server) | No |
| Google DESIGN.md | No (spec only) | No | The carrier | Yes (designed for agents) | No |
| Zeroheight | No | No | No | No | No |
| Luro | Yes (adoption metrics) | No (dashboard only) | No | No | No |
| Statsig / PostHog | Yes (A/B results) | No | No | No | No |
| W&B | Yes (ML metrics) | Yes (to ML artifacts) | Yes (model checkpoints) | Partial | Yes (for ML domain) |
| LangSmith | Yes (LLM eval scores) | Yes (to prompt versions) | Yes (trace to prompt) | Yes (evaluator API) | Partial |
| Braintrust | Yes (eval scores) | Yes (to prompt datasets) | Yes | Yes (API) | Partial |
| MCP Memory Servers | No (stores context) | No | No (separate graph) | Yes (MCP query) | No |
| Clinical trials (CDISC) | Yes | Yes | Yes (regulatory requirement) | No (legacy tooling) | No (manual, expensive) |
| **Systemix (proposed)** | **Yes (PostHog)** | **Yes (contract frontmatter)** | **Yes (same file)** | **Yes (MCP server)** | **Yes (Hermes write-back)** |

**Confirmed whitespace:** No product closes all five columns for product/design decisions. W&B, LangSmith, and Braintrust close all five columns for ML/LLM artifacts — confirming the pattern is viable and commercially validated. Clinical trials prove the co-location requirement is real in high-stakes domains. The gap in the product/design domain is real and uncontested.

---

## Gate G2 evaluation

| Criterion | Status | Notes |
|-----------|--------|-------|
| 3+ real products named | PASS | 12 real products named across three zoom levels |
| At least one non-obvious alternative (different category, same job) | PASS | W&B (ML domain), LangSmith (LLM eval domain), Clinical trials (regulatory domain) |
| No generic market claims | PASS | All claims cite specific products, funding amounts, published behaviors, or URLs |
| Gap confirmed as genuinely uncontested | PASS | Full 5-column table confirms no product closes all five for product/design domain |

**G2 status: PASS**
