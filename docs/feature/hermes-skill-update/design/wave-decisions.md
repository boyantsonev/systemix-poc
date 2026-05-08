---
feature: hermes-skill-update
wave: DESIGN
created: 2026-05-07
author: Morgan (solution-architect)
status: accepted
---

# Wave Decisions — Hermes Skill Update

Design decisions made during the DESIGN wave for the `hermes-skill-update` feature. Each decision records what was chosen, why, and what was considered and rejected.

---

## [D1] Architecture Option: B — Isolated Module

**Decision:** The skill-update logic is implemented as a new isolated module (`src/lib/skill-update.js`), called from existing trigger points after `applyHypothesisDecision` returns `ok: true`.

**Rationale:**
- Option A (in-place extension of `applyHypothesisDecision`) was rejected because the function already has a single, clear responsibility: patching a hypothesis MDX contract and returning `{ ok, error? }`. Adding Ollama I/O and filesystem reads to that function would violate single-responsibility and make the PATCH handler harder to test in isolation.
- Option C (event-driven via a `hypothesis.closed` event) was rejected because no event bus exists in the codebase. Introducing one for a single consumer is disproportionate complexity. The existing pattern — direct function calls between co-located modules — is correct for this scale.
- Option B introduces no new infrastructure, matches the existing module style in `scripts/` and `packages/mcp-server/src/tools/`, and keeps the trigger-site change minimal (two lines after the existing `ok: true` guard).

**Rejected alternatives:**

| Option | Why rejected |
|--------|--------------|
| A — In-place extension of `applyHypothesisDecision` | Mixes HTTP handler concerns (queue card state) with Hermes I/O and filesystem reads; untestable without mocking the whole handler |
| C — Event-driven (`hypothesis.closed` event) | No event bus in codebase; one consumer does not justify the infrastructure |

---

## [D2] Trigger Point: After `applyHypothesisDecision` Returns `ok: true`

**Decision:** The skill update is triggered synchronously, after `applyHypothesisDecision` confirms the hypothesis contract was written successfully, in both:
1. `src/app/api/queue/route.ts` — the `PATCH` handler, lines 251-258
2. Any future route that calls `applyHypothesisDecision` and receives `ok: true`

**Rationale:**
- The trigger must be `ok: true` (not `decision !== null`) because a failed contract write should not produce a stale skill update. If the hypothesis contract write fails, the skill file must not be updated to reflect that decision.
- Triggering after the contract write, not before, ensures the source of truth (the hypothesis MDX) and the derived artifact (the SKILL.md) are consistent: if the process dies between the two writes, the contract is correct and the skill update will be retried on the next equivalent event (or manually via HITL).
- The HTTP response to the dashboard is not blocked by the skill update. The skill update runs after the response is sent. This is fire-and-forget semantics with a HITL fallback on failure (see D7).

**Trigger-site change (both locations):**
```
// existing guard
if (card.type === "hypothesis-validation") {
  const decision = action === "approved" ? "promote" : action === "rejected" ? "kill" : null;
  if (decision) {
    const result = applyHypothesisDecision(card, decision);
    if (!result.ok) { ... }
    // NEW: trigger skill update after confirmed write
    void skillUpdate.update(card.hypothesisId, decision, card);
  }
}
```

---

## [D3] Skill Resolution: `skill-tags` Frontmatter + Default Fallback

**Decision:** The module resolves the target SKILL.md path from the `skill-tags` frontmatter field of the closed hypothesis contract. If the field is absent or empty, it falls back to `~/.claude/skills/hermes/SKILL.md`.

**Frontmatter field:**
```yaml
skill-tags: [hermes]
```

**Resolution logic:**
1. Read hypothesis contract frontmatter.
2. If `skill-tags` is a non-empty array, use the first entry to resolve `~/.claude/skills/{tag}/SKILL.md`.
3. If `skill-tags` is absent or empty, use `~/.claude/skills/hermes/SKILL.md`.
4. If the resolved path does not exist on disk, log a warning and skip — do not create the file. Skill files are owned by the skill author; the update module only patches existing files.

**Rationale:**
- The `skill-tags` field already exists as a concept in the `Skill` type (`src/lib/types/skill.ts`, line 76). Making the hypothesis contract reference skill tags is a natural extension of the existing vocabulary.
- A default fallback prevents silent no-ops for hypothesis contracts that predate this feature.
- Path resolution from frontmatter rather than from the hypothesis `id` or `section` field avoids coupling the skill namespace to the hypothesis naming convention.

---

## [D4] Change Classification: Regex Diff, Not Model Judgment

**Decision:** Changes to the SKILL.md are classified as `structural` (section-level: a `## ` heading is added, removed, or renamed) or `bullet-level` (a line within an existing section is added, modified, or removed) using a regex diff of the existing file content against the proposed patch. Model judgment is not used for this classification.

**Classification rules:**
- `structural`: the unified diff contains a line matching `^[+-]## ` (a heading line was added or removed).
- `bullet-level`: no heading lines changed; only lines within existing sections changed.

**Rationale:** See ADR-002.

**Impact of classification:**
- `bullet-level` change: write atomically, no HITL card.
- `structural` change: write atomically AND push a HITL card of type `skill-update-review` to `.systemix/queue.json` for human review.

---

## [D5] Hermes Availability Probe: Check `/api/tags` Before First Call

**Decision:** Before calling `/api/generate`, the Ollama adapter probes `GET http://localhost:11434/api/tags`. If the response is not `200 OK` or the model list does not contain an entry matching `/hermes/i`, the adapter returns `{ available: false }` and the skill update is silently skipped for this invocation.

**Probe behavior:**
- Timeout: 2000ms (not blocking the request cycle significantly).
- On `ECONNREFUSED` or timeout: `{ available: false }`, emit `health.startup.refused` structured log.
- On `200 OK` but no hermes model: `{ available: false }`, emit `health.startup.refused` with `reason: "model-absent"`.
- On `200 OK` with a hermes model present: `{ available: true }`, proceed to generate.

**Why silent skip (not error):**
- Ollama is a local, optional dependency. It is expected to be absent in CI, on other developers' machines, and during production deployments (if the app is ever deployed to a server).
- A missing Ollama must never cause a user-visible error on the dashboard queue resolution flow. The HITL resolution is the primary action; the skill update is a secondary, best-effort action.

**Why not cache the probe result:**
- Caching across requests would require global state. The probe is cheap (one HTTP GET). Per-invocation probing is simpler and avoids stale cache issues after Ollama is started/stopped.

---

## [D6] Atomic Write: `SKILL.md.tmp` → `renameSync`

**Decision:** The updated SKILL.md content is written to `{skillPath}.tmp` first, then renamed to `{skillPath}` using `fs.renameSync`.

**Rationale:**
- This is the established pattern in the codebase: `contractWriteHypothesisResultHandler` (`packages/mcp-server/src/tools/contract.ts`, lines 864-866) and `writeQueue` in `src/app/api/queue/route.ts` (lines 77-79) both use this pattern.
- `renameSync` on POSIX systems (macOS, Linux) is atomic when source and destination are on the same filesystem. `~/.claude/skills/` and the temp file are on the same filesystem in all expected deployment scenarios.
- If the process dies after `writeFileSync(tmp)` but before `renameSync`, the original SKILL.md is intact. The `.tmp` file is an orphan that can be safely ignored or cleaned up.

**Constraint:** The `.tmp` file is written to the same directory as the target. If `~/.claude/skills/{tag}/` does not exist, the write fails with `ENOENT`. The module checks directory existence before writing and skips with a warning if absent.

---

## [D7] Retry Cap: 2 Attempts, HITL on Second Failure

**Decision:** The Ollama `generate` call is retried at most once (2 total attempts) with a 500ms delay. If both attempts fail, a HITL card of type `skill-update-failed` is pushed to `.systemix/queue.json`. No further automatic retries are made.

**HITL card on failure:**
```json
{
  "id": "skill-update-failed-{hypothesisId}-{timestamp}",
  "type": "skill-update-failed",
  "hypothesisId": "{id}",
  "decision": "promote | kill",
  "reason": "{error message from Ollama}",
  "requestedAt": "{ISO timestamp}",
  "status": "pending"
}
```

**Rationale:**
- The retry cap prevents the PATCH handler's event-loop callback from blocking indefinitely on a flaky Ollama endpoint.
- Two attempts is sufficient to recover from a transient network blip. A permanent Ollama failure (model crash, resource exhaustion) will not be resolved by more retries.
- The HITL card creates an observable, actionable artifact: a team member can restart Ollama and re-trigger the skill update manually from the queue.
- The queue card for the original hypothesis resolution is already written and resolved before the retry loop starts. The two operations are independent.

**Why not exponential backoff:**
- The skill update is a best-effort secondary action. The user is already waiting for the dashboard response. Exponential backoff (e.g., 1s + 2s + 4s) would hold the Node event loop and delay unrelated requests. 500ms flat delay is the correct trade-off.

---

## Reuse Analysis

Components and patterns confirmed in the existing codebase before designing new ones.

| Capability needed | Existing artifact | Reuse decision |
|-------------------|------------------|----------------|
| Atomic file write | `fs.renameSync` pattern in `contract.ts:864`, `queue/route.ts:78` | Reuse — same pattern, same semantics |
| Ollama HTTP call | `callHermes()` in `scripts/generate-contracts.ts:60` | Reuse pattern — inline adapter in `skill-update.js` rather than importing from scripts (scripts are not importable modules) |
| MDX frontmatter parse | `parseFrontmatter()` in `packages/mcp-server/src/tools/contract.ts:26` | Reuse pattern — implement equivalent in `skill-update.js`; cannot import across workspace boundary without build step |
| HITL card push | `pushHitlTaskHandler` in MCP server tools | Not reused — HITL card for skill-update-failed is written directly to `queue.json` by the module (same file, same format, no MCP round-trip needed) |
| Hypothesis contract read | `readHypotheses()` in `contract.ts:679` | Reuse pattern — inline minimal reader for `skill-tags` field only |
| Skill path convention | `file: "~/.claude/skills/{name}/SKILL.md"` in `pipeline.ts:759` | Reuse — same path convention, resolve `~` via `os.homedir()` |
| Error event structure | Structured log pattern (no existing standard) | New — define `{ event, adapter, reason, action }` shape; consistent with ISO 25010 observability |
