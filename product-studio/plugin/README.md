# Product studio

An AI-native product studio for Claude Code. It keeps your product's design system, its rules and
its decisions as files in your repo. The coding agent reads them before it builds, code checks the
work against them, and a person makes every call that matters. It is for designers, engineers,
product managers and go-to-market teams working in the same repo. Free and open source (MIT).

## Install

```
/plugin marketplace add contextcraft/product-studio
/plugin install product-studio@contextcraft
```

Then, in your repo, type `check my design`. It works before anything is set up.

## The four jobs

| Job | Command | What you get |
|---|---|---|
| Set up your system | `/product-studio:setup` | Your design system as files, built from your code, from a short interview, from a design source (a Claude Design export, Figma variables, tokens.json) or from an older install. You get `studio/DESIGN.md`, layered `studio/tokens.css` in light and dark, and `studio/rules.md` with every rule as a row a check can run. A preview page lets you approve what you see. Nothing is written until you say yes. |
| Before you build | `/product-studio:brief` | One screen of the rules that apply, the tokens and components to start from, and what was already decided. |
| Review | `/product-studio:check` | Pass, pass with flags, or fail, rule by rule, with where each problem is and the fix. Add `--score` for a readiness score out of 100 (beta). |
| Ship and learn | `/product-studio:loop` | Takes a goal from one sentence to shipped and measured. It stops at every gate, the point where a person decides. Only a person runs it. |

`/product-studio:admin` is for whoever looks after the studio. Every run is logged on your machine. The
studio asks for a thumbs up or down now and then. `admin run` turns that log into at most three
proposals to improve the rules or the studio, and a person approves each one.

## Block or flag

Every rule in `studio/rules.md` is a `block` (fix it before review) or a `flag` (fix it, or say why
it is fine). A rule with a `script:` test is checked by code. A rule with a `review:` test is a
question that a person or the agent answers by looking. Each scripted rule has a sample of bad work
that the check must catch (`rules eval`). That is how you know you can rely on it.

## Nothing leaves your machine

The check, the score, the preview and the run log all run locally: no account, no key, no network.
Figma and analytics are optional sources. Without them the studio says "not connected" and carries
on.

## When you want a person

Setup and the score end with "Open questions for a person": the contradictions, canonical choices
and missing rules the studio won't decide for you. A designer can answer them with you.

## License

MIT. Built from `studio/` in its source repository; change the sources there, not this folder.
