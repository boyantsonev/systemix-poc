import { NextRequest, NextResponse } from 'next/server';
import { loadWorkflow } from '@/lib/workflow/persistence';
import { workflowEngine } from '@/lib/workflow/engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const dryRun = body.dryRun ?? true; // default to dry run for safety

    const workflow = loadWorkflow(id);
    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const steps = ((workflow.steps as Array<{ id?: string; skill?: string; label?: string }>) ?? []).map((s, i) => ({
      id: s.id ?? `step-${i}`,
      skill: s.skill ?? 'unknown',
      label: s.label ?? `Step ${i + 1}`,
    }));

    const execution = await workflowEngine.execute(
      id,
      workflow.name,
      steps,
      { dryRun }
    );

    return NextResponse.json({ execution });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
