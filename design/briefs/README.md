# Decision briefs

`/systemix:decide` writes one before every `approve` and `decide` gate:
`design/briefs/B-NNN-<slug>.md`, so whoever holds the role this week — or the
deputy — rules from the same facts and the questions the absent expert would ask.

```markdown
---
id: B-012
gate: build.plan             # or `question` for a free-text one
role: engineering-lead
decides: Ada as deputy       # holder | <name> as deputy
needs: holder or deputy
context: [tech, product]
date: YYYY-MM-DD
---
# The question, as a title
## The question
## Options
## Evidence
## Recommendation
## What the <role> would ask
## Decision
_(left for the person)_
```
