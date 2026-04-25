#!/usr/bin/env node
// SYSTMIX-208: Latency benchmark — p50/p95 for single patch and batch of 10
// Run: node benchmark.js

import { readFileSync } from "node:fs";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "hermes3";
const RUNS = 10; // runs per test case for stats

async function callHermes(userPrompt) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: { temperature: 0.1, top_p: 0.9, num_predict: 512 },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  return res.json();
}

function percentile(sorted, p) {
  const i = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, i)];
}

const testCases = JSON.parse(readFileSync("./test-cases.json", "utf8"));

console.log(`\n  Systemix Spike 1 — Latency benchmark`);
console.log(`  Model: ${MODEL}  Runs per case: ${RUNS}\n`);

// ── Single patch benchmark ────────────────────────────────────────────────────

const singleCase = testCases[0]; // tc-01: color-primary drift
console.log(`  [Single patch] ${singleCase.token}`);
const singleTimes = [];

for (let i = 0; i < RUNS; i++) {
  const t0 = performance.now();
  await callHermes(buildUserPrompt(singleCase));
  singleTimes.push(Math.round(performance.now() - t0));
  process.stdout.write(`  run ${i + 1}/${RUNS}: ${singleTimes.at(-1)}ms\n`);
}

singleTimes.sort((a, b) => a - b);
console.log(`\n  p50: ${percentile(singleTimes, 50)}ms`);
console.log(`  p95: ${percentile(singleTimes, 95)}ms`);
console.log(`  min: ${singleTimes[0]}ms  max: ${singleTimes.at(-1)}ms\n`);

// ── Batch of 10 benchmark ─────────────────────────────────────────────────────

const batchCases = testCases.slice(0, 10);
console.log(`  [Batch of 10] sequential calls`);
const batchRuns = [];

for (let i = 0; i < 3; i++) {
  const t0 = performance.now();
  for (const tc of batchCases) {
    await callHermes(buildUserPrompt(tc));
  }
  const elapsed = Math.round(performance.now() - t0);
  batchRuns.push(elapsed);
  console.log(`  batch run ${i + 1}/3: ${elapsed}ms total (avg ${Math.round(elapsed / 10)}ms/token)`);
}

batchRuns.sort((a, b) => a - b);
console.log(`\n  batch p50: ${percentile(batchRuns, 50)}ms total`);
console.log(`  batch avg per token: ${Math.round(batchRuns[Math.floor(batchRuns.length / 2)] / 10)}ms\n`);

console.log(`  Benchmark complete. Results above are wall-clock times on this machine.`);
console.log(`  Hardware: Apple Silicon (assumed). Context: Ollama with Flash Attention.\n`);
