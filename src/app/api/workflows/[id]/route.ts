import { NextRequest, NextResponse } from 'next/server';
import { loadWorkflow, saveWorkflow, deleteWorkflow } from '@/lib/workflow/persistence';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workflow = loadWorkflow(id);
  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ workflow });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const existing = loadWorkflow(id);
    const updated = {
      ...(existing ?? {}),
      ...body,
      id,
      updatedAt: new Date().toISOString(),
      version: (existing?.version ?? 0) + 1,
    };
    saveWorkflow(updated);
    return NextResponse.json({ workflow: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = deleteWorkflow(id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
