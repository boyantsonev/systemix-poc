#!/usr/bin/env node
/**
 * systemix-mcp-proxy
 *
 * A token-optimizing MCP proxy that sits between any MCP client (Claude
 * Desktop, Cursor, etc.) and the real Figma MCP server.  For every incoming
 * tool call it applies three optimizations before deciding whether to forward:
 *
 *   1. Deduplication  — identical calls within a 60 s window return cached
 *                       results immediately without touching Figma.
 *   2. Interception   — unscoped `get_file_data` calls are downgraded to
 *                       `get_design_context` to avoid whole-file fetches.
 *   3. Cache bridge   — checks .systemix/cache/ for a fresh on-disk result
 *                       before forwarding to Figma.
 *
 * All calls are logged to .systemix/proxy-log.json.
 *
 * Usage:
 *   systemix-mcp-proxy --target figma --project-root /path/to/project --budget 50000
 *
 * MCP client config example (claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "figma-optimized": {
 *         "command": "systemix-mcp-proxy",
 *         "args": ["--target", "figma", "--project-root", "/path/to/project"],
 *         "env": { "FIGMA_TOKEN": "...", "TOKENGUARD_BUDGET": "50000" }
 *       }
 *     }
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import { interceptGetFileData } from './interceptors/get-file-data.js'
import { SessionDeduplicator } from './interceptors/deduplicator.js'
import { CacheBridge } from './cache-bridge.js'
import { ProxyLogger, ProxyLogEntry } from './logger.js'

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

interface ProxyConfig {
  target: string
  projectRoot: string
  budget: number
}

function parseArgs(): ProxyConfig {
  const args = process.argv.slice(2)
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag)
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined
  }

  return {
    target: get('--target') ?? 'figma',
    projectRoot: get('--project-root') ?? process.env['TOKENGUARD_PROJECT_ROOT'] ?? process.cwd(),
    budget: parseInt(get('--budget') ?? process.env['TOKENGUARD_BUDGET'] ?? '50000', 10),
  }
}

const config = parseArgs()

// ---------------------------------------------------------------------------
// Service instances
// ---------------------------------------------------------------------------

const deduplicator = new SessionDeduplicator(60_000)
const cacheBridge = new CacheBridge(config.projectRoot)
const logger = new ProxyLogger(config.projectRoot)

// ---------------------------------------------------------------------------
// Helper — extract fileId / nodeId from common Figma tool arg shapes
// ---------------------------------------------------------------------------

function extractFigmaIds(args: Record<string, unknown>): { fileId?: string; nodeId?: string } {
  const fileId =
    (args['fileKey'] as string | undefined) ??
    (args['file_key'] as string | undefined) ??
    (args['fileId'] as string | undefined)

  const nodeId =
    (args['nodeId'] as string | undefined) ??
    (args['node_id'] as string | undefined)

  return { fileId, nodeId }
}

// ---------------------------------------------------------------------------
// Core proxy handler
// ---------------------------------------------------------------------------

async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const timestamp = new Date().toISOString()

  // ------------------------------------------------------------------
  // Step 1 — Deduplication check
  // ------------------------------------------------------------------
  const dedupResult = deduplicator.check(toolName, args)
  if (dedupResult !== null) {
    const entry: ProxyLogEntry = {
      tool: toolName,
      args,
      intercepted: false,
      fromCache: false,
      fromDedup: true,
      timestamp,
    }
    await logger.log(entry)

    process.stderr.write(
      `[mcp-proxy] DEDUP hit for ${toolName} — returning cached session result\n`,
    )
    return dedupResult
  }

  // ------------------------------------------------------------------
  // Step 2 — Interceptor check (downgrade unscoped get_file_data)
  // ------------------------------------------------------------------
  const intercept = interceptGetFileData(toolName, args)
  if (intercept.intercepted) {
    const entry: ProxyLogEntry = {
      tool: toolName,
      args,
      intercepted: true,
      reason: intercept.reason,
      fromCache: false,
      fromDedup: false,
      timestamp,
    }
    await logger.log(entry)

    process.stderr.write(
      `[mcp-proxy] INTERCEPTED ${toolName} → ${intercept.replacedWith}: ${intercept.reason}\n`,
    )

    // Return a structured advisory that the client can act on.
    // In a production proxy this would re-issue the call as get_design_context;
    // here we surface the intercept decision so the calling agent can adapt.
    const result = {
      _proxy: true,
      intercepted: true,
      originalTool: toolName,
      replacedWith: intercept.replacedWith,
      reason: intercept.reason,
      advice:
        `Use ${intercept.replacedWith} with a nodeId to fetch only the nodes you need. ` +
        `This avoids loading the entire Figma file and saves context-window tokens.`,
    }

    deduplicator.store(toolName, args, result)
    return result
  }

  // ------------------------------------------------------------------
  // Step 3 — Cache bridge check
  // ------------------------------------------------------------------
  const { fileId, nodeId } = extractFigmaIds(args)
  if (fileId) {
    const cached = await cacheBridge.checkCache(fileId, nodeId)
    if (cached) {
      const entry: ProxyLogEntry = {
        tool: toolName,
        args,
        intercepted: false,
        fromCache: true,
        fromDedup: false,
        timestamp,
      }
      await logger.log(entry)

      process.stderr.write(
        `[mcp-proxy] CACHE hit for ${toolName} (fileId=${fileId}${nodeId ? `, nodeId=${nodeId}` : ''})\n`,
      )

      deduplicator.store(toolName, args, cached.data)
      return cached.data
    }
  }

  // ------------------------------------------------------------------
  // Step 4 — Forward to the real Figma MCP (stubbed)
  // ------------------------------------------------------------------
  // In a full implementation this would open a child MCP client pointed at
  // the upstream Figma MCP server specified by --target.  The stub logs the
  // intent and returns a placeholder so the proxy pipeline can be exercised
  // end-to-end without a live Figma connection.
  process.stderr.write(
    `[mcp-proxy] FORWARD ${toolName} → would forward to ${config.target} MCP (stubbed)\n`,
  )

  const stubResult = {
    _proxy: true,
    stubbed: true,
    tool: toolName,
    args,
    message: `[systemix-mcp-proxy] Forwarding to ${config.target} MCP is not yet wired. ` +
      `Configure the upstream MCP client to enable live forwarding.`,
  }

  // Store in session dedup and on-disk cache so repeat calls are served locally
  deduplicator.store(toolName, args, stubResult)
  if (fileId) {
    await cacheBridge.storeCache(fileId, stubResult, nodeId)
  }

  const entry: ProxyLogEntry = {
    tool: toolName,
    args,
    intercepted: false,
    fromCache: false,
    fromDedup: false,
    timestamp,
  }
  await logger.log(entry)

  return stubResult
}

// ---------------------------------------------------------------------------
// Proxy tool definitions — expose a generic pass-through tool for each
// well-known Figma MCP tool so MCP clients can call them via this proxy.
// ---------------------------------------------------------------------------

const FIGMA_TOOLS = [
  'get_file_data',
  'get_design_context',
  'get_variable_defs',
  'get_metadata',
  'get_screenshot',
  'get_code_connect_map',
  'search_design_system',
] as const

const tools = FIGMA_TOOLS.map((name) => ({
  name,
  description: `[systemix-mcp-proxy] Optimized proxy for ${name}. ` +
    `Applies deduplication, downgrade rules, and .systemix cache before forwarding to Figma MCP.`,
  inputSchema: {
    type: 'object' as const,
    properties: {},
    additionalProperties: true,
  },
}))

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: 'systemix-mcp-proxy',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params
  const args = (rawArgs ?? {}) as Record<string, unknown>

  try {
    const result = await handleToolCall(name, args)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      content: [{ type: 'text', text: `[mcp-proxy] Error handling ${name}: ${message}` }],
      isError: true,
    }
  }
})

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)

  process.stderr.write(
    `[systemix-mcp-proxy] Started. target=${config.target} ` +
    `projectRoot=${config.projectRoot} budget=${config.budget}\n`,
  )
  process.stderr.write(
    `[systemix-mcp-proxy] ${tools.length} tools registered: ${tools.map((t) => t.name).join(', ')}\n`,
  )
}

main().catch((err) => {
  process.stderr.write(`[systemix-mcp-proxy] Fatal error: ${err}\n`)
  process.exit(1)
})
