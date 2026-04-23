"use client";

import { cn } from "@/lib/utils";
import { Shield, AlertCircle, CheckCircle2, ArrowRight, Zap, Database, Map, Handshake, BarChart3, SlidersHorizontal, Clock, Search, ExternalLink } from "lucide-react";

// ── Token cost data ───────────────────────────────────────────────────────────

type CostRisk = "critical" | "high" | "medium" | "low" | "minimal";

const MCP_COSTS: {
  tool: string;
  range: string;
  driver: string;
  risk: CostRisk;
  scoped?: boolean;
}[] = [
  { tool: "get_file_data", range: "50k – 400k+", driver: "Full document tree, all pages, all nodes", risk: "critical" },
  { tool: "get_design_context (unscoped)", range: "20k – 80k", driver: "Recursive node traversal without depth limit", risk: "high" },
  { tool: "get_design_context (node-scoped)", range: "2k – 20k", driver: "Node complexity, nesting depth", risk: "medium", scoped: true },
  { tool: "get_variables", range: "5k – 40k", driver: "Collections × modes × variables", risk: "medium" },
  { tool: "get_variables (summary)", range: "1k – 5k", driver: "Collection names + counts only", risk: "low", scoped: true },
  { tool: "get_component (single)", range: "1k – 8k", driver: "Variant count, nested instances", risk: "low", scoped: true },
  { tool: "get_design_system_summary", range: "500 – 2k", driver: "Structural metadata only", risk: "minimal", scoped: true },
  { tool: "get_styles", range: "1k – 6k", driver: "Number of named styles", risk: "low", scoped: true },
  { tool: "search_components", range: "2k – 10k", driver: "Match breadth, metadata depth", risk: "low", scoped: true },
];

const RISK_CONFIG: Record<CostRisk, { label: string; className: string }> = {
  critical: { label: "CRITICAL", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  high:     { label: "HIGH",     className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  medium:   { label: "MEDIUM",   className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  low:      { label: "LOW",      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  minimal:  { label: "MINIMAL",  className: "bg-muted text-muted-foreground border-border" },
};

// ── Pipeline skill data ───────────────────────────────────────────────────────

const PIPELINE_SKILLS = [
  { num: "01", name: "Figma Read",      before: 180, after: 4   },
  { num: "02", name: "Token Diff",      before: 60,  after: 3   },
  { num: "03", name: "Component Sync",  before: 40,  after: 8   },
  { num: "04", name: "Code Gen",        before: 35,  after: 12  },
  { num: "05", name: "Linear / PR",     before: 20,  after: 3   },
];

const TOTAL_BEFORE = PIPELINE_SKILLS.reduce((s, p) => s + p.before, 0);
const TOTAL_AFTER  = PIPELINE_SKILLS.reduce((s, p) => s + p.after, 0);

// ── Feature data ──────────────────────────────────────────────────────────────

const FEATURES = [
  {
    id: "F-01",
    name: "Pre-Run Estimator",
    flag: "--dry-run",
    icon: <BarChart3 size={14} />,
    desc: "Token cost breakdown by skill before any execution. Shows cache hit ratio. Prompts to narrow scope or proceed.",
    stat: "±15% accuracy",
    linear: "BAST-142",
  },
  {
    id: "F-02",
    name: "Scope Flags",
    flag: "--node / --page / --only / --incremental",
    icon: <SlidersHorizontal size={14} />,
    desc: "Target exactly what to sync. --incremental is default for repeat runs. --only tokens skips component traversal entirely (~70% cheaper).",
    stat: "70% cheaper token-only runs",
    linear: "BAST-143",
  },
  {
    id: "F-03",
    name: "Budget Cap",
    flag: "--budget",
    icon: <Shield size={14} />,
    desc: "Checked at pre-fetch stage before any Claude call. Aborts with suggestions if estimate exceeds cap. Zero over-budget surprises.",
    stat: "Exit code 1 for CI pipelines",
    linear: "BAST-145",
  },
  {
    id: "F-04",
    name: "MCP Proxy",
    flag: "systemix mcp-proxy",
    icon: <Zap size={14} />,
    desc: "Intercepts get_file_data → downgrades to scoped reads. Deduplicates calls. Serves cache. Works with any MCP client.",
    stat: "5–50× cheaper file reads",
    linear: "BAST-149",
  },
  {
    id: "F-05",
    name: "Scheduler",
    flag: "--schedule",
    icon: <Clock size={14} />,
    desc: "Schedule heavy runs for off-peak windows (Claude Pro limits drop 13:00–19:00 GMT). Uses local cron/launchd. No cloud dependency.",
    stat: "Avoids peak throttling",
    linear: "BAST-146",
  },
  {
    id: "F-06",
    name: "Repo Scanner",
    flag: "token-profile",
    icon: <Search size={14} />,
    desc: "Audits a codebase for unscoped MCP calls, missing budget caps in CI, hardcoded Figma URLs. Outputs a prioritized fix list.",
    stat: "Catch waste before it runs",
    linear: "BAST-147",
  },
];

// ── Phase data ────────────────────────────────────────────────────────────────

const PHASES = [
  {
    num: "Phase 8",
    label: "Foundation",
    color: "text-emerald-500",
    borderColor: "border-emerald-500/30",
    date: "Apr 27",
    items: ["Pre-fetch architecture (prefetch.ts)", "Disk cache (.systemix/cache/)", "Node map pre-computation", "Session handoff protocol", "Token counter + run logging"],
    linear: ["BAST-138", "BAST-139", "BAST-140", "BAST-141", "BAST-144"],
  },
  {
    num: "Phase 9",
    label: "Beta CLI",
    color: "text-amber-500",
    borderColor: "border-amber-500/30",
    date: "May 18",
    items: ["--dry-run estimator", "--incremental + smart diff", "--budget cap enforcement", "--schedule + cron", "token-profile scanner", "Mission Control dashboard"],
    linear: ["BAST-142", "BAST-143", "BAST-145", "BAST-146", "BAST-147", "BAST-148"],
  },
  {
    num: "Phase 10",
    label: "MCP Proxy",
    color: "text-violet-400",
    borderColor: "border-violet-500/30",
    date: "Jun 8",
    items: ["systemix-mcp-proxy binary", "Claude Desktop + Cursor auto-register", "GitHub Action (CI budget)", "shadcn CLI distribution", "Public docs + benchmarks"],
    linear: ["BAST-149", "BAST-150", "BAST-151", "BAST-152"],
  },
];

// ── Subcomponents ─────────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: CostRisk }) {
  const cfg = RISK_CONFIG[risk];
  return (
    <span className={cn(
      "inline-flex text-[10px] font-bold border rounded px-1.5 py-0.5 leading-none tracking-wide",
      cfg.className,
    )}>
      {cfg.label}
    </span>
  );
}

function SkillBar({ skill }: { skill: typeof PIPELINE_SKILLS[0] }) {
  const maxBefore = Math.max(...PIPELINE_SKILLS.map(s => s.before));
  const beforePct = (skill.before / maxBefore) * 100;
  const afterPct  = (skill.after / maxBefore) * 100;

  return (
    <div className="grid grid-cols-[60px_1fr_80px] items-center gap-3 py-2">
      <div>
        <p className="text-[10px] font-black tracking-widest text-muted-foreground/50">
          {skill.num}
        </p>
        <p className="text-[11px] font-medium text-foreground leading-tight">{skill.name}</p>
      </div>
      <div className="space-y-1">
        {/* Before bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-red-400/40"
              style={{ width: `${beforePct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-red-400/70 w-12 text-right tabular-nums">
            ~{skill.before}k
          </span>
        </div>
        {/* After bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${afterPct}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-emerald-400 w-12 text-right tabular-nums">
            ~{skill.after}k
          </span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-mono text-emerald-500">
          {Math.round((1 - skill.after / skill.before) * 100)}% less
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TokenGuardPage() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm flex items-center gap-3 px-6 h-12 flex-shrink-0">
        <Shield size={14} className="text-violet-400 flex-shrink-0" />
        <h1 className="text-sm font-semibold text-foreground">TokenGuard</h1>
        <code className="text-[10px] font-mono text-muted-foreground/50">Figma MCP token intelligence</code>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-[10px] text-muted-foreground">~{TOTAL_BEFORE}k unoptimized</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-muted-foreground">~{TOTAL_AFTER}k optimized</span>
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
            <span className="text-[10px] font-bold text-emerald-500">
              {Math.round((1 - TOTAL_AFTER / TOTAL_BEFORE) * 100)}% reduction
            </span>
          </div>
        </div>
      </div>

      {/* Core insight banner */}
      <div className="flex items-start gap-3 px-6 py-3 bg-violet-500/5 border-b border-violet-500/10">
        <Zap size={14} className="text-violet-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Core insight:</span>{" "}
          Token waste in Figma MCP workflows is almost entirely structural, not conversational.
          It comes from over-fetching, session length, and re-reading unchanged data —
          all of which are <span className="text-foreground font-medium">predictable and preventable</span>.
          <code className="ml-2 text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">get_file_data</code>
          {" "}alone can consume 400k tokens. A scoped series of{" "}
          <code className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">get_design_context</code>
          {" "}calls costs 5–50× less.
        </p>
      </div>

      <div className="px-6 py-6 space-y-8">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: "~10×", label: "Over-fetch ratio on get_file_data vs scoped reads", color: "text-red-400" },
            { value: "5h",   label: "Rolling window before quota reset (varies by load)", color: "text-amber-500" },
            { value: "91%",  label: "Token reduction achieved with pre-fetch + scoped sessions", color: "text-emerald-500" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-card p-5 text-center">
              <p className={cn("text-3xl font-black tracking-tight mb-1", stat.color)}>{stat.value}</p>
              <p className="text-[11px] text-muted-foreground leading-snug">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-2 gap-6">

          {/* Left: Token cost anatomy */}
          <div>
            <div className="flex items-baseline gap-3 mb-3">
              <h2 className="text-sm font-semibold text-foreground">Token Cost Anatomy</h2>
              <p className="text-xs text-muted-foreground">Figma MCP tool costs</p>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="py-2 px-3 text-[10px] font-black tracking-widest uppercase text-muted-foreground/50">MCP Tool</th>
                    <th className="py-2 px-3 text-[10px] font-black tracking-widest uppercase text-muted-foreground/50">Tokens</th>
                    <th className="py-2 px-3 text-[10px] font-black tracking-widest uppercase text-muted-foreground/50">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {MCP_COSTS.map((row) => (
                    <tr
                      key={row.tool}
                      className={cn(
                        "border-b border-border/40 hover:bg-muted/20 transition-colors",
                        row.risk === "critical" && "bg-red-500/3",
                        row.risk === "high"     && "bg-orange-500/3",
                      )}
                    >
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          {row.scoped && (
                            <CheckCircle2 size={9} className="text-emerald-500 flex-shrink-0" />
                          )}
                          {!row.scoped && (
                            <AlertCircle size={9} className={cn(
                              "flex-shrink-0",
                              row.risk === "critical" ? "text-red-400" : "text-orange-400",
                            )} />
                          )}
                          <code className="text-[10px] font-mono text-foreground/80">{row.tool}</code>
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5 pl-3.5">{row.driver}</p>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{row.range}</span>
                      </td>
                      <td className="py-2 px-3">
                        <RiskBadge risk={row.risk} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-2">
              <CheckCircle2 size={9} className="inline text-emerald-500 mr-1" />
              Green check = scoped / recommended call pattern
            </p>
          </div>

          {/* Right: Pipeline before/after */}
          <div>
            <div className="flex items-baseline gap-3 mb-3">
              <h2 className="text-sm font-semibold text-foreground">Pipeline Token Budget</h2>
              <p className="text-xs text-muted-foreground">5-skill run · before vs after</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="divide-y divide-border/40">
                {PIPELINE_SKILLS.map((skill) => (
                  <SkillBar key={skill.num} skill={skill} />
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-400/40" />
                    <span className="text-[11px] text-muted-foreground">Unoptimized total</span>
                    <span className="text-[11px] font-mono font-semibold text-red-400">~{TOTAL_BEFORE}k tokens</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] text-muted-foreground">Optimized total</span>
                    <span className="text-[11px] font-mono font-semibold text-emerald-400">~{TOTAL_AFTER}k tokens</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-emerald-500">
                    {Math.round((1 - TOTAL_AFTER / TOTAL_BEFORE) * 100)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">reduction</p>
                </div>
              </div>
            </div>

            {/* Pre-fetch pattern callout */}
            <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
              <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/50 mb-2">Pre-Fetch Pattern</p>
              <div className="space-y-1.5 text-[11px] font-mono">
                <p className="text-red-400/60 line-through">agent.run("Audit Button") → get_file_data → 200k tokens</p>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div className="text-muted-foreground">
                    <span className="text-emerald-400">prefetch</span>
                    {"({ nodeId, depth: 3 }) → "}
                    <span className="text-foreground">agent.run</span>
                    {"(payload) → "}
                    <span className="text-emerald-400">4k tokens</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature grid */}
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-sm font-semibold text-foreground">TokenGuard Features</h2>
            <p className="text-xs text-muted-foreground">6 public-facing capabilities · Phase 9–10</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <div
                key={f.id}
                className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-violet-400">
                    {f.icon}
                    <span className="text-[10px] font-black tracking-widest text-muted-foreground/50">{f.id}</span>
                  </div>
                  <a
                    href={`https://linear.app/bastion-labs/issue/${f.linear}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    {f.linear}
                  </a>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">{f.name}</p>
                  <code className="text-[10px] font-mono text-violet-400/70">{f.flag}</code>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">{f.desc}</p>
                <p className="text-[10px] font-semibold text-emerald-500">{f.stat}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap */}
        <div>
          <div className="flex items-baseline gap-3 mb-4">
            <h2 className="text-sm font-semibold text-foreground">Delivery Roadmap</h2>
            <p className="text-xs text-muted-foreground">3 phases · BAST-138–152</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {PHASES.map((phase, i) => (
              <div
                key={phase.num}
                className={cn(
                  "rounded-lg border bg-card p-5",
                  phase.borderColor,
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-[10px] font-black tracking-widest uppercase", phase.color)}>
                    {phase.num}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/50">{phase.date}</span>
                </div>
                <p className="text-sm font-semibold text-foreground mb-3">{phase.label}</p>
                <ul className="space-y-1.5">
                  {phase.items.map((item, j) => (
                    <li key={item} className="flex items-start gap-2">
                      <a
                        href={`https://linear.app/bastion-labs/issue/${phase.linear[j]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-2 group"
                      >
                        <ArrowRight size={10} className={cn("mt-0.5 flex-shrink-0 transition-colors", phase.color, "opacity-60 group-hover:opacity-100")} />
                        <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">{item}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Install snippet */}
        <div className="rounded-lg border border-border bg-muted/20 p-5">
          <p className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/50 mb-3">Distribution · Phase 10</p>
          <div className="font-mono text-[12px] space-y-1">
            <p className="text-muted-foreground/40"># Add TokenGuard to any project</p>
            <p>
              <span className="text-violet-400">$</span>
              <span className="text-foreground ml-2">npx systemix add token-guard</span>
            </p>
            <div className="mt-3 space-y-0.5 text-muted-foreground/60">
              <p><span className="text-emerald-500">✓</span> TokenGuard installed</p>
              <p><span className="text-emerald-500">✓</span> MCP proxy registered in .cursor/mcp.json</p>
              <p><span className="text-emerald-500">✓</span> Cache directory initialized at .systemix/cache/</p>
              <p><span className="text-emerald-500">✓</span> Run <span className="text-foreground">systemix token-guard status</span> to verify</p>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground/60 italic">
            "TokenGuard — Figma MCP token intelligence for teams running agentic design workflows.
            Know what you'll spend before you spend it."
          </p>
        </div>

      </div>
    </div>
  );
}
