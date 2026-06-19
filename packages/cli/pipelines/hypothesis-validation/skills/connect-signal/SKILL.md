---
name: connect-signal
description: Connect a data source (PostHog today) so experiments can gather live evidence. Guides the wiring, verifies it with `systemix evidence check`, then flips the signal on in systemix.config.yaml. Run when you're ready to measure — experiments author + run without it.
disable-model-invocation: false
argument-hint: [source]
version: "0.1.0"
last_updated: "2026-06-18"
min_cli_version: "1.1.0"
---

# Connect a signal: $ARGUMENTS

## Purpose

An experiment authors and runs with **no** data source — but it can't *measure* until a signal is wired. This is the first-class "connect your signal" step. Today the only adapter is **PostHog**; the shape generalises — a future source (GA, a custom MCP) slots in behind the same `signals.<source>` config block.

Run this when you're ready to measure. If you skip it, experiments still run and render — they just gather no live evidence, and `/config` shows a "no signal connected" banner.

This is a conversation, not a form. Confirm each value before writing it.

## Steps

### Step 1 — Pick the source
Ask which source to connect. **PostHog** is the only adapter today — say so plainly. Everything below is PostHog. Confirm the project **region** (EU vs US); it sets the host. Systemix defaults to **EU** (data residency).

### Step 2 — The two PostHog keys (they are different)
Most "0 events" pain comes from confusing PostHog's two credentials:
- **Capture key** (`phc_…`) → the browser. Set as **`NEXT_PUBLIC_POSTHOG_KEY`**. It is **build-time inlined**, so it needs a fresh deploy (no build cache) to take effect.
- **Server / personal key** (`phx_…`) → evidence queries (the daily funnel pull + `evidence check`). Set as **`POSTHOG_API_KEY`**, alongside **`POSTHOG_PROJECT_ID`** and **`POSTHOG_HOST`** (`https://eu.posthog.com` for EU).

### Step 3 — Wire capture (the browser)
- No PostHog project yet? Create one (EU recommended): `npx @posthog/wizard --region eu` scaffolds capture + the reverse proxy, or create it in the PostHog UI and copy the `phc_` key.
- Set `NEXT_PUBLIC_POSTHOG_KEY` (`phc_…`) in the env / Vercel (Production scope), then **redeploy without build cache** (NEXT_PUBLIC vars are inlined at build — a cached redeploy won't pick it up).
- **Ad-blocker note:** capture runs through a same-origin reverse proxy (`/ingest` → PostHog EU) so trackers / DNS blockers can't drop events. This is already wired in `next.config` + `PostHogProvider` — don't point capture straight at `*.posthog.com`.

### Step 4 — Wire evidence queries (the server) + the cron
- Set `POSTHOG_API_KEY` (`phx_…`), `POSTHOG_PROJECT_ID`, and `POSTHOG_HOST` in `.env.local` (local) and as **GitHub Actions secrets** (the daily evidence cron reads them).
- Enable **Settings → Actions → "Allow GitHub Actions to create and approve pull requests"** so the evidence PR can open.

### Step 5 — Verify
Run:
```
systemix evidence check
```
It pings PostHog and counts `$pageview` events in the last 24h. Expect keys ✓, `✓ connected`, and — once traffic flows — a non-zero pageview count. If it connects but shows 0 events, capture isn't live in the deployed build: re-check `NEXT_PUBLIC_POSTHOG_KEY` is set in Production and redeploy without cache.

### Step 6 — Flip the signal on
Once `evidence check` connects, set the signal live in **`systemix.config.yaml`** (no secrets here — keys stay in env):
```yaml
signals:
  posthog:
    enabled: true
    region: eu
    host: https://eu.posthog.com
    ingest_host: https://eu.i.posthog.com
    connected-at: <today YYYY-MM-DD>
```
`/config` reads this: the "no signal connected" banner clears once the key is live in the build **and** `enabled: true`.

### Step 7 — Next
- Instrument an experiment's metric with **`/measure`** (writes the `posthog-event` into the experiment).
- Once evidence lands: **`/growth-audit`** reads it; **`/close-experiment`** writes the decision + learning back.

## Notes
- Secrets never go in `systemix.config.yaml` (it's committed). Keys live in env / Vercel / GitHub secrets.
- The `signals.<source>` block is the pluggable seam: a future source is another entry + adapter — no app change for authoring or running experiments.
- Connecting is reversible: set `enabled: false` and the banner returns; experiments keep running regardless.
