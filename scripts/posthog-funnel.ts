/**
 * posthog-funnel.ts — create the "Systemix AARRR" dashboard in PostHog from
 * src/lib/analytics/funnel.ts, so the dashboard and the code share one definition.
 *
 *   npm run posthog:funnel -- --dry-run      print what would be created, send nothing
 *   POSTHOG_PERSONAL_API_KEY=phx_… POSTHOG_PROJECT_ID=12345 npm run posthog:funnel
 *
 * Needs a personal API key with insight and dashboard write access (PostHog → Settings →
 * Personal API keys). It is read from the environment and never printed. The project
 * key the site uses (NEXT_PUBLIC_POSTHOG_KEY) can't create insights.
 *
 * Web and server events have different distinct ids (the plugin sends no id), so the
 * person funnel covers the web steps only, and a trends insight puts every step side by
 * side as weekly counts.
 */

import { FUNNEL_EVENTS, MAIN_FUNNEL, type FunnelEvent } from "../src/lib/analytics/funnel";

const HOST = process.env.POSTHOG_HOST ?? "https://eu.posthog.com";
const DASHBOARD = "Systemix AARRR";

type Node = { kind: "EventsNode"; event: string; name: string; properties?: object[] };

function node(e: Pick<FunnelEvent, "event" | "where">, name = e.event): Node {
  const properties = Object.entries(e.where ?? {}).map(([key, value]) => ({
    key,
    value: Array.isArray(value) ? value : [value],
    operator: "exact",
    type: "event",
  }));
  return { kind: "EventsNode", event: e.event, name, ...(properties.length ? { properties } : {}) };
}

const step = (event: string) => FUNNEL_EVENTS.find((e) => e.event === event && e.stage !== "referral" && e.stage !== "retention")!;
const range = { date_from: "-30d" };

export const INSIGHTS = [
  {
    name: "Funnel (web): visit → copy plugin install → checkout",
    description: "Person funnel over the web steps. The server steps have no person; see the weekly counts insight.",
    query: {
      kind: "InsightVizNode",
      source: {
        kind: "FunnelsQuery",
        series: ["$pageview", "install_command_copied", "checkout_clicked"].map((e) => node(step(e))),
        funnelsFilter: { funnelWindowInterval: 14, funnelWindowIntervalUnit: "day" },
        dateRange: range,
      },
    },
  },
  {
    name: "AARRR steps, weekly counts (web + server)",
    description: `Every main step side by side: ${MAIN_FUNNEL.join(" → ")}.`,
    query: {
      kind: "InsightVizNode",
      source: { kind: "TrendsQuery", interval: "week", series: MAIN_FUNNEL.map((e) => node(step(e))), dateRange: { date_from: "-90d" } },
    },
  },
  {
    name: "Free scores by score band",
    description: "score_served from the report service, by score band.",
    query: {
      kind: "InsightVizNode",
      source: { kind: "TrendsQuery", interval: "week", series: [node(step("score_served"))], breakdownFilter: { breakdown: "score_band", breakdown_type: "event" }, dateRange: { date_from: "-90d" } },
    },
  },
  {
    name: "Revenue signals",
    description: "Demand before launch, checkouts, paid reports, refusals, audit and sprint requests.",
    query: {
      kind: "InsightVizNode",
      source: {
        kind: "TrendsQuery",
        interval: "week",
        series: ["report_notify_requested", "checkout_clicked", "report_delivered", "report_refused", "audit_requested", "book_a_call"].map((e) => node(step(e))),
        dateRange: { date_from: "-90d" },
      },
    },
  },
  {
    name: "Acquisition and referral: visits by utm_source",
    description: "quick-report and plugin are the referral channels (links inside reports and the plugin README).",
    query: {
      kind: "InsightVizNode",
      source: { kind: "TrendsQuery", interval: "week", series: [node({ event: "$pageview" })], breakdownFilter: { breakdown: "utm_source", breakdown_type: "event" }, dateRange: { date_from: "-90d" } },
    },
  },
  {
    name: "Retention: returning visitors (weekly)",
    description: "Visitors who come back. The plugin itself sends no id, so repeat scores are not tied to a person.",
    query: {
      kind: "InsightVizNode",
      source: {
        kind: "RetentionQuery",
        retentionFilter: { period: "Week", totalIntervals: 8, targetEntity: { id: "$pageview", type: "events" }, returningEntity: { id: "$pageview", type: "events" } },
        dateRange: { date_from: "-60d" },
      },
    },
  },
];

async function api(path: string, body: object, key: string) {
  const res = await fetch(`${HOST}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const project = process.env.POSTHOG_PROJECT_ID;
  if (dry || !key || !project) {
    if (!dry) console.error("Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID (or pass --dry-run). Nothing was sent.\n");
    console.log(JSON.stringify({ dashboard: DASHBOARD, insights: INSIGHTS }, null, 2));
    if (!dry) process.exitCode = 1;
    return;
  }
  const dashboard = await api(`/api/projects/${project}/dashboards/`, { name: DASHBOARD, description: "Generated by scripts/posthog-funnel.ts from src/lib/analytics/funnel.ts" }, key);
  for (const insight of INSIGHTS) {
    await api(`/api/projects/${project}/insights/`, { ...insight, dashboards: [dashboard.id] }, key);
    console.log(`  ✓ ${insight.name}`);
  }
  console.log(`\n  ${DASHBOARD}: ${HOST}/project/${project}/dashboard/${dashboard.id}\n`);
}

if (process.argv[1] && process.argv[1].endsWith("posthog-funnel.ts")) {
  main().catch((e) => {
    console.error(`  ✗ ${e.message}`);
    process.exitCode = 1;
  });
}
