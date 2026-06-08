# Systemix Copy — Evidence Layer Draft (Move 1)

**Status:** DRAFT for review. Not yet applied to live site.
**Source:** Discovery Brief 2026-04-28 ([SYSTMIX-264](https://linear.app/bastion-labs/issue/SYSTMIX-264))
**Authoring date:** 2026-04-28
**Approver:** Boyan

---

## Why this draft exists

The current live site (systemix-blond.vercel.app) anchors on **"The Memory Layer for managing design systems."** Per the discovery brief:

- "Memory" is Knapsack's "Living System of Record" by another name. We will lose every memory comparison.
- The technical wedge already exists (SPIKE 3 closed the PostHog → MDX evidence loop end-to-end on 2026-04-25).
- **Axis (c) — production evidence written back into the contract — is the only axis no competitor covers.**

The live sub already gestures at this ("A/B test measured a variant nobody designed", "feedback loop is clean, baseline is real"). The work is to lift that gesture into the *anchoring* frame.

---

## State of the world today (what's actually live)

| Surface | Current text |
|---|---|
| Tagline above H1 | The Memory Layer for managing design systems |
| H1 | Your design system is lying to you. |
| Sub | Token drift means your A/B test measured a variant nobody designed. Your platform migration starts from a Figma file nobody fully trusts. Systemix puts a verified contract between your design system and everything downstream — so the feedback loop is clean, and the baseline is real. |
| Primary CTA | Get started → |
| Secondary CTA | GitHub → |
| Problem section heading | Design systems drift. Everything downstream suffers. |
| Problem body | Figma says `primary` is `#1a56db`. Your CSS says `oklch(0.45 0.18 250)`. Your agent ships whichever it saw last. Your test measures a variant nobody designed. |
| Footer tagline | The Memory Layer for managing design systems. |

**Note:** `docs/copy-spec.md` has DIFFERENT, older copy ("design contract layer", drift + GIGO focus). It predates the Beta pivot entirely — no Hermes, no PostHog, no evidence loop. **The live site is the actual source of truth right now**, not the file. After this rewrite is approved, both should be unified.

---

## The pivot in one line

| | From | To |
|---|---|---|
| Frame | Memory layer (a thing you store) | Evidence layer (a loop that learns) |
| Verb | Verify | Prove |
| Comparison | "Your design system is lying" (trust) | "Every component is a hypothesis" (test) |
| Storybook | Implicit competitor | Explicit complement: "Storybook tells your agent what exists. Systemix tells your agent what worked." |

---

## Side-by-side rewrite

### 1. Hero

#### Tagline above H1
| Before | After |
|---|---|
| The Memory Layer for managing design systems | **The Evidence Layer for design systems** |

> Alternates worth A/B-testing with the 5 buyers:
> - The feedback loop your design system was missing
> - Where design decisions go to be tested
> - Production evidence, written into your design system

#### H1
| Before | After |
|---|---|
| Your design system is lying to you. | **Every component is a guess until production proves it.** |

> Alternates from the brief — keep one as a backup if the chosen one tests weakly:
> - "Your design system has opinions. Systemix has evidence."
> - "Every component is a hypothesis. Systemix attaches the receipts."
> - "Storybook tells your agent what components exist. Systemix tells your agent which ones actually worked." (this one is the survival framing for the "alongside Storybook" claim — but it's wordy as a primary H1, better as a secondary callout)

> Why the chosen one wins: short, names the wedge directly ("production proves it"), implies the loop without explaining it. The reader has to read on to learn how — which is what we want.

#### Sub
| Before | After |
|---|---|
| Token drift means your A/B test measured a variant nobody designed. Your platform migration starts from a Figma file nobody fully trusts. Systemix puts a verified contract between your design system and everything downstream — so the feedback loop is clean, and the baseline is real. | Your A/B test measured a variant nobody designed. Your agent shipped a token Figma deprecated last quarter. Systemix is the layer where every component carries its production evidence — so your next design decision is informed by what actually worked, not by what's been documented. |

> Notes: keeps the validated A/B-test pain (the live sub already had it). Drops "verified contract" (reads as memory framing). Adds "what actually worked" — the wedge phrase. Drops "feedback loop is clean" because it's vague; replaces with "informed by what actually worked" which is concrete.

#### CTAs
| Before | After |
|---|---|
| Get started → | **See the loop in action →** *(links to a 60s loom or animated diagram of evidence write-back)* |
| GitHub → | GitHub → *(unchanged)* |

> Alternative primary: keep "Get started →" if the loop demo doesn't exist yet. Don't ship a CTA pointing at a 404.

---

### 2. Problem section

#### Heading
| Before | After |
|---|---|
| Design systems drift. Everything downstream suffers. | **Storybook shows what exists. Nobody shows what worked.** |

> This is the brief's recommended differentiation framing, lifted directly from positioning into the marketing surface. Tests the "alongside Storybook" claim immediately and gives Tier 1 buyers a familiar reference point.

#### Body
| Before | After |
|---|---|
| Figma says `primary` is `#1a56db`. Your CSS says `oklch(0.45 0.18 250)`. Your agent ships whichever it saw last. Your test measures a variant nobody designed. | You can document a component. You can test it visually. You can sync it across Figma and code. But you still can't answer: *did this design decision work?* Systemix writes the answer — measured in production, attributed to the variant — back into the component's contract. The next agent reading it sees the evidence, not just the value. |

> Notes: keeps the pain present-tense and direct. Replaces the drift example (which is now table stakes) with the actual unanswered question. Names the deliverable: evidence written into the contract.

---

### 3. NEW SECTION — The Evidence Loop (does not currently exist)

This is the section the live site is missing. SPIKE 3 ships the loop end-to-end (~40s per component), but the marketing doesn't visualize it. Add it directly below the problem section.

**Heading:** **The loop, in 4 steps**

**Subhead:** Every component on Systemix is a hypothesis. Here's how the answer gets written back.

**Steps (visual diagram + short labels):**

1. **Ship.** Your component goes to production with auto-instrumentation injected by Hermes (one `useEffect`, ~22s to write).
2. **Measure.** PostHog (or Statsig — bring your own analytics) captures real usage, variant performance, conversion.
3. **Write back.** Hermes pulls the 30-day evidence into the component's MDX contract — frontmatter for the numbers, prose for the why.
4. **Read forward.** Your next AI agent reads the contract *and the evidence*. The next design decision is informed, not guessed.

**Footer line:** *Built on Google's [DESIGN.md](https://github.com/google-labs-code/design.md). Stitch and any DESIGN.md-aware tool reads our file with zero errors. Visual-identity layer round-trips through `design.md export` to Tailwind or DTCG. The `## Production Evidence` extension lives in the file as the durable record. Plus: WCAG AA contrast checks built into lint.*

> Why include the DESIGN.md line: defends against R1 (Google adopting the format) by positioning Systemix as the runtime, not a competing format.
>
> **Empirically validated** by Phase B preservation experiment ([SYSTMIX-268](https://linear.app/bastion-labs/issue/SYSTMIX-268), 2026-04-28). The official `@google/design.md@0.1.1` linter accepts `x-systemix:` root frontmatter and `## Production Evidence` H2 with zero warnings; export pipelines correctly drop them (visual-identity-only); lint flags WCAG AA contrast violations automatically. This claim is now defensible without caveats.

---

### 4. Footer

| Before | After |
|---|---|
| The Memory Layer for managing design systems. | **The Evidence Layer for design systems.** |

---

### 5. OG image / meta

**Current OG title (likely matches H1):** "Your design system is lying to you."
**New OG title:** "Every component is a guess until production proves it."

**Current meta description (best guess):** something about memory layer / verified contract.
**New meta description:** "Systemix is the evidence layer for design systems. Production results, attributed to the variant, written into your component contracts. Open source. MCP-native. Built on Google's DESIGN.md."

> Length budget for OG title ~70 chars / meta description ~155 chars — both candidates fit.

---

## Surface area beyond the hero (impacted files)

Search for "memory layer" in the codebase returns 8 files. **All need a rename pass after copy is approved:**

- `src/app/page.tsx` — the live landing (tagline + footer text)
- `src/components/systemix/DocsSidebar.tsx` — sidebar nav label
- `src/app/(app)/contract/page.tsx` — likely a heading or body line
- `src/app/docs/introduction/page.tsx` — opening framing
- `src/app/docs/concepts/memory-layer/page.tsx` — **whole page concept rename → `evidence-layer/page.tsx`** + redirect from old slug
- `src/app/docs/concepts/hermes/page.tsx` — likely references Hermes-as-memory; reframe as Hermes-as-evidence-author
- `src/app/docs/concepts/hitl/page.tsx` — HITL probably described as "memory approval"; reframe as "evidence approval"
- `src/app/docs/concepts/hypothesis-validation/page.tsx` — already lives in the right vocabulary; check it complements the new framing rather than competing with it

**Suggested rename:** `/docs/concepts/memory-layer/` → `/docs/concepts/evidence-layer/`. Add a redirect in `next.config.ts` so existing links don't break.

**Out of scope for Move 1 (defer):**
- The PipelineBeam diagram captions (visual, separate review)
- Internal positioning docs (`docs/token-intelligence.md`, etc.)
- Loom walkthroughs / screencasts
- The Skills page descriptions (those describe the agent personas — separate copy pass)

---

## Verification — the 5-buyer test (the kill-or-confirm gate)

**Per the brief**: show the new copy to **5 Tier 1 buyers** before declaring the framing won.

**Buyer profile:** design engineers using Cursor or Claude Code + PostHog or Statsig at startups (Series A–C, 5–25 person teams).

**The single question:** *"In one sentence, what does this product do?"*

| Outcome | Decision |
|---|---|
| ≥ 3/5 say something close to **"writes production evidence into design contracts"** or **"closes the loop between design and production data"** | Framing works. Ship across all surfaces. |
| 1–2/5 land it | Iterate H1 (try the alternates) and re-test with 3 fresh buyers. |
| 0/5 land it | Reposition deeper — the wedge framing isn't legible to the buyer yet. Possibly spin a new draft from the "Storybook complement" angle as the lead. |

**Where to find 5 Tier 1 buyers in 48 hours:**
- 2–3 from your existing network (founders / design engineers you already DM with)
- 1–2 from the HN thread author / commenters in [item 47832366](https://news.ycombinator.com/item?id=47832366)
- 1 from the Design Systems Slack #general

**Logging:** record each buyer's verbatim one-sentence response in [SYSTMIX-264](https://linear.app/bastion-labs/issue/SYSTMIX-264) as a comment before declaring Move 1 done.

---

## Sequencing

1. **You review and edit this draft** (likely 30 min)
2. **Choose the H1** (default is "Every component is a guess until production proves it." — keep alternates as backup)
3. **Apply the chosen copy to** `src/app/page.tsx` (hero + problem + new evidence-loop section + footer)
4. **Rename the docs concept page** memory-layer → evidence-layer (+ redirect)
5. **Pass through the other 6 .tsx files** for "memory layer" → "evidence layer" / contextual replacement
6. **Update OG image + meta description**
7. **Deploy preview**, share with 5 Tier 1 buyers, log responses
8. **Decision recorded in SYSTMIX-264**, mark Move 1 done if ≥3/5 land it

---

## Open questions for you

1. **Drop "lying to you" entirely?** It's a good hook but it's trust-framing (memory family), not evidence-framing. The proposed H1 replaces it. Is that the right trade, or should we keep "lying" as a sub-line below the new H1?
2. **"See the loop in action →" CTA** — does the loop demo exist yet (Loom, animated diagram, or live page)? If not, we either build that asset or keep "Get started →".
3. **Should the new "Evidence Loop" section reference Hermes by name?** Pro: introduces the local-LLM moat differentiator. Con: extra cognitive load for first-time visitors who don't know Hermes-3.
4. **DESIGN.md line in the evidence-loop footer** — assumes Move 2 (DESIGN.md adoption) lands. If we hold on Move 2 pending the schema mapping, drop this line for now and add it back when the spec adoption ships.
5. **Are there existing buyer conversations** I should reference instead of (or alongside) the 5 fresh tests? Customer language is gold for re-validating that "writes production evidence into design contracts" is a phrase real buyers would say.
