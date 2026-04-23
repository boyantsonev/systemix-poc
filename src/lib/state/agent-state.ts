/**
 * agent-state.ts
 * Read-only utility for reading .systemix/agent-state.json at runtime.
 * Write operations go through the MCP server (BAST-50).
 *
 * Reads .systemix/agent-state.json relative to the project root (process.cwd()).
 * Intended for use in Next.js API routes or server components — not safe to
 * import directly in client bundles (uses Node `fs`).
 */

import fs from "fs";
import path from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentStatus = "idle" | "running" | "error";
export type RunStatus = "success" | "failure" | "running";

export type Agent = {
  name: string;
  skill: string;
  status: AgentStatus;
  lastRun: string | null;
  lastRunStatus: RunStatus | null;
  runsTotal: number;
  runsSuccess: number;
};

export type AgentStateFile = {
  version: string;
  updatedAt: string;
  agents: Record<string, Agent>;
};

// ── Internal helpers ──────────────────────────────────────────────────────────

const STATE_PATH = path.join(process.cwd(), ".systemix", "agent-state.json");

function readFile(): AgentStateFile {
  if (!fs.existsSync(STATE_PATH)) {
    return { version: "1.0", updatedAt: new Date().toISOString(), agents: {} };
  }
  const raw = fs.readFileSync(STATE_PATH, "utf-8");
  return JSON.parse(raw) as AgentStateFile;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the full contents of .systemix/agent-state.json.
 * Throws if the file is missing or malformed.
 */
export function getAgentState(): AgentStateFile {
  return readFile();
}

/**
 * Returns a single agent by its key (e.g. "ada", "flux").
 * Returns `undefined` if the key does not exist in the file.
 */
export function getAgent(name: string): Agent | undefined {
  const state = readFile();
  return state.agents[name];
}
