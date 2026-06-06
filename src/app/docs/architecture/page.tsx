import { readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { SystemGraph, GraphLegend } from "@/components/graph/SystemGraph";
import { mdxDocComponents } from "@/lib/mdx-doc-components";

export default async function ArchitecturePage() {
  const raw = readFileSync(
    join(process.cwd(), "content/docs/reference/architecture.mdx"),
    "utf8"
  );
  const { content } = matter(raw);

  return (
    <article className="prose-custom">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">
        Reference
      </p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-2">
        Architecture
      </h1>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
        How the CLI, PostHog, Hermes, MDX contracts, and the HITL queue
        connect into a continuous hypothesis validation loop.
      </p>

      {/* Full-bleed graph canvas — stays in TSX (client component) */}
      <div
        className="relative rounded-xl border border-border/40 overflow-hidden"
        style={{ height: 560 }}
      >
        <SystemGraph />
        <div className="absolute bottom-4 left-4 z-10">
          <GraphLegend />
        </div>
        <Link
          href="/graph"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/50 bg-background/80 backdrop-blur-sm text-[11px] font-mono text-muted-foreground/60 hover:text-foreground hover:border-border transition-colors"
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
            className="shrink-0"
          >
            <path
              d="M1 10L10 1M10 1H4M10 1V7"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Fullscreen
        </Link>
      </div>

      <p className="text-[12px] text-muted-foreground/50 font-mono mt-4 mb-10">
        Scroll to zoom · drag to pan · click a node to inspect
      </p>

      <hr className="border-border/40 mb-8" />

      {/* Node types + loop sections from MDX */}
      <MDXRemote source={content} components={mdxDocComponents} />

      <Link
        href="/docs/concepts/hypothesis-validation"
        className="text-[13px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        → How the hypothesis validation loop works
      </Link>
    </article>
  );
}
