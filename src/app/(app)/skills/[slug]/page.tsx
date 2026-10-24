import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { DocsBody } from "fumadocs-ui/page";
import { SKILL_BODY_MDX_OPTIONS, loadSkillBySlug, loadSkillPacks, loadInstalledSkills } from "@/lib/skills-catalog";
import { getMDXComponents } from "@/mdx-components";
import { CopySkillButton } from "@/components/skills/CopySkillButton";

// A skill's dossier — the full SKILL.md body, rendered so /skills cards have
// somewhere to link to instead of dead-ending on a truncated description.
export default async function SkillDossierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const skill = loadSkillBySlug(slug);
  if (!skill) notFound();

  const packs = loadSkillPacks();
  const pack = packs.find((p) => p.skills.some((s) => s.slug === slug));
  const source = pack ? pack.displayName : "Installed in this repo";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b px-4">
        <Link href="/skills" className="text-sm text-muted-foreground hover:text-foreground">
          ← Skills
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="tva-label text-[11px] text-highlight">{source}</p>
              <h1 className="mt-1 font-mono text-2xl font-bold text-foreground">/{skill.slug}</h1>
              {skill.description && (
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {skill.description}
                </p>
              )}
            </div>
            <CopySkillButton slug={skill.slug} />
          </div>

          <DocsBody>
            <MDXRemote
              source={skill.body}
              components={getMDXComponents()}
              options={{ mdxOptions: SKILL_BODY_MDX_OPTIONS }}
            />
          </DocsBody>
        </div>
      </div>
    </div>
  );
}

export function generateStaticParams() {
  const packSlugs = loadSkillPacks().flatMap((p) => p.skills.map((s) => s.slug));
  const installedSlugs = loadInstalledSkills().map((s) => s.slug);
  const slugs = Array.from(new Set([...packSlugs, ...installedSlugs]));
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const skill = loadSkillBySlug(slug);
  if (!skill) return { title: "Skill not found · Systemix" };
  return {
    title: `/${skill.slug} · Systemix`,
    description: skill.description || undefined,
  };
}
