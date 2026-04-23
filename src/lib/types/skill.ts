// Typed interfaces for Systemix pipeline skills

export type SkillCommand =
  | '/figma'
  | '/tokens'
  | '/component'
  | '/storybook'
  | '/deploy'
  | '/sync-to-figma'
  | '/figma-push'
  | '/figma-inspect'
  | '/sync'
  | '/design-to-code'
  | '/drift-report'
  | '/apply-theme'
  | '/connect'
  | '/check-parity'
  | '/deploy-annotate'
  | '/sync-docs';

export type SkillCategory = 'pipeline' | 'tools';

export type SkillGroup = 'sync-loop' | 'quality' | 'output' | 'utilities';

export type AgentName = 'Ada' | 'Flux' | 'Scout' | 'Prism' | 'Echo' | 'Sage' | 'Ship';

export type McpServer =
  | 'figma-console-mcp'
  | 'figma-mcp'
  | 'github-mcp'
  | 'storybook-mcp'
  | 'vercel-mcp'
  | 'figma-desktop-mcp';

export interface SkillMcpRequirements {
  required: McpServer[];
  optional?: McpServer[];
}

export interface SkillIOSpec {
  inputs?: string[];    // what this skill reads/consumes
  outputs?: string[];   // what this skill produces
}

export interface SkillVersion {
  version: string;      // semver e.g. "1.0.0"
  lastUpdated: string;  // ISO date
  changelog?: string;
}

export interface Skill {
  command: SkillCommand;
  name: string;
  description: string;
  file: string;         // path to SKILL.md on disk
  triggersAgent: AgentName;
  category: SkillCategory;
  group: SkillGroup;
  mcp: SkillMcpRequirements;
  io?: SkillIOSpec;
  version?: SkillVersion;
  promptContent: string;
  tags?: string[];
}

// Type guard
export function isSkill(value: unknown): value is Skill {
  return (
    typeof value === 'object' &&
    value !== null &&
    'command' in value &&
    'name' in value &&
    'promptContent' in value
  );
}

// Helper: get skill by command
export function getSkillByCommand(skills: Skill[], command: SkillCommand): Skill | undefined {
  return skills.find(s => s.command === command);
}

// Helper: get skills by agent
export function getSkillsByAgent(skills: Skill[], agent: AgentName): Skill[] {
  return skills.filter(s => s.triggersAgent === agent);
}

// Helper: get skills by category
export function getSkillsByCategory(skills: Skill[], category: SkillCategory): Skill[] {
  return skills.filter(s => s.category === category);
}
