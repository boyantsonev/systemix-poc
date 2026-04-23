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
const SERVER_CONFIG = {
  command: "node",
  args: ["./packages/mcp-server/dist/index.js", "--project-root", "."],
};

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

/**
 * Safely read and parse a JSON config file.
 * Returns {} when the file does not exist or cannot be parsed.
 * @param {string} configPath
 * @returns {object}
 */
function readConfig(configPath) {
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

/**
 * Atomically write a JSON config file, creating parent directories as needed.
 * @param {string} configPath
 * @param {object} data
 */
function writeConfig(configPath, data) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2) + "\n", "utf8");
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
  const config = readConfig(configPath);
  return !!(config.mcpServers && config.mcpServers[SERVER_NAME]);
}

/**
 * Adds the "systemix-mcp" entry to mcpServers in the given config file.
 * Skips with a message if the entry is already present.
 *
 * @param {string} configPath
 */
function registerServer(configPath) {
  const config = readConfig(configPath);

  // Ensure mcpServers block exists
  if (!config.mcpServers) config.mcpServers = {};

  // Skip if already registered
  if (config.mcpServers[SERVER_NAME]) {
    console.log(`  ⚠ "${SERVER_NAME}" already registered in ${path.basename(configPath)} — skipped`);
    return;
  }

  config.mcpServers[SERVER_NAME] = SERVER_CONFIG;
  writeConfig(configPath, config);
  console.log(`  ✓ Registered "${SERVER_NAME}" in ${configPath}`);
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

  const config = readConfig(configPath);
  if (!config.mcpServers || !config.mcpServers[SERVER_NAME]) {
    console.log(`  ⚠ "${SERVER_NAME}" not found in ${path.basename(configPath)} — skipped`);
    return;
  }

  delete config.mcpServers[SERVER_NAME];
  writeConfig(configPath, config);
  console.log(`  ✓ Unregistered "${SERVER_NAME}" from ${configPath}`);
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
  SERVER_NAME,
  SERVER_CONFIG,
};
