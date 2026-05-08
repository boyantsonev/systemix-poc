---
id: ADR-002
title: Change classification — regex diff, not model judgment
status: accepted
date: 2026-05-08
feature: hermes-skill-update
---

# ADR-002: Change Classification — Regex Diff, Not Model Judgment

## Context

When Hermes proposes a patch to a SKILL.md file, the module must decide whether the change is:

- **Bullet-level** — a line within an existing section was added or modified. Safe to auto-apply.
- **Structural** — a `## ` heading was added, removed, or renamed. Requires a HITL card for human review.

The classification drives a consequential action (auto-write vs. HITL escalation). Two approaches were considered:

1. **Model judgment** — ask Hermes (or a second LLM call) to classify the change as structural or bullet-level
2. **Regex diff** — compare the existing SKILL.md against the proposed patch using a line-level diff; classify based on whether any `## ` heading lines were added or removed

## Decision

**Regex diff on heading lines.**

```javascript
function classifyChange(existingContent, proposedContent) {
  const existingHeadings = existingContent.match(/^## .+/gm) ?? [];
  const proposedHeadings = proposedContent.match(/^## .+/gm) ?? [];
  const added = proposedHeadings.filter(h => !existingHeadings.includes(h));
  const removed = existingHeadings.filter(h => !proposedHeadings.includes(h));
  return (added.length > 0 || removed.length > 0) ? "structural" : "bullet-level";
}
```

## Rationale

**Why not model judgment:**

The classification decision is binary and has a clear observable ground truth (heading lines present or absent). Using a second model call to make this decision introduces:

- **Non-determinism** — the model may classify the same diff differently across calls
- **Latency** — a second Ollama round-trip (500ms–2s) before the HITL escalation decision
- **Failure surface** — if the classification call fails, the module does not know whether to auto-write or escalate
- **Circular dependency** — using Hermes to evaluate Hermes output compounds error modes

The SPIKE findings confirmed that hermes3 8B is capable of scoped section edits but exhibits trailing whitespace injection. Relying on model judgment for a safety-critical classification (auto-write vs. human review) would make the HITL gate dependent on LLM reliability — the opposite of the intended design.

**Why regex on headings:**

- Deterministic: same input always produces same output
- Zero-latency: no network call
- Semantically correct: the distinction that matters for HITL escalation is section structure, not line content. A heading change reorganizes the skill file's information architecture; a bullet change adds a data point within an existing concept.
- Resilient to Hermes output variance: the regex runs on the final proposed content after all post-processing (whitespace strip, heading verification) has already passed

**Edge cases handled:**

| Case | Classification | Rationale |
|------|---------------|-----------|
| New `## ` heading added | structural | New section — human should confirm intent |
| Existing `## ` heading removed | structural | Information loss — human must confirm |
| `## ` heading renamed | structural | Two changes: remove + add. Both fire the structural rule. |
| Bullet added within existing section | bullet-level | No structural change — safe to auto-apply |
| Bullet modified within existing section | bullet-level | No structural change — safe to auto-apply |
| Entire section content replaced (same heading) | bullet-level | Heading preserved — classified as content change, not structure change. A HITL card may still be desirable here; this is a known limitation. |

**Known limitation:** A section whose entire content is replaced while its heading is preserved will be classified as `bullet-level` and auto-applied. This is acceptable because: (1) the Hermes prompt instructs the model to make targeted additions, not wholesale replacements; (2) the validation step verifies that all original bullets are present before write, which guards against content replacement. If wholesale replacement becomes a pattern, a line-count delta threshold can be added to the classifier without changing the architectural decision.

## Consequences

- Change classification is a pure function — independently testable with no mocks
- The HITL escalation threshold is transparent and auditable (can be inspected by reading the regex)
- A `## ` heading in a bullet text (e.g. `- Use "## Section" format`) would trigger a false-positive structural classification — mitigated by the Hermes prompt constraining output to section content only (no meta-commentary about headings)
- Future change: if the team wants to classify by change magnitude (e.g. >5 lines changed = structural), the classifier is a single function and the change is isolated
