import { describe, it, expect } from "vitest";
import {
  parseInstanceConfig,
  applyConfigPatch,
  serializeInstanceConfig,
  type InstanceConfig,
} from "./instance-config";

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
