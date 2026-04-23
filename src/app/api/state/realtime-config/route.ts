import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    supabaseConfigured: !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.SYSTEMIX_PROJECT_ID
    ),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
  });
}
