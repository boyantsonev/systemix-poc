# Connecta — Worked Example Instance (owned in systemix-poc)

> **Perspective:** systemix-poc. Connecta is **Design Partner #1** and the **first example instance** of the design-system object (ADR-014). This plan lives **here**, not in the Connecta repo — Connecta is content/proof for the engine, not a separate planning home.
> Engine work: `TASKS.md` · decisions: `decisions/ADR.md` ADR-010..014.
> Format: markdown first. Convert to GitHub issues only after founder review.

**Topology (ADR-009):** two Systemix instances in this engagement — a **DS instance** (the provisioned Connecta design-system repo) and a **Landing instance** (`apps/landing`, landing/gtm + PostHog-EU).

**Hard dependency:** the agent-driven `systemix init` (engine E2) + the app shell + `systemix dev` (engine E1) must exist before the Connecta instance can be provisioned and rendered. Content prep (X2–X3) can start now in parallel.

---

## X0 — Provision both instances via agent-driven onboarding `[instance][onboarding]`
Runs **in Claude Code** (ADR-011), not an in-app wizard. Depends on engine E2.
- [ ] **X0.1** DS instance: run `systemix init` → **provision the Connecta design-system repo** (name it at setup, ADR-014), package `@connecta/design-system`, host = Tamagui/Next. Intent = keep the DS in sync + K-12 Trust & Safety spine; audiences = design + engineering; **medium = all**.
- [ ] **X0.2** Landing instance: `systemix init` in `apps/landing` → intent = validate marketing hypotheses; audiences = marketing + product; medium = landing + responsive web; signal = **PostHog-EU**.
- [ ] **X0.3** Commit both `systemix.config.yaml` files (no secrets; keys in `~/.systemix/config.json`).

## X1 — DS instance content (feeds the Docs surface) `[instance][design-system]`
The instance documents what exists — it does not prescribe components (learning L6). The DS repo is **provisioned in X0.1**, not reused ambiguously (old C1 gate, resolved by ADR-014).
- [ ] **X1.1** Migrate the existing Tamagui base theme (Wisprflow × Connecta, coral `#C9442F` primary, light/dark) into the provisioned DS instance.
- [ ] **X1.2** Point the Docs surface at the instance's components/tokens registry; verify `sync-docs` status renders.
- [ ] **X1.3** Author the design rationale + `design.md` (human-authored, Hermes-maintained thereafter, ADR-012).

## X2 — Donate the Workflow Atlas reference UI `[instance][platform]`
Connecta `apps/platform` is the **reference implementation** the engine harvests (engine E5).
- [ ] **X2.1** Stabilize `apps/platform` AtlasShell + `workflow-catalog` + `flow-layout` as donatable (Tamagui/DS cross-package gotchas + `pnpm@9.15.9` pin are known).
- [ ] **X2.2** Express Connecta workflows (flow type · user types · rationale) so the engine renders them generically via `list_workflows` / `get_workflow`.
- [ ] **X2.3** Persona/audience switch (Student/Parent/Teacher) maps onto onboarding `audiences`.

## X3 — Donate the Prototypes reference UI `[instance][platform]`
- [ ] **X3.1** Stabilize `PrototypeShell` + `DeviceFrame` as donatable for engine E6.
- [ ] **X3.2** Tag each prototype with its **medium** so the engine frames it (medium = "all" → matrix of frames).

## X4 — Landing instance: hypothesis-validation loop `[instance][landing][compliance]`
- [ ] **X4.1** **Compliance (do now, not blocked):** remove Microsoft Clarity from the live Astro site (ToS prohibits under-18 → disqualifying for K-12); adopt **PostHog-EU** (Frankfurt). (learning L4)
- [ ] **X4.2** Build `apps/landing` on `@connecta/design-system`; wire experiments → PostHog-EU + Vercel → Hermes decision cards → evidence write-back.
- [ ] **X4.3** First experiment via `init-experiment`; verify the **role-routed HITL** card (DRI/IC) lands in the landing instance's runtime feed (engine E3.3).
- [ ] **X4.4** Cut over from the live Astro landing once parity is met.

## X5 — Prove Hermes answers "what skills/goals/hypotheses do I have" `[instance][hermes]`
The acceptance test for the founding question, on a real instance.
- [ ] **X5.1** After X0–X1, query the DS instance's Docs surface — confirm it returns installed skills, goals, hypotheses from the intent block (engine E0.4/E4.3).
- [ ] **X5.2** Let Hermes run one daily + one weekly pass; confirm doc updates appear HITL-gated under the configured autonomy mode.

---

### Definition of done (Connecta example instance)
`systemix init` provisions the Connecta DS repo and the landing instance → `systemix dev` renders the five surfaces against Connecta content → Docs answers intent queries + shows live `sync-docs` status → Atlas + Prototypes render Connecta content in the generic shell → the Landing instance runs one PostHog-EU experiment end-to-end with a role-routed HITL card → Clarity removed. This proves the engine's five-surface app on a real design partner — the first example after Systemix's own dogfood instance (engine E8).
