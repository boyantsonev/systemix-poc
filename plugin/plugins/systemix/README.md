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

Every audit is read-only. Anything the plugin would write is proposed first and waits for your yes.

## Your code stays on your machine

The scan runs locally and is deterministic: the same code always gives the same numbers, with no AI
judgement in them. `/systemix:score` sends only the results file to the Systemix report service at
`https://getsystemix.vercel.app/api/report`, and only after you say yes. The file holds numbers,
counter definitions, file and folder paths, and short identifiers such as token names. It holds no
source code. Ask for redacted paths and every file name is replaced by a hash. The service stores
nothing. The other skills make no network calls.

## The full report

The score is free. The full quick report is a one-off purchase at
[getsystemix.vercel.app/report](https://getsystemix.vercel.app/report). Put the license key into the
plugin settings (`/plugin configure systemix@systemix`), never into the chat. It is kept in your
system's secure storage.

## License

MIT. The plugin is generated from [boyantsonev/systemix-poc](https://github.com/boyantsonev/systemix-poc)
(`packages/cli/scripts/build-plugin.js`); change the sources there, not the generated files.
