# Post 4 — Drift Dashboard + Human-in-the-Loop Review
**Track:** A — knowledge stays true | **Slot:** 4 of 7 | **Status:** draft v1 | **Cadence:** ~2/week

## Gate conditions
- Posts 1–3 (Foundation) have all published and each had ≥72h of reply time.
- Post 3's replies have been read and triaged — Post 4 is the first proof post and must answer whatever the Foundation provoked, not talk past it.
- The drift walkthrough demo is fully recorded against the live pipeline (systemix-alpha.vercel.app): real token, real `/drift-report` run, real review queue resolution. No mocked states — if someone asks "is this real?" the answer must be an unedited yes.
- Subtitles burned in and checked at mobile size.
- Do NOT publish if Posts 1–3 got zero substantive replies — in that case, re-cut Post 4's hook toward Option C (the direct question) to open a conversation rather than continue one.

## What this tests (private)
**Hypothesis:** the thesis from Post 1 ("a DS an agent can READ isn't AI-native; one that LEARNS WHAT WORKED is") only lands with senior practitioners when it's shown as a concrete failure-detection loop, not stated as a principle. Specifically: does showing *drift detection + human resolution + decision written back* generate replies about people's own staleness failures? Success signal = practitioners sharing how drift bites them today (or asking how the write-back works). Failure signal = generic "cool demo" comments with no failure stories.

Secondary test: does the HITL framing (agent detects, human decides) attract the trust-skeptical audience or read as a hedge?

## Inputs from upstream
- **If Post 1 replies clustered on drift/staleness** → lead Option A (reframe hook, drift-first). The audience already accepts the problem; show the machinery.
- **If Post 1 replies clustered on HITL/trust/"I don't trust agents to touch my tokens"** → lead Option B (uncomfortable-truth hook) and expand the review-queue section of the video by ~10s; the human-decides beat becomes the emotional center.
- **If Post 2/3 replies questioned whether any of this is real / asked for the repo** → lead Option C (direct question hook) and add a line offering the walkthrough of the actual `/drift-report` skill definition; prep repo-access answer for comments.
- **If Foundation posts got silence** → Option C, and the first comment shifts from context-link to an explicit ask for failure stories.

> SIGNAL FROM POST 1: _pending_ → ADJUSTMENT: _pending_
> SIGNAL FROM POST 2: _pending_ → ADJUSTMENT: _pending_
> SIGNAL FROM POST 3: _pending_ → ADJUSTMENT: _pending_

## Content pack

### 📋 Post brief
- **Core idea:** Generation is solved; knowing when something stopped being true isn't. First proof: a token drifts, the dashboard flags it, a human resolves it in a review queue, and the resolution is written back.
- **Format:** Video walkthrough (native upload, ≤90s, 4:5 vertical, burned-in subtitles, custom thumbnail).
- **Goal:** Make senior DS/design-eng practitioners reply with their own drift/staleness failure stories; secondary — DMs asking how write-back works.
- **Target:** Design system leads, design engineers, staff+ product designers running token pipelines, agent-curious eng leads.
- **Best time:** Tue–Thu, 8–10am (audience local).

### 🧭 Narrative
Everyone is demoing agents that generate components; nobody is demoing the moment a design token quietly stops being true. Systemix's drift dashboard catches that moment, but deliberately doesn't auto-fix it — a human resolves it in a review queue, and the resolution is written back to the system. The takeaway is the Track A through-line stated plainly for the first time with proof behind it: generation is solved; knowing when something stopped being true isn't.

### ✍️ Copy options

---
**Option A — Pattern 10: The Reframe** *(default if Post 1 signal = drift/staleness)*

Generation is solved. Knowing when something stopped being true isn't.

Any agent can generate a component on demand. Almost no system can tell you which of your design tokens silently stopped matching reality last Tuesday.

So I built the boring half. Systemix is my design-code sync pipeline — Next.js ↔ Figma, 31 tokens, oklch source of truth in CSS, pre-converted to hex for Figma Variables.

In the walkthrough:

→ A token drifts — the Figma value no longer matches globals.css
→ /drift-report catches it; the dashboard flips it from synced to drifted
→ A human resolves it in a review queue: accept Figma, keep code, or escalate

That last step is deliberate. The agent detects. The human decides. And the decision is written back — so next time, the system doesn't just know the token changed. It knows what we did about it last time, and why.

That's the thesis I'm testing in public: a design system an agent can read isn't AI-native. One that learns what worked is.

Honest status: detection works today. Whether written-back decisions actually improve the next resolution is still open. That's the next experiment.

How do you find out a token stopped being true — before a user does? Collecting failure stories.

#DesignSystems #BuildingInPublic #DesignEngineering #AIAgents

---
**Option B — Pattern 2: The Uncomfortable Truth** *(default if Post 1 signal = HITL/trust)*

Your design system was correct the day it shipped. That's the last day you could be sure.

After that, every token is a claim that decays silently. Someone tweaks a hex value in Figma. Code moves on. Nothing breaks loudly — it just stops being true.

I'm testing a fix in public. Systemix syncs a Next.js design system with Figma — 31 tokens, oklch source of truth — and watches for exactly that decay.

The part I care about isn't detection. It's what happens next:

→ /drift-report flags the token: synced → drifted
→ It lands in a review queue. Not auto-fixed. Queued.
→ A human picks: accept the Figma value, keep code, or escalate
→ The decision — and the reasoning — gets written back into the system

I won't let an agent silently "correct" design decisions, because half the time the drift IS the decision — someone changed it on purpose and didn't tell the pipeline. Only a human can tell those apart. Today.

The bet underneath: a design system an agent can read isn't AI-native. One that learns what worked is. The review queue is where the learning gets captured.

Walkthrough below — real tokens, no mocked states.

Where does drift hide longest in your system? Mine was a dark-mode sidebar token. Three weeks.

#DesignSystems #DesignEngineering #BuildingInPublic #HumanInTheLoop

---
**Option C — Pattern 7: The Direct Question** *(default if Foundation got silence or "is this real?" skepticism)*

How long can a design token stay wrong in your system before anyone notices?

In mine, the honest answer was: until someone complained. Which means my "source of truth" was really a source of claims, with no expiry check.

So that's what I built this week, and the walkthrough below shows it end to end on the live system — no mocked states:

→ Systemix syncs 31 tokens between a Next.js design system and Figma (oklch in CSS, converted to hex for Figma Variables)
→ A token drifts — Figma and code disagree
→ /drift-report flags it on a dashboard: synced → drifted
→ A human resolves it in a review queue, and that resolution is written back

The write-back is the whole point. Detection alone makes a smarter alarm. Writing the human's decision back is what turns a design system an agent can read into one that learns what worked. That's the research bet behind this whole series.

What I can't measure yet: whether those captured decisions actually make the next resolution better. That's the open question I'm building toward.

So — genuinely asking: what's the longest a wrong value survived in your design system, and what finally exposed it?

#DesignSystems #BuildingInPublic #DesignEngineering #DesignOps

---

### 🎨 Visual / demo brief
**Format:** Native video, 4:5 vertical (1080×1350), ≤90 seconds. Burned-in subtitles mandatory — 80%+ watch muted; every spoken beat needs an on-screen caption. Custom thumbnail: dashboard with one token row glowing in the "drifted" status color + caption text "this token stopped being true."

**Shot list (~85s total):**
1. **0–6s — Cold open on the dashboard.** All 31 tokens green/synced. Caption: "31 tokens. All true. For now."
2. **6–18s — The drift.** Screen-record editing a token value in Figma (Systemix — Token Bridge file) so it diverges from globals.css. Caption: "Someone changes a value in Figma. Nothing breaks. Nothing alerts."
3. **18–32s — Detection.** Terminal: run `/drift-report`. Cut to dashboard: the token flips synced → drifted. Caption: "/drift-report compares Figma Variables against the oklch source of truth."
4. **32–55s — The review queue (longest beat).** Show the queue entry: token name, code value vs Figma value, side-by-side swatch. Hover the three actions: accept Figma / keep code / escalate. Pick one, add a one-line reason. Caption: "The agent detects. A human decides. The reason is recorded."
5. **55–72s — Write-back.** Show the resolution persisted (status returns to synced; decision + reason visible in token history). Caption: "The decision is written back. The system now knows what we did — and why."
6. **72–85s — Thesis card.** Plain text on background: "Generation is solved. Knowing when something stopped being true isn't." End card: name + "Part 4 — public research practice."

**Notes:** no music required (muted viewing); if used, keep under captions. Zoom to 125–150% on UI so token names are legible at mobile width. No cuts that hide state changes — credibility depends on continuity.

### 🔗 Links
- **Body: zero links** (links in body cut reach 30–50%). Say "context in the first comment."
- **First comment:** link to systemix-alpha.vercel.app + link to Post 1 (the thesis post).
- If repo requests appear in comments → answer individually in replies/DMs; don't add links to the post body within 24h (algorithm reset).

### 💬 Engagement primer
**First comment (post immediately):**
"Context: this is part 4 of a public research series on what makes a design system actually AI-native. The thesis (post 1) is that reading isn't enough — the system has to learn what worked, which means writing decisions back. The drift dashboard is the first proof. Live pipeline: systemix-alpha.vercel.app — Post 1 linked below. Next up: docs that update themselves when their signal source changes."

**Reply-bait question (in body, last line):** "What's the longest a wrong value survived in your design system, and what finally exposed it?"
**Backup prompt (drop as a reply if comments stall after 2h):** "I'll start: dark-mode sidebar token, wrong for three weeks, caught by a contractor screenshotting a bug that wasn't the bug."

## Downstream impact map
- **If replies cluster on the SIGNAL side** ("how does it know? what triggers detection?") → Post 6 leads with the signal mechanics and the configurable-signal argument gets top billing; Clarity story becomes the proof, not the hook.
- **If replies cluster on the HUMAN side** (review fatigue, "who staffs this queue?", trust) → Post 6 emphasizes that self-updating docs *reduce* the human's review surface; Post 7 adds a beat on what stays human in a cross-platform migration.
- **If replies cluster on "does write-back actually help?"** → that skepticism gets quoted (anonymized) in Post 6's narrative as the open question being chased; Post 7 must show at least one concrete instance of a written-back decision being reused.
- **If failure stories arrive in volume** → harvest 2–3 (with permission) for Post 6's first comment; they become external evidence the problem isn't just mine.
- **If silence** → Post 6 switches to its most concrete, story-led option (the Clarity/PostHog narrative, Option A) and drops abstract framing entirely.

> SIGNAL FROM POST 4: _pending_ → ADJUSTMENT TO POST 6: _pending_
> SIGNAL FROM POST 4: _pending_ → ADJUSTMENT TO POST 7: _pending_

## Revision log
| Date | Signal observed | Change made | Posts affected |
|---|---|---|---|
| — | — | — | — |
