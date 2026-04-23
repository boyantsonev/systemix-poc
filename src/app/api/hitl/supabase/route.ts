import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const projectId = process.env.SYSTEMIX_PROJECT_ID;

  if (!supabaseUrl || !supabaseKey || !projectId) {
    // Fall back to local file
    return NextResponse.redirect(new URL('/api/hitl', req.url));
  }

  try {
    const status = req.nextUrl.searchParams.get('status') ?? 'pending';
    const res = await fetch(
      `${supabaseUrl}/rest/v1/hitl_tasks?project_id=eq.${projectId}&status=eq.${status}&order=created_at.desc&limit=50`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const tasks = await res.json();
    const pendingCount = Array.isArray(tasks) ? tasks.filter((t: { status: string }) => t.status === 'pending').length : 0;
    return NextResponse.json({ tasks, pendingCount });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
