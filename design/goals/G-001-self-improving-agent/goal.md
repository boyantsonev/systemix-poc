---
id: G-001
slug: self-improving-agent
title: Systemix as a self-improving design system agent — one Claude Code plugin that runs the product and build loops, publishes its pictures, serves a local design hub and learns from what it measures
asked: "lets analyse what we need to make systemix the self improving agent (deployable through claude code as plugin) having artifacts and localhost deployed design hub"
status: open
step: product.evals
waiting: reviewer
lead: design-lead
repos: [systemix-poc]
opened: 2026-10-31
updated: 2026-10-31
---

# G-001 · Systemix as a self-improving design system agent

## The goal, as asked

> "lets analyse what we need to make systemix the self improving agent (deployable through
> claude code as plugin) having artifacts and localhost deployed design hub"

## How I read it

**A. One plugin, everything local (recommended).** The plugin is the agent. It runs the
product and build loops (shipped in this change), draws pictures that are published as
claude.ai artifacts and served by a local design hub, keeps the system from rotting while
the agent writes UI (a drift guard hook), measures shipped builds (the Systemix score plus
PostHog through PostHog's own plugin), and improves itself only through proposals a person
approves. Cost: about 2–3 weeks of build loop, in 6–8 reviewable PRs. Fits the pitch's
three pillars and the code-never-leaves promise.

**B. A hosted agent.** Systemix runs on a schedule in the cloud against the customer's repo
and opens pull requests, the way PostHog's "Self-driving" does. Cost: much higher (hosting,
secrets, repo access, security review) and it overlaps PostHog's product directly. Not
before a buyer asks for it.

**C. Just the hub.** A goals and loops board in the local app, without hooks, measurement or
self-improvement. Cheap (about 3 days) but it does not make Systemix self-improving.

I recommend **A**. The existing daily and weekly crons stay as the opt-in scheduled path;
B stays out until the G1 interviews show demand.

## For whom

First the founder, on this repo (it runs on its own loops). Then the ICP hypothesis: 2–20-person
product teams that ship UI with Claude Code, and design-system maintainers (`wave-decisions.md DSC-9`).

## In / Out

**In**
- The loops as plugin skills (`/systemix:loops`, `goal`, `next`, `gate`, `decide`) — shipped in this change
- `/systemix:hub`: the local design hub launched from the plugin, with new views for goals (step, waiting), loops, briefs, artifacts and evaluations
- Pictures: one source file per picture in `design/artifacts/`, published as an artifact when the session can, always served by the hub
- A drift guard hook: after the agent edits UI files, the bundled scan flags new raw values before the turn ends
- `/systemix:init`: deploy a design system and the loops in a repo that has neither, file by file, ghost mode
- Measurement at `build.measure`: the Systemix score and counters, plus PostHog numbers through PostHog's plugin or MCP when installed
- Self-improvement: `product.learn` writes the learning and proposes the next goal; a change to Systemix's own skills arrives as an approval card and ships only after its plugin evals pass

**Out**
- A hosted or cloud runner (reading B)
- Error-to-pull-request fixing and session-replay fixes: PostHog Self-driving does these; Systemix reads its signals instead
- Figma, team accounts, billing changes

## What is already true

- The product and build loops, their checker and five plugin skills exist and pass 14 checker tests and 13 plugin tests `packages/cli/src/lib/loopkit.js`, `packages/cli/tests/acceptance/loops/loops.test.js`, `packages/cli/tests/acceptance/plugin/plugin.test.js`
- The plugin validates with `claude plugin validate --strict` and installs from this repo's marketplace `.claude-plugin/marketplace.json`
- A local app already serves docs, tokens, experiments and the approval queue on port 4400; it needs `gray-matter` and `yaml`; its UI is prebuilt (204 KB) `packages/app/README.md`, `packages/app/package.json`
- Claude Code installs a plugin's npm dependencies when the plugin root holds `package.json` and a lockfile (registry packages only, no install scripts, 60 s limit) `docs/feature/ai-native-ds-kit-beta/funnel-plan.md § 8`
- Plugins can ship hooks (`hooks/hooks.json`), MCP servers and settings that ask the user for values; claude.ai chat ignores hooks and local MCP, Claude Code runs all of them `funnel-plan.md § 8`
- PostHog has an official Claude Code plugin and a hosted MCP (EU: `mcp-eu.posthog.com`) with insights, flags, experiments, surveys and a "signals" inbox; its Self-driving beta turns signals into pull requests for review (PostHog docs, read through search summaries; not verified verbatim)
- Keep-from-rotting is deterministic: 18 blind runs gave the same score `docs/feature/ai-native-ds-kit-beta/launch-review.md § 1`
- Interviews for the G1 gate: 0 of 5; decision memory has no demand evidence either way `wave-decisions.md DSC-13`

## Risks

- **Building ahead of evidence.** G1 is still 0 of 5 interviews. Every week of build loop is a week the problem is not tested with buyers. Mitigation: dogfood only, and run the interviews in parallel.
- **The hub's dependencies.** Shipping it inside the plugin depends on Claude Code's lockfile install; if that fails offline, the hub does not start. Mitigation: vendor the two small parsers, or keep `npx @getsystemix/app` as a fallback.
- **Self-modification.** An agent that changes its own skills can drift. Mitigation: proposals only, always approved by a person, and the plugin evals as the gate (`CLAUDE.md § Model`).
- **Who is ruling.** The gate reads `git config user.name`; in a cloud session that is the agent's name, not the founder's. Mitigation: the gate asks who is ruling when the name is not in the roster.
- **Surfaces differ.** Artifacts publish only where the session has the artifact tool; claude.ai chat cannot run hooks or the local hub.
- **Cost of evals.** `claude plugin eval` runs real model calls; budget them.

## Questions for the gate

1. Reading A, B or C? — I would take **A**.
2. Should the hub ship inside the plugin (dependencies installed by Claude Code), or stay an npm package the plugin launches? — I would ship it **inside**, with the npm package as fallback.
3. PostHog: declare PostHog's own plugin as a recommended companion and read through its MCP, or call PostHog's MCP from Systemix's own server? — I would **recommend PostHog's plugin** and read through it, so Systemix never holds a PostHog key.
4. In v1, may the agent propose changes to its own skills (approval cards, gated by evals)? — I would say **yes, proposals only**.
5. Pictures: is the source file in the repo the master, with the artifact as its published copy? — I would say **yes**, as the loop kit says.
