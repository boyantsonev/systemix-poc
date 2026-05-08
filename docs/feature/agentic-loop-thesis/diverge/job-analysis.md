# Job Analysis — Agentic Loop Thesis
**DIVERGE phase:** Phase 1 — JTBD Analysis
**Feature ID:** agentic-loop-thesis
**Date:** 2026-05-05
**Input:** DISCOVER wave artifacts (wave-decisions.md, problem-validation.md, lean-canvas.md, opportunity-tree.md), beta brief, copy spec (FINAL)

---

## 1. Raw request (verbatim)

"Think of the whole project as an agentic learning loop experiment — an agentic loop workflow with HITL — the site is the documentation and the product and the experiment itself. Systemix builds itself by running experiments, measuring, learning, iterating on hypotheses. This is the final goal. Like mini Google DeepMind for AI-assisted hypothesis validation. Because with AI/LLM/generative AI — SaaS products will come to an end, there will be rise in pitching for exact problem solving, hypothesis validation, pitch decks etc. Startup culture is changing to building the right thing and solving the right problem not 'how'."

**DISCOVER JTBD (starting point):**
"When I make a product decision informed by evidence, help me ensure that evidence stays permanently attached to the artifact it justified — so the next decision, by me, my team, or an agent, starts from known ground."

---

## 2. Job extraction — 5-Why chain

**Starting point:** DISCOVER JTBD (already at operational level, needs elevation to strategic/physical)

**Why does evidence need to stay attached to the artifact it justified?**
"Because context switches — time, team changes, model context windows — sever the link between the decision and the data that made it."

**Why does severing that link matter?**
"Because the next decision maker (human or agent) acts as if nothing was ever learned — repeating experiments, undoing validated choices, accumulating compounding error."

**Why does compounding error matter more now than five years ago?**
"Because the decision-making cycle has accelerated. Agents execute in hours what humans executed in weeks. Each cycle's error now compounds at agent speed, not human speed."

**Why does agent speed change the calculus?**
"Because agents can't call Slack to ask 'what did we learn last time?' — they read the artifact and act. If the artifact doesn't carry its evidence, the agent acts from zero regardless of how much was learned."

**Why is this the constraint — not the generation of evidence itself?**
"Because generating signal is now cheap (PostHog, Statsig, LLM evals all produce signal continuously). Converting that signal into a durable, actor-readable claim at the moment of decision — that is the step nobody has automated."

**Job at physical/strategic level:**
"Convert ephemeral production signal into a durable, actor-readable claim, permanently co-located with the artifact it describes, at the moment a decision is made."

**Disruption check:** Is there a higher-level job that would make this entire job unnecessary?
"Yes: if agents developed perfect recall of every experiment they participated in, without any external write-back mechanism, this job disappears. This is theoretically possible (persistent agent memory at the model layer) but architecturally not where current agentic systems (Claude Code, Cursor) are built. The job is real for at least the 2–5 year window before model-layer memory is sufficiently reliable and portable."

---

## 3. Job statements

### Functional job
"When a product decision is made based on measured evidence, convert that evidence into a structured, co-located claim attached to the artifact the decision describes — so any subsequent actor (human or agent) reads the artifact and acts from the full decision chain, not just the current value."

### Emotional job
"Feel confident handing off a decision — to the next sprint, the next team member, or an AI agent — knowing the context that justified it will still be there and will be read before anything changes."

### Social job
"Be seen as a team that learns and compounds — not one that repeatedly re-discovers the same lessons. The artifacts prove we iterate from evidence, not opinion."

---

## 4. Tension resolution: evidence permanence vs. decision quality vs. agentic trust

The DIVERGE brief names three candidate interpretations of the job:
- **Evidence permanence** — the artifact carries its history
- **Decision quality** — the next decision is better
- **Agentic trust** — agents read verified ground truth

Resolution: these are not competing jobs. They are the **same job at three consecutive zoom levels**:

| Zoom | What the job describes | Who it serves |
|------|----------------------|---------------|
| Mechanism | Evidence is permanently co-located with the artifact | Any implementation (human or agent) |
| Outcome | The next decision is higher quality because prior evidence is accessible | The human making the next call |
| System | Agents read verified ground truth and act correctly | The agentic workflow as a whole |

The job at the physical level is the **mechanism**. Evidence permanence is the mechanism. Decision quality is the outcome it enables. Agentic trust is the system property it produces.

**The job statement is about the mechanism.** The other two are consequences, not jobs.

---

## 5. ODI outcome statements

Format: [Direction] + [Metric] + [Object] + [Context]

**ODI-1 (Primary — highest opportunity score from DISCOVER OPP-1: 16):**
Minimize the time it takes to retrieve the rationale and evidence behind a prior product decision when a related decision must be made.

**ODI-2 (Architectural whitespace — DISCOVER OPP-2: 14):**
Minimize the likelihood that an experiment result exists in one system while the artifact it describes exists in a separate, disconnected system with no link between them.

**ODI-3 (Agent-native growth vector — DISCOVER OPP-3: 14):**
Minimize the likelihood that an AI agent acts on an artifact without awareness of the experiments and decisions that produced it.

**ODI-4 (Automation of the closing moment — DISCOVER OPP-4: 12):**
Minimize the effort required to record a product decision and its evidence at the moment the decision is made.

**ODI-5 (Loop integrity over time):**
Minimize the likelihood that a previously validated decision is unknowingly overridden by a subsequent action (human or agent) without access to the prior evidence.

**ODI-6 (Meta-loop credibility):**
Minimize the time it takes to demonstrate to any external observer that the product's own positioning decisions are tracked, evidenced, and iterable — not asserted.

---

## 6. Opportunity candidates — which outcomes appear most under-served

From DISCOVER opportunity tree scores (estimated, not interview-validated):

| Outcome | Importance est. | Satisfaction est. | Score | Status |
|---------|----------------|-------------------|-------|--------|
| ODI-1: Evidence retrieval speed | 9/10 | 2/10 | 16 | Under-served — primary |
| ODI-2: Result-artifact disconnection | 8/10 | 2/10 | 14 | Under-served — architectural whitespace |
| ODI-3: Agent acting without experiment history | 8/10 | 2/10 | 14 | Under-served — growing urgency |
| ODI-4: Decision recording effort | 7/10 | 2/10 | 12 | Under-served — automation opportunity |
| ODI-5: Prior decision override risk | 7/10 | 3/10 | 11 | Under-served |
| ODI-6: Meta-loop credibility | 6/10 | 1/10 | 11 | Under-served — narrative moat |

**Note:** All scores are estimated from secondary research (HN signals, competitor funding, competitive gap analysis). G1 formally requires 5+ interviews. Scores carry ESTIMATED flag pending interview validation.

**Primary opportunity for brainstorming:** ODI-1 through ODI-4 are the core mechanism. ODI-6 is the meta-narrative opportunity that makes Systemix's GTM itself the proof case.

---

## Gate G1 evaluation

| Criterion | Status | Notes |
|-----------|--------|-------|
| Job at strategic or physical level | PASS | Physical level: "convert ephemeral production signal into a durable, actor-readable claim, co-located with the artifact, at the moment of decision" |
| No feature references in job statement | PASS | Job statement describes mechanism (convert, co-locate, durable claim) — not implementation |
| Minimum 5 ODI outcome statements | PASS | 6 ODI statements produced |
| Opportunity candidates identified | PASS | Top 3 exceed threshold score of 12 |

**G1 status: PASS** (conditional — all scores ESTIMATED, interview validation required)
