/**
 * token-guard.js — BAST-82
 *
 * Subcommand: npx systemix token-guard [status|reset|remove]
 *
 *   status  — doctor checks: cache dir, proxy registered, runs dir
 *   reset   — clear .systemix/cache/ and .systemix/runs/
 *   remove  — unregister proxy from all detected MCP client configs
 */

"use strict";

const fs   = require("fs");
const path = require("path");

const {
  detectClients,
  isRegistered,
  unregisterProxy,
  confirm,
} = require("../installers/mcp-registrar");

const {
  isRegistered: isMcpServerRegistered,
} = require("../installers/mcp-server-registrar");

// ── Paths ─────────────────────────────────────────────────────────────────────

const PROJECT_ROOT = process.cwd();
const SYSTEMIX_DIR = path.join(PROJECT_ROOT, ".systemix");
const CACHE_DIR    = path.join(SYSTEMIX_DIR, "cache");
const RUNS_DIR     = path.join(SYSTEMIX_DIR, "runs");

// ── Subcommands ───────────────────────────────────────────────────────────────

/**
 * status — run doctor checks specific to TokenGuard.
 */
function status() {
  console.log("\nTokenGuard status\n");

  // 1. Cache directory
  const cacheExists = fs.existsSync(CACHE_DIR);
  console.log(`  ${cacheExists ? "✓" : "✗"} Cache directory     ${CACHE_DIR}`);
  if (!cacheExists) console.log("    Run 'npx systemix add token-guard' to initialise.");

  // 2. Runs directory
  const runsExists = fs.existsSync(RUNS_DIR);
  console.log(`  ${runsExists ? "✓" : "✗"} Runs directory      ${RUNS_DIR}`);
  if (!runsExists) console.log("    Run 'npx systemix add token-guard' to initialise.");

  // 3. Proxy registration across detected clients
  const clients = detectClients();
  if (clients.length === 0) {
    console.log("  ⚠ No MCP clients detected.");
  } else {
    console.log("\n  MCP client registrations:\n");
    for (const client of clients) {
      if (!client.exists) {
        console.log(`    -  ${client.name.padEnd(20)} config not found`);
        continue;
      }
      const registered = isRegistered(client.configPath);
      console.log(`    ${registered ? "✓" : "✗"}  ${client.name.padEnd(20)} ${registered ? "proxy registered" : "proxy NOT registered"}`);
      if (!registered) console.log(`       Run 'npx systemix add token-guard' to register.`);
    }

    // 4. systemix-mcp server registration
    console.log("\n  systemix-mcp server registrations:\n");
    for (const client of clients) {
      if (!client.exists) {
        console.log(`    -  ${client.name.padEnd(20)} config not found`);
        continue;
      }
      const serverRegistered = isMcpServerRegistered(client.configPath);
      console.log(`    ${serverRegistered ? "✓" : "✗"}  ${client.name.padEnd(20)} ${serverRegistered ? "systemix-mcp registered" : "systemix-mcp NOT registered"}`);
      if (!serverRegistered) console.log(`       Run 'npx systemix init' to register.`);
    }
  }

  console.log();
}

/**
 * reset — clear .systemix/cache/ and .systemix/runs/.
 */
async function reset() {
  console.log("\nTokenGuard reset\n");

  const targets = [CACHE_DIR, RUNS_DIR].filter(fs.existsSync);

  if (targets.length === 0) {
    console.log("  Nothing to reset — directories do not exist.\n");
    return;
  }

  console.log("  Will delete contents of:");
  targets.forEach(t => console.log(`    ${t}`));
  console.log();

  const ok = await confirm("  Proceed? [y/N] ");
  if (!ok) {
    console.log("\n  Aborted.\n");
    return;
  }

  for (const dir of targets) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    console.log(`  ✓ Cleared ${dir}`);
  }

  console.log("\n  Reset complete.\n");
}

/**
 * remove — unregister proxy from all detected MCP client configs.
 */
async function remove() {
  console.log("\nTokenGuard remove\n");

  const clients = detectClients().filter(c => c.exists);

  if (clients.length === 0) {
    console.log("  No MCP client configs found — nothing to do.\n");
    return;
  }

  console.log("  Will unregister 'figma-optimized' from:");
  clients.forEach(c => console.log(`    ${c.name}  (${c.configPath})`));
  console.log();

  const ok = await confirm("  Proceed? [y/N] ");
  if (!ok) {
    console.log("\n  Aborted.\n");
    return;
  }

  for (const client of clients) {
    unregisterProxy(client.configPath);
  }

  console.log("\n  Proxy unregistered.\n");
  console.log("  Re-run 'npx systemix add token-guard' to restore.\n");
}

// ── Entry point ───────────────────────────────────────────────────────────────

const SUBCOMMAND_HELP = `
  Usage:
    npx systemix token-guard status    Doctor checks for TokenGuard
    npx systemix token-guard reset     Clear cache and runs directories
    npx systemix token-guard remove    Unregister proxy from all MCP clients
`;

async function tokenGuard(args = []) {
  const sub = args[0];

  switch (sub) {
    case "status":
      status();
      break;
    case "reset":
      await reset();
      break;
    case "remove":
      await remove();
      break;
    default:
      if (sub) console.error(`\n  Unknown subcommand: ${sub}`);
      console.log(SUBCOMMAND_HELP);
      if (sub) process.exit(1);
  }
}

module.exports = { tokenGuard };
