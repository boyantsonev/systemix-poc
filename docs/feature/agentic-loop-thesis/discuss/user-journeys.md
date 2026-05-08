# User Journeys — Agentic Loop Thesis
**DISCUSS wave — Agentic Loop Thesis**
**Date:** 2026-05-05
**Persona:** Tomas Brandt — pre-PMF founder, vibe-coding with Claude Code, running PostHog experiments

---

## Journey overview

The agentic loop thesis produces one primary journey: **the evidence loop**. It has five stages. The emotional arc moves from anxious uncertainty (what did we actually learn?) through focused review (Hermes has already done the work) to confident closure (the decision is written, the agent will see it). The loop then restarts.

```
[Install] --> [Experiment runs] --> [Hermes synthesises] --> [HITL Queue] --> [Close loop]
  Curious       Uncertain               Background               Focused        Confident
  Hopeful       Waiting                 (no action)              Decisive       Relieved

  Setup         PostHog fires           Hermes watches           Queue card     Contract
  complete      events for 5–7 days     significance             appears        written
```

---

## Stage 1: Install and first hypothesis contract

**Trigger:** Tomas is about to run a new experiment — he is rewriting his pricing page headline. He has heard about Systemix from a Show HN post and wants to try it before he runs the experiment, so the decision is captured when PostHog reports a result.

**Emotional state:** Curious, slightly skeptical. He has tried Notion for hypothesis tracking before. It did not stick.

**What Tomas does:**

```
$ npx systemix init
```

```
+-- Systemix ----------------------------------------------------+
| Initialising in /Users/tomas/founders-app                      |
|                                                                 |
| No PostHog key found.                                          |
| Set POSTHOG_API_KEY or add it to .systemix/config.yaml         |
|                                                                 |
| PostHog key loaded from env. Connecting...  done               |
|                                                                 |
| Hermes not detected. Run: ollama pull hermes3                  |
| (Skip for now -- you can add Hermes later)                     |
|                                                                 |
| Ready. Run: systemix experiment init "my-hypothesis"           |
+----------------------------------------------------------------+
```

```
$ systemix experiment init "pricing-headline-v2"
```

```
+-- New experiment: pricing-headline-v2 -------------------------+
| Hypothesis  : (enter below)                                    |
| Variants    : control / B / C                                  |
| Success     : (primary PostHog event to track)                 |
| Confidence  : 95% (default)                                    |
|                                                                 |
| Writing to: contract/hypotheses/pricing-headline-v2.md         |
+----------------------------------------------------------------+
```

Tomas fills in the hypothesis in the generated DESIGN.md file. The file is committed alongside the code change. The experiment is now tracked.

**Emotional exit:** Satisfied. This took 4 minutes. The file exists. It feels more honest than a Notion page.

**Shared artifacts created:**
- `contract/hypotheses/pricing-headline-v2.md` — the hypothesis contract, committed to the repo
- `.systemix/config.yaml` — PostHog key, confidence threshold, Hermes config

---

## Stage 2: Experiment runs (background, Tomas is not watching)

**Duration:** 5–14 days. PostHog is collecting events. Hermes is watching the PostHog API for significance.

**Tomas's role:** None. He is building other features. He checks PostHog occasionally but does not make a call — he is waiting for significance.

**What the system is doing:**

Hermes polls PostHog every 4 hours. It watches the primary event tied to the hypothesis contract (`pricing-headline-v2`). When the experiment reaches the configured confidence threshold (95%), Hermes drafts the decision card and places it in the HITL queue.

**Emotional state during wait:** Mild anxiety. He keeps checking PostHog. The numbers are moving but not significant yet. This is the same as before — Systemix has not changed this feeling yet.

**Where Systemix makes it different:** When significance is reached, Tomas does not need to be watching PostHog at that moment. The card will be waiting for him.

---

## Stage 3: HITL queue surfaces the decision card

**Trigger:** Tomas runs his morning check. He types:

```
$ systemix queue
```

```
+-- HITL Queue ------------------------------------------------+
|                                                               |
|  1 decision ready for review                                  |
|                                                               |
|  [1] pricing-headline-v2                                      |
|      Variant B: "Ship faster with evidence." (+14% signup)    |
|      Confidence: 94.3% over 8 days (n=847)                   |
|      Hermes recommends: PROMOTE                               |
|      Evidence: posthog://experiments/pricing-headline-v2      |
|                                                               |
|  (r)eview  (a)pprove  (e)dit  (s)kip                         |
+--------------------------------------------------------------+
```

Tomas presses `r` to review:

```
+-- Review: pricing-headline-v2 --------------------------------+
|                                                               |
| Hermes synthesis:                                             |
| Variant B outperformed control on signup-completed by 14%    |
| over 8 days with 847 unique visitors. The improvement was     |
| consistent across mobile and desktop segments (within 2%).    |
| No negative effect observed on scroll depth or time-on-page. |
|                                                               |
| Control headline: "Design systems, synced."                   |
| Variant B headline: "Ship faster with evidence."              |
|                                                               |
| PostHog experiment link: [open in browser]                    |
|                                                               |
| Hermes recommends: PROMOTE variant B                          |
| Confidence: HIGH (94.3%, n=847, 8-day window)                |
|                                                               |
| Decision: (p)romote  (i)terate  (k)ill  (d)efer              |
+--------------------------------------------------------------+
```

**Emotional state:** Focused. The card has done the reading for him. He does not need to open PostHog. Hermes's summary is accurate — he checked the PostHog numbers last night. He presses `p` to promote.

---

## Stage 4: Tomas approves — the loop closes

```
+-- Closing loop: pricing-headline-v2 --------------------------+
|                                                               |
| Decision: PROMOTE variant B                                   |
| Rationale: Writing Hermes synthesis to contract...            |
|                                                               |
| Writing evidence to:                                          |
|   contract/hypotheses/pricing-headline-v2.md                  |
|                                                               |
| contract/hypotheses/pricing-headline-v2.md updated:           |
|   decision: promote                                           |
|   decided_at: 2026-05-12                                      |
|   evidence_source: posthog://experiments/pricing-headline-v2  |
|   confidence: 94.3%                                           |
|   winning_variant: B                                          |
|   rationale: "Variant B outperformed control +14% signup..."  |
|                                                               |
| Git commit created: "chore(evidence): close pricing-h-v2"     |
|                                                               |
| Loop closed. The next agent reading this contract will see    |
| the evidence before acting.                                   |
|                                                               |
+--------------------------------------------------------------+
```

**Emotional state:** Relieved. Confident. The loop is closed. He did not have to write anything manually. He did not have to remember to update Notion. The file is in the repo. The agent will read it.

**Shared artifacts updated:**
- `contract/hypotheses/pricing-headline-v2.md` — now includes `decision`, `decided_at`, `evidence_source`, `confidence`, `winning_variant`, `rationale`
- Git commit authored by Systemix — evidence is in the repo history

---

## Stage 5: Next agent call reads the evidence

**Three weeks later.** Tomas asks Claude Code to refactor the pricing page:

```
You: /component "update pricing-page to use the winning headline variant"
```

Claude Code calls the Systemix MCP server before generating code. It reads `contract/hypotheses/pricing-headline-v2.md` and sees:

```
decision: promote
winning_variant: B
rationale: "Variant B outperformed control +14% signup..."
```

Claude Code responds:

```
I can see from the evidence contract that pricing-headline-v2 was
closed on 2026-05-12 with variant B promoted (+14% signup, 94.3%
confidence over 847 visitors). I'll use "Ship faster with evidence."
as the headline and preserve the winning variant in the refactor.
```

**Emotional state:** Delighted. The agent knew. Tomas did not have to tell it. The loop worked.

---

## Emotional arc summary

| Stage | Entry emotion | Exit emotion | Design lever |
|---|---|---|---|
| Install | Curious, skeptical | Satisfied | Fast setup (<5 min), no configuration wall |
| Experiment runs | Anxious, watching PostHog | Still waiting (but trusting) | Clear "Hermes is watching" status |
| Queue surfaces card | Surprised (it worked) | Focused | Card arrives — Hermes has already done the reading |
| Approve decision | Decisive, confident | Relieved | One-keystroke closure, clear confirmation |
| Agent reads evidence | Delighted | Trusting | Agent cites the evidence unprompted |

---

## Error paths

### Error: PostHog significance never reached
Tomas has been running the experiment for 21 days. Traffic is too low for significance.

```
+-- HITL Queue ------------------------------------------------+
|  No decisions ready.                                          |
|                                                               |
|  1 experiment stalled:                                        |
|  [!] pricing-headline-v2 — 21 days, not significant           |
|      Current: n=234, need ~600 for 95% confidence             |
|      Options: (l)ower confidence threshold  (k)ill  (w)ait    |
+--------------------------------------------------------------+
```

Tomas can lower the confidence threshold to 80% and accept the card, or kill the experiment and write a "not enough traffic" conclusion to the contract.

### Error: Hermes synthesis is wrong
Tomas reviews the card and the synthesis is incorrect — Hermes interpreted a secondary metric as the primary one.

```
Decision: (p)romote  (i)terate  (k)ill  (d)efer  (e)dit rationale
```

Tomas presses `e`, edits the rationale inline, and approves. The corrected rationale is written to the contract. The loop closes with human-corrected evidence. Hermes's error rate feeds back into SPIKE 1 metrics.

### Error: Contract write fails (git conflict)
The repo has a merge conflict in the hypothesis file. Systemix detects the conflict and holds the card open:

```
[!] Cannot write to pricing-headline-v2.md — merge conflict
    Resolve conflict in contract/hypotheses/pricing-headline-v2.md
    then run: systemix queue --retry
```

The decision is not lost. The card remains in the queue. The evidence is not written until the conflict is resolved.
