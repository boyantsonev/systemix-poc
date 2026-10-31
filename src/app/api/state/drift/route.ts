import { NextResponse } from 'next/server';
import { refuseOnDeploy } from '@/lib/local-request';

export const dynamic = 'force-dynamic';

export async function GET() {
  const hidden = refuseOnDeploy();
  if (hidden) return hidden;
  try {
    const { getDriftHistory, getLatestSnapshot } = await import('@/lib/state/drift-history');
    const history = getDriftHistory();
    const latest = getLatestSnapshot();
    return NextResponse.json({ latest, history: history.snapshots ?? [] });
  } catch {
    return NextResponse.json({ latest: null, history: [] }, { status: 200 });
  }
}
