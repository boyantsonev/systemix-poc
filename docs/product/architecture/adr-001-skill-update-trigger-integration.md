---
id: ADR-001
title: Skill update trigger — synchronous post-write call, not event-driven
status: accepted
date: 2026-05-08
feature: hermes-skill-update
---

# ADR-001: Skill Update Trigger — Synchronous Post-Write Call

## Context

After a founder approves a hypothesis in the HITL queue, Systemix writes the decision back to the hypothesis contract via `applyHypothesisDecision()`. We need to decide where and how the skill-update logic fires.

Three options were evaluated:

1. **Inline** — add skill-update logic directly inside `applyHypothesisDecision()`
2. **Synchronous call after** — call `skillUpdate.update()` after `applyHypothesisDecision()` returns `ok: true`, in the same request handler
3. **Event-driven** — emit a `hypothesis.closed` event; a separate watcher consumes it and triggers skill update asynchronously

## Decision

**Option 2 — synchronous call after confirmed write, fired as a non-blocking callback.**

The call site in `route.ts`:
```typescript
const result = applyHypothesisDecision(card, decision);
if (!result.ok) { return NextResponse.json({ error: result.error }, { status: 500 }); }
// skill update fires after response is committed — fire-and-forget
void skillUpdate.update(card.hypothesisId, decision, card);
```

The HTTP response is sent after `applyHypothesisDecision` succeeds. The skill update runs in the Node.js event loop after the response is flushed — it does not block the dashboard.

## Rationale

**Why not Option 1 (inline):** `applyHypothesisDecision()` has a single clear responsibility: atomically patch a hypothesis MDX contract and return a success/error signal. Adding Ollama I/O and filesystem reads inside that function couples HTTP handler state to LLM availability. If Ollama is down, the hypothesis approval would fail — which is the wrong failure boundary.

**Why not Option 3 (event-driven):** No event bus exists in the codebase. Introducing one for a single consumer (skill update) adds infrastructure complexity disproportionate to the benefit. The existing pattern in this codebase is direct function calls between co-located modules. Event-driven is the right choice when there are multiple independent consumers of the same event — that is not true today.

**Why fire-and-forget semantics:** The skill update is a secondary, best-effort action. The primary action (hypothesis contract write) is already confirmed before the skill update starts. If Ollama is unavailable, the skill update fails silently and pushes a HITL card — it does not unwind the hypothesis approval. This preserves the founding invariant: Hermes is optional, decisions are not.

**Why trigger on `ok: true` (not on `decision !== null`):** A failed contract write must not produce a stale skill update. If `applyHypothesisDecision()` returns an error, the hypothesis MDX was not updated. A skill patch based on a decision that was not committed would create a divergence between the hypothesis contract and the skill file.

## Consequences

- Two-line addition to `route.ts` after the existing `ok: true` guard — minimal change surface
- `skillUpdate.update()` must never throw synchronously (must catch internally)
- If the Node.js process exits between the response and the skill update, the update is lost — acceptable given the HITL fallback on retry exhaustion
- Future trigger points (e.g. CLI `systemix evidence close`) follow the same pattern: call after confirmed write, void the promise
