import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxDocComponents } from "@/lib/mdx-doc-components";

export default async function WorkflowAtlasPage() {
  const raw = readFileSync(
    join(process.cwd(), "content/docs/concepts/workflow-atlas.mdx"),
    "utf8"
  );
  const { content } = matter(raw);

  return (
    <article className="prose-custom">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">
        The stack
      </p>
      <MDXRemote source={content} components={mdxDocComponents} />
    </article>
  );
}
