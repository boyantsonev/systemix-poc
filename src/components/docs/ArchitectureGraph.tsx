"use client";

import Link from "next/link";
import { SystemGraph, GraphLegend } from "@/components/graph/SystemGraph";

// The architecture canvas — moved out of the old TSX docs page so it can be
// embedded directly in content/docs/architecture.mdx via the MDX component map.
export function ArchitectureGraph() {
  return (
    <>
      <div
        className="relative rounded-xl border border-border/40 overflow-hidden not-prose"
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
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0">
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
    </>
  );
}
