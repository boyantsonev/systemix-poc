---
name: document
description: Fill component doc skeletons in docs/components/ from the real component source — props tables, usage, states, deviations. Use when documenting a component, filling doc skeletons after `systemix docs new`, or refreshing a doc that drifted from its source. Proposes edits as diffs (HITL) — never mass-rewrites.
argument-hint: [component-slug]
---

# /document — Fill Component Doc Skeletons

Document: $ARGUMENTS

## Usage
```
/document              # pick the next status:skeleton doc from the manifest
/document button       # fill docs/components/button.md specifically
```

## Steps
1. **Read the inventory** — `docs/manifest.json` (the agent entry point). If it's
   missing or stale, run `npx @getsystemix/cli docs sync` first.
2. **Pick the doc** — the component the user named ($ARGUMENTS), else the
   `status: skeleton` entries. Work one component at a time.
3. **Read the truth, in precedence order** (see `docs/README.md`):
   - the component **source** (the `source` path in the frontmatter) — canonical
     for props and behavior;
   - the **reference** (the `reference` path), if present — design intent and
     "why"; never copy values from it;
   - `docs/components/_template.md` — the body-section contract.
4. **Write the body sections** from what you read (never invent):
   - *What & when* — one or two direct sentences;
   - *Props* — a table built from the REAL props in the source (name, type, default, notes);
   - *Usage* — a minimal working snippet with the real import path;
   - *States & variants* — variants/sizes/states and which tokens carry them;
   - *Platform notes & deviations* — platform splits + accepted deviations, citing
     the experiment/decision that recorded them;
   - *Do & don't* — short imperatives.
5. **Keep the frontmatter intact** — the only permitted change is flipping
   `status: skeleton` → `status: ported` when the component has actually shipped.
6. **Verify** — run `npx @getsystemix/cli docs sync --check`; if it reports stale, run
   `npx @getsystemix/cli docs sync` and include the manifest in the same change.

## HITL
Propose every doc edit as a diff for human review — never mass-rewrite silently.
At ghost autonomy: one component per confirmation.

## Notes
- The docs ARE the inventory: to add a component, scaffold its doc
  (`npx @getsystemix/cli docs new <Name> --group <group>`) — never edit `manifest.json` by hand.
- When the doc and the source disagree, the source wins — regenerate the doc.
