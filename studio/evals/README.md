# Evals

Three layers (docs/catalog.md, "Test plan").

1. **Deterministic**: `npx jest` from `studio/`. These are the goldens for every command on the
   fixtures in `fixtures/`, plus the rules eval, the schema and privacy lints, and the plugin
   build's path and leak checks. They need no key and gate every pull request.
2. **Behavioural** and 3. **judged**: `node evals/run.mjs`. Each case runs in a fresh nested
   Claude Code session on a throwaway copy of its fixture, with the built plugin loaded, MCP off,
   and Bash limited to the commands the guides use. Free text is graded by a separate session
   that sees only the criteria and the transcript. This layer needs Claude Code and costs money.

```
node evals/run.mjs --list                                   # the cases and trigger asks
node evals/run.mjs --triggers [--limit N]                   # which skill each ask fires
node evals/run.mjs --cases check,brief [--samples 3]        # cases by file; a majority passes
node evals/run.mjs --case <id> --keep                       # one case, keep its temp repo
  --concurrency N (4)   --max-cost-usd X (25)   --no-judge   --out <file>
```

Results are written to `results/<date>.json`, the file `admin eval` reads. The release bar:

- layer 1 at 100%;
- `first-run-check-then-setup` passing;
- triggers: at least 90% of positives and 100% of negatives;
- every other non-beta case at least 90%;
- no case regressing against the last release.
