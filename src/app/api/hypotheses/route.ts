import { NextRequest, NextResponse } from "next/server";
import {
  buildHypothesisMdx,
  hypothesisExists,
  hypothesisPath,
  isValidSlug,
  slugify,
  writeFileAtomic,
  type HypothesisInput,
} from "@/lib/contract/hypothesis-mdx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST /api/hypotheses — create a new hypothesis contract MDX file.
export async function POST(req: NextRequest) {
  let body: Partial<HypothesisInput> & { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.hypothesis || !body.hypothesis.trim()) {
    return NextResponse.json({ error: "hypothesis text is required" }, { status: 400 });
  }

  // id is either provided or derived from the hypothesis text
  const slug = slugify(body.id || body.hypothesis).slice(0, 64);
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "could not derive a valid id (use a-z, 0-9, -)" }, { status: 400 });
  }
  if (hypothesisExists(slug)) {
    return NextResponse.json({ error: `hypothesis "${slug}" already exists` }, { status: 409 });
  }

  const createdDate = new Date().toISOString().slice(0, 10);
  const mdx = buildHypothesisMdx({ ...body, id: slug, hypothesis: body.hypothesis }, createdDate);

  try {
    writeFileAtomic(hypothesisPath(slug), mdx);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "write failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, slug });
}
