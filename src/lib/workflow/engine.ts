import fs from 'fs';
import path from 'path';
import { WorkflowContext, validateInputs, recordOutput, defaultIOContracts } from './step-io';

export type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped' | 'waiting';

export interface EngineStep {
  id: string;
  skill: string;          // e.g. 'figma', 'component'
  label: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
  outputs?: Record<string, unknown>;
  inputsResolved?: Record<string, unknown>;
}

export interface WorkflowExecution {
  runId: string;
  workflowId: string;
  workflowName: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  steps: EngineStep[];
  context: WorkflowContext;
  startedAt?: string;
  completedAt?: string;
  currentStepIndex: number;
  errorMessage?: string;
  dryRun: boolean;
}

export type ExecutionEvent =
  | { type: 'run_start'; runId: string; workflowId: string }
  | { type: 'step_start'; runId: string; stepId: string; stepIndex: number }
  | { type: 'step_done'; runId: string; stepId: string; outputs: Record<string, unknown> }
  | { type: 'step_error'; runId: string; stepId: string; error: string }
  | { type: 'step_skipped'; runId: string; stepId: string; reason: string }
  | { type: 'run_complete'; runId: string }
  | { type: 'run_failed'; runId: string; error: string }
  | { type: 'run_cancelled'; runId: string };

export type ExecutionEventHandler = (event: ExecutionEvent) => void | Promise<void>;

function generateRunId(): string {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const RUNS_DIR = path.join(process.cwd(), '.systemix', 'runs');

function persistExecution(execution: WorkflowExecution): void {
  try {
    if (!fs.existsSync(RUNS_DIR)) fs.mkdirSync(RUNS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(RUNS_DIR, `${execution.runId}.json`),
      JSON.stringify(execution, null, 2)
    );
  } catch { /* don't crash the engine on persistence failure */ }
}

function loadExecutionFromDisk(runId: string): WorkflowExecution | undefined {
  try {
    const filePath = path.join(RUNS_DIR, `${runId}.json`);
    if (!fs.existsSync(filePath)) return undefined;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as WorkflowExecution;
  } catch {
    return undefined;
  }
}

export class WorkflowEngine {
  private handlers: ExecutionEventHandler[] = [];
  private activeRuns = new Map<string, WorkflowExecution>();
  private cancelledRuns = new Set<string>();

  onEvent(handler: ExecutionEventHandler): () => void {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter(h => h !== handler); };
  }

  private async emit(event: ExecutionEvent): Promise<void> {
    for (const handler of this.handlers) {
      try { await handler(event); } catch { /* don't let a handler crash the engine */ }
    }
  }

  getExecution(runId: string): WorkflowExecution | undefined {
    return this.activeRuns.get(runId) ?? loadExecutionFromDisk(runId);
  }

  cancel(runId: string): void {
    this.cancelledRuns.add(runId);
  }

  async execute(
    workflowId: string,
    workflowName: string,
    steps: Array<{ id: string; skill: string; label: string }>,
    options: {
      onStepExecute?: (step: EngineStep, inputs: Record<string, unknown>) => Promise<Record<string, unknown>>;
      dryRun?: boolean;
    } = {}
  ): Promise<WorkflowExecution> {
    const runId = generateRunId();
    const context: WorkflowContext = { runId, outputs: {} };

    const engineSteps: EngineStep[] = steps.map(s => ({
      ...s,
      status: 'pending' as StepStatus,
    }));

    const execution: WorkflowExecution = {
      runId,
      workflowId,
      workflowName,
      status: 'running',
      steps: engineSteps,
      context,
      startedAt: new Date().toISOString(),
      currentStepIndex: 0,
      dryRun: options.dryRun ?? false,
    };

    this.activeRuns.set(runId, execution);
    persistExecution(execution);
    await this.emit({ type: 'run_start', runId, workflowId });

    for (let i = 0; i < engineSteps.length; i++) {
      if (this.cancelledRuns.has(runId)) {
        execution.status = 'cancelled';
        persistExecution(execution);
        await this.emit({ type: 'run_cancelled', runId });
        break;
      }

      const step = engineSteps[i];
      execution.currentStepIndex = i;

      // Validate inputs
      const contract = defaultIOContracts[step.skill];
      if (contract) {
        const { satisfied, missing } = validateInputs(contract, execution.context);
        if (!satisfied) {
          step.status = 'skipped';
          const reason = `Missing inputs: ${missing.map(m => `${m.key} from ${m.fromStep}`).join(', ')}`;
          step.error = reason;
          await this.emit({ type: 'step_skipped', runId, stepId: step.id, reason });
          continue;
        }
      }

      // Start step
      step.status = 'running';
      step.startedAt = new Date().toISOString();
      await this.emit({ type: 'step_start', runId, stepId: step.id, stepIndex: i });

      try {
        let outputs: Record<string, unknown> = {};

        if (options.dryRun ?? false) {
          // Dry run: simulate with mock outputs
          outputs = { _dryRun: true, _skill: step.skill };
          await new Promise(r => setTimeout(r, 50)); // simulate latency
        } else if (options.onStepExecute) {
          const inputs = contract ? Object.fromEntries(
            Object.entries(execution.context.outputs).flatMap(([, outs]) =>
              outs.map(o => [o.key, o.value])
            )
          ) : {};
          step.inputsResolved = inputs;
          outputs = await options.onStepExecute(step, inputs);
        }

        // Record outputs
        if (contract) {
          for (const key of contract.outputs) {
            if (outputs[key] !== undefined) {
              execution.context = recordOutput(execution.context, step.id, key, outputs[key], 'string');
            }
          }
        }

        step.status = 'done';
        step.outputs = outputs;
        step.completedAt = new Date().toISOString();
        step.durationMs = new Date(step.completedAt).getTime() - new Date(step.startedAt!).getTime();
        persistExecution(execution);
        await this.emit({ type: 'step_done', runId, stepId: step.id, outputs });

      } catch (err) {
        step.status = 'error';
        step.error = String(err);
        step.completedAt = new Date().toISOString();
        execution.status = 'failed';
        execution.errorMessage = step.error;
        persistExecution(execution);
        await this.emit({ type: 'step_error', runId, stepId: step.id, error: step.error });
        await this.emit({ type: 'run_failed', runId, error: step.error });
        break;
      }
    }

    if (execution.status === 'running') {
      execution.status = 'completed';
      execution.completedAt = new Date().toISOString();
      persistExecution(execution);
      await this.emit({ type: 'run_complete', runId });
    }

    this.cancelledRuns.delete(runId);
    return execution;
  }
}

// Singleton for use across the app
export const workflowEngine = new WorkflowEngine();
