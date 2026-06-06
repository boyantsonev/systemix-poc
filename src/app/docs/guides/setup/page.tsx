import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { mdxDocComponents } from "@/lib/mdx-doc-components";

export default async function SetupGuidePage() {
  const raw = readFileSync(
    join(process.cwd(), "content/docs/guides/setup.mdx"),
    "utf8"
  );
  const { content } = matter(raw);

  return (
    <article className="prose-custom">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">
        Guides
      </p>
      <MDXRemote source={content} components={mdxDocComponents} />

      {/* "Next steps" — styled Link components, kept in TSX */}
      <section className="mt-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-4">
          Next steps
        </h2>
        <div className="space-y-2">
          {[
            {
              href: "/docs/concepts/hypothesis-validation",
              label: "Hypothesis Validation — run your first experiment",
            },
            {
              href: "/docs/concepts/contract",
              label: "MDX Contracts — understand the file format",
            },
            {
              href: "/docs/concepts/quality-score",
              label: "Quality Score — what moves the number",
            },
            {
              href: "/docs/concepts/drift",
              label: "Drift & Reconciliation — ΔE and HITL deep dive",
            },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-muted-foreground/40">→</span>
              {label}
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
