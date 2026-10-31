# G-003 · plan

The plan is `docs/feature/ai-native-ds-kit-beta/repo-review.md` § 3, phases 1–3, approved on 2026-10-31.
Hub and System are skipped: no UI frames and no design-system change.

| PR | Fixes | Closes |
|---|---|---|
| 1 · safe to merge | 1 design collection limited · 2 /kit redirected, prices in docs · 3 /api/subscribe deleted · 4 production refuses local routes, no server paths · 5 decision logs synced · 6 CI checks · 7 plugin version from the CLI | E1, E2, E3, E10 (part) |
| 2 · safe to publish | 8 settings never wiped · 9 update asks and pins · 10 keys 0600 · 11 init without Figma, asks before workflows, sets up the loops · 12 no overwrites, honest scan header · D1 free score local | E4, E5, E6, E9 |
| 3 · the agent never rules | the read routes of the hosted control plane refused on production (E3) · 13 no self-approval tool · 14 no direct close · 15 `systemix experiment ack`, no click-approve · 16 role holders checked · 17 unshipped references fail the build · D4 Supabase out | E3, E7, E8, E10 |

## Decisions for you
- npm publish of 0.3.0 after PR 2 (yours). Done 2026-10-31: 0.3.0 is `latest`, its 151 files match commit a6eb48e0 file for file; 0.2.0 is deprecated ("unsafe: can overwrite ~/.claude.json; upgrade to 0.3.0").

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

- PR 3: E3 closes. On production the read routes that serve repo state answer 404 (bundle, events/stream, hitl, queue, run/[id], run/[id]/stream, runs, state/*, token-guard/runs, workflows, workflows/[id]), and /config shows "Home runs on your machine" with the command. /api/instance stays: the contract pages' status strip reads it, and it serves counts only (a test checks it carries no path and no email).
- PR 3: E7 closes. The MCP server has no tool that resolves a card or closes an experiment (removed: resolve_hitl_task, experiment_close). `systemix experiment ack <card|experiment> [--decline] [--note] [--by]` is the typed ruling: it records `human:<name>` and `typed: true`, and refuses "claude", "agent", "auto" and any "[bot]" name. The local hub (`systemix app`) lost its Approve/Decline buttons: POST /api/queue/:id/resolve answers 410 with the command to type, and the queue page shows it. `loops check` refuses a decision line whose person does not hold the role, a deputy who does not hold the role's deputy role, and any line ruled by the agent.
- PR 3: E8 closes. The plugin build fails when a shipped skill names a skill or `systemix` command the plugin does not ship, naming the file and the reference. Four references in the pipeline skills (/hermes, /workflow-artifact, /sync-to-figma, /init-experiment) and `systemix design feed` are rewritten for the plugin only; the CLI's copies keep them, since the CLI ships those skills.
- PR 3: D4 done in code: Supabase is out of the MCP server (dual-write and client deleted) and the site (two routes, the realtime-config route and three unused hooks deleted). The `supabase` field of the old user config schema (src/lib/state/user-config.ts) stays until G-004 prunes that file.
- PR 3: deviation. The POC's own Next dashboard (/config on localhost) still approves a card with a click (PATCH /api/queue): its approval runs the write-backs (contract decision, learning, scaffold) that `ack` does not. It is local only (refused on production) and the agent has no tool for it, but a browser-driving agent could click it. It goes with G-004 (one model: the hub), which retires this dashboard.
- PR 3: E10 passes. PR #132 merged on 2026-10-31 (merge commit 94f1dce8); ci.yml ran green on main and the production deploy succeeded.

## Tested · not verified
- PR 2: `/systemix:score` run by Claude itself in a logged-in Claude Code (this sandbox has no login); the tool and the scan were tested directly.
- PR 1: the new CI steps run for the first time on this branch's PR.
