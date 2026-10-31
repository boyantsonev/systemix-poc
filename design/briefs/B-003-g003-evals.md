---
id: B-003
gate: product.evals
role: reviewer
decides: Boyan
needs: holder or deputy
context: [product, design, tech]
date: 2026-10-31
---
# G-003: approve the reading and the eleven evals for "safe to merge and publish"?

## The question
Approve G-003's brief and evals together. It is a build-only goal, so approving also says: no pictures, product.test waived, go to build.plan.

## Options
1. **Approve reading A** (three PRs: merge-safe, publish-safe, agent-never-rules). About 5 days.
2. **Approve reading B** (merge-safe only). About 1 day; the npm and self-approval risks stay.
3. **Rework.**

## Evidence
- Nineteen located findings, the worst re-checked by hand `docs/feature/ai-native-ds-kit-beta/repo-review.md § 1`
- npm still serves the unsafe 0.2.0 `wave-decisions.md DSC-7`
- D1 and D4 decided `wave-decisions.md DSC-22`

## Recommendation
Option 1. PR 1 first, because merging this branch without it would publish the internal notes.
Reversible: yes, PR by PR.

## What the reviewer would ask
- *Does it land as reviewable PRs?* Three, each a few hundred lines.
- *What breaks for existing users?* `update` asks before writing; `init` refuses a broken settings file instead of replacing it.
- *Does anything leave the machine?* Less than today: the free score stops sending (E9).

## Decision
Approved by Boyan (reviewer), 2026-10-31: "start". Reading A; build-only.
