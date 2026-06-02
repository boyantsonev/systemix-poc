"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { parseSimpleYaml, loadConfig, validateConfig } = require("../src/config");

const SAMPLE = `# systemix.config.yaml — your instance topology. Committed; contains NO secrets.
version: 1
surfaces:
  - design-system
  - landing
  - onboarding
signals:
  posthog:
    enabled: true
    poll_interval_sec: 300
  vercel:
    enabled: true
  figma:
    enabled: true
  social:
    enabled: false
hermes:
  model: hermes3
  endpoint: http://localhost:11434
  autonomy: balanced
  thresholds:
    high: 0.85
    medium: 0.55
self_improvement:
  mode: audit
  meta_contract: contract/meta/hermes-accuracy.mdx
  audit_window_days: 90
trust:
  orchestrator_tier: 0   # Ghost Mode at init
  hermes_tier: 0
`;

describe("parseSimpleYaml", () => {
  const cfg = parseSimpleYaml(SAMPLE);

  test("parses scalar sequence", () => {
    expect(cfg.surfaces).toEqual(["design-system", "landing", "onboarding"]);
  });

  test("parses nested maps + booleans + numbers", () => {
    expect(cfg.signals.posthog.enabled).toBe(true);
    expect(cfg.signals.posthog.poll_interval_sec).toBe(300);
    expect(cfg.signals.social.enabled).toBe(false);
  });

  test("parses floats", () => {
    expect(cfg.hermes.thresholds.high).toBeCloseTo(0.85);
    expect(cfg.hermes.thresholds.medium).toBeCloseTo(0.55);
  });

  test("strips inline comments", () => {
    expect(cfg.trust.orchestrator_tier).toBe(0);
    expect(cfg.hermes.endpoint).toBe("http://localhost:11434");
  });
});

describe("validateConfig", () => {
  test("accepts a complete config", () => {
    expect(() => validateConfig(parseSimpleYaml(SAMPLE))).not.toThrow();
  });

  test("rejects a config missing required keys", () => {
    expect(() => validateConfig({ version: 1 })).toThrow(/missing required key/);
  });
});

describe("loadConfig", () => {
  test("loads + validates from disk", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sx-config-"));
    fs.writeFileSync(path.join(dir, "systemix.config.yaml"), SAMPLE);
    const cfg = loadConfig(dir);
    expect(cfg.version).toBe(1);
    expect(cfg.self_improvement.mode).toBe("audit");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test("throws a helpful error when not initialised", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sx-config-"));
    expect(() => loadConfig(dir)).toThrow(/systemix init/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
