import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { POST } from "./route";

// loadInstanceConfig/writeInstanceConfig resolve process.cwd() per call, so a
// chdir into a fresh workspace isolates each test. Real fs, no mocks.
const prevCwd = process.cwd();
let tmp: string;
let log: ReturnType<typeof vi.spyOn>;

function config(autonomy: string, hermesTier: number, orchestratorTier = 0) {
  return [
    "version: 1",
    "surfaces:",
    "  - landing",
    "signals:",
    "  posthog:",
    "    enabled: false",
    "hermes:",
    "  engine: claude-code",
    `  autonomy: ${autonomy}`,
    "  thresholds:",
    "    high: 0.85",
    "    medium: 0.55",
    "self_improvement:",
    "  mode: audit",
    "trust:",
    `  orchestrator_tier: ${orchestratorTier}`,
    `  hermes_tier: ${hermesTier}`,
    "",
  ].join("\n");
}

const readConfig = () => fs.readFileSync(path.join(tmp, "systemix.config.yaml"), "utf8");

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost:3001/api/config", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3001", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const raise = (autonomy: string, tier: number, extra: Record<string, unknown> = {}) => ({
  hermes: { autonomy },
  trust: { hermes_tier: tier, orchestrator_tier: 0 },
  ...extra,
});

/** The code the route printed to the terminal for the latest raise request. */
function printedCode(): string {
  const lines = log.mock.calls.map((c) => String(c[0]));
  const m = /enter ([A-Z0-9]{4}-[A-Z0-9]{4})/.exec(lines.join("\n").split("[systemix] Confirm").pop() ?? "");
  if (!m) throw new Error(`no code printed: ${lines.join(" | ")}`);
  return m[1];
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "config-route-"));
  fs.writeFileSync(path.join(tmp, "systemix.config.yaml"), config("ghost", 0), "utf8");
  process.chdir(tmp);
  log = vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  log.mockRestore();
  process.chdir(prevCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("POST /api/config — local-only", () => {
  it("rejects a cross-site text/plain POST that tries to raise autonomy", async () => {
    const before = readConfig();
    const res = await post(JSON.stringify(raise("autonomous", 2)), { "content-type": "text/plain" });
    expect(res.status).toBe(415);
    expect(readConfig()).toBe(before);
  });

  it("rejects a cross-origin JSON POST", async () => {
    const before = readConfig();
    const res = await post({ signals: { posthog: { enabled: true } } }, { origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect(readConfig()).toBe(before);
  });

  it("applies a same-origin edit that doesn't raise autonomy (control)", async () => {
    const res = await post({ signals: { posthog: { enabled: true } } });
    expect(res.status).toBe(200);
    expect(readConfig()).toMatch(/posthog:\n {4}enabled: true/);
  });
});

describe("POST /api/config — raising autonomy is a human decision", () => {
  it("refuses a raise without a code and prints a one-time code to the terminal", async () => {
    const before = readConfig();
    const res = await post(raise("assisted", 1));
    expect(res.status).toBe(403);
    expect((await res.json()).needsConfirmation).toBe(true);
    expect(readConfig()).toBe(before);
    expect(printedCode()).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("applies the raise with the printed code — once", async () => {
    await post(raise("assisted", 1));
    const code = printedCode();

    const ok = await post(raise("assisted", 1, { confirmCode: code }));
    expect(ok.status).toBe(200);
    expect(readConfig()).toContain("  autonomy: assisted");
    expect(readConfig()).toContain("  hermes_tier: 1");

    const replay = await post(raise("autonomous", 2, { confirmCode: code }));
    expect(replay.status).toBe(403);
    expect(readConfig()).toContain("  hermes_tier: 1");
  });

  it("refuses a wrong code", async () => {
    await post(raise("autonomous", 2));
    const before = readConfig();
    const res = await post(raise("autonomous", 2, { confirmCode: "WRNG-CODE" }));
    expect(res.status).toBe(403);
    expect(readConfig()).toBe(before);
  });

  it("binds the code to the exact raise it was printed for", async () => {
    await post(raise("assisted", 1));
    const code = printedCode();
    const res = await post(raise("autonomous", 2, { confirmCode: code }));
    expect(res.status).toBe(403);
    expect(readConfig()).toContain("  hermes_tier: 0");
  });

  it("treats a higher orchestrator tier as a raise too", async () => {
    const res = await post({ trust: { hermes_tier: 0, orchestrator_tier: 3 } });
    expect(res.status).toBe(403);
    expect(readConfig()).toContain("  orchestrator_tier: 0");
  });

  it("lets autonomy be lowered without a code", async () => {
    fs.writeFileSync(path.join(tmp, "systemix.config.yaml"), config("autonomous", 2, 2), "utf8");
    const res = await post({ hermes: { autonomy: "ghost" }, trust: { hermes_tier: 0, orchestrator_tier: 0 } });
    expect(res.status).toBe(200);
    expect(readConfig()).toContain("  autonomy: ghost");
    expect(readConfig()).toContain("  hermes_tier: 0");
  });
});
