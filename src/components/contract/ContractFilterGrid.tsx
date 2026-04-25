"use client";

import Link from "next/link";
import { useState } from "react";

export type ContractRow = {
  slug: string;
  name: string;
  type: "token" | "component";
  status: string;
  value?: string;
  figmaValue?: string | null;
  collection?: string;
  resolved?: boolean;
  path?: string;
  usageCount?: number | null;
};

const STATUS_COLOURS: Record<string, string> = {
  clean:              "bg-green-500/15 text-green-400 border-green-500/30",
  drifted:            "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "missing-in-figma": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  blocked:            "bg-red-500/15 text-red-400 border-red-500/30",
};

function isColor(v?: string | null): boolean {
  if (!v) return false;
  return /^(#|oklch\(|oklab\(|rgb[a]?\(|hsl[a]?\()/i.test(v.trim());
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono font-medium ${STATUS_COLOURS[status] ?? "bg-muted text-muted-foreground border-border"}`}
    >
      {status}
    </span>
  );
}

export function ContractFilterGrid({ rows, type }: { rows: ContractRow[]; type: "token" | "component" }) {
  const allStatuses = [...new Set(rows.map(r => r.status))].sort();
  const [active, setActive] = useState("all");

  const filtered = active === "all" ? rows : rows.filter(r => r.status === active);

  return (
    <div>
      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap mb-6">
        {["all", ...allStatuses].map(s => {
          const count = s === "all" ? rows.length : rows.filter(r => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`px-3 py-1 rounded-full text-[11px] font-mono border transition-colors cursor-pointer ${
                active === s
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {s} ({count})
            </button>
          );
        })}
      </div>

      {/* Rows */}
      <div className="grid gap-2">
        {filtered.map(row => (
          <Link
            key={row.slug}
            href={`/contract/${row.slug}`}
            className="group flex items-start gap-3 rounded-lg border border-border/50 bg-muted/10 px-4 py-3 hover:border-border hover:bg-muted/20 transition-colors"
          >
            {/* Color chip */}
            {isColor(row.value) && (
              <span
                className="mt-[3px] w-3.5 h-3.5 rounded-sm border border-white/10 shrink-0"
                style={{ backgroundColor: row.value }}
              />
            )}

            {/* Main */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[13px] text-foreground">{row.name}</span>
                <StatusBadge status={row.status} />
                {row.collection && (
                  <span className="text-[10px] font-mono text-muted-foreground/60 border border-border/30 px-1.5 py-0.5 rounded">
                    {row.collection}
                  </span>
                )}
                {row.resolved === false && row.status === "drifted" && (
                  <span className="text-[10px] font-mono text-orange-400/80">unresolved</span>
                )}
              </div>

              {/* Token values */}
              {row.value && (
                <div className="mt-1 flex gap-3 flex-wrap text-[11px] font-mono text-muted-foreground">
                  <span>code: {row.value}</span>
                  {row.figmaValue !== undefined && (
                    <span className={row.status === "drifted" ? "text-yellow-400/70" : ""}>
                      figma: {row.figmaValue ?? "—"}
                    </span>
                  )}
                </div>
              )}

              {/* Component path */}
              {row.path && (
                <p className="mt-1 text-[11px] font-mono text-muted-foreground">{row.path}</p>
              )}
            </div>

            {/* Usage count */}
            {row.usageCount != null && (
              <div className="shrink-0 text-right">
                <div className="text-[10px] font-mono text-muted-foreground/60">30d renders</div>
                <div className="text-[13px] font-mono text-foreground">{row.usageCount.toLocaleString()}</div>
              </div>
            )}
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-10 text-center text-[13px] font-mono text-muted-foreground">
          No {type}s match this filter.
        </p>
      )}
    </div>
  );
}
