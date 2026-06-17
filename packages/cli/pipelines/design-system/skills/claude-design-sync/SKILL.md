---
name: claude-design-sync
description: Sync a Claude Design output into the repo's design system. Takes a Claude Design share link OR an exported HTML/code bundle, extracts the tokens (color, type, spacing, radius) and component styles, and proposes them as design/tokens.css + design/DESIGN.md updates via a reviewable PR (HITL). Code-first — the repo stays the source of truth. No Figma required.
argument-hint: <claude-design-url-or-export-path>
---

# /claude-design-sync — Claude Design → repo

Bring a Claude Design system into this repo as code: $ARGUMENTS

## Usage
```
/claude-design-sync https://claude.ai/design/<share-link>
/claude-design-sync ./exports/my-design.html      # an exported self-contained bundle
/claude-design-sync                                # prompts for a link or a description
```

## What this does
Claude Design produces a design system as a share link or a self-contained HTML/code
export. This skill extracts the visual decisions and writes them into the repo's
**code-first** source of truth — `design/tokens.css` — and updates `design/DESIGN.md`,
as a reviewable PR. The repo, not the design tool, stays canonical.

## Steps

### Step 1 — Get the design source
- **Share link** → fetch the page (WebFetch / the browser tools). Claude Design serves a
  self-contained bundle with inlined styles/fonts.
- **Export path** → read the local HTML/code bundle.
- Neither provided → ask for a link or a description.

### Step 2 — Extract the design decisions
Parse the source for:
- **Color** — the palette + semantic roles (background, foreground, primary, muted, border, …).
- **Typography** — font families and the size / weight / line-height scale.
- **Spacing & radius** — the base unit + scale and corner radius.
- **Component styles** — notable per-component values (button, card, input) to inform the guardrails.

### Step 3 — Map to the canonical token set
Diff the extracted values against the existing `design/tokens.css` (convert to oklch where possible):
- **New** — a token the design introduces.
- **Changed** — an existing token whose value the design changes (show old → new).
- **Unchanged** — skip.

Present a table: `token · current · proposed · status`.

### Step 4 — Propose the change (HITL)
- Write the proposed `design/tokens.css` (`:root` / `.dark`).
- Update `design/DESIGN.md` — record the source ("synced from Claude Design <date/link>") in the
  Memory / decision log, and adjust the brief if the visual direction shifted.
- If the design implies new rules, propose an edit to `design/guardrails.mdx`.
- **Open a PR / show the diff and wait for approval before writing.** Token changes follow the
  autonomy dial; guardrail changes are always HITL.

### Step 5 — Report
- Tokens added / changed / unchanged; files touched (`design/tokens.css`, `design/DESIGN.md`, maybe `design/guardrails.mdx`).
- Next: `/drift-report` to find code still using the old hardcoded values; `/init-experiment` to validate the new direction.

## Notes
- Claude Design has no token-export API — this skill extracts from the share link or the exported
  bundle, so it works with whatever Claude Design hands off.
- **Code-first + UI-library-agnostic**: it writes `design/tokens.css`; your components reference those
  tokens however your stack consumes CSS variables (shadcn, Tailwind, vanilla CSS).
- The reverse direction (repo → a design tool) is the optional Figma adapter, not this skill.
