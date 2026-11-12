---
preset: team
updated: 2026-01-10
---
# Roster: who holds which role

The loops name roles; this file names people. A gate (a point where a person rules) is met by
whoever holds its role, or, while they are away, by the deputy (the stand-in) with the agent's
brief in hand. A role's domains are the context packs it answers from.

## design-lead
- holder: Ada Lovelace
- deputy: engineering-lead
- domains: design, product, marketing

## engineering-lead
- holder: Grace Hopper
- deputy: design-lead
- domains: tech, product

## reviewer
- holder: Ada Lovelace, Grace Hopper
- domains: design, product, marketing, tech, business

Any one of the holders meets a reviewer gate.

## coding-agent
The coding agent. It holds no gate.
- may: prepare a decision brief, run the checks and the evaluation, open draft branches and pull
  requests, propose the next goal
- never: approve, decide, merge, tag a release, open a goal on its own, change studio/rules.md or
  its own skills without a person's yes, handle real customer data or credentials
