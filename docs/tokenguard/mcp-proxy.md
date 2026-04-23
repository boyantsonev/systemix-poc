# TokenGuard — MCP Proxy

The TokenGuard MCP proxy is an optional thin layer that sits between your MCP client and the Figma MCP server. It intercepts Figma tool calls, applies token optimization rules automatically, and logs every interception for review.

---

## Architecture

```
┌─────────────────┐        ┌──────────────────────────┐        ┌────────────────┐
│                 │        │                          │        │                │
│   MCP Client    │───────▶│  systemix-mcp-proxy      │───────▶│   Figma MCP    │
│                 │        │                          │        │                │
│  Claude Desktop │        │  • Call interception     │        │  Official REST │
│  Cursor         │        │  • get_file_data →       │        │  MCP server    │
│  Claude Code    │        │    get_design_context    │        │                │
│  Custom agents  │        │  • Session deduplicator  │        └────────────────┘
│                 │        │  • Cache bridge           │
└─────────────────┘        │  • Proxy log              │
                           │                          │
                           └──────────────────────────┘
                                        │
                                        ▼
                              .systemix/cache/
                              .systemix/proxy-log.json
```

The proxy is a standalone binary (`systemix-mcp-proxy`) that wraps the Figma MCP server using the MCP SDK's middleware pattern. It is transparent to the MCP client — from the client's perspective, it behaves identically to the real Figma MCP server.

---

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figma-optimized": {
      "command": "systemix",
      "args": ["mcp-proxy", "--target", "figma"],
      "env": {
        "FIGMA_TOKEN": "your-figma-token",
        "TOKENGUARD_BUDGET": "50000",
        "TOKENGUARD_CACHE_DIR": ".systemix/cache"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project root (or `~/.cursor/mcp.json` for global):

```json
{
  "mcpServers": {
    "figma-optimized": {
      "command": "systemix",
      "args": ["mcp-proxy", "--target", "figma"],
      "env": {
        "FIGMA_TOKEN": "your-figma-token",
        "TOKENGUARD_BUDGET": "50000"
      }
    }
  }
}
```

### Claude Code

Add to `.claude/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "figma-optimized": {
      "command": "systemix",
      "args": ["mcp-proxy", "--target", "figma"],
      "env": {
        "FIGMA_TOKEN": "your-figma-token",
        "TOKENGUARD_BUDGET": "50000"
      }
    }
  }
}
```

When you run `npx systemix add token-guard`, the proxy is registered automatically in whichever config file is present in the project. Manual configuration above is only needed for custom setups or global installation.

---

## What Gets Intercepted

### `get_file_data` → `get_design_context`

The highest-impact interception. `get_file_data` returns the full Figma document tree — often 50k–400k+ tokens. The proxy detects when a node ID can be inferred (from the current selection, recent calls, or the local node map) and automatically downgrades the call to a scoped `get_design_context` on that node.

```
Intercepted: get_file_data { fileKey: "h1m7dfFILe1wGSfxwQ6U02" }
Inferred node: 123:456 (button-primary, from node map)
Replaced with: get_design_context { fileKey: "...", nodeId: "123:456", depth: 3 }
Tokens saved: ~174,000 (estimated)
```

If no node ID can be inferred — for example, on a first run against an unknown file — the proxy allows the call to pass through and logs it for review. It does not silently drop calls.

### Other Intercepted Calls

| Original Call | Proxy Behavior |
|---|---|
| `get_design_context` (unscoped) | Adds `depth: 3` limit and `nodeId` if inferable |
| `get_variables` | Routes to summary mode first; full mode only if agent requests it |
| Any call matching local cache | Returns cached response without hitting Figma MCP |

---

## Session Deduplicator

Within a 60-second window, if the same tool call is made more than once with identical parameters, the proxy returns the cached result from the first call. This handles the common pattern of agents re-reading the same Figma node across multiple turns in a single session.

The deduplication window is configurable:

```json
{
  "env": {
    "TOKENGUARD_DEDUP_WINDOW": "120"
  }
}
```

Set to `"0"` to disable deduplication entirely.

---

## Cache Bridge

The proxy reads from and writes to `.systemix/cache/` — the same cache used by the Systemix CLI. This means:

- A `systemix sync` run pre-warms the cache for your interactive Claude sessions
- Interactive sessions in Claude Desktop build cache that `systemix sync` can reuse
- Cache entries are shared across all MCP clients configured to use the proxy

Cache structure:

```
.systemix/cache/
├── [fileId]/
│   ├── manifest.json          # node tree with last-modified timestamps
│   ├── variables.json         # variable collections snapshot
│   ├── styles.json            # styles snapshot
│   └── nodes/
│       └── [nodeId].json      # per-node design context
```

Cache entries are invalidated using Figma's `lastModified` timestamp at the file level, and per-node content hashes for node-level entries. Stale entries are evicted automatically on each proxy start.

---

## Viewing the Proxy Log

Every intercepted call is logged to `.systemix/proxy-log.json`:

```bash
# View last 20 proxy events
npx systemix token-guard status --log

# Open the raw log
cat .systemix/proxy-log.json
```

Log entry format:

```json
{
  "timestamp": "2026-04-02T14:32:11Z",
  "originalTool": "get_file_data",
  "resolvedTool": "get_design_context",
  "nodeId": "123:456",
  "cacheHit": false,
  "estimatedTokensSaved": 174000,
  "deduped": false
}
```

The proxy log is also surfaced in the TokenGuard Dashboard at `/token-guard` under the "Proxy Activity" tab.

---

## See Also

- [Overview](overview.md)
- [Getting Started](getting-started.md)
- [CLI Reference](cli-reference.md)
- [CI/CD Integration](ci-cd.md)
- [Benchmarks](benchmarks.md)
