# G-005 · evals

| id | must be true | checked by | bar | answered at | status |
|---|---|---|---|---|---|
| E1 | The plugin ships exactly four commands | the built plugin's skills/ folder | setup, brief, check, loop; nothing else | build.test | pass |
| E2 | Nothing leaves the user's machine | the built plugin searched for an MCP server, a userConfig, a fetch or an http call | 0 | build.test | pass |
| E3 | A rules.md is data: every scripted rule is tested by a sample | `systemix rules eval` on the starter | every known-bad sample caught, the known-good clean | build.test | pass |
| E4 | A gate stays a person's ruling | the loop skill's frontmatter | disable-model-invocation: true | build.test | pass |
| E5 | No shipped skill names a command the plugin dropped | the build's unshipped-reference check | 0 references | build.test | pass |
| E6 | The site sells nothing the decision withdrew | a search of src/ and content/ for €9.99, €499, €990, quick report | 0 hits outside decision logs | build.test | pass |
| E7 | The site shows the sponsor link and a starting price for setup | the rendered home page | both present | product.score | open |
| E8 | A person sets up a repo with the plugin and gets a check result | the founder installs from main and runs setup then check on a real repo, observed | a check result in under 10 minutes | build.measure | open |
