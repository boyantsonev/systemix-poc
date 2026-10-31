# G-003 · plan

The plan is `docs/feature/ai-native-ds-kit-beta/repo-review.md` § 3, phases 1–3, approved on 2026-10-31.
Hub and System are skipped: no UI frames and no design-system change.

| PR | Fixes | Closes |
|---|---|---|
| 1 · safe to merge | 1 design collection limited · 2 /kit redirected, prices in docs · 3 /api/subscribe deleted · 4 production refuses local routes, no server paths · 5 decision logs synced · 6 CI checks · 7 plugin version from the CLI | E1, E2, E3, E10 (part) |
| 2 · safe to publish | 8 settings never wiped · 9 update asks and pins · 10 keys 0600 · 11 init without Figma, asks before workflows, sets up the loops · 12 no overwrites, honest scan header · D1 free score local | E4, E5, E6, E9 |
| 3 · the agent never rules | the read routes of the hosted control plane refused on production (E3) · 13 no self-approval tool · 14 no direct close · 15 `systemix experiment ack`, no click-approve · 16 role holders checked · 17 unshipped references fail the build · D4 Supabase out | E7, E8, E10 |

## Decisions for you
- npm publish of 0.3.0 after PR 2 (yours).

## Decisions made while building
- PR 1: verified — the Vercel preview of 6b4f8290 built and deployed (status: success), so `next build` passes without /kit and /api/subscribe.
- PR 1: the design collection's file list is a module constant, not an export: fumadocs-mdx refuses any export from source.config.ts that is not a collection (it broke the generator; caught by running it). CI now runs `npx fumadocs-mdx`.
- PR 1: E3 stays open. Write routes refuse on production and /api/subscribe is gone, but the read routes that feed the hosted control plane (/api/queue, /api/hitl, /api/instance, /api/runs, /api/run/[id], /api/workflows) still answer there; they close with the control plane's removal (D2), pulled into PR 3.
- PR 1: the plugin's version comes from packages/cli/package.json at build time; plugin-src/plugin.json carries none.

- PR 2: the Claude Code registration stays where it was (~/.claude.json); it can no longer destroy the file. Moving it to the project's .mcp.json changes behaviour for existing users, so it goes to G-004.
- PR 2: `init` sets up the product and build loops only when it scaffolds design/; with an existing or no design system it prints `loops init` instead of creating design/.
- PR 2: `update` reports by default and applies only with `--yes`; third-party packs are fetched only with `--packs`, pinned to commit 807fcc1c.
- PR 2: the skills keep their fixed /tmp report paths (the blind runs depend on them; the operator can name another path).
- PR 2: the report service still answers a keyless request with the free score, for older CLIs; the plugin and this CLI no longer send one.
- PR 2: init's prompt order changed (two Figma questions gone, one engine question at the end): 13 init tests updated to the new order; the three Figma-input tests replaced by one that asserts init asks no Figma question.

## Tested · not verified
- PR 2: `/systemix:score` run by Claude itself in a logged-in Claude Code (this sandbox has no login); the tool and the scan were tested directly.
- PR 1: the new CI steps run for the first time on this branch's PR.
