# Systemix Copy — Evidence Layer (FINAL)

**Status:** FINAL. Paste-ready text per UI surface. Source of truth for the Beta pivot.
**Source:** Discovery brief 2026-04-28 (`docs/discover/systemix-beta-brief.md`); supersedes `docs/copy-spec-evidence-layer-draft.md` and `docs/copy-spec.md`.
**Authoring date:** 2026-04-28
**Approver:** Boyan

---

## H1 decision (and why)

**Pick: "Every component is a guess until production proves it."**

One-line rationale: it names the wedge directly ("production proves it"), is short enough to land before the reader scrolls, and uses the Tier 1 buyer's own vocabulary — the design engineer who has already shipped a token they couldn't justify in standup. The two alternates ("Your design system has opinions. Systemix has evidence." / "Every component is a hypothesis. Systemix attaches the receipts.") are kept as backups in case the 5-buyer test reads "guess" as too informal — both keep the evidence frame intact.

---

# 1. Landing page — `src/app/page.tsx`

## 1.1 Hero

**Tagline above H1** *(uppercase mono, ≤8 words)*

```
The Evidence Layer for design systems
```

**H1** *(≤12 words, second line muted; line break between sentences)*

```
Every component is a guess
until production proves it.
```

> Render note: the existing component renders the second line in `text-muted-foreground`. Keep that — visually it makes "until production proves it" land as the resolution.

**Sub** *(~50 words)*

```
Your A/B test measured a variant nobody designed. Your agent shipped a token Figma deprecated last quarter. Systemix is the layer where every component carries its production evidence — so the next design decision is informed by what actually worked, not by what got documented.
```

**Install command CTA** *(unchanged component — `<InstallCommand />` already renders `npx systemix init`)*

Keep as-is.

**Footer line under CTA** *(small mono, replace existing)*

```
When an agent asks "what is --color-primary?" — the contract answers with the value, the rationale, and the experiment that proved it.
```

---

## 1.2 WorksWith section

Keep the component intact. Only update the label text:

**"Works with" label** *(unchanged)*

```
Works with
```

> No change. The Cursor / Claude Code / Codex / Gemini CLI / OpenCode row already names the Tier 1 buyer's toolchain.

---

## 1.3 TwoUseCases section — collapse 5 → 2

**Section preamble** *(uppercase mono, replace "One memory layer · Five use cases")*

```
The evidence layer · Two ways teams use it
```

**Section H2** *(unchanged framing — still true under evidence framing)*

```
Same contract. Different problem solved.
```

**Card 1**

- audience: `Product teams shipping with Cursor or Claude Code`
- headline: `Stop guessing what your agent will pick.`
- body: `Your agent reads the contract before it ships. Every token, every component carries the value, the rationale, and the production result that justified it. No more rediscovering the same dead-end variant six months apart.`

**Card 2**

- audience: `Teams already running PostHog or Statsig`
- headline: `Close the loop your analytics never closed.`
- body: `PostHog tells you variant B won. Systemix writes that result into the component's contract — attributed to the variant, dated, with confidence. Your next experiment starts from known ground, not a fresh guess.`

> Drop: Agencies, Legacy design systems, AI-assisted builders, Consultancies. They are Tier 2/3 — bring them back as docs pages or a separate "Solutions" route, not on the Beta landing.

---

## 1.4 Problem section

**H2** *(two-line punch — survival framing for Storybook lives here)*

```
Storybook tells your agent what exists.
Nobody tells it what worked.
```

**Body** *(~80 words across two paragraphs)*

Paragraph 1:
```
You can document a component. You can sync it across Figma and code. You can write a story for it. But you still can't answer the question that decides the next sprint: did this design decision work? The answer lives in PostHog, in someone's head, or in a Slack thread from March.
```

Paragraph 2:
```
Systemix writes the answer back into the component's contract — measured in production, attributed to the variant, dated. The next agent reading it sees the evidence, not just the value.
```

**3-card pain grid** *(label ≤12 chars uppercase, body ~30 words each)*

Card 1:
- label: `LOST RATIONALE`
- body: `The variant that won in March is now a hex value with no story attached. Six months later the same dead-end gets proposed again, by a human or an agent.`

Card 2:
- label: `STALE CONTEXT`
- body: `Your agent reads the current token value but not the experiment that set it. It ships whichever color was in the file last — not the one production validated.`

Card 3:
- label: `BLIND BASELINE`
- body: `PostHog says variant B won. But if the token drifted before the test, you measured a variant nobody designed. The result isn't wrong — it's about the wrong thing.`

---

## 1.5 HowItWorks section

**H2** *(unchanged — "How it works" is already the right cadence)*

```
How it works
```

**Intro paragraph** *(~55 words, evidence-first framing)*

```
Every component on Systemix is a hypothesis. PostHog measures whether it worked. Hermes reads the result against the contract — past experiments, prior decisions, what's already been tried — and writes the evidence back as a structured line in the component's MDX file. The next agent, the next sprint, starts from that ground.
```

**Hypothesis validation card** *(keep visual structure; only update copy)*

Card header strip: keep `Hypothesis validation — what the loop looks like` (unchanged).

Hermes synthesis paragraph (replaces current "Variant B shows significant uplift…"):
```
Variant B converted +47% at 87% confidence. Contract evidence: the provocative framing tested in March underperformed by 23% on the same segment. Recommend promoting B and writing the rationale into the contract before the next iteration.
```

Footer note next to buttons (replaces "decision is written to the contract"):
```
— evidence is written back to the contract
```

Memory trace row (the "remembered" badge row at the bottom of the card): replace the badge label and the row text.

- Badge: change `remembered` → `evidence`
- Row text: `Hero headline — contract carries 3 prior experiments + current decision`
- Right side: `next agent will read this`

**Pipeline reference (3-column block — Sources / Skills / Output)**

Keep all column structure. Only change two strings:

- In the Output column, the contract block currently reads `memory per token + decision`. Replace with: `evidence per token + decision`
- In the Output column, the score block currently reads `healthy · 2 pending`. Keep as-is.

**Bottom link** *(unchanged)*

```
See full architecture diagram →
```

---

## 1.6 SectionGlossary

**H2** *(unchanged)*

```
What each part does
```

**Intro** *(~18 words)*

```
Three surfaces. One contract underneath. The contract is where the evidence lives — everything else reads it or writes to it.
```

**Cards** *(name, tag, ~30-word body each — keep the existing 3 cards' structure, refresh body copy)*

Card 1:
- name: `Dashboard`
- tag: `app`
- body: `One score per project. See which contracts have fresh production evidence, which have unresolved drift, and which are running blind. The Beta starting point.`

Card 2:
- name: `Design System`
- tag: `triage + docs`
- body: `Every token and component, with its contract open beside it. Evidence rows from PostHog, drift status, and the prose Hermes wrote — readable by humans and agents alike.`

Card 3:
- name: `Skills`
- tag: `commands`
- body: `Slash commands inside Claude Code, Cursor, or any MCP editor. /component reads the contract before generating. /tokens syncs values. /evidence pulls the latest PostHog results into the contract.`

> Note: the live page has 3 cards already (Dashboard, Design System, Skills) — we're not adding a fourth. The "Four tools. One workflow." subtitle from the live page was inaccurate; the new intro replaces it.

---

## 1.7 QualityGate section

**H2** *(reframe trust → evidence)*

```
An evidence score on every contract.
```

**Intro** *(~50 words)*

```
Systemix scores every contract from 0 to 100. The score reflects how much of the component is backed by evidence: tokens resolved, drift cleared, production results attached. It's the single number that tells your agent — and your team — whether the contract is ready to be relied on.
```

**Tier rows** *(score, state, body)*

Row 1:
- score: `≥ 80`
- state: `Evidence-ready`
- body: `Contract is backed. Tokens are resolved against Figma, drift is cleared, recent production evidence is attached. Safe for agents to read, safe for the next experiment to build on.`

Row 2:
- score: `≥ 60`
- state: `Partial evidence`
- body: `Some claims are unbacked. Either drift is unresolved or production data is missing. Your agent will still read the contract — but the next decision is partly a guess.`

Row 3:
- score: `< 60`
- state: `Unbacked`
- body: `Too many open questions. Tokens drift, no recent production data, or contradictions Hermes flagged. Don't ship from this contract until it's triaged.`

**Closing line** *(replaces "The score rises as you resolve conflicts…")*

```
The score rises as evidence accumulates. It drops when Figma drifts, when PostHog data goes stale, or when a decision is overridden without rationale. Target: ≥ 80 on every contract your agent reads.
```

---

## 1.8 BottomCTA

**H2** *(unchanged framing — local-first is part of the wedge)*

```
Run it locally.
```

**Intro** *(~38 words)*

```
Hermes runs on Ollama — no API key, no cloud, no design data leaving your machine. PostHog stays where it already is. The contract lives in your repo. Systemix is the layer that ties them together.
```

**3 numbered steps** *(label, command, comment)*

Step 1:
- label: `Run Hermes locally`
- cmd: `ollama pull hermes3`
- comment: `local LLM — no API key needed`

Step 2:
- label: `Wire up your evidence source`
- cmd: `npx systemix connect posthog`
- comment: `Statsig and Mixpanel adapters in beta`

Step 3:
- label: `Read the loop`
- cmd: `npx systemix evidence pull`
- comment: `pulls 30-day results into every contract — ~40s per component`

**Closing paragraph** *(replaces "Each token gets a contract file…")*

```
Every component gets a DESIGN.md-shaped contract: tokens, components, rationale, and a Production Evidence section Hermes writes from your PostHog events. You approve. The score rises. The next agent reads forward.
```

**Closing link** *(unchanged)*

```
See the full workflow →
```

---

## 1.9 LandingFooter tagline

*(≤8 words, mono small)*

```
The Evidence Layer for design systems.
```

---

## 1.10 OG meta

**Page title** *(≤70 chars — current ~64)*

```
Systemix — Every component is a guess until production proves it.
```

**Meta description** *(≤155 chars — current ~152)*

```
The evidence layer for design systems. Production results, attributed to the variant, written into your component contracts. Open source. MCP-native.
```

---

# 2. Concept page — `src/app/docs/concepts/evidence-layer/page.tsx`

This page replaces `memory-layer/page.tsx`. Add a redirect from the old slug in `next.config.ts` so existing links resolve.

**Eyebrow**
```
Concepts
```

**H1**
```
The Evidence Layer
```

**Lead paragraph** *(~50 words)*

```
The contract isn't a snapshot of the design system — it's the running record of what's been tried and what worked. When an agent, a sprint, or a new hire opens a Systemix-managed codebase, they don't start from a value. They start from the value plus the evidence that justified it.
```

---

**Section: Why evidence, not memory**

```
Most design systems have tokens in CSS, components in Figma, and the rationale somewhere between Slack threads and a Notion page nobody reads. When an agent asks what --color-primary should be, it gets the current value — not the experiment that set it, not the variant that lost, not the segment that responded.
```

```
The point isn't to remember more. Plenty of tools already remember things. The point is that every claim a contract makes is backed by something a human can audit and an agent can act on: a Figma node, a PostHog event, a HITL decision, a dated rationale Hermes wrote. Memory is what you store. Evidence is what holds up under questioning.
```

---

**Section: What the evidence holds**

A 5-card list (reuse the existing visual structure from `memory-layer/page.tsx`, refresh labels and bodies):

Card 1:
- label: `Token values and drift state`
- body: `Current CSS value, last known Figma value, whether they match, when they last changed. Every sync writes to this. The basic visual-identity contract.`

Card 2:
- label: `Production evidence`
- body: `Experiment results from PostHog, attributed to the variant that ran. A hero headline that drove +47% CTR is recorded here — dated, with confidence, with the segment it tested on.`

Card 3:
- label: `Hermes rationale`
- body: `Each time a token changes or a hypothesis resolves, Hermes writes prose into the contract body — why this value, what was rejected, what to read next. Audit trail in human language.`

Card 4:
- label: `HITL decisions`
- body: `Every promote / reject / extend the loop made in the dashboard is written back. The decision and the reasoning live with the artifact, not in a meeting note.`

Card 5:
- label: `Component parity`
- body: `For each component: which tokens it consumes, its Storybook story status, its Figma-to-code parity score, and whether the variant currently shipped is the one production evidence supports.`

---

**Section: The contract as agent context**

```
When Claude Code, Cursor, or any MCP editor runs a Systemix skill, it reads the contract before acting. That means:
```

Bulleted list:
- `A /component skill knows which tokens are drifted, which are evidence-backed, and which are unresolved — before it generates a single line.`
- `A /evidence skill pulls the most recent PostHog results for the component into the contract, so the next decision reads forward, not backward.`
- `A hypothesis validation card knows the full chain: design intent → token value → variant tested → result measured → decision recorded.`

---

**Section: Built on Google's DESIGN.md**

```
The contract file is a DESIGN.md — Google's open visual-identity format, Apache 2.0, shipped April 2026. Stitch and any DESIGN.md-aware tool reads our files with zero lint errors, including the WCAG AA contrast checks the linter runs automatically. The visual-identity layer round-trips through `design.md export` to Tailwind or DTCG.
```

```
Systemix's contribution is the Production Evidence section — an unknown H2 the spec preserves, with one frontmatter row per measured outcome. The format is portable. The evidence is the part nobody else writes.
```

---

**Section: Anatomy of a contract file**

Keep the YAML+prose example from `memory-layer/page.tsx` but reframe the surrounding prose. Replace the YAML/prose block with:

```yaml
---
token: --primary
value: oklch(0.205 0 0)
figma-value: oklch(0.21 0 0)
status: drifted
resolved: false
last-updated: 2026-04-27
last-resolver: hermes
x-systemix:
  evidence-posthog:
    experiment: hero-cta-color
    variant: darker-primary
    result: +12% CTR
    confidence: 91%
    segment: all-traffic
    recorded: 2026-04-15
---

## Production Evidence

This token was set on 2026-04-15 after the hero CTA experiment.
The darker oklch(0.205 0 0) variant drove a 12% CTR lift at
91% confidence across all traffic. The previous value
oklch(0.35 0.1 250) (a blue) was rejected — users perceived it
as less trustworthy in the context of a docs-style product.

## Hermes Notes

Current drift: Figma not yet updated. Run /sync-to-figma to
propagate. Next test queued: contrast variant on dark-mode
landing — predicted to push contrast above WCAG AA threshold
without losing the brand read.
```

Surrounding prose (one paragraph above, one below):

Above:
```
Each contract is one DESIGN.md file. Frontmatter is machine-readable: the visual-identity block (native to the spec) plus an x-systemix block (extension, silently preserved by the official linter). The body is prose — written by Hermes, read by humans and agents alike.
```

Below:
```
The Production Evidence section is the durable record. The value can change. The Figma node can move. The evidence — what ran, what won, when, on which segment — stays attached to the artifact it describes.
```

---

**Section: See also**

```
→ Hypothesis Validation Loop — how the loop closes
→ Hermes — who writes the rationale
→ HITL & Decision Queue — approving evidence cards
→ MDX Contracts — schema reference
```

---

# 3. DocsSidebar nav label

In `src/components/systemix/DocsSidebar.tsx`, in the Concepts section, replace:

```
{ label: "Memory Layer", href: "/docs/concepts/memory-layer" },
```

with:

```
{ label: "Evidence Layer", href: "/docs/concepts/evidence-layer" },
```

> Order: keep "Evidence Layer" as the first entry under Concepts (replacing the slot Memory Layer occupied). It's the canonical concept doc now.

---

# Voice notes (only where non-obvious)

- **"Production evidence" vs "experiment results":** prefer "production evidence" in marketing surfaces (it's the unique frame). Use "experiment results" inside example UI copy where the buyer would already think in those terms.
- **"Contract" stays plural-friendly:** every component, every token has its own contract file. Avoid "the contract" framed as a single global object — it reads as enterprise.
- **"Hermes" is named once on the landing** (HowItWorks intro) and once in the BottomCTA. Don't over-use — the buyer doesn't need to learn the character on first read; the local-LLM angle is in the steps.
- **"DESIGN.md" appears once on the landing implicitly** (BottomCTA closing paragraph: "DESIGN.md-shaped contract") and gets its own section on the concept page. Don't lead the hero with it — that invites Google comparison instead of riding the standard.

---

# Banned terms (verified absent from the above)

`memory layer` · `living system of record` · `single source of truth` · `verified contract` · `AI-powered` · `intelligent` · `documentation that updates itself`

---

# Out of scope (deliberately not touched)

- Skills page descriptions (`/docs/skills`) — separate copy pass when Skills surface is reframed
- Hermes / HITL / Contract concept pages beyond the redirect — refresh in a follow-up after this lands
- PipelineBeam diagram captions — visual review with the diagram open
- Internal positioning docs (`docs/token-intelligence.md`, `docs/team-workflow.md`) — engineering-facing, not buyer-facing

---

# Apply order (handoff)

1. `src/app/page.tsx` — paste all 1.x sections in order
2. Rename `src/app/docs/concepts/memory-layer/` → `src/app/docs/concepts/evidence-layer/` and paste section 2
3. Add redirect in `next.config.ts`: `/docs/concepts/memory-layer` → `/docs/concepts/evidence-layer`
4. `src/components/systemix/DocsSidebar.tsx` — section 3 nav label swap
5. OG meta on the landing — section 1.10
6. Deploy preview, share with 5 Tier 1 buyers per the brief's verification gate
