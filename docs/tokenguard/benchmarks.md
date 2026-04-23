# TokenGuard — Benchmarks

Token savings observed across representative Figma file types and workflow configurations.

---

## Savings by File Type and Workflow

| File Type | Skills Used | Unoptimized | Optimized | Savings |
|---|---|---|---|---|
| Small DS (50 components) | figma-read + token-diff | ~45k | ~7k | 85% |
| Medium DS (200 components) | full sync | ~180k | ~28k | 84% |
| Large DS (500+ components) | full sync | ~420k | ~61k | 85% |
| Token-only sync | tokens only | ~35k | ~5k | 86% |
| Single component audit | figma-read | ~8k | ~2k | 75% |

**Optimized** = TokenGuard enabled with `--incremental`, MCP proxy active, warm cache (2+ previous runs).

**Unoptimized** = Direct `get_file_data` call or unscoped agent exploration, no cache, no session scoping.

---

## Savings Breakdown by Optimization Layer

Not all savings come from the same place. Here is how the ~85% reduction breaks down across the three main optimization levers:

| Optimization Layer | Typical Contribution | Mechanism |
|---|---|---|
| Scoped MCP calls (proxy interception) | 50–60% | Replacing `get_file_data` with node-scoped `get_design_context` |
| Disk cache (unchanged nodes) | 15–25% | Serving cached responses for nodes with unchanged content hashes |
| Session scoping (no history carryover) | 10–15% | Each skill starts with structured handoff payload, not full conversation history |

On a warm cache with stable files (low churn), the cache layer contribution increases — savings of 90%+ are achievable on repeat runs with no changes.

---

## Cache Hit Ratio by Run Number

| Run | Cache Hit Ratio | Notes |
|---|---|---|
| 1st run | 0% | Cold cache — all nodes fetched |
| 2nd run (no changes) | ~85% | All nodes cached; only metadata re-checked |
| 2nd run (minor changes) | ~70% | Changed nodes re-fetched; stable nodes cached |
| 5th+ run (stable file) | 90%+ | Node map mature; most responses served from cache |

The cache hit ratio is shown in every dry-run estimate and in the TokenGuard Dashboard.

---

## Estimation Accuracy

The pre-run token estimator (`--dry-run`) targets ±15% accuracy against actual run costs. Accuracy improves with more runs against the same file, as the estimation model is calibrated from local run history.

| Estimator State | Typical Accuracy |
|---|---|
| First run (no history) | ±25% (seeded benchmarks only) |
| After 3 runs | ±15% |
| After 10+ runs | ±8% |

---

## Methodology

These benchmarks were produced using the following approach:

1. **File selection:** Representative Figma files across four size tiers, covering common design system structures (component sets, variable collections, text styles).

2. **Unoptimized baseline:** Token counts measured from direct `get_file_data` calls followed by full agent exploration — the pattern used by most Figma MCP integrations today.

3. **Optimized measurement:** Token counts measured after three warm-up runs with TokenGuard enabled (`--incremental`, MCP proxy, session scoping). Cache hit ratio stabilized before final measurement.

4. **Token counting:** Actual token counts from Anthropic API responses (input tokens, not estimated). Pro plan limits are enforced on a 5-hour rolling window and vary by model and load — numbers above represent typical conditions, not worst-case.

5. **Reproducibility:** Benchmarks are point-in-time. Figma file complexity, model context windows, and MCP server response formats may change.

---

## Running Your Own Benchmarks

The `systemix benchmark` command for automated benchmark generation against your own files is **coming soon**.

In the meantime, run a dry-run before and after enabling TokenGuard to measure savings on your specific files:

```bash
# Before TokenGuard (direct sync, no cache)
npx systemix sync --dry-run

# After TokenGuard (incremental, warm cache)
npx systemix sync --dry-run --incremental
```

The difference in estimated token costs approximates your savings.

---

## See Also

- [Overview](overview.md)
- [Getting Started](getting-started.md)
- [CLI Reference](cli-reference.md)
- [MCP Proxy](mcp-proxy.md)
- [CI/CD Integration](ci-cd.md)
