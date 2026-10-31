"use strict";

/**
 * queue-ack.js — a person's typed ruling on a queue card (.systemix/queue.json or
 * .systemix/hitl-queue.json). The only way to approve or decline a card: the local hub
 * and the site show this command and never approve with a click; no MCP tool resolves a
 * card (G-003, decision 2026-10-31). The card records who ruled and that it was typed.
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const QUEUE = (root) => path.join(root, ".systemix", "queue.json");
const HITL = (root) => path.join(root, ".systemix", "hitl-queue.json");

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeAtomic(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(tmp, file);
}

/** Who is ruling: the --by name, else git's user.name. Never the agent, never a guess. */
function rulerName(root, by) {
  if (by && String(by).trim()) return String(by).trim();
  try {
    return execFileSync("git", ["config", "user.name"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch {
    return null;
  }
}

/** Pending cards matching a card id, or an experiment id (all of its pending cards). */
function findPending(root, ref) {
  const out = [];
  const q = readJson(QUEUE(root));
  for (const c of (q && q.cards) || []) if (c.status === "pending" && (c.id === ref || c.experimentId === ref)) out.push({ file: QUEUE(root), list: "cards", id: c.id, card: c });
  const h = readJson(HITL(root));
  for (const t of (h && h.tasks) || []) if (t.status === "pending" && t.id === ref) out.push({ file: HITL(root), list: "tasks", id: t.id, card: t });
  return out;
}

/**
 * Resolve one pending card. Returns { ok, item?, error? }. `ref` is a card id or an
 * experiment id with exactly one pending card.
 */
function ack(root, ref, { decline = false, note = null, by = null, now = new Date().toISOString() } = {}) {
  if (!ref) return { ok: false, error: "name the card: systemix experiment ack <card-id | experiment-id>" };
  const who = rulerName(root, by);
  if (!who) return { ok: false, error: "who is ruling? set git config user.name, or pass --by <your name>" };
  if (/^(auto|agent|claude)\b|\[bot\]$/i.test(who)) return { ok: false, error: `"${who}" cannot rule on a card; a person types this command` };
  const found = findPending(root, ref);
  if (!found.length) return { ok: false, error: `no pending card matches ${ref}` };
  if (found.length > 1) return { ok: false, error: `${ref} matches ${found.length} pending cards; name one: ${found.map((f) => f.id).join(", ")}` };
  const { file, list, id } = found[0];
  const data = readJson(file);
  const item = data[list].find((c) => c.id === id);
  const action = decline ? "decline" : "approve";
  item.status = list === "cards" ? (decline ? "declined" : "approved") : "resolved";
  item.resolvedAt = now;
  item.resolution = { action, note: note || null, resolvedBy: `human:${who}`, typed: true };
  writeAtomic(file, data);
  const nextHint =
    item.type === "close-proposal" && !decline && item.experimentId
      ? `apply the decision: systemix experiment close ${item.experimentId} --result "…" --decision …`
      : item.type === "hypothesis-proposal" && !decline
        ? "scaffold it: systemix experiment new <id> (or /init-experiment)"
        : null;
  return { ok: true, item, nextHint };
}

module.exports = { ack, findPending, rulerName };
