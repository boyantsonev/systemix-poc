# /sync-docs

Keep the product docs in sync with the codebase. Run this at the start of a docs session or whenever you suspect docs have drifted from implementation.

---

## What this skill does

**Phase 1 — Product docs coverage**

1. Read `src/lib/docs-manifest.ts` and parse `docsManifest`.
2. For each entry where `external` is not true:
   - Check whether `content/docs/{slug}.mdx` exists on disk.
   - If the file is absent and the manifest shows `status: "missing"`, log it as still-missing.
   - If the file is absent but the manifest shows a different status, flag it as inconsistent.
3. For the `reference/skills` entry: compare the `mtime` of `src/lib/data/pipeline.ts` against `content/docs/reference/skills.mdx`. If `pipeline.ts` is newer, update the manifest status to `"stale"` and log a warning.
4. Print a coverage table:

```
Docs coverage — 2026-06-06
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
published  1
review     12
draft       0
missing     4
stale       0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total      17 entries
```

5. For each `missing` entry that has no open GitHub issue, print a `gh issue create` command ready to copy-paste (do NOT run it automatically — print it for the user to review first).

**Phase 2 — Manifest integrity**

1. Verify that every slug in `docsManifest` resolves to either:
   - An existing MDX file at `content/docs/{slug}.mdx`, OR
   - An `external: true` or `status: "missing"` entry.
2. Check that the `status` values in the manifest match what's on disk (e.g. if MDX exists but status is still `"draft"`, prompt to advance to `"review"`).
3. Report any inconsistencies clearly.

**Phase 3 — Client contract diff (optional, slow)**

Only run Phase 3 if the user explicitly requests `--include-contracts`. It requires the systemix MCP server to be running.

1. Use `mcp__systemix-mcp__contract_list_hypotheses` to list open hypothesis contracts.
2. Cross-reference with `src/lib/data/docs.ts` component entries.
3. If new contracts exist with no corresponding doc entry, print a suggested manifest addition.
4. Do NOT write to `docs.ts` automatically — print the diff for HITL review.

---

## Token-saving rules

- **Read only what you need.** Parse `docs-manifest.ts` with a single `Read` call. Do not read every MDX file unless you need to check `last-updated` frontmatter.
- **Skip Phase 3 by default.** The contract diff is expensive (MCP round-trips). Only run it when asked.
- **Cache the manifest parse.** Don't re-read `docs-manifest.ts` more than once per session.
- **Track last-run.** Check `.systemix/sync-log.json` for the previous run timestamp. If it exists and was less than 24 hours ago, summarize "Last sync: N hours ago — nothing changed" unless `--force` is passed.

---

## Output format

Always output the coverage table first. Then list issues found, grouped by severity:

- 🔴 **Blocking** — MDX file missing but status not `"missing"`, or stale manifest entry
- 🟡 **Needs attention** — Status mismatch (file exists but manifest shows `"draft"`)
- 🟢 **Info** — Missing pages with no open issue (print `gh issue create` command)

End with: **"Run `/sync-docs --include-contracts` to also diff client contracts."**

---

## Example session

```
/sync-docs

Docs coverage — 2026-06-06
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
published  1
review     12
draft       0
missing     4
stale       0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total      17 entries

🟢 4 pages still missing — no MDX file, no issue found:
  → concepts/instance-model
  → concepts/workflow-atlas
  → reference/mcp-server
  → reference/posthog

To create GitHub issues for these, run:
  gh issue create --title "Docs: concepts/instance-model" --label "docs,status:missing" ...
  (commands printed below — review before running)

✅ No stale entries detected.
✅ No manifest inconsistencies.

Run /sync-docs --include-contracts to also diff client contracts.
```
