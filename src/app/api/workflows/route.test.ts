import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { NextRequest } from "next/server";

// Path-traversal guard for the workflows API. WORKFLOWS_DIR binds to
// process.cwd() at import time, so each test chdirs into a fresh tmp workspace
// and re-imports the routes. Real fs, no mocks.
const prevCwd = process.cwd();
let tmp: string;

const TRAVERSAL_IDS = ["../x", "../../.claude/settings", "a/b", ".."];

const wfDir = () => path.join(tmp, ".systemix", "workflows");
const decoyPath = () => path.join(tmp, ".claude", "settings.json");
const DECOY = JSON.stringify({ decoy: true });

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "workflows-route-"));
  fs.mkdirSync(path.join(tmp, ".claude"), { recursive: true });
  fs.writeFileSync(decoyPath(), DECOY, "utf8");
  fs.writeFileSync(path.join(tmp, "x.json"), DECOY, "utf8");
  process.chdir(tmp);
  vi.resetModules();
});

afterEach(() => {
  process.chdir(prevCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("POST /api/workflows", () => {
  it("saves a workflow with the default generated id", async () => {
    const { POST } = await import("./route");
    const res = await POST(jsonReq("http://t/api/workflows", "POST", { name: "w", steps: [] }));
    expect(res.status).toBe(201);
    const { workflow } = await res.json();
    expect(workflow.id).toMatch(/^wf-\d+$/);
    expect(fs.existsSync(path.join(wfDir(), `${workflow.id}.json`))).toBe(true);
  });

  it.each(TRAVERSAL_IDS)("400s on traversal id %j and writes nothing outside", async (id) => {
    const { POST } = await import("./route");
    const res = await POST(
      jsonReq("http://t/api/workflows", "POST", { id, name: "evil", steps: [], hooks: { x: 1 } }),
    );
    expect(res.status).toBe(400);
    expect(fs.readFileSync(decoyPath(), "utf8")).toBe(DECOY);
    expect(fs.readFileSync(path.join(tmp, "x.json"), "utf8")).toBe(DECOY);
    expect(fs.existsSync(path.join(tmp, ".systemix", "x.json"))).toBe(false);
  });
});

describe("/api/workflows/[id]", () => {
  it.each(TRAVERSAL_IDS)("GET 400s on traversal id %j", async (id) => {
    const { GET } = await import("./[id]/route");
    const res = await GET(new NextRequest("http://t/api/workflows/x"), params(id));
    expect(res.status).toBe(400);
  });

  it.each(TRAVERSAL_IDS)("PUT 400s on traversal id %j and writes nothing outside", async (id) => {
    const { PUT } = await import("./[id]/route");
    const res = await PUT(jsonReq("http://t/api/workflows/x", "PUT", { hooks: { x: 1 } }), params(id));
    expect(res.status).toBe(400);
    expect(fs.readFileSync(decoyPath(), "utf8")).toBe(DECOY);
    expect(fs.readFileSync(path.join(tmp, "x.json"), "utf8")).toBe(DECOY);
  });

  it.each(TRAVERSAL_IDS)("DELETE 400s on traversal id %j and the decoy survives", async (id) => {
    const { DELETE } = await import("./[id]/route");
    const res = await DELETE(new NextRequest("http://t/api/workflows/x", { method: "DELETE" }), params(id));
    expect(res.status).toBe(400);
    expect(fs.existsSync(decoyPath())).toBe(true);
    expect(fs.existsSync(path.join(tmp, "x.json"))).toBe(true);
  });

  it("round-trips a valid id (PUT → GET → DELETE)", async () => {
    const { GET, PUT, DELETE } = await import("./[id]/route");
    expect((await PUT(jsonReq("http://t", "PUT", { name: "ok", steps: [] }), params("my-wf"))).status).toBe(200);
    const got = await GET(new NextRequest("http://t"), params("my-wf"));
    expect(got.status).toBe(200);
    expect((await got.json()).workflow.name).toBe("ok");
    expect((await DELETE(new NextRequest("http://t", { method: "DELETE" }), params("my-wf"))).status).toBe(200);
    expect(fs.existsSync(path.join(wfDir(), "my-wf.json"))).toBe(false);
  });
});

describe("POST /api/workflows/[id]/run", () => {
  it.each(TRAVERSAL_IDS)("400s on traversal id %j", async (id) => {
    const { POST } = await import("./[id]/run/route");
    const res = await POST(jsonReq("http://t", "POST", {}), params(id));
    expect(res.status).toBe(400);
  });
});

describe("persistence guard", () => {
  it("rejects traversal ids at the choke point and accepts generated ids", async () => {
    const p = await import("@/lib/workflow/persistence");
    for (const id of TRAVERSAL_IDS) {
      expect(() => p.saveWorkflow({ id, name: "x", steps: [], createdAt: "", updatedAt: "", version: 1 })).toThrow();
      expect(p.loadWorkflow(id)).toBeNull();
      expect(p.deleteWorkflow(id)).toBe(false);
      expect(p.duplicateWorkflow(id)).toBeNull();
    }
    expect(fs.existsSync(decoyPath())).toBe(true);

    p.saveWorkflow({ id: `wf-${Date.now()}`, name: "orig", steps: [], createdAt: "", updatedAt: "", version: 1 });
    const [orig] = p.listWorkflows();
    const dup = p.duplicateWorkflow(orig.id);
    expect(dup?.id).toMatch(new RegExp(`^${orig.id}-copy-\\d+$`));
    expect(p.loadWorkflow(dup!.id)).not.toBeNull();
  });
});
