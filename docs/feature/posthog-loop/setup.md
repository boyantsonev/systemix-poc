# PostHog ↔ Systemix — closing the learning loop (setup runbook)

> Goal: stand up real PostHog (EU) capture + an **automated** loop that turns landing
> engagement into evidence → a HITL decision card → a write-back to a contract. No specific
> experiment to optimize yet — this proves the loop works and can run on a schedule.
> Region decision: **PostHog Cloud EU** (data residency; required for the Connecta K-12 story).

## The loop we're closing
```
Landing (prod) ──fires events──▶ PostHog EU project
        │                              │
        │                     ┌────────┴─────────┐  (scheduled: GitHub Action)
        │                     ▼                  
        │            systemix evidence pull (engagement)
        │              · HogQL over $pageview / section_viewed / install_command_copied
        │              · → structured evidence written to a contract
        │              · → honest synthesis (real numbers; Ollama optional locally)
        │              · → HITL card pushed to .systemix/queue.json
        ▼                     │
   /config · /queue ◀─────────┘   human reviews → approve/reject → write-back to contract
```
Capture (①) and the query/evidence/write-back (③–⑦) become **real**; synthesis (⑤) is an
honest deterministic summary of the real numbers in the automated path (so it runs in CI with
no LLM host), with local Ollama as an opt-in upgrade.

---

## YOUR PART (~10 min, one-time) — needs a human; Claude can't create accounts or hold keys

### 1. Create the PostHog project (EU)
- Sign up / log in at **https://eu.posthog.com** (the EU cloud — not us.posthog.com).
- Create a project (e.g. "Systemix").

### 2. Collect three values
| Value | Where | Looks like |
|---|---|---|
| **Project API key** (public, for capture) | Project settings → *Project API Key* | `phc_…` |
| **Project ID** (numeric, for queries) | Project settings (or the dashboard URL `/project/<ID>`) | `12345` |
| **Personal API key** (for server queries) | Account → *Personal API keys* → create, scope: read insights/query | `phx_…` |

### 3. Add capture keys to Vercel (Production + Preview)
Dashboard → systemix project → Settings → Environment Variables, **or** CLI:
```
vercel env add NEXT_PUBLIC_POSTHOG_KEY      # paste phc_…   (Production + Preview)
vercel env add NEXT_PUBLIC_POSTHOG_HOST     # https://eu.i.posthog.com
```
Then redeploy (or wait for the next deploy) so the key ships to the browser.
> ⚠️ Until this is set, the live landing captures **nothing** — the console logs
> "PostHog was initialized without a token."

### 4. Add query keys to GitHub Actions secrets (for the scheduled sync)
Repo → Settings → Secrets and variables → Actions → New repository secret:
```
POSTHOG_API_KEY      = phx_…
POSTHOG_PROJECT_ID   = <numeric id>
POSTHOG_HOST         = https://eu.posthog.com
```
(Optional: copy the same three into a local `.env.local` if you want to run `systemix evidence pull` by hand.)

Also enable **Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to
create and approve pull requests"** — the scheduled sync (`.github/workflows/systemix-evidence.yml`)
opens a PR with each snapshot.

### 5. Tell Claude when done
Claude verifies end-to-end: confirms events are arriving, runs the engagement pull, and shows
a HITL card landing in `/queue`.

---

## CLAUDE'S PART (code — no keys needed; verified once yours are in)
1. **Config** — `systemix.config.yaml signals.posthog` → EU host + region. `.env.example` with all five vars.
2. **Engagement query** — a landing-engagement read (HogQL over `$pageview`, `section_viewed`,
   `install_command_copied`) producing conversion metrics, written as structured evidence.
   Promotes `spikes/spike-3-posthog/posthog-query.js`. Fixture-backed tests.
3. **Honest synthesis** — summarize the real numbers deterministically in the automated path
   (replaces the hash-stub in `/api/hermes/run` for this flow); real Ollama opt-in when run locally.
4. **Automation** — `.github/workflows/systemix-evidence.yml`: scheduled + manual; runs the pull
   with the GH secrets, writes evidence + pushes a HITL card (as a PR for review).
5. **A/B hook (future-proofing)** — a small `useVariant(flag)` helper that reads a PostHog
   feature flag and tags events with `variant`, so a future A/B test just needs a flag in PostHog —
   no code change to start measuring lift.
6. **Verification** — a `posthog` health check (keys present + connectivity + events arriving).

## Event catalog (already firing from the landing once capture is on)
| Event | Props | Source |
|---|---|---|
| `$pageview` | `$current_url` | PostHogProvider |
| `install_command_copied` | *(none yet — Claude will add `location`/`variant`)* | `InstallCommand` |
| `section_viewed` | `section` | `SectionTrack` |
| `hypothesis_social_signal` | `hypothesis_id, section, signal_type` | `SectionTrack` (when `hypothesisId` set) |
| `hero_cta_click` / `nav_cta_click` | `cta` | `HeroCTAs` / `NavCTAs` |

## Known gaps this setup addresses
- `install_command_copied` carries no attribution → Claude adds `location`/`variant` props.
- No variant assignment (variant_b hard-coded) → the A/B hook makes future flag-based tests trivial.
- Existing query paths read `hypothesis_social_signal` (section views) / `component_render`, not
  landing conversion → the new engagement query reads the real funnel.
- Nothing scheduled → the GitHub Action runs the loop automatically.
