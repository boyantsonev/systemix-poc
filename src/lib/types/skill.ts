// Typed interfaces for Systemix pipeline skills

export type SkillCommand =
  // The loop — hypothesis validation workflow (step-level)
  | '/hypothesis'
  | '/measure'
  | '/experiment'
  | '/evidence'
  | '/hermes'
  // The loop — workflow orchestration
  | '/init-experiment'
  | '/growth-audit'
  | '/write-variants'
  | '/close-experiment'
  // Design system — Figma ↔ code
  | '/figma'
  | '/tokens'
  | '/component'
  | '/drift-report'
  | '/check-parity'
  | '/sync'
  // Deploy
  | '/deploy'
  | '/deploy-annotate'
  | '/storybook'
  // Design system — additional
  | '/design-to-code'
  // Utilities
  | '/figma-inspect'
  | '/figma-push'
  | '/style-match'
  | '/sync-to-figma'
  | '/connect'
  | '/contract-query';

export type SkillCategory = 'pipeline' | 'tools';

export type SkillGroup = 'the-loop' | 'design-system' | 'deploy' | 'utilities';

export type AgentName = 'Ada' | 'Canvas' | 'Flux' | 'Hermes' | 'Orion' | 'Prism' | 'Echo' | 'Sage' | 'Ship' | 'Scout';

export type McpServer =
  | 'figma-console-mcp'
  | 'figma-mcp'
  | 'github-mcp'
  | 'storybook-mcp'
  | 'vercel-mcp'
  | 'figma-desktop-mcp'
  | 'posthog-mcp'
  | 'ollama'
  | 'systemix-mcp';

export interface SkillMcpRequirements {
  required: McpServer[];
  optional?: McpServer[];
}

export interface SkillIOSpec {
  inputs?: string[];
  outputs?: string[];
}

export interface SkillVersion {
  version: string;
  lastUpdated: string;
  changelog?: string;
}

export interface Skill {
  command: SkillCommand;
  name: string;
  description: string;
  file: string;
  triggersAgent: AgentName;
  category: SkillCategory;
  group: SkillGroup;
  mcp: SkillMcpRequirements;
  io?: SkillIOSpec;
  version?: SkillVersion;
  promptContent: string;
  tags?: string[];
}

export function isSkill(value: unknown): value is Skill {
  return (
    typeof value === 'object' &&
    value !== null &&
    'command' in value &&
    'name' in value &&
    'promptContent' in value
  );
}

export function getSkillByCommand(skills: Skill[], command: SkillCommand): Skill | undefined {
  return skills.find(s => s.command === command);
}

export function getSkillsByAgent(skills: Skill[], agent: AgentName): Skill[] {
  return skills.filter(s => s.triggersAgent === agent);
}

export function getSkillsByCategory(skills: Skill[], category: SkillCategory): Skill[] {
  return skills.filter(s => s.category === category);
}
