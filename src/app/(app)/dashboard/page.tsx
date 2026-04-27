import Link from "next/link";
import { mockProjects, mockActivity, type Project, type ActivityEvent, type ActivityEventType } from "@/lib/data/mock-projects";
import { HitlQueue } from "@/components/systemix/HitlQueue";

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
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{p.name}</span>
            <StatusBadge status={p.status} />
          </div>
          <span className={`text-sm font-mono tabular-nums font-bold ${scoreColor(p.qualityScore)}`}>
            {Math.round(p.qualityScore * 100)}%
          </span>
        </div>

        {hasAlert && (
          <p className="text-[11px] text-amber-500 mb-3">
            {[
              p.driftCount > 0 && `${p.driftCount} drifted`,
              p.pendingHitl > 0 && `${p.pendingHitl} pending`,
            ].filter(Boolean).join(" · ")}
          </p>
        )}

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/50">
          <div className="flex items-center gap-1">
            <AdapterDot status={p.adapters.codebase} />
            <AdapterDot status={p.adapters.figma} />
            <AdapterDot status={p.adapters.storybook} />
          </div>
          <span className="font-mono">{connectedCount}/3 adapters</span>
        </div>
      </div>

      <div className="border-t border-border/40 px-3 py-2 flex md:opacity-0 md:group-hover:opacity-100 transition-opacity items-center gap-0.5">
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

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Mock data notice */}
      <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 md:px-5 py-2.5 flex items-center gap-3">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/60 shrink-0" />
        <p className="text-[12px] text-amber-500/80 leading-snug">
          <span className="font-medium">Sample data.</span>{" "}
          Real projects populate automatically once Systemix is connected to Claude Code, Cursor, or any MCP-compatible editor.
        </p>
        <Link href="/docs/quick-install" className="ml-auto shrink-0 text-[11px] text-amber-500/60 hover:text-amber-500 transition-colors whitespace-nowrap font-mono">
          How to connect →
        </Link>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden flex-col md:flex-row">
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

          <HitlQueue />
        </main>

        {/* Activity feed — desktop */}
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

      {/* Activity — mobile strip */}
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
