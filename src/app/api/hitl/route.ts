import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const QUEUE_PATH = path.join(process.cwd(), '.systemix', 'hitl-queue.json');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status');
    if (!fs.existsSync(QUEUE_PATH)) {
      return NextResponse.json({ tasks: [], pendingCount: 0 });
    }
    const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
    let tasks: Array<{ status: string; createdAt: string }> = queue.tasks ?? [];
    if (status) tasks = tasks.filter(t => t.status === status);
    tasks.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    const pendingCount = (queue.tasks ?? []).filter((t: { status: string }) => t.status === 'pending').length;
    return NextResponse.json({ tasks, pendingCount });
  } catch {
    return NextResponse.json({ tasks: [], pendingCount: 0 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { taskId, action, note, resolvedBy } = await req.json();
    if (!taskId || !action) {
      return NextResponse.json({ error: 'taskId and action required' }, { status: 400 });
    }
    if (!fs.existsSync(QUEUE_PATH)) {
      return NextResponse.json({ error: 'Queue not found' }, { status: 404 });
    }
    const queue = JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
    const task = (queue.tasks ?? []).find((t: { id: string }) => t.id === taskId);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    task.status = action;
    task.resolvedAt = new Date().toISOString();
    task.resolution = { action, note, resolvedBy: resolvedBy ?? 'dashboard' };
    const tmp = QUEUE_PATH + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(queue, null, 2));
    fs.renameSync(tmp, QUEUE_PATH);
    return NextResponse.json({ taskId, action, task });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
