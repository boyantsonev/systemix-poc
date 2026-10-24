import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const FIXTURE = path.join(process.cwd(), "packages/cli/tests/acceptance/skills/fixtures/systemix-poc-986a92fca0cb.counters.json");
// the committed fixture drops counter definitions to stay small; a real `audit counters` file has them
const counters = () => {
  const c = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  delete c.fixture;
  for (const k of c.counters) k.definition ??= { summary: "fixture", regex: null, fileSet: "fixture" };
  return c;
};
const post = (body: unknown) =>
  POST(new Request("http://x/api/report", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

const lsResponse = (json: unknown, status = 200) => new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } });
const validKey = { valid: true, license_key: { status: "active", activation_limit: 3, activation_usage: 0 }, meta: { store_id: 11, product_id: 22 } };

describe("POST /api/report", () => {
  beforeEach(() => vi.unstubAllEnvs());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is closed (503) unless an access mode is configured", async () => {
    const res = await post({ counters: counters() });
    expect(res.status).toBe(503);
  });

  it("in open mode returns the deterministic quick report", async () => {
    vi.stubEnv("SYSTEMIX_REPORT_ACCESS", "open");
    const res = await post({ counters: counters() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scored).toBe(true);
    expect(body.overall).toBe(53);
    expect(body.markdown).toContain("# Quick design-system report");
    expect(body.markdown).toContain("## Recommendations, in this order");
    const again = await (await post({ counters: counters() })).json();
    expect(again.markdown).toBe(body.markdown);
  });

  it("rejects bodies that are not a valid counters report", async () => {
    vi.stubEnv("SYSTEMIX_REPORT_ACCESS", "open");
    expect((await post("not json")).status).toBe(400);
    expect((await post({ nothing: true })).status).toBe(400);
    expect((await post({ counters: { schema: "other" } })).status).toBe(400);
  });

  it("refuses an oversized body", async () => {
    vi.stubEnv("SYSTEMIX_REPORT_ACCESS", "open");
    expect((await post("x".repeat(3_000_001))).status).toBe(413);
  });

  describe("lemonsqueezy mode", () => {
    beforeEach(() => {
      vi.stubEnv("SYSTEMIX_REPORT_ACCESS", "lemonsqueezy");
      vi.stubEnv("LEMONSQUEEZY_STORE_ID", "11");
      vi.stubEnv("LEMONSQUEEZY_PRODUCT_ID", "22");
    });

    it("needs a key", async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      expect((await post({ counters: counters() })).status).toBe(402);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("validates, builds, then uses one activation", async () => {
      const fetchMock = vi.fn(async (url: string) => (String(url).endsWith("/validate") ? lsResponse(validKey) : lsResponse({ activated: true })));
      vi.stubGlobal("fetch", fetchMock);
      const res = await post({ counters: counters(), licenseKey: "ABCD-1234-EFGH" });
      expect(res.status).toBe(200);
      expect(fetchMock.mock.calls.map((c) => String(c[0]).split("/").pop())).toEqual(["validate", "activate"]);
    });

    it("refuses a key from another store or product without using an activation", async () => {
      const fetchMock = vi.fn(async () => lsResponse({ ...validKey, meta: { store_id: 99, product_id: 22 } }));
      vi.stubGlobal("fetch", fetchMock);
      expect((await post({ counters: counters(), licenseKey: "ABCD-1234-EFGH" })).status).toBe(403);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("refuses an invalid or used-up key", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => lsResponse({ valid: false, error: "license_key not found" }, 404)));
      expect((await post({ counters: counters(), licenseKey: "ABCD-1234-EFGH" })).status).toBe(403);
      vi.stubGlobal("fetch", vi.fn(async () => lsResponse({ ...validKey, license_key: { status: "active", activation_limit: 1, activation_usage: 1 } })));
      expect((await post({ counters: counters(), licenseKey: "ABCD-1234-EFGH" })).status).toBe(402);
    });

    it("is closed when the store or product id is missing", async () => {
      vi.stubEnv("LEMONSQUEEZY_PRODUCT_ID", "");
      vi.stubGlobal("fetch", vi.fn());
      expect((await post({ counters: counters(), licenseKey: "ABCD-1234-EFGH" })).status).toBe(503);
    });
  });
});
