#!/usr/bin/env node
// SYSTMIX-202: Evidence write-back — Hermes updates MDX frontmatter + prose with PostHog data
// Run: node evidence-writeback.js

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { queryPostHog } from "./posthog-query.js";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL      = "hermes3";

const SYSTEM_PROMPT = `You are Hermes, the contract author for a design system called Systemix.

You will receive an existing MDX contract file for a component, and PostHog production usage data for that component.

Your job is to update the file:
1. Update the evidence-posthog field in the frontmatter YAML with the PostHog data
2. Update (or add) a "## Production Evidence" section at the end of the prose with 2-3 sentences summarising what the data shows

OUTPUT FORMAT — produce exactly this structure:
---
[all existing frontmatter fields, unchanged except evidence-posthog]
evidence-posthog:
  renders-30d: NUMBER
  top-variant: VARIANT_NAME
  variants:
    variant1:
      renders: NUMBER
    variant2:
      renders: NUMBER
  last-fetched: YYYY-MM-DD
---

[existing prose, unchanged]

## Production Evidence

[2-3 sentences about what the PostHog data shows. Be specific about numbers. Do not invent numbers not in the input data.]

RULES:
- Never change any frontmatter field except evidence-posthog
- Never remove or change the existing prose paragraphs
- The evidence-posthog block must be valid YAML, indented with 2 spaces
- Output ONLY the complete updated MDX. No markdown fences, no explanation.`;

async function callHermes(mdxContent, posthogData) {
  const userPrompt = `Update this MDX contract file with the PostHog production data below.

EXISTING MDX:
${mdxContent}

POSTHOG DATA:
${JSON.stringify(posthogData, null, 2)}

Output the complete updated MDX file now:`;

  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: { temperature: 0.1, top_p: 0.9, num_predict: 1024 },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}`);
  const json = await res.json();
  return json.message?.content?.trim() ?? "";
}

function validate(original, updated, posthogData) {
  const issues = [];

  if (!updated.startsWith("---")) {
    issues.push("Output does not start with --- frontmatter delimiter");
  }
  if (!updated.includes("evidence-posthog:")) {
    issues.push("Missing evidence-posthog field");
  }
  const hasRendersField = ["renders-30d:", "total-renders:", "total_renders:"].some(f => updated.includes(f));
  if (!hasRendersField) {
    issues.push("Missing renders count field in evidence-posthog");
  }
  if (!updated.includes("## Production Evidence")) {
    issues.push("Missing ## Production Evidence section");
  }
  if (!updated.includes(String(posthogData.total_renders))) {
    issues.push(`Total renders (${posthogData.total_renders}) not found in output`);
  }

  // Existing frontmatter fields must be preserved
  const preservedFields = ["component:", "path:", "figma-node:", "storybook-story:", "parity:"];
  for (const field of preservedFields) {
    if (original.includes(field) && !updated.includes(field)) {
      issues.push(`Missing preserved field: ${field}`);
    }
  }

  return issues;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const contractPath = process.argv[2] ?? "../../contract/components/Button.mdx";
const componentName = process.argv[3] ?? "Button";

console.log(`\n  Systemix Spike 3 — Evidence write-back`);
console.log(`  Component: ${componentName}  Contract: ${contractPath}\n`);

const original = readFileSync(join(import.meta.dirname, contractPath), "utf8");

console.log("  Querying PostHog...");
const posthogData = await queryPostHog(componentName);
console.log(`  Got data: ${posthogData.total_renders} renders (${posthogData.source})\n`);

console.log("  Calling Hermes to update MDX...");
const t0 = performance.now();
const updated = await callHermes(original, posthogData);
const ms = Math.round(performance.now() - t0);
console.log(`  Done in ${ms}ms\n`);

const issues = validate(original, updated, posthogData);

if (issues.length === 0) {
  console.log("  ✓ Write-back valid\n");
  console.log("  Updated MDX:");
  console.log(updated.split("\n").map(l => `  ${l}`).join("\n"));
} else {
  console.log("  ✗ Validation failed:");
  for (const issue of issues) console.log(`    - ${issue}`);
  console.log("\n  Raw output:");
  console.log(updated.slice(0, 600));
}

console.log();
export { callHermes as callHermesWriteback, validate as validateWriteback };
