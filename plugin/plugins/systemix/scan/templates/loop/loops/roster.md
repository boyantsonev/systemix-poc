---
updated: {{TODAY}}
---
# Roster — who holds which role this week

The loops name roles; this file names people. A gate that says
`engineering-lead` is met by whoever holds that role today — or, while they are
away, by the deputy with the agent's brief in hand. A role's `domains` are the
context packs it answers from, and the packs a deputy reads before deciding.

## design-lead
- holder: {{PERSON_A}}
- deputy: engineering-lead
- domains: design, product, marketing

## engineering-lead
- holder: {{PERSON_B}}
- deputy: design-lead
- domains: tech, product

## founder
- holder: {{PERSON_A}}
- domains: business

## reviewer
- holder: {{PERSON_A}}, {{PERSON_B}} — the human in the loop; any one of them meets the gate
- domains: design, product, marketing, tech, business

Approves what the agent prepared: a pull request, a merge, a claim going live,
a loop's revision. Confirming a factual claim means knowing it is true: a
reviewer who cannot vouch for a technical fact asks, or cuts the line.

## agent
- holder: Claude
- may: prepare a decision brief, run the evaluation, open draft branches and PRs
  in its lane, propose the next goal, draft a roster change, ask the questions the
  absent expert would ask, merge a pull request when a reviewer explicitly asks
  for it — then report what merged and what CI said
- never: approve, decide, flip a loop to agreed, merge unasked, tag a release,
  start a goal on its own, handle real user/customer secrets or personal data,
  change its own skills or guardrails without a reviewer's approval
