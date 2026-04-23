import fs from 'fs';
import path from 'path';

const WORKFLOWS_DIR = path.join(process.cwd(), '.systemix', 'workflows');

function ensureDir() {
  if (!fs.existsSync(WORKFLOWS_DIR)) {
    fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
  }
}

export interface PersistedWorkflow {
  id: string;
  name: string;
  description?: string;
  steps: unknown[];       // WorkflowStep[] — avoid circular import
  createdAt: string;
  updatedAt: string;
  version: number;
  tags?: string[];
}

export function saveWorkflow(workflow: PersistedWorkflow): void {
  ensureDir();
  const filePath = path.join(WORKFLOWS_DIR, `${workflow.id}.json`);
  const updated = { ...workflow, updatedAt: new Date().toISOString() };
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(updated, null, 2));
  fs.renameSync(tmp, filePath);
}

export function loadWorkflow(id: string): PersistedWorkflow | null {
  const filePath = path.join(WORKFLOWS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

export function listWorkflows(): PersistedWorkflow[] {
  if (!fs.existsSync(WORKFLOWS_DIR)) return [];
  return fs.readdirSync(WORKFLOWS_DIR)
    .filter(f => f.endsWith('.json') && !f.endsWith('.tmp'))
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, f), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function deleteWorkflow(id: string): boolean {
  const filePath = path.join(WORKFLOWS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}

export function duplicateWorkflow(id: string, newName?: string): PersistedWorkflow | null {
  const original = loadWorkflow(id);
  if (!original) return null;
  const duplicate: PersistedWorkflow = {
    ...original,
    id: `${id}-copy-${Date.now()}`,
    name: newName ?? `${original.name} (copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };
  saveWorkflow(duplicate);
  return duplicate;
}
