"use client";

import { useHitlQueue } from "@/hooks/useHitlQueue";

export function HitlBanner() {
  const { pendingCount } = useHitlQueue();
  if (!pendingCount) return null;
  return (
    <div className="rounded-lg border border-[--color-drifted]/40 bg-[--color-drifted-surface] px-4 py-2.5 mb-4 flex items-center gap-3">
      <div className="size-1.5 rounded-full bg-[--color-drifted] shrink-0" />
      <p className="text-[12px] font-medium flex-1">
        {pendingCount} task{pendingCount > 1 ? "s" : ""} awaiting review
      </p>
      <a href="/queue" className="text-[11px] font-medium text-[--color-drifted] hover:underline">
        Review →
      </a>
    </div>
  );
}
