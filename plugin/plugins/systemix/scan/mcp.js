#!/usr/bin/env node
"use strict";

/**
 * The Systemix plugin's MCP server: one tool, `quick_report`, so the license key the user
 * gave at install time (a sensitive plugin setting) reaches the report service without
 * ever appearing in the chat. stdio, newline-delimited JSON-RPC 2.0, no dependencies.
 *
 * Env (set by the plugin's .mcp.json):
 *   SYSTEMIX_PROJECT_DIR   the repo to scan (Claude Code's project dir)
 *   SYSTEMIX_REPORT_KEY    the license key from the plugin settings; empty → the free score
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");

const SERVER = { name: "systemix", version: require("./package.json").version };
const FALLBACK_PROTOCOL = "2025-06-18";

const TOOLS = [
  {
    name: "quick_report",
    description:
      "Score this repo's design system for AI readiness. The scan runs locally; with send=true ONLY the results file " +
      "(counts, counter definitions, file and folder paths, short identifiers such as token names; never source code) " +
      "is posted to the Systemix report service. With send=false (default) it only describes what would be sent. " +
      "Without a license key in the plugin settings the answer is the free score (overall and per-area); with one, " +
      "the full report (caveats and recommendations).",
    inputSchema: {
      type: "object",
      properties: {
        dirs: { type: "array", items: { type: "string" }, description: "Folders to scan, relative to the repo root (default: the usual source folders)" },
        send: { type: "boolean", description: "true sends the results file; false (default) only shows what would be sent" },
        redact_paths: { type: "boolean", description: "Replace every file and folder name with a hash before sending (the score is unchanged)" },
      },
      additionalProperties: false,
    },
  },
];

/** A plugin setting left unset can arrive as an empty value or as its unexpanded placeholder. */
function settingValue(raw) {
  const v = (raw ?? "").trim();
  return v && !v.includes("${") ? v : "";
}

/** Run a CLI command with every console and stdout write captured, so nothing corrupts the protocol stream. */
async function captured(fn) {
  const lines = [];
  const saved = { log: console.log, error: console.error, warn: console.warn, write: process.stdout.write };
  const keep = (...a) => lines.push(a.join(" "));
  console.log = console.error = console.warn = keep;
  process.stdout.write = (chunk) => {
    lines.push(String(chunk));
    return true;
  };
  try {
    const result = await fn();
    return { result, text: lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() };
  } finally {
    Object.assign(console, { log: saved.log, error: saved.error, warn: saved.warn });
    process.stdout.write = saved.write;
  }
}

async function quickReport(input, env = process.env) {
  const { audit } = require("./src/commands/audit");
  const root = settingValue(env.SYSTEMIX_PROJECT_DIR) || process.cwd();
  const dirs = Array.isArray(input.dirs) ? input.dirs.filter((d) => typeof d === "string" && d.trim()) : [];
  const args = ["report", ...dirs.flatMap((d) => ["--dirs", d])];
  if (input.redact_paths) args.push("--redact-paths");
  const cliEnv = { ...env, SYSTEMIX_REPORT_KEY: settingValue(env.SYSTEMIX_REPORT_KEY) || undefined };

  if (!input.send) {
    const { text } = await captured(() => audit([...args, "--dry-run"], { projectRoot: root, env: cliEnv }));
    process.exitCode = 0;
    return { text: `${text}\n\nCall again with send=true to send it.`, isError: false };
  }

  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "systemix-")), "report.md");
  try {
    const { result, text } = await captured(() => audit([...args, "--yes", "--out", out], { projectRoot: root, env: cliEnv }));
    process.exitCode = 0;
    if (!result) return { text: text || "The report service gave no report.", isError: true };
    // the CLI's own trailer names a temp file and --key; the plugin's key lives in its settings
    const note = result.preview
      ? `Free score. The full report${result.price ? ` (${result.price})` : ""} adds the caveats and recommendations${result.buyUrl ? `: ${result.buyUrl}` : " (not on sale yet)"}. ` +
        "The license key goes into the plugin settings: /plugin configure systemix@systemix."
      : "Full report.";
    return { text: `${result.markdown.trim()}\n\n${note}`, isError: false };
  } finally {
    fs.rmSync(path.dirname(out), { recursive: true, force: true });
  }
}

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return { protocolVersion: (params && params.protocolVersion) || FALLBACK_PROTOCOL, capabilities: { tools: {} }, serverInfo: SERVER };
  }
  if (method === "ping") return {};
  if (method === "tools/list") return { tools: TOOLS };
  if (method === "tools/call") {
    const name = params && params.name;
    if (name !== "quick_report") throw Object.assign(new Error(`unknown tool ${name}`), { code: -32602 });
    try {
      const r = await quickReport((params && params.arguments) || {});
      return { content: [{ type: "text", text: r.text }], isError: r.isError };
    } catch (e) {
      return { content: [{ type: "text", text: `The scan failed: ${e && e.message ? e.message : e}` }], isError: true };
    }
  }
  if (id === undefined) return undefined; // a notification
  throw Object.assign(new Error(`method not found: ${method}`), { code: -32601 });
}

function serve(input = process.stdin, output = process.stdout) {
  const write = output.write.bind(output);
  const send = (obj) => write(JSON.stringify(obj) + "\n");
  let queue = Promise.resolve();
  readline.createInterface({ input }).on("line", (line) => {
    if (!line.trim()) return;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } });
      return;
    }
    // one call at a time: the CLI commands share process-wide console and exit code state
    queue = queue.then(async () => {
      try {
        const result = await handle(msg);
        if (msg.id !== undefined && result !== undefined) send({ jsonrpc: "2.0", id: msg.id, result });
      } catch (e) {
        if (msg.id !== undefined) send({ jsonrpc: "2.0", id: msg.id, error: { code: e.code || -32603, message: e.message } });
      }
    });
  });
}

if (require.main === module) serve();

module.exports = { handle, quickReport, settingValue, serve, TOOLS };
