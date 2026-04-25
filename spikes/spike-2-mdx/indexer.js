#!/usr/bin/env node
// SYSTMIX-201: MDX contract indexer
// Reads all .mdx files in /contract/, parses frontmatter with gray-matter,
// answers 4 core queries: getToken, listDrifted, getComponent, getQualityScore

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename } from "node:path";
import matter from "gray-matter";

// ── Index builder ─────────────────────────────────────────────────────────────

function buildIndex(contractDir) {
  const tokens = new Map();
  const components = new Map();

  function scanDir(dir) {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      if (statSync(fullPath).isDirectory()) {
        scanDir(fullPath);
        continue;
      }
      if (!entry.endsWith(".mdx")) continue;

      const raw = readFileSync(fullPath, "utf8");
      const { data: fm, content } = matter(raw);

      if (fm.token) {
        tokens.set(fm.token, { ...fm, prose: content.trim(), file: fullPath });
      } else if (fm.component) {
        components.set(fm.component, { ...fm, prose: content.trim(), file: fullPath });
      }
    }
  }

  scanDir(contractDir);
  return { tokens, components };
}

// ── Query API ─────────────────────────────────────────────────────────────────

function getToken(index, name) {
  const token = index.tokens.get(name);
  if (!token) return { error: `Token not found: ${name}` };
  return token;
}

function listDrifted(index) {
  const driftedTokens = [...index.tokens.values()].filter(t => t.status === "drifted");
  const driftedComponents = [...index.components.values()].filter(c => c.parity === "drifted");
  return {
    tokens: driftedTokens.map(t => ({ token: t.token, value: t.value, "figma-value": t["figma-value"], resolved: t.resolved })),
    components: driftedComponents.map(c => ({ component: c.component, path: c.path, "last-screenshot": c["last-screenshot"] })),
    total: driftedTokens.length + driftedComponents.length,
  };
}

function getComponent(index, name) {
  const component = index.components.get(name);
  if (!component) return { error: `Component not found: ${name}` };
  return component;
}

function getQualityScore(index) {
  const tokens = [...index.tokens.values()];
  const components = [...index.components.values()];

  const totalTokens = tokens.length;
  const cleanTokens = tokens.filter(t => t.status === "clean").length;
  const driftedUnresolved = tokens.filter(t => t.status === "drifted" && !t.resolved).length;
  const missingInFigma = tokens.filter(t => t.status === "missing-in-figma").length;

  const totalComponents = components.length;
  const cleanComponents = components.filter(c => c.parity === "clean").length;

  // Score: clean ratio, penalised for unresolved drift and missing tokens
  const tokenScore = totalTokens === 0 ? 1 : (cleanTokens / totalTokens) - (driftedUnresolved * 0.05) - (missingInFigma * 0.03);
  const componentScore = totalComponents === 0 ? 1 : cleanComponents / totalComponents;
  const overall = Math.max(0, Math.round(((tokenScore + componentScore) / 2) * 100));

  return {
    overall,
    tokens: { total: totalTokens, clean: cleanTokens, driftedUnresolved, missingInFigma },
    components: { total: totalComponents, clean: cleanComponents, drifted: totalComponents - cleanComponents },
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const contractDir = new URL("./contract", import.meta.url).pathname;
const t0 = performance.now();
const index = buildIndex(contractDir);
const indexMs = Math.round(performance.now() - t0);

console.log(`\n  Systemix Spike 2 — MDX Indexer`);
console.log(`  Indexed ${index.tokens.size} tokens + ${index.components.size} components in ${indexMs}ms\n`);

// Demo all 4 queries
console.log("  ── getToken(color-primary) ──────────────────────");
console.log(JSON.stringify(getToken(index, "color-primary"), null, 2).split("\n").map(l => `  ${l}`).join("\n"));

console.log("\n  ── listDrifted() ────────────────────────────────");
console.log(JSON.stringify(listDrifted(index), null, 2).split("\n").map(l => `  ${l}`).join("\n"));

console.log("\n  ── getComponent(Button) ─────────────────────────");
console.log(JSON.stringify(getComponent(index, "Button"), null, 2).split("\n").map(l => `  ${l}`).join("\n"));

console.log("\n  ── getQualityScore() ────────────────────────────");
console.log(JSON.stringify(getQualityScore(index), null, 2).split("\n").map(l => `  ${l}`).join("\n"));

console.log();

export { buildIndex, getToken, listDrifted, getComponent, getQualityScore };
