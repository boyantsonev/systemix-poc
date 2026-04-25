#!/usr/bin/env node
// SYSTMIX-202: Full PostHog feedback loop — instrument → query → write-back → HITL gate
// Set HITL_AUTO_APPROVE=1 to skip interactive prompt (for CI / demo)
// Run: node loop.js

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { callHermes as instrument, validate as validateInstrument } from "./instrument.js";
import { queryPostHog } from "./posthog-query.js";
import { callHermesWriteback, validateWriteback } from "./evidence-writeback.js";
import { requestApproval, writePending } from "./hitl-gate.js";

const COMPONENT_NAME  = "Button";
const SOURCE_PATH     = join(import.meta.dirname, "fixtures/button.source.tsx");
const CONTRACT_PATH   = join(import.meta.dirname, "../../contract/components/Button.mdx");

function step(n, label) {
  console.log(`\n  ── Step ${n}: ${label} ${"─".repeat(Math.max(0, 50 - label.length))}`);
}

console.log(`\n  ╔══════════════════════════════════════════════════════╗`);
console.log(`  ║   Systemix Spike 3 — Full PostHog Feedback Loop     ║`);
console.log(`  ╚══════════════════════════════════════════════════════╝\n`);

// ── Step 1: Auto-instrument ───────────────────────────────────────────────────
step(1, "Auto-instrumentation");

const source = readFileSync(SOURCE_PATH, "utf8");
console.log(`  Component: ${COMPONENT_NAME}  (${source.split("\n").length} lines)`);
console.log("  Calling Hermes to add posthog.capture...");

const t1 = performance.now();
const instrumented = await instrument(source, COMPONENT_NAME);
const ms1 = Math.round(performance.now() - t1);
const instrIssues = validateInstrument(source, instrumented, COMPONENT_NAME);

if (instrIssues.length > 0) {
  console.log(`  ✗ Instrumentation failed (${ms1}ms):`);
  for (const i of instrIssues) console.log(`    - ${i}`);
} else {
  const addedLines = instrumented.split("\n").filter(l =>
    !new Set(source.split("\n").map(x => x.trim())).has(l.trim()) && l.trim()
  );
  console.log(`  ✓ Instrumentation valid (${ms1}ms) — ${addedLines.length} lines added`);
  for (const l of addedLines) console.log(`    + ${l}`);
}

// ── Step 2: HITL gate for instrumentation ────────────────────────────────────
step(2, "HITL gate — instrumentation approval");

let instrApproved = false;
if (instrIssues.length === 0) {
  const instrOutPath = SOURCE_PATH.replace(".tsx", ".instrumented.tsx");
  const { approved } = await requestApproval(
    source,
    instrumented,
    "src/components/ui/button.tsx",
    "Hermes wants to add PostHog render tracking to Button"
  );
  instrApproved = approved;

  if (approved) {
    writeFileSync(instrOutPath, instrumented);
    console.log(`  Written to: ${instrOutPath}`);
  } else {
    writePending("src/components/ui/button.tsx", instrumented, "PostHog auto-instrumentation");
  }
} else {
  console.log("  Skipped — instrumentation invalid");
}

// ── Step 3: PostHog query ─────────────────────────────────────────────────────
step(3, "PostHog query (30d event data)");

const posthogData = await queryPostHog(COMPONENT_NAME, 30);
console.log(`  Source: ${posthogData.source}  |  Total renders: ${posthogData.total_renders}`);
console.log("  Variants:");
for (const [v, s] of Object.entries(posthogData.variants)) {
  const ctr = posthogData.ctr_by_variant?.[v];
  console.log(`    ${v.padEnd(14)} ${String(s.renders).padStart(6)} renders${ctr != null ? `  CTR ${(ctr * 100).toFixed(1)}%` : ""}`);
}

// ── Step 4: Evidence write-back ───────────────────────────────────────────────
step(4, "Evidence write-back — Hermes updates MDX");

const originalMdx = readFileSync(CONTRACT_PATH, "utf8");
console.log("  Calling Hermes to update contract MDX...");

const t4 = performance.now();
const updatedMdx = await callHermesWriteback(originalMdx, posthogData);
const ms4 = Math.round(performance.now() - t4);
const writeIssues = validateWriteback(originalMdx, updatedMdx, posthogData);

if (writeIssues.length > 0) {
  console.log(`  ✗ Write-back invalid (${ms4}ms):`);
  for (const i of writeIssues) console.log(`    - ${i}`);
} else {
  console.log(`  ✓ Write-back valid (${ms4}ms)`);
}

// ── Step 5: HITL gate for MDX write ──────────────────────────────────────────
step(5, "HITL gate — MDX write approval");

if (writeIssues.length === 0) {
  const { approved } = await requestApproval(
    originalMdx,
    updatedMdx,
    "contract/components/Button.mdx",
    "Hermes wants to write PostHog evidence to the contract file"
  );

  if (approved) {
    writeFileSync(CONTRACT_PATH, updatedMdx);
    console.log(`  Written to: contract/components/Button.mdx`);
  } else {
    writePending(CONTRACT_PATH, updatedMdx, "PostHog evidence write-back for Button");
  }
} else {
  console.log("  Skipped — write-back invalid");
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n  ╔══════════════════════════════════════════════════════╗`);
console.log(`  ║   Loop Summary                                       ║`);
console.log(`  ╠══════════════════════════════════════════════════════╣`);
console.log(`  ║  1. Instrumentation   ${instrIssues.length === 0 ? "✓" : "✗"}  ${ms1}ms                           ║`);
console.log(`  ║  2. HITL (instr)      ${instrIssues.length === 0 ? (instrApproved ? "✓ approved" : "⊘ pending ") : "— skipped  "}                      ║`);
console.log(`  ║  3. PostHog query     ✓  ${posthogData.total_renders} renders (${posthogData.source})${" ".repeat(Math.max(0, 13 - posthogData.source.length - String(posthogData.total_renders).length))}║`);
console.log(`  ║  4. Evidence write    ${writeIssues.length === 0 ? "✓" : "✗"}  ${ms4}ms                           ║`);
console.log(`  ╚══════════════════════════════════════════════════════╝\n`);
