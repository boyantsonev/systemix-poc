/**
 * mcp-registrar.js — BAST-82
 *
 * Detects installed MCP clients and registers/unregisters the
 * systemix-mcp-proxy ("figma-optimized" entry) in each client's config.
 *
 * Public API:
 *   detectClients()                     → [{ name, configPath, exists }]
 *   readConfig(configPath)              → object (parsed JSON, or {} if absent)
 *   registerProxy(configPath, projectRoot) → void
 *   unregisterProxy(configPath)         → void
 *   isRegistered(configPath)            → boolean
 *   previewChanges(configPath, projectRoot) → string (for dry-run display)
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");
const readline = require("readline");

// ── Client definitions ────────────────────────────────────────────────────────

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
 * Returns the proxy entry object to insert.
 * @param {string} projectRoot
 * @returns {object}
 */
function buildProxyEntry(projectRoot) {
  return {
    command: "systemix-mcp-proxy",
    args: ["--target", "figma", "--project-root", projectRoot],
    env: { TOKENGUARD_BUDGET: "50000" },
  };
}

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
 * Returns true if the "figma-optimized" key is already present in mcpServers.
 * @param {string} configPath
 * @returns {boolean}
 */
function isRegistered(configPath) {
  const config = readConfig(configPath);
  return !!(config.mcpServers && config.mcpServers["figma-optimized"]);
}

/**
 * Returns a human-readable preview string showing what will be added.
 * @param {string} configPath
 * @param {string} projectRoot
 * @returns {string}
 */
function previewChanges(configPath, projectRoot) {
  const entry = buildProxyEntry(projectRoot);
  return (
    `  Will add to: ${configPath}\n` +
    `  Key:         mcpServers["figma-optimized"]\n` +
    `  Value:       ${JSON.stringify(entry, null, 2).replace(/\n/g, "\n             ")}`
  );
}

/**
 * Adds the "figma-optimized" entry to mcpServers in the given config file.
 *
 * Safety rules:
 *   - Never overwrites an existing "figma" key
 *   - Skips with a message if "figma-optimized" is already present
 *
 * @param {string} configPath
 * @param {string} projectRoot
 */
function registerProxy(configPath, projectRoot) {
  const config = readConfig(configPath);

  // Ensure mcpServers block exists
  if (!config.mcpServers) config.mcpServers = {};

  // Safety: never touch an existing "figma" entry
  if (config.mcpServers["figma"]) {
    console.log(`  ℹ Preserved existing "figma" entry in ${path.basename(configPath)}`);
  }

  // Skip if already registered
  if (config.mcpServers["figma-optimized"]) {
    console.log(`  ⚠ "figma-optimized" already registered in ${path.basename(configPath)} — skipped`);
    return;
  }

  config.mcpServers["figma-optimized"] = buildProxyEntry(projectRoot);
  writeConfig(configPath, config);
  console.log(`  ✓ Registered "figma-optimized" in ${configPath}`);
}

/**
 * Removes the "figma-optimized" entry from mcpServers (rollback / remove).
 * No-op if the entry does not exist.
 *
 * @param {string} configPath
 */
function unregisterProxy(configPath) {
  if (!fs.existsSync(configPath)) {
    console.log(`  ⚠ Config not found, nothing to remove: ${configPath}`);
    return;
  }

  const config = readConfig(configPath);
  if (!config.mcpServers || !config.mcpServers["figma-optimized"]) {
    console.log(`  ⚠ "figma-optimized" not found in ${path.basename(configPath)} — skipped`);
    return;
  }

  delete config.mcpServers["figma-optimized"];
  writeConfig(configPath, config);
  console.log(`  ✓ Unregistered "figma-optimized" from ${configPath}`);
}

// ── Interactive confirm helper (used by add.js) ───────────────────────────────

/**
 * Prompts the user with a yes/no question.
 * Resolves to true for "y" / "yes", false otherwise (default N).
 *
 * @param {string} question
 * @returns {Promise<boolean>}
 */
function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes");
    });
  });
}

module.exports = {
  detectClients,
  readConfig,
  registerProxy,
  unregisterProxy,
  isRegistered,
  previewChanges,
  confirm,
};
