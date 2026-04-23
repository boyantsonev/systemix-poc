// Skill chaining — compose skills into named pipelines

import type { SkillCommand } from '@/lib/types/skill';

export interface SkillDependency {
  command: SkillCommand;
  type: 'requires' | 'suggests' | 'conflicts';
  reason?: string;
}

export interface SkillChainStep {
  command: SkillCommand;
  label?: string;          // display label override
  optional?: boolean;      // skip on error if true
  timeout?: number;        // ms before considering the step stalled
  retryOnError?: boolean;
  dependsOn?: SkillCommand[]; // explicit step dependencies within the chain
}

export interface SkillChain {
  id: string;
  name: string;
  description: string;
  steps: SkillChainStep[];
  tags?: string[];
}

// Predefined chains for common workflows
export const SKILL_CHAINS: SkillChain[] = [
  {
    id: 'full-sync',
    name: 'Full Sync',
    description: 'Pull tokens from Figma, convert, push to codebase, check drift',
    steps: [
      { command: '/figma', label: 'Extract from Figma' },
      { command: '/tokens', label: 'Sync tokens', dependsOn: ['/figma'] },
      { command: '/drift-report', label: 'Check drift', optional: true },
    ],
    tags: ['sync', 'tokens'],
  },
  {
    id: 'figma-to-code',
    name: 'Figma → Code',
    description: 'Extract Figma node, generate component, verify stories, deploy preview',
    steps: [
      { command: '/figma', label: 'Extract design' },
      { command: '/component', label: 'Generate component', dependsOn: ['/figma'] },
      { command: '/storybook', label: 'Verify stories', dependsOn: ['/component'], optional: true },
      { command: '/deploy', label: 'Deploy preview', dependsOn: ['/component'], optional: true },
    ],
    tags: ['component', 'figma'],
  },
  {
    id: 'brand-theme',
    name: 'Apply Brand Theme',
    description: 'Apply client theme overrides and verify parity',
    steps: [
      { command: '/apply-theme', label: 'Apply theme' },
      { command: '/check-parity', label: 'Verify parity', dependsOn: ['/apply-theme'] },
    ],
    tags: ['theme', 'brand'],
  },
  {
    id: 'deploy-full',
    name: 'Full Deploy',
    description: 'Sync, check parity, deploy, annotate',
    steps: [
      { command: '/sync', label: 'Full sync' },
      { command: '/check-parity', label: 'Check parity', optional: true },
      { command: '/deploy', label: 'Deploy', dependsOn: ['/sync'] },
      { command: '/deploy-annotate', label: 'Annotate deploy', dependsOn: ['/deploy'], optional: true },
    ],
    tags: ['deploy'],
  },
];

// Skill dependency map — what each skill requires before it can run well
export const SKILL_DEPENDENCIES: Record<SkillCommand, SkillDependency[]> = {
  '/figma': [],
  '/tokens': [{ command: '/figma', type: 'suggests', reason: 'Figma fileKey improves token sync accuracy' }],
  '/component': [{ command: '/figma', type: 'requires', reason: 'Needs a Figma node to generate from' }],
  '/storybook': [{ command: '/component', type: 'suggests', reason: 'Works best after component generation' }],
  '/deploy': [],
  '/sync-to-figma': [{ command: '/tokens', type: 'requires', reason: 'Needs tokens.bridge.json' }],
  '/figma-push': [],
  '/figma-inspect': [],
  '/sync': [],
  '/design-to-code': [{ command: '/figma', type: 'requires', reason: 'Needs design context' }],
  '/drift-report': [],
  '/apply-theme': [],
  '/connect': [{ command: '/component', type: 'suggests', reason: 'Works best with generated components' }],
  '/check-parity': [{ command: '/figma', type: 'suggests', reason: 'Needs Figma context for comparison' }],
  '/deploy-annotate': [{ command: '/deploy', type: 'requires', reason: 'Needs a deploy URL to annotate' }],
  '/sync-docs': [],
  '/token-source-audit': [],
};

// Get chain by ID
export function getChain(id: string): SkillChain | undefined {
  return SKILL_CHAINS.find(c => c.id === id);
}

// Get chains that include a specific skill
export function getChainsForSkill(command: SkillCommand): SkillChain[] {
  return SKILL_CHAINS.filter(c => c.steps.some(s => s.command === command));
}

// Validate a chain — check for circular dependencies
export function validateChain(chain: SkillChain): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const commands = chain.steps.map(s => s.command);

  for (const step of chain.steps) {
    if (step.dependsOn) {
      for (const dep of step.dependsOn) {
        const depIndex = commands.indexOf(dep);
        const stepIndex = commands.indexOf(step.command);
        if (depIndex === -1) {
          errors.push(`Step ${step.command} depends on ${dep} which is not in this chain`);
        } else if (depIndex >= stepIndex) {
          errors.push(`Step ${step.command} depends on ${dep} which comes after it`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
