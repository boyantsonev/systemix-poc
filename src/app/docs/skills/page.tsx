import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import { pipelineSkills } from "@/lib/data/pipeline";
import { mdxDocComponents } from "@/lib/mdx-doc-components";
import { SkillsBrowser } from "@/components/docs/SkillsBrowser";

export default async function SkillsPage() {
  const raw = readFileSync(
    join(process.cwd(), "content/docs/reference/skills.mdx"),
    "utf8"
  );
  const { content } = matter(raw);

  return (
    <article className="prose-custom">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">
        Reference
      </p>
      <MDXRemote source={content} components={mdxDocComponents} />

      {/* Available workflows callout */}
      <div className="rounded-xl border border-border/40 bg-muted/10 px-4 py-3 mb-8 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-1.5">
            Available workflows
          </p>
          <div className="space-y-1">
            <div className="flex items-baseline gap-2 text-[12px]">
              <code className="font-mono text-foreground/70 shrink-0">
                hypothesis-validation
              </code>
              <span className="text-muted-foreground/60">
                — /init-experiment · /growth-audit · /write-variants ·
                /close-experiment —{" "}
                <strong className="text-foreground/60">start here</strong>
              </span>
            </div>
            <div className="flex items-baseline gap-2 text-[12px]">
              <code className="font-mono text-foreground/70 shrink-0">
                design-system
              </code>
              <span className="text-muted-foreground/60">
                — /figma · /tokens · /sync-to-figma · /drift-report ·
                /check-parity · /contract-query
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive skill browser — client component */}
      <SkillsBrowser />
    </article>
  );
}
