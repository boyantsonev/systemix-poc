# G-004 · evals

| id | must be true | checked by | bar | answered at | status |
|---|---|---|---|---|---|
| E1 | No Deferred feature in the help or the plugin | `systemix --help` and the plugin's skill list searched for token-guard, mcp-proxy, figma | 0 hits outside `systemix labs` | build.test | open |
| E2 | Nothing in the MCP server talks to Supabase | a search of packages/ for supabase, and the server started with Supabase variables set | 0 hits; no outbound connection | build.test | open |
| E3 | The hosted control plane is off production | the preview deployment's /config, /contract, /skills, /experiments | each redirects or 404s | build.test | open |
| E4 | Dead code and dependencies are gone and the build still passes | an unused-export and unused-dependency check; `next build` | 0 unused routes, hooks or deps listed in the review; build green | build.test | open |
| E5 | Every name has one meaning | tests over layout.js; a search for experiments/goals and `systemix loop ` | objectives in experiments/objectives, work goals in design/goals, `experiment run` for the runner; old names only as aliases | build.test | open |
| E6 | One decision store, one canonical log per kind | a search for hitl-queue.json; each log's first lines | 0 readers of hitl-queue.json; each log says what it holds and where the others are | build.test | open |
| E7 | Docs describe what ships | the reviewer reads CLAUDE.md and README against the plugin | the pitch, the plugin install, the loops; no stale status | build.review | open |
| E8 | Lint and typecheck gate CI | ci.yml on a PR | eslint and tsc with 0 errors | build.test | open |
| E9 | Existing users are not broken | tests calling every renamed command by its old name | works, with a one-line notice | build.test | open |
