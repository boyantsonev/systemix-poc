"use strict";

const { cli, tmpRepo } = require("./helpers/cli");

const CONFIG = { source: "posthog", hostEnv: "ANALYTICS_HOST", keyEnv: "ANALYTICS_READ_KEY", projectEnv: "ANALYTICS_PROJECT" };
const withConfig = (cfg = CONFIG) => tmpRepo({ "design/.studio/analytics.json": typeof cfg === "string" ? cfg : JSON.stringify(cfg) });
const ENV = { ANALYTICS_HOST: "https://analytics.example.com", ANALYTICS_READ_KEY: "secret-value-123", ANALYTICS_PROJECT: "42" };

describe("evidence check", () => {
  let fetchSpy;
  beforeEach(() => {
    fetchSpy = typeof global.fetch === "function" ? jest.spyOn(global, "fetch").mockImplementation(() => Promise.reject(new Error("no network"))) : null;
  });
  afterEach(() => fetchSpy && fetchSpy.mockRestore());

  test("env vars missing: exit 1, a clear message naming each variable, no value and no network", async () => {
    const root = withConfig();
    const r = await cli(["evidence", "check", "--json"], { root, env: { ANALYTICS_HOST: "https://analytics.example.com" } });
    expect(r.code).toBe(1);
    expect(r.json.connected).toBe(false);
    expect(r.json.source).toBe("posthog");
    expect(r.json.problems).toHaveLength(2);
    expect(r.json.problems[0]).toMatch(/^ANALYTICS_READ_KEY is not set \(keyEnv/);
    expect(r.json.problems[1]).toMatch(/^ANALYTICS_PROJECT is not set \(projectEnv/);
    expect(r.stdout).not.toContain("analytics.example.com");
    if (fetchSpy) expect(fetchSpy).not.toHaveBeenCalled();

    const text = await cli(["evidence", "check"], { root, env: {} });
    expect(text.code).toBe(1);
    expect(text.stderr).toMatch(/not connected/);
    expect(text.stderr).toMatch(/ANALYTICS_HOST is not set/);
  });

  test("all set: connected, exit 0, and values never printed", async () => {
    const root = withConfig();
    const r = await cli(["evidence", "check", "--json"], { root, env: ENV });
    expect(r.code).toBe(0);
    expect(r.json).toEqual({ connected: true, source: "posthog", config: "design/.studio/analytics.json", problems: [] });
    expect(r.stdout).not.toContain("secret-value-123");
    const text = await cli(["evidence", "check"], { root, env: ENV });
    expect(text.code).toBe(0);
    expect(text.stdout).toMatch(/connected/);
    if (fetchSpy) expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("an empty variable counts as missing", async () => {
    const r = await cli(["evidence", "check", "--json"], { root: withConfig(), env: { ...ENV, ANALYTICS_READ_KEY: "  " } });
    expect(r.code).toBe(1);
    expect(r.json.problems).toEqual([expect.stringMatching(/^ANALYTICS_READ_KEY is not set/)]);
  });

  test("no config is not connected, with a pointer", async () => {
    const r = await cli(["evidence", "check", "--json"], { root: tmpRepo(), env: ENV });
    expect(r.code).toBe(1);
    expect(r.json.connected).toBe(false);
    expect(r.json.source).toBe(null);
    expect(r.json.problems[0]).toMatch(/no design\/\.studio\/analytics\.json/);
  });

  test("a bad config: invalid JSON, a value instead of a name, an unknown source or field", async () => {
    let r = await cli(["evidence", "check", "--json"], { root: withConfig("{nope"), env: ENV });
    expect(r.code).toBe(1);
    expect(r.json.problems).toEqual(["design/.studio/analytics.json is not valid JSON"]);
    r = await cli(["evidence", "check", "--json"], { root: withConfig({ ...CONFIG, source: "mystery", keyEnv: "phc_abc-123", apiKey: "x" }), env: ENV });
    expect(r.code).toBe(1);
    expect(r.json.problems).toHaveLength(3);
    expect(r.json.problems.join("\n")).toMatch(/source is posthog or other/);
    expect(r.json.problems.join("\n")).toMatch(/unknown field apiKey/);
    expect(r.json.problems.join("\n")).toMatch(/keyEnv must be an env var name/);
    expect(r.stdout).not.toContain("phc_abc-123");
  });

  test("usage errors are exit 2", async () => {
    expect((await cli(["evidence", "pull"], { root: tmpRepo() })).code).toBe(2);
    expect((await cli(["evidence", "check", "--nope"], { root: tmpRepo() })).code).toBe(2);
  });
});
