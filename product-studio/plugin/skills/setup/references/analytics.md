# Optional: connect an analytics source

The loop's measure step can read numbers from an analytics tool. This is optional: everything
else works with no analytics, and a goal with no source is recorded as "not measured", honestly.
Read this only when the person asks to connect one.

## The rules

- **Keys never go in files.** They live in environment variables locally and in CI secrets.
  The studio stores only the names of those variables.
- **Nothing is sent anywhere by the studio.** `evidence check` makes no network call; it only
  checks the variables are set.
- **Capture code is the vendor's job.** Point the person to the vendor's own install guide or
  skill for adding tracking to the app.
- Ask where the data is hosted (region, self-hosted or cloud). Never assume one.

## 1. Choose the source

Ask which tool the team uses. PostHog is the worked example below; any other tool uses
`"source": "other"` and the same three variable names.

## 2. Name the variables

Agree on three names with the person, and set the values themselves, outside this chat:

| Field | Holds the name of | PostHog example name |
|---|---|---|
| `hostEnv` | the API host for the team's region or self-hosted instance | `POSTHOG_HOST` |
| `keyEnv` | a read key for queries (a personal or server key, never the browser capture key) | `POSTHOG_API_KEY` |
| `projectEnv` | the project id | `POSTHOG_PROJECT_ID` |

PostHog has two kinds of key. The capture key goes in the browser bundle and is public. The
key in `keyEnv` reads data and is secret. Mixing them up is the most common reason for
"connected, but 0 events".

A note per framework, for the capture key only (the read key never goes in the bundle):

- Next.js: a browser variable needs the `NEXT_PUBLIC_` prefix and is inlined at build time,
  so a change needs a fresh build without the build cache.
- Vite: the prefix is `VITE_`, also inlined at build time.
- A server-only app: plain environment variables; restart to pick up a change.

## 3. Propose the config

The config is `studio/.state/analytics.json`, with names only:

```json
{ "source": "posthog", "hostEnv": "POSTHOG_HOST", "keyEnv": "POSTHOG_API_KEY", "projectEnv": "POSTHOG_PROJECT_ID" }
```

Show it and write it only after a yes. If the team commits `studio/.state/`, this file is safe
to commit: it holds no values.

## 4. Verify

```
node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" evidence check --json
```

It prints `{connected, source, problems[]}`. Quote `problems` as printed. A missing variable
exits non-zero with a message naming it: the person sets it, then you run the check again. Say
"connected" only when the JSON says `connected: true`.

## 5. In CI

If the loop's measure step runs in CI, the same three names go in as repository secrets,
set by the person. Never echo a secret's value in a log or a reply.

Return to the guide that sent you here for the reply and the run-log row.
