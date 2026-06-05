# Systemix — Engine Task Breakdown (Iteration 3: the instance app)

> Source decisions: **ADR-010..013** · plan: `PLAN.md` §8 · created 2026-06-05.
> Scope: the **engine-built, generic five-surface local app** + Hermes evolution. The client (Connecta) consumes this; its tasks live in `connecta/TASKS.md`.
> Format: markdown first (per founder). Convert to GitHub issues in `boyantsonev/systemix-poc` after review. Suggested labels in brackets.

**Hard sequencing:** E0 (config + MCP intent) → E1 (app shell) → surfaces E2–E6 can parallelize → E7 (Hermes scheduler) needs E0 + E3.

---

## E0 — Config schema + intent enumeration (the gating layer) `[engine][mcp]`
The thing nothing can do today: enumerate skills/goals/hypotheses. Build this first — every surface reads it.

- [ ] **E0.1** Extend `systemix.config.yaml` schema with `intent: { goals[], hypotheses[], audiences[] }` and `prototype.medium`. Update the loader/validator. (ADR-011)
- [ ] **E0.2** Add the role model to config: `roles: { dri[], ic[] }` for HITL routing. (ADR-013)
- [ ] **E0.3** Add a `design_system: { repo, package, host }` block to config — the provisioned DS instance identity. (ADR-014)
- [ ] **E0.4** New MCP tool `describe_instance` (returns surfaces, signals, installed skills, intent, medium, design_system) in `packages/mcp-server/src/tools/`. (ADR-012)
- [ ] **E0.5** New MCP tool `list_skills` — enumerate skills installed at `.claude/skills/` (project-scoped, fall back to global). Wire into `token-counter.ts`'s existing skill walk.
- [ ] **E0.6** Make installed-skill list a **function of onboarding answers** (surfaces → skills map). (ADR-011)

## E1 — The app shell + `systemix dev` `[engine][cli]`
- [ ] **E1.1** Decide shell stack — reuse Connecta `apps/platform` (Vite + React + Tamagui + React-Flow) as the reference; confirm the generic shell stack in an ADR addendum if it diverges.
- [ ] **E1.2** Scaffold the generic five-surface app under the engine (routing for surfaces 0–4).
- [ ] **E1.3** `systemix dev` CLI command — boots the app against the local instance (`systemix.config.yaml` + `contract/` + `.systemix/`). (ADR-010)
- [ ] **E1.4** Theme the shell from the instance **single-brand config** (light/dark), not a hardcoded palette.
- [ ] **E1.5** `npx systemix init` scaffolds the app files into the client repo (or wires a dev dependency that serves it). Verify in an isolated temp dir; global `~/.claude/skills` untouched.

## E2 — Onboarding: agent-driven `systemix init` + the view/edit surface `[engine][cli][surface]`
Initial capture runs **in the coding agent**, not the app (ADR-011). The app's surface #0 only views/edits the result.
- [ ] **E2.1** Build the `systemix init` **skill/CLI conversational flow** (Claude Code / Cursor) — asks: topology (ADR-008 four) + intent (goals, hypotheses, audiences) + **prototype medium** + **DS-instance provisioning** (repo name, package name, host).
- [ ] **E2.2** Provisioning step: create/name the client **design-system GitHub repo** + scaffold the embedded instance into it (ADR-014). Verify in an isolated temp dir; global `~/.claude/skills` untouched.
- [ ] **E2.3** Write answers → `systemix.config.yaml` (E0.1–E0.3) + `contract/meta/*`. The app cannot render until this exists (bootstrap order).
- [ ] **E2.4** Re-home `prototypes/systemix-onboarding-v2.jsx` as surface #0's **view/edit/re-run** of the captured config (read-back + edit, not primary capture).
- [ ] **E2.5** Fix the lingering `~/.claude/skills/` → `.claude/skills/` copy in the prototype (PLAN §6 remaining item).

## E3 — Surface 1: System Graph + Runtime Feed `[engine][surface]`
- [ ] **E3.1** Port `prototypes/systemix-graph-standalone.html` into the shell as the Graph route; drive nodes from `describe_instance` (E0.3) instead of hardcoded `NODES`.
- [ ] **E3.2** Live **runtime feed** panel from `list_events` / `emit_event`.
- [ ] **E3.3** HITL cards in the feed, **routed by role (DRI/IC)** — read role assignment from config (E0.2); extend `hitl.ts` task schema with `role`/`assignee`. (ADR-013)
- [ ] **E3.4** Resolve/approve a card from the feed → `resolve_hitl_task`.

## E4 — Surface 2: Docs (Hermes-maintained editor) `[engine][surface][hermes]`
- [ ] **E4.1** Notion/Obsidian-like MD/MDX editor over `contract/` + `docs/` (read/edit/save to files — local-first, ADR-007).
- [ ] **E4.2** Render the existing `sync-docs` status (stale/drifted/missing/current) + coverage inline.
- [ ] **E4.3** "Ask the docs" query box → `describe_instance` / `list_skills` answer path (the literal answer to *"can Hermes answer about the skills?"*).
- [ ] **E4.4** Surface the Hermes/Systemix **setup itself** as docs pages (the setup is documentation, ADR-012).
- [ ] **E4.5** Larger (weekly) Hermes doc diffs route through HITL before write.

## E5 — Surface 3: Workflow Atlas `[engine][surface]`
- [ ] **E5.1** Harvest Connecta `apps/platform` AtlasShell + `workflow-catalog` + `flow-layout` into the generic shell; parameterize on the instance's workflows (`list_workflows` / `get_workflow`).
- [ ] **E5.2** Render flow type · user types · design rationale in the design-system's own style (tokens from the brand config).
- [ ] **E5.3** Persona/audience switch driven by onboarding `audiences` (E2.2).

## E6 — Surface 4: Prototypes `[engine][surface]`
- [ ] **E6.1** Harvest Connecta `PrototypeShell` + `DeviceFrame`; render prototypes framed by the onboarding **medium** (E2.3).
- [ ] **E6.2** Medium → device-frame mapping (iOS / Android native frames · browser chrome · responsive web · landing · "all" = matrix).

## E7 — Hermes: one-shot → scheduled maintainer + queryable `[engine][hermes]`
- [ ] **E7.1** `systemix watch` (or cron) scheduler: **daily** incremental docs sync, **weekly** deeper pass. (ADR-012)
- [ ] **E7.2** Hermes reads the `intent` block + contracts to answer queries (back the E4.3 / E0.3 path).
- [ ] **E7.3** All scheduled writes respect the autonomy mode + HITL gate (ADR-008 Q3).
- [ ] **E7.4** Update `~/.claude/skills/hermes/SKILL.md` (or the project-scoped copy) to document the maintainer + query modes alongside the existing one-shot mode.

## E8 — Dogfood: Systemix's own design-system instance (= marketing UI) `[engine][dogfood]`
The type/instance model's level 1 (ADR-014): Systemix is its own first customer, and its rendered instance *is* the marketing proof.
- [ ] **E8.1** Define Systemix's own `design_system` config + run the five-surface app against it (the first rendered example).
- [ ] **E8.2** Use that instance as the **marketing** surface (the legible "what you're paying for" SaaS view), distinct from the generic engine code.
- [ ] **E8.3** Treat every Connecta specific as *instance content*, never hardcoded in the shell (guard: the shell renders Systemix's own DS with zero Connecta references).

## E9 — Docs / ADR housekeeping `[docs]`
- [ ] **E9.1** Add an `instance-app` feature folder under `docs/feature/` if the build runs as an nWave feature (discover/discuss/diverge/design), mirroring `systemix-v2`.
- [ ] **E9.2** Reconcile `gap-analysis-v2` "Docs UI → per-instance deliverable" to "instance **app** → per-instance deliverable."
- [ ] **E9.3** `jobs.yaml` entries for the instance-app jobs (agent-driven onboarding + provisioning, ask-the-docs, role-routed HITL).

---

### Definition of done (iteration)
`npx systemix init` in a fresh repo → `systemix dev` opens the five-surface app → onboarding captures intent + medium → the Graph shows the topology + a role-routed HITL card → Docs answers "what skills/goals/hypotheses do I have" → Hermes runs daily/weekly under the configured autonomy. Proven once in Connecta (`connecta/TASKS.md`).
