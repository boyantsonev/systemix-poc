# Post 6 — Self-Updating Docs + Configurable Signals (the Clarity Case)
**Track:** A — knowledge stays true | **Slot:** 6 of 7 | **Status:** draft v1 | **Cadence:** ~2/week

## Gate conditions
- Post 4 published ≥5 days ago and its replies have been read and mapped (signal-side vs human-side clustering — see "Inputs from upstream").
- Post 5 (Track B, tutor) has published — Post 6 must not collide with it inside the same 72h window.
- The screencast shows a real doc updating off a real signal change — the swap must be performed live in the recording, not pre-staged into a finished state.
- Client anonymization verified: "Clarity" only, no real client name, no identifying product UI in frame, no real user data visible. Legal/ToS detail stated factually without disclosing anything contractually sensitive.
- The Clarity story has been fact-checked against project notes (which ToS clause category, what the actual swap timeline was) — this post's credibility rests on the story being airtight.

## What this tests (private)
**Hypothesis:** the abstraction "the signal is configurable; the contract is universal" is the most reusable idea in Track A — but it only lands when carried by a real constraint story (Clarity: under-18 users → ToS-forced analytics swap → PostHog EU → docs contract survives). Test: does pairing a compliance war story with an architecture principle pull replies from a *second* audience (eng leads, platform/compliance-adjacent people) beyond the design-system crowd Post 4 reached? Success = replies referencing their own tool-swap/compliance migrations, or questions about what else can be a signal. Failure = the architecture point ignored, replies only about analytics tooling.

## Inputs from upstream
- **If Post 4 replies clustered on signals/detection mechanics** → lead Option B (reframe: docs as contract wired to a signal); the Clarity story becomes the proof in the middle. Open the screencast on the contract file, not the doc.
- **If Post 4 replies clustered on human/review-fatigue concerns** → lead Option A (the Clarity story) and add one explicit line: "no human re-wrote these docs — the contract did the work; the human only reviewed the diff." Position self-updating docs as *less* queue, not more.
- **If Post 4 skeptics questioned whether write-back helps** → quote one (anonymized) in the narrative setup: "Someone asked after the drift post whether any of this survives contact with reality. Here's the contact with reality."
- **If Post 4 produced harvested failure stories** → mention in first comment: "Several people shared drift stories after post 4 — this one's about the docs equivalent."
- **If Post 5 (tutor) replies touched knowledge-freshness** → bridge in first comment connecting Track B's tutor to the same staleness problem.

> SIGNAL FROM POST 4: _pending_ → ADJUSTMENT: _pending_
> SIGNAL FROM POST 5: _pending_ → ADJUSTMENT: _pending_

## Content pack

### 📋 Post brief
- **Core idea:** A knowledge doc is a contract wired to a signal source. When the signal changes, the doc updates itself. Because the signal is configurable, the contract survives even a forced tool swap — proven by a real case (Clarity: under-18 users → ToS-forced migration to PostHog EU; docs survived unchanged in structure).
- **Format:** Screencast (native video, ≤90s, 4:5 vertical, burned-in subtitles, custom thumbnail).
- **Goal:** Replies from people who've lived a forced tool migration; questions about what else can be a signal source; widen audience beyond DS people to platform/eng leads.
- **Target:** Design system leads + engineering leads, platform engineers, anyone who owns documentation that rots, compliance-adjacent product people.
- **Best time:** Tue–Thu, 8–10am (audience local).

### 🧭 Narrative
On a real client project (anonymized as Clarity), discovering under-18 users meant the analytics tool violated its own ToS — forcing an overnight migration to PostHog EU. Every doc referencing analytics events should have died that day; instead, because each doc was a contract subscribed to a configurable signal source rather than hardwired to a tool, swapping the signal regenerated the docs and the contract survived untouched. Takeaway: the signal is configurable; the contract is universal — which is the only architecture under which knowledge can stay true through changes you don't control.

### ✍️ Copy options

---
**Option A — Pattern 2: The Uncomfortable Truth** *(default; strongest story-led version)*

The documentation was accurate on Friday. By Monday, legal had made it fiction.

Real case, real client — call them Clarity. Mid-project, we confirmed under-18s in the user base. The analytics tool's own terms of service made that untenable. Not a preference. A forced migration: out by end of week, PostHog EU in.

Normally that's where docs go to die. Every runbook, every event-tracking doc, every "how we measure X" page referenced the old tool. The usual outcome: a doc graveyard and a Notion page titled "OUTDATED — ask Boyan."

Here's what actually happened: almost nothing.

Because none of those docs were hardwired to the tool. Each one is a contract subscribed to a signal source — "the analytics provider," not "this vendor's API." We swapped the signal definition to PostHog EU, the docs regenerated against the new source, and a human reviewed one diff instead of rewriting forty pages.

The principle I took away: the signal is configurable; the contract is universal.

Docs don't rot because writers are lazy. They rot because they're wired to nothing — so nothing tells them they stopped being true.

Screencast below: a doc updating itself when its signal source changes, signal swap included.

What was your most brutal forced tool migration — and what did it do to your docs?

#Documentation #DesignSystems #BuildingInPublic #DesignEngineering

---
**Option B — Pattern 10: The Reframe** *(default if Post 4 signal = detection mechanics)*

Documentation isn't content. It's a contract with a signal source.

Treat it as content and it rots the moment reality moves — because nothing tells it reality moved. Treat it as a contract subscribed to a signal, and it updates itself when the signal changes.

After the drift dashboard (post 4), a few people asked what triggers detection — and whether any of this survives contact with the real world. Fair. Here's the contact:

Real client project, anonymized as Clarity. We confirmed under-18 users mid-project. The analytics tool's ToS made that a compliance problem with a deadline: forced migration to PostHog EU, days not months.

Every analytics doc should have died. None did — because the contracts didn't reference the tool. They referenced "the analytics signal source," which is configurable. Swap the signal, docs regenerate, a human reviews one diff.

The signal is configurable. The contract is universal.

That's the same write-back loop from the drift dashboard, one level up: not just knowing a token changed, but keeping whole knowledge documents true through changes you don't control. A design system an agent can read isn't AI-native. One whose knowledge stays true is getting there.

Screencast below — live signal swap, no pre-staged states.

What's wired to nothing in your stack right now?

#Documentation #DesignSystems #DesignEngineering #BuildingInPublic

---
**Option C — Pattern 7: The Direct Question**

When compliance forces a tool swap with a one-week deadline — what happens to every doc that mentions the old tool?

I got to find out for real. Client project (call them Clarity): we confirmed under-18 users, the analytics tool's own terms of service turned that into a forced migration, and PostHog EU had to be live within days.

The honest historical answer to that question is: the docs die quietly. Someone says "we'll update them later." Later never ships. Six months on, a new hire follows a runbook into a tool that no longer exists.

This time the docs survived — and not because anyone rewrote them.

Each doc in this system is a contract subscribed to a signal source. The contract says what must stay true ("event taxonomy is documented," "retention queries have a runbook"). The signal says where truth currently lives. We swapped the signal definition to PostHog EU; the docs regenerated; a human reviewed a single diff.

The signal is configurable. The contract is universal. That separation is the entire trick — and I suspect it generalizes far beyond analytics: design tokens, API schemas, anything with a source of truth that management or legal can swap out from under you.

Screencast below shows the swap end to end.

What got swapped out from under you, and did your docs survive it?

#Documentation #DesignEngineering #BuildingInPublic #DesignOps

---

### 🎨 Visual / demo brief
**Format:** Screencast, native video, 4:5 vertical (1080×1350), ≤90 seconds. Burned-in subtitles mandatory (80%+ watch muted). Custom thumbnail: split frame — left: doc page with stale tool name struck through; right: same doc regenerated, with caption "nobody rewrote this doc."

**Shot list (~85s):**
1. **0–6s — Cold open on a living doc.** An analytics events doc, visibly referencing the current signal source. Caption: "This doc is true right now. Watch what keeps it that way."
2. **6–20s — The contract.** Show the contract definition: what the doc promises (sections, invariants) and the `signal_source` field pointing at the current provider. Caption: "The doc is a contract. The signal source is a config value — not a hardcoded tool."
3. **20–35s — The forcing event (text card over b-roll of the config).** Caption sequence: "Real case. Client 'Clarity.' Under-18 users confirmed. → Analytics ToS violated. → Forced migration: PostHog EU. Deadline: days."
4. **35–55s — The swap.** Edit the signal source config: old provider → PostHog EU. Trigger regeneration. Show the doc rebuilding against the new signal. Caption: "Swap the signal. The contract re-resolves. No rewrite."
5. **55–72s — Human checkpoint.** Show the diff view — what changed in the doc — and a human approving it. Caption: "One diff reviewed. Forty pages not rewritten. The human checks; the contract works."
6. **72–85s — Principle card.** Plain text: "The signal is configurable. The contract is universal." Sub-line: "Part 6 — knowledge stays true." End card with name.

**Notes:** anonymization check on every frame — no client name, logo, or real user data. Zoom 125–150% so config keys are readable on mobile. The signal swap must happen on camera; continuity = credibility.

### 🔗 Links
- **Body: zero links.** "Demo context in first comment."
- **First comment:** systemix-alpha.vercel.app + link back to Post 4 (drift dashboard) and Post 1 (thesis).
- PostHog mention stays in body text (it's a fact, not a link) — do not link to PostHog; not the point and reads as vendor content.

### 💬 Engagement primer
**First comment (post immediately):**
"Part 6 of a public research series on design systems that learn. Post 4 showed drift detection on tokens with a human review queue; this is the same idea one level up — whole knowledge docs staying true when their source of truth gets swapped. The drift dashboard runs at systemix-alpha.vercel.app (link below, plus posts 1 and 4). Next post closes the arc: taking the whole system cross-platform."

**Reply-bait question (in body, last line):** "What got swapped out from under you, and did your docs survive it?"
**Backup prompt (if comments stall after 2h):** "Adjacent question for the DS crowd: if your docs could subscribe to one signal tomorrow — Figma variables, your token pipeline, your API schema — which one would kill the most staleness?"

## Downstream impact map
- **If replies cluster on "what else can be a signal?"** → Post 7 explicitly frames the host framework as the *biggest* swappable signal — Tamagui as "the Clarity swap, but for the entire rendering layer." Strongest possible bridge; use it.
- **If replies cluster on the compliance/migration war stories** → Post 7 leads with the before/after migration narrative (Option B) rather than the architecture principle.
- **If the contract abstraction confuses people** (replies asking "wait, what generates the doc?") → Post 7 must spend a slide/beat on plain-language mechanics before claiming framework-agnosticism; also consider a clarifying comment-thread mini-explainer within 24h.
- **If a second audience shows up** (platform/eng leads) → Post 7's copy keeps "embedded system can't assume the host" front and center, and the after-seven reflection should weigh whether the Destination conversation belongs to a wider-than-DS audience.
- **Feeds Post 7 directly:** the line "the signal is configurable; the contract is universal" should be quoted/echoed once in Post 7 to close the Track A through-line.

> SIGNAL FROM POST 6: _pending_ → ADJUSTMENT TO POST 7: _pending_

## Revision log
| Date | Signal observed | Change made | Posts affected |
|---|---|---|---|
| — | — | — | — |
