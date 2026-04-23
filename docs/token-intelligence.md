# Token Intelligence

**Systemix · Internal Product Document**
A plan for building token-aware agentic workflows inside Systemix — and shipping it as a feature for everyone using Figma MCP.

_v1.0 Draft · April 2026 · Boyan Tsonev · verolab_

---

## 01 — The Problem Space

Anthropic doesn't publish exact token limits for Pro or Max subscriptions. Limits are enforced on a 5-hour rolling window, vary by model, fluctuate by peak hour, and the exact algorithm is deliberately opaque. For developers building on top of Figma MCP — which is one of the most token-hungry integrations in the ecosystem — this creates a silent cost problem: sessions burn through quota before the work is done, pipelines fail mid-run, and there's no feedback until it's too late.

Systemix is uniquely positioned here. It's an MCP-native tool that already orchestrates Figma ↔ code workflows. That means it sits exactly at the point where token costs are generated — and where they can be optimized before any call hits the API.

> **The core insight:** token waste in Figma MCP workflows is almost entirely structural, not conversational. It comes from over-fetching, session length, and re-reading unchanged data — all of which are predictable and preventable.

| Metric | Value | What It Means |
|---|---|---|
| ~10× | Typical over-fetch ratio | `get_file_data` vs scoped reads |
| 5h | Rolling quota window | Before reset (varies by load) |
| 80%+ | Estimated token reduction | With structured pre-fetch strategy |

---

## 02 — Token Cost Anatomy — Figma MCP

Every Figma MCP call has a token footprint determined by what it returns. Understanding which calls are cheap vs expensive is the foundation of everything else.

| MCP Tool | Typical Token Range | What Drives Cost | Risk Level |
|---|---|---|---|
| `get_file_data` | 50k – 400k+ | Full document tree, all pages, all nodes | CRITICAL |
| `get_design_context` (unscoped) | 20k – 80k | Recursive node traversal without depth limit | HIGH |
| `get_design_context` (node-scoped) | 2k – 20k | Node complexity, nesting depth | MEDIUM |
| `get_variables` | 5k – 40k | Number of collections × modes × variables | MEDIUM |
| `get_variables` (summary mode) | 1k – 5k | Collection names + counts only | LOW |
| `get_component` (single) | 1k – 8k | Variant count, nested instances | LOW |
| `get_design_system_summary` | 500 – 2k | Structural metadata only | MINIMAL |
| `get_styles` | 1k – 6k | Number of named styles | LOW |
| `search_components` | 2k – 10k | Match breadth, metadata depth | LOW |

**The key lever:** `get_file_data` is almost never the right call inside an agent. It was designed for human-readable inspection, not programmatic consumption. A scoped series of `get_design_context` calls on known node IDs costs 5–50× less and returns the same actionable data.

Beyond individual calls, the other major cost drivers are conversational overhead — each turn re-sends the full message history, including previous MCP responses — and tool discovery, where agents explore the file structure to find what they need instead of working from a pre-computed map.

---

## 03 — Systemix Internal Strategy

Before shipping token optimization as a feature for others, Systemix itself needs to be built in a way that embeds these principles natively. Every skill in the pipeline should be a good token citizen.

### 3.1 — The Pre-Fetch Architecture

The most impactful change: decouple MCP reads from agent reasoning. Introduce a lightweight pre-fetch layer that runs before any Claude call, serializes Figma data to a structured JSON payload, and feeds it to the agent as a document — not as a live tool call.

```js
// ❌ Current (agent explores live)
agent.run("Audit the Button component in this Figma file")
// → Agent calls get_file_data → 200k tokens → finds Button → reads it → done

// ✅ Pre-fetch (dumb read → smart reason)
const payload = await prefetch({
  fileId: "...",
  scope: { nodeId: "BUTTON_NODE_ID", depth: 3 },
  include: ["variables", "styles"],
  cacheKey: "button-component-v2"
})
agent.run("Audit this component", { context: payload })
// → Agent reads pre-serialized JSON → 4k tokens → reasons → done
```

### 3.2 — Session Scoping per Skill

Each of the five Systemix skills should open a fresh Claude session with the minimum context needed for that skill's task. No skill should inherit the full conversation history from the previous skill — only the structured output (the handoff payload).

| Skill | Name | Before | After |
|---|---|---|---|
| Skill 01 | Figma Read | 180k | 4k |
| Skill 02 | Token Diff | 60k | 3k |
| Skill 03 | Component Sync | 40k | 8k |
| Skill 04 | Code Gen | 35k | 12k |
| Skill 05 | Linear / PR | 20k | 3k |

Total pipeline: ~335k tokens → ~30k tokens with pre-fetch + scoped sessions.

### 3.3 — Disk Cache Layer

Figma files don't change between skill invocations within the same run. Cache all MCP responses to `.systemix/cache/` with a content hash key. On subsequent runs, diff against the cache before re-fetching. Only re-read nodes that have changed.

```
// .systemix/cache/[fileId]/
"manifest.json"         // node tree with last-modified timestamps
"variables.json"        // variable collections snapshot
"styles.json"           // styles snapshot
"nodes/[nodeId].json"   // per-node design context

// Cache invalidation strategy:
// Figma REST API provides lastModified per file
// Check timestamp before any MCP read
// Node-level: hash the node JSON, skip if unchanged
```

### 3.4 — Node Map Pre-computation

On first run against a Figma file, Systemix builds a node map: a flat index of every relevant node ID, its type, parent, and last-modified timestamp. Stored locally. All subsequent skill runs use this map to target calls precisely — zero exploration overhead.

```json
// .systemix/[fileId]/node-map.json
{
  "button-primary": {
    "id": "123:456",
    "type": "COMPONENT_SET",
    "page": "Components",
    "lastModified": "2026-04-01T12:00:00Z",
    "tokenDeps": ["color/primary", "radius/md"]
  }
  // ... all tracked components
}
```

---

## 04 — TokenGuard

The internal work described above can be surfaced as **TokenGuard** — a first-class Systemix feature that helps any team using Figma MCP understand, predict, and reduce their token consumption. This is a meaningful product differentiator: no other tool in the Figma ↔ code space addresses this problem directly.

> TokenGuard positions Systemix not just as a sync tool, but as a production-grade agentic infrastructure layer — one that respects the realities of running LLM workflows at scale and cost.

### F-01 — Pre-Run Token Estimator

Before executing any pipeline run, Systemix scans the target scope (file, page, node set) and produces a token cost estimate. Shows a breakdown by skill, flags any calls that would exceed a configurable budget threshold, and prompts the user to narrow scope or proceed.

```
$ systemix sync --file figma://MYX-DS --dry-run

TokenGuard Estimate
────────────────────────────────────
Skill 1 · Figma Read          ~4,200 tokens
Skill 2 · Token Diff          ~2,800 tokens
Skill 3 · Component Sync      ~8,100 tokens
Skill 4 · Code Gen            ~11,400 tokens
Skill 5 · Linear PR           ~2,600 tokens
────────────────────────────────────
Total Estimate                ~29,100 tokens
Cache hit ratio           74% (saved ~82k tokens)

⚡ Proceed? [y/N/--scope narrow]
```

- Reads file metadata and node counts without full MCP traversal
- Uses historical run data to calibrate estimates per file complexity
- Cache hit ratio shown — rewards users who run incrementally

### F-02 — Scope Narrowing CLI Flags

First-class CLI flags that let users target exactly what they want to sync, with sensible defaults that avoid whole-file reads.

```
# Target a single component
$ systemix sync --node button-primary

# Target a page
$ systemix sync --page "Components"

# Only sync tokens, skip components
$ systemix sync --only tokens

# Incremental — only changed nodes since last run
$ systemix sync --incremental

# Budget cap — abort if estimated cost exceeds N tokens
$ systemix sync --budget 20000
```

- `--incremental` is the default for repeat runs; first-run always scopes to changed nodes
- `--budget` flag enables CI/CD safety — prevents runaway agent costs in automated pipelines
- `--only tokens` skips component traversal entirely — 70% cheaper for token-only syncs

### F-03 — TokenGuard Dashboard (Mission Control)

A panel inside Mission Control that shows token usage history across runs. Visualizes spend per skill, per file, and over time. Highlights regressions — runs that cost significantly more than previous runs for the same scope.

- Per-run token breakdown stored in `.systemix/runs/` — local-first, no telemetry
- Regression alerts: "Skill 3 used 3× more tokens than last run — possible schema drift"
- Cache efficiency score per file — shows savings accrued over time
- Weekly usage summary exportable for team budget reviews
- Model cost overlay: shows equivalent API cost if running via Anthropic API (not Pro plan)

### F-04 — Smart Fetch — Figma MCP Proxy Layer

An optional thin proxy that intercepts Figma MCP calls from any agent — not just Systemix's own pipeline — and applies token optimization rules automatically. This makes TokenGuard useful beyond Systemix's own CLI.

```json
// In any MCP config (Claude Desktop, Cursor, etc.)
{
  "mcpServers": {
    "figma-optimized": {
      "command": "systemix",
      "args": ["mcp-proxy", "--target", "figma"],
      "env": {
        "FIGMA_TOKEN": "...",
        "TOKENGUARD_BUDGET": "50000"
      }
    }
  }
}
```

The proxy layer intercepts `get_file_data` calls and automatically downgrades them to scoped `get_design_context` calls when a node ID can be inferred. It also deduplicates calls made within the same session window and serves from its local cache when content hasn't changed.

- Works with any MCP client — Claude Desktop, Cursor, custom agents
- Zero config for basic usage; opt-in advanced rules for power users
- Call interception log viewable in Mission Control

### F-05 — Off-Peak Scheduler

Claude Pro limits are dynamically reduced during peak hours (13:00–19:00 GMT). For heavy pipeline runs — full design system syncs, multi-page audits — TokenGuard can schedule execution for off-peak windows automatically.

```
# Schedule a full sync for tonight at 22:00 local time (off-peak)
$ systemix sync --schedule "tonight 22:00"

# Schedule recurring — every Monday 06:00 before peak hours
$ systemix sync --schedule "weekly Mon 06:00"

# Auto-schedule — Systemix picks optimal window in next 24h
$ systemix sync --schedule auto
```

- Uses system cron or launchd — no cloud dependency, fully local
- Sends a desktop notification when the scheduled run completes
- Mission Control shows next scheduled run and estimated token cost

### F-06 — Token Profiler — Repository Scanner

A standalone command that audits a repository for token inefficiency patterns: hardcoded Figma file URLs passed to agents, unscoped MCP calls in automation scripts, missing cache configuration. Outputs a prioritized fix list.

```
$ systemix token-profile ./src

Token Profile Report — ./src
────────────────────────────────────────
⚠  scripts/sync.ts:14 — Unscoped get_file_data call
   Estimated waste: ~180k tokens/run
   Fix: pass --node-id or scope to page

⚠  .github/workflows/design-ci.yml:8 — No budget cap
   Risk: unbounded token spend in CI
   Fix: add TOKENGUARD_BUDGET=30000

✓  Cache configured correctly (3 files)
✓  Node map present and up-to-date
────────────────────────────────────────
2 issues found · Estimated weekly savings if fixed: ~1.2M tokens
```

---

## 05 — Technical Implementation Notes

Key architectural decisions that make the above work correctly.

| Architecture Card | Detail | Target |
|---|---|---|
| Cache Invalidation Strategy | Use Figma REST API `/files/:id` to check `lastModified` before any MCP read. If unchanged, serve from disk. For node-level invalidation, hash the returned JSON per node and compare with stored hash. | ~0 tokens for cache hits |
| Token Estimation Model | Build a regression model from real run data: node count + depth → token cost. Seeded with benchmarks from 10 representative file types. Ships with Systemix, updated via `systemix benchmark` run on user's own files. | ±15% accuracy target |
| Session Handoff Protocol | Each skill writes a typed JSON handoff payload to `.systemix/handoffs/[runId]/skill-N.json`. Next skill reads it as its sole input context. Skills never share conversation history — only structured outputs. | ~90% reduction in context overhead |
| Budget Enforcement | Budget is checked at the pre-fetch stage, not after the call. If the estimate exceeds budget, the run aborts with a clear error and a suggestion to narrow scope. No tokens consumed for aborted runs. | Zero over-budget surprises |
| MCP Proxy Implementation | The proxy wraps the Figma MCP server using the MCP SDK's middleware pattern. Intercepts tool calls, applies transformation rules, logs to local storage. Ships as a separate binary: `systemix-mcp-proxy`. | Works with any MCP client |
| Local-First Telemetry | All run data stored in `.systemix/` — no cloud, no phone-home. TokenGuard Dashboard reads from local storage. Optional: `systemix export-report` generates a shareable JSON/HTML report for team review. | Privacy-first by default |

---

## 06 — Positioning & Distribution

TokenGuard as a standalone value proposition targets a real pain point that's getting louder in the dev community right now — Anthropic itself acknowledged in late March 2026 that users are "hitting usage limits way faster than expected." The timing is ideal for a tool that addresses this systematically.

> **Positioning line:** "TokenGuard — Figma MCP token intelligence for teams running agentic design workflows. Know what you'll spend before you spend it."

| Audience Segment | Pain Point | TokenGuard Hook | Distribution Path |
|---|---|---|---|
| Design engineers using Claude Desktop + Figma MCP | Hitting Pro limits mid-session doing design system work | MCP Proxy + Estimator | shadcn CLI install |
| Frontend teams with Figma → code CI pipelines | Unpredictable token costs in automated workflows | Budget enforcement + Scheduler | GitHub Action |
| Design system leads managing large Figma files | Full-file reads burning quota before the workday starts | Incremental sync + Cache | Systemix CLI |
| Agencies running multiple client Figma files | Token costs across projects are opaque and unbudgeted | Dashboard + Export Report | Direct / word of mouth |

### shadcn-Style Distribution

TokenGuard ships as part of Systemix's shadcn-style CLI model. Users add it to an existing project in one command. The proxy is registered as an MCP server entry in their config file automatically.

```
# Add TokenGuard to an existing project
$ npx systemix add token-guard

✓ TokenGuard installed
✓ MCP proxy registered in .cursor/mcp.json
✓ Cache directory initialized at .systemix/cache/
✓ Run `systemix token-guard status` to verify
```

---

## 07 — Delivery Roadmap

### Phase 8 — Foundation (Internal)

- Pre-fetch architecture for Systemix pipeline
- Disk cache layer with hash-based invalidation
- Node map pre-computation on first run
- Session handoff protocol between skills
- Basic token counter per run (logged to stdout)

**Linear tickets:** BAST-71 to BAST-75

### Phase 9 — TokenGuard CLI (Beta)

- `--dry-run` estimator with scope breakdown
- `--incremental` flag + smart diff
- `--budget` cap enforcement
- `--schedule` flag with cron integration
- `token-profile` repository scanner
- Mission Control dashboard panel

**Linear tickets:** BAST-76 to BAST-80

### Phase 10 — MCP Proxy + Ecosystem (Launch)

- `systemix-mcp-proxy` standalone binary
- Claude Desktop + Cursor config auto-registration
- GitHub Action for CI/CD budget enforcement
- shadcn CLI distribution (`npx systemix add`)
- Public documentation + benchmarks
- TokenGuard as marketable feature name

**Linear tickets:** BAST-81 to BAST-85

---

## See Also
- [Getting Started](tokenguard/getting-started.md)
- [CLI Reference](tokenguard/cli-reference.md)
- [MCP Proxy](tokenguard/mcp-proxy.md)
- [CI/CD Integration](tokenguard/ci-cd.md)
- [Benchmarks](tokenguard/benchmarks.md)
