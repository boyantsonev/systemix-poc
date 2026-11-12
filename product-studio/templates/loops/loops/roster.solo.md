---
preset: solo
updated: {{TODAY}}
---
# Roster: who holds which role

The loops name roles; this file names people. A gate (a point where a person rules: approve,
rework or drop) is met by whoever holds its role. This is the solo preset: one person holds every
role, so there is no deputy (a stand-in while the holder is away). To add people later, give a role
its own holder and a `- deputy:` line naming the role that stands in for it.

## design-lead
- holder: {{HOLDER design-lead}}
- domains: design, product, marketing

## engineering-lead
- holder: {{HOLDER engineering-lead}}
- domains: tech, product

## reviewer
- holder: {{HOLDER reviewer}}
- domains: design, product, marketing, tech, business

Rules on every gate: approve, rework or drop. Confirming a claim means knowing it is true; a
reviewer who cannot vouch for a fact asks, or cuts the line.

## coding-agent
The coding agent. It holds no role and no gate.
- may: prepare a decision brief, run the checks and the evaluation, open draft branches and pull
  requests, propose the next goal, ask the questions the absent expert would ask
- never: approve, decide, merge, tag a release, flip a loop to agreed, open a goal on its own,
  change studio/rules.md or its own skills without a person's yes, handle real customer data or
  credentials
