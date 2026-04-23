import { NextResponse } from 'next/server';
import { SKILL_CHAINS, validateChain } from '@/lib/workflow/skill-chain';

export async function GET() {
  const chains = SKILL_CHAINS.map(chain => ({
    ...chain,
    validation: validateChain(chain),
  }));
  return NextResponse.json({ chains });
}
