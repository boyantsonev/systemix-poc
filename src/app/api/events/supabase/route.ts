import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const projectId = process.env.SYSTEMIX_PROJECT_ID;

  if (!supabaseUrl || !supabaseKey || !projectId) {
    return NextResponse.json({ events: [], connected: false, reason: 'Supabase not configured' });
  }

  const since = req.nextUrl.searchParams.get('since') ?? new Date(0).toISOString();
  const limit = req.nextUrl.searchParams.get('limit') ?? '50';

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/events?project_id=eq.${projectId}&created_at=gt.${since}&order=created_at.desc&limit=${limit}`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const events = await res.json();
    return NextResponse.json({ events, connected: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
