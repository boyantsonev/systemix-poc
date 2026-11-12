# Systemix plugin for Claude Code

The design system agent for Claude Code. It sets up your design system as files your agents read,
gives them the rules before they build, checks their work against those rules, and runs a goal
from one sentence to shipped with a person at every gate. Free and open source (MIT).

## Install

```
/plugin marketplace add boyantsonev/systemix-poc
/plugin install systemix@systemix
```

Then, in your repo: `/systemix:setup`.

## Four commands

| Command | When | What you get |
|---|---|---|
| `/systemix:setup` | Once, to start | `design/DESIGN.md`, `tokens.css`, `guardrails.mdx` and `rules.md` (every rule as a row an agent can check), built from the code you ship, from a short interview, or from a Claude Design output. Every file is proposed and written only after your yes. |
| `/systemix:brief` | Before you build | One screen: the rules that apply, the tokens and components to start from, what was already decided, and what the work will be checked against. |
| `/systemix:check` | Before review | Pass, pass with flags or fail, with each problem's rule ID, where it is and the fix. `--score` gives your AI-readiness score out of 100, `--drift` what has drifted from your tokens, `--deep` the long readiness audit. |
| `/systemix:loop` | To run a goal | Goal and evals → pictures → prototype → design-system changes → code → tests → release → measurement, stopping at every gate for a person. Only you run it: a gate is your ruling. |

## Rules as data

`design/rules.md` holds every design, brand, voice and legal-copy rule as one table row: an ID,
the surfaces it covers, `block` or `flag`, where it was decided, and a test. A test is either
`script: <copy|css|html|code|any> /pattern/`, which the check runs, or `review: <question>`, which
a person or the agent answers by looking. Change a rule there and every command reads the new one;
no skill keeps its own copy. Each scripted rule has a known-bad sample in
`design/evals/rules/known-bad/`, and `systemix rules eval` proves the check catches every one.

## Nothing leaves your machine

Everything runs locally: the scan is bundled with the plugin, nothing is downloaded at run time,
and nothing is sent anywhere. The score is deterministic: the same code always gives the same
numbers, with no AI judgement in them.

## Support it

The plugin is free. If it helps, you can [sponsor the work](https://github.com/sponsors/boyantsonev).
Want it set up for your product, rules and all? [Get in touch](https://getsystemix.vercel.app/#setup).

## License

MIT. The plugin is generated from [boyantsonev/systemix-poc](https://github.com/boyantsonev/systemix-poc)
(`packages/cli/scripts/build-plugin.js`); change the sources there, not the generated files.
