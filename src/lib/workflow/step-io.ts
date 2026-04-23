// Typed inter-step data passing for Systemix workflows

export type StepOutputKey =
  | 'figma_node_id'
  | 'figma_file_key'
  | 'component_code'
  | 'token_map'
  | 'drift_report'
  | 'theme_css'
  | 'deploy_url'
  | 'storybook_url'
  | 'story_file_path'
  | 'changed_files'
  | string; // allow extension

export interface StepOutput {
  key: StepOutputKey;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  producedBy: string; // step id
  producedAt: string; // ISO timestamp
}

export interface StepInputBinding {
  key: StepOutputKey;       // what this step needs
  fromStep: string;         // step id that produces it (or 'context' for workflow-level inputs)
  required: boolean;
  description?: string;
}

export interface StepIOContract {
  stepId: string;
  inputs: StepInputBinding[];   // what this step consumes
  outputs: StepOutputKey[];     // what this step produces
}

export interface WorkflowContext {
  runId: string;
  outputs: Record<string, StepOutput[]>; // stepId → outputs produced
}

// Get a specific output from the context
export function getOutput(
  ctx: WorkflowContext,
  fromStep: string,
  key: StepOutputKey
): StepOutput | undefined {
  return ctx.outputs[fromStep]?.find(o => o.key === key);
}

// Check if a step's required inputs are satisfied
export function validateInputs(
  contract: StepIOContract,
  ctx: WorkflowContext
): { satisfied: boolean; missing: StepInputBinding[] } {
  const missing = contract.inputs.filter(binding => {
    if (!binding.required) return false;
    if (binding.fromStep === 'context') return false; // workflow-level, always satisfied
    return !getOutput(ctx, binding.fromStep, binding.key);
  });
  return { satisfied: missing.length === 0, missing };
}

// Record a step's output into context
export function recordOutput(
  ctx: WorkflowContext,
  stepId: string,
  key: StepOutputKey,
  value: unknown,
  type: StepOutput['type']
): WorkflowContext {
  const output: StepOutput = {
    key, value, type,
    producedBy: stepId,
    producedAt: new Date().toISOString(),
  };
  return {
    ...ctx,
    outputs: {
      ...ctx.outputs,
      [stepId]: [...(ctx.outputs[stepId] ?? []), output],
    },
  };
}

// Build the input map for a step (resolved values from context)
export function resolveInputs(
  contract: StepIOContract,
  ctx: WorkflowContext
): Record<StepOutputKey, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const binding of contract.inputs) {
    if (binding.fromStep === 'context') continue;
    const output = getOutput(ctx, binding.fromStep, binding.key);
    if (output) resolved[binding.key] = output.value;
  }
  return resolved;
}

export const defaultIOContracts: Record<string, StepIOContract> = {
  'figma': {
    stepId: 'figma',
    inputs: [],
    outputs: ['figma_node_id', 'figma_file_key'],
  },
  'component': {
    stepId: 'component',
    inputs: [
      { key: 'figma_node_id', fromStep: 'figma', required: true, description: 'Figma node to generate from' },
      { key: 'figma_file_key', fromStep: 'figma', required: false },
    ],
    outputs: ['component_code', 'story_file_path', 'changed_files'],
  },
  'tokens': {
    stepId: 'tokens',
    inputs: [{ key: 'figma_file_key', fromStep: 'figma', required: false }],
    outputs: ['token_map'],
  },
  'storybook': {
    stepId: 'storybook',
    inputs: [{ key: 'story_file_path', fromStep: 'component', required: false }],
    outputs: ['storybook_url'],
  },
  'deploy': {
    stepId: 'deploy',
    inputs: [{ key: 'changed_files', fromStep: 'component', required: false }],
    outputs: ['deploy_url'],
  },
};
