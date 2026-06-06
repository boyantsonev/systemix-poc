import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxDocComponents } from "@/lib/mdx-doc-components";

export default async function McpServerPage() {
  const raw = readFileSync(
    join(process.cwd(), "content/docs/reference/mcp-server.mdx"),
    "utf8"
  );
  const { content } = matter(raw);

  return (
    <article className="prose-custom">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">
        Reference
      </p>
      <MDXRemote source={content} components={mdxDocComponents} />
    </article>
  );
}
