---
title: "Interview log — G1 gate for the AI-native DS kit beta"
wave: DISCOVER
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: OPEN — 0 / 5 interviews · 0 / 1 commitment signals
---

# Interview log — G1 gate

**Gate G1 (exit criterion for DISCOVER):** at least **5 real conversations** about *past behaviour*
(not opinions about the idea) and at least **1 commitment signal**, ideally a pre-paid audit.
Nothing in this folder counts toward G1 until this log has real rows. Synthesised "interviews" do
not count. That mistake was made once already (`docs/feature/agentic-loop-thesis/discover/interview-log.md`).
The public posts in `evidence/` are **secondary evidence** and do not count either.

**Deadline:** Sun **1 Nov 2026**. Hard check Fri **23 Oct**: with fewer than 3 booked, ask to move G1
by a week; do not lower the bar.

## Who to talk to (target mix)

| # | Segment | Why them | Where to find |
|---|---|---|---|
| 2 | **AI-native founders / small product teams** shipping with Claude Code or Cursor, with paid or usage-based pricing live or planned | Primary candidate ICP for kit + audit + AI-native blocks | Claude Code / shadcn communities, warm network, AI-Native Path learners |
| 2 | **Design engineers / DS leads** (Series A–C) whose design system agents keep breaking | Secondary ICP; buyers of audit + implementation | Design Systems Slack, LinkedIn, the existing partner network |
| 1 | **Agency / consultancy** delivering product UI for clients | Possible channel: white-label audits | Existing delivery-partner relationships |
| + | **Existing partners** (the Vero team; past client-build stakeholders) | Real users of the method; case-study permission | Direct |

Desk note: the loudest public voices on drift are design-system **maintainers** (public-sector and
enterprise systems), not 2–20-person product teams. Do not drop the AI-native slots; do watch which
segment actually describes a recent incident.

## Interview guide (Mom Test: past behaviour, specifics, money)

1. Walk me through the **last time** you changed something in your design system. What triggered it,
   who decided, and how long did it take?
2. When an agent (Claude Code, Cursor, v0…) builds UI in your product, **what goes wrong**? Show me
   the last example. What did you do about it? *What do you already run (rules files, lint, CI,
   `/design-sync`) and what still leaks through?*
3. Where does your design system "live" today: tokens, components, docs, rules? **Who reads each one?**
4. How do you decide whether a UI change *worked*? When did you last check? *Do you keep a record of
   why a rule or token exists? Show me the last entry.*
5. How did you build **billing / usage / credits UI**? What did it cost you in time? What would you
   rebuild?
6. Have you ever **paid for an audit** (a11y, UX, design system, performance)? What did you get, and
   what did you do with the report?
7. Have you ever paid someone to **implement** design-system or UI work? How was it scoped and priced?
8. If I ran a free scorecard on your repo this week, **who else would need to see it?** *Where did you
   last find a tool for this, and what did you try before?*

Add after the past-behaviour part, for G2: for each of six outcomes (agent follows the rules · know
it drifted before review · settle the open decisions · remember why a rule exists · scheduled sync ·
usage/credits view) ask **importance 1–10** and **how well served today 1–10**. Record the pair.

**Never ask** "would you use…?" or "would you pay for…?"; those answers are opinions, not evidence.
The one money question is the close (below), and its answer is logged verbatim.

## Commitment ladder (log the highest rung reached)

0. Polite interest (not a signal)
1. Shares a repo or URL for the free scorecard
2. Introduces a colleague or decision-maker
3. Books a review call to walk through the scorecard
4. **Pre-pays for an audit report**
5. Books or pre-pays an implementation sprint

## Hypotheses under test (revised 2026-10-11 after the desk round)

Original wording is in git (commit `250eac6`). IDs and thresholds are unchanged; only H1's and H5's
wording moved, and each change is marked.

| ID | Hypothesis | Confirm if | Kill / revisit if | Desk note |
|---|---|---|---|---|
| H1 | AI-native teams feel agent-built UI drift **recurringly, and it survives the remedies they already run** *(was: "weekly … and have no system for it")* | ≥3/5 describe a specific recent incident | ≤1/5 can name one | "Weekly" unevidenced; "no system" contradicted by DIY stacks |
| H2 | A scored, prioritized audit is worth paying for (€500–€1,000 range) | ≥1 pre-pays; ≥3 reach rung 3 | 0 pre-pay after 5+ scorecards are delivered | Support is supply-side only |
| H3 | Teams prefer "done for you" implementation over DIY with the kit | ≥1 asks for a sprint quote unprompted | everyone wants only the free kit | Weak; buyer budgets far below sprint price |
| H4 | Billing / usage / credits UI is a felt, repeated pain for AI-native products | ≥3/5 built it in the last 6 months and would not want to again | most use a provider's hosted UI and are happy | Plumbing pain supported; UI pain mostly end-user side |
| H5 | "Instructions + toolkit + evidence" (the App Shell model) matches how teams want to see their DS *(unchanged)* | ≥3/5 recognise their own gap in the overview | the DS-as-docs framing is enough for them | Instructions half strong; **evidence half has no demand evidence** |

## Recruiting plan (from `evidence/R4-recruiting-map.md`; nothing has been sent)

**Volume arithmetic.** Five held at about 10% no-shows means **6 booked is the floor**; 8 booked is the
safe target. A cold-only plan needs about 186 LinkedIn invites at the one sourced rate (4.3%
invite-to-interview, undated, automated), so warm channels carry the plan. Cold budget: **180
personalised invites, front-loaded (90 + 60 + 30), split 2 : 2 : 1 across segments A : B : C.** An invite
sent after about 26 Oct cannot become a held call before 1 Nov.

**Channels, ranked** (details, sources and unverified rules in `evidence/R4`): 1) existing partners and
"who else should I talk to?"; 2) AI-Native Path learners (screen them: some have no shipped product);
3) personal LinkedIn with a personalised invite and two follow-ups; 4) local builder meetups;
5) design-systems communities (zeroheight Slack, the Converge audience); 6) the Design Tokens
Community Group; 7) Claude Developers Discord and r/ClaudeAI (moderator's yes first); 8) Cursor
Meetup Utrecht, 29 Oct; 9) Indie Hackers; 10) AI-stack vendor communities (ask maintainers for two or
three introductions). **Skip:** Hacker News hiring threads, LinkedIn groups, subreddits naming
"market research".

| Week | Dates | Do | Target |
|---|---|---|---|
| 1 | Mon 12 – Sun 18 Oct | Build the screener form, booking link, consent script, tracking sheet and an interim **payment link** (real checkout is a later phase). Message every partner (a call plus two introductions each). One course broadcast. 90 LinkedIn invites, 15 a day, follow-ups at +1 and +3 days. Join four communities, read the rules, comment helpfully; at most four moderator-approved research posts | 2–3 booked |
| 2 | Mon 19 – Sun 25 Oct | Funnel review Mon. **Checkpoint Tue 20 Oct.** 60 more invites. Ask every contact for two introductions. **Hard check Fri 23 Oct** | 2–3 held; 6 booked by Fri 23 |
| 3 | Mon 26 Oct – Sun 1 Nov | Interviews 4–6 (Fri 30 is the buffer). Top-up of up to 30 invites Mon–Tue only, if fewer than 6 are booked. Fri 30: pre-pay offer to everyone at rung 3. Sat–Sun: write up the log; decide G1 | 5 held, ≥1 commitment |

**If only two are booked on Tue 20 Oct,** in order: diagnose with the benchmarks (accept rate under about
20% → fix the profile; replies low → fix the ask; bookings low → put the booking link in the first
message); ask each booked person and partner for two names; offer a small incentive **only** to people
who pass the screener (GitLab's published rate is $60 per 30 minutes; five cards is $300, optional,
today's budget is zero); go in person; rebalance segments but **keep every screener gate**. Do not drop
the "last 30 days" requirement and do not count written-only answers.

## Screener (exclusion questions first; the one-sentence "last time" answer is the gate)

**Front of the form, all segments.** (1) "Do you work for a company that sells design-system tooling,
UI audits or an AI design agent?" Yes → does not count toward G1 (route to an expert chat). (2) "Which
describes you best?" (founder or CTO / design-system lead / design engineer / agency or consultancy /
other). (3) Consent line: "I agree to be contacted about this research; my answers are used only to
schedule and prepare the call."

**Segment A — AI-native founder or small product team (2–20).** (1) An agent (Claude Code, Cursor, v0,
Copilot…) wrote or changed UI that shipped in the last 30 days? (2) Next.js with shadcn/ui, or Tailwind
with Radix? (3) Subscription plus usage or credits: live, planned within 6 months, or no? (4) In one
sentence: the last time an agent-built UI change did not match your design rules, what happened and what
did you do? (5) Team size, and who decides how the UI looks? **Pass:** Q1 yes, Q4 concrete, team 2–20,
and Q2 or Q3 yes. Prefer Q3 = live (it covers H4).

**Segment B — design-system lead or design engineer (Series A–C).** (1) You own a system (tokens,
components, docs) used by two or more product teams? (2) Series A–C or about 50–500 people? (3) In the
last 30 days an AI agent produced UI that uses, or ignores, your system? (4) In one sentence: the last
thing an agent got wrong against your system and how you found out. (5) Are your rules in a form an agent
can read (DESIGN.md, AGENTS.md or CLAUDE.md, Cursor rules, an MCP server)? **Pass:** Q1 yes, Q3 yes, Q4
concrete, Q2 yes or similar scale. Q5 is not a filter; vary it across the five.

**Segment C — agency or consultancy.** (1) Shipped production UI for a client in the last 90 days?
(2) Did Claude Code, Cursor, v0 or similar produce part of it? (3) Do you set up a design system or token
layer per engagement? (4) In one sentence: the last time a client asked for UI changes because it was
inconsistent, and how long the fix took. (5) In the last 12 months, sold or been asked to sell a
design-system audit or an "AI-ready" system, and at what range? **Pass:** Q1 yes, Q2 yes, Q4 concrete.

Existing partners skip the screener, are tagged **warm** in the log, and do not replace the in-segment
calls if the segment target is short.

## Outreach kit (not quoted from any source; placeholders in braces)

**LinkedIn note:** "Hi {first name}, I'm a solo founder studying how teams keep AI-written UI on-system. Not
selling anything. Could I ask about the last time it went wrong for you?"

**DM or email (about 75 words):** "Hi {first name}, I saw {specific public thing}. I'm a solo founder studying how
teams keep UI consistent when Claude Code or Cursor writes part of it. I'm not selling anything. Could you
spare 25 minutes to tell me about the last time it went wrong in {their product or system}? Booking link:
{link}. I'll send back the anonymised patterns."

**Follow-up 1 (day 1 after accept):** "Thanks for connecting. One ask: 25 minutes, one concrete example of an
AI-written UI change you had to fix. Any slot works: {link}. If someone else is closer to this, who would
you suggest?"

**Follow-up 2 (day 3):** "No worries if it's a busy week. I'm trying to learn what actually happens, not to
demo anything. Afterwards I can run an open-source design-system check on one repo and send you the result,
no strings." *(Offer the scorecard only after the call: offering it inside the invite turns the call into
a sales trial and biases the commitment test.)*

**Segment swaps for the second sentence:** DS lead: "…how design-system teams cope when AI agents change UI
that uses their system (drift, duplicates, rules)". Agency: "…how agencies keep client UI consistent when AI
tools write part of it".

**Warm message to a partner:** "I'm running five research calls before 1 November on how agent-written UI
drifts from a design system. Could I have 25 minutes about the last time it happened with you, and could you
point me to two people who'd also have a view?"

**Moderator pre-clearance (Discord or subreddit modmail):** "Hello, I'd like to post one research request, not a
product pitch: 25-minute calls with people who have had an AI agent change UI in a Next.js or shadcn product
in the last 30 days. The screener takes two minutes: {link}. I'll post the anonymised findings here
afterwards. Is this allowed, and where would you like it?"

## Call procedure (30-minute box)

3 min intro and consent · 20 min past behaviour (5–6 of the 8 guide questions) · 4 min commitment
(rungs 1–4) · 3 min "who else should I talk to?".

**Consent script (start of call):** "This is research, not a sales call. I'd like to take notes and, if you
agree, record audio so I don't miss details. I keep the recording only for my own analysis, delete it within
{your retention period}, and quote you only without your name or company unless you tell me otherwise. You
can skip any question or ask me to stop recording at any time. Is it fine to record?" Notes: GDPR applies
to a founder in the EU; "no recording" is an equal option; no third-party AI notetaker without telling the
person and a processor agreement; separate "interview consent" from "may I name you in a case study". Not
legal advice.

**Close of call:** (1) "Would you share a repo or URL so I can run the scorecard for you?" (2) "Who else
should I talk to?" (3) "If I delivered the full audit for €{price}, what would stop you paying for it
today?" Log the answer to (3) verbatim.

## Debrief template (one per call, filled within 24 hours)

```
Date · channel · segment (A / B / C / warm) · touch number · screener pass (y/n)
Role and company size (no names in this public file; keep identities in a private sheet)
Last incident (past behaviour): what happened · when · who noticed · what they did · time/cost
What they already run: rules files · lint · CI · /design-sync · other
Spend today (time, tokens, money) on the workaround
Quotes, 25 words or fewer each, in their words
Importance / satisfaction pairs for the six outcomes (1–10, 1–10)
Billing/usage UI: built or bought · time · would they rebuild
Paid for an audit or implementation before? what · price · what they did with it
Highest rung reached (0–5) · who they introduced
Close answer (3), verbatim
Hypotheses touched (H1–H5): supports / contradicts / silent
Grade: PAST_BEHAVIOR | PRESENT_PAIN | FUTURE_INTENT_OR_OPINION | DISCONFIRMING
```

**Grading rules.** Only lived specifics count as PAST_BEHAVIOR. "I would…" and compliments are
FUTURE_INTENT_OR_OPINION and are discounted. A skeptic who describes a solved problem is DISCONFIRMING and
**counts** in the denominator. Warm partners are logged but tagged. A pre-pay is rung 4 only if money moved
or an invoice was accepted in writing.

## Log

| Date | Who (role, company size) | Segment | Past-behaviour evidence (quotes) | Pain / workaround | Spend today | Rung reached | Hypotheses touched |
|---|---|---|---|---|---|---|---|
| _(empty — G1 not started)_ | | | | | | | |
