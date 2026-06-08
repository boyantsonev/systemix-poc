# The Evidence Layer: What Your GTM Experiments Are Missing

**Target:** Personal blog (canonical) → Show HN → X thread → dev.to (SEO) → r/SaaS → LinkedIn note  
**Audience:** Pre-PMF founders vibe-coding in Claude Code / Cursor, running GTM experiments, using PostHog  
**Goal:** Name the "evidence layer" pattern before anyone else does. Drive `npx systemix init` installs.  
**Length:** ~900 words  
**Status:** Final — 2026-05-05

---

You shipped a landing page last Tuesday. Variant B won — 34% higher click-through. You updated the page and moved on.

Three months later you're rewriting the hero again, and you have no idea why you made the last call.

The PostHog data is still there if you dig for it. But the reasoning — who the test was for, what you were trying to prove, why 34% was enough to decide — is gone. Slack, maybe. A Notion doc you stopped updating. Nowhere you'd actually look before making the next decision.

This is the experiment that forgot what it learned.

---

## Nothing in your current stack closes the loop

When you run a GTM experiment, evidence lands in three places that never talk to each other.

**Your code.** What you actually shipped. Git has it, but git doesn't know which variant won or why.

**Your analytics.** PostHog or Statsig or Amplitude. Accurate, but context-free — no link to the hypothesis, no record of the ICP you were targeting, no decision rationale.

**Your social signals.** The LinkedIn post that got 80 likes and 4 DMs from exactly the right people. The Reddit thread where someone said "I've been looking for this for two years." That signal lived for 72 hours before it faded into the feed.

The loop should close: run an experiment, measure it, write down what you learned, and start the next decision from known ground instead of a fresh guess. Nothing in the current toolchain makes that happen automatically. So it doesn't happen.

---

## What an evidence layer actually is

An evidence layer sits between your experiments and your codebase. It's not a dashboard — dashboards are read-only. It's not a wiki — wikis go stale because writing them is a separate job nobody does.

An evidence layer is a contract that writes itself.

Every experiment lives in a structured file: hypothesis, ICP, variants, success criteria. When you run `npx systemix social-signal`, the engagement numbers from your LinkedIn post go into the contract. When PostHog has enough data, the evidence loop pulls the results in and writes them back. When you decide — promote, iterate, kill — the decision and its rationale are recorded at the exact place the hypothesis started.

The contract becomes the permanent record of what you tried, what you measured, and what you concluded. The next time you touch that part of the product, the history is there. Not in Slack. Not in your head. There.

---

## What this looks like in practice

No design tools required. The hypothesis contract is a Markdown file with YAML frontmatter — your agent reads it, writes to it, and queries it through an MCP server. You create an experiment:

```
/init-experiment hero-messaging-2026-05
```

Claude Code walks you through the hypothesis, the variants, the ICP, the success criteria. It writes a file:

```yaml
---
id: hero-messaging-2026-05
hypothesis: "Framing the hero around outcomes rather than features
             will increase trial signups from founding engineers"
icp: founding-engineers
status: running
variants:
  control:   "The design system that stays in sync"
  variant_b: "Ship faster. Break nothing. Know why."
evidence-posthog: null
evidence-social: null
---
```

You ship variant B. You post about it. You run:

```bash
npx systemix social-signal \
  --platform linkedin \
  --hypothesis hero-messaging-2026-05 \
  --impressions 3200 --clicks 91 --replies 14
```

The signal is logged to PostHog as a `hypothesis_social_signal` event and written back into the contract. When you run `/growth-audit` a week later, it cross-references social engagement against PostHog product data and gives you a brief: what's decision-ready, what needs more time, what's stalled.

When you close the experiment:

```
/close-experiment hero-messaging-2026-05
```

The result, the decision, and the confidence level go into the contract. Three months from now, before you rewrite the hero again, you read the file. You know what you tried, who you tested it with, and what happened.

---

## The schema is open

If you want to implement this pattern in your own stack without Systemix, the structure is simple:

```yaml
type: hypothesis
id: <section>-<short-description>-<YYYY-MM>
hypothesis: "If we [change X], then [outcome Y], measured by [metric Z]"
icp: <who you're testing with>
status: running | complete | archived
variants:
  control:   "<current version>"
  variant_b: "<proposed change>"
result: null         # written by the evidence loop
decision: null       # promote | iterate | kill
confidence: null     # 0.0–1.0
evidence-posthog: null
evidence-social: null
```

One file per experiment. Stored in `contract/hypotheses/`. Read by your agents through the MCP server. Written by Claude Code when you close the loop.

The pattern is the thing. The tooling is just what makes it automatic.

---

## Start the loop

```bash
npx systemix init
```

Pick `hypothesis-validation` when asked which workflow you want. It installs four Claude Code skills: `/init-experiment`, `/write-variants`, `/growth-audit`, `/close-experiment`. PostHog optional — social signals work without it.

The first experiment takes about ten minutes to set up. The second one takes two, because you already have the pattern. Three months from now, you'll know exactly why you made the last call.

---

*Systemix is an open evidence layer for product teams building with AI agents. The schema is public. [github.com/boyantsonev/systemix](https://github.com/boyantsonev/systemix-poc)*

---

## Distribution notes (internal — remove before publishing)

**Sequence:**
- Day 0, 8am ET: publish to personal blog (canonical URL)
- Day 0, 9am ET: Show HN — title: "Show HN: Systemix – CLI that closes the loop on GTM experiments (PostHog + social signal pull)"
- Day 0, 9am ET: post top comment on HN within 60s — problem in one sentence, what it does in one sentence, "we're using it on our own GTM, curious if others solved this differently"
- Day 0, 11am ET (after HN has traction): X thread — CLI demo, one experiment file before/after, last tweet links to HN discussion
- Day 0, 2pm ET: cross-post to dev.to with canonical back to blog
- Day 1 morning: r/SaaS — question framing, link Systemix as your own answer
- Day 1 afternoon: DM 5–10 pre-PMF founders using PostHog — ask for feedback, not shares
- Day 2: respond to every live HN thread, share a follow-up X tweet answering the top objection
- Day 3: LinkedIn short note (3 sentences + link, by now you have star count and HN points)

**Do NOT:** lead with "evidence layer" in the HN title. Let comments name the pattern.  
**Do NOT:** mention Figma anywhere in the published version.
