import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Dynamic require to avoid build-time fs errors
    const { getAgentState } = await import('@/lib/state/agent-state');
    const state = getAgentState();
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ agents: [] }, { status: 200 });
  }
}
