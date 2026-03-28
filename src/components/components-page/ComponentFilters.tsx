"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { Component } from "@/lib/data/components";

type Status = Component["status"] | "All";

const statuses: Status[] = ["All", "Synced", "Drifted", "Stale", "New"];

const statusCls: Record<Status, string> = {
  All:     "bg-secondary text-secondary-foreground border border-border",
  Synced:  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  Drifted: "bg-red-500/10 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800",
  Stale:   "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  New:     "bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800",
};

type ComponentFiltersProps = {
  onFilter: (status: Status) => void;
  counts: Record<Status, number>;
};

export function ComponentFilters({ onFilter, counts }: ComponentFiltersProps) {
  const [active, setActive] = useState<Status>("All");

  const select = (s: Status) => {
    setActive(s);
    onFilter(s);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((s) => (
        <button
          key={s}
          onClick={() => select(s)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            active === s ? statusCls[s] : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-transparent"
          }`}
        >
          {s}
          <span className="opacity-70">{counts[s]}</span>
        </button>
      ))}
    </div>
  );
}
