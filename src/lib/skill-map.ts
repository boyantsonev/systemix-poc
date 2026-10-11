// TASK 1 — BAST-158: Skill execution map
// Maps skill slugs to CLI-runnable commands.
// Only skills with real scripts/commands are listed here.
// Skills requiring MCP (figma, component, storybook, etc.) are excluded.

export interface SkillDef {
  label: string;
  command: string;      // shell command to run
  args?: string[];
  description: string;
  env?: Record<string, string>;
  // Lowest trust tier (0 ghost · 1 assisted · 2 autonomous) allowed to run it.
  // Enforced by POST /api/run; the /config chips filter on the same field.
  minTier?: number;
}

export const SKILL_MAP: Record<string, SkillDef> = {
  "tokens": {
    label: "Sync Tokens",
    command: "npm",
    args: ["run", "tokens"],
    description: "Regenerate tokens.bridge.json from globals.css",
  },
  // sync-to-figma was removed: its script never existed and Figma is an
  // optional/deferred adapter under code-first v5 — a play button that always
  // fails is worse than no button.
  "drift-report": {
    label: "Drift Report",
    command: "npx",
    args: ["tsx", "scripts/drift-report.ts"],
    description: "Scan src/ for raw hex + off-token styles — appends a drift snapshot",
  },
  // No deploy entry: production deploys stay an explicit human step outside the
  // dashboard (vercel CLI / merge to main).
  "build": {
    label: "Build",
    command: "npm",
    args: ["run", "build"],
    description: "Next.js production build",
  },
  // node + repo-relative path (not npx) so the spawn from /api/run resolves the
  // workspace bin deterministically.
  "loop": {
    label: "Run the Loop",
    command: "node",
    args: ["packages/cli/bin/cli.js", "loop"],
    description: "Sweep running experiments — evidence → evaluate → queue close-proposal",
  },
};

export function getSkill(slug: string): SkillDef | null {
  return Object.hasOwn(SKILL_MAP, slug) ? SKILL_MAP[slug] : null;
}

/** Whether an instance at trust `tier` may run `def`. */
export function runnableAt(def: SkillDef, tier: number): boolean {
  return tier >= (def.minTier ?? 0);
}

export function listSkills(): { slug: string; def: SkillDef }[] {
  return Object.entries(SKILL_MAP).map(([slug, def]) => ({ slug, def }));
}
