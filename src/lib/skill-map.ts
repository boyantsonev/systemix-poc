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
}

export const SKILL_MAP: Record<string, SkillDef> = {
  "tokens": {
    label: "Sync Tokens",
    command: "npm",
    args: ["run", "tokens"],
    description: "Regenerate tokens.bridge.json from globals.css",
  },
  "sync-to-figma": {
    label: "Push Tokens to Figma",
    command: "npx",
    args: ["tsx", "scripts/sync-to-figma.ts"],
    description: "Push bridge.json → Figma Variables via Console MCP",
  },
  "drift-report": {
    label: "Drift Report",
    command: "npx",
    args: ["tsx", "scripts/drift-report.ts"],
    description: "Compare Figma variables vs globals.css — surface drifted tokens",
  },
  "deploy": {
    label: "Build & Deploy",
    command: "vercel",
    args: ["--prod", "--yes"],
    description: "Build and deploy to Vercel production",
  },
  "build": {
    label: "Build",
    command: "npm",
    args: ["run", "build"],
    description: "Next.js production build",
  },
};

export function getSkill(slug: string): SkillDef | null {
  return SKILL_MAP[slug] ?? null;
}

export function listSkills(): { slug: string; def: SkillDef }[] {
  return Object.entries(SKILL_MAP).map(([slug, def]) => ({ slug, def }));
}
