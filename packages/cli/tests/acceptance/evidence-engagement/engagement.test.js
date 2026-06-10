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
  expect(ev.surface).toBe("landing");
  expect(ev.period_days).toBe(30);
  expect(ev.unique_visitors).toBe(0);
  expect(ev.pageviews).toBe(0);
  expect(ev.install_copies).toBe(0);
  expect(ev.install_persons).toBe(0);
  expect(ev.install_conversion).toBeNull();
  // Base shape: cta_clicks is a zeroed {hero,nav} object, sections an empty array,
  // fetched_at a YYYY-MM-DD date string (sliced, not a full ISO timestamp).
  expect(ev.cta_clicks).toEqual({ hero: 0, nav: 0 });
  expect(ev.sections).toEqual([]);
  expect(ev.fetched_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(ev.fetched_at).not.toMatch(/T\d{2}:/);
  expect(global.fetch).not.toHaveBeenCalled();
});

test("query returns no-credentials when only one of the two creds is set", async () => {
  // Either var missing → no-credentials (OR, not AND). Test each single-var case.
  process.env.POSTHOG_API_KEY = "phx_test";
  delete process.env.POSTHOG_PROJECT_ID;
  let mod = freshModule();
  let ev = await mod.queryPostHogEngagement(30);
  expect(ev.source).toBe("no-credentials");
  expect(global.fetch).not.toHaveBeenCalled();

  delete process.env.POSTHOG_API_KEY;
  process.env.POSTHOG_PROJECT_ID = "123";
  mod = freshModule();
  ev = await mod.queryPostHogEngagement(30);
  expect(ev.source).toBe("no-credentials");
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
  expect(ev.surface).toBe("landing");
  expect(ev.period_days).toBe(30);
  expect(ev.unique_visitors).toBe(800);
  expect(ev.pageviews).toBe(1000);
  expect(ev.install_copies).toBe(40);
  expect(ev.install_persons).toBe(36);
  expect(ev.install_conversion).toBeCloseTo(36 / 800, 5);
  expect(ev.install_conversion).not.toBeNull();
  expect(ev.cta_clicks).toEqual({ hero: 12, nav: 5 });
  expect(ev.sections).toEqual([{ section: "hero", views: 700 }, { section: "the-gap", views: 500 }]);
  // EU host used, query endpoint hit twice (headline + sections)
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(global.fetch.mock.calls[0][0]).toBe("https://eu.posthog.com/api/projects/123/query");
  // The headline query carries the funnel events; the second query is the sections aggregation.
  const headlineBody = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(headlineBody.query.kind).toBe("HogQLQuery");
  expect(headlineBody.query.query).toMatch(/install_command_copied/);
  expect(headlineBody.query.query).toMatch(/count\(DISTINCT person_id\)/);
  const sectionsBody = JSON.parse(global.fetch.mock.calls[1][1].body);
  expect(sectionsBody.query.query).toMatch(/section_viewed/);
  expect(sectionsBody.query.query).toMatch(/GROUP BY section/);
  // Auth header carries the bearer key.
  expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer phx_test");
});

test("query defaults to the EU host when POSTHOG_HOST is unset and strips a trailing slash", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  delete process.env.POSTHOG_HOST;
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [[1, 1, 0, 0, 0, 0]] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });
  const { queryPostHogEngagement } = freshModule();
  await queryPostHogEngagement(30);
  // Default host is the EU instance, with no double slash before /api.
  expect(global.fetch.mock.calls[0][0]).toBe("https://eu.posthog.com/api/projects/123/query");

  // And a configured host with a trailing slash is normalised.
  jest.clearAllMocks();
  process.env.POSTHOG_HOST = "https://us.posthog.com/";
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [[1, 1, 0, 0, 0, 0]] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });
  const { queryPostHogEngagement: q2 } = freshModule();
  await q2(30);
  expect(global.fetch.mock.calls[0][0]).toBe("https://us.posthog.com/api/projects/123/query");
});

test("query zeroes the funnel and nulls conversion when there is no traffic", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  // Empty results from both queries — destructuring defaults must kick in.
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });
  const { queryPostHogEngagement } = freshModule();
  const ev = await queryPostHogEngagement(30);
  expect(ev.source).toBe("live");
  expect(ev.pageviews).toBe(0);
  expect(ev.unique_visitors).toBe(0);
  expect(ev.install_copies).toBe(0);
  expect(ev.install_persons).toBe(0);
  // visitors === 0 → conversion guard returns null, not 0 or NaN.
  expect(ev.install_conversion).toBeNull();
  expect(ev.cta_clicks).toEqual({ hero: 0, nav: 0 });
  expect(ev.sections).toEqual([]);
});

test("query maps section rows into {section, views} objects", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [[10, 5, 1, 1, 0, 0]] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [["the-loop", 12], ["surfaces", 3]] }) });
  const { queryPostHogEngagement } = freshModule();
  const ev = await queryPostHogEngagement(30);
  expect(ev.sections).toEqual([
    { section: "the-loop", views: 12 },
    { section: "surfaces", views: 3 },
  ]);
});

test("query returns source=error on a failed response", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  global.fetch.mockResolvedValueOnce({ ok: false, status: 403 });
  const { queryPostHogEngagement } = freshModule();
  const ev = await queryPostHogEngagement(30);
  expect(ev.source).toBe("error");
  expect(ev.error).toBe("PostHog query 403");
});

// ── synthesizeEngagement (deterministic, no LLM) ──────────────────────────────

function liveEv(overrides = {}) {
  return {
    source: "live", period_days: 30, unique_visitors: 0, pageviews: 0,
    install_persons: 0, install_copies: 0, install_conversion: null,
    cta_clicks: { hero: 0, nav: 0 }, sections: [], ...overrides,
  };
}

test("synthesis scales confidence by sample size and reports conversion", () => {
  const { synthesizeEngagement } = freshModule();
  const big = synthesizeEngagement(liveEv({ unique_visitors: 1200, pageviews: 1500, install_persons: 60, install_copies: 70, install_conversion: 0.05, cta_clicks: { hero: 1, nav: 1 }, sections: [{ section: "hero", views: 1 }] }));
  expect(big.confidence).toBe(0.8);
  expect(big.summary).toMatch(/1200 unique visitors/);
  expect(big.summary).toMatch(/5%/);

  const small = synthesizeEngagement(liveEv({ unique_visitors: 50, pageviews: 60, install_persons: 1, install_copies: 1, install_conversion: 0.02, cta_clicks: { hero: 0, nav: 0 }, sections: [] }));
  expect(small.confidence).toBe(0.2);
  expect(small.recommendation).toMatch(/keep-collecting/);

  const none = synthesizeEngagement({ source: "no-credentials" });
  expect(none.confidence).toBe(0);
  expect(none.recommendation).toBe("configure-posthog");
  expect(none.summary).toMatch(/No PostHog credentials set/);
});

// Confidence tiers are exact at their boundaries — 1000, 100, 1, 0.
test.each([
  [1000, 0.8],
  [999, 0.5],
  [100, 0.5],
  [99, 0.2],
  [1, 0.2],
  [0, 0],
])("synthesis confidence tier: %i visitors → %f", (visitors, expected) => {
  const { synthesizeEngagement } = freshModule();
  const out = synthesizeEngagement(liveEv({ unique_visitors: visitors, pageviews: visitors, install_persons: 0, install_conversion: visitors > 0 ? 0 : null }));
  expect(out.confidence).toBe(expected);
});

test("synthesis recommendation branches by traffic + conversion", () => {
  const { synthesizeEngagement } = freshModule();
  // No traffic at all.
  expect(synthesizeEngagement(liveEv({ unique_visitors: 0 })).recommendation).toBe("no-traffic-yet");
  // Some traffic but below the 100-visitor sample threshold.
  expect(synthesizeEngagement(liveEv({ unique_visitors: 99, pageviews: 99, install_persons: 5, install_conversion: 0.05 })).recommendation)
    .toBe("keep-collecting (sample below 100 visitors)");
  // Exactly 100 visitors is the boundary: NOT keep-collecting (the test is strict <100).
  expect(synthesizeEngagement(liveEv({ unique_visitors: 100, pageviews: 120, install_persons: 6, install_conversion: 0.06 })).recommendation)
    .toBe("healthy — consider an A/B on the hero to lift conversion");
  // Enough traffic and healthy conversion (>= 5%).
  expect(synthesizeEngagement(liveEv({ unique_visitors: 200, pageviews: 250, install_persons: 12, install_conversion: 0.06 })).recommendation)
    .toBe("healthy — consider an A/B on the hero to lift conversion");
  // Enough traffic but conversion below 5%.
  expect(synthesizeEngagement(liveEv({ unique_visitors: 200, pageviews: 250, install_persons: 4, install_conversion: 0.02 })).recommendation)
    .toBe("low conversion — flag for an experiment");
  // Enough traffic but conversion is exactly null → not "healthy", falls through to low-conversion.
  expect(synthesizeEngagement(liveEv({ unique_visitors: 200, pageviews: 250, install_persons: 0, install_conversion: null })).recommendation)
    .toBe("low conversion — flag for an experiment");
});

test("synthesis conversion is exactly at the 5% boundary → healthy", () => {
  const { synthesizeEngagement } = freshModule();
  // 0.05 is inclusive (>=), so it must read healthy, not low-conversion.
  expect(synthesizeEngagement(liveEv({ unique_visitors: 200, pageviews: 250, install_persons: 10, install_conversion: 0.05 })).recommendation)
    .toBe("healthy — consider an A/B on the hero to lift conversion");
});

test("synthesis summary singularises visitor/pageview counts and renders conversion", () => {
  const { synthesizeEngagement } = freshModule();
  const one = synthesizeEngagement(liveEv({ unique_visitors: 1, pageviews: 1, install_persons: 0, install_conversion: 0 }));
  // Exactly one → singular nouns, no trailing "s".
  expect(one.summary).toMatch(/1 unique visitor,/);
  expect(one.summary).toMatch(/1 pageview,/);

  const many = synthesizeEngagement(liveEv({ unique_visitors: 2, pageviews: 3, install_persons: 0, install_conversion: 0 }));
  expect(many.summary).toMatch(/2 unique visitors,/);
  expect(many.summary).toMatch(/3 pageviews,/);
});

test("synthesis renders 'n/a' when conversion is null but data is live", () => {
  const { synthesizeEngagement } = freshModule();
  const out = synthesizeEngagement(liveEv({ unique_visitors: 5, pageviews: 5, install_persons: 0, install_conversion: null }));
  expect(out.summary).toMatch(/\(n\/a conversion\)/);
});

test("synthesis pct() rounds conversion to one decimal place", () => {
  const { synthesizeEngagement } = freshModule();
  // 0.1234 → 12.3%; CTA + section figures echoed verbatim.
  const out = synthesizeEngagement(liveEv({ unique_visitors: 500, pageviews: 600, install_persons: 62, install_conversion: 0.1234, cta_clicks: { hero: 7, nav: 4 }, sections: [{ section: "hero", views: 9 }, { section: "the-gap", views: 4 }] }));
  expect(out.summary).toMatch(/12\.3% conversion/);
  expect(out.summary).toMatch(/hero 7, nav 4/);
  expect(out.summary).toMatch(/Top sections: hero, the-gap/);
});

test("synthesis lists 'none' when there are no sections", () => {
  const { synthesizeEngagement } = freshModule();
  const out = synthesizeEngagement(liveEv({ unique_visitors: 200, pageviews: 250, install_persons: 12, install_conversion: 0.06, sections: [] }));
  expect(out.summary).toMatch(/Top sections: none\./);
});

test("synthesis caps the top-section list at three entries", () => {
  const { synthesizeEngagement } = freshModule();
  const sections = [
    { section: "a", views: 9 }, { section: "b", views: 8 }, { section: "c", views: 7 }, { section: "d", views: 6 },
  ];
  const out = synthesizeEngagement(liveEv({ unique_visitors: 200, pageviews: 250, install_persons: 12, install_conversion: 0.06, sections }));
  expect(out.summary).toMatch(/Top sections: a, b, c\./);
  expect(out.summary).not.toMatch(/\bd\b/);
});

test("synthesis surfaces the error message on a query failure", () => {
  const { synthesizeEngagement } = freshModule();
  const out = synthesizeEngagement({ source: "error", error: "PostHog query 403" });
  expect(out.confidence).toBe(0);
  expect(out.recommendation).toBe("retry");
  expect(out.summary).toMatch(/PostHog query failed: PostHog query 403/);
});

// ── writeEngagementSnapshot ───────────────────────────────────────────────────

test("snapshot writes the evidence-posthog block + a dated log entry", () => {
  const { synthesizeEngagement, writeEngagementSnapshot } = freshModule();
  const ev = { surface: "landing", period_days: 30, fetched_at: "2026-06-10", source: "live", unique_visitors: 800, pageviews: 1000, install_copies: 40, install_persons: 36, install_conversion: 0.045, cta_clicks: { hero: 12, nav: 5 }, sections: [{ section: "hero", views: 700 }] };
  writeEngagementSnapshot("landing", ev, synthesizeEngagement(ev));

  const rec = readRecord();
  // Every key/value of the evidence-posthog block is written verbatim.
  expect(rec).toMatch(/evidence-posthog:\n {2}fetched_at: "2026-06-10"/);
  expect(rec).toMatch(/\n {2}source: "live"/);
  expect(rec).toMatch(/\n {2}window_days: 30/);
  expect(rec).toMatch(/\n {2}unique_visitors: 800/);
  expect(rec).toMatch(/\n {2}pageviews: 1000/);
  expect(rec).toMatch(/\n {2}install_copies: 40/);
  expect(rec).toMatch(/\n {2}install_persons: 36/);
  expect(rec).toMatch(/\n {2}install_conversion: 0\.045/);
  expect(rec).toMatch(/last-synced: "2026-06-10"/);
  expect(rec).toMatch(/### 2026-06-10 — synced \(live\)/);
  // The synthesis summary + signal-strength note are inlined into the log entry.
  // 800 visitors → 50% confidence; conversion 0.045 (< 0.05) → low-conversion recommendation.
  expect(rec).toMatch(/Signal strength: 50%\. Note: low conversion — flag for an experiment\./);
  expect(rec).toMatch(/800 unique visitors/);
  // placeholder removed
  expect(rec).not.toMatch(/_No snapshots yet/);
});

test("snapshot rounds install_conversion to four decimals", () => {
  const { synthesizeEngagement, writeEngagementSnapshot } = freshModule();
  const ev = { surface: "landing", period_days: 30, fetched_at: "2026-06-10", source: "live", unique_visitors: 800, pageviews: 1000, install_copies: 40, install_persons: 36, install_conversion: 36 / 800, cta_clicks: { hero: 1, nav: 1 }, sections: [] };
  writeEngagementSnapshot("landing", ev, synthesizeEngagement(ev));
  // 36/800 = 0.045 exactly; with a messier ratio it must round to 4dp, not dump the full float.
  const ev2 = { ...ev, fetched_at: "2026-06-11", install_persons: 37, install_conversion: 37 / 800 }; // 0.046250
  writeEngagementSnapshot("landing", ev2, synthesizeEngagement(ev2));
  const rec = readRecord();
  expect(rec).toMatch(/install_conversion: 0\.0463/);
  expect(rec).not.toMatch(/install_conversion: 0\.046250/);
});

test("snapshot writes the literal null when conversion is unavailable", () => {
  const { synthesizeEngagement, writeEngagementSnapshot } = freshModule();
  const ev = { surface: "landing", period_days: 30, fetched_at: "2026-06-10", source: "live", unique_visitors: 0, pageviews: 0, install_copies: 0, install_persons: 0, install_conversion: null, cta_clicks: { hero: 0, nav: 0 }, sections: [] };
  writeEngagementSnapshot("landing", ev, synthesizeEngagement(ev));
  const rec = readRecord();
  expect(rec).toMatch(/install_conversion: null/);
  // The "none" signal-strength rendering kicks in for zero confidence.
  expect(rec).toMatch(/Signal strength: none\. Note: no-traffic-yet\./);
});

test("snapshot appends an Engagement Log heading when the record body has none", () => {
  const { synthesizeEngagement, writeEngagementSnapshot } = freshModule();
  // Replace the standing record with one that has NO "## Engagement Log" heading.
  const noHeading = `---
type: engagement
id: landing
surface: landing
window_days: 30
status: tracking
evidence-posthog: null
last-synced: null
---

# Landing engagement

Standing record with no log section.
`;
  fs.writeFileSync(path.join(root, "contract", "engagement", "landing.mdx"), noHeading, "utf8");
  const ev = { surface: "landing", period_days: 30, fetched_at: "2026-06-10", source: "live", unique_visitors: 10, pageviews: 12, install_copies: 1, install_persons: 1, install_conversion: 0.1, cta_clicks: { hero: 0, nav: 0 }, sections: [] };
  writeEngagementSnapshot("landing", ev, synthesizeEngagement(ev));
  const rec = readRecord();
  // The fallback branch appends the heading + entry.
  expect(rec).toMatch(/## Engagement Log/);
  expect(rec).toMatch(/### 2026-06-10 — synced \(live\)/);
  // Original prose is preserved.
  expect(rec).toMatch(/Standing record with no log section\./);
});

test("snapshot throws a path-bearing error when the record is missing", () => {
  const { writeEngagementSnapshot, synthesizeEngagement } = freshModule();
  const ev = { surface: "landing", period_days: 30, fetched_at: "2026-06-10", source: "live", unique_visitors: 1, pageviews: 1, install_copies: 0, install_persons: 0, install_conversion: 0, cta_clicks: { hero: 0, nav: 0 }, sections: [] };
  expect(() => writeEngagementSnapshot("does-not-exist", ev, synthesizeEngagement(ev)))
    .toThrow(/Engagement record not found:.*does-not-exist\.mdx/);
});

test("snapshot throws when the record frontmatter is unparseable", () => {
  const { writeEngagementSnapshot, synthesizeEngagement } = freshModule();
  // A body with no frontmatter delimiters → match fails → parse error.
  fs.writeFileSync(path.join(root, "contract", "engagement", "broken.mdx"), "no frontmatter here\n", "utf8");
  const ev = { surface: "landing", period_days: 30, fetched_at: "2026-06-10", source: "live", unique_visitors: 1, pageviews: 1, install_copies: 0, install_persons: 0, install_conversion: 0, cta_clicks: { hero: 0, nav: 0 }, sections: [] };
  expect(() => writeEngagementSnapshot("broken", ev, synthesizeEngagement(ev)))
    .toThrow(/Could not parse engagement frontmatter/);
});

test("appendEngagementAck throws a path-bearing error when the record is missing", () => {
  const { appendEngagementAck } = freshModule();
  expect(() => appendEngagementAck("ghost", { action: "acknowledged", note: null, by: "cli" }))
    .toThrow(/Engagement record not found:.*ghost\.mdx/);
});

test("appendEngagementAck trims trailing whitespace before appending (no blank gap)", () => {
  const { appendEngagementAck } = freshModule();
  // Give the record a noisy trailing blank-line block; the ack must sit on the
  // line immediately after the trimmed content, not after the blanks.
  const p = path.join(root, "contract", "engagement", "landing.mdx");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8") + "\n\n\n", "utf8");
  appendEngagementAck("landing", { action: "acknowledged", note: "tight", by: "cli" });
  const rec = readRecord();
  // trimEnd collapsed the trailing blank lines: the ack line follows the last
  // content line with a single newline, not the original 3+ blank run.
  expect(rec).toMatch(/[^\n]\n- \*\*\d{4}-\d{2}-\d{2}\*\* acknowledged — tight _\(cli\)_\n$/);
  expect(rec).not.toMatch(/\n\n\n+- \*\*/);
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
  expect(card.surface).toBe("landing");
  expect(card.metric).toBe("install conversion");
  // No credentials → zeroed funnel, so baseline conversion is null and sessions are 0.
  expect(card.baselineRate).toBeNull();
  expect(card.variantRate).toBeNull();
  expect(card.sessions).toBe(0);
  expect(card.confidenceLevel).toBe(0);
  // No creds → synthesis short-circuits to the configure-posthog recommendation.
  expect(card.proposal).toBe("configure-posthog");
  expect(card.context).toMatch(/No PostHog credentials set/);
  expect(card.hypothesis).toMatch(/Landing engagement — 0 visitors, 0 installs/);
  expect(card.status).toBe("pending");
  expect(card._posthogData.source).toBe("no-credentials");
  expect(readRecord()).toMatch(/### .* — synced \(no-credentials\)/);
});

test("engagement pull card carries live funnel field values", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [[1500, 1200, 80, 72, 3, 2]] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [["hero", 9]] }) });
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);
  const card = readQueue().cards[0];
  expect(card.sessions).toBe(1200);
  expect(card.baselineRate).toBeCloseTo(72 / 1200, 5);
  expect(card.confidenceLevel).toBe(0.8);
  expect(card.hypothesis).toMatch(/1200 visitors, 72 installs/);
  expect(card._posthogData.source).toBe("live");
});

test("engagement pull card singularises the hypothesis at exactly one visitor/install", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [[1, 1, 1, 1, 0, 0]] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);
  const card = readQueue().cards[0];
  // 1 visitor, 1 install → singular nouns (no trailing "s").
  expect(card.hypothesis).toBe("Landing engagement — 1 visitor, 1 install");
});

test("engagement pull --days passes through the dispatcher slice intact", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [[5, 5, 0, 0, 0, 0]] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });
  const { evidence } = freshModule();
  // Goes through engagement() → "pull" sub is sliced off → engagementPull(["--days","14"]).
  await evidence(["engagement", "pull", "--days", "14"]);
  expect(global.fetch.mock.calls[0][1].body).toMatch(/toIntervalDay\(14\)/);
  expect(readRecord()).toMatch(/window_days: 14/);
});

test("engagement (no 'pull' subword) still pulls and honours --days", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [[5, 5, 0, 0, 0, 0]] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });
  const { evidence } = freshModule();
  // Bare `engagement --days 5`: no "pull" subword, so args are NOT sliced — --days must still resolve.
  await evidence(["engagement", "--days", "5"]);
  expect(global.fetch.mock.calls[0][1].body).toMatch(/toIntervalDay\(5\)/);
  expect(readRecord()).toMatch(/window_days: 5/);
});

test("engagement pull honours --days when building the snapshot window", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  global.fetch
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [[5, 5, 0, 0, 0, 0]] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });
  const { evidence } = freshModule();
  await evidence(["engagement", "pull", "--days", "7"]);
  // The window must propagate into the HogQL interval and the written record.
  expect(global.fetch.mock.calls[0][1].body).toMatch(/toIntervalDay\(7\)/);
  expect(readRecord()).toMatch(/window_days: 7/);
});

test("engagement pull replaces a prior pending card (dedup)", async () => {
  delete process.env.POSTHOG_API_KEY;
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);
  await evidence(["engagement", "pull"]);
  const q = readQueue();
  expect(q.cards.filter(c => c.type === "engagement-snapshot" && c.status === "pending")).toHaveLength(1);
});

test("engagement pull keeps unrelated and resolved cards during dedup", async () => {
  delete process.env.POSTHOG_API_KEY;
  // Seed the queue with cards that must each be PRESERVED — only the same-record
  // pending snapshot should be evicted. This pins all three predicate clauses
  // (type, recordPath, status) of the dedup filter.
  const recordRel = path.join("contract", "engagement", "landing.mdx");
  fs.writeFileSync(
    path.join(root, ".systemix", "queue.json"),
    JSON.stringify({ cards: [
      // wrong type, same record, pending → kept (type clause)
      { id: "other-type", type: "hypothesis-validation", recordPath: recordRel, status: "pending" },
      // right type, same record, but already resolved → kept (status clause)
      { id: "old-approved", type: "engagement-snapshot", recordPath: recordRel, status: "approved" },
      // right type, DIFFERENT record, pending → kept (recordPath clause)
      { id: "other-record", type: "engagement-snapshot", recordPath: path.join("contract", "engagement", "pricing.mdx"), status: "pending" },
      // the only card that must be evicted: right type, same record, pending
      { id: "stale-pending", type: "engagement-snapshot", recordPath: recordRel, status: "pending" },
    ] }),
    "utf8",
  );
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);
  const cards = readQueue().cards;
  expect(cards.find(c => c.id === "other-type")).toBeTruthy();
  expect(cards.find(c => c.id === "old-approved")).toBeTruthy();
  expect(cards.find(c => c.id === "other-record")).toBeTruthy();
  // The stale same-record pending snapshot is gone, replaced by exactly one fresh one.
  expect(cards.find(c => c.id === "stale-pending")).toBeUndefined();
  expect(cards.filter(c => c.type === "engagement-snapshot" && c.recordPath === recordRel && c.status === "pending")).toHaveLength(1);
});

test("engagement pull tolerates a queue.json with no cards array", async () => {
  delete process.env.POSTHOG_API_KEY;
  // Existing queue object without a `cards` key → the `?? []` guard must apply,
  // not crash on .filter of undefined, and still write exactly one card.
  fs.writeFileSync(path.join(root, ".systemix", "queue.json"), JSON.stringify({ version: 1 }), "utf8");
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);
  const cards = readQueue().cards;
  expect(Array.isArray(cards)).toBe(true);
  expect(cards.filter(c => c.type === "engagement-snapshot")).toHaveLength(1);
});

test("engagement close tolerates a queue.json with no cards array", async () => {
  delete process.env.POSTHOG_API_KEY;
  const { evidence } = freshModule();
  fs.writeFileSync(path.join(root, ".systemix", "queue.json"), JSON.stringify({ version: 1 }), "utf8");
  // No pending card to resolve, but the ack must still be written without crashing.
  await evidence(["engagement", "close", "landing", "--note", "no card"]);
  expect(readRecord()).toMatch(/acknowledged — no card _\(cli\)_/);
});

test("engagement pull is a no-op when the record is missing", async () => {
  delete process.env.POSTHOG_API_KEY;
  fs.rmSync(path.join(root, "contract", "engagement", "landing.mdx"));
  const logs = [];
  jest.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);
  console.log.mockRestore();
  expect(logs.join("\n")).toMatch(/No engagement record at/);
  // No card written, no PostHog call.
  expect(readQueue().cards).toHaveLength(0);
  expect(global.fetch).not.toHaveBeenCalled();
});

// ── engagement close (acknowledge) ────────────────────────────────────────────

test("engagement close acknowledges the snapshot + resolves the card", async () => {
  delete process.env.POSTHOG_API_KEY;
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);

  // Seed decoys around the real pending card so close() must match all three
  // predicate clauses (type, recordPath, status) to resolve the right one.
  const recordRel = path.join("contract", "engagement", "landing.mdx");
  const q = readQueue();
  q.cards.unshift(
    { id: "wrong-type", type: "hypothesis-validation", recordPath: recordRel, status: "pending" },
    { id: "wrong-record", type: "engagement-snapshot", recordPath: path.join("contract", "engagement", "pricing.mdx"), status: "pending" },
    { id: "already-done", type: "engagement-snapshot", recordPath: recordRel, status: "approved" },
  );
  fs.writeFileSync(path.join(root, ".systemix", "queue.json"), JSON.stringify(q), "utf8");

  await evidence(["engagement", "close", "landing", "--note", "looks fine"]);

  const rec = readRecord();
  expect(rec).toMatch(/acknowledged — looks fine _\(cli\)_/);
  // The ack line is dated and uses the bold-date format.
  expect(rec).toMatch(/- \*\*\d{4}-\d{2}-\d{2}\*\* acknowledged — looks fine _\(cli\)_/);

  const cards = readQueue().cards;
  // Decoys are untouched; only the matching pending snapshot is resolved.
  expect(cards.find(c => c.id === "wrong-type").status).toBe("pending");
  expect(cards.find(c => c.id === "wrong-record").status).toBe("pending");
  expect(cards.find(c => c.id === "already-done").status).toBe("approved");
  expect(cards.find(c => c.id === "already-done").resolution).toBeUndefined();

  const card = cards.find(c => c.type === "engagement-snapshot" && c.status === "approved" && c.recordPath === recordRel && c.id !== "already-done");
  expect(card).toBeTruthy();
  expect(card.resolution.action).toBe("acknowledged");
  expect(card.resolution.resolvedBy).toBe("cli");
  expect(card.resolution.note).toBe("looks fine");
});

test("engagement close without a note omits the em-dash note segment", async () => {
  delete process.env.POSTHOG_API_KEY;
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);
  await evidence(["engagement", "close", "landing"]);
  const rec = readRecord();
  // "acknowledged" then straight to the author tag — no " — " note.
  expect(rec).toMatch(/acknowledged _\(cli\)_/);
  expect(rec).not.toMatch(/acknowledged — /);
  const card = readQueue().cards.find(c => c.type === "engagement-snapshot");
  expect(card.resolution.note).toBeNull();
});

test("engagement close defaults the record id to 'landing'", async () => {
  delete process.env.POSTHOG_API_KEY;
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);
  // Only a flag (no positional id, no note value) → the default record id 'landing' is used.
  await evidence(["engagement", "close", "--flag"]);
  // The landing record received the ack — proving the default kicked in.
  expect(readRecord()).toMatch(/flagged-for-experiment _\(cli\)_/);
  const card = readQueue().cards.find(c => c.type === "engagement-snapshot");
  expect(card.status).toBe("approved");
});

test("engagement close targets an explicit positional record id", async () => {
  delete process.env.POSTHOG_API_KEY;
  // A second engagement record; close must resolve THIS one, not the 'landing' default.
  const pricing = `---
type: engagement
id: pricing
surface: pricing
window_days: 30
status: tracking
evidence-posthog: null
last-synced: null
---

# Pricing engagement

Standing record.

## Engagement Log

_No snapshots yet._
`;
  fs.writeFileSync(path.join(root, "contract", "engagement", "pricing.mdx"), pricing, "utf8");
  const { evidence } = freshModule();
  await evidence(["engagement", "close", "pricing", "--note", "pricing ack"]);
  // The pricing record got the ack; landing is untouched.
  const pricingRec = fs.readFileSync(path.join(root, "contract", "engagement", "pricing.mdx"), "utf8");
  expect(pricingRec).toMatch(/acknowledged — pricing ack _\(cli\)_/);
  expect(readRecord()).not.toMatch(/acknowledged/);
});

test("engagement close --flag records flagged-for-experiment", async () => {
  delete process.env.POSTHOG_API_KEY;
  const { evidence } = freshModule();
  await evidence(["engagement", "pull"]);
  await evidence(["engagement", "close", "--flag"]);
  expect(readRecord()).toMatch(/flagged-for-experiment _\(cli\)_/);
  const card = readQueue().cards.find(c => c.type === "engagement-snapshot");
  expect(card.resolution.action).toBe("flagged-for-experiment");
});

test("engagement close is a no-op when the record is missing", async () => {
  delete process.env.POSTHOG_API_KEY;
  fs.rmSync(path.join(root, "contract", "engagement", "landing.mdx"));
  const logs = [];
  jest.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
  const { evidence } = freshModule();
  await evidence(["engagement", "close", "landing"]);
  console.log.mockRestore();
  expect(logs.join("\n")).toMatch(/No engagement record: landing/);
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
  expect(out).toMatch(/POSTHOG_PROJECT_ID.*missing/);
  // The "set both vars" hint is printed; no ping fired.
  expect(out).toMatch(/Set POSTHOG_API_KEY \+ POSTHOG_PROJECT_ID/);
  expect(global.fetch).not.toHaveBeenCalled();
});

test("check still bails when only one credential is present", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  delete process.env.POSTHOG_PROJECT_ID;
  const logs = [];
  jest.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
  const { evidence } = freshModule();
  await evidence(["check"]);
  console.log.mockRestore();
  // Missing project id alone is enough to short-circuit before any network call.
  expect(global.fetch).not.toHaveBeenCalled();
  expect(logs.join("\n")).toMatch(/Set POSTHOG_API_KEY \+ POSTHOG_PROJECT_ID/);
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
  const out = logs.join("\n");
  expect(global.fetch).toHaveBeenCalledWith(
    "https://eu.posthog.com/api/projects/123/query",
    expect.objectContaining({ method: "POST" }),
  );
  // Count extracted from rows[0][0]; > 0 → "connected" + capture-live message.
  expect(out).toMatch(/42 \$pageview/);
  expect(out).toMatch(/✓ connected/);
  expect(out).toMatch(/Capture is live/);
});

test("check reports zero pageviews distinctly from a positive count", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [[0]] }) });
  const logs = [];
  jest.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
  const { evidence } = freshModule();
  await evidence(["check"]);
  console.log.mockRestore();
  const out = logs.join("\n");
  expect(out).toMatch(/0 \$pageview/);
  // count === 0 → the "no pageviews yet" branch, NOT the capture-live branch.
  expect(out).toMatch(/no pageviews yet/);
  expect(out).not.toMatch(/Capture is live/);
});

test("check defaults the count to 0 when results are empty", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [] }) });
  const logs = [];
  jest.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
  const { evidence } = freshModule();
  await evidence(["check"]);
  console.log.mockRestore();
  const out = logs.join("\n");
  // rows[0]?.[0] ?? 0 → 0, and the no-pageviews branch.
  expect(out).toMatch(/0 \$pageview/);
  expect(out).toMatch(/no pageviews yet/);
});

test("check reports an HTTP error without claiming connection", async () => {
  process.env.POSTHOG_API_KEY = "phx_test";
  process.env.POSTHOG_PROJECT_ID = "123";
  process.env.POSTHOG_HOST = "https://eu.posthog.com";
  global.fetch.mockResolvedValueOnce({ ok: false, status: 401 });
  const logs = [];
  jest.spyOn(console, "log").mockImplementation((...a) => logs.push(a.join(" ")));
  const { evidence } = freshModule();
  await evidence(["check"]);
  console.log.mockRestore();
  const out = logs.join("\n");
  // !resp.ok branch: HTTP status surfaced, connection-failed hint, no "connected".
  expect(out).toMatch(/HTTP 401/);
  expect(out).toMatch(/Connection failed/);
  expect(out).not.toMatch(/✓ connected/);
});
