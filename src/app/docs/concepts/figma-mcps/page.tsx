import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { mdxDocComponents } from "@/lib/mdx-doc-components";

export default async function FigmaMcpsPage() {
  const raw = readFileSync(
    join(process.cwd(), "content/docs/concepts/figma-mcps.mdx"),
    "utf8"
  );
  const { content } = matter(raw);

  return (
    <article className="prose-custom">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">
        Concepts
      </p>
      <MDXRemote source={content} components={mdxDocComponents} />
    </article>
  );
}
