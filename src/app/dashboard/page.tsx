import Link from "next/link";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { mockProjects, mockActivity, type Project, type ActivityEvent, type ActivityEventType } from "@/lib/data/mock-projects";

function gigoColor(score: number): string {
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
  return (
    <div className="rounded-lg border border-border bg-card hover:border-border/60 transition-colors">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{p.name}</span>
            <StatusBadge status={p.status} />
          </div>
          <span className={`text-sm font-mono tabular-nums font-bold ${gigoColor(p.gigoScore)}`}>
            {Math.round(p.gigoScore * 100)}%
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-muted-foreground mb-2.5">
          <span>{p.tokenCount} tokens</span>
          <span className="text-border">·</span>
          <span>{p.componentCount} components</span>
          {p.driftCount > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="text-amber-500">{p.driftCount} drifted</span>
            </>
          )}
          {p.pendingHitl > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="text-amber-500">{p.pendingHitl} pending</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
          <div className="flex items-center gap-1">
            <AdapterDot status={p.adapters.codebase} />
            <AdapterDot status={p.adapters.figma} />
            <AdapterDot status={p.adapters.storybook} />
          </div>
          <span className="font-mono">{connectedCount}/3 adapters · source: {p.sourceOfTruth}</span>
        </div>
      </div>
      <div className="border-t border-border/40 px-3 py-2 flex items-center gap-0.5">
        {[
          { label: "Inspect", href: `/projects/${p.slug}/inspect` },
          { label: "Drift",   href: `/projects/${p.slug}/drift`,   badge: p.pendingHitl > 0 ? p.pendingHitl : undefined },
          { label: "Story",   href: `/projects/${p.slug}/story` },
        ].map(({ label, href, badge }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
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
    <div className="px-4 py-2.5 flex items-start gap-2.5 hover:bg-muted/20 transition-colors">
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
              <span className="text-[10px] text-muted-foreground/40 font-mono">{e.actor}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const totalPending = mockProjects.reduce((n, p) => n + p.pendingHitl, 0);
  const totalDrift   = mockProjects.reduce((n, p) => n + p.driftCount, 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="h-11 border-b border-border flex items-center px-5 gap-3 shrink-0 bg-card">
        <SLogo size={15} className="text-foreground" />
        <span className="text-[13px] font-black tracking-tight">systemix</span>
        <span className="text-muted-foreground/30 text-xs">·</span>
        <span className="text-[11px] text-muted-foreground">Design operations</span>
        <div className="ml-auto flex items-center gap-3 text-[10px] font-mono text-muted-foreground/50">
          {totalPending > 0 && (
            <span className="text-amber-500">{totalPending} pending HITL</span>
          )}
          {totalDrift > 0 && (
            <span className="text-amber-500/70">{totalDrift} drift total</span>
          )}
          <Link
            href="/workspace/variables"
            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors px-2 py-1 rounded hover:bg-muted/40"
          >
            Variables ↗
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Projects */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="mb-2 flex items-baseline gap-3">
            <h2 className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/50">
              Projects
            </h2>
            <span className="text-[10px] text-muted-foreground/30 font-mono">
              {mockProjects.length} active
            </span>
          </div>
          <div className="grid gap-3 max-w-2xl mt-3">
            {mockProjects.map((p) => (
              <ProjectCard key={p.slug} p={p} />
            ))}
          </div>

          {/* Empty state hint */}
          <div className="mt-10 max-w-2xl rounded-lg border border-dashed border-border/50 px-5 py-4">
            <p className="text-[11px] text-muted-foreground/50 font-mono leading-relaxed">
              <span className="text-muted-foreground">Add a project →</span>{" "}
              cd your-project && npx @systemix/init
            </p>
          </div>
        </main>

        {/* Activity feed */}
        <aside className="w-64 shrink-0 border-l border-border flex flex-col overflow-hidden">
          <div className="h-11 border-b border-border flex items-center px-4 shrink-0">
            <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/50">
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
    </div>
  );
}
