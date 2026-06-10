"use strict";

// Acceptance tests for the landing-engagement evidence loop:
// `systemix evidence engagement pull` (PostHog funnel → record + HITL card) and
// `evidence engagement close` (acknowledge). Hermetic: real tmpdir workspace,
// stubbed global fetch, env toggled per test.

const fs   = require("fs");
const os   = require("os");
const path = require("path");

const RECORD_MDX = `---
type: engagement
id: landing
surface: landing
window_days: 30
status: tracking
evidence-posthog: null
last-synced: null
---

# Landing engagement

Standing record.

## Engagement Log

_No snapshots yet — run \`npx systemix evidence engagement pull\`._
`;

let root, prevCwd, prevEnv;

function freshModule() {
  jest.resetModules();
  return require("../../../src/commands/evidence");
}

function makeWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "systemix-engagement-"));
  fs.mkdirSync(path.join(dir, "contract", "engagement"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".systemix"), { recursive: true });
  fs.writeFileSync(path.join(dir, "contract", "engagement", "landing.mdx"), RECORD_MDX, "utf8");
  return dir;
}

function readRecord() {
  return fs.readFileSync(path.join(root, "contract", "engagement", "landing.mdx"), "utf8");
}
function readQueue() {
  const p = path.join(root, ".systemix", "queue.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : { cards: [] };
}

beforeEach(() => {
  prevCwd = process.cwd();
  prevEnv = { ...process.env };
  root = makeWorkspace();
  process.chdir(root);
  global.fetch = jest.fn();
});

afterEach(() => {
  process.chdir(prevCwd);
  process.env = prevEnv;
  fs.rmSync(root, { recursive: true, force: true });
  delete global.fetch;
});

// ── queryPostHogEngagement ────────────────────────────────────────────────────

test("query returns no-credentials when env is unset (no network call)", async () => {
  delete process.env.POSTHOG_API_KEY;
  delete process.env.POSTHOG_PROJECT_ID;
  const { queryPostHogEngagement } = freshModule();
  const ev = await queryPostHogEngagement(30);
  expect(ev.source).toBe("no-credentials");
  expect(ev.unique_visitors).toBe(0);
  expect(global.fetch).not.toHaveBeenCalled();
});

test("query computes the funnel + install conversion from HogQL rows", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [[1000, 800, 40, 36, 12, 5]] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [["hero", 700], ["the-gap", 500]] }) });

  const { queryPostHogEngagement } = freshModule();
  const ev = await queryPostHogEngagement(30);

  expect(ev.source).toBe("live");
  expect(ev.unique_visitors).toBe(800);
  expect(ev.pageviews).toBe(1000);
  expect(ev.install_persons).toBe(36);
  expect(ev.install_conversion).toBeCloseTo(36 / 800, 5);
  expect(ev.cta_clicks).toEqual({ hero: 12, nav: 5 });
  expect(ev.sections).toEqual([{ section: "hero", views: 700 }, { section: "the-gap", views: 500 }]);
  // EU host used, query endpoint hit twice (headline + sections)
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch.mock.calls[0][0]).toBe("https://eu.posthog.com/api/projects/123/query");
});

test("query returns source=error on a failed response", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  global.fetch.mockResolvedValueOnce({ ok: false, status: 403 });
  const { queryPostHogEngagement } = freshModule();
  const ev = await queryPostHogEngagement(30);
  expect(ev.source).toBe("error");
  expect(ev.error).toMatch(/403/);
});

// ── synthesizeEngagement (deterministic, no LLM) ──────────────────────────────

test("synthesis scales confidence by sample size and reports conversion", () => {
  const { synthesizeEngagement } = freshModule();
  const big = synthesizeEngagement({ source: "live", period_days: 30, unique_visitors: 1200, pageviews: 1500, install_persons: 60, install_copies: 70, install_conversion: 0.05, cta_clicks: { hero: 1, nav: 1 }, sections: [{ section: "hero", views: 1 }] });
  expect(big.confidence).toBe(0.8);
  expect(big.summary).toMatch(/1200 unique visitors/);
  expect(big.summary).toMatch(/5%/);

  const small = synthesizeEngagement({ source: "live", period_days: 30, unique_visitors: 50, pageviews: 60, install_persons: 1, install_copies: 1, install_conversion: 0.02, cta_clicks: { hero: 0, nav: 0 }, sections: [] });
  expect(small.confidence).toBe(0.2);
  expect(small.recommendation).toMatch(/keep-collecting/);

  const none = synthesizeEngagement({ source: "no-credentials" });
  expect(none.confidence).toBe(0);
  expect(none.recommendation).toBe("configure-posthog");
});

// ── writeEngagementSnapshot ───────────────────────────────────────────────────

test("snapshot writes the evidence-posthog block + a dated log entry", () => {
  const { synthesizeEngagement, writeEngagementSnapshot } = freshModule();
  const ev = { surface: "landing", period_days: 30, fetched_at: "2026-06-10", source: "live", unique_visitors: 800, pageviews: 1000, install_copies: 40, install_persons: 36, install_conversion: 0.045, cta_clicks: { hero: 12, nav: 5 }, sections: [{ section: "hero", views: 700 }] };
  writeEngagementSnapshot("landing", ev, synthesizeEngagement(ev));

  const rec = readRecord();
  expect(rec).toMatch(/evidence-posthog:\n {2}fetched_at: "2026-06-10"/);
  expect(rec).toMatch(/unique_visitors: 800/);
  expect(rec).toMatch(/install_conversion: 0\.045/);
  expect(rec).toMatch(/last-synced: "2026-06-10"/);
  expect(rec).toMatch(/### 2026-06-10 — synced \(live\)/);
  // placeholder removed
  expect(rec).not.toMatch(/_No snapshots yet/);
});

// ── engagement pull (end-to-end, no creds) ────────────────────────────────────

test("engagement pull writes a snapshot + pushes an engagement-snapshot card", async () => {
  delete process.env.POSTHOG_API_KEY;
  delete process.env.POSTHOG_PROJECT_ID;
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);

  const q = readQueue();
  expect(q.cards).toHaveLength(1);
  const card = q.cards[0];
  expect(card.type).toBe("engagement-snapshot");
  expect(card.recordPath).toBe(path.join("contract", "engagement", "landing.mdx"));
  expect(card.metric).toBe("install conversion");
  expect(card.sessions).toBe(0);
  expect(card.status).toBe("pending");
  expect(readRecord()).toMatch(/### .* — synced \(no-credentials\)/);
});

test("engagement pull replaces a prior pending card (dedup)", async () => {
  delete process.env.POSTHOG_API_KEY;
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);
  await evidence(["engagement", "pull"]);
  const q = readQueue();
  expect(q.cards.filter(c => c.type === "engagement-snapshot" && c.status === "pending")).toHaveLength(1);
});

// ── engagement close (acknowledge) ────────────────────────────────────────────

test("engagement close acknowledges the snapshot + resolves the card", async () => {
  delete process.env.POSTHOG_API_KEY;
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);
  await evidence(["engagement", "close", "landing", "--note", "looks fine"]);

  const rec = readRecord();
  expect(rec).toMatch(/acknowledged — looks fine _\(cli\)_/);

  const card = readQueue().cards.find(c => c.type === "engagement-snapshot");
  expect(card.status).toBe("approved");
  expect(card.resolution.action).toBe("acknowledged");
});

test("engagement close --flag records flagged-for-experiment", async () => {
  delete process.env.POSTHOG_API_KEY;
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);
  await evidence(["engagement", "close", "--flag"]);
  expect(readRecord()).toMatch(/flagged-for-experiment _\(cli\)_/);
});

// ── evidence check ────────────────────────────────────────────────────────────

test("check reports missing creds without pinging", async () => {
  delete process.env.POSTHOG_API_KEY;
  delete process.env.POSTHOG_PROJECT_ID;
  const logs = [];
  jest.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
  const { evidence } = freshModule();
  await evidence(["check"]);
  console.log.mockRestore();
  const out = logs.join("\n");
  expect(out).toMatch(/POSTHOG_API_KEY.*missing/);
  expect(global.fetch).not.toHaveBeenCalled();
});

test("check pings PostHog and reports the 24h pageview count", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [[42]] }) });
  const logs = [];
  jest.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
  const { evidence } = freshModule();
  await evidence(["check"]);
  console.log.mockRestore();
  expect(global.fetch).toHaveBeenCalledWith(
    "https://eu.posthog.com/api/projects/123/query",
    expect.objectContaining({ method: "POST" }),
  );
  expect(logs.join("\n")).toMatch(/42 \$pageview/);
});
