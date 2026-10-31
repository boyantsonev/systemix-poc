---
id: B-004
gate: product.evals
role: reviewer
decides: Boyan
needs: holder or deputy
context: [product, design, tech]
date: 2026-10-31
---
# G-004: approve the reading and the nine evals for "one model"?

## The question
Approve G-004's brief and evals together: build-only, no pictures, product.test waived, after G-003's first PR.

## Options
1. **Approve reading A** (prune, then unify). About 4–5 days.
2. **Approve reading B** (prune only). About 2 days; the double meanings stay.
3. **Rework.**

## Evidence
- Dead code, double meanings and docs drift, located `docs/feature/ai-native-ds-kit-beta/repo-review.md § 1`
- D2, D3 and D5 decided `wave-decisions.md DSC-22`

## Recommendation
Option 1, started after G-003's PR 1. Reversible: yes; old names stay as aliases for a minor version.

## What the reviewer would ask
- *What breaks for existing users?* Nothing for one minor version (E9).
- *Is anything removed that a doc or skill still links to?* Searched before each removal.

## Decision
_(left for the person)_
