---
name: figma-inspect
description: Inspect the currently selected node in Figma Desktop via the Dev Mode MCP bridge. Returns component name, properties, tokens, and layout details.
argument-hint: [optional: figma-url or node description]
---

Inspect the current Figma selection (or a specific node from $ARGUMENTS).

## Steps

1. **Resolve the target**:
   - If $ARGUMENTS contains a Figma URL: extract `fileKey` and `nodeId`
   - If $ARGUMENTS is empty: use `mcp__figma-desktop__get_design_context` or `mcp__claude_ai_Figma_Console__figma_get_status` to read the current selection in Figma Desktop
   - If neither works: ask the user to select a node in Figma and re-run

2. **Fetch design context** using `mcp__figma-desktop__get_design_context` (preferred — official Dev Mode bridge) or fall back to `mcp__claude_ai_Figma__get_design_context`

3. **Fetch a screenshot** using `mcp__figma-desktop__get_screenshot` for visual reference

4. **Output a structured inspection report**:

```
## [Component Name] — [Node ID]
Type: [FRAME | COMPONENT | INSTANCE | TEXT | ...]

### Properties
| Property | Value |
|----------|-------|
| Width    | ...   |
| Height   | ...   |

### Design Tokens Used
| Token | CSS Var | Value |
|-------|---------|-------|

### Layout
- Direction: [horizontal | vertical | none]
- Gap: [value]
- Padding: [top right bottom left]
- Alignment: [...]

### Variants / States
[List all variant properties and current values]

### Code Connect
[If a Code Connect mapping exists, show the mapped component and usage snippet]
```

5. **Flag any hardcoded values** not mapped to a Figma variable — these are potential drift risks

## Notes
- Requires Figma Desktop open and Dev Mode active (Shift+D) for the figma-desktop bridge
- Works best when a node is already selected in Figma
- Node ID format: always use `123:456` not `123-456`
