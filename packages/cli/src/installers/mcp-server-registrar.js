/**
 * mcp-server-registrar.js — BAST-52
 *
 * Registers the systemix-mcp server in Claude client configs.
 * Similar pattern to mcp-registrar.js but for the main MCP server
 * (not the figma-optimized proxy).
 *
 * Public API:
 *   detectClients()              → [{ name, configPath, exists }]
 *   registerServer(configPath)   → void
 *   unregisterServer(configPath) → void
 *   isRegistered(configPath)     → boolean
 *   listRegistered()             → string[]  (client names where it's registered)
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");

// ── Server definition ─────────────────────────────────────────────────────────

const SERVER_NAME = "systemix-mcp";

function getServerConfig(projectRoot = process.cwd()) {
  // Resolve the MCP server binary relative to this file so it works when
  // installed globally via npm/npx, not just from the monorepo root.
  let mcpServerPath;
  try {
    mcpServerPath = require.resolve("systemix-mcp-server/dist/index.js");
  } catch {
    // Monorepo dev fallback — __dirname is packages/cli/src/installers/
    mcpServerPath = path.resolve(__dirname, "../../../mcp-server/dist/index.js");
  }
  // A path inside the npx cache (~/.npm/_npx/<hash>/…) is ephemeral — it
  // disappears when the cache is pruned, breaking the stored registration.
  // Register the package through npx instead so it re-resolves on every launch.
  if (mcpServerPath.split(path.sep).includes("_npx")) {
    return {
      command: "npx",
      args: ["-y", "systemix-mcp-server", "--project-root", projectRoot],
    };
  }
  return {
    command: "node",
    args: [mcpServerPath, "--project-root", projectRoot],
  };
}

// ── Client definitions (mirrors mcp-registrar.js) ─────────────────────────────

const MCP_CLIENTS = [
  {
    name: "Claude Desktop",
    configPath: () => {
      if (process.platform === "darwin")
        return path.join(
          os.homedir(),
          "Library",
          "Application Support",
          "Claude",
          "claude_desktop_config.json"
        );
      if (process.platform === "win32")
        return path.join(
          os.homedir(),
          "AppData",
          "Roaming",
          "Claude",
          "claude_desktop_config.json"
        );
      return null; // unsupported platform for this client
    },
  },
  {
    name: "Cursor",
    configPath: () => path.join(process.cwd(), ".cursor", "mcp.json"),
  },
  {
    name: "Claude Code",
    configPath: () => path.join(os.homedir(), ".claude.json"),
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** A client config that exists but is not valid JSON. It is never overwritten. */
class UnreadableConfigError extends Error {
  constructor(configPath, cause) {
    super(`${configPath} is not valid JSON (${cause && cause.message ? cause.message : "parse error"}); left untouched. Fix or move it, then run this again.`);
    this.name = "UnreadableConfigError";
    this.configPath = configPath;
  }
}

/**
 * Read and parse a JSON config file. A missing file reads as {}; a file that exists
 * but does not parse throws, because writing back {} plus our entry would erase
 * every other setting in it (a user's whole ~/.claude.json).
 * @param {string} configPath
 * @returns {object}
 */
function readConfig(configPath) {
  if (!fs.existsSync(configPath)) return {};
  const text = fs.readFileSync(configPath, "utf8");
  if (!text.trim()) return {};
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new UnreadableConfigError(configPath, e);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new UnreadableConfigError(configPath, new Error("not a JSON object"));
  return data;
}

/**
 * Write a JSON config file atomically: a temp file beside it, then a rename, so a
 * crash or a full disk leaves the old file whole. Keeps the file's mode.
 * @param {string} configPath
 * @param {object} data
 */
function writeConfig(configPath, data) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const mode = fs.existsSync(configPath) ? fs.statSync(configPath).mode & 0o777 : 0o600;
  const tmp = `${configPath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", { encoding: "utf8", mode });
    fs.renameSync(tmp, configPath);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
}

/** Run a config change; an unreadable config is reported and skipped, never replaced. */
function guarded(fn) {
  try {
    return fn();
  } catch (e) {
    if (e instanceof UnreadableConfigError) {
      console.log(`  ✗ ${e.message}`);
      return false;
    }
    throw e;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns an array of all clients with resolved config paths.
 * Filters out clients where configPath() returns null (unsupported platform).
 *
 * @returns {{ name: string, configPath: string, exists: boolean }[]}
 */
function detectClients() {
  return MCP_CLIENTS
    .map(client => {
      const cfgPath = client.configPath();
      if (!cfgPath) return null;
      return {
        name: client.name,
        configPath: cfgPath,
        exists: fs.existsSync(cfgPath),
      };
    })
    .filter(Boolean);
}

/**
 * Returns true if the "systemix-mcp" key is already present in mcpServers.
 * @param {string} configPath
 * @returns {boolean}
 */
function isRegistered(configPath) {
  return guarded(() => {
    const config = readConfig(configPath);
    return !!(config.mcpServers && config.mcpServers[SERVER_NAME]);
  });
}

/**
 * Reads the --project-root value out of a stored mcpServers entry.
 * Returns null when the entry has no --project-root arg (or no args at all).
 * @param {object} entry
 * @returns {string|null}
 */
function projectRootOf(entry) {
  const args = entry && entry.args;
  if (!Array.isArray(args)) return null;
  const i = args.indexOf("--project-root");
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

/**
 * Adds the "systemix-mcp" entry to mcpServers in the given config file.
 *
 * Safety rules (a mis-run of `init` in a scratch dir must NOT silently repoint
 * an existing global registration):
 *   - Same --project-root already registered → idempotent skip.
 *   - DIFFERENT --project-root already registered → left untouched, with a
 *     warning showing the existing root and how to re-register intentionally.
 *   - opts.force → overwrite regardless (the intentional re-register path).
 *
 * @param {string} configPath
 * @param {{ force?: boolean, projectRoot?: string }} [opts]
 */
function registerServer(configPath, opts = {}) {
  return guarded(() => registerServerUnguarded(configPath, opts));
}

function registerServerUnguarded(configPath, opts) {
  const { force = false, projectRoot = process.cwd() } = opts;
  const config = readConfig(configPath);

  // Ensure mcpServers block exists
  if (!config.mcpServers) config.mcpServers = {};

  const existing = config.mcpServers[SERVER_NAME];
  if (existing && !force) {
    const existingRoot = projectRootOf(existing);
    if (existingRoot && existingRoot !== projectRoot) {
      console.log(`  ⚠ "${SERVER_NAME}" already registered in ${path.basename(configPath)} pointing at a different project — left unchanged:`);
      console.log(`      existing --project-root: ${existingRoot}`);
      console.log(`      this project:            ${projectRoot}`);
      console.log(`      To repoint it here, re-register intentionally: systemix mcp register --force`);
      return;
    }
    // Same root (or no discernible root) — already registered, nothing to do.
    console.log(`  ⚠ "${SERVER_NAME}" already registered in ${path.basename(configPath)} — skipped`);
    return;
  }

  config.mcpServers[SERVER_NAME] = getServerConfig(projectRoot);
  writeConfig(configPath, config);
  const verb = existing ? "Re-registered" : "Registered";
  console.log(`  ✓ ${verb} "${SERVER_NAME}" in ${configPath}`);
  return true;
}

/**
 * Removes the "systemix-mcp" entry from mcpServers.
 * No-op if the entry does not exist.
 *
 * @param {string} configPath
 */
function unregisterServer(configPath) {
  if (!fs.existsSync(configPath)) {
    console.log(`  ⚠ Config not found, nothing to remove: ${configPath}`);
    return;
  }

  return guarded(() => {
    const config = readConfig(configPath);
    if (!config.mcpServers || !config.mcpServers[SERVER_NAME]) {
      console.log(`  ⚠ "${SERVER_NAME}" not found in ${path.basename(configPath)} — skipped`);
      return false;
    }
    delete config.mcpServers[SERVER_NAME];
    writeConfig(configPath, config);
    console.log(`  ✓ Unregistered "${SERVER_NAME}" from ${configPath}`);
    return true;
  });
}

/**
 * Returns an array of client names where systemix-mcp is currently registered.
 *
 * @returns {string[]}
 */
function listRegistered() {
  return detectClients()
    .filter(client => client.exists && isRegistered(client.configPath))
    .map(client => client.name);
}

module.exports = {
  detectClients,
  registerServer,
  unregisterServer,
  isRegistered,
  listRegistered,
  projectRootOf,
  SERVER_NAME,
  getServerConfig,
  readConfig,
  writeConfig,
  UnreadableConfigError,
};
