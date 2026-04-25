#!/usr/bin/env node
// SYSTMIX-202: Hermes auto-instrumentation — adds posthog.capture to a React component
// Run: node instrument.js [path/to/Component.tsx]

import { readFileSync, writeFileSync } from "node:fs";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "hermes3";

const SYSTEM_PROMPT = `You are Hermes, a surgical code editor. Your job is to add PostHog event tracking to React components.

You will receive a React component's full source code. You must:
1. Add "import posthog from 'posthog-js';" after the last existing import statement
2. Add a useEffect hook inside the component function body that calls:
   posthog.capture('component_render', { component: COMPONENT_NAME, variant, size })
   - Use the actual prop variable names from the component signature
   - Only include props that exist in the component signature
   - The useEffect dependency array should include the variant and size props
3. Add React's useEffect to the React import if it is not already imported

RULES:
- Output ONLY the complete modified file. No explanations, no markdown fences.
- Do not change any other code. Every line not related to the instrumentation must be IDENTICAL to the input — copy it exactly.
- NEVER use "// ...existing code...", "// ...rest of code...", or any placeholder comment. Output every character of unchanged code.
- The posthog import goes immediately after the last import line.
- The useEffect goes as the first statement inside the component function body, before the return.
- If posthog-js is already imported, do not add it again.
- The file must end with the same export statement as the input.`;

async function callHermes(source, componentName) {
  const userPrompt = `Add PostHog render tracking to this component. Component name for the event: "${componentName}".

SOURCE:
${source}

Output the complete modified file now:`;

  const res = await fetch(OLLAMA_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      stream: false,
      options: { temperature: 0.05, top_p: 0.9, num_predict: 2048 },
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

function validate(original, instrumented, componentName) {
  const issues = [];

  if (!instrumented.includes("posthog.capture")) {
    issues.push("Missing posthog.capture call");
  }
  if (!instrumented.includes("posthog-js")) {
    issues.push("Missing posthog-js import");
  }
  if (!instrumented.includes("useEffect")) {
    issues.push("Missing useEffect hook");
  }
  if (!instrumented.includes(`component: '${componentName}'`) &&
      !instrumented.includes(`component: "${componentName}"`)) {
    issues.push(`Missing component name '${componentName}' in capture call`);
  }

  // Core logic must be preserved
  const originalLines = original.split("\n").filter(l => l.trim() && !l.includes("import"));
  const removedLines = originalLines.filter(l => !instrumented.includes(l.trim()));
  if (removedLines.length > 3) {
    issues.push(`Possible code deletion: ${removedLines.length} original lines not found in output`);
  }

  return issues;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const sourcePath = process.argv[2] ?? "./fixtures/button.source.tsx";
const componentName = process.argv[3] ?? "Button";

const source = readFileSync(sourcePath, "utf8");
console.log(`\n  Systemix Spike 3 — Auto-instrumentation`);
console.log(`  Component: ${componentName}  Source: ${sourcePath}\n`);

console.log("  Calling Hermes...");
const t0 = performance.now();
const instrumented = await callHermes(source, componentName);
const ms = Math.round(performance.now() - t0);
console.log(`  Done in ${ms}ms\n`);

const issues = validate(source, instrumented, componentName);

if (issues.length === 0) {
  const outPath = sourcePath.replace(/\.tsx$/, ".instrumented.tsx");
  writeFileSync(outPath, instrumented);
  console.log(`  ✓ Instrumentation valid. Written to: ${outPath}`);

  // Show just the added lines
  const originalSet = new Set(source.split("\n").map(l => l.trim()));
  const addedLines = instrumented.split("\n").filter(l => !originalSet.has(l.trim()) && l.trim());
  console.log(`\n  Added lines:`);
  for (const line of addedLines) console.log(`    + ${line}`);
} else {
  console.log("  ✗ Validation failed:");
  for (const issue of issues) console.log(`    - ${issue}`);
  console.log("\n  Raw output (first 800 chars):");
  console.log(instrumented.slice(0, 800));
}

console.log();
export { callHermes, validate };
