import { WorkflowContext, getOutput, StepOutputKey } from './step-io';

// Condition operators
export type ConditionOperator =
  | 'eq' | 'neq'           // equals / not equals
  | 'gt' | 'gte'           // greater than / >=
  | 'lt' | 'lte'           // less than / <=
  | 'contains'             // string/array contains
  | 'not_contains'
  | 'exists'               // value is defined and non-null
  | 'not_exists'
  | 'truthy' | 'falsy';    // loose truthiness

export interface Condition {
  type: 'simple';
  fromStep: string;
  outputKey: StepOutputKey;
  operator: ConditionOperator;
  value?: unknown;          // comparison value (not needed for exists/truthy/falsy)
}

export interface CompoundCondition {
  type: 'compound';
  logic: 'and' | 'or';
  conditions: Array<Condition | CompoundCondition>;
}

export type BranchCondition = Condition | CompoundCondition;

export interface Branch {
  id: string;
  label: string;
  condition: BranchCondition;
  targetStepId: string;     // step to jump to if condition passes
}

export interface ConditionalBranchNode {
  stepId: string;           // the step this branching is attached to (after this step)
  branches: Branch[];
  defaultBranch?: string;   // targetStepId if no condition matches
}

// Evaluate a single condition against the workflow context
export function evaluateCondition(
  condition: Condition,
  ctx: WorkflowContext
): boolean {
  const output = getOutput(ctx, condition.fromStep, condition.outputKey);
  const val = output?.value;

  switch (condition.operator) {
    case 'exists': return val !== undefined && val !== null;
    case 'not_exists': return val === undefined || val === null;
    case 'truthy': return Boolean(val);
    case 'falsy': return !val;
    case 'eq': return val === condition.value;
    case 'neq': return val !== condition.value;
    case 'gt': return typeof val === 'number' && val > (condition.value as number);
    case 'gte': return typeof val === 'number' && val >= (condition.value as number);
    case 'lt': return typeof val === 'number' && val < (condition.value as number);
    case 'lte': return typeof val === 'number' && val <= (condition.value as number);
    case 'contains':
      if (typeof val === 'string') return val.includes(String(condition.value));
      if (Array.isArray(val)) return val.includes(condition.value);
      return false;
    case 'not_contains':
      if (typeof val === 'string') return !val.includes(String(condition.value));
      if (Array.isArray(val)) return !val.includes(condition.value);
      return true;
    default: return false;
  }
}

// Evaluate a compound or simple condition
export function evaluateBranchCondition(
  condition: BranchCondition,
  ctx: WorkflowContext
): boolean {
  if (condition.type === 'simple') {
    return evaluateCondition(condition, ctx);
  }
  // compound
  const results = condition.conditions.map(c => evaluateBranchCondition(c, ctx));
  return condition.logic === 'and' ? results.every(Boolean) : results.some(Boolean);
}

// Given a conditional branch node, return the target step ID to jump to
export function resolveBranch(
  node: ConditionalBranchNode,
  ctx: WorkflowContext
): string | undefined {
  for (const branch of node.branches) {
    if (evaluateBranchCondition(branch.condition, ctx)) {
      return branch.targetStepId;
    }
  }
  return node.defaultBranch;
}

// Helper: create a simple "if step X produced Y" condition
export function ifProduced(
  fromStep: string,
  outputKey: StepOutputKey
): Condition {
  return { type: 'simple', fromStep, outputKey, operator: 'exists' };
}

// Helper: create a "if step X's output equals value" condition
export function ifEquals(
  fromStep: string,
  outputKey: StepOutputKey,
  value: unknown
): Condition {
  return { type: 'simple', fromStep, outputKey, operator: 'eq', value };
}

// Predefined branch patterns for common workflow decisions
export const commonBranches = {
  onSuccess: (fromStep: string): Branch => ({
    id: `on-success-${fromStep}`,
    label: 'On success',
    condition: ifProduced(fromStep, 'component_code'),
    targetStepId: '',
  }),
  onDeploy: (fromStep: string): Branch => ({
    id: `on-deploy-${fromStep}`,
    label: 'On deploy URL',
    condition: ifProduced(fromStep, 'deploy_url'),
    targetStepId: '',
  }),
};
