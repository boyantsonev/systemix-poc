import { NextRequest, NextResponse } from 'next/server';
import { listWorkflows, saveWorkflow } from '@/lib/workflow/persistence';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ workflows: listWorkflows() });
  } catch {
    return NextResponse.json({ workflows: [] });
  }
}

export async function POST(req: NextRequest) {
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
