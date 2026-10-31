import { NextRequest, NextResponse } from 'next/server';
import { listWorkflows, saveWorkflow } from '@/lib/workflow/persistence';
import { rejectNonLocal, refuseOnDeploy } from '@/lib/local-request';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hidden = refuseOnDeploy();
  if (hidden) return hidden;
  try {
    return NextResponse.json({ workflows: listWorkflows() });
  } catch {
    return NextResponse.json({ workflows: [] });
  }
}

export async function POST(req: NextRequest) {
  const denied = rejectNonLocal(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const workflow = {
      ...body,
      id: body.id ?? `wf-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    saveWorkflow(workflow);
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
