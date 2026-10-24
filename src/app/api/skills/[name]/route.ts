import { NextResponse } from "next/server";
import { resolveSkillFile, skillCopyText } from "@/lib/skills-catalog";

export const dynamic = "force-dynamic";

// Resolve a skill's SKILL.md body for the /config graph's "copy skill" action
// and the /skills/[slug] dossier page's "copy skill.md" CTA. Resolution order
// (instance-installed first, then bundled pipeline sources) lives in
// resolveSkillFile() so both callers share it.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
    return NextResponse.json({ error: "invalid skill name" }, { status: 400 });
  }

  const found = resolveSkillFile(name);
  if (!found) {
    return NextResponse.json({ error: "skill not found" }, { status: 404 });
  }
  return NextResponse.json({ name, path: found.path, body: found.raw,
    siblings: found.siblings,
    copyText: skillCopyText(found),
  });
}
