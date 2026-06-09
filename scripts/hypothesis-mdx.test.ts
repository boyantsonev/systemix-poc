#!/usr/bin/env tsx
/**
 * hypothesis-mdx.test.ts — regression for the evidence-posthog write-back.
 *
 * Bug: a single-line regex (`/^evidence-posthog:.*$/m`) only replaced the key
 * line, so a SECOND decision write-back left the previous nested keys orphaned,
 * producing duplicate `fetched_at`/`source`/`confidence` keys that corrupt the
 * YAML. This asserts re-deciding the same hypothesis overwrites cleanly and the
 * frontmatter still parses with a single evidence-posthog block.
 *
 * Usage: npm run test:contract  (or: npx tsx scripts/hypothesis-mdx.test.ts)
 */

import assert from "node:assert/strict";
import matter from "gray-matter";
import {
  applyHypothesisDecisionToMdx,
  setTopLevelField,
} from "../src/lib/contract/hypothesis-mdx";

const FIXTURE = `---
type: hypothesis
id: hero-vp-icp-match-2026-04
status: running
variants:
  control: "A"
  variant_b: "B"
result: null
decision: null
confidence: null
evidence-posthog: null
---

## Why This Hypothesis

The original rationale prose, which must survive write-back.
`;

let failures = 0;
function check(label: string, fn: () => void) {
  try {
    fn();
    console.log("  ✓ " + label);
  } catch (err) {
    console.log("  ✗ " + label + "  →  " + (err as Error).message);
    failures++;
  }
}

console.log("\n  hypothesis-mdx regression\n");

// First decision: evidence-posthog goes from `null` to a nested block.
const firstPass = applyHypothesisDecisionToMdx(FIXTURE, {
  decision: "kill",
  now: "2026-05-01",
  confidence: 0,
  source: "dashboard",
  context: "Initial decision.",
});
assert(firstPass !== null, "first pass returned null");

// Second decision on the ALREADY-written contract — the regression trigger.
const secondPass = applyHypothesisDecisionToMdx(firstPass, {
  decision: "promote",
  now: "2026-05-08",
  confidence: 0.87,
  source: "posthog",
  context: "Re-decided after more evidence.",
});
assert(secondPass !== null, "second pass returned null");

check("frontmatter still parses after re-decision (no duplicate YAML keys)", () => {
  // gray-matter (js-yaml) throws on duplicated mapping keys, which is exactly
  // what the pre-fix orphaned block produced.
  matter(secondPass!);
});

check("evidence-posthog holds only the LATEST decision's values", () => {
  const { data } = matter(secondPass!);
  assert.deepEqual(data["evidence-posthog"], {
    fetched_at: "2026-05-08",
    source: "posthog",
    confidence: 0.87,
  });
});

check("exactly one evidence-posthog block (no orphaned nested lines)", () => {
  const fm = secondPass!.match(/^---\n([\s\S]*?)\n---/)![1];
  assert.equal((fm.match(/^evidence-posthog:/gm) ?? []).length, 1, "duplicate evidence-posthog key");
  assert.equal((fm.match(/^\s+fetched_at:/gm) ?? []).length, 1, "duplicate fetched_at key");
  assert.equal((fm.match(/^\s+source:/gm) ?? []).length, 1, "duplicate source key");
});

check("top-level decision fields are set, not duplicated", () => {
  const { data } = matter(secondPass!);
  assert.equal(data.result, "promote");
  assert.equal(data.decision, "promote");
  assert.equal(data.status, "complete");
  assert.equal(data.confidence, 0.87);
  const fm = secondPass!.match(/^---\n([\s\S]*?)\n---/)![1];
  assert.equal((fm.match(/^result:/gm) ?? []).length, 1, "duplicate result key");
});

check("rationale prose survives write-back", () => {
  assert(secondPass!.includes("The original rationale prose, which must survive write-back."));
  // ...and only one Production Evidence section accumulates.
  assert.equal((secondPass!.match(/^## Production Evidence/gm) ?? []).length, 1);
});

check("setTopLevelField collapses an existing nested block", () => {
  const before = "a: 1\nevidence-posthog:\n  old: x\n  stale: y\nb: 2";
  const after = setTopLevelField(before, "evidence-posthog", "evidence-posthog:\n  new: z");
  assert.equal(after, "a: 1\nevidence-posthog:\n  new: z\nb: 2");
});

console.log();
if (failures === 0) {
  console.log("  All checks passed.\n");
} else {
  console.log(`  ${failures} check(s) failed.\n`);
  process.exit(1);
}
