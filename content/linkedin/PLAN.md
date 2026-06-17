# LinkedIn Public Research Practice — Master Plan
**Owner:** Boyan (publishing under own name; Systemix/Connecta are case-study names inside posts)
**Created:** 2026-06-12 · **Status:** all 7 packs drafted v1
**Canonical source:** Public Research Practice plan v3 · **Skill:** /linkedin-content

---

## 0 · Operating principle (unchanged)
No instrumentation. The work is the experiment; human response is the signal.
**The one metric:** does this body of work make the right people reach out?
**The bar on every post:** would a senior practitioner stop scrolling and reply?

## 1 · Voice & identity summary
- **Name/role:** Boyan — applied-research design engineer, building in public.
- **Domain:** agentic AI systems, design systems, design-code sync, learning loops, context engineering.
- **Audience:** senior design engineers, DS leads, AI-curious product/design practitioners, potential clients.
- **Tone markers:** direct, no-fluff, research-framed, honest about uncertainty; "evidence written back to a decision."
- **Avoid:** hype, "I'm excited to share", engagement-bait, metrics talk, hashtag stuffing (3–5 max).

## 2 · The sequence

| Slot | File | Title | Track | Format | Gate |
|---|---|---|---|---|---|
| 1 | `posts/post-1-thesis-context-loops.md` | Context loops = AI-native (THESIS) | Foundation | Text + diagram | None — origin post. Over-invested. |
| 2 | `posts/post-2-method-localhost-planning.md` | Planning agentic workflows on localhost (METHOD) | Foundation | Screencast | Post 1 published AND response read (wait, let it breathe) |
| 3 | `posts/post-3-instrument-3d-force-graph.md` | You can't trust a system you can't see (INSTRUMENT) | Foundation | Video | Posts 1–2 landed; clip never opens on the graph |
| 4 | `posts/post-4-drift-dashboard-hitl.md` | Drift dashboard + HITL | A | Video walkthrough | Foundation complete; Post 3 response read |
| 5 | `posts/post-5-learning-path-tutor.md` | Learning-path tutor (open research) | B | Video walkthrough | Post 4 out; framing must read as research, not pitch |
| 6 | `posts/post-6-self-updating-docs.md` | Self-updating docs + configurable signals | A | Screencast | Post 4 + 5 responses logged |
| 7 | `posts/post-7-connecta-migration.md` | Connecta prototype → cross-platform | A | **Carousel (11 slides)** | Posts 4–6 signals folded in; closes the arc |

Cadence: ~2/week after Post 1's breathing period. Destination post (dynamic agentic UI design system) is NOT in the seven — it opens only when 2–3 independent senior "how do I drive this?" replies arrive (rule lives in Post 7's impact map).

## 3 · Dependency / influence map (the loop, operationalized)

```
Post 1 (thesis) ──► sets vocabulary for ALL posts; reply clusters route:
  ├─ drift/staleness replies ──► Post 4 leads Option A; consider pulling Post 4 forward
  ├─ HITL/trust replies ──────► Post 4 leads Option B
  ├─ "how do you build it" ───► Post 2 leads Option B (early canvas reveal)
  ├─ edu/learning repliers ───► Post 5 leads the K-12 angle
  ├─ thesis disputes ─────────► Post 2 Option C gains automation-vs-learning paragraph
  └─ silence ─────────────────► Post 2 cuts tie-back to one line; demo argues instead

Post 2 ──► Post 3 carries dual signal blocks (reuse commenters' exact loop vocabulary;
           "planning theater" pushback → incident-framed Option A;
           Post 2 silence → Post 3 becomes the re-acquisition post)

Post 3 ──► "cool graph"-only replies → Post 4 stays deliberately unsexy (substance test);
           graph DM/repo requests → logged as Destination input

Post 4 ──► replies split Post 6: signal-mechanics lead (Opt B) vs Clarity-story lead (Opt A);
           write-back skeptics get quoted into Post 6's setup

Post 5 ──► repliers self-identify (educator / AI-ML / design) → decides whether Track B
           deepens after the seven, reframes toward AI audience, or stays one thread

Post 6 ──► "what else can be a signal?" replies → Post 7 reframe lead
           ("Tamagui = the Clarity swap for the entire rendering layer");
           contract-abstraction confusion → Post 7 adds plain-mechanics slide;
           unresolved write-back skepticism → slide 7 reused-decision proof non-negotiable

Post 7 ──► feeds the after-seven reflection + Destination gate (2–3 independent
           senior "how do I drive this?" replies = open the next arc in their words)
```

Full if-then rules live in each post file under **Inputs from upstream** and **Downstream impact map**.

## 4 · Signal-propagation workflow (do this after every publish)
1. **Log** every response in `LOG.md` (below): date, post, who, what they asked, peer vs potential client, exact vocabulary used.
2. **Synthesize per conversation** as it happens — a "could this work for X?" reply is a research input.
3. **Propagate:** open each downstream post file named in the published post's impact map. Fill its `> SIGNAL FROM POST N: … → ADJUSTMENT: …` placeholder. Change the lead copy option / hook / framing per the if-then rule. Record in that file's **Revision log**.
4. **Re-gate:** check the next post's gate conditions before scheduling.
5. **After Post 7:** write the reflection (yourself first; optionally Post 8) — which track pulled, who surfaced, what they asked. Decide: deepen the pulling track and walk toward the Destination, or diagnose (posts cleared the bar → thesis/audience problem; didn't → raise the work).

## 5 · Private response log
Keep `content/linkedin/LOG.md` (plain note, not analytics):

```
## YYYY-MM-DD · Post N
- Who: [name, role]
- Channel: comment / DM / repo request
- They referenced: [what]
- They assumed I could help with: [what]
- Peer or potential client: [which]
- Exact words worth reusing: "[quote]"
- Propagated to: post-X (change), post-Y (change)
```

## 6 · Content-unit template (locked)
Every post file uses the same five public slots — hook / demo / explanation / link / engagement — plus four loop slots: gate conditions, what-this-tests (private), inputs-from-upstream, downstream-impact-map, revision log. One screen, one thing, one learning. Links go in the first comment (links in body cut reach 30–50%). Post Tue–Thu 8–10am; reply to every comment in the first hour; never edit within 24h.

## 7 · Resolved & open questions
- ✅ Umbrella: own name. ✅ Post 1 drafted publish-ready (3 options). ✅ Template locked (this file + post files).
- ⏳ Threads variants: derive from chosen LinkedIn option per post when scheduling.
- ⏳ 3D force graph as the live UI of the practice: parked, Destination-adjacent (Post 3 logs DM interest as input).

## 8 · What we are explicitly NOT doing
No PostHog/analytics, no UTMs, no scraping, no dashboards, no engagement-metric optimization. The decision-grade signal is a human reaching out — it arrives for free.

---

## 9 · Post-pivot alignment (2026-06-13)
The Systemix pivot (repo-as-product, Cowork-first, no agent personas, Hermes engine-selectable) and the nWave analysis (`docs/nwave-vs-systemix.md`) change the **destination and the framing**, not the substance. **No major rewrite needed.** Specifics:

- **Destination shift — the one concrete edit.** The first-comment link moves from `systemix-alpha.vercel.app` to the **public GitHub repo** once it's public (repo-as-product, the nWave model). Until the repo is public, keep the existing link or point to the docs. Touch list (first-comment link only): **posts 2, 3, 4, 6, 7.** Do not mass-edit bodies.
- **Two signal systems, kept separate.** GitHub **stars/forks** are a *product* traction signal (ADR-017). This practice's signal stays **human replies/DMs only** (§0/§8, unchanged). A star is not a reply — don't start counting stars here.
- **No persona edits.** The posts never named the Ada/Flux/Scout personas (now removed, ADR-014), so nothing to change.
- **Substance holds.** DESIGN.md, MDX contracts, Hermes, drift, HITL, learning loops, the 3D graph, self-updating docs, Connecta — all still accurate post-pivot.
- **New content fodder (candidate Post 8 / reflection or the Destination post):** (a) *"I've been using nWave's seven waves to build Systemix"* — the dogfood/build-process story; (b) *repo-as-product* — why a 2-person team makes the GitHub repo the product, not an app; (c) the **design-ops** category line. These are *additions*, gated by the same reply-signal rules — not edits to the seven.
- **Vocabulary nudge:** where a post would name "the app/dashboard," prefer "the loop / the repo / Cowork cockpit" to match the settled architecture (Config/System/Atlas, ADR-010). Apply only if a rewrite is already happening for signal reasons.
