import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { isValidSlug } from "@/lib/contract/experiment-mdx";

// The skills & workflows catalog — enumerates the CLI packs (workflows) under
// packages/cli/pipelines/*/manifest.json with each skill's SKILL.md
// description, plus the skills installed in this repo's .claude/skills/.
// Server-only (fs). Consumed by /skills and the shell sidebar tree.

export type CatalogSkill = {
  slug: string;
  description: string;
};

export type CatalogPack = {
  name: string;
  displayName: string;
  description: string;
  startWith?: string;
  version?: string;
  skills: CatalogSkill[];
};

function skillDescription(packDir: string, slug: string): string {
  try {
    const raw = fs.readFileSync(path.join(packDir, "skills", slug, "SKILL.md"), "utf8");
    const fm = matter(raw).data as { description?: string };
    // Keep the card readable — first sentence of the (often long) description.
    const d = fm.description ?? "";
    const first = d.split(/(?<=\.)\s/)[0] ?? d;
    return first.trim();
  } catch {
    return "";
  }
}

/**
 * Resolve a skill slug to its SKILL.md file — the instance-installed copy
 * (.claude/skills/<slug>) first, then each bundled pipeline's source
 * (packages/cli/pipelines/*\/skills/<slug>). Shared by the /api/skills/[name]
 * route and the /skills/[slug] detail page so there's one resolution order.
 */
export function resolveSkillFile(slug: string): { path: string; raw: string } | null {
  // The slug comes from the URL and becomes a path segment — slug rule only.
  if (!isValidSlug(slug)) return null;
  const root = process.cwd();
  const candidates = [path.join(root, ".claude", "skills", slug, "SKILL.md")];

  const pipelinesDir = path.join(root, "packages", "cli", "pipelines");
  if (fs.existsSync(pipelinesDir)) {
    for (const pipeline of fs.readdirSync(pipelinesDir)) {
      candidates.push(path.join(pipelinesDir, pipeline, "skills", slug, "SKILL.md"));
    }
  }

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      return { path: path.relative(root, file), raw: fs.readFileSync(file, "utf8") };
    }
  }
  return null;
}

export type SkillDossier = {
  slug: string;
  name: string;
  description: string;
  path: string;
  body: string;
};

/**
 * How a SKILL.md body is compiled for its dossier page. Skills are Markdown written
 * for agents, not MDX: they hold HTML comments (the audit skills' data markers),
 * `<placeholders>` and `{ }` in examples, all of which MDX rejects and fails the build.
 */
export const SKILL_BODY_MDX_OPTIONS = { format: "md" } as const;

/** Full frontmatter + body for a skill's detail ("dossier") page. */
export function loadSkillBySlug(slug: string): SkillDossier | null {
  const found = resolveSkillFile(slug);
  if (!found) return null;
  const { data, content } = matter(found.raw);
  const fm = data as { name?: string; description?: string };
  return {
    slug,
    name: fm.name ?? slug,
    description: fm.description ?? "",
    path: found.path,
    body: content.trim(),
  };
}

/** All CLI packs (the workflows), each with its skill roster. */
export function loadSkillPacks(): CatalogPack[] {
  const pipelinesDir = path.join(process.cwd(), "packages", "cli", "pipelines");
  try {
    return fs
      .readdirSync(pipelinesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e): CatalogPack | null => {
        const packDir = path.join(pipelinesDir, e.name);
        try {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(packDir, "manifest.json"), "utf8"),
          ) as {
            name: string;
            displayName?: string;
            description?: string;
            startWith?: string;
            version?: string;
            skills?: string[];
          };
          return {
            name: manifest.name,
            displayName: manifest.displayName ?? manifest.name,
            description: manifest.description ?? "",
            startWith: manifest.startWith,
            version: manifest.version,
            skills: (manifest.skills ?? []).map((slug) => ({
              slug,
              description: skillDescription(packDir, slug),
            })),
          } satisfies CatalogPack;
        } catch {
          return null;
        }
      })
      .filter((p): p is CatalogPack => p !== null);
  } catch {
    return [];
  }
}

/** Skills installed in THIS repo's .claude/skills/ (dirs with SKILL.md or bare .md files). */
export function loadInstalledSkills(): CatalogSkill[] {
  const dir = path.join(process.cwd(), ".claude", "skills");
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .map((e) => {
        try {
          const file = e.isDirectory()
            ? path.join(dir, e.name, "SKILL.md")
            : e.name.endsWith(".md")
              ? path.join(dir, e.name)
              : null;
          if (!file || !fs.existsSync(file)) return null;
          const fm = matter(fs.readFileSync(file, "utf8")).data as {
            name?: string;
            description?: string;
          };
          const d = fm.description ?? "";
          return {
            slug: fm.name ?? e.name.replace(/\.md$/, ""),
            description: (d.split(/(?<=\.)\s/)[0] ?? d).trim(),
          } satisfies CatalogSkill;
        } catch {
          return null;
        }
      })
      .filter((s): s is CatalogSkill => s !== null);
  } catch {
    return [];
  }
}
