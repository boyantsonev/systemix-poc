# systemix

The validation loop for teams shipping with agents — installed **per repo** as a
self-contained instance.

You ship a variant, measure it, decide, and the decision gets written back as
durable memory. Systemix is that loop: **ship → measure → learn → decide**, with
every experiment a plain MDX file in your repo and every closed decision a cited
line in `experiments/LEARNINGS.md`.

`npx @getsystemix/cli init` scaffolds an instance into your repo: the loop (`experiments/`)
plus the loop skills in **`.claude/skills/`** (project-scoped, committed,
CI-reproducible), and your topology in **`systemix.config.yaml`**.

## Quick start

```bash
# in your project root
npx @getsystemix/cli init
```

The wizard sets up your instance:

| # | Question | Result |
|---|----------|--------|
| 1 | **Design substrate** — scaffold a `design/` folder, point at an existing design system, or skip | optional `design/` + `design.source` in config |
| 2 | **Signal** — wire PostHog now, or skip (experiments still run without it) | `signals.posthog` in config |
| 3 | **First experiment** — ICP · JTBD · hypothesis · the AI workflow that tests it · the metric | `experiments/<id>.mdx` |

The **loop installs always**; the design system is an optional, pluggable substrate.
After init you have:

```
experiments/
  <id>.mdx          ← your first experiment
  LEARNINGS.md      ← compounding memory; a cited line lands on every close
  goals/            ← the KPIs experiments roll up to
.claude/skills/     ← the loop skills, installed project-scoped
systemix.config.yaml
```

Commit `experiments/`, `.claude/skills/`, and `systemix.config.yaml` so the instance
is reproducible in CI.

## Three doors over the same files

The loop is plain MDX you own; drive it however fits your stack — all three read and
write the same `experiments/` files:

- **Claude Code skills** — `/init-experiment` → `/write-variants` → `/measure` →
  `/close-experiment` (human-in-the-loop).
- **CLI** — `systemix experiment new|list|measure|close|learnings|audit` (scriptable in CI).
- **MCP** — `experiment_*` tools, so any agent or AI client can call the loop.

## Commands

```bash
npx @getsystemix/cli init [--reconfigure]    # setup wizard (--reconfigure overwrites config)
npx @getsystemix/cli experiment <sub>        # drive the loop: new | list | measure | close | learnings | audit
npx @getsystemix/cli evidence check          # verify PostHog is wired + collecting
npx @getsystemix/cli config show             # print the active instance topology
npx @getsystemix/cli list                    # installed skills + available workflows
npx @getsystemix/cli doctor                  # health check (skills, MCP server, signals)
npx @getsystemix/cli sync [--dry-run]        # design-token sync (optional design substrate)
npx @getsystemix/cli tokens                  # convert globals.css → tokens bridge cache
npx @getsystemix/cli audit counters [dir…]   # deterministic audit counters as JSON (see "Audit counters")
npx @getsystemix/cli audit report [dir…]     # the paid quick report (see "Quick report")
npx @getsystemix/cli drift scan [dir…]       # raw colour / px tally + clean-file score (timeline snapshot)
npx @getsystemix/cli update                  # check + apply npm / skill-pack updates
```

## Audit counters

```bash
npx @getsystemix/cli audit counters --dirs src [--groups colour,tokens] [--out report.json] [--pretty] [--summary]
```

One deterministic JSON report of the repo's design system: files, tokens, colour and type literals, primitives,
reachability, guardrails, docs, decisions, drift habit, agent legibility. Same tree and commit, same bytes; no
model, no network, nothing written, no dependency to install. Every number carries its unit, regex, file set and
a per-file breakdown. The audit skills are meant to quote it instead of recounting (their SKILL.md files do not
call it yet). What each counter means, how to read
one, the rule for skills, determinism, limits and versioning:
[`src/lib/counters/README.md`](src/lib/counters/README.md).

`npx @getsystemix/cli drift scan [dir…] [--dry-run] [--json]` is the same population with the cheap tally
(colour literals and raw px, a clean-file score) and appends a snapshot to `.systemix/drift-history.json`.

## Quick report

```bash
npx @getsystemix/cli audit report --dirs src                 # shows what would be sent, sends nothing
npx @getsystemix/cli audit report --dirs src --key <license key> --yes --out report.md
```

The scan runs on your machine. Only the results file (the `audit counters` JSON: counts, counter
definitions, file and folder paths, and short identifiers such as token names) goes to the Systemix
report service, never your source code, and only when you pass `--yes`. `--redact-paths` replaces every
file and folder name with a hash first (the score is the same). `--dry-run --payload-out file` writes
the exact payload so you can read it. The report is deterministic: a score out of 100 from the same
rubric the audit skills publish, a score per area, the caveats that cost the most points, and one
recommendation for each. The service keeps no copy of the file; it records one anonymous count per
request (score band, size band) for its own analytics, with no names, paths or keys.

## How it runs

- **Engine = Claude Code.** Synthesis, decisions, and the write-back run in Claude
  Code — no API key juggling, no local model required. (An air-gapped local-model
  mode is a deferred roadmap option, not a dependency.)
- **Local-first, no platform.** Experiments are MDX in your repo (`experiments/**`);
  the HITL queue and run state live under `.systemix/`. No database to run the loop.
- **Ghost by default.** Instances start at **ghost** autonomy — the engine proposes
  every write as a decision card; nothing lands without a human approve.
- **MCP server** exposes the loop (and any design substrate) to Claude Code / Cursor,
  so coding agents read what's been tested before they ship.

## Connect a signal (optional but recommended)

Experiments author and run with no data source — they just can't *measure* until a
signal is wired. Today the adapter is **PostHog**; run `/connect-signal` after init
to wire the capture key + reverse proxy, verify with `systemix evidence check`, then
flip `signals.posthog.enabled` on. The `signals.<source>` block is the pluggable seam
for future sources.

## Requirements

- Node.js ≥ 18
- Claude Code (or any MCP-compatible client)

Learn more: https://getsystemix.vercel.app
