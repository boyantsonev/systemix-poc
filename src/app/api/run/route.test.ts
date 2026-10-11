import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// spawn is mocked: these tests must never start a real process.
const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return { ...actual, default: { ...actual, spawn: spawnMock }, spawn: spawnMock };
});

// RUNS_DIR binds to process.cwd() at import, so each test chdirs into a fresh
// workspace (with the node_modules/next marker the route's preflight checks)
// and re-imports the route.
const prevCwd = process.cwd();
let tmp: string;

function seedTier(tier: number) {
  fs.writeFileSync(
    path.join(tmp, "systemix.config.yaml"),
    `version: 1\nhermes:\n  autonomy: ghost\ntrust:\n  orchestrator_tier: 0\n  hermes_tier: ${tier}\n`,
    "utf8",
  );
}

function runReq(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3001/api/run", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3001", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "run-route-"));
  fs.mkdirSync(path.join(tmp, "node_modules", "next"), { recursive: true });
  seedTier(0);
  process.chdir(tmp);
  vi.resetModules();
  spawnMock.mockReset();
  spawnMock.mockImplementation(() =>
    Object.assign(new EventEmitter(), { pid: 4242, stdout: new EventEmitter(), stderr: new EventEmitter() }),
  );
});

afterEach(() => {
  process.chdir(prevCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("POST /api/run — local-only", () => {
  it("starts an allowlisted skill for a same-origin JSON request (control)", async () => {
    const { POST } = await import("./route");
    const res = await POST(runReq({ skill: "build" }));
    expect(res.status).toBe(202);
    expect(spawnMock).toHaveBeenCalledWith("npm", ["run", "build"], expect.anything());
  });

  it("rejects a cross-origin POST without starting anything or granting CORS", async () => {
    const { POST } = await import("./route");
    const res = await POST(runReq({ skill: "build" }, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("rejects a text/plain body (the shape a cross-site form/fetch can send)", async () => {
    const { POST } = await import("./route");
    const res = await POST(runReq('{"skill":"build"}', { "content-type": "text/plain" }));
    expect(res.status).toBe(415);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("rejects a request addressed to a non-loopback host", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://rebound.example:3001/api/run", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://rebound.example:3001" },
        body: JSON.stringify({ skill: "build" }),
      }),
    );
    expect(res.status).toBe(403);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("offers no CORS preflight", async () => {
    const mod = await import("./route");
    expect("OPTIONS" in mod).toBe(false);
  });
});

describe("POST /api/run — what may run", () => {
  it("has no production deploy in the runnable allowlist", async () => {
    seedTier(2);
    const { POST } = await import("./route");
    const res = await POST(runReq({ skill: "deploy" }));
    expect(res.status).toBe(404);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("does not resolve inherited object keys as skills", async () => {
    const { POST } = await import("./route");
    const res = await POST(runReq({ skill: "constructor" }));
    expect(res.status).toBe(404);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("enforces a skill's minimum autonomy tier server-side", async () => {
    const { SKILL_MAP } = await import("@/lib/skill-map");
    SKILL_MAP["gated-test"] = {
      label: "Gated",
      command: "node",
      args: ["-e", "0"],
      description: "test-only gated skill",
      minTier: 1,
    };
    try {
      const { POST } = await import("./route");
      const atGhost = await POST(runReq({ skill: "gated-test" }));
      expect(atGhost.status).toBe(403);
      expect(spawnMock).not.toHaveBeenCalled();

      seedTier(1);
      const atAssisted = await POST(runReq({ skill: "gated-test" }));
      expect(atAssisted.status).toBe(202);
      expect(spawnMock).toHaveBeenCalledTimes(1);
    } finally {
      delete SKILL_MAP["gated-test"];
    }
  });
});

describe("run readers — no wildcard CORS", () => {
  it.each([
    ["/api/runs", () => import("../runs/route")],
    ["/api/run/[id]", () => import("./[id]/route")],
    ["/api/run/[id]/stream", () => import("./[id]/stream/route")],
  ])("%s exports no OPTIONS and sends no Access-Control-Allow-Origin", async (_name, load) => {
    const mod = (await load()) as Record<string, unknown> & {
      GET: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
    };
    expect("OPTIONS" in mod).toBe(false);
    const res = await mod.GET(new Request("http://localhost:3001/x"), {
      params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }),
    });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
