import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Every local route that writes the repo, resolves a decision or runs something
// refuses cross-origin and text/plain requests before touching anything. Runs in
// an empty workspace so a missed guard can't write into the real repo.
type Handler = (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

const ROUTES: Array<[string, string, () => Promise<Record<string, unknown>>, boolean?]> = [
  ["POST", "/api/run", () => import("./run/route")],
  ["POST", "/api/config", () => import("./config/route")],
  ["PATCH", "/api/queue", () => import("./queue/route")],
  ["POST", "/api/hitl", () => import("./hitl/route")],
  ["POST", "/api/hermes/run", () => import("./hermes/run/route")],
  ["POST", "/api/bundle", () => import("./bundle/route")],
  ["POST", "/api/workflows", () => import("./workflows/route")],
  ["POST", "/api/workflows/save", () => import("./workflows/save/route")],
  ["PUT", "/api/workflows/[id]", () => import("./workflows/[id]/route")],
  ["DELETE", "/api/workflows/[id]", () => import("./workflows/[id]/route"), false],
  ["POST", "/api/workflows/[id]/run", () => import("./workflows/[id]/run/route")],
];

const prevCwd = process.cwd();
let tmp: string;
beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "local-routes-"));
  process.chdir(tmp);
  vi.resetModules();
});
afterAll(() => {
  process.chdir(prevCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function call(method: string, load: () => Promise<Record<string, unknown>>, headers: Record<string, string>) {
  const handler = (await load())[method] as Handler;
  const body = method === "DELETE" ? undefined : JSON.stringify({ id: "x", action: "approved", skill: "build" });
  return handler(new Request("http://localhost:3001/api/x", { method, headers, body }), {
    params: Promise.resolve({ id: "x" }),
  });
}

describe("local API routes", () => {
  it.each(ROUTES)("%s %s rejects a cross-origin request", async (method, _path, load) => {
    const res = await call(method, load, { "content-type": "application/json", origin: "https://evil.example" });
    expect(res.status).toBe(403);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it.each(ROUTES.filter(([, , , json]) => json !== false))(
    "%s %s rejects a text/plain body",
    async (method, _path, load) => {
      const res = await call(method, load, { "content-type": "text/plain", origin: "http://localhost:3001" });
      expect(res.status).toBe(415);
    },
  );

  it.each(ROUTES)("%s %s refuses on a deployed site, even addressed to localhost", async (method, _path, load) => {
    vi.stubEnv("VERCEL", "1");
    try {
      const res = await call(method, load, { "content-type": "application/json", origin: "http://localhost:3001" });
      expect(res.status).toBe(403);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("wrote nothing into the workspace", () => {
    expect(fs.readdirSync(tmp)).toEqual([]);
  });
});
