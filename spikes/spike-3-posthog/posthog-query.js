#!/usr/bin/env node
// SYSTMIX-202: PostHog query — pulls component_render events via REST API
// Uses POSTHOG_API_KEY + POSTHOG_PROJECT_ID env vars; falls back to fixture data.
// Run: node posthog-query.js [component-name]

import { readFileSync } from "node:fs";

const API_KEY    = process.env.POSTHOG_API_KEY;
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const HOST       = process.env.POSTHOG_HOST ?? "https://app.posthog.com";

// ── Live query via PostHog REST API ──────────────────────────────────────────

async function queryLive(componentName, days = 30) {
  const dateFrom = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);

  // HogQL trend insight — aggregates event counts by $variant property
  const body = {
    events: [{ id: "component_render", name: "component_render", type: "events" }],
    properties: [{ key: "component", value: componentName, operator: "exact", type: "event" }],
    breakdown: "variant",
    breakdown_type: "event",
    date_from: `-${days}d`,
    insight: "TRENDS",
    interval: "day",
  };

  const res = await fetch(`${HOST}/api/projects/${PROJECT_ID}/insights/trend/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`PostHog ${res.status}: ${await res.text()}`);
  const json = await res.json();

  // Normalise PostHog trend response into our shape
  const variants = {};
  let total = 0;
  for (const series of json.result ?? []) {
    const variant = series.breakdown_value ?? "default";
    const renders = series.aggregated_value ?? series.count ?? 0;
    variants[variant] = { renders };
    total += renders;
  }

  return {
    component: componentName,
    event: "component_render",
    period_days: days,
    fetched_at: new Date().toISOString().slice(0, 10),
    total_renders: total,
    variants,
    source: "live",
  };
}

// ── Fixture fallback ──────────────────────────────────────────────────────────

function queryFixture(componentName) {
  const fixture = JSON.parse(readFileSync("./fixtures/posthog-events.json", "utf8"));
  return { ...fixture, source: "fixture" };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function queryPostHog(componentName, days = 30) {
  if (API_KEY && PROJECT_ID) {
    try {
      return await queryLive(componentName, days);
    } catch (err) {
      console.warn(`  PostHog live query failed (${err.message}), falling back to fixture`);
    }
  }
  return queryFixture(componentName);
}

if (process.argv[1].endsWith("posthog-query.js")) {
  const componentName = process.argv[2] ?? "Button";
  console.log(`\n  Systemix Spike 3 — PostHog query`);
  console.log(`  Component: ${componentName}`);

  if (!API_KEY) {
    console.log("  No POSTHOG_API_KEY set — using fixture data\n");
  }

  const data = await queryPostHog(componentName);
  console.log(`  Source: ${data.source}  |  Total renders: ${data.total_renders}  |  Period: ${data.period_days}d`);
  console.log(`  Fetched: ${data.fetched_at}\n`);
  console.log("  Variants:");
  for (const [variant, stats] of Object.entries(data.variants)) {
    const ctr = data.ctr_by_variant?.[variant];
    console.log(`    ${variant.padEnd(14)} ${String(stats.renders).padStart(6)} renders${ctr != null ? `  CTR ${(ctr * 100).toFixed(1)}%` : ""}`);
  }
  console.log();
}
