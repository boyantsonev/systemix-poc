#!/usr/bin/env node
// SYSTMIX-201: Performance test — index 200 MDX files, measure query latency

import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { buildIndex, listDrifted, getQualityScore } from "./indexer.js";

const TMP_DIR = new URL("./contract-perf-tmp", import.meta.url).pathname;
const N = 200;

// ── Generate N synthetic MDX token files ─────────────────────────────────────

const statuses = ["clean", "drifted", "missing-in-figma"];
const collections = ["Semantic", "Status", "Spacing", "Typography", "Effects"];
const resolvers = ["human", "hermes", null];

function randomMdx(i) {
  const status = statuses[i % 3];
  const resolved = status === "drifted" && i % 4 === 0;
  const figmaValue = status === "missing-in-figma" ? null : `oklch(0.${40 + (i % 50)} 0.1${i % 9} ${200 + (i % 100)})`;
  return `---
token: token-${i.toString().padStart(4, "0")}
value: oklch(0.${40 + (i % 50)} 0.1${i % 9} ${200 + (i % 100)})
figma-value: ${figmaValue ?? "null"}
status: ${status}
resolved: ${resolved}
source: css
collection: ${collections[i % 5]}
last-updated: 2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}
last-resolver: ${resolvers[i % 3] ?? "null"}
evidence-posthog: null
---

This is synthetic token number ${i} generated for the performance test. It has status ${status} and belongs to the ${collections[i % 5]} collection.
`;
}

// Setup: write files
console.log(`\n  Systemix Spike 2 — Performance test (N=${N})\n`);
rmSync(TMP_DIR, { recursive: true, force: true });
mkdirSync(join(TMP_DIR, "tokens"), { recursive: true });

const writeStart = performance.now();
for (let i = 0; i < N; i++) {
  writeFileSync(join(TMP_DIR, "tokens", `token-${i.toString().padStart(4, "0")}.mdx`), randomMdx(i));
}
const writeMs = Math.round(performance.now() - writeStart);
console.log(`  Write ${N} files: ${writeMs}ms`);

// ── Benchmark: full index ─────────────────────────────────────────────────────
const RUNS = 5;
const indexTimes = [];

for (let r = 0; r < RUNS; r++) {
  const t0 = performance.now();
  buildIndex(TMP_DIR);
  indexTimes.push(Math.round(performance.now() - t0));
}

indexTimes.sort((a, b) => a - b);
const p50idx = indexTimes[Math.floor(indexTimes.length / 2)];
console.log(`  Index ${N} files — p50: ${p50idx}ms  min: ${indexTimes[0]}ms  max: ${indexTimes.at(-1)}ms`);

// ── Benchmark: queries on live index ─────────────────────────────────────────
const liveIndex = buildIndex(TMP_DIR);

const QUERY_RUNS = 100;

// listDrifted
const driftTimes = [];
for (let r = 0; r < QUERY_RUNS; r++) {
  const t0 = performance.now();
  listDrifted(liveIndex);
  driftTimes.push(performance.now() - t0);
}
driftTimes.sort((a, b) => a - b);
const p50drift = driftTimes[Math.floor(driftTimes.length / 2)].toFixed(3);
console.log(`  listDrifted() × ${QUERY_RUNS} — p50: ${p50drift}ms`);

// getQualityScore
const scoreTimes = [];
for (let r = 0; r < QUERY_RUNS; r++) {
  const t0 = performance.now();
  getQualityScore(liveIndex);
  scoreTimes.push(performance.now() - t0);
}
scoreTimes.sort((a, b) => a - b);
const p50score = scoreTimes[Math.floor(scoreTimes.length / 2)].toFixed(3);
console.log(`  getQualityScore() × ${QUERY_RUNS} — p50: ${p50score}ms`);

// Cleanup
rmSync(TMP_DIR, { recursive: true, force: true });
console.log(`\n  Cleanup done. Results above are on Node ${process.version}.\n`);
