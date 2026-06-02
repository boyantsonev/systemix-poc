# Social Signals Research

> Context: Pre-launch EU edtech product (Connecta — K-12 safe chat + AI coaching). Goal is (1) attribute which post/channel drove waitlist signups, (2) track brand keyword engagement, (3) do this without hitting API walls or violating GDPR.

---

## ClearCue AI — What It Is and Whether It Has MCP

**What it is:** Clearcue (clearcue.ai) is a B2B GTM signal engine that monitors the internet for real-time buying intent. It is oriented toward sales teams identifying in-market prospects — not brand monitoring or consumer products. Its primary use case is "signal stacking" across multiple professional data sources to detect when a target company is likely buying.

**Signals it captures:** LinkedIn post engagement and comments, job postings, conference registrations, tech stack changes, funding announcements, news mentions, competitor content engagement, and podcast appearances. Keywords are listed as "coming soon" on the product page.

**MCP status:** Yes, Clearcue has a native MCP server. It is publicly available and connects to Claude Desktop, ChatGPT, Perplexity, and Cursor. Setup takes ~5 minutes via Custom Connectors. The MCP exposes tools to read signals, create new signals from natural language descriptions, tag companies/people, and access entity IDs for cross-tool matching.

**Pricing:** EU-friendly flat-rate pricing with unlimited users.
- Starter: €79/month (annual) — 7 active signals
- Pro: €199/month (annual) — 25 signals
- Scale: €439/month (annual) — 75 signals
- 7-day free trial, no credit card required

**LinkedIn data method:** Clearcue does not disclose whether it uses the official LinkedIn API or scraping. Given that LinkedIn's Marketing API does not expose organic post engagement to third parties, Clearcue almost certainly uses either scraped data or a data partner. They do not publish a GDPR compliance statement on their main pages. **For a regulated EU edtech product targeting minors' data, you must email Clearcue directly and get a Data Processing Agreement (DPA) before using them.** No DPA = non-starter under GDPR.

**Fit for Connecta:** Marginal. Clearcue is built for B2B outbound sales, not for brand mention tracking or waitlist attribution. Its pricing starts at €79/month for features mostly irrelevant at pre-launch. The MCP integration is its best asset for agentic workflows, but the use case mismatch is significant.

---

## Apify Assessment (actors + MCP server)

**MCP server status:** Fully available and actively maintained. Published as `@apify/actors-mcp-server` on npm (v0.5.1 as of June 2026, updated daily). Can connect via hosted remote server at `https://mcp.apify.com` (OAuth or bearer token) or locally via stdio. Works natively with Claude Desktop and Claude Code.

**Relevant actors available:**
- **LinkedIn Profile Posts Scraper** — extracts posts from LinkedIn profiles including content, media, engagement, reactions, and comments
- **LinkedIn Post Search Scraper** — retrieves posts by keyword with author details and engagement metrics
- **LinkedIn Company Posts Scraper** — gathers company posts with engagement metrics
- **Reddit Scraper Lite** (pay-per-result) — crawls posts, comments, communities, and users without login
- **Reddit Scraper** (unlimited) — full posts, comments, subreddit data in multiple formats
- **Tweet Scraper V2** — search, URL, list, and profile scraping with filters
- **Twitter Scraper Unlimited** — enterprise-grade comprehensive extraction

**Data available from LinkedIn actors:** Post content, like/comment/share counts, author details, post timestamps, media attachments. Cannot access DMs, follower lists, or private profile data.

**MCP integration path:** Clean. You can call `apify_call_actor` from Claude with the actor ID and parameters, then read results directly. The MCP server supports up to 30 requests/second. You can search the actor store dynamically — useful for discovering new scrapers without hardcoding actor IDs.

**EU/ToS constraints — this is the critical section:**

- **LinkedIn ToS:** LinkedIn explicitly prohibits automated scraping in its User Agreement. The HiQ vs LinkedIn ruling (affirmed 2022 by the Ninth Circuit) established that scraping *publicly visible* data does not violate the CFAA (a US computer fraud law), but this ruling does not override LinkedIn's contractual ToS, and it does not apply in EU jurisdiction. LinkedIn can and does terminate accounts and block IPs of scrapers.
- **GDPR:** Apify provides the infrastructure; you are the data controller. Scraping named individuals' post engagement (e.g., "Jane Smith commented on this post") is processing personal data under GDPR. You need a documented legitimate interest balancing test, data minimization, retention limits, and a process to handle Subject Access Requests. For a company building a product for children, your ICO/DPA scrutiny level is elevated.
- **Practical risk level for Connecta:** If you are only scraping your own company's LinkedIn page posts (engagement on posts *you* authored) or scraping by keyword to find public mentions of "connecta" or "connecta.education" — the risk is lower because you are not building a dossier on individuals. If you are scraping third-party profiles or tracking individual educators' behavior, that is high-risk territory. **Consult an EU data protection lawyer before using Apify for LinkedIn scraping in a commercial EU product.**
- **Reddit scraping via Apify:** Reddit requires API pre-approval for all apps since November 2025. Scraping Reddit without going through their API approval process violates their ToS. However, Apify's Reddit actors operate in a gray zone similar to LinkedIn. For brand keyword monitoring, the Reddit Public API (with approval) is the cleaner path.

**Pricing:** Apify uses a pay-per-compute-unit model. Small-volume keyword monitoring (a few hundred results/day) costs roughly $5–$20/month at pre-launch scale. Free tier available with limited compute units.

---

## Other Tools Evaluated

### Trigify
**What it does:** AI-powered social listening and signal intelligence focused on B2B professional signals, similar positioning to Clearcue. Claims to track LinkedIn engagement to identify in-market buyers. Pay-as-you-go model, pricing starts ~$69/month (not publicly listed in full — requires demo). Self-declares GDPR compliant, SOC 2 in progress. Integrates with HubSpot, Salesforce, Attio, Pipedrive, Gong, SalesLoft. No MCP server found. **Same LinkedIn data sourcing uncertainty as Clearcue.** Oriented toward B2B sales, not brand monitoring.

### Brand24
**What it does:** Established social listening platform monitoring 16+ sources including Reddit, X/Twitter, LinkedIn, news, blogs, YouTube, TikTok, Quora, podcasts, and newsletters.
**Pricing:** Individual $199/month (3 keywords, 2K mentions), Team $299/month (7 keywords, 10K mentions). API access costs an additional $99/month on top of any plan. 14-day free trial, no credit card. 30-day money-back guarantee.
**Fit:** Well-suited for brand keyword monitoring ("connecta", "connecta.education") across Reddit, X, news. Over-priced for pre-launch. LinkedIn coverage is unclear (listed as a source but LinkedIn restricts third-party monitoring tools heavily). No MCP server.
**Assessment:** Good product, too expensive for pre-launch phase. The $199 entry plan for 3 keywords is hard to justify when you have 1-2 brand keywords and near-zero mentions yet.

### Mention
**What it does:** Social listening platform with API access. Now starts at $599/month for new customers (legacy plans discontinued January 2026). Covers web, Instagram, Facebook, Twitter, forums, and blogs.
**Assessment:** Eliminated. $599/month for a pre-launch edtech product is unjustifiable.

### Syften
**What it does:** Lightweight, affordable keyword monitoring for Reddit, X/Twitter, Hacker News, Indie Hackers, Product Hunt, GitHub, YouTube, Bluesky, Mastodon, forums, blogs, and newsletters. Near-real-time alerts (under 1 minute for Reddit, under 15 minutes for X). AI filtering suppresses spam and weak matches. Has an API (PRO plan, $99.95/month) and webhooks.
**Pricing:** Entry €19.95/month (3 filters), Standard $39.95/month (20 filters, Slack, AI filtering), PRO $99.95/month (100 filters, webhooks, API). 14-day free trial.
**LinkedIn:** Explicitly does not support LinkedIn monitoring.
**GDPR:** Not addressed in their documentation.
**Assessment:** Best price-to-value ratio for pre-launch brand keyword monitoring across Reddit, HN, and X. The Standard plan at $39.95 covers Connecta's realistic monitoring needs for many months. The gap is LinkedIn — but see the LinkedIn Workaround section below.

### X/Twitter Basic API
**Cost:** $100/month for the Basic tier (50,000 tweet reads/month). Pay-per-use model in closed beta. Free tier allows only posting, not reading.
**For referrer attribution:** UTM parameters in your post links do this already without needing the API. API is only needed if you want to track engagement metrics (likes, RTs, replies) on your own posts, or search for keyword mentions.
**Assessment:** Not needed unless you want engagement data on your own X posts. The $100/month barrier is not justified at pre-launch when you can use Syften for X monitoring at $39.95/month.

### Reddit Public API
**Status:** Requires pre-approval for all developers since November 2025. Free tier for non-commercial use with 100 QPM. Commercial use requires separate written agreement and likely fees. Applying for access takes time and is not guaranteed.
**For keyword monitoring:** Technically feasible but overkill when Syften already covers Reddit well for $39.95/month without you needing to build and maintain polling logic. 10 keywords checked every 5 minutes = ~2,880 API requests/day — well within free limits once approved, but the approval process is gated.
**Assessment:** Skip the direct API. Use Syften for Reddit monitoring. Only build direct Reddit API integration if you need structured data for analysis (e.g., sentiment scoring on responses to your posts).

---

## Recommended Stack for Connecta Launch

**Recommendation: Syften Standard ($39.95/month) + UTM-tagged links (free)**

This is the minimum viable and legally cleanest stack:

1. **Syften Standard** covers Reddit, X/Twitter, Hacker News, Indie Hackers, Product Hunt, and news for "connecta" and "connecta.education" keyword monitoring. You get Slack alerts when someone mentions the brand, competitor keywords, or problem phrases your ICP uses ("school chat app", "K-12 AI coaching", etc.). $39.95/month, no GDPR risk on your end since Syften monitors public posts.

2. **UTM-tagged links on every LinkedIn post** give you exact attribution in Vercel Analytics for which post drove signups — completely free, no third-party dependency, no scraping risk. See the next two sections for detail.

Avoid Clearcue, Trigify, and Apify LinkedIn scraping at this stage. They are either over-priced for pre-launch, B2B-sales-oriented rather than brand-monitoring-oriented, or carry meaningful ToS/GDPR risk for an EU edtech company in the children's space.

If you want to add LinkedIn post engagement tracking (likes, comments on your own posts) at a later stage, revisit LinkedIn's own Creator Analytics dashboard first — it shows post-level engagement without any third-party tool.

---

## MCP Integration Path

**Syften:** Has an API on the PRO plan ($99.95/month) and webhooks on the same tier. No native MCP server exists. However, you can wrap the Syften webhook with a simple Vercel serverless function that writes incoming alerts to a Supabase table, and then expose that table to Claude via Hermes or a custom MCP tool. This connects brand mention signals into your existing Systemix/Hermes pipeline without a native integration.

**Apify MCP:** The cleanest MCP integration path if you decide to pull structured Reddit or X data. `@apify/actors-mcp-server` is production-ready, connects to Claude Code in ~5 minutes, and gives you access to the Reddit and X scrapers on-demand. Use this for research and analysis tasks (e.g., "summarize all Reddit threads mentioning 'connecta' this week") rather than continuous monitoring. Keep Syften for real-time alerting and Apify for periodic structured pulls.

**Clearcue MCP:** Technically the best MCP integration (bidirectional, signal creation via natural language), but use-case mismatch makes it hard to justify. Only consider if Connecta pivots toward a heavy B2B school district sales motion where intent signals on school decision-makers would be valuable.

---

## LinkedIn Workaround Strategy (no official API)

LinkedIn's Marketing API does not expose organic post engagement to third parties. Their official tools (Campaign Manager) cover paid posts only. There is no sanctioned way to get API access to your own organic post metrics programmatically as of 2026.

**What you can do legally:**

1. **UTM every link in every LinkedIn post.** Format: `https://connecta.education/waitlist?utm_source=linkedin&utm_medium=organic&utm_campaign=launch-wave-1&utm_content=post-title-slug`. Vercel Analytics captures these natively. This tells you exactly which LinkedIn post drove each signup — zero API calls, zero scraping, fully GDPR-compliant (you own the analytics data).

2. **Use LinkedIn's built-in Creator Analytics.** If you have a LinkedIn Page or personal profile with Creator Mode enabled, LinkedIn shows post-level impressions, reactions, comments, shares, and follower growth for your own posts. Export to CSV weekly. This is the official, free, ToS-compliant source of truth for your own post performance.

3. **Manual UTM link builder discipline.** Create a shared Notion or Google Sheet with a UTM link generator. Every time someone on the Connecta team posts to LinkedIn, they generate a unique UTM-tagged link from this sheet. Combined with Vercel Analytics, you get post-level conversion attribution without any third-party tool.

4. **Do not use Apify or Trigify to scrape engagement data on your own posts or others'.** LinkedIn will detect and block the scraping, and for a GDPR-regulated EU product, the legal exposure is not worth it at pre-launch when the stakes are low and the data volume is minimal anyway.

---

## What UTM + Vercel Already Covers (so we don't overbuild)

**Already solved by UTM + Vercel Analytics:**
- Which LinkedIn post drove a specific waitlist signup (UTM source + content)
- Which channel (LinkedIn vs Reddit vs email vs direct) drives the most signups
- Geographic distribution of signups
- Device/browser breakdown
- Referrer URLs for signups that come through without UTM tags (Vercel logs the raw referrer header)
- Page-level conversion funnel (which landing page variant converts best)

**The actual gap — what UTM + Vercel cannot cover:**
- Whether a LinkedIn post is getting traction *before* someone clicks through (impressions, reactions, comments on the post itself — use LinkedIn Creator Analytics for this)
- Brand mentions on Reddit, X, or HN when people discuss Connecta in threads where no one clicked your link
- Competitive intelligence: what are people saying about similar products
- Early signal that a community is paying attention before traffic shows up in Vercel

**Sizing the gap realistically:** At pre-launch with low brand awareness, Reddit/X mentions of "connecta" will be near-zero for weeks. Syften at $39.95/month is the right level of investment. Do not spend $200+/month on Brand24 or $79+/month on Clearcue to monitor a brand that has near-zero organic mention volume yet.

The right trigger to upgrade tooling: when Syften is alerting you to 10+ organic mentions/day and you need structured data, sentiment scoring, or CRM integration — at that point, the $200-$400/month tools justify themselves.
