import { describe, it, expect } from "vitest";
import { rejectNonLocal } from "./local-request";

function req(headers: Record<string, string>, url = "http://localhost:3001/api/x") {
  return new Request(url, { method: "POST", headers, body: "{}" });
}

const JSON_TYPE = { "content-type": "application/json" };

describe("rejectNonLocal", () => {
  it.each([
    ["same-origin browser fetch", { ...JSON_TYPE, origin: "http://localhost:3001", "sec-fetch-site": "same-origin" }],
    ["127.0.0.1", { ...JSON_TYPE, host: "127.0.0.1:3001", origin: "http://127.0.0.1:3001" }],
    ["IPv6 loopback", { ...JSON_TYPE, host: "[::1]:3001", origin: "http://[::1]:3001" }],
    ["a charset parameter", { "content-type": "application/json; charset=utf-8", origin: "http://localhost:3001" }],
    ["curl / scripts (no Origin)", { ...JSON_TYPE }],
  ])("lets through %s", (_label, headers) => {
    expect(rejectNonLocal(req(headers))).toBeNull();
  });

  it.each([
    ["a foreign Origin", { ...JSON_TYPE, origin: "https://evil.example" }, 403],
    ["another localhost port", { ...JSON_TYPE, origin: "http://localhost:8080" }, 403],
    ["the opaque `null` Origin", { ...JSON_TYPE, origin: "null" }, 403],
    ["Sec-Fetch-Site: cross-site", { ...JSON_TYPE, "sec-fetch-site": "cross-site" }, 403],
    ["Sec-Fetch-Site: same-site", { ...JSON_TYPE, "sec-fetch-site": "same-site" }, 403],
    ["a non-loopback Host (DNS rebinding)", { ...JSON_TYPE, host: "rebound.example:3001", origin: "http://rebound.example:3001" }, 403],
    ["text/plain", { "content-type": "text/plain", origin: "http://localhost:3001" }, 415],
    ["a form post", { "content-type": "application/x-www-form-urlencoded" }, 415],
    ["no Content-Type", {}, 415],
  ])("rejects %s", (_label, headers, status) => {
    expect(rejectNonLocal(req(headers))?.status).toBe(status);
  });

  it("skips the JSON requirement only when asked (bodiless DELETE)", () => {
    expect(rejectNonLocal(req({ origin: "http://localhost:3001" }), { json: false })).toBeNull();
    expect(rejectNonLocal(req({ origin: "https://evil.example" }), { json: false })?.status).toBe(403);
  });
});
