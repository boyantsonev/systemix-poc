"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { getProject } from "@/lib/data/mock-projects";
import { cn } from "@/lib/utils";

function qualityColor(score: number) {
  if (score >= 0.90) return "text-emerald-500";
  if (score >= 0.80) return "text-amber-500";
  return "text-red-400";
}

const ADAPTER_COLORS = {
  connected: "bg-emerald-500",
  degraded: "bg-amber-500",
  disconnected: "bg-red-400/50",
};

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  const p = getProject(slug);

  const tabs = [
    { label: "Inspect", href: `/projects/${slug}/inspect` },
    { label: "Drift",   href: `/projects/${slug}/drift`,   badge: p?.pendingHitl ?? 0 },
    { label: "Story",   href: `/projects/${slug}/story` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="h-11 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-card">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors mr-1"
        >
          <SLogo size={13} className="text-current" />
          <span className="text-[11px] font-mono">systemix</span>
          <span className="text-[11px] font-mono">/</span>
        </Link>

        <span className="text-[13px] font-semibold text-foreground">
          {p?.name ?? slug}
        </span>

        {p && (
          <span className={`text-[11px] font-mono font-bold tabular-nums ${qualityColor(p.qualityScore)}`}>
            {Math.round(p.qualityScore * 100)}%
          </span>
        )}

        {/* Tab nav */}
        <div className="ml-4 flex items-center gap-0.5">
          {tabs.map(({ label, href, badge }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] transition-colors",
                  active
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {label}
                {badge != null && badge > 0 && (
                  <span className="bg-amber-500/15 text-amber-500 border border-amber-500/20 text-[9px] font-bold px-1 rounded-full leading-none py-0.5">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Adapter status */}
        {p && (
          <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground/40 font-mono">
            <div className="flex items-center gap-1">
              {Object.values(p.adapters).map((status, i) => (
                <span
                  key={i}
                  className={`inline-block w-1.5 h-1.5 rounded-full ${ADAPTER_COLORS[status]}`}
                  title={status}
                />
              ))}
            </div>
            <span>{p.componentCount} components · {p.tokenCount} tokens</span>
          </div>
        )}
        <ThemeToggle className="ml-2 shrink-0" />
      </header>

      {/* Page content */}
      <div className="flex-1 flex min-h-0">
        {children}
      </div>

      {/* Status bar */}
      <footer className="h-8 shrink-0 border-t border-border bg-card flex items-center px-4 gap-3">
        <span className="text-[10px] font-mono text-muted-foreground/30 flex-1">
          {p?.name ?? slug} · {p?.componentCount ?? 0} components · {p?.tokenCount ?? 0} tokens
        </span>
        {p && p.pendingHitl > 0 ? (
          <Link
            href={`/projects/${slug}/drift`}
            className="flex items-center gap-1.5 text-amber-500 hover:text-amber-400 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            <span className="text-[10px] font-mono font-bold tabular-nums">
              {p.pendingHitl} pending
            </span>
          </Link>
        ) : (
          <span className="text-[10px] font-mono text-muted-foreground/30">no pending conflicts</span>
        )}
      </footer>
    </div>
  );
}
