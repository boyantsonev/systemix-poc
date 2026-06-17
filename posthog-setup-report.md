<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Systemix. Here's a summary of all changes made:

**Infrastructure:**
- Added `posthog-node` for server-side event tracking
- Set up a reverse proxy in `next.config.ts` routing `/ingest/*` to `eu.i.posthog.com`, improving reliability by avoiding ad-blockers
- Updated `PostHogProvider.tsx` to use the reverse proxy (`api_host: "/ingest"`) and the correct EU `ui_host`
- Created `src/lib/posthog-server.ts` — a shared singleton PostHog Node client for server-side routes
- Added `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.local`

**Events added (10 total):**

| Event | Description | File |
|---|---|---|
| `subscribe_submitted` | User submits early access email form | `src/components/landing/SubscribeForm.tsx` |
| `hitl_decision` | User approves/rejects/defers a Hermes HITL card | `src/components/systemix/HitlQueue.tsx` |
| `atlas_persona_changed` | User switches persona in the Workflow Atlas | `src/components/atlas/AtlasCanvas.tsx` |
| `atlas_node_clicked` | User clicks a workflow node in Atlas canvas | `src/components/atlas/AtlasCanvas.tsx` |
| `contract_drift_resolved` | User resolves a token drift conflict (code-wins or figma-wins) | `src/components/contract/TokenResolveControl.tsx` |
| `skill_added_to_workflow` | User adds a skill from the library to the workflow canvas | `src/components/canvas/SkillLibrary.tsx` |
| `workflow_run_triggered` | User triggers workflow execution from canvas | `src/components/pipeline/WorkflowCanvas.tsx` |
| `workflow_step_added` | User adds a step to a workflow via the canvas | `src/components/pipeline/WorkflowCanvas.tsx` |
| `workflow_created` | New workflow created via API (server-side) | `src/app/api/workflows/route.ts` |
| `workflow_executed` | Workflow execution triggered via API (server-side) | `src/app/api/workflows/[id]/run/route.ts` |

**Pre-existing events (already instrumented):**

| Event | File |
|---|---|
| `install_command_copied` | `src/components/systemix/LandingEvents.tsx` |
| `hero_cta_click` | `src/components/systemix/LandingEvents.tsx` |
| `nav_cta_click` | `src/components/systemix/LandingEvents.tsx` |
| `section_viewed` | `src/components/systemix/LandingEvents.tsx` |
| `hypothesis_social_signal` | `src/components/systemix/LandingEvents.tsx` |
| `$pageview` | `src/components/systemix/PostHogProvider.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://eu.posthog.com/project/198804/dashboard/738580)
- [Install command copies (bold number)](https://eu.posthog.com/project/198804/insights/2vEgWDp7) — primary acquisition metric
- [Install command copies over time](https://eu.posthog.com/project/198804/insights/x1pdzWyG) — daily trend
- [Early access sign-ups](https://eu.posthog.com/project/198804/insights/deQ1ZuIe) — `subscribe_submitted` conversions
- [HITL decisions](https://eu.posthog.com/project/198804/insights/eKavqXTR) — Hermes queue engagement
- [Atlas engagement](https://eu.posthog.com/project/198804/insights/9PGhwzjd) — `atlas_persona_changed` + `atlas_node_clicked`

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
