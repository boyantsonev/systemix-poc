# Analytics Tool Evaluation

> Context: Pre-launch EU edtech landing page (Connecta — K-12 safe chat + AI coaching).
> Hard requirements: GDPR compliant, EU data residency, free/near-free at <5K sessions/month,
> programmatic API access for Hermes/Ollama synthesis engine, heatmaps desirable.

## Tool Comparison Table

| Tool | Free tier | GDPR/EU | Heatmaps | API access | MCP available |
|------|-----------|---------|----------|------------|---------------|
| **Microsoft Clarity** | Free forever, no session/traffic limits | ⚠️ SCCs only — data stored in Azure US, EU entity is Microsoft Ireland but no EU-only residency. **Under-18 site restriction in ToS.** | Yes (full heatmaps + session recordings) | Data Export API: 1 endpoint, 10 req/day, 3-day rolling window only | **Yes — official** `@microsoft/clarity-mcp-server` |
| **PostHog Cloud EU** | 1M events + 5,000 recordings/month free | ✅ Fully EU (Frankfurt, AWS eu-central-1). DPA available on paid plans. No under-18 restriction found. | Yes (session replay; no click heatmaps natively) | Full REST API + HogQL; official MCP server at `https://mcp.posthog.com/mcp` | **Yes — official** `github.com/PostHog/mcp` |
| **Plausible Cloud** | ❌ No free tier. Starts at €9/month (10K pageviews). Stats API locked to Business plan (~€19/month) | ✅ Fully EU-owned infra, cookieless by default, no DPA needed for most use cases | ❌ No heatmaps | Stats API (`/api/v2/query` POST), 600 req/hr. Business plan required. | **Yes — community** `github.com/getsentry/plausible-mcp` (hosted) + 3 others |
| **Umami (self-hosted)** | Free (self-hosted). ~$5-7/month on a VPS covers it. | ✅ GDPR by default — no cookies, no PII, no consent banner needed | ❌ No heatmaps | Full REST API: `GET /api/websites/{id}/stats`, auth via Bearer token | No official MCP; buildable in hours |
| **Fathom** | ❌ No free tier. Starts at $15/month. | ✅ EU Isolation option (Frankfurt). No consent banner needed. | ❌ No heatmaps | REST API available on all tiers | No known MCP |

---

## CRITICAL BLOCKER: Microsoft Clarity is not usable for a K-12 product

From the official Microsoft Clarity FAQ (updated 2026-05-12):

> **"Clarity shouldn't be used on any websites/apps targeting users under the age of 18."**

This is a hard ToS restriction. Connecta is a K-12 platform. **Clarity is disqualified** regardless of other merits.

---

## Recommended Primary Tool

**PostHog Cloud EU (free tier)**

PostHog is the strongest fit across every dimension:

1. **Free tier covers pre-launch scale comfortably** — 1M events and 5,000 session recordings/month before any charges. Connecta at <5K sessions/month won't touch these limits for months.
2. **EU data residency is real** — an independent PostHog instance on AWS Frankfurt (eu-central-1). No SCCs, no US data transfers. DPA available when needed.
3. **Hermes integration already exists in Systemix** — `spikes/spike-3-posthog/` contains a complete PostHog query client, evidence writeback, and HITL gate. Migrating the Connecta data host to EU cloud is a one-line env var change (`POSTHOG_HOST=https://eu.posthog.com`).
4. **Official MCP** at `https://mcp.posthog.com/mcp` — no build work needed. Supports HogQL queries, feature flags, session data.
5. No under-18 or K-12 restrictions found in PostHog ToS.

The one gap: PostHog does not have native click heatmaps (it has session replay and scroll depth, not aggregate click maps).

---

## Recommended Secondary Tool (if needed)

**Microsoft Clarity — only if Connecta has a non-K-12 companion site** (e.g., a parent/teacher marketing page with no student access).

If heatmaps on a teacher/admin-facing landing page are needed and no students ever visit that URL, Clarity remains viable for that specific page. It is free, has full heatmaps, and its MCP is mature. You would need to:
- Maintain two separate tracking implementations (Clarity on the marketing page, PostHog on the student product)
- Implement explicit EEA consent (Clarity enforces this since Oct 2025)
- Accept that data lives in Azure US under SCCs

If the entire product is K-12-facing (students can reach the landing page), skip Clarity entirely. **Umami** is the clean secondary for cookieless, zero-consent-banner supplemental analytics on the same domain.

---

## MCP Integration Path

### PostHog (recommended — zero build effort)
- Official server: `https://mcp.posthog.com/mcp`
- Add to `.claude/settings.json` or Claude Desktop config with your PostHog personal API key as `Authorization: Bearer <key>`
- Exposes ~12 tools including HogQL queries, feature flag management, session data retrieval
- Install via: `npx @posthog/wizard@latest mcp add`
- The existing Systemix `spikes/spike-3-posthog/posthog-query.js` already implements the HogQL trend query pattern that Hermes reads

### Microsoft Clarity (official — zero build effort, but blocked for K-12)
- npm: `@microsoft/clarity-mcp-server` (published by Microsoft)
- Tools: `query-analytics-dashboard`, `list-session-recordings`, `query-documentation-resources`
- Install: `npm install -g @microsoft/clarity-mcp-server --clarity_api_token YOUR_TOKEN`
- **Do not use on K-12 pages per Clarity ToS**

### Plausible (community — zero build effort)
- Hosted MCP by Sentry team: `https://plausible-mcp.sentry.dev`
- Requires Plausible Business plan ($19/month) for Stats API access
- Tools cover aggregate stats, time series, breakdowns by source/device/country

### Umami (build effort: ~4 hours for a minimal MCP wrapper)
- No existing MCP server found
- API is simple REST + Bearer token, well-documented at `docs.umami.is/docs/api`
- A thin MCP wrapper over `GET /api/websites/{id}/stats` and `GET /api/websites/{id}/events` would give Hermes what it needs
- Effort: ~150 lines of TypeScript, one afternoon

---

## Clarity API — What Hermes Can Read

**Single endpoint:** `GET https://www.clarity.ms/export-data/api/v1/project-live-insights`

**Auth:** `Authorization: Bearer <JWT token>` — generated by project admin in Settings → Data Export.

**Parameters:**
- `numOfDays`: 1, 2, or 3 (rolling window — last 24h, 48h, or 72h only; **no historical data beyond 3 days**)
- `dimension1/2/3`: Break down by Browser, Device, Country/Region, OS, Source, Medium, Campaign, Channel, or URL

**Metrics returned:** Scroll Depth, Engagement Time, Traffic (session counts, bot counts, distinct users, pages/session), Popular Pages, Rage Click Count, Dead Click Count, Quickback Click, Script Errors, Error Clicks

**Rate limits:**
- **Maximum 10 requests per project per day** — very tight for a synthesis engine that polls frequently
- Response capped at 1,000 rows, no pagination

**What Hermes cannot read via API:**
- Individual session recordings (API does not expose replay data)
- Funnel conversion data
- Heatmap coordinates
- Any data older than 72 hours

**Conclusion:** The Clarity API is extremely limited for Hermes. 10 requests/day and a 3-day window make it unsuitable for a synthesis engine that needs historical trend data. The official MCP wraps these same limitations. PostHog's HogQL API has no such restrictions.

---

## Open Decision: PostHog hybrid vs full replacement

**The situation:** Systemix already runs PostHog. Connecta needs its own analytics for a K-12 EU product. The question is whether to:

**Option A — PostHog EU only (recommended)**
Stand up a separate PostHog project on `eu.posthog.com`. Point the Connecta tracking script there. Zero new tooling — Hermes already knows how to read PostHog data via the existing spike. The existing `posthog-query.js` client works unchanged with `POSTHOG_HOST=https://eu.posthog.com`.

Cost: $0 until you exceed 1M events/month (not a risk pre-launch).

Gaps: No aggregate click heatmaps. Session replay is available but requires explicit consent in EU (same as Clarity).

**Option B — PostHog EU (events) + Umami (lightweight page analytics, no consent banner)**
Use PostHog for event tracking, funnel analysis, and Hermes synthesis. Add Umami on a EU VPS ($5-7/month, Hetzner or Fly.io) for cookieless page analytics that requires zero consent UI. Umami's privacy-by-default removes the consent banner problem entirely for basic pageview metrics.

Tradeoff: Two tools, two data streams, slightly higher ops burden. Justified only if consent rate on the PostHog banner is expected to be low (realistic for K-12 parents who distrust data collection).

**Option C — Full replacement with Plausible**
Migrate everything to Plausible Business (~€19/month). EU-native, cookieless, funnels, Stats API, Plausible MCP available. Clean story for a privacy-first K-12 product.

Tradeoff: Monthly cost, no heatmaps, Hermes integration requires rewriting the PostHog spike, loses the existing Systemix synthesis infrastructure.

**Human decision required:** How important is the "zero consent banner" story for the Connecta marketing site? If the target audience (EU parents/schools) is highly privacy-aware, Option B or C may be worth the cost. If conversion rate optimization via heatmaps is a priority and the audience is non-student (teachers/admins only), consider a narrow Clarity deployment on the marketing-only URL alongside PostHog EU for the product.
