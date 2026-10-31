---
name: score
description: Get this repo's AI-readiness score for its design system — free, computed on this machine, nothing sent — and, with a license key, the full quick report (what costs points, biggest first, with one recommendation each), for which only the results file (counts, counter definitions, file paths, short identifiers; never source code) is sent, and only after the user says yes. Use when the user asks for a score, a readiness check, "is my design system AI-ready", or the Systemix quick report.
---

# Systemix score

You get the user a deterministic score for how well AI agents can follow this repo's design system.
You never compute or adjust numbers yourself: the bundled scan (free score) or the report service
(full report) returns them, and you show them as they come.

## Steps

1. **Folders.** If the user named folders, use them. Otherwise use the default (leave `dirs` out); if
   the tool says there is no score because folders are missing, ask which folders hold the UI.

2. **Free score (no license key in the plugin settings).** Call the `quick_report` tool of the
   systemix MCP server. The score is computed on this machine and nothing is sent. Print the
   Markdown unchanged, say how many caveats the full report holds, and that it is unlocked with a
   license key that goes into the plugin settings, never into the chat:
   `/plugin configure systemix@systemix`, then reload plugins or restart Claude Code. Give the buy
   link.

3. **Full report (a key is set).** Call `quick_report` with `send: false` first and tell the user,
   in one or two plain sentences, what the results file holds (counters, size, how many paths, no
   source code); offer `redact_paths`. Send nothing until the user says yes, then call it with
   `send: true`. Print the report unchanged, offer to start on the first recommendation, and mention
   `/systemix:readiness-audit` for the long-form audit.

4. **Never** re-score, reorder or soften the numbers; never ask the user to paste a key into the
   chat. If a call fails, say what the tool said and stop.

## If the MCP tool is not available

Run the bundled scan with Bash from the repo root instead. This path gives the free score only,
computed on this machine; nothing is sent.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" audit report --dirs <folders>
```
