import { NextRequest, NextResponse } from 'next/server';
import { refuseOnDeploy } from '@/lib/local-request';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const hidden = refuseOnDeploy();
  if (hidden) return hidden;
  try {
    const { getSyncLog } = await import('@/lib/state/sync-log');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') ?? '20');
    const log = await getSyncLog();
    const entries = (log.entries ?? []).slice(-limit).reverse();
    return NextResponse.json({ entries, total: log.entries?.length ?? 0 });
  } catch {
    return NextResponse.json({ entries: [], total: 0 }, { status: 200 });
  }
}
