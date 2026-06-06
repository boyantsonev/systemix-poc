import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { mdxDocComponents } from "@/lib/mdx-doc-components";

export default async function IntroductionPage() {
  const raw = readFileSync(
    join(process.cwd(), "content/docs/introduction.mdx"),
    "utf8"
  );
  const { content } = matter(raw);

  return (
    <article className="prose-custom">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">
        Getting Started
      </p>
      <MDXRemote source={content} components={mdxDocComponents} />

      {/* "Start here" navigation cards — styled Link components, kept in TSX */}
      <section className="mt-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-4">
          Start here
        </h2>
        <Link
          href="/docs/quick-install"
          className="block border border-border/60 rounded-xl px-5 py-5 hover:border-border hover:bg-muted/30 transition-colors group mb-3"
        >
          <p className="text-[14px] font-bold text-foreground mb-1">
            Quick Install →
          </p>
          <p className="text-[13px] text-muted-foreground">
            Up and running in under 5 minutes
          </p>
        </Link>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            {
              href: "/docs/concepts/hitl",
              label: "HITL & Decision Queue",
              sub: "Your weekly decision cadence — one click per hypothesis",
            },
            {
              href: "/docs/concepts/hypothesis-validation",
              label: "Hypothesis Validation",
              sub: "The full loop, step by step",
            },
            {
              href: "/docs/concepts/hermes",
              label: "Hermes",
              sub: "Local LLM, no API key, any Ollama model",
            },
            {
              href: "/docs/architecture",
              label: "Architecture",
              sub: "How all the pieces connect",
            },
          ].map(({ href, label, sub }) => (
            <Link
              key={href}
              href={href}
              className="block border border-border/40 rounded-xl px-4 py-4 hover:border-border hover:bg-muted/30 transition-colors group"
            >
              <p className="text-[13px] font-semibold text-foreground mb-1">
                {label} →
              </p>
              <p className="text-[12px] text-muted-foreground">{sub}</p>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
