import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import {
  hypothesisPath,
  isValidSlug,
  setTopLevelField,
  setVariantsBlock,
  splitFrontmatter,
  writeFileAtomic,
  yamlStr,
} from "@/lib/contract/hypothesis-mdx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Editable scalar frontmatter fields → their YAML keys. `id`/`created` are immutable.
const SCALAR_FIELDS: Record<string, string> = {
  hypothesis: "hypothesis",
  icp: "icp",
  section: "section",
  status: "status",
  evidencePosthog: "evidence-posthog",
};

// PATCH /api/hypotheses/[slug] — surgically update frontmatter fields only.
// The MDX body (rationale prose) is left untouched.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: "invalid slug" }, { status: 400 });
  }
  const file = hypothesisPath(slug);
  if (!fs.existsSync(file)) {
    return NextResponse.json({ error: "hypothesis not found" }, { status: 404 });
  }

  let patch: Record<string, unknown>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const raw = fs.readFileSync(file, "utf8");
  const split = splitFrontmatter(raw);
  if (!split) {
    return NextResponse.json({ error: "could not parse frontmatter" }, { status: 422 });
  }

  let fm = split.fm;

  for (const [prop, key] of Object.entries(SCALAR_FIELDS)) {
    if (!(prop in patch) || patch[prop] === undefined) continue;
    const value = patch[prop];
    // Never clobber a populated evidence-posthog block (it may be a nested YAML
    // object written by a prior decision) with an empty form field — skip it.
    if (key === "evidence-posthog" && (value === "" || value === null)) continue;
    if (value === null || value === "") {
      fm = setTopLevelField(fm, key, `${key}: null`);
    } else {
      fm = setTopLevelField(fm, key, `${key}: ${yamlStr(String(value))}`);
    }
  }

  if (patch.variants && typeof patch.variants === "object") {
    fm = setVariantsBlock(fm, patch.variants as Record<string, string>);
  }

  try {
    writeFileAtomic(file, `---\n${fm}\n---\n${split.body.startsWith("\n") ? "" : "\n"}${split.body}`);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "write failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, slug });
}
