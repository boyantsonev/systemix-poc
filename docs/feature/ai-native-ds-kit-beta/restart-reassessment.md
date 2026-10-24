---
title: "Restart reassessment — what works, what is decided, what I need"
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: >
  Evidence-checked reassessment for a clean-slate restart. Nothing here is adopted until the
  founder answers §5. Facts come from running the product and re-reading the repo (26 agents:
  five fact reports, a synthesis, eight adversarial re-checks, a critic). Legal and tax points are
  unverified.
---

# Restart reassessment

**Scenario assessed.** The founder starts over from a clean slate: no backward-compatibility duty, no
migration of the dogfood data or of npm users, and old ADRs bind only where a *business* decision
still holds.

## 1. Bottom line

1. **A restart removes the engineering and legacy questions, and none of the business ones.** D2 (the
   `.systemix` → `design/.state` migration), D8 as posed, the CLI/MCP trim lists, the two queues, ADR
   bookkeeping and npm 0.2.0 compatibility all stop being questions. The ICP, the price, the name, who
   is interviewed, consent, the legal seller and case-study permission all remain.
2. **A restart does not touch the bottleneck.** There have been zero conversations with a prospective
   buyer, and the 5-conversation gate has been written four times and run never. The strategy history
   lists 15+ repositionings in 15 weeks, six reversed within a day, and a "clean slate" already
   happened once (v7, 18–20 June). **Interview #1 needs no product code.**
3. **Three findings change the plan:**
   - **The "free deterministic scorecard" does not exist.** `systemix audit` only copies a skill file
     (`packages/cli/src/commands/audit.js:29-45`). The nearest real piece is `drift scan`, a tested
     regex counter that scores 0/100 on both real repos tried. The first paid audit is therefore a
     **concierge, model-judged audit**, and this repo's own DISCOVER documents were wrong to say the
     scorecard "exists today" (I wrote that; the DISCOVER docs are now corrected).
   - **The payment rail the plan "decided" excludes human services.** Lemon Squeezy's docs list
     "services of any kind (including marketing, design, web development, consulting…)" as prohibited;
     Polar's policy lists "human services". Both as returned by search (page text not fetched), so
     confirm with each. A €490 report and a sprint need direct invoicing, which needs a legal seller
     identity that no file in the repo establishes.
   - **The safety fixes are merged but not shipped.** GitHub `main` (`79d0aca`) took PRs #125, #126,
     #127 and #130 today: scoped npx name, non-destructive `init`, path-safe ids, origin check, CI.
     npm `latest` is still `@getsystemix/cli@0.2.0`, which **wipes user data on a re-run and writes
     outside the project** for `../` ids.
4. **What I need from you is six things this week** (§5, tier A), then four before the first money
   ask. Everything else waits.
5. **My proposed meaning of "start over":** a new working tree and a fence, not a deletion. Tag the
   old tree, keep what the evidence says works, carry no legacy, and let only external evidence
   reopen what is frozen (§6).

## 2. What works and what does not (verified by running things)

| Area | Verdict | Evidence |
|---|---|---|
| File-based experiment / goal / propose / loop core | **works** | Offline lifecycle `new → measure → audit → close` exits 0 and writes MDX, LEARNINGS and a queue card. Checkout: Jest 237/237, Vitest 90/90, four identical runs. GitHub `main`: Jest 302, Vitest 193, node:test 18, all green, with CI. Caveat: about 96 of the 237 tests cover the core loop; the real PostHog fetch path is untested |
| Value of that loop | **unproven** | 3 experiments in this repo, 2 learnings, both "insufficient signal"; none conclusive across 9 experiments; one running past its review date |
| `init` | **works on main; broken on npm** | Non-destructive on `main`. On 0.2.0 any re-run overwrote `LEARNINGS.md`, `DESIGN.md`, `guardrails.mdx`, `tokens.css` with template bytes (`init.js:45`, `copyFileSync`) |
| `drift scan` | **partly** | Deterministic and tested (3 tests); named my 3 hex and 3 px samples correctly. But the 0–100 score floors at 0 after about 50 colour literals (`drift.js:78`), shows only the top 5 files, counts `#123` and `&#8212;` as colours, and exempts only `design/tokens.css`, so it flags `globals.css`. Use its counts, never its score |
| Concierge audit (3 skills) | **partly** | `design-audit` 155 lines, `readiness-audit` 114, `drift-report` 40. Scores are model-judged with no weights, so not reproducible. Never run on a paid case; hours per audit unmeasured |
| Scorecard, badge, baseline (beta rung 1) | **does not exist** | No scoring code or badge in `packages/cli/src`. Vero's reference scorer is 499 lines plus a pin test (days for a v0, weeks to calibrate) |
| MCP server | **works, mostly unused** | Starts; 27 tools. Only the six `experiment_*` tools are referenced by any skill or doc |
| Local viewer app / Next site | **builds** | App serves and builds on `main`. The site builds only with Google fonts stubbed in this sandbox. Live site not reachable from here |
| Human approval path | **broken** | No `queue` command exists. Approving in `systemix app` flips a status and scaffolds nothing. Two queue files, seven code paths that close work |
| Engine cron (weekly propose) | **broken** | 13 scheduled runs, all "success", generation skipped, no proposal or PR ever produced |
| Autonomy dial / write-policy | **display only** | The policy function is called only with `humanApproved: true`, and `skill-update.js` writes before any card. "Self-modification is always HITL" holds only because no autonomous writer exists |
| Checkout, revenue, lead capture | **broken** | Every checkout is a `mailto:`. `/api/subscribe` logs the email and returns ok. €0 revenue; 101 visitors and 1 install copy in 30 days; 1 star |
| Public claims on the live site | **false in places** | "Two-person studio", "proposed by the automation", "Claude Code, Cursor, Codex", a €99/249 ladder, "pay once", "dial up to autonomous" |
| Legal and commercial | **absent** | No seller entity or VAT position, no terms, privacy, refund or imprint, PostHog EU with no consent UI, personal Gmail as contact, no domain beyond `vercel.app` |
| Name "Systemix" | **at risk, unverified** | Search extracts show a US registered mark for software consulting and design and an exact-name consultancy; bare npm name and major TLDs are taken. No registry searched |
| Published packages | **unsafe** | 0.2.0 as above; tarball has no LICENSE file and ships the readiness-audit skill publicly under MIT |
| Public repo hygiene | **exposed** | `research/`, `content/linkedin/` and `sessions/` sit in 342 public commits and include client and competitor material; deleting from HEAD does not clean history |
| Figma / TokenGuard-era commands | **dead weight** | 9 of 25 commands (36%, 39% of CLI lines); `doctor` exits 1 on a fresh install. Nothing in the loop needs them |
| Beta plan as a source of truth | **stale** | Phase 0 lists fixes already merged; says 19 Figma skills install, a fresh `init --defaults` installs 26 skill folders; kit build starts 19 Oct, before G1 on 1 Nov; gate letters mean different things in the README and in `discover/` |

## 3. Business decisions

### 3a. Made, and still binding after a restart (as corrected by the re-checks)

- **MIT, public repo** (ADR-017; every `package.json`). Add a LICENSE file to every future package.
- **The loop reasons on Claude Code with no local-LLM dependency** (ADR-019). Ollama stays a roadmap item;
  support for other tools (Cursor, Codex) is undecided, so claim Claude Code only.
- **New instances start at ghost** (`init.js`), and skills are vendored under `.claude/skills`.
- **Never sell UI code; sell audit, implementation, wiring, later the loop** (DSC-5). Recorded in the
  DISCOVER docs and the July pricing-reorg doc, **not in an ADR**.

### 3b. Contested by the re-checks: do not treat as made

- **The honesty rule** ("nothing public states what the product cannot show"). Only *proposed* in the beta
  plan. ADR-020 covers honest "not configured" states, not claims, and the July reframe doc let marketing
  claim the vision. Restate it, source it, then enforce it (§5, item 6).
- **"Free tier = the whole engine"** is recorded only in `pricing-packaging-reorg.md`, undated, not an ADR,
  and the live €99 kit was its own implementation. Open under D4 and D5.
- **"Core principles that never changed."** Wrong as worded: the engine changed twice, "PostHog EU only"
  and "no personas" are not literal, and the autonomy dial is not enforced. Keep four of the eight (Claude
  Code engine, ghost at init, MIT, skills in `.claude/skills`) and drop the rest as habits.

### 3c. Dissolved by the restart

| Question | Why it goes away |
|---|---|
| D2: `.systemix` → `design/.state` migration, and ADR-024's reversal of v6 | Two trees disagree; a new tree chooses once |
| D8 as posed: evolve `packages/app` or build on Design Studio | Assumes carrying legacy code; the real residual (port or fork) is decided after the first paid report |
| Trim to 9 CLI commands, MCP 27 → 8 tools, 19 routes, unify two queues | Not carried. Keep the *requirements*: non-destructive init, id validation, origin check, one approval path |
| Which of 22 ADRs bind | Replace with a one-page "decisions that still hold" |
| npm 0.2.0 compatibility and migration | No known users. Deprecate instead |
| The dogfood contract and experiments; the live €99/249 ladder and kit gating | Not migrated |

**Caveat:** this dissolves the *obligation*, not the *cost*. Discarding 237 tested core-loop tests and the
only earned LEARNINGS is a business choice. Tag the old tree; do not delete it.

### 3d. Not removed by a restart

The ICP (two segments to test, one agency) · the price to say · the name · who is interviewed · recording
and retention · the legal seller and VAT · case-study permission for the reference instance and the design
partner · what the live site says while you interview.

### 3e. New questions a restart creates

New repo or same, and the fate of public history · `npm deprecate` of the two unsafe packages · what the
live site does meanwhile · provenance of Vero-derived assets ("move patterns, not files") · the restart
fence itself.

## 4. Decisions on the table, with a default (full register: Appendix A)

| Ref | Decision | Default I will use for preparation only |
|---|---|---|
| F1 | The fence (§6) | Draft only; nothing is enforced until you accept it |
| D1 | ICP and one-liner | Test two segments (AI-native small teams, design-system leads) plus one agency; the beta line is used **in outreach only** |
| D5a | Price to say | €490 report; first five at €290 (€0 is not offered because only money moved counts as a commitment). **Said after the scorecard walkthrough, not on call 1** |
| D5b | Payment rail | Direct invoice for the first three; no merchant-of-record store |
| R4 | Sell before build | No new building before the Fri 23 Oct check, except the concierge dry-run and the site fix |
| R5 | What "scorecard" means for audit #1 | Concierge, model-judged, labelled as such; drift counts as supporting evidence |
| R3 | The live site | Minimal honest edit as a PR for you; full replacement after G1 |
| R11 | The name | Keep for interviews; run three registry searches by 23 Oct; decide by 1 Nov, before buying anything |
| D3, D4, D7, D8 | Stack, licence boundary, hosting, App Shell | Later (before any kit build); defaults in Appendix A |

## 5. What I need from you

**Rule for silence:** silence is not consent. Without an answer I prepare drafts only. Nothing is sent,
posted, merged, published, deprecated or made public.

### Tier A — this week, gates interview #1 (six items)

1. **Time and stop rule.** Hours per week; full-time or alongside a job (and whether any employer
   moonlighting or IP clause could touch this work); the runway or date at which you stop or change course.
2. **Reach.** Six to eight warm names, each with a channel, and which are **off-limits** (for example the
   reference-instance team and the design partner, until you say otherwise). Cold outreach alone needs
   about 186 invites for 8 bookings at the one sourced rate, so this list is the real critical path.
3. **A named second reviewer** who reads the raw interview notes and holds the fence. A fence only you
   enforce has no force, and warm friends overstate demand.
4. **Recording and retention.** Record with consent, or notes only? How long to keep them? (The consent
   script still has a placeholder.) Default until answered: notes only.
5. **The outreach line and the segments** you will test (D1). One sentence you are comfortable saying.
6. **The live site and the two unsafe packages.** OK for me to prepare a small PR that removes four false
   claims and marks `/kit` and `/audit` invite-only; and OK that **you** run `npm deprecate` on
   `@getsystemix/cli@0.2.0` and `systemix-mcp-server@0.1.0` (only you hold npm credentials).

### Tier B — before the first money ask (about 20–30 Oct)

7. **Seller identity.** Country and legal status you would invoice under (employee, freelancer, sole trader,
   company) and any VAT registration. Book one accountant hour this week; the wait is the long part.
8. **Anthropic plan and terms** you run Claude Code under. Until known: audits only on public repos or with
   written owner consent.
9. **Services or product.** Both paid rungs are hand-delivered services. Is "this turns out to be mostly
   consulting" an acceptable result, and what is your hourly floor? At 12 hours per audit, €490 is about
   €41 an hour before tax.
10. **The number to say** after the walkthrough (default above), once you know your hour cost.

### Tier C — later, do not answer now

Name decision (by 1 Nov) · new repo and org · licence boundary (D4) · stack (D3) · hosting (D7) · naming the
reference instance or the design partner in any case study (D6) · domains and handles · analytics and consent
on any new public page · benchmark naming policy.

## 6. The fence (proposed)

The record shows the pattern: a restart, a new plan, no external check. I propose this one-pager, and I
would hold myself to it too:

1. Tag the old tree `pre-restart-2026-10-11`. Delete nothing.
2. **Only external evidence reopens a frozen item:** a graded past-behaviour interview row, money moved, or
   a written client request.
3. **21-day pre-interview cap:** no new route, page, package or skill, and **no new `docs/feature` files until
   interview rows exist.** This document is the last one.
4. **Fri 23 Oct hard check:** fewer than three calls booked means move G1 by a week; do not lower the bar.
5. **Day-28 check (Sun 8 Nov at the latest):** five held, graded calls and one commitment, or you decide
   from the stop rule you gave in item 1, not from a new plan.
6. The second reviewer reads the interview log and every ADR before it is accepted.

## 7. What I can do now, and what I will not

**Prep only, drafts you approve, nothing sent:** the interview kit (screener text, booking blurb, tracker
columns, consent note, personalised drafts for your warm names); a **concierge dry-run on one public
Next.js + shadcn repo** to measure hours per audit and what the model gets wrong; the honest-site PR; a
corrections patch for the beta docs (scorecard does not exist, "deterministic" removed, Phase 0 marked
merged); a scan of the full git history for client and private material; the name-clearance query list;
the accountant brief.

**I will not:** send or post anything, contact anyone, read Gmail, Calendar or Drive without your explicit
yes, merge or publish, deprecate a package, or make anything public. I will not start the kit, scorecard,
Hub or App Shell before the 23 Oct check.

## 8. Top risks

- **Restart #14.** By the precedents pass's own count, 13 restarts since 27 April (strategy history says
  15+ repositionings), zero interviews in 166 days. Cheap restarts with no external gate are the path of
  least resistance.
- **Demand may be absent.** No buyer account for a design-system audit found; decision memory has no demand
  evidence either way; sprint price sits 6–45× above visible budgets; free substitutes are at scale and
  Anthropic is the incumbent for scheduled sync.
- **Nowhere to take money, and a commitment you cannot yet ask for.** No seller identity, terms or rail, so
  "money moved or an invoice accepted in writing" is not executable yet.
- **Solo capacity.** Hours unstated; warm-only interviews overstate demand.
- **Name risk** discovered after domains, badge and customers.
- **Client code.** A paid audit is a model session on someone else's repo; plan terms and a processor
  agreement are unconfirmed.
- **Public exposure** of client and competitor material in history; **false claims** on the live site; the
  **unsafe npm latest**.

## 9. Not verified here

The live site and traffic (sandbox proxy), GitHub and Vercel secrets, npm download counts, the Playwright
specs, the Vercel plan, and every legal or tax fact (search extracts and docs pages as returned by search;
no accountant or lawyer, no registry searches). The 13-restart count is a judgement. Several "decided"
items turned out not to be recorded as decisions at all; Appendix B lists the corrections.

## Appendix A — Decision register (44 items; defaults are for preparation, not adopted)

| Id | Status | Who decides | Question | Recommendation (shortened) | Check |
|---|---|---|---|---|---|
| F1 Restart fence | new-from-restart | founder-only | Which rules stop this from being restart #14 with no external evidence? | Adopt as one page: (a) tag the old tree `pre-restart-2026-10-11`; (b) only external evidence may reopen the frozen items: a graded past-behaviour interview row, money moved, or a written client request; (c) 21-day pre-interview cap with no new route, page, pa… |  |
| R1 Reach list | open-blocking | founder-only | Who can the founder actually reach for the 5 interviews, and by which channel? | Founder supplies 6-8 warm names with a channel each (the Vero team, past client-build stakeholders, design-engineer peers, one agency) and sends the first partner messages Mon-Tue 12-13 Oct. Agent drafts everything. Change the funnel (profile, ask, booking li… |  |
| D1 ICP, one-liner and ladder freeze | open-blocking | founder-only | Which ICP, one-line description and ladder are frozen, and for how long (beta D1 / ADR-023, unwritten)? | Freeze what is tested, not what is claimed. Interviews test two segments (AI-native founders/small teams vs DS leads, plus one agency). The outreach line is the beta L1+L2 line, used in outreach only. Write a one-page ADR-023 with external-only reopen trigger… |  |
| R2 Recording, consent and retention | open-blocking | founder-with-agent-prep | Will interviews be recorded, and what is the retention period? | Default: record only with explicit consent, else notes only; transcripts deleted 90 days after G1 closes; no names in any public file; notes and tracking sheet in a private Drive or repo. Agent fills the placeholder and prepares the one-page consent text. |  |
| R3 What the live site says while interviews run | open-blocking | founder-with-agent-prep | Replace, freeze or minimally correct getsystemix.vercel.app, which advertises EUR 99/249 and false claims? | One small PR, 3-6 hours: remove those four claims, set /kit and /audit to 'invite only', delete or fix /api/subscribe, add no analytics. Keep the site up (the published CLI prints a docs link to it). Do not redesign. Replace it fully after G1. Honour any mail… |  |
| R4 Sell before build | made-reopen | founder-only | Does any kit, scorecard, Hub or App Shell build start before G1? | Build nothing new before the Fri 23 Oct check. Allowed in the window: interview kit, a concierge dry-run on a public repo, the honest-site PR, the decisions sheet. After 10-23, build only what the first paid report needs. Change if 3 or more booked calls plus… |  |
| R5 What 'scorecard' means for audit #1 | made-reopen | agent-can-decide | Is the first audit a concierge, model-judged audit, or does it wait for a deterministic v0? | Run audit #1-#3 as concierge audits using /design-audit, /drift-report and /readiness-audit, labelled 'model-judged, not reproducible', with drift counts as supporting evidence only. No percentile, no badge. Build the deterministic v0 (3-4 counters: colour li… |  |
| R6 Weekly hours, runway and kill date | open-blocking | founder-only | How many hours a week, and until when, will the founder run this? | Founder states hours per week and a runway or kill date. Default plan if silent: 15 hours a week, 70% on recruiting, calls and audits through 1 Nov, and the day-28 check from F1 is the kill/continue point. |  |
| D5a Price to say at the close | open-blocking | founder-only | What price does the founder say at the close of call 1, and who gets a discount (beta D5)? | Quote EUR 490 for the report. First five design partners EUR 290, not EUR 0, because only money moved or an invoice accepted in writing counts as a commitment (interview-log.md:209-210). Currency EUR, with the VAT position fixed after the accountant call. Rai… |  |
| D5b Payment rail | made-reopen | founder-with-agent-prep | LemonSqueezy or Polar (the 'decided' rail) or direct invoicing? | Use direct invoicing (bank transfer or a Stripe account in the legal seller's name) for the first 3 audits and sprints. A merchant of record is at most for a fully automated product. Ask one support question before ever relying on LS or Polar for a scored rep… |  |
| R7 Legal seller identity and VAT | open-blocking | founder-only | Which entity invoices, and what is its VAT position? | Founder states country and current status (employee, self-insured freelancer, sole trader, EOOD). Book one hour with a local accountant before the commitment ask. Agent prepares the question list (VAT for non-EU clients, whether a below-threshold seller must… |  |
| R8 Model over a client's private repo | open-blocking | founder-with-agent-prep | Which Anthropic plan and terms may process client code, and what does the client sign? | Default until answered: audits run only on public repos or on repos where the owner gives written OK; paid client audits run on a Commercial-Terms account (Team or API). Agent drafts a one-page NDA plus DPA and a sub-processor list for lawyer review; founder… |  |
| R9 Engagement paperwork | open-blocking | founder-with-agent-prep | What terms, privacy notice and refund policy govern a paid audit? | One-page engagement agreement and SOW (scope, fixed fee, deliverable IP, liability cap, confidentiality, payment terms, deletion of cloned repos at the end), a privacy notice, a refund line. Agent drafts for review; get a lawyer or accountant to read it once.… |  |
| R10 Booking link, screener form, private tracker | open-blocking | agent-can-decide | Which tools run intake and tracking? | Any free booking tool, a plain form, and a private sheet (Drive or private repo). Warm outreach goes from the founder's existing channels first. A domain mailbox waits for the name decision. |  |
| R11 Keep or rename 'Systemix' | made-reopen | founder-with-agent-prep | Keep the name, given the trademark and domain collisions? | Keep the name for interviews (outreach does not need it). Run EUIPO eSearch, WIPO Global Brand Database and USPTO TSDR searches by Fri 23 Oct (about an hour; agent prepares the checklist and queries). Decide by Sun 1 Nov and before buying any domain, mailbox… |  |
| D6 Vero and the confidential client prototype as named case studies | open-later | founder-only | May the reference instance and the unnamed client prototype be named, and who owns the reference instance's assets (beta D6)? | Default: name neither in outreach, site or reports until written permission exists. Founder states who owns Vero and whether the reviewer/team agrees. Needed before the first discounted 'case-study rights' report ships. |  |
| R12 Design-partner status (ADR-012) | open-later | founder-only | Is design partner #1 an interviewee, a closed engagement, or a data-handling constraint? | Founder states status. Default: treat as a possible warm interviewee only with explicit consent, and remove client details from any public location (R14). Change if the design partner confirms it is an active customer. |  |
| R13 npm 0.2.0 still published and unsafe | new-from-restart | founder-only | Deprecate @getsystemix/cli@0.2.0 and systemix-mcp-server@0.1.0, or publish 0.2.1? | `npm deprecate` both with a plain message ('unsafe, superseded, see repo') now; do not publish 0.2.1 unless the name is kept. Never use unpublish (the CLI depends on the MCP package). Add a LICENSE file to every future package. Change if the name decision is… |  |
| R14 New repo or same, old repo and public history | new-from-restart | founder-with-agent-prep | New clean repo under an org, or continue boyantsonev/systemix-poc? What happens to the old one? | After the name decision: new repo in a new GitHub org with clean history; tag the old one, scan full history from a bare clone for secrets and private material, then make it private or archive it with a pointer. Disable the 3 crons and close PRs #92, #95, #10… |  |
| R15 Provenance of Vero-derived assets | new-from-restart | founder-only | May score.mjs, the Hub and the token compiler from Vero be reused in an MIT repo? | Rewrite counters from scratch for Next/shadcn. Port nothing from Vero without the founder's written statement of ownership and licence. Agent keeps a provenance note per module. |  |
| D4 Licence boundary (MIT kit vs private generator) | open-later | founder-with-agent-prep | What stays MIT and what lives in a private repo or ee/ (beta D4, ADR-025 unwritten)? | Default: kit, CLI, skills and tokens MIT; report-generator internals, rubric weights and any benchmark cohort in a separate private repo created before the generator is written. Treat the 0.2.0 skill as public. Add DCO or CLA before any outside PR. Change if… |  |
| D3 Reference stack for the kit | open-later | agent-can-decide | Which stack does the kit target (beta D3)? | Adopt K1 as the default and let the screener ask each interviewee's stack. Change if 3 or more of 5 interviewees are not on Next/shadcn. |  |
| D2 design/ required, .systemix to design/.state migration (beta D2) | dissolved-by-restart | agent-can-decide | Make design/ required again and drop the migration? | The migration and the ADR-024 reversal disappear; choose once in the new tree. Residual (not legacy): the kit includes design/ (DESIGN.md, tokens.css, guardrails.mdx) because that is what the audit hands over; no loop objects in the kit v1. Freeze this under… |  |
| D7 Hosted or not | made-keep | agent-can-decide | Does anything run hosted (beta D7, ADR-006)? | Keep. Nothing hosted is now the default of a clean slate. Report delivered by email or private static page. Reopen only at rung 5. |  |
| D8 App Shell: evolve packages/app or build on Design Studio | dissolved-by-restart | agent-can-decide | Which basis for the App Shell (beta D8)? | As posed, the question disappears. The residual (port the viewer vs fork Design Studio) is open-later and decided after the first paid report. First three reports go out as markdown or PDF plus a 30-minute walkthrough. |  |
| X1 Unit of evidence and decision memory | open-later | external-evidence | Is the differentiator decision memory (bet, measurement, decision with its reason), and what is the unit? | Park the loop code and ship nothing about decision memory until interview Q4 returns. Ask Q4 in every call. Pre-registered: if nobody keeps decision records, retire the claim. Default unit for now: the audit finding plus decision record, reusing the experimen… |  |
| X2 Trim lists and legacy engineering | dissolved-by-restart | agent-can-decide | Trim the CLI to 9 commands, MCP from 27 to 8 tools, remove 19 routes, publish or remove @getsystemix/app, unify two queues, fix the CSRF and path-saf… | Do not copy them; archive under the tag. Keep as requirements for new code: non-destructive init, id validation, origin check, one approval path. Port patterns (experiments.js, loop.js, layout.js) only when rung 5 is real. |  |
| X3 Which ADRs bind | dissolved-by-restart | agent-can-decide | What remains binding from 22 ADRs, all marked DECIDED? | Replace the status bookkeeping with a one-page 'decisions that still hold': 006 (nothing hosted), 009 (DS package carries no analytics), 017 (repo-as-product, MIT), 019 (engine = Claude Code), the write-policy covenant, honesty guardrail. Archive the rest. |  |
| X4 Gate vocabulary | made-reopen | agent-can-decide | What do G1-G4 mean? | Keep G1 as written. Rename the revenue milestones M1 (3 paid reports) and M2 (1 sprint sold). Drop the rest of nWave ceremony for a one-page decision sheet plus the interview log (principle 7 cannot be met by one person). |  |
| X5 Delivery promise of the paid report | made-reopen | founder-with-agent-prep | What are the delivery time and format of the paid report? | Promise 3 business days; markdown or PDF plus a 30-minute walkthrough for the first three; Hub page later. Measure hours per audit in E4. |  |
| X6 Supported-tool claims | made-reopen | agent-can-decide | Which coding tools may be claimed as supported? | Claim Claude Code only. Add Cursor only after one tested run. Screener asks which tools interviewees use. |  |
| X7 Monetization-block scope (usage meter, credits, paywall) and the 'monetized' ICP filter | open-later | external-evidence | Are AI-native billing blocks in the kit and in the ICP filter? | Not in v1 kit. Add 'subscription + usage live?' to the screener as a signal, not a filter, and test the wired pack as a paid wiring item only after 3 unprompted asks. |  |
| X8 Sprint price and smaller fix pack | open-later | external-evidence | What does an implementation sprint cost, and does a smaller fix pack sell? | Publish no sprint price. Ask close question for E6 in calls after a scorecard. Quote per engagement. |  |
| X9 Agencies as a channel; the Anthropic overlap; jobs labelled validated | open-later | external-evidence | Are agencies a channel; does a paid audit beat asking Claude Code to audit; are the JTBD jobs validated? | Add 'why not just ask Claude Code to audit it?' to the close. Relabel jobs.yaml honestly (agent). Keep one agency slot. |  |
| X10 Free tier and monetisation principle | made-keep | founder-only | What is free and what is paid? | Keep. Kit is free MIT; paid = audit, implementation, wiring, later the loop. The EUR 99 download and its gating disappear with the old site; no migration duty. | re-checked: contested |
| X11 Core principles that survive | made-keep | founder-only | Engine = Claude Code; autonomy dial default ghost; self-modification always human-approved; skills in .claude/skills; code-first OKLCH tokens; PostHo… | Keep all. Do not claim 'dial up to autonomous' until enforced outside the Next route. Do not reopen after the restart without external evidence. | re-checked: contested |
| X12 Honesty guardrail | made-keep | agent-can-decide | Marketing may claim the vision; the product and outreach must not state what is not true. | Keep and apply to outreach and reports: no 'deterministic', 'builds itself', 'two-person studio', percentile or badge until true. Enforce with a CI string check on one canonical one-liner. | re-checked: contested |
| X13 Voice, offer names, visual identity | dissolved-by-restart | agent-can-decide | Which names and voice apply, and is the TVA (Marvel homage) theme carried? | Pick once in the new tree: Scorecard (free), Audit Report (paid), Sprint. Plain language in outreach; no 'loop'. Do not carry tva-* utilities into any public kit. |  |
| X14 Domain, handles and organization | open-later | founder-only | Buy a domain, org and handles? | After R11. Buy the .com plus one defensive TLD (about USD 25/yr), create the GitHub and npm orgs the same day, and set a role mailbox. Confirm the Vercel plan is Pro before paid offers are advertised. |  |
| X15 Analytics and consent | open-later | agent-can-decide | Does the new public face run analytics? | None on the holding page. If added later: cookieless or a consent banner; no A/B below about 100 visitors per variant. |  |
| X16 Distribution channels and dates | open-later | founder-only | Which channels and launch dates (OSS beta Dec 7-13, Show HN/Product Hunt in January)? | Commit no public dates until M1. LinkedIn: publish only what a real interview or audit produced. Course CTA needs the founder's permission (ownership not stated). No badge until a calibrated v0 exists. |  |
| X17 Third-party benchmark policy and OSS hygiene | open-later | agent-can-decide | How are third-party repos named in a benchmark; what governance files ship? | Anonymised aggregates by default; named only with opt-in. New repo ships SECURITY.md, CONTRIBUTING with DCO, CHANGELOG, tagged releases before the first public announcement. |  |
| X18 Who runs and pays for the scheduled loop | open-later | external-evidence | Hosted or bring-your-own runner; who pays model tokens; is there a subscription? | Make no rung-5 promise. Remove 'pay once' copy with the old site. Revisit at M1 if 3 or more unprompted asks. |  |
| X19 Second reviewer | open-later | founder-only | Who is the named second reviewer? | Name one person who reviews the interview log and each ADR before it is accepted (the precedents show a fresh-context reviewer corrected 9 of 12 iterations at Vero). |  |

## Appendix B — What the adversarial re-checks corrected

Eight consequential claims were each re-checked by two or three independent agents told to refute them. All eight were contested; the corrections are already folded into §2 and §3.

| Claim | Verdict | Correction (shortened) |
|---|---|---|
| W02 Concierge scorecard: `audit` command + design-audit (155 lines), read… | contested | W02 verdict "partly" stands, restated precisely. The `audit` command (audit.js:29-45) only copies the design-audit SKILL.md into .claude/skills/, with no scorer, no readiness-audit and no drift-report. The 0-100 scores in design-audit (:59-60) and readiness-audit (:66-70, mean of model-judged satisfaction x 10) are produced by a model, with no test and no reproducibility guarantee. The readiness template's own example is arithmetically wrong (sats 2,3,4,5,5,5 give 40, not the 48 shown), its drift-control input is… |
| X12 Honesty guardrail Marketing may claim the vision; the product and outreach must not sta… | contested | X12 should read "proposed-keep, not yet recorded". The honesty guardrail appears only as a "keep" bullet in the unapproved beta plan (README.md:124; strategy-history.md:154). No ADR, CLAUDE.md or content.ts line records it. ADR-020 covers honest "not configured" signal states (ADR.md:352-392), not claims. Commit a34c55a is a real one-off precedent, a marketing-copy fix that is not shown to be an ancestor of main in this shallow clone. The beta plan contradicts itself on scope. README.md:124 lets marketing claim th… |
| W04 `drift scan` (deterministic regex counter) | contested | `drift scan` is a deterministic regex counter (drift.js:29-31, 71-72) that runs and names the offending files. In a sandbox it counted 3 hex + 3 px correctly. The score formula (drift.js:78) floors at 0 at 50 colour literals with no px (49 gives 2, 50 gives 0), and sooner with px. It returned 0/100 on systemix-poc `src` (254 critical, 384 warnings) and on a Next+shadcn app, oblira-design, with `--dirs app,components` (217 critical; 225 with default dirs). It never reads tokens.css to compare values. It exempts exa… |
| W05 File-based loop core (experiment, goal, propose, loop, docs, skills s… | contested | File-based loop core (experiment, goal, propose, loop, docs, skills sync, config): verdict "works", with this evidence. packages/cli Jest passes 237/237 across 18 suites, and root Vitest passes 90/90 across 12 files. Main (34ff75b) gives the same numbers, because the checkout differs from main only in docs. Offline `experiment new`, `measure`, `audit` and `close` all exit 0, and so do `goal`, `propose context` and `skills sync`. `loop` reports blocked:not-wired or blocked:posthog-error clearly, but exits 0. Drop "… |
| W16 Autonomy dial and write-policy | contested | Corrected statement for W16 (verdict "partly" still stands, but the evidence changes). The autonomy dial is a stored setting plus a display. hermes_tier is read only to show the dial in the UI (api/instance/route.ts:39-41, ConfigView.tsx, SettingsDialog.tsx) and to call assertWriteAllowed twice in src/app/api/queue/route.ts (line 140 for "memory", line 261 for "hypothesis"). Both calls pass humanApproved: true, so write-policy.ts:84 returns before the matrix is checked and they can never throw. The Infinity rows (… |
| W23 Beta plan document as a source of truth | contested | Working W23, corrected: the beta plan (README plus discover/) is a draft and only partly reliable as a source of truth. - The plan was already behind main when its last revision was committed. Five of the ten Phase 0 bullets (README:365-375) were merged to GitHub main at 13:59–14:09Z on 2026-10-11, about 1.1–1.3 hours before the 15:17Z README commit. These are the scoped npx name (#127), non-destructive init (#127), path-safe ids (#126, #127, #130), local-API CSRF/origin hardening (#125) and PR CI (#127). Six item… |
| X10 Free tier and monetisation principle What is free and what is paid? | contested | X10 is "made, not yet an ADR, and not constant". The principle "the free tier is the whole engine (MIT); sell packaging, setup, updates and labor, not code-DRM" is recorded as "decided" only in docs/feature/context-engine-reframe-2026-07/pricing-packaging-reorg.md:22-28, a feature doc with no date (about 07-09, inferred from strategy-history.md:50). decisions/ADR.md does not contain it, and strategy-history.md:130 lists it as still to be lifted into an ADR. DSC-5 (discover/wave-decisions.md:29, 2026-10-11, desk-va… |
| X11 Core principles that survive Engine = Claude Code; autonomy dial default ghost; self-modification… | contested | Core principles that are recorded and consistent (engine = Claude Code, ADR-019; autonomy ghost at init, ADR-008, systemix.config.yaml:24,33; self-modification always HITL, write-policy.ts:28-30; skills in .claude/skills; OKLCH tokens in the template) survive. Fixes to the claim: (a) "No AGENT personas" (ADR-014). User personas and roles are still live (content.ts:230-266, CLAUDE.md:15) and the ICP is open. (b) Drop "PostHog EU as the only signal" as a principle. Say "PostHog is the only shipped adapter today (con… |

Critic's blind-spot questions (all folded into §5 or Appendix A as inputs, not as defaults): employer IP clause; what stopped the first message in 166 days; a stop rule for the whole venture; who grades the interviews; services versus product; hourly floor and cash ceiling; liability cover; audience size and who pays; whether the old site and crons keep running; what you will not restart; who holds you to the fence.
