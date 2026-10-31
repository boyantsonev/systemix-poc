# @getsystemix/app

The systemix **per-instance local app** — your design system as contextual
infrastructure, for humans and agents:

- **Docs** with a global Human/Machine switch (rendered prose + live preview
  iframes vs the raw manifest/frontmatter an agent reads)
- **Design system** — `design/DESIGN.md` overview + `design/guardrails.mdx`
  (`GET /api/design`)
- **Tokens** (canonical CSS parsed to swatches · raw + generated values)
- **Skills & workflows** — what's installed in `.claude/skills/` +
  `.claude/workflows/` (`GET /api/skills`, viewer only)
- **Experiments** + LEARNINGS (the instance memory)
- **HITL queue** — the decision cards (reads both `.systemix/queue.json`
  and `.systemix/hitl-queue.json`), each with the command a person types to
  rule on it: `npx @getsystemix/cli experiment ack <id> [--decline]`

It is a *viewer over the same files* the skills, CLI and MCP use — three-doors
parity, no state of its own. It never rules: there is no approve button, so a
click (by a person or an agent driving the browser) can never be the ruling.

**The app wears the instance's skin**: `/api/home` resolves the semantic
aliases (background/foreground/card/border/ring/…) from the instance's
`design/tokens.css` for both `:root` and `.dark` scopes, and the UI maps them
onto its own palette (sun/moon toggle in the header switches scope). No tokens
file → the default warm-paper look.

**Buddy checklist**: `/api/home` also computes an ordered `setup` checklist
(config → context → tokens → DESIGN.md → guardrails → docs manifest → first
experiment → signals → drift scan → previews); Home renders it as guided next
steps with copyable commands, and every empty state reuses the same phrasing.

```bash
npm i -D @getsystemix/app
npx @getsystemix/cli app          # http://localhost:4400
```

Component previews: set in `systemix.config.yaml`
```yaml
app:
  preview:
    url: "http://localhost:3000"  # your dev server
    per_slug: true                # iframe <url>/preview/<slug> per component
```

Dev: `npm run build` (Vite → dist/ui), `npm run serve -- --project-root <instance>`.
