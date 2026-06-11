import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Regression guard for the PostHog reverse proxy (PR #59).
//
// The whole evidence loop (engagement pull → snapshot cards → HITL → cron)
// depends on capture working. Before the proxy, ad/tracker/DNS blockers dropped
// every `/e/` request to *.posthog.com silently — 0 events reached the project
// for weeks, with no error anywhere. If `api_host` reverts to a direct posthog.com
// host, or the `/ingest` rewrites are removed, capture breaks the same silent way.
// These assertions turn that silent regression into a loud test failure.

const here = path.dirname(fileURLToPath(import.meta.url)); // src/components/systemix
const root = path.resolve(here, "../../.."); // repo root

describe("PostHog reverse proxy stays intact", () => {
  it("PostHogProvider routes ingestion through the same-origin /ingest proxy", () => {
    const src = fs.readFileSync(path.join(here, "PostHogProvider.tsx"), "utf8");
    // Must use the proxy…
    expect(src).toMatch(/api_host:\s*["']\/ingest["']/);
    // …and must NOT send capture directly to a blockable posthog.com host.
    expect(src).not.toMatch(/api_host:\s*["'][^"']*\bi\.posthog\.com/);
  });

  it("next.config rewrites /ingest/* to PostHog EU (events + static assets)", () => {
    const cfg = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
    // Static assets → eu-assets; everything else (incl. /e/, /decide) → eu ingest.
    expect(cfg).toMatch(/\/ingest\/static\/:path\*[\s\S]*?eu-assets\.i\.posthog\.com/);
    expect(cfg).toMatch(/source:\s*["']\/ingest\/:path\*["'][\s\S]*?destination:\s*["']https:\/\/eu\.i\.posthog\.com/);
  });
});
