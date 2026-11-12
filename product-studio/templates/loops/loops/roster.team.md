---
preset: team
updated: {{TODAY}}
---
# Roster: who holds which role

The loops name roles; this file names people. A gate (a point where a person rules: approve,
rework or drop) is met by whoever holds its role, or, while they are away, by the deputy (the
stand-in) with the coding agent's brief in hand. A deputy line names the role whose holders stand
in. A role's domains are the context packs it answers from, and the packs a deputy reads before
ruling.

## design-lead
- holder: {{HOLDER design-lead}}
- deputy: engineering-lead
- domains: design, product, marketing

## engineering-lead
- holder: {{HOLDER engineering-lead}}
- deputy: design-lead
- domains: tech, product

## reviewer
- holder: {{HOLDER reviewer}}
- domains: design, product, marketing, tech, business

Any one of the holders meets a reviewer gate. Confirming a claim means knowing it is true; a
reviewer who cannot vouch for a fact asks, or cuts the line.

## coding-agent
The coding agent. It holds no role and no gate.
- may: prepare a decision brief, run the checks and the evaluation, open draft branches and pull
  requests, propose the next goal, draft a roster change, ask the questions the absent expert
  would ask
- never: approve, decide, merge, tag a release, flip a loop to agreed, open a goal on its own,
  change studio/rules.md or its own skills without a person's yes, handle real customer data or
  credentials
