# G-005 · plan

The plan is the recommendation accepted on 2026-11-12 (decisions.md): PR 1 the plugin, PR 2 the site.

| PR | What | Closes |
|---|---|---|
| 1 · the plugin | four commands; `systemix rules`; no MCP server, no license key | E1, E2, E3, E4, E5 |
| 2 · the site | free plugin, sponsor link, setup from a starting price; report, audit and report service removed | E6, E7 |

## Decisions made while building
- PR 1: the rules are data. A `script:` test carries its own pattern and target (`script: css /#[0-9a-f]{6}/`), so a brand changes a rule by editing `design/rules.md` alone; the helloBill kit hard-coded each brand's patterns in `check.py`. `systemix rules init|lint|check|eval` runs them, dependency-free, in the CLI and the plugin's scan.
- PR 1: the long pipeline skills (design-audit, design-interview, claude-design-sync, drift-report, readiness-audit) ship as reference guides inside the command that uses them (`skills/<command>/references/<guide>/guide.md`), unchanged in substance; the CLI keeps them as skills.
- PR 1: the loop's decision brief is `/systemix:loop decide`, not `brief`, so it does not collide with `/systemix:brief`.
- PR 1: `audit report` computes the whole report on the machine, caveats and recommendations included, and refuses the old `--key`, `--yes`, `--redact-paths` and `--dry-run` flags: there is no paid report to send to. The site's report service goes in PR 2.
- PR 1: the plugin's README and the site's command names already say the new commands, so nothing tells a user to run a command that no longer exists; the rest of the site waits for PR 2.
- PR 1: the sponsor link points at github.com/sponsors/boyantsonev, which the founder still has to switch on.

## Tested · not verified
- PR 1: the four commands run by Claude in a logged-in Claude Code on a real repo (E8, the founder's).
