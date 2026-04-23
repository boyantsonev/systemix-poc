import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { getDriftHistory, getLatestSnapshot } = await import('@/lib/state/drift-history');
    const history = getDriftHistory();
    const latest = getLatestSnapshot();
    return NextResponse.json({ latest, history: history.snapshots ?? [] });
  } catch {
    return NextResponse.json({ latest: null, history: [] }, { status: 200 });
  }
}
