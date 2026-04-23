"use client";

import { useParams } from "next/navigation";
import { getProject } from "@/lib/data/mock-projects";

export default function DriftPage() {
  const { slug } = useParams<{ slug: string }>();
  const p = getProject(slug);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
      {p && p.pendingHitl > 0 && (
        <div className="mb-2 inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
          <span className="text-[11px] font-bold text-amber-500">{p.pendingHitl} pending HITL decisions</span>
        </div>
      )}
      <p className="text-[13px] font-semibold text-foreground">Drift Room</p>
      <p className="text-[11px] font-mono text-muted-foreground/40 text-center max-w-xs">
        HITL queue for {p?.name ?? slug}. Drift resolution UI — coming soon.
      </p>
      <p className="text-[10px] font-mono text-muted-foreground/30 mt-4">
        SYSTMIX-180 · Sprint 2
      </p>
    </div>
  );
}
