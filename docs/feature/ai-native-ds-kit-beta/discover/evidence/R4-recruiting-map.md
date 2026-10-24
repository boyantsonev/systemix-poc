# R4 - Recruiting map for customer-discovery interviews (gate G1)

Prepared 2026-10-11 for the Systemix beta. Gate G1 (see `docs/feature/ai-native-ds-kit-beta/discover/interview-log.md`): 5 real conversations about past behaviour plus at least 1 commitment signal (ideally a pre-paid audit) by Sunday 2026-11-01.
Research was read-only. Nothing was sent, posted, joined or logged into.

---

## 0. How to read this file (method, evidence tags, limits)

Every source below was read on **2026-10-11** (the "retrieved" date). The appendix (section 9) gives the URL for every tag, and the page's own date where it showed one ("undated" = the extract showed none).

| Tag | Meaning |
|---|---|
| **P** | Primary page that I fetched and read myself (anthropic.com, claude.com, support.claude.com, github.com). Strongest evidence. |
| **S** | First-party page that I saw only through a WebSearch extract (the extract is the evidence; I did not open the page). |
| **T** | Third-party or secondary source (tracker, blog, mirror of a Reddit page, aggregator, book summary). Treat as a lead to verify. |
| **U** | Could not verify. |

Limits that shape this map (important):

1. WebFetch only reaches github.com, anthropic.com, claude.com and support.claude.com. I tested indiehackers.com, news.ycombinator.com, converge.zeroheight.com and reddit.com: all failed (DNS or blocked). So **the live rule text of Reddit, Discord, Slack, Indie Hackers, Hacker News, Product Hunt and LinkedIn could not be read**. Where I give a rule, the tag says how I know it.
2. The shared WebSearch budget ran out after about 64 searches by this agent (tool message: "limit: 200 WebSearch calls per turn, shared by every agent"). I did not work around it. Not researched as a result: LinkedIn groups, YC directories, the guest policies of AI-builder podcasts, r/ClaudeCode, r/nextjs, the shadcn and Next.js Discords (section 8 lists the exact searches to run next).
3. No private individual's name or handle is recorded here. Organisations and public events are named as the sources name them.
4. I never invent a rate. Where no source gave a rate, the table says "no sourced rate".

---

## 1. Answer first

### 1.1 The ten best channels for this founder, ranked

Ranking logic: yield per hour for a solo founder with about 100 site visits a month, 1 GitHub star and a small LinkedIn; platform risk; fit with the target mix (2 AI-native teams, 2 DS leads or design engineers, 1 agency, plus partners).

| Rank | Channel | Why it ranks here | Evidence |
|---|---|---|---|
| 1 | **Existing partners** (the Vero team, past client-build stakeholders) plus "who else should I talk to?" | Only channel with a known relationship. Book summaries say to ask every meeting for a referral and that warm intros beat cold outreach. Fills the partner and agency slots, zero platform risk. | T12, T11 |
| 2 | **AI-Native Path learners** (your own list) | Opted-in, already taught the loop, no third-party rules. Gate with the screener: learners may be beginners without a shipped product. | no rate sourced |
| 3 | **Personal LinkedIn**: personalised invite plus 2 follow-ups | The only funnel benchmark I found: 841 invites, 25.2% accepted, 36 interviews. Reaches DS leads and agency principals who are not in Discords. | T11 |
| 4 | **Sofia / Balkans builder meetups** (RZLT "Build with Claude", AI Tinkerers Sofia) | Dense local AI-native builders, in person. Sofia #1 had 230 registrations for 120 spots. Next dates unverified. | S11, S10 |
| 5 | **zheroes** (zeroheight Slack) plus the Converge audience (22 Oct) | Free join form; the design-systems practitioners that fill the DS-lead slots. | S9, S1 |
| 6 | **Design Tokens Community Group** (GitHub plus official Discord) | Page says "Everyone is welcome to join the conversation and share use-cases". Tool vendors and practitioners in one place. | P14 |
| 7 | **Claude Developers Discord** (and comments on r/ClaudeAI) | Largest Claude Code pool ("thousands of developers"), but rules unreadable and promotion strict. Participate first, ask only with a moderator's yes. | P6, P9, T1 |
| 8 | **Cursor Meetup Utrecht (29 Oct)** plus Cursor forum Europe events | Free, in person, AI-first builders; registration needs host approval; travel needed. | S4, S12 |
| 9 | **Indie Hackers** | AI-native solo founders and small teams, and customer-discovery posts are a common topic there. Rules unreadable. | T11 |
| 10 | **AI-native stack vendor communities** (assistant-ui, Autumn, Polar, Vercel AI Elements) | Teams building AI chat UI with credits and usage billing, exactly the pain area. Approach maintainers for 2 or 3 introductions rather than posting. | P17-P20 |

Not worth the time in this window: Hacker News "Who wants to be hired" and "Freelancer? Seeking freelancer?" threads (job-market threads, wrong channel), LinkedIn groups (nothing verified), cold Product Hunt posts, subreddit posts that name "market research".

Which channels feed which slot of the target mix:

| Slot (target) | Primary channels (ranks above) | Backup |
|---|---|---|
| AI-native founders or small teams (2) | 2 course learners; 4 Sofia meetups; 7 Claude Developers Discord; 8 Cursor Utrecht; 9 Indie Hackers; 10 stack vendors; 3 LinkedIn | r/ClaudeAI and r/cursor comments |
| DS leads or design engineers, Series A-C (2) | 3 LinkedIn; 5 zheroes plus Converge; 6 Design Tokens Community Group | Design Engineering Night (date unknown); Designer Hangout (waiting list) |
| Agency or consultancy (1) | 1 delivery partners; 3 LinkedIn | meetup organisers; speaker lists of Converge and PUSH UX |
| Existing partners (+) | 1 direct | n/a |

### 1.2 Events worth attending (12 Oct - 1 Nov 2026)

Details and verification in section 3. Short list: **Cursor Meetup Utrecht, 29 Oct** (free, approval needed); **Converge 2026, Newcastle, 22 Oct** (the design-systems conference; paid); **Claude Founder House Stockholm, 14 Oct** (applications closed; page points to a livestream); **React Advanced London, 23-26 Oct** (remote ticket on 23 and 26 Oct); **AI and Design Systems workshop, Helsinki, 28 Oct** (paid). None sits in Sofia; ask RZLT and AI Tinkerers Sofia for their next dates.

### 1.3 Outreach structure that worked (no pitch)

Short, specific, honest: say who you are, what you are studying, that you are not selling, ask for one story about the last time it happened, offer a booking link, follow up on day 1 and day 3. Evidence: section 4.1. Exact copy: section 7.

### 1.4 Screener, plan, gaps

Five-question screeners for each segment: section 5. Three-week plan with sourced rates and an Oct 20 contingency: section 6. What I could not verify: section 8.

---

## 2. Communities

Columns: URL, size, the rule I found (quote or paraphrase, with tag), best channel inside it, one risk. The "best channel" and "risk" columns are my judgement from the rules I could see, not statements from the communities.

### 2.1 Claude Code and Claude-developer communities

| Community (platform) | URL | Size | Self-promotion and research rule found | Best channel inside | Risk |
|---|---|---|---|---|---|
| **Claude Developers Discord** (Discord) | https://www.anthropic.com/discord (307 redirect to discord.com/invite/6PPFFzqPDZ; target not fetchable) [P10] | "thousands of developers" [P6]; no count found | Rules not readable without joining (U). Stated purpose: "Get help, share feedback, and discuss your projects with the community." [P9]. No research-recruiting rule found (U). | A project-sharing or feedback channel ("project sharing" is named in [P6]; channel names U). One public post, only after a moderator agrees. | Cold DMs are the likeliest rule break (my judgement) and would cost the biggest Claude Code pool. |
| **r/ClaudeAI** (Reddit) | https://www.reddit.com/r/ClaudeAI/ (not fetchable) | about 1.08-1.1M members (trackers, 23 Aug - 13 Sep 2026) [T1]; an earlier-2026 article (not identified in the extract) said about 747K | Moderators say the sub is unofficial and not endorsed by Anthropic [T1]. "Built with Claude" Project Showcase megathread; a showcase post in the feed needs total karma of at least 50, newer accounts go to the megathread (mod post 15 Apr 2026 via a mirror) [T1]. "Rule 7" covers showcases (wording not retrieved). Anthropic describes the sub as for "Long-form discussions, project showcases..." [P6]. The "Built with Claude" flair format, from Anthropic's closed 2025 contest rules: what you built, how you built it, screenshots or demos, at least one prompt [P11]. No research-recruiting rule found. | Helpful comments on threads about agent-built UI; the showcase megathread later, for the free kit. | A research ask in the main feed reads as self-promotion and is removed; karma gate. |
| **Claude Community Events and Ambassadors** (Luma meetups) | https://claude.com/community and https://claude.com/community/ambassadors | not stated. Europe meetups seen in extracts: Warsaw, Helsinki, Budapest, Istanbul, Munich, Oslo, Aalborg, Sonderborg, Barcelona; all before 12 Oct or undated [S21] | "Claude Community Events are hosted globally by Claude Community Ambassadors." [P6]. Ambassadors "bring community feedback to Anthropic's product teams, including through Builders Council sessions" [P7]. No promotion rule stated. | Attendee chat or hallway at a local meetup; ask the organiser for 3 minutes of floor time. | No Europe meetup found inside the window; Luma is not searchable from here (U). |
| **RZLT "Build with Claude" meetups, Balkans** | https://www.rzlt.io/blog/sofia-claude-code-meetup-1-recap and https://luma.com/5b9jd1t4 | Sofia #1: 120 spots, 230 registrations, 100+ attended [S11] | Independent, community-run series; a WhatsApp group for builders exists [S11]. Date conflict: 26 Mar 2026 on the recap, 4 Apr 2026 on the project page [S11]. Rules not found. | Ask to join the WhatsApp group; ask for a 5-minute slot at the next Sofia date. | Next date unknown; you are a guest of the organisers, so no pitching. |
| **AI Tinkerers Sofia** | https://sofia.aitinkerers.org/ | part of a 247-city network; chapter size not stated [S10] | Meetups are "screened, demo-first, no-pitch", about 3 hours of live demos, Q&A, networking [S10]. | Offer a 5-minute live demo (audit run on a public repo); research asks happen in conversation afterwards. | Screened entry; next date not found (page "last updated July 2026" per the extract). |
| **Claude for Startups** (programme) | https://claude.com/programs/startups | n/a | Open to bootstrapped, pre-seed and VC-backed startups; office hours with the Applied AI team every other week (45 min); access to "exclusive Claude Startup events, hackathons, and community meetups"; some offers are over capacity and applications are being re-reviewed [P8]. | Apply as a startup; use its events to meet AI-native founders. | Slow and capacity-limited; not a direct recruiting venue. |
| **Anthropic monthly community newsletter and project-showcase form** | https://claude.com/community | n/a | Newsletter covers "featured projects, upcoming events, and tips"; submitted projects "may be considered for a feature on Claude's social channels or marketing" [P6]. | Distribution for the free kit later; not for interviews. | No control over selection. |
| **anthropics/claude-code on GitHub** | https://github.com/anthropics/claude-code | n/a | Feedback goes through `/bug` or GitHub Issues [P9]. `/discussions` returned 404 on fetch (not enabled or not public). | None for recruiting. | A research request in Issues is off-topic noise. |

### 2.2 shadcn, Next.js and the AI-native stack

| Community (platform) | URL | Size | Rule found | Best channel inside | Risk |
|---|---|---|---|---|---|
| **shadcn-ui/ui Discussions** (GitHub) | https://github.com/shadcn-ui/ui/discussions | repo about 125.3k stars, 807 open issues [P12] | Categories: Announcements, Blocks Request, General, Ideas, Q&A, Request, Show and tell. Show and tell = "Show off something you've made." Only GitHub's general community guidelines are linked [P12]. The repo page shows **no Discord link**; an official Discord was not found [P12]. | Ideas or General, phrased as a question ("how do you keep agent-written UI on-theme?"); Show and tell when the kit exists. | Low engagement: the last five Show and tell posts (25 Sep - 7 Oct 2026) each show a count of 0 and older ones 0-4 (the page does not label the counts; probably replies) [P12]; a research ask is off-topic. |
| **vercel/next.js Discussions** (GitHub) | https://github.com/vercel/next.js/discussions | n/a | Categories: Security; Ask for help (App Router, Help); Community: Show and tell; Report a problem (Triage, Turbopack Error Report); Shape Next.js (Feedback, Ideas, Polls, RFC). Pinned: "Companies / Sites using Next.js" (about 2,000 comments). Show and tell is active (newest post 10 Oct 2026). No posting rules shown [P13]. | Show and tell for the kit later; the pinned thread is a sourcing list of Next.js companies. | High noise; research asks are off-topic. |
| **Reactiflux** (Discord for React) | https://reactiflux.com/promotion | not retrieved | `#i-built-this` is for "new side projects, libraries, or other works". Reactiflux "generally does not allow external communities to be promoted". Most of what is shared should come from genuine members; active members get more leeway; ask moderators if unsure. Job posts: paid roles in `#job-board`; unpaid recruiting for non-commercial projects in `#looking-for-group` [S6]. | Message the moderators with the exact research text before posting anything. | A research ask fits no listed channel. |
| **AI-native stack vendor communities** | assistant-ui https://github.com/assistant-ui/assistant-ui ; Autumn https://github.com/useautumn/autumn ; Polar https://github.com/polarsource/polar ; Vercel AI Elements https://github.com/vercel/ai-elements | assistant-ui 12.5k stars (MIT, YC-backed); Autumn 2.8k; Polar 10.4k; AI Elements 2.5k [P17-P20] | assistant-ui: Discord (discord.com/invite/S9dwgCNEFs) plus GitHub Discussions [P17]. Autumn: "we're typically most responsive on our Discord channel" [P18]. Polar: feedback via a button in the dashboard, no Discord or Discussions on the repo page [P19]. AI Elements: Issues only [P20]. Rules not found. | Email the maintainers: ask for an introduction to 2 or 3 users who ship AI chat UI with credits or usage billing; offer a short guide for their users in return. | Vendors guard their users; an unsolicited post may be treated as spam. |
| **Vercel Community meetups** | https://community.vercel.com/meetups | n/a | Europe meetups seen: Next.js London (17 Feb 2026), Next.js Night Amsterdam (11 Jun 2026), Vercel Ship Berlin (25 Jun) [S13]. None found in the window. | Local meetup chats. | Nothing in the window. |

Not found: an official shadcn Discord and the Next.js Discord (nextjs.org/discord): no member count or rules retrieved (U).

### 2.3 Cursor communities

| Community (platform) | URL | Size | Rule found | Best channel inside | Risk |
|---|---|---|---|---|---|
| **Cursor Community Forum** | https://forum.cursor.com | n/a | Needs a login separate from the Cursor account [S12]. Categories seen: Showcase, Feature Requests, Events/Meetups with Europe and North America subcategories [S12]. Rules not found. | Events > Europe to find meetups (https://forum.cursor.com/c/events/europe/26); Showcase for the kit later. | Staff-moderated; research asks are off-topic. |
| **r/cursor** (Reddit) | https://www.reddit.com/r/cursor/ (not fetchable) | about 156K (one tracker) vs about 70K (another article) [T3] | Not found (U). | Comment first in threads on Cursor rules and agent drift. | Self-promotion removal. |
| **Cursor meetups** (Luma) | https://luma.com/cfk3aokj (Utrecht) | n/a | Utrecht: "Registration is subject to host approval" [S4]. Brussels, Hamburg #2 and Bucharest pages exist; dates not seen [S4]. | In-person conversations. | Approval and travel. |

### 2.4 Design systems and design engineering

| Community (platform) | URL | Size | Rule found | Best channel inside | Risk |
|---|---|---|---|---|---|
| **zheroes** (zeroheight's Slack) | https://zeroheight.com/slack | not retrieved | Free; join through a form; open to zeroheight customers, prospects and "friends of design systems"; vendor-run, so expect product talk [S9]. Other rules not found. | A sharing or discussion channel (names unknown); read first, comment before asking. | Vendor community: content that overlaps a DS product may be unwelcome. |
| **Designer Hangout** (Slack) | https://designerup.co/blog/best-slack-communities-for-ux-ui-and-product-designers/ | about 18K (undated source) vs 5,800+ (older source) [T4] | Invite-only; waiting list at designerhangout.co; a Design Systems channel is named in a roundup [T4]. | The Design Systems channel, if admitted. | Waiting list will not clear within three weeks; information undated. |
| **Design Tokens Community Group** (GitHub + Discord) | https://github.com/design-tokens/community-group | 2.1k stars, 233 watchers [P14] | "Join the official DTCG Discord server for real-time community discussion." "Everyone is welcome to join the conversation and share use-cases with the community." Members: UX professionals, developers, tooling vendors in task forces [P14]. | Post one use-case ("how agents consume tokens in our repo") in the Discord. Server rules not read. | Standards forum; a research ask can read as marketing. |
| **Design Systems Community** (guild.host) | https://guild.host/design-systems-community/members | n/a | Meetups in Toronto or online [S19]. | Online meetups. | Toronto-centred. |
| **IxDF design systems meetups** | https://ixdf.org/meetups/design-systems-building-maintaining-them-sep-5th-2026 | n/a | Free, virtual or local. Listings seen: Eindhoven 5 Sep 2026 (past); a virtual "Oct 3rd" listing that matches 2025 [S18]. | Watch for the next virtual listing. | No in-window date found. |
| **Design Systems London (Supernova), Knapsack events, Into Design Systems newsletter** | https://www.supernova.io/events/dsl-meetup ; https://www.knapsack.cloud/events ; https://intodesignsystems.substack.com/about | n/a | Existence only; dates not seen [S18]. | Check dates weekly. | Unknown cadence. |
| **Design Engineering Night** (London, Luma) | https://luma.com/hnw44qxn | "37 going" at the time of the extract [S20] | Host approval required; address after registration; edition #9, date not found [S20]. | In-person networking of design engineers. | Date unverified; London travel. |
| **Friends of Figma chapters** | https://friends.figma.com | n/a | Chapters ran Config 2026 watch parties (Oslo, Bosnia, Agadir) [S22]. A Sofia chapter: U. | Local design chapters (the product treats Figma as optional). | Figma-centred audience. |
| **DESIGN.md spec and Design Studio starter** (GitHub, open source) | https://github.com/google-labs-code/design.md ; https://github.com/itspatmorgan/design-studio-starter | DESIGN.md: 28.3k stars, alpha, Apache-2.0; Design Studio: 4 stars, MIT, early beta [P16, P15] | DESIGN.md: Issues only, no Discussions tab, no posting rules [P16]. Design Studio: Issues and Discussions enabled; feedback goes through them [P15]. | Sourcing, not posting: people who describe agent-and-design-system problems in public issues are the target. Contact only through the route the person publishes for professional contact. | Unsolicited contact built from GitHub profiles can feel like scraping (my judgement); an interview request inside someone else's issue is off-topic. |

Related reading, not a channel: Brad Frost's newsletter and his online "AI and Design Systems" course with Southleft appear in search extracts [S5]; useful for vocabulary and for seeing who attends.

### 2.5 Reddit (the six named subreddits plus two weekly-thread subs)

Reddit's own rule text was unreadable. Everything below is T (trackers, guides, mirrors) except the first-party Anthropic lines. **Always read the sidebar and pinned posts on the day you post, and use modmail first.**

| Subreddit | Size | Rule as reported (unofficial) | Best channel | Risk |
|---|---|---|---|---|
| r/ClaudeAI | about 1.1M [T1] | See 2.1. | Comments; megathread later. | Removal; karma gate. |
| r/cursor | about 156K vs about 70K [T3] | Not found. | Comments. | Removal. |
| r/webdev | "2M members" in one guide [T5] | Guides disagree: promotion only in the weekly Showoff Saturday thread, or only when answering specific questions. A Q&A thread says even a free, useful project can be removed if the post reads like an advertisement [T5]. | Answer questions; Saturday thread for the kit. | Ad-like framing is removed. |
| r/reactjs | not retrieved | A 2026 rules tracker lists the weekly showcase or portfolio post as the allowed route and says commercial activity "(recruiting, lead generation, marketing, market research)" is only allowed in posts dedicated to it [T6]. | Modmail before any research ask. | "Market research" is named as restricted. |
| r/UXDesign | not retrieved | No rule found. In r/UXResearch the weekly career thread asks to avoid off-topic self-promotion [T7]. Moderators of an unrelated sub (r/rpg, 2021) treat surveys as a grey area that many count as self-promotion [T7]. | Modmail: ask whether a research-participant post is allowed. | Removal; audience is designers, not DS leads. |
| r/SaaS | 789,757 (one tracker) vs about 360K (a 2026 guide) [T3] | Trackers: a mention is allowed about once per 60 days with disclosure; standalone promo posts are removed; the weekly thread name disagrees (Share Your SaaS Saturday, Show and Tell Saturday, feedback Friday); karma gates disagree (50 combined vs 30-day account and 100 comment karma); rules reportedly changed April 2026 [T8]. | The weekly feedback thread (confirm its name), with disclosure. | Promo-saturated audience. |
| r/SideProject, r/startups | not retrieved | One guide: r/SideProject has weekly "Share your project" threads that welcome promotion; r/startups limits self-promotion to designated weekly threads [T8]. | The weekly threads. | Low-trust, high-volume. |

Reddit-wide: moderators set the real rules; "90/10" and "9:1" are community norms, not a ban [T9]. One study of 49 founder-targeted subreddits is titled "61% Ban It" while its own text gives 39% (19 of 49), so I could not trust the figure [T9].

### 2.6 Indie Hackers, Hacker News, Product Hunt, LinkedIn, YC

| Platform | URL | What I found | Best channel | Risk |
|---|---|---|---|---|
| **Indie Hackers** | https://www.indiehackers.com | Official guidelines not retrievable (U). Customer-discovery threads are a common topic, for example "How do you actually get people to do customer discovery interviews?" [T11]. A third-party description says Groups are topic-based, lower traffic but more targeted [T10]. | A founder-story post ("5 calls about agent-built UI drift, here is my screener, I will post what I learn") and comments on pricing and credits threads. | Audience skews to solo SaaS founders, not DS leads; rules unread. |
| **Hacker News** | https://news.ycombinator.com/newsguidelines.html | Guidelines: do not use HN primarily for promotion (own work now and then is fine; primary use is curiosity); "Don't solicit upvotes, comments, or submissions. Users should vote and comment when they run across something they personally find interesting - not for promotion." [S7]. Show HN: sign-up pages, newsletters and anything that cannot be tried are off topic; wait until a project can be tried [S7]. Monthly "Who is hiring", "Who wants to be hired" (candidates only; recruiters, agencies and job boards banned) and "Freelancer? Seeking freelancer?" threads are posted by the whoishiring account [T28]. No rule on research recruiting found. | A comment in the monthly "What are you working on?" thread (a moderator comment suggests it for pre-launch makers; that is a comment, not policy) [T27]. Show HN in January per the roadmap. | Hiring threads are the wrong channel; an ask for participants may be flagged. |
| **Product Hunt forum** | https://www.producthunt.com/p/general/new-forum-guidelines | A community member's summary of the guidelines: a thread should be a genuine question the community can answer, or an insight useful to other builders; self-promotion is discouraged; discussions from new accounts are often rejected, so comment first [S8]. | A question-form thread ("how do you keep AI-written UI on-system?"), then follow up with people who answer. | Silent removals; low volume. |
| **LinkedIn groups** | n/a | Not researched (U). | Skip groups; use direct personalised outreach (section 4). | Unknown. |
| **YC startup directories** | n/a | Not researched (U). Hosts not fetchable here. | Build a list from the public directory, then reach founders through public professional channels. | Do not use Work at a Startup (a hiring channel) for research. |

### 2.7 AI-builder newsletters and podcasts

Thin result. I found shows, not confirmed guest policies.

| Name | Format | What the source says | Guest policy |
|---|---|---|---|
| Code Riff (Superuser HQ) | podcast on non-coders building with Claude Code | Episode notes invite listeners to submit a problem and "we'll try to build it live" [T15] | guest pitches: U |
| Let's Vibe! | weekly show on building with Claude Code | features a conversation with someone doing interesting work at the intersection of creativity and AI [T15] | U |
| Create With Podcast | AI and visual development | special guests [T15] | U |
| Anthropic community newsletter | monthly | see 2.1 [P6] | project-submission form only |
| Brad Frost newsletter; Into Design Systems (Substack) | design-systems newsletters | Into Design Systems covers events for DS teams learning AI [S5, S18] | U |

### 2.8 The founder's own assets

| Asset | Fact | Use |
|---|---|---|
| GitHub repo | public, 1 star, 0 forks, 8 open issues, description "WIP", no topics, Discussions tab not visible [P21] | Add a one-line "5 research calls until 1 Nov" to the README top and a pinned issue; turn on Discussions if wanted. |
| AI-Native Path course | free, 15 lessons (brief) | Lesson-end card plus one email; gate with the screener. |
| Website | about 100 visitors a month (brief) | A `/talk` page or banner with the screener link. No sourced response rate; treat as a free option. |
| Personal LinkedIn | exists (brief) | Section 4 sequence. |

---

## 3. Events, 12 Oct - 1 Nov 2026 (online or Europe)

Verification key: **Confirmed** = read on a first-party page by me (P); **Listed** = first-party page seen in a search extract (S); **Unverified** = third-party listing only (T) or conflicting dates.

| Date | Event | Where / format | URL | Why it fits | Verification |
|---|---|---|---|---|---|
| 12-14 Oct (Dealroom); 13-14 Oct (Gracker); 13 Oct (Founderpath) | **SaaStock Europe 2026** | Dublin, RDS; in person; 4,000+ expected | https://dealroom.co/events/saastock-europe-2026/ | SaaS founders who run subscription-plus-usage pricing | **Unverified**: three listings disagree on dates [T16]. A listing site advertises free tickets (unverified). Far, likely paid. |
| 14 Oct | **Claude Founder House Stockholm** | Stockholm; in person; founder cohort 08:30-13:00 CEST, builder cohort 14:00-20:00 CEST | https://www.anthropic.com/events/claude-founder-house-stockholm | Nordic AI-native founders (speakers from Anthropic, Lovable, Legora, General Catalyst, Supermetrics); "Applications for this event are now closed"; the page invites people to watch the livestream | **Confirmed** [P2]. Livestream link not seen. The Anthropic events list is sorted by date and nothing else sits between 14 Oct and 30 Nov, so this is the only Anthropic event in the window (my inference from [P1]). |
| 15 Oct (and 15-16 Oct) | **Vercel Ship, San Francisco** | San Francisco; theme "Build, deploy, and scale agents" | https://community.vercel.com/meetups/vercel-ship-sf/42880 | Next.js and agent builders; watch for who ships what | **Unverified**: one listing says 15 Oct, another 15-16 Oct; livestream not found [S13, T17]. Not in Europe. |
| 15 Oct | Claude Workshop (online) | online; audience: non-developers | https://www.anthropic.com/events/build-with-claude | Not a fit (non-developers) | **Confirmed** [P3]. |
| recurring, dates not listed | Claude Code: Advanced (existing daily Claude Code users); Claude Code: Foundations; Virtual Claude Code Workshop (engineers, about 1.5 h) | online | https://claude.com/resources/webinars | Learn how Anthropic frames agent workflows; the audience is hands-on Claude Code users | **Confirmed** [P4, P5]. Not a recruiting venue; do not message attendees. |
| 20 Oct | Claude Code Workshop London (with Fractal) | London; invite-only, 30 participants | https://fractal.ai/events/fractal-claude-code-workshop-london-2026 | Developers using Claude Code | **Confirmed** [P3]. Invite-only. |
| 21 Oct | Webinar "Tokenomics on AWS: Control and optimize your Claude spend" | online | https://claude.com/resources/webinars/tokenomics-on-aws-control-and-optimize-your-claude-spend | Only for teams wrestling with usage costs | **Confirmed** [P4]. Low fit. |
| 21 Oct (workshop), **22 Oct** (main day) | **Converge 2026** (zeroheight), 5th edition | Newcastle, The Glasshouse; in person | https://ti.to/zeroheight/converge-2026 | The design-systems conference in the window; DS leads attend. Use the public programme and posts to source DS-lead contacts | **Listed** [S1]. Ticket price and speakers not shown; no online ticket seen. |
| 22-23 Oct (workshops 21 Oct) | **PUSH UX** | Munich, Alte Kongresshalle; in person | https://push-conference.com/tickets | "Europe's UX and Product conference", 700+ product designers, PMs, UX leaders, researchers, engineers | **Listed** [S3]. A third-party listing gives EUR 499-998 [T18]. |
| 22-23 Oct | Next.js Conf 2026 | San Francisco | https://vibecoding.app/events/nextjs-conf-2026 | Next.js audience | **Unverified**: only an unofficial listing, venue "TBA" [T17]. |
| 23-26 Oct | **React Advanced London** | London; UK and online; remote ticket covers 23 and 26 Oct with interactive features | https://gitnation.com/events/react-advanced-2026 | React and Next.js engineers; remote option fits a Sofia schedule | **Listed** [S2]. Paid. Use the speaker and attendee list for sourcing, not the chat for asks. |
| 28 Oct (workshop), 29 Oct (Grand One AI Day) | **AI and Design Systems workshop** with Brad Frost | Helsinki, Hobo Hotel; 08:45-16:30; English; in person | https://masterclass.grandone.fi/courses/ai-design-systems/ | The exact overlap: design systems meet generative UI and governance | **Listed** [S5]. Paid; price not shown; masterclass participants get 15% off AI Day tickets. |
| **29 Oct** | **Cursor Meetup Utrecht** | Utrecht, Brthrs agency; free; in person | https://luma.com/cfk3aokj | AI-first builders on Cursor in Europe | **Listed** [S4]. "Registration is subject to host approval"; agenda not published. |
| TBA | AI Tinkerers Sofia; RZLT Build with Claude Sofia #2; Design Engineering Night #9 (London) | Sofia; London | see section 2 | Closest and best-fitting audiences | **Unverified**: no dates found. |

Checked and dropped: AI Tinkerers Vienna (1 Oct) and Prague (8 Oct) are before the window [S10]; JSTalks Sofia is 12 Nov (after the window) [T19]; NVIDIA GTC Berlin (20-22 Oct) and Neulandpro Connect (16-17 Oct) look off-audience (my judgement) [T19]; Config 2026 was 23-25 Jun [T20]. Claude Code meetups in Europe I could index were all before 12 Oct (Nuremberg 5 Oct, Aalborg 3 Sep, Barcelona 18 and 21 Sep) [S21].

Check weekly for new listings: https://www.anthropic.com/events (3 pages; I saw 11 events), https://claude.com/community (Luma calendar), https://forum.cursor.com/c/events/europe/26, https://sofia.aitinkerers.org/.

---

## 4. How others recruit 30-minute interviews with no budget

### 4.1 Outreach structures that worked, with what the sources actually say

1. **Sequenced LinkedIn outreach.** An Indie Hackers post reports 841 invites sent, 212 accepted (25.20%), 36 interviews; three messages: a short friendly connection note, then follow-ups after one day and three days. A commenter advised sending a calendar link rather than asking for a time slot. The note text was not in the extract. Undated; the extract judged it several years old; the sender automated it [T11].
2. **The Mom Test "Finding conversations".** Cold outreach is a means to an end (the goal of cold conversations is to stop having them, as one summary puts it); a high rejection rate does not matter, you need a few yeses; ask every meeting for a referral; bring people to you through meetups, teaching, and writing; frame the request in five parts: vision, framing (what stage you are at, that you are not selling), weakness, pedestal, ask. A formal "customer interview" label makes people guarded [T12]. These are book summaries, not the book text; I did not find a verbatim "I'm not selling anything" line.
3. **YC "How to talk to users" (summaries).** Start with your own network, then LinkedIn, Reddit forums, Slack communities, in-person events; target the people most likely to have the problem; prefer calls to surveys; keep outreach concise, polite and tailored; do not describe your idea early. The summaries disagree on who gave the talk [T13].
4. **GitLab's public research-ops practice.** A screener, a scheduling link, and a per-session gift card; for people found through public issues, post the screener link on the related issue [S14]. (My caution: on GitHub that tactic only works where the issue is exactly on topic and the project's contribution rules allow it; otherwise it is spam.)
5. **Product Talk (Teresa Torres).** Make recruiting automatic by letting customers opt in; when starting, talk to whoever is easiest to reach, then widen; interviews that are all about your product burn people out, so ask for stories [S16].
6. **Cold email data.** One guide: aim for an 8-15% reply rate and a 2-5% meeting rate; 50-70% of replies come from follow-ups; 3-5 follow-ups over 12-15 days [T14]. The page is one of two candidates (see appendix), so treat as directional.

### 4.2 Rates found (the only ones I use in the plan)

| Metric | Value | Source and caveat |
|---|---|---|
| LinkedIn invite accepted | 25.2% (212 of 841) | [T11] automated, undated, niche unknown |
| Invites that became interviews | about 4.3% (36 of 841); 17% of accepted (36 of 212, my arithmetic) | [T11] |
| Cold email reply / meeting | 8-15% / 2-5% | [T14] one of two candidate guides |
| Share of replies that come from follow-ups | 50-70% | [T14] |
| First-contact positive response | 5-10% | a practitioner post inside a recruiting-guide result set (page not identified) [T21] |
| Non-personalised automated outreach | about 1.5% | a founder forum post; also notes LinkedIn tightened connection-request limits [T22] |
| No-show rate | 8.6% average (0-34%); B2B remote 10.4%; 5.0% in MeasuringU's own studies with recruiting, screening, reminders, incentives | [T23] (a blog citing MeasuringU) |
| No-show rate | 11% average | [T24] (a 2026 guide citing NN/g; secondary) |
| Communities (Discord, Reddit, IH), partners, course learners, website | **no sourced rate** | measure and report your own |

### 4.3 Incentive norms

- GitLab (a public handbook with public recruiting issues): a gift card of **$60 for 30 minutes** in one issue and **$90 for 45 minutes** in another; the handbook says incentives raise recruitment but can attract professional or fraudulent respondents, so screen [S14].
- Third-party guides put a 30-minute B2B practitioner interview at **$75-100** and senior people at **$200-300** [T25]. User Interviews' 2022 incentives report gives about $92 an hour for 30-60 minute unmoderated B2B tasks (the summariser's reading, which it said likely understates a moderated interview) [S15].
- With a budget of zero: (a) lead with learning and a promise to share anonymised findings; (b) offer, only **after** the call, a free read-only run of the scorecard on one repo (my suggestion: offering it inside the invite can turn the call into a sales trial and bias the commitment test); (c) if a contingency is triggered, five $60 cards is $300, which is GitLab's rate applied to the target of 5 (my arithmetic).

### 4.4 Consent and recording etiquette (the founder is in the EU, so GDPR applies)

Sources agree on these points [T26]: a recording is personal data from the moment you press record; voice can be treated as biometric in some readings, which pushes towards explicit consent that names the purpose (and any automatic transcription); a third-party transcription service is a processor and needs a data processing agreement; a consent form states purpose in plain language, what participation involves, and the right to withdraw. Practical etiquette (my synthesis, not legal advice): ask on the record at the start; make "no recording" an equal option; say how long you keep it and who sees it; do not use a third-party AI notetaker without telling the person and having a processor agreement; quote only without name or company unless they agree; separate "interview consent" from "may I name you in a case study". Script in section 7.

### 4.5 Common mistakes (and where they come from)

- Pitching or describing your idea early; asking for opinions about the future; fishing for compliments [T12, T13].
- Mass, non-personalised automation (about 1.5%) and a single touch (follow-ups drive 50-70% of replies) [T22, T14].
- Interviews that are all about your product, which burns out the people you most need [S16].
- Not over-booking: expect about 9-11% no-shows [T23, T24].
- Posting asks in subreddits that name "market research" or treat surveys as promotion [T6, T7].
- Counting polite interest as a signal. The interview log's own ladder starts at rung 0 = "not a signal" [P22].
- Selling under the label of research (a Wikipedia entry on "sugging" exists; I did not open it): https://en.wikipedia.org/wiki/Sugging [U].

---

## 5. Screener (put the exclusion questions first)

A recruiting guide advises asking the eliminating questions first so nobody answers more than necessary [T21]; the User Interviews screener chapter advises working backwards from the insight you need to who can give it [S15]. Each question below is a yes/no or a one-sentence answer. The one-sentence "last time" answers are the anti-gaming gate: the call goes ahead only if the answer names a concrete incident. Pass rules are in bold. Question wording is mine.

**Front of the form (all segments):** (1) "Do you work for a company that sells design-system tooling, UI audits or an AI design agent?" Yes -> do not count toward G1 (route to an expert chat). (2) "Which describes you best?" (founder or CTO / design-system lead / design engineer / agency or consultancy / other). (3) Consent line: "I agree to be contacted about this research; my answers are used only to schedule and prepare the call; details here: {link}".

### Segment A - AI-native founder or small product team (2-20 people)

1. Has an AI agent (Claude Code, Cursor, v0, Copilot...) written or changed UI code that shipped in your product in the last 30 days? (yes/no)
2. Is the product built on Next.js with shadcn/ui, or Tailwind with Radix? (yes / other React / no)
3. Do you charge, or plan to within 6 months, a subscription plus usage or credits? (live / planned / no)
4. In one sentence: the last time an agent-built UI change did not match your design rules, what happened and what did you do? (short text)
5. Team size and who decides how the UI should look? (2-20; founder / CTO / design engineer / other)

**Pass:** Q1 yes AND Q4 concrete AND team 2-20 AND at least one of Q2 or Q3 is yes. Priority to Q3 = live (it covers the usage/credits hypothesis).

### Segment B - design-system lead or design engineer (Series A-C)

1. Do you own or maintain a design system (tokens, components, docs) used by two or more product teams? (yes/no)
2. Is your company Series A-C, or roughly 50-500 people? (yes / no / other)
3. In the last 30 days, did an AI coding agent produce UI that uses, or ignores, your design system? (yes/no)
4. In one sentence: the last thing an agent got wrong relative to your system (wrong token, duplicate component, off-brand pattern) and how you found out. (short text)
5. Are your system's rules in a form an agent can read (DESIGN.md, AGENTS.md or CLAUDE.md, Cursor rules, an MCP server)? (yes / no / do not know)

**Pass:** Q1 yes AND Q3 yes AND Q4 concrete AND Q2 yes or other-with-similar-scale. Q5 is not a filter; it is the variable you want to vary across the five.

### Segment C - agency or consultancy delivering product UI for clients

1. In the last 90 days did your team ship production UI for a client, not your own product? (yes/no)
2. Did Claude Code, Cursor, v0 or similar produce part of that UI? (yes/no)
3. Do you set up a design system or token layer per client engagement? (yes/no)
4. In one sentence: the last time a client asked for UI changes because it was inconsistent, what was it and how long did the fix take? (short text)
5. In the last 12 months, have you sold, or been asked to sell, a design-system audit or an "AI-ready" system? If yes, in what price range? (yes/no plus range)

**Pass:** Q1 yes AND Q2 yes AND Q4 concrete.

Existing partners skip the screener but are tagged "warm" in the log and do not replace the in-segment calls if the in-segment target is short (the interview log counts them as a "+" row).

---

## 6. Plan, Mon 12 Oct - Sun 1 Nov

### 6.1 Volume arithmetic from the sourced rates

- Target 5 held. With about 10% no-shows [T23, T24], 5 / 0.9 = 5.6, so **6 booked is the floor**; the roadmap's "8 booked -> 5 held" is the safe target [P22].
- Cold-only volume for 8 bookings: at 4.3% invite-to-interview [T11], 8 / 0.043 = about **186 invites**; at a 2-5% meeting rate [T14], 160-400 emails; at 5-10% positive response [T21], 80-160 contacts. So a cold-only plan needs on the order of 150-190 personalised touches, which is why warm channels carry the plan.
- Cold plan: **180 LinkedIn invites** in total (90 + 60 + 30), split 2:2:1 across the segments (72 A, 72 B, 36 C). It is front-loaded on purpose: an invite sent after about 26 Oct cannot become a held call before 1 Nov, because the sequence needs acceptance, follow-ups on day 1 and day 3, and scheduling (my inference from the sequence in 4.1). Expected bookings: about 7.7 if the 4.3% datapoint holds, about 2.7 at 1.5% [T22]. Plan on 3-8 from cold, plus warm. Pace: 12-15 invites a day, personalised, sent manually (the cited post automated; I could not verify LinkedIn's rules on automation, and a founder post says connection-request limits tightened [T22], so if you hit a cap move the effort to warm introductions).

### 6.2 Week by week

| Week | Dates | Do | Counts (caps) | Targets |
|---|---|---|---|---|
| **1** | Mon 12 - Sun 18 Oct | Mon-Tue: build the screener form, a booking link, the consent script, a tracking sheet, and a **payment link for the audit** (the roadmap's real checkout is a later phase, so a pre-pay by 1 Nov needs an interim payment link or invoice; roadmap decision 5 names LemonSqueezy or Polar, and Polar is an open-source merchant of record for AI software [P19]). Mon-Tue: message all existing partners (call plus 2 introductions each). Tue: one course broadcast plus the site banner. Mon-Sat: 90 personalised LinkedIn invites (about 15 a day); follow-ups at +1 and +3 days after acceptance. Mon-Wed: join 4 communities (Claude Developers Discord, Design Tokens Community Group Discord, zheroes, Indie Hackers), read rules, leave 2 helpful comments a day; Thu-Fri: one research post each, only where rules or a moderator allow (max 4). | warm: all partners (n unknown, cap 10); course: 1 broadcast; LinkedIn: 90 (36 A / 36 B / 18 C); community posts: max 4 | 2-3 booked |
| **2** | Mon 19 - Sun 25 Oct | Mon: funnel review (accepted? replied? booked?). **Tue 20: checkpoint (6.3)**. Mon-Fri: 60 more invites (about 12 a day). Follow up every non-reply at +3 days. After every call: ask for 2 introductions. 22-23 Oct: Converge, PUSH UX and React Advanced run; use their public programmes and posts for sourcing, attend only if affordable. **Fri 23: hard check (6.3, step 6).** Mind US and EU time zones when offering slots. | LinkedIn: 60 (24 A / 24 B / 12 C); community: reply to every comment, DM only people who answered publicly | 2-3 held; 6 booked by Fri 23 |
| **3** | Mon 26 Oct - Sun 1 Nov | Mon-Thu: interviews 4-6 (Fri 30 is the buffer). Mon-Tue only: top-up of up to 30 invites **if fewer than 6 are booked** (later invites cannot convert in time). Thu 29: Cursor Meetup Utrecht if approved and affordable. Fri 30: send the pre-pay offer to everyone who reached ladder rung 3. Sat-Sun: write up the log; decide G1. | LinkedIn: up to 30 | 5 held, 1 commitment |

Per-call time box (30 minutes): 3 min intro and consent; 20 min past behaviour (use the interview log's guide, 5 or 6 of its 8 questions); 4 min commitment (rung 1-4) and 3 min "who else should I talk to?" [P22].

Log fields: date, channel, segment, touch number, reply, booked, held, screener pass, quote, ladder rung (0-5), introductions given, notes.

### 6.3 Checkpoint on Tue 20 Oct: if only two are booked

Work through these in order: steps 1-3 on Tue 20, steps 4-5 on Wed 21 - Thu 22, step 6 on Fri 23.

1. **Diagnose with the sourced benchmarks.** Accept rate under about 20% (my threshold, set against the 25.2% benchmark) -> fix the profile and the note; accepts fine but replies low -> fix the ask; replies fine but bookings low -> put the booking link in the first message (the commenter's advice [T11]).
2. **Ask for introductions, not strangers.** Each booked person and every partner: two names each. Book summaries say the referral chain compounds [T12].
3. **Add a small incentive only for people who pass the screener.** GitLab's rate is $60 per 30 minutes [S14]; five cards is $300 (optional spend; the budget is zero today). Or the in-kind option from 4.3.
4. **Go where they are, in person.** Utrecht on 29 Oct (free, approval needed); the Sofia meetups once RZLT or AI Tinkerers give a date.
5. **Rebalance segments.** Keep every screener gate. If B converts worse than A, shift the invites to A and C; the mix may become 3 A, 1 B, 1 C. Do not drop the "last 30 days" gate, and do not count synthetic or written-only answers (the log already says synthetic interviews do not count [P22]).
6. **Fri 23 Oct hard check:** with fewer than 3 booked, ask to move G1 by one week (to 8 Nov) rather than lowering the bar.

Commitment signal plan: ask at the end of every call, in this order (the log's ladder [P22]): share a repo URL (rung 1), introduce a colleague (2), book a scorecard walkthrough (3), pre-pay the audit (4). The roadmap prices the report at EUR 490, first five at EUR 0-290 for case-study rights (README section 5.1, `docs/feature/ai-native-ds-kit-beta/README.md`).

---

## 7. Copy kit (my adaptation of the structures in 4.1; none of this text is quoted from a source)

**LinkedIn connection note (keep it short; I could not verify the character limit):**
"Hi {first name}, solo founder studying how teams keep AI-written UI on-system. Not selling anything. Could I ask about the last time it went wrong for you?"

**Email or DM version (about 75 words, for channels with no connection step):**
"Hi {first name}, I saw {specific public thing: your post / repo / talk on X}. I am a solo founder studying how teams keep UI consistent when Claude Code or Cursor writes part of it. I am not selling anything. Could you spare 25 minutes to tell me about the last time it went wrong in {their product / system}? Here is a booking link: {link}. I will send back the anonymised patterns."

**Follow-up 1 (day 1 after accept):** "Thanks for connecting. One ask: 25 minutes, one concrete example of an AI-written UI change you had to fix. Any slot works: {link}. If someone else is closer to this, who would you suggest?"

**Follow-up 2 (day 3):** "No worries if it is a busy week. I am trying to learn what actually happens, not to demo anything. If it helps, afterwards I can run an open-source design-system check on one repo and send you the result, no strings."

**Segment swaps for the second sentence:** DS lead: "...how design-system teams cope when AI agents change UI that uses their system (drift, duplicates, rules)". Agency: "...how agencies keep client UI consistent when AI tools write part of it".

**Warm message to a partner:** "I am running five research calls before 1 November on how agent-written UI drifts from a design system. Could I have 25 minutes of your time about the last time it happened with you, and could you point me to two people who would also have a view?"

**Moderator pre-clearance (Discord or subreddit modmail):** "Hello, I would like to post one research request, not a product pitch: 25-minute calls with people who have had an AI agent change UI in a Next.js or shadcn product in the last 30 days. Screener is two minutes: {link}. I will post the anonymised findings here afterwards. Is this allowed, and where would you like it?"

**Consent script (start of call):** "This is research, not a sales call. I would like to take notes and, if you agree, record audio so I do not miss details. I keep the recording only for my own analysis, delete it within 30 days, and quote you only without your name or company unless you tell me otherwise. You can skip any question or ask me to stop recording at any time. Is it fine to record?" (Elements as in 4.4; not legal advice; pick your own retention period.)

**Close of call:** (1) "Would you share a repo or URL so I can run the scorecard for you?" (2) "Who else should I talk to?" (3) "If I delivered the full audit for EUR {price}, what would stop you paying for it today?" (record the answer verbatim).

---

## 8. What I could not verify, and the next searches to run

Could not verify (marked U above):
- Live rule text for Reddit (all six subs), Claude Developers Discord, the shadcn and Next.js Discords, zheroes, Indie Hackers, Product Hunt, LinkedIn.
- Sizes: Claude Developers Discord, Reactiflux, zheroes, r/webdev, r/reactjs, r/UXDesign; the r/cursor and r/SaaS figures conflict.
- Dates: next Sofia meetup (RZLT, AI Tinkerers), Design Engineering Night #9, Next.js Conf 2026 (unofficial listing only), SaaStock (three listings, three date sets), Vercel Ship (15 vs 15-16 Oct), Converge ticket price.
- LinkedIn groups, YC directories, podcast guest policies: not researched (search budget).
- Sources whose extract did not name the exact page: the cold-email figures [T14], the 5-10% figure [T21], the cursor/SaaS member counts [T3].

Next searches (when the budget is raised): `r/ClaudeCode rules`; `r/nextjs rules`; `shadcn Discord invite members`; `Reactiflux members`; `LinkedIn "design systems" group members`; `YC company directory filters developer tools AI team size`; `Latent Space OR Changelog OR Syntax podcast guest pitch`; `Autumn OR Polar community Discord rules`; `Friends of Figma Sofia`; `Next.js Conf 2026 official date`; `SaaStock Europe 2026 official dates`; `Indie Hackers guidelines`; `Converge 2026 ticket price`.

---

## 9. Sources (retrieved 2026-10-11 unless stated)

### Primary pages I fetched (P)
- P1 https://www.anthropic.com/events - 11 events shown, 3 pages; sorted newest first.
- P2 https://www.anthropic.com/events/claude-founder-house-stockholm - 14 Oct 2026 (header also says 14-15 Oct); applications closed.
- P3 https://www.anthropic.com/events/build-with-claude - workshop list (41 sessions; Europe: London 20 Oct).
- P4 https://claude.com/resources/webinars - single sessions 13-29 Oct; recurring Claude Code sessions.
- P5 https://claude.com/resources/webinars/recurring-virtual-claude-code-workshop - about 1.5 h; engineers; dates only on the form.
- P6 https://claude.com/community - Discord, r/ClaudeAI, ambassadors, newsletter, project showcase.
- P7 https://claude.com/community/ambassadors
- P8 https://claude.com/programs/startups
- P9 https://github.com/anthropics/claude-code - Claude Developers Discord text; feedback via `/bug` and Issues.
- P10 https://www.anthropic.com/discord - 307 redirect to https://discord.com/invite/6PPFFzqPDZ (target not fetched).
- P11 https://support.claude.com/en/articles/12003471-built-with-claude-contest-official-rules - page dated 16 Mar 2026; contest 15 Aug - 1 Sep 2025 (closed); post format: what you built, how, screenshots or demos, at least one prompt.
- P12 https://github.com/shadcn-ui/ui ; /discussions ; /discussions/categories/show-and-tell
- P13 https://github.com/vercel/next.js/discussions ; /discussions/categories/show-and-tell
- P14 https://github.com/design-tokens/community-group
- P15 https://github.com/itspatmorgan/design-studio-starter - open-source Design Studio, 4 stars, MIT, Issues and Discussions enabled (adjacent project; its maintainer could be a peer conversation).
- P16 https://github.com/google-labs-code/design.md - DESIGN.md spec, 28.3k stars, Apache-2.0, alpha, Issues only.
- P17 https://github.com/assistant-ui/assistant-ui ; P18 https://github.com/useautumn/autumn ; P19 https://github.com/polarsource/polar ; P20 https://github.com/vercel/ai-elements
- P21 https://github.com/boyantsonev/systemix-poc - public, 1 star, 8 open issues.
- P22 Local, read-only: `docs/feature/ai-native-ds-kit-beta/README.md` and `.../discover/interview-log.md` (2026-10-11).
- 404 or unreachable: github.com/anthropics/claude-code/discussions, github.com/vercel/ai/discussions, claude.com/community/events, github.com/orgs/shadcn-ui/discussions; indiehackers.com, news.ycombinator.com, converge.zeroheight.com, reddit.com (blocked).

### First-party pages seen only through search extracts (S)
- S1 https://ti.to/zeroheight/converge-2026 (also https://converge.zeroheight.com)
- S2 https://gitnation.com/events/react-advanced-2026 ; remote tickets https://ti.to/gitnation/react-advanced-remote-only-2026
- S3 https://push-conference.com/tickets ; https://push-conference.com/llms.txt
- S4 https://luma.com/cfk3aokj ; https://luma.com/cursor-brussels-belgium ; https://luma.com/ej7dj8y1 ; https://luma.com/idk96s94
- S5 https://masterclass.grandone.fi/courses/ai-design-systems/ ; https://bradfrost.com/speaking/ ; https://newsletter.bradfrost.com
- S6 https://reactiflux.com/promotion ; https://www.reactiflux.com/conduct
- S7 https://news.ycombinator.com/newsguidelines.html ; https://news.ycombinator.com/showhn.html
- S8 https://www.producthunt.com/p/general/new-forum-guidelines
- S9 https://zeroheight.com/slack ; https://forum.zeroheight.com
- S10 https://sofia.aitinkerers.org/ ; https://vienna.aitinkerers.org/?tab=home ; https://prague.aitinkerers.org/p/ai-tinkerers-prague-builders-meetup-oct-8-2026
- S11 https://www.rzlt.io/blog/sofia-claude-code-meetup-1-recap ; https://www.rzlt.io/projects/build-with-claude---a-grassroots-community-movement-born-in-the-balkans ; https://luma.com/5b9jd1t4
- S12 https://docs.cursor.com/community/forum ; https://forum.cursor.com/c/events/europe/26 ; https://forum.cursor.com/c/events/15 ; https://forum.cursor.com/t/showcasing-the-showcase/156937
- S13 https://community.vercel.com/meetups ; https://community.vercel.com/meetups/vercel-ship-sf/42880 ; https://community.vercel.com/meetups/next-js-london-meetup/32188.md ; https://community.vercel.com/meetups/next-js-night-amsterdam/42882.md
- S14 https://handbook.gitlab.com/handbook/product/ux/research-operations/participation-gratuities/ ; https://handbook.gitlab.com/handbook/product/ux/ux-research/recruiting-participants/ ; https://gitlab.com/gitlab-org/ux-research/-/issues/877 ; https://gitlab.com/gitlab-org/ux-research/-/issues/940
- S15 https://www.userinterviews.com/blog/how-to-write-screener-surveys-to-capture-the-right-participants ; https://userinterviews.com/blog/research-incentives-report (2022)
- S16 https://www.producttalk.org/customer-recruiting-course/ ; https://www.producttalk.org/selecting-customers-for-customer-interviews/ ; https://podcast.userinterviews.com/episodes/23-how-to-interview-customers-continuously-with-teresa-torres-of-product-talk
- S18 https://ixdf.org/meetups/design-systems-building-maintaining-them-sep-5th-2026 ; https://www.supernova.io/events/dsl-meetup ; https://www.knapsack.cloud/events ; https://intodesignsystems.substack.com/about
- S19 https://guild.host/design-systems-community/members
- S20 https://luma.com/hnw44qxn
- S21 Claude Code meetups in Europe: https://luma.com/2886csy7 (Budapest) ; https://luma.com/5l3koz6b (Oslo) ; https://vibecoding.app/ai-events/nuremberg-claude-code-impact-lab-2026-10 (5 Oct) ; https://allai.events/event/aalborg--claude-code-meetup (3 Sep) ; https://allai.events/event/barcelona--claude-code-workshop (18 Sep) ; https://luma.com/bwbby7uc (Warsaw) ; https://luma.com/3dgkyp8s (Helsinki). Istanbul and Munich (22 Jun) appeared in the extract without a URL.
- S22 https://friends.figma.com/events/details/figma-oslo-presents-oslo-config-watch-party-2026/

### Third-party or secondary (T) - leads to verify
- T1 r/ClaudeAI: https://gummysearch.com/r/ClaudeAI/ ; https://prowlo.com/tools/subreddit-stats/claudeai ; https://www.reddtrends.com/r/claudeai ; mod post mirror https://redlib.groet-infra.nl/r/ClaudeAI/comments/1sly3jm/built_with_claude_project_showcase_megathread/okx5dn4 (15 Apr 2026, mirror)
- T2 https://discord.com/servers/r-claudecode-1530578814713856011 - unofficial r/claudecode Discord listing, about 3.4k members, undated
- T3 member counts: https://www.reddtrends.com/r/saas ; https://linkeddit.com/blog/best-subreddits-for-ai-marketing-2026 ; https://www.zarifautomates.com/blog/best-ai-subreddits-for-discussion (the extract did not say which gave the r/cursor figures)
- T4 https://designerup.co/blog/best-slack-communities-for-ux-ui-and-product-designers/ ; https://thehiveindex.com/communities/designer-hangout/ (undated)
- T5 r/webdev: https://alldirectories.org/subreddit/r-webdev/ ; https://www.teract.ai/resources/reddit-subreddit-marketing-2026 ; https://yomotherboard.com/question/why-was-my-free-front-end-website-removed-from-showoff-saturday/
- T6 r/reactjs tracker (extract did not name the page): https://www.soar.sh/blog/self-promotion-rules-by-subreddit-database ; https://autotraction.ai/blog/reddit-self-promotion-rules-by-subreddit/
- T7 https://reddit.birdcat.cafe/r/UXResearch ; https://redlib.hackliberty.org/r/rpg/comments/lijfqx/community_rules_survey_surveys (2021) ; https://gummysearch.com/r/UXDesign
- T8 r/SaaS and other subs: https://oneup.today/blog/reddit-self-promotion-rules-saas ; https://www.welaunch.sh/reddit/SaaS ; https://replygenius.io/blog/promote-saas-reddit-without-getting-banned (rules reportedly changed April 2026)
- T9 https://oneup.today/blogs/reddit-selfpromo-rules-study-2026 ; https://redship.io/blog/reddit-self-promotion-rules ; https://www.indiehackers.com/post/every-subreddit-has-different-unwritten-rules-and-heres-how-to-decode-them-before-posting-1wSck8RGykjDv4FAwS69
- T10 https://sharedcontext.ai/skills/external/sales-skills/sales-indiehackers (third-party description of IH Groups)
- T11 Indie Hackers: https://www.indiehackers.com/post/how-automated-cold-messaging-on-linkedin-brought-me-30-interviews-with-potential-customers-369f20c745 (undated) ; https://www.indiehackers.com/post/how-do-you-actually-get-people-to-do-customer-discovery-interviews-494421d032 ; https://www.indiehackers.com/post/cold-outreach-for-idea-validation-6d3d01ad70
- T12 Mom Test summaries: https://dev.to/egepakten/what-i-learned-from-the-mom-test-chapter-6-finding-conversations-4bjc ; https://www.lesswrong.com/posts/fuktKYSvzFMTfPpeT/the-mom-test-summary-and-thoughts ; https://kimbarros.com/mom-test-book-summary ; https://skills.cat/skills/wondelai/skills/mom-test
- T13 YC "How to talk to users" summaries (the talk itself is on YouTube; I did not open it): https://summify.io/discover/how-to-talk-to-users-startup-school-z1iF1c/ ; https://www.recall.it/summary/startup/how-to-talk-to-users-or-startup-school ; https://www.koji.so/docs/how-to-talk-to-users-yc-method
- T14 cold-email figures (one of these two; the extract did not say which): https://www.under30ceo.com/how-to-write-cold-emails-that-get-responses/ ; https://www.sequenzy.com/blog/cold-email-sequence-examples
- T15 podcasts: Code Riff https://www.audible.de/podcast/ITEM_NAME/B0GNMS3RNN (URL exactly as returned; the slug looks like a placeholder) ; Let's Vibe! https://castbox.fm/channel/Let's-Vibe!-id6996428 ; Create With https://www.createwith.com/podcast
- T16 SaaStock Europe: https://dealroom.co/events/saastock-europe-2026/ ; https://gracker.ai/events/saastock-europe-2026/ ; https://founderpath.com/events/saas/saastock-europe/2026-dublin
- T17 https://www.vktr.com/events/conference/vercel-ship-san-francisco-2026/ ; https://vibecoding.app/events/nextjs-conf-2026 ; https://vibecoding.app/ai-events/cursor-meetup-utrecht-2026-10
- T18 https://www.neonmoire.com/event/1569/push-ux-conference-2026
- T19 https://dev.events/meetups/EU/BG/Sofia ; https://globalai.community/communities/sofia-artificial-intelligence-meetup ; https://lenz.io/c/ai-power-user-meetup-sofia-bulgaria-04b5a61e (JSTalks 12 Nov) ; https://www.nvidia.com/en-eu/gtc/session-catalog/sessions/ ; https://createwith.com/event/berlin-neulandpro-connect-2026-oct-2026
- T20 https://dev.classmethod.jp/en/articles/figma-config-2026-recap/ (Config 2026 recap)
- T21 recruiting guides in one result set; the extract did not say which page holds the 5-10% estimate or the "eliminating questions first" advice: https://uxdesign.cc/user-research-for-ux-designers-d66ce14c3519 ; https://riseuplabs.com/user-interviews/ ; https://conveo.ai/insights/user-interview-recruitment ; https://lollypop.design/blog/2025/may/user-recruitment-for-ux-research-guide/ ; https://www.koji.so/blog/how-to-recruit-user-research-participants-2026
- T22 https://searchfunder.com/post/anyone-have-experience-with-linkedin-as-an-outreach-system
- T23 https://www.switas.com/articles/recruit-usability-test-participants-in-two-weeks (citing MeasuringU)
- T24 https://www.koji.so/blog/how-to-recruit-user-research-participants-2026 (citing NN/g)
- T25 https://www.koji.so/docs/incentive-strategies ; https://cleverx.com/blog/research-participant-incentive-guide/
- T26 consent and GDPR: https://www.happyscribe.com/blog/gdpr-consent-for-recording-and-transcribing-research-interviews ; https://www.maxqda.com/blogpost/automatic-transcription-with-maxqda-do-i-need-a-consent-form-for-interviews ; https://www.koji.so/docs/research-consent-form-templates
- T27 HN moderator comment on pre-launch makers and the monthly "What are you working on?" thread (a comment, not policy; the extract did not say which of these): https://hn.svelte.dev/item/47050421 ; https://news.ycombinator.com/item?id=9159183
- T28 HN monthly threads: https://feedbagel.com/post/hacker-news-who-is-hiring-may-2026-job-posting-thread (May 2026) ; https://onpagenews.elisa.supporthost.eu/news/hacker-news-users-invited-to-share-personal-job-seeking-details-20139?lang=en (1 May 2026) ; https://apify.com/pixflor/hacker-news-scraper.md
