"use client";

import { useParams } from "next/navigation";
import { getProject } from "@/lib/data/mock-projects";

export default function StoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const p = getProject(slug);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
      <p className="text-[13px] font-semibold text-foreground">Rationale</p>
      <p className="text-[11px] font-mono text-muted-foreground/40 text-center max-w-xs">
        Decision log and rationale renderer for {p?.name ?? slug}. Surfaces the "why" behind every token decision — coming soon.
      </p>
      <p className="text-[10px] font-mono text-muted-foreground/30 mt-4">
        SYSTMIX-182 · Sprint 2
      </p>
    </div>
  );
}
