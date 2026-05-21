# Figma MCP Guide — What to Use When

Two separate MCP servers cover Figma. They are complementary, not alternatives. Use both.

**Sources:**
- Official Figma MCP: https://www.figma.com/developers/mcp
- Figma Console MCP (Southleft / TJ Pitre): https://docs.figma-console-mcp.southleft.com
- Comparison: https://docs.figma-console-mcp.southleft.com/figma-mcp-vs-figma-console-mcp

---

## The two MCPs at a glance

| | Official Figma MCP | Figma Console MCP |
|---|---|---|
| **Made by** | Figma Inc. | Southleft / TJ Pitre |
| **Tool prefix** | `mcp__claude_ai_Figma__*` | `mcp__figma-console__*` or `mcp__claude_ai_Figma_Console__*` |
| **Tools** | 16 (1 generic write: `use_figma`) | 94 (35+ dedicated write tools) |
| **Connection** | REST API + Figma cloud | WebSocket Desktop Bridge + REST |
| **Requires** | Figma OAuth | Personal Access Token + Figma Desktop open |
| **Source** | Closed | Open (MIT) |
| **Cost** | Usage-based, moving to paid | Free, unlimited |
| **Self-hostable** | No | Yes |

---

## Decision rule

### Use Official Figma MCP (`mcp__claude_ai_Figma__*`) when:

- **Reading design context** — `get_design_context`, `get_metadata`, `get_variable_defs`, `get_screenshot`
- **Code Connect** — mapping Figma components to codebase React components (`get_code_connect_map`, `add_code_connect_map`, `send_code_connect_mappings`)
- **Framework code generation** — generating React/Vue/etc. component code from a Figma node
- **Parity checks** — reading Figma to compare against code (read-only direction)
- **Capturing live websites into Figma** — `use_figma` with a web URL
- **Creating FigJam diagrams from Mermaid**
- **Creating new blank Figma files**

> No Figma Desktop required. Works via REST and OAuth only.

### Use Figma Console MCP (`mcp__figma-console__*`) when:

- **Writing to Figma** — creating variables, updating nodes, setting fills, renaming components
- **Batch token operations** — `figma_batch_create_variables`, `figma_batch_update_variables` (100/call vs. sequential)
- **Token sync** — pushing `tokens.bridge.json` values into Figma Variables (`figma_setup_design_tokens`, `figma_import_tokens`)
- **Design system health** — `figma_lint_design`, `figma_check_design_parity`, `figma_get_design_system_summary`
- **Real-time document awareness** — `figma_watch_console`, `figma_get_selection`, `figma_get_console_logs`
- **Screenshot a URL and push to Figma canvas** — `figma_capture_screenshot` + `figma_set_image_fill`
- **Executing raw Plugin API code** — `figma_execute` for anything not covered by a dedicated tool
- **FigJam structured tools** (9 tools), Slides (15 tools), Annotations (3 tools)

> Requires Figma Desktop open and the Plugin/Desktop Bridge running on port 3845.

---

## Skill→MCP mapping

| Systemix skill | MCP used | Direction |
|---|---|---|
| `/figma` | Official (`get_design_context`, `get_screenshot`) | Figma → code |
| `/tokens` | Official (`get_variable_defs`) | Figma → code |
| `/component` | Official (`get_design_context`, `get_screenshot`) | Figma → code |
| `/drift-report` | Official (`get_variable_defs`) | Figma → code (read) |
| `/check-parity` | Official (`get_design_context`) | Figma → code (read) |
| `/connect` | Official (`get_code_connect_map`, `send_code_connect_mappings`) | Bidirectional |
| `/deploy-annotate` | Official (`post_comment`) | Code → Figma |
| `/sync-to-figma` | Console (`figma_batch_create_variables`, `figma_setup_design_tokens`) | Code → Figma |
| `/figma-push` | Console (`figma_capture_screenshot`, `figma_set_image_fill`) | Code → Figma |
| `/sync` | Both | Bidirectional |
| `/design-to-code` | Both | Bidirectional |
| `/figma-inspect` | Desktop Bridge (`mcp__figma-desktop__*`) preferred, Official fallback | Figma → code |

---

## What Console MCP can do that Official cannot

- Batch variable create/update (100 per call)
- Design system health scoring and hardcoded value detection
- Bidirectional token sync (DTCG canonical format) with diff-aware merging
- AI-generated component documentation (`figma_generate_component_doc`)
- Real-time selection monitoring and document change events
- `figma_execute` — run arbitrary Plugin API code in the open Figma file

## What Official MCP can do that Console cannot

- Code Connect (component↔code mapping with AI suggestions)
- Framework-specific code output (React, Vue, etc.)
- Capture any live URL as a Figma layer (`use_figma` with web URL)
- Create FigJam diagrams from Mermaid syntax
- Create new blank Figma files

---

## Setup checklist

**Official Figma MCP** — registered in `~/.claude.json` or project MCP config. Needs Figma OAuth (one-time login).

**Figma Console MCP** — registered in `~/.claude.json`. Needs:
1. `FIGMA_ACCESS_TOKEN` env var set to a Figma Personal Access Token
2. Figma Desktop open with the target file
3. Desktop Bridge relay running (handled by the MCP server automatically)

If Console MCP tools return errors about "no open file" or "bridge not connected", open Figma Desktop and reload the plugin.

---

## The pattern: use both

Read from Figma with the Official MCP. Write to Figma with Console MCP. This is the pattern every Systemix skill that does bidirectional sync follows — and it's why both MCPs are registered in every project's config.
