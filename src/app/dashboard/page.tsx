"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Menu } from "lucide-react";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { mockProjects, mockActivity, type Project, type ActivityEvent, type ActivityEventType } from "@/lib/data/mock-projects";

function scoreColor(score: number): string {
  if (score >= 0.90) return "text-emerald-500";
  if (score >= 0.80) return "text-amber-500";
  return "text-red-400";
}

function StatusBadge({ status }: { status: Project["status"] }) {
  const map: Record<Project["status"], string> = {
    active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    staging: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    "in-progress": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide border rounded px-1.5 py-0.5 leading-none ${map[status]}`}>
      {status}
    </span>
  );
}

function AdapterDot({ status }: { status: Project["adapters"]["codebase"] }) {
  const map = {
    connected: "bg-emerald-500",
    degraded: "bg-amber-500",
    disconnected: "bg-red-400/50",
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${map[status]}`} title={status} />;
}

function ProjectCard({ p }: { p: Project }) {
  const connectedCount = Object.values(p.adapters).filter((s) => s === "connected").length;
  const hasAlert = p.driftCount > 0 || p.pendingHitl > 0;

  return (
    <div className="group rounded-lg border border-border bg-card hover:border-border/60 transition-colors">
      <div className="px-4 pt-4 pb-3">
        {/* Row 1: name + status + score */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{p.name}</span>
            <StatusBadge status={p.status} />
          </div>
          <span className={`text-sm font-mono tabular-nums font-bold ${scoreColor(p.qualityScore)}`}>
            {Math.round(p.qualityScore * 100)}%
          </span>
        </div>

        {/* Row 2: alert line — only when there's something wrong */}
        {hasAlert && (
          <p className="text-[11px] text-amber-500 mb-3">
            {[
              p.driftCount > 0 && `${p.driftCount} drifted`,
              p.pendingHitl > 0 && `${p.pendingHitl} pending`,
            ].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Row 3: adapter dots */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
          <div className="flex items-center gap-1">
            <AdapterDot status={p.adapters.codebase} />
            <AdapterDot status={p.adapters.figma} />
            <AdapterDot status={p.adapters.storybook} />
          </div>
          <span className="font-mono">{connectedCount}/3 adapters</span>
        </div>
      </div>

      {/* Footer: hidden by default, shown on hover (desktop) */}
      <div className="border-t border-border/40 px-3 py-2 hidden group-hover:flex items-center gap-0.5 md:flex md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        {[
          { label: "Inspect", href: `/projects/${p.slug}/inspect` },
          { label: "Drift",   href: `/projects/${p.slug}/drift`,   badge: p.pendingHitl > 0 ? p.pendingHitl : undefined },
          { label: "Story",   href: `/projects/${p.slug}/story` },
        ].map(({ label, href, badge }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            {label}
            {badge !== undefined && (
              <span className="bg-amber-500/15 text-amber-500 border border-amber-500/20 text-[10px] font-bold px-1 rounded-full leading-none py-0.5">
                {badge}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

const ACTIVITY_ICONS: Record<ActivityEventType, { glyph: string; color: string }> = {
  contract_built: { glyph: "◆", color: "text-violet-400" },
  drift_resolved: { glyph: "✓", color: "text-emerald-500" },
  hitl_decision:  { glyph: "◎", color: "text-amber-500"  },
  skill_run:      { glyph: "▷", color: "text-blue-400"   },
  deploy:         { glyph: "↑", color: "text-emerald-500" },
};

function ActivityRow({ e }: { e: ActivityEvent }) {
  const { glyph, color } = ACTIVITY_ICONS[e.type];
  return (
    <div className="px-4 py-2 flex items-start gap-2.5 hover:bg-muted/20 transition-colors">
      <span className={`text-[11px] font-mono mt-px shrink-0 ${color}`}>{glyph}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-foreground/80 leading-snug">{e.description}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground/60 font-mono">{e.project}</span>
          <span className="text-border/60">·</span>
          <span className="text-[10px] text-muted-foreground/40 font-mono">{e.ago}</span>
          {e.actor && (
            <>
              <span className="text-border/60">·</span>
              <span className="text-[10px] text-muted-foreground/40">{e.actor}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Mobile nav drawer ─────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Docs",         href: "/docs"  },
  { label: "Architecture", href: "/docs/architecture" },
];

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={onClose} />
      )}
      <div className={`fixed inset-y-0 right-0 z-50 w-56 bg-card border-l border-border flex flex-col md:hidden transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="h-11 flex items-center justify-between px-4 border-b border-border/50">
          <span className="text-[11px] font-mono text-muted-foreground">Navigation</span>
          <button onClick={onClose} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors" aria-label="Close menu">
            <X size={14} />
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="block px-3 py-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="h-11 border-b border-border flex items-center px-4 md:px-5 gap-3 shrink-0 bg-card">
        <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <SLogo size={15} className="text-foreground" />
          <span className="text-[13px] font-black tracking-tight">systemix</span>
        </Link>
        <span className="text-muted-foreground/30 text-xs">·</span>
        <span className="text-[11px] text-muted-foreground">Dashboard</span>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <nav className="hidden md:flex items-center gap-1 text-[11px] font-mono text-muted-foreground/50">
            <Link href="/docs"  className="px-2 py-1 rounded hover:bg-muted/40 hover:text-muted-foreground transition-colors">Docs</Link>
            <Link href="/docs/architecture" className="px-2 py-1 rounded hover:bg-muted/40 hover:text-muted-foreground transition-colors">Architecture</Link>
          </nav>
          <ThemeToggle />
          <button
            onClick={() => setNavOpen(true)}
            className="md:hidden p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            aria-label="Open navigation"
          >
            <Menu size={15} />
          </button>
        </div>
      </header>

      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden flex-col md:flex-row">
        {/* Projects */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0">
          <div className="mb-4 flex items-baseline gap-3">
            <h2 className="text-[11px] font-black tracking-widest uppercase text-muted-foreground/50">
              Projects
            </h2>
            <span className="text-[11px] text-muted-foreground/30 font-mono">
              {mockProjects.length} active
            </span>
          </div>
          <div className="grid gap-4 max-w-2xl">
            {mockProjects.map((p) => (
              <ProjectCard key={p.slug} p={p} />
            ))}
          </div>

          <div className="mt-8 md:mt-10 max-w-2xl rounded-lg border border-dashed border-border/50 px-5 py-4">
            <p className="text-[11px] text-muted-foreground/50 font-mono leading-relaxed">
              <span className="text-muted-foreground">Add a project →</span>{" "}
              cd your-project && npx systemix init
            </p>
          </div>
        </main>

        {/* Activity feed */}
        <aside className="hidden md:flex w-52 shrink-0 border-l border-border flex-col overflow-hidden">
          <div className="h-11 border-b border-border flex items-center px-4 shrink-0">
            <span className="text-[11px] font-black tracking-widest uppercase text-muted-foreground/50">
              Activity
            </span>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {mockActivity.map((e) => (
              <ActivityRow key={e.id} e={e} />
            ))}
          </div>
        </aside>
      </div>

      {/* Activity — mobile bottom strip */}
      <div className="md:hidden border-t border-border bg-card">
        <div className="h-9 flex items-center px-4">
          <span className="text-[11px] font-black tracking-widest uppercase text-muted-foreground/50">
            Recent activity
          </span>
        </div>
        <div className="divide-y divide-border/40 max-h-48 overflow-y-auto">
          {mockActivity.slice(0, 5).map((e) => (
            <ActivityRow key={e.id} e={e} />
          ))}
        </div>
      </div>
    </div>
  );
}
