# The Evidence Layer: What Your GTM Experiments Are Missing

**Target:** dev.to / personal blog / Substack  
**Audience:** Founders building in Claude Code / Cursor, pre-PMF, running GTM experiments  
**Goal:** Name the "evidence layer" pattern before a competitor does. Drive `npx systemix init` installs.  
**Length:** ~950 words  
**Status:** Draft v1 — 2026-05-05

---

You shipped a landing page last Tuesday. Claude Code wrote most of it. You had two variants of the hero — one led with the problem, one led with the outcome. PostHog told you variant B had a 34% higher click-through.

You updated the page to variant B and moved on.

Three months later, you're rewriting the hero again. You don't remember why you made the last call. The PostHog dashboard still has the data if you look for it, but the reasoning — who the test was for, what you were trying to prove, why 34% was enough to decide — that's gone. Slack, maybe. A Notion doc you stopped updating. Nowhere you'd actually look before making the next decision.

This is the experiment that forgot what it learned.

---

## The problem isn't your tooling. It's that nothing closes the loop.

When you run a GTM experiment today, evidence lives in three places that never talk to each other:

**Your code.** What you actually shipped. Git has it, but git doesn't know which variant won or why.

**Your analytics.** PostHog or Statsig or Amplitude. Accurate, but the context is gone — no link to the hypothesis, no record of the ICP you were targeting, no decision rationale.

**Your social signals.** The LinkedIn post that got 80 likes and 4 DMs from exactly the right people. The Reddit thread where someone said "I've been looking for this for two years." That signal existed for 72 hours before it faded into the feed.

The loop should close: you run an experiment, you measure it, you write down what you learned, and the next decision starts from known ground instead of a fresh guess. But nothing in the current toolchain makes that happen automatically. So it doesn't happen.

---

## What an evidence layer actually is

An evidence layer sits between your experiments and your codebase. It's not a dashboard — dashboards are read-only. It's not a wiki — wikis go stale because writing them is a separate job nobody does.

An evidence layer is a contract that writes itself.

Every experiment lives in a structured file: hypothesis, ICP, variants, success criteria. When you run `npx systemix social-signal`, the engagement numbers from your LinkedIn post go into the contract. When PostHog has enough data, the evidence loop pulls the results in and writes them back. When you decide — promote, iterate, kill — the decision and its rationale are recorded at the same place the hypothesis started.

The contract becomes the permanent record of what you tried, what you measured, and what you concluded. The next time you touch that part of the product, the history is there.

---

## Concretely, it looks like this

You create an experiment:

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

The signal is logged to PostHog as a `hypothesis_social_signal` event and written back into the contract. When you run `/growth-audit` a week later, it cross-references the social engagement (high) against the PostHog product data (early, but directional) and gives you a brief: what's decision-ready, what needs more time, what's stalled.

When you close the experiment:

```
/close-experiment hero-messaging-2026-05
```

The result, the decision, and the confidence level go into the contract. Three months from now, before you rewrite the hero again, you read the file. You know what you tried, who you tested it with, and what happened.

---

## You don't need Figma for any of this

This is the part most design system tools get wrong: they assume you have a Figma file worth syncing. A lot of you don't. You're building in Claude Code, your CSS is your design system, and Figma is something you'll add later when you have a designer.

The evidence layer doesn't care. The hypothesis contract is just a Markdown file with YAML frontmatter. Your agent can read it, write to it, and query it through an MCP server. You can add Figma integration later — drift detection, token parity, the full pipeline — but you don't need it to start tracking what your experiments are learning.

The moat is the loop, not the Figma sync.

---

## The spec

The contract format is open. If you want to implement this in your own stack without Systemix, the schema is simple:

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

## Try it

```bash
npx systemix init
```

Pick `hypothesis-validation` when asked which workflow you want. It installs four Claude Code skills: `/init-experiment`, `/write-variants`, `/growth-audit`, `/close-experiment`. No Figma required. PostHog optional — social signals work without it.

The first experiment takes about ten minutes to set up. The second one takes two, because you already have the pattern.

---

*Systemix is an open evidence layer for product teams building with AI agents. The schema is public. [github.com/boyantsonev/systemix](https://github.com/boyantsonev/systemix-poc)*
