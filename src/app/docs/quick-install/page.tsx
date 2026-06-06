import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { mdxDocComponents } from "@/lib/mdx-doc-components";

export default async function QuickInstallPage() {
  const raw = readFileSync(
    join(process.cwd(), "content/docs/quick-install.mdx"),
    "utf8"
  );
  const { content } = matter(raw);

  return (
    <article className="prose-custom">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">
        Getting Started
      </p>
      <MDXRemote source={content} components={mdxDocComponents} />

      {/* "What's next" — styled Link components, kept in TSX */}
      <section className="mt-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-4">
          What&apos;s next
        </h2>
        <div className="space-y-2 mb-8">
          {[
            {
              href: "/docs/concepts/hypothesis-validation",
              label: "Hypothesis Validation — the full loop, step by step",
            },
            {
              href: "/docs/concepts/evidence-layer",
              label: "How production results are written back to the contract",
            },
            {
              href: "/docs/concepts/hermes",
              label: "Hermes — the local LLM that authors contracts",
            },
            {
              href: "/docs/concepts/contract",
              label: "MDX contract format — frontmatter + prose",
            },
            {
              href: "/docs/concepts/hitl",
              label: "Decision Queue — approving Hermes cards",
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

        <div className="rounded-xl border border-border/40 px-4 py-4 bg-muted/20">
          <p className="text-[12px] font-bold text-foreground mb-1.5">
            Start the evidence loop
          </p>
          <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">
            Run{" "}
            <code className="font-mono text-[11px] bg-muted/60 px-1 py-0.5 rounded text-foreground">
              npx systemix watch
            </code>{" "}
            to keep Hermes running. It polls PostHog for experiment results and
            writes evidence back to each hypothesis contract as a dated record.
            The Decision Queue surfaces anything that needs your approval before
            the contract closes.
          </p>
          <Link
            href="/docs/concepts/evidence-layer"
            className="text-[11px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Evidence Layer →
          </Link>
        </div>
      </section>
    </article>
  );
}
