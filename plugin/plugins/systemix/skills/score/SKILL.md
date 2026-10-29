---
name: score
description: Get this repo's AI-readiness score for its design system — free — and, with a license key, the full quick report (what costs points, biggest first, with one recommendation each). The scan runs locally; only the results file (counts, counter definitions, file paths, short identifiers; never source code) is sent, and only after the user says yes. Use when the user asks for a score, a readiness check, "is my design system AI-ready", or the Systemix quick report.
---

# Systemix score

You get the user a deterministic score for how well AI agents can follow this repo's design system.
You never compute or adjust numbers yourself: the report service returns them, and you show them as
they come.

## Steps

1. **Folders.** If the user named folders, use them. Otherwise use the default (leave `dirs` out).

2. **Show what would be sent.** Call the `quick_report` tool of the systemix MCP server with
   `send: false` (and the folders). Tell the user, in one or two plain sentences, what the results file
   holds: the number of counters, the size, how many file and folder paths, and that it contains no
   source code. Offer `redact_paths` (file names replaced by hashes; the score is the same).

3. **Ask before sending.** Send nothing until the user says yes. Then call `quick_report` with
   `send: true` (plus `redact_paths` if they asked for it).

4. **Show the result as it came back.** Print the report Markdown unchanged. Don't re-score,
   reorder or soften it.
   - **Free score** (it says "This is the free score"): say how many caveats the full report holds and
     that it is unlocked with a license key. The key goes into the plugin settings, never into the
     chat: `/plugin configure systemix@systemix`, then reload plugins or restart Claude Code, and run
     `/systemix:score` again. Give the buy link if the report has one.
   - **Full report:** offer to start on the first recommendation, and mention `/systemix:readiness-audit`
     for the long-form audit.

5. **If it fails,** say what the tool said (for example "the report service is not open yet") and
   stop. Never ask the user to paste a license key into the chat.

## If the MCP tool is not available

Run the bundled scan with Bash from the repo root instead. This path gives the free score only.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" audit report --dry-run   # what would be sent
node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js" audit report --yes       # after the user says yes
```
