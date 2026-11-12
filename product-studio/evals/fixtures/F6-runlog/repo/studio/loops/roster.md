---
preset: solo
updated: 2026-01-10
---
# Roster: who holds which role

The loops name roles; this file names people. A gate (a point where a person rules) is met by
whoever holds its role. This is the solo preset: one person holds every role, so there is no
deputy (a stand-in while the holder is away).

## design-lead
- holder: Ada Lovelace
- domains: design, product, marketing

## engineering-lead
- holder: Ada Lovelace
- domains: tech, product

## reviewer
- holder: Ada Lovelace
- domains: design, product, marketing, tech, business

Rules on every gate: approve, rework or drop.

## coding-agent
The coding agent. It holds no gate.
- may: prepare a decision brief, run the checks and the evaluation, open draft branches and pull
  requests, propose the next goal
- never: approve, decide, merge, tag a release, open a goal on its own, change studio/rules.md or
  its own skills without a person's yes, handle real customer data or credentials
