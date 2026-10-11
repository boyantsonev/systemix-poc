import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// WORKFLOWS_DIR binds to process.cwd() at import: chdir into a fresh workspace,
// then re-import. Workflow ids become file names, so they must stay plain.
const prevCwd = process.cwd();
let tmp: string;

const same = { "content-type": "application/json", origin: "http://localhost:3001" };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "workflows-route-"));
  fs.writeFileSync(path.join(tmp, "package.json"), '{"name":"victim"}\n', "utf8");
  process.chdir(tmp);
  vi.resetModules();
});

afterEach(() => {
  process.chdir(prevCwd);
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("/api/workflows — ids stay inside .systemix/workflows/", () => {
  it("saves a workflow with a plain id (control)", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost:3001/api/workflows", {
        method: "POST",
        headers: same,
        body: JSON.stringify({ id: "wf-1", name: "ok", steps: [] }),
      }) as never,
    );
    expect(res.status).toBe(201);
    expect(fs.existsSync(path.join(tmp, ".systemix", "workflows", "wf-1.json"))).toBe(true);
  });

  it("refuses an id that would write outside the workflows dir", async () => {
    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost:3001/api/workflows", {
        method: "POST",
        headers: same,
        body: JSON.stringify({ id: "../../package", name: "x", scripts: { dev: "echo pwned" } }),
      }) as never,
    );
    expect(res.status).not.toBe(201);
    expect(fs.readFileSync(path.join(tmp, "package.json"), "utf8")).toBe('{"name":"victim"}\n');
  });

  it("refuses to read or delete through a traversal id", async () => {
    const { GET, DELETE } = await import("./[id]/route");
    const read = await GET(new Request("http://localhost:3001/x") as never, ctx("../../package"));
    expect(read.status).toBe(404);
    const del = await DELETE(
      new Request("http://localhost:3001/x", { method: "DELETE", headers: { origin: "http://localhost:3001" } }) as never,
      ctx("../../package"),
    );
    expect(del.status).toBe(404);
    expect(fs.existsSync(path.join(tmp, "package.json"))).toBe(true);
  });
});
