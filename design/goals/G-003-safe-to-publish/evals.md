# G-003 · evals

| id | must be true | checked by | bar | answered at | status |
|---|---|---|---|---|---|
| E1 | No internal design/ file is published by the docs site | the built route list (`next build`) searched for /design/context, /design/goals, /design/briefs | 0 routes | build.test | pass |
| E2 | No retired offer is on sale anywhere | /kit answered by a redirect; a search of src/ and content/ for €99, €249, €490 | redirect; 0 hits outside the decision logs | build.test | pass |
| E3 | No API route serves repo state, paths or emails on production | a test with VERCEL=1 over every local route; /api/subscribe gone | every local route refused; 0 absolute paths in responses | build.test | pass |
| E4 | `init` never destroys a user's Claude settings | a test with a truncated ~/.claude.json | the file byte-for-byte unchanged; exit 1 with a message | build.test | pass |
| E5 | `update` writes nothing a person did not see and accept | tests: only installed pipelines reinstalled; packs pinned to a commit; a diff shown and confirmed | all three pass | build.test | pass |
| E6 | Stored keys are private to the user | a test of the config file's mode | 0600 | build.test | pass |
| E7 | The agent cannot rule | tests: no MCP tool resolves a card or closes an experiment; `systemix experiment ack` is the typed approval; a decision line whose person does not hold the role fails `loops check` | all pass | build.test | pass |
| E8 | The plugin references only what it ships | the build check run on a skill with an unshipped reference | the build fails, naming the reference | build.test | pass |
| E9 | The free score never leaves the machine | `audit report` without a key, with the network blocked | a score printed; 0 network calls | build.test | pass |
| E10 | CI guards all of this | ci.yml on a PR and on main | plugin check, loops check, hub tests and both suites green | build.test | open |
| E11 | A person gets a free score from the merged plugin with no network | the founder installs from main and runs /systemix:score offline, observed | a score in under 2 minutes; nothing sent | build.measure | open |
