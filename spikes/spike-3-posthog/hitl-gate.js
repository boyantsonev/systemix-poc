#!/usr/bin/env node
// SYSTMIX-202: HITL gate — shows proposed changes, requires explicit approval before writing
// Used by loop.js before any file modification. Can be called standalone for testing.

import { createInterface } from "node:readline";

// ── Diff display ──────────────────────────────────────────────────────────────

function showDiff(original, proposed, filePath) {
  const origLines = original.split("\n");
  const propLines = proposed.split("\n");

  const added   = propLines.filter(l => !origLines.includes(l) && l.trim());
  const removed = origLines.filter(l => !propLines.includes(l) && l.trim());

  console.log(`\n  ┌─ HITL Gate ──────────────────────────────────────────────────`);
  console.log(`  │  File: ${filePath}`);
  console.log(`  │  ${added.length} line(s) added, ${removed.length} line(s) removed`);
  console.log(`  ├──────────────────────────────────────────────────────────────`);

  for (const line of removed.slice(0, 10)) {
    console.log(`  │  \x1b[31m- ${line}\x1b[0m`);
  }
  for (const line of added.slice(0, 15)) {
    console.log(`  │  \x1b[32m+ ${line}\x1b[0m`);
  }

  console.log(`  └──────────────────────────────────────────────────────────────`);
}

// ── Approval prompt ───────────────────────────────────────────────────────────

export async function requestApproval(original, proposed, filePath, context = "") {
  showDiff(original, proposed, filePath);

  if (context) {
    console.log(`\n  Context: ${context}`);
  }

  // Non-interactive mode (CI / pipe): default deny
  if (!process.stdin.isTTY) {
    console.log("\n  Non-interactive mode — auto-denying (set HITL_AUTO_APPROVE=1 to override)");
    if (process.env.HITL_AUTO_APPROVE === "1") {
      console.log("  HITL_AUTO_APPROVE=1 — approved");
      return { approved: true, reason: "auto" };
    }
    return { approved: false, reason: "non-interactive" };
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise(resolve => {
    rl.question("\n  Approve this change? [y/N] ", answer => {
      rl.close();
      const approved = answer.trim().toLowerCase() === "y";
      console.log(approved ? "  \x1b[32m✓ Approved\x1b[0m\n" : "  \x1b[31m✗ Rejected\x1b[0m\n");
      resolve({ approved, reason: approved ? "human" : "rejected" });
    });
  });
}

// ── Pending state ─────────────────────────────────────────────────────────────
// When running non-interactively, write a .pending.json sidecar instead of the file.
// The HITL dashboard reads these and surfaces them as review cards.

export function writePending(filePath, proposed, context) {
  import("node:fs").then(({ writeFileSync }) => {
    const pendingPath = filePath.replace(/\.mdx$/, ".pending.json");
    writeFileSync(pendingPath, JSON.stringify({
      filePath,
      proposed,
      context,
      requestedAt: new Date().toISOString(),
      status: "pending",
    }, null, 2));
    console.log(`  Pending approval written to: ${pendingPath}`);
  });
}

// ── Standalone test ───────────────────────────────────────────────────────────

if (process.argv[1].endsWith("hitl-gate.js")) {
  const original = `---
component: Button
parity: clean
evidence-posthog: null
---

Button is clean.`;

  const proposed = `---
component: Button
parity: clean
evidence-posthog:
  renders-30d: 12847
  top-variant: default
  last-fetched: 2026-04-25
---

Button is clean.

## Production Evidence

The default variant accounts for 9,201 of 12,847 total renders in the last 30 days.`;

  const { approved } = await requestApproval(
    original,
    proposed,
    "/contract/components/Button.mdx",
    "Hermes wants to write PostHog evidence to the contract file"
  );

  console.log(`  Result: ${approved ? "write will proceed" : "write blocked"}`);
  console.log();
}
