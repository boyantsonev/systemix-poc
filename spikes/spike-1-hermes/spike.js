#!/usr/bin/env node
// SYSTMIX-206: Hermes-3 via Ollama — baseline MDX output test
// Run: node spike.js [test-case-id]  (omit id to run all 20)

import { readFileSync } from "node:fs";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "hermes3";

// ── Ollama call ───────────────────────────────────────────────────────────────

async function callHermes(userPrompt) {
  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: {
        temperature: 0.1,   // low temp for structured output
        top_p: 0.9,
        num_predict: 512,
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.message?.content?.trim() ?? "";
}

// ── MDX validation ────────────────────────────────────────────────────────────

function parseMdx(raw) {
  const result = { valid: false, frontmatter: null, prose: "", errors: [] };

  // Must start with ---
  if (!raw.startsWith("---")) {
    result.errors.push("Does not start with --- frontmatter delimiter");
    return result;
  }

  let yamlBlock, body;
  const end = raw.indexOf("---", 3);

  if (end !== -1) {
    // Normal case: closing --- present
    yamlBlock = raw.slice(3, end).trim();
    body = raw.slice(end + 3).trim();
  } else {
    // Fallback: model omitted closing ---; split on first blank line after frontmatter
    const afterOpen = raw.slice(3);
    const blankLine = afterOpen.search(/\n\n/);
    if (blankLine === -1) {
      result.errors.push("No closing --- frontmatter delimiter and no blank line separator");
      return result;
    }
    yamlBlock = afterOpen.slice(0, blankLine).trim();
    body = afterOpen.slice(blankLine).trim();
  }

  // Parse YAML manually (no deps) — extract key: value lines
  const fm = {};
  for (const line of yamlBlock.split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    fm[key] = val === "null" ? null : val === "true" ? true : val === "false" ? false : val;
  }

  // Required fields
  const required = ["token", "value", "figma-value", "status", "resolved", "collection", "last-updated", "last-resolver"];
  for (const f of required) {
    if (!(f in fm)) result.errors.push(`Missing frontmatter field: ${f}`);
  }

  // Status must be valid
  const validStatuses = ["clean", "drifted", "missing-in-figma"];
  if (fm.status && !validStatuses.includes(fm.status)) {
    result.errors.push(`Invalid status value: ${fm.status}`);
  }

  // Prose must exist
  if (!body || body.length < 20) {
    result.errors.push("Rationale prose is missing or too short");
  }

  result.frontmatter = fm;
  result.prose = body;
  result.valid = result.errors.length === 0;
  return result;
}

function checkHallucination(tc, parsed) {
  if (!parsed.frontmatter) return [];
  const issues = [];
  const fm = parsed.frontmatter;

  // The code value must be preserved exactly
  if (fm.value && fm.value !== tc.code_value) {
    issues.push(`HALLUCINATION: value "${fm.value}" ≠ input code_value "${tc.code_value}"`);
  }
  // Figma value must be preserved or null
  const figmaIn = tc.figma_value ?? "null";
  const figmaOut = fm["figma-value"] ?? "null";
  if (figmaOut !== figmaIn && figmaOut !== "null") {
    issues.push(`HALLUCINATION: figma-value "${figmaOut}" ≠ input "${figmaIn}"`);
  }
  // Token name must match
  if (fm.token && fm.token !== tc.token) {
    issues.push(`HALLUCINATION: token name "${fm.token}" ≠ "${tc.token}"`);
  }

  return issues;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const testCases = JSON.parse(readFileSync("./test-cases.json", "utf8"));
const targetId = process.argv[2];
const cases = targetId ? testCases.filter(tc => tc.id === targetId) : testCases;

if (cases.length === 0) {
  console.error(`No test case found for id: ${targetId}`);
  process.exit(1);
}

console.log(`\n  Systemix Spike 1 — Hermes-3 MDX baseline test`);
console.log(`  Model: ${MODEL}  Cases: ${cases.length}\n`);
console.log("  ─".repeat(40));

let passed = 0, failed = 0;
const results = [];

for (const tc of cases) {
  const prompt = buildUserPrompt(tc);
  process.stdout.write(`  ${tc.id}  ${tc.token.padEnd(30)}`);

  const t0 = performance.now();
  let raw, parsed, hallucinations;

  try {
    raw = await callHermes(prompt);
    parsed = parseMdx(raw);
    hallucinations = checkHallucination(tc, parsed);
    const ms = Math.round(performance.now() - t0);

    const ok = parsed.valid && hallucinations.length === 0;
    if (ok) { passed++; process.stdout.write(`✓  ${ms}ms\n`); }
    else     { failed++; process.stdout.write(`✗  ${ms}ms\n`); }

    results.push({ tc, raw, parsed, hallucinations, ms, ok });

    if (!parsed.valid || hallucinations.length > 0) {
      for (const e of parsed.errors)     console.log(`     error: ${e}`);
      for (const h of hallucinations)    console.log(`     ${h}`);
    }

  } catch (err) {
    failed++;
    process.stdout.write(`✗  ERROR\n`);
    console.log(`     ${err.message}`);
    results.push({ tc, raw: null, parsed: null, hallucinations: [], ms: 0, ok: false });
  }
}

console.log("  ─".repeat(40));
console.log(`\n  Results: ${passed} passed, ${failed} failed (${cases.length} total)\n`);

// Print first passing MDX as sample
const sample = results.find(r => r.ok);
if (sample) {
  console.log(`  Sample output (${sample.tc.id} — ${sample.tc.token}):\n`);
  console.log(sample.raw.split("\n").map(l => `  ${l}`).join("\n"));
  console.log();
}
