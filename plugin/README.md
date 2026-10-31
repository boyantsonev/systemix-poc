# Systemix plugin for Claude Code

Can your AI agents follow your design system? This plugin scores it, free, in a few minutes, and
tells you what to fix first.

## Install

```
/plugin marketplace add getsystemix/systemix
/plugin install systemix@systemix
```

Then, in your repo: `/systemix:score`.

## What you get

| Command | What it does |
|---|---|
| `/systemix:score` | Your AI-readiness score out of 100 and per area (free). With a license key: every caveat that costs points, biggest first, with one recommendation each. |
| `/systemix:readiness-audit` | The long-form readiness audit, scored from the same published rubric. |
| `/systemix:design-audit` | Zero-setup audit: de-facto tokens, drift, duplicate components, a proposed `design/` starter. |
| `/systemix:drift-report` | Hard-coded colours, spacing and type that should use your tokens. |
| `/systemix:design-interview` | Set up a design system from scratch through a short interview. |
| `/systemix:claude-design-sync` | Bring a Claude Design output into your tokens, as a reviewable change. |
| `/systemix:loops` | Where every goal is in the product and build loops, and who it waits on. Sets the loops up in a repo that has none. |
| `/systemix:goal <one sentence>` | Open a goal: the agent writes the brief and the evals (what must be true for "done"), then stops for a person. |
| `/systemix:next [G-NNN]` | The agent's steps, up to the next person: pictures, plan, prototype, system, code, tests, measurement. |
| `/systemix:gate approve\|rework\|drop` | A person's ruling at a gate, written as a decision line. Only a person can run it. |
| `/systemix:decide <loop.step>` | The brief before a gate, so a deputy decides from the same facts. |

## The loops

A goal is one sentence a person types. The **product loop** turns it into a brief and
evals, then pictures, scored and validated. The **build loop** turns a validated
design into a plan, a prototype in real component code, design-system changes
(the design sprint), the product on a branch, tests, a release and a measurement.
Every gate waits for a person; the agent prepares, never rules. State lives in
`design/loops/`, `design/goals/`, `design/context/` and `design/briefs/` as plain
markdown, checked by `systemix loops check`.

Every audit is read-only. Anything the plugin would write into your design system is proposed first and waits for your yes.

## Your code stays on your machine

The scan runs locally and is deterministic: the same code always gives the same numbers, with no AI
judgement in them. The free score is computed on your machine; nothing is sent. Only the full
report needs the service: `/systemix:score` then sends the results file to
`https://getsystemix.vercel.app/api/report`, and only after you say yes. The file holds numbers,
counter definitions, file and folder paths, and short identifiers such as token names. It holds no
source code. Ask for redacted paths and every file name is replaced by a hash. The service keeps no
copy of the file; it records one anonymous count per request (score band, size band, whether paths
were redacted) for its own analytics, with no names, paths, keys or IP addresses. The other skills
make no network calls.

## The full report

The score is free. The full quick report is a one-off purchase at
[getsystemix.vercel.app/report](https://getsystemix.vercel.app/report?utm_source=plugin&utm_medium=readme). Put the license key into the
plugin settings (`/plugin configure systemix@systemix`), never into the chat. It is kept in your
system's secure storage.

## License

MIT. The plugin is generated from [boyantsonev/systemix-poc](https://github.com/boyantsonev/systemix-poc)
(`packages/cli/scripts/build-plugin.js`); change the sources there, not the generated files.
