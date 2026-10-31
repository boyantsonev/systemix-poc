"use strict";

/**
 * G-003 E7, the agent cannot rule: `systemix experiment ack` is the typed ruling on a
 * queue card, it records the person, and it refuses the agent. No MCP tool resolves a
 * card or closes an experiment.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { ack } = require("../../../src/lib/queue-ack");

const NOW = "2026-10-31T12:00:00.000Z";
let root;
const queue = () => JSON.parse(fs.readFileSync(path.join(root, ".systemix", "queue.json"), "utf8"));
const hitl = () => JSON.parse(fs.readFileSync(path.join(root, ".systemix", "hitl-queue.json"), "utf8"));

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "sx-ack-"));
  fs.mkdirSync(path.join(root, ".systemix"));
  fs.writeFileSync(path.join(root, ".systemix", "queue.json"), JSON.stringify({ cards: [
    { id: "card-1", type: "close-proposal", status: "pending", experimentId: "exp-1" },
    { id: "card-2", type: "hypothesis-proposal", status: "pending", experimentId: "exp-2" },
    { id: "card-3", type: "close-proposal", status: "pending", experimentId: "exp-2" },
    { id: "card-4", type: "close-proposal", status: "approved", experimentId: "exp-4" },
  ] }));
  fs.writeFileSync(path.join(root, ".systemix", "hitl-queue.json"), JSON.stringify({ tasks: [{ id: "task-1", status: "pending" }] }));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("systemix experiment ack", () => {
  test("approves a card by its id and records who typed it", () => {
    const r = ack(root, "card-1", { by: "Ada", now: NOW, note: "holds" });
    expect(r.ok).toBe(true);
    expect(r.nextHint).toMatch(/experiment close exp-1/);
    expect(queue().cards[0]).toMatchObject({ status: "approved", resolvedAt: NOW, resolution: { action: "approve", note: "holds", resolvedBy: "human:Ada", typed: true } });
  });

  test("declines by experiment id when it has one pending card", () => {
    expect(ack(root, "exp-1", { by: "Ada", decline: true, now: NOW }).ok).toBe(true);
    expect(queue().cards[0]).toMatchObject({ status: "declined", resolution: { action: "decline" } });
  });

  test("an experiment id with several pending cards is refused, naming them", () => {
    const r = ack(root, "exp-2", { by: "Ada" });
    expect(r).toMatchObject({ ok: false });
    expect(r.error).toMatch(/2 pending cards; name one: card-2, card-3/);
    expect(queue().cards.map((c) => c.status)).toEqual(["pending", "pending", "pending", "approved"]);
  });

  test("resolves a task in hitl-queue.json", () => {
    expect(ack(root, "task-1", { by: "Ada", now: NOW }).ok).toBe(true);
    expect(hitl().tasks[0]).toMatchObject({ status: "resolved", resolution: { resolvedBy: "human:Ada", typed: true } });
  });

  test.each(["claude", "Claude", "agent", "auto", "Claude Code", "systemix[bot]"])("refuses %s as the person ruling", (by) => {
    const r = ack(root, "card-1", { by });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/cannot rule on a card; a person types this command/);
    expect(queue().cards[0].status).toBe("pending");
  });

  test("a resolved card, an unknown ref and a missing ref are refused", () => {
    expect(ack(root, "card-4", { by: "Ada" }).error).toMatch(/no pending card matches card-4/);
    expect(ack(root, "nope", { by: "Ada" }).error).toMatch(/no pending card matches nope/);
    expect(ack(root, "", { by: "Ada" }).error).toMatch(/name the card/);
  });
});

describe("the MCP server", () => {
  const src = path.resolve(__dirname, "../../../../mcp-server/src");
  const sources = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? sources(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  const tools = sources(src).flatMap((f) => [...fs.readFileSync(f, "utf8").matchAll(/name: "([a-z_]+)"/g)].map((m) => m[1]));

  test("has tools, and none of them resolves a card or closes an experiment", () => {
    expect(tools).toEqual(expect.arrayContaining(["push_hitl_task", "list_hitl_tasks", "experiment_new"]));
    for (const t of tools) expect(t).not.toMatch(/resolve|approve|decline|close|decide|rule/);
  });
});
