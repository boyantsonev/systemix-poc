import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseInstanceConfig,
  applyConfigPatch,
  serializeInstanceConfig,
  type InstanceConfig,
} from "./instance-config";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const realConfigYaml = () =>
  readFileSync(path.join(REPO_ROOT, "systemix.config.yaml"), "utf8");

// PR #48 added extra scalar keys to signals (posthog region/host/ingest_host).
// The serializer used to write only enabled/poll_interval_sec, so one "Save
// config" from the UI silently stripped them. This gate proves the round-trip:
// parse → patch (a normal UI save) → serialize → re-parse → keys survive.
const YAML = `version: 1
surfaces:
  - design-system
  - landing
signals:
  posthog:
    enabled: true
    poll_interval_sec: 300
    region: eu
    host: https://eu.posthog.com
    ingest_host: https://eu.i.posthog.com
  vercel:
    enabled: true
hermes:
  model: hermes3
  endpoint: http://localhost:11434
  autonomy: balanced
  thresholds:
    high: 0.85
    medium: 0.55
self_improvement:
  mode: audit
  audit_window_days: 90
trust:
  orchestrator_tier: 0
  hermes_tier: 0
`;

describe("instance-config signal round-trip", () => {
  it("a UI save preserves extra scalar signal keys (posthog region/host)", () => {
    const base = parseInstanceConfig(YAML) as unknown as InstanceConfig;

    // Simulate a normal UI save: toggle one signal, keep everything else.
    const patched = applyConfigPatch(base, {
      signals: { vercel: { enabled: false } },
    });
    const reparsed = parseInstanceConfig(
      serializeInstanceConfig(patched),
    ) as unknown as InstanceConfig;

    expect(reparsed.signals.posthog.enabled).toBe(true);
    expect(reparsed.signals.posthog.poll_interval_sec).toBe(300);
    expect(reparsed.signals.posthog.region).toBe("eu");
    expect(reparsed.signals.posthog.host).toBe("https://eu.posthog.com");
    expect(reparsed.signals.posthog.ingest_host).toBe("https://eu.i.posthog.com");
    expect(reparsed.signals.vercel.enabled).toBe(false);
  });
});

// serializeInstanceConfig used to emit only the 6 known top-level sections, so a
// "Save config" silently DROPPED the whole `atlas:` block (personas/agents/surfaces)
// that `npx systemix atlas build` and the /atlas surface depend on. Same footgun
// class as the signal-keys bug above (PR #53), but for an entire top-level block.
// Gate: parse the real config → patch (normal UI save) → serialize → re-parse →
// the atlas vocabulary survives intact.
describe("instance-config atlas round-trip", () => {
  it("a UI save preserves the top-level atlas: block (personas/agents/surfaces)", () => {
    const base = parseInstanceConfig(realConfigYaml()) as unknown as InstanceConfig;

    // Guard the guard: the real config must actually carry an atlas block, else
    // this test would pass vacuously.
    expect(base.atlas?.personas).toEqual(["founder", "designer", "engineer"]);
    expect(Object.keys(base.atlas?.agents ?? {})).toContain("hermes");
    expect(base.atlas?.surfaces).toEqual(["phone", "tablet", "desktop"]);

    // Simulate a normal Config-layer save: toggle one signal, touch nothing else.
    const patched = applyConfigPatch(base, { signals: { social: { enabled: true } } });
    const reparsed = parseInstanceConfig(
      serializeInstanceConfig(patched),
    ) as unknown as InstanceConfig;

    // The whole atlas vocabulary survives the round-trip, structure-for-structure.
    expect(reparsed.atlas).toEqual(base.atlas);
    expect(reparsed.atlas?.personas).toEqual(base.atlas?.personas);
    expect(reparsed.atlas?.agents).toEqual(base.atlas?.agents);
    expect(reparsed.atlas?.surfaces).toEqual(base.atlas?.surfaces);

    // ...and the actual edit landed.
    expect(reparsed.signals.social.enabled).toBe(true);
  });

  it("a signal-only save leaves self_improvement.mode untouched (audit stays audit)", () => {
    const base = parseInstanceConfig(realConfigYaml()) as unknown as InstanceConfig;
    expect(base.self_improvement.mode).toBe("audit");

    // Patch omits self_improvement entirely — mode must NOT default/flip to active.
    const patched = applyConfigPatch(base, { signals: { social: { enabled: true } } });
    expect(patched.self_improvement.mode).toBe("audit");

    const reparsed = parseInstanceConfig(
      serializeInstanceConfig(patched),
    ) as unknown as InstanceConfig;
    expect(reparsed.self_improvement.mode).toBe("audit");
  });
});
