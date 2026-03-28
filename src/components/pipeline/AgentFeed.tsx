"use client";

import { useState } from "react";
import {
  Cpu,
  FileSearch,
  FileEdit,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Plug,
} from "lucide-react";
import type { FeedEvent, FeedEventType } from "@/lib/data/pipeline";

// ── Persona color maps ─────────────────────────────────────────────────────────

const PERSONA_COLORS: Record<string, {
  dot: string;
  badge: string;
  border: string;
  text: string;
}> = {
  violet: {
    dot:    "bg-violet-500 dark:bg-violet-400",
    badge:  "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-500/30",
    border: "border-l-violet-500 dark:border-l-violet-500/60",
    text:   "text-violet-700 dark:text-violet-300",
  },
  teal: {
    dot:    "bg-teal-500 dark:bg-teal-400",
    badge:  "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-500/30",
    border: "border-l-teal-500 dark:border-l-teal-500/60",
    text:   "text-teal-700 dark:text-teal-300",
  },
  amber: {
    dot:    "bg-amber-500 dark:bg-amber-400",
    badge:  "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-500/30",
    border: "border-l-amber-500 dark:border-l-amber-500/60",
    text:   "text-amber-700 dark:text-amber-300",
  },
  rose: {
    dot:    "bg-rose-500 dark:bg-rose-400",
    badge:  "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-500/30",
    border: "border-l-rose-500 dark:border-l-rose-500/60",
    text:   "text-rose-700 dark:text-rose-300",
  },
  blue: {
    dot:    "bg-blue-500 dark:bg-blue-400",
    badge:  "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/30",
    border: "border-l-blue-500 dark:border-l-blue-500/60",
    text:   "text-blue-700 dark:text-blue-300",
  },
  emerald: {
    dot:    "bg-emerald-500 dark:bg-emerald-400",
    badge:  "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30",
    border: "border-l-emerald-500 dark:border-l-emerald-500/60",
    text:   "text-emerald-700 dark:text-emerald-300",
  },
  slate: {
    dot:    "bg-slate-500 dark:bg-slate-400",
    badge:  "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600/30",
    border: "border-l-slate-400 dark:border-l-slate-500/60",
    text:   "text-slate-700 dark:text-slate-300",
  },
};

function colorFor(color: string) {
  return PERSONA_COLORS[color] ?? PERSONA_COLORS.slate;
}

// ── Event type config ──────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<FeedEventType, {
  icon: React.ElementType;
  label: string;
  iconClass: string;
}> = {
  "thinking":      { icon: Cpu,          label: "Thinking",        iconClass: "text-muted-foreground animate-pulse" },
  "tool-call":     { icon: Plug,         label: "Tool call",       iconClass: "text-violet-600 dark:text-violet-400" },
  "tool-result":   { icon: CheckCircle2, label: "Result",          iconClass: "text-emerald-600 dark:text-emerald-400" },
  "file-read":     { icon: FileSearch,   label: "Reading",         iconClass: "text-blue-600 dark:text-blue-400" },
  "file-write":    { icon: FileEdit,     label: "Writing",         iconClass: "text-amber-700 dark:text-amber-400" },
  "step-start":    { icon: ChevronRight, label: "Step",            iconClass: "text-foreground/60" },
  "step-done":     { icon: CheckCircle2, label: "Done",            iconClass: "text-emerald-600 dark:text-emerald-400" },
  "awaiting-hitl": { icon: Clock,        label: "Awaiting review", iconClass: "text-amber-700 dark:text-amber-400" },
  "message":       { icon: Zap,          label: "Output",          iconClass: "text-foreground/60" },
  "error":         { icon: AlertCircle,  label: "Error",           iconClass: "text-red-600 dark:text-red-400" },
};

// ── Thinking cursor ────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <span className="inline-flex gap-0.5 ml-1 align-middle">
      <span className="thinking-dot w-1 h-1 rounded-full bg-current inline-block" />
      <span className="thinking-dot w-1 h-1 rounded-full bg-current inline-block" />
      <span className="thinking-dot w-1 h-1 rounded-full bg-current inline-block" />
    </span>
  );
}

// ── Step badge ─────────────────────────────────────────────────────────────────

function StepBadge({ step, total }: { step: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1 bg-muted border border-border rounded px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
      {step}/{total}
    </span>
  );
}

// ── MCP server chip ────────────────────────────────────────────────────────────

function McpChip({ server }: { server: string }) {
  const labels: Record<string, string> = {
    "figma-console-mcp": "Figma Console",
    "figma-mcp":         "Figma",
    "storybook-mcp":     "Storybook",
    "vercel-mcp":        "Vercel",
    "github-mcp":        "GitHub",
    "linear-mcp":        "Linear",
  };
  return (
    <span className="inline-flex items-center gap-0.5 bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-500/20 rounded px-1.5 py-0.5 text-[10px] font-mono">
      <Plug size={8} />
      {labels[server] ?? server}
    </span>
  );
}

// ── Single feed entry ──────────────────────────────────────────────────────────

function FeedEntry({ event }: { event: FeedEvent }) {
  const [expanded, setExpanded] = useState(false);
  const color = colorFor(event.skillColor);
  const cfg   = EVENT_CONFIG[event.type];
  const Icon  = cfg.icon;
  const isThinking   = event.type === "thinking";
  const isHitl       = event.type === "awaiting-hitl";
  const hasSubContent = Boolean(event.subContent);

  function relativeTime(iso: string) {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    return `${Math.round(diff / 3600)}h ago`;
  }

  return (
    <div
      className={`feed-entry border-l-2 pl-3 py-2 ${color.border} ${isHitl ? "bg-amber-50 dark:bg-amber-950/10" : ""}`}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        {/* Type icon */}
        <Icon size={12} className={`${cfg.iconClass} mt-0.5 flex-shrink-0`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            {/* Skill badge */}
            <span className={`text-[10px] font-semibold border rounded px-1.5 py-0.5 font-mono ${color.badge}`}>
              {event.skill}
            </span>

            {/* Step badge */}
            {event.step && event.totalSteps && (
              <StepBadge step={event.step} total={event.totalSteps} />
            )}

            {/* MCP chip */}
            {event.mcpServer && <McpChip server={event.mcpServer} />}

            {/* Tool name */}
            {event.toolName && (
              <span className="text-[10px] font-mono text-muted-foreground/70">
                {event.toolName}()
              </span>
            )}
          </div>

          {/* Main content */}
          <p className="text-xs text-foreground/90 font-mono leading-relaxed">
            {event.content}
            {isThinking && <ThinkingDots />}
            {event.isActive && !isThinking && (
              <span className="agent-cursor opacity-70" />
            )}
          </p>

          {/* Sub content */}
          {hasSubContent && (
            <div className="mt-1">
              {expanded ? (
                <pre className="text-[10px] font-mono text-muted-foreground/70 whitespace-pre-wrap leading-relaxed">
                  {event.subContent}
                </pre>
              ) : (
                <button
                  onClick={() => setExpanded(true)}
                  className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-0.5 transition-colors"
                >
                  <ChevronDown size={10} />
                  details
                </button>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground/40 flex-shrink-0 pt-0.5 tabular-nums">
          {relativeTime(event.timestamp)}
        </span>
      </div>
    </div>
  );
}

// ── Agent group header ─────────────────────────────────────────────────────────

function AgentGroupHeader({
  skill,
  agentId,
  skillColor,
  isActive,
}: {
  skill: string;
  agentId: string;
  skillColor: string;
  isActive: boolean;
}) {
  const color = colorFor(skillColor);

  const displayNames: Record<string, string> = {
    "figma-to-code":         "Figma → Code",
    "token-sync":            "Token Sync",
    "design-drift-detector": "Drift Detector",
    "component-themer":      "Component Themer",
    "doc-sync":              "Doc Sync",
    "storybook-agent":       "Storybook",
    "deploy-agent":          "Deploy",
  };

  return (
    <div className="flex items-center gap-2 pt-4 pb-1 first:pt-0">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.dot} ${isActive ? "animate-pulse" : "opacity-40"}`} />
      <span className={`text-[10px] font-semibold font-mono ${isActive ? color.text : "text-muted-foreground/50"}`}>
        {skill}
      </span>
      <span className="text-[10px] text-muted-foreground/30">
        {displayNames[agentId] ?? agentId}
      </span>
      {isActive && (
        <span className="text-[10px] text-amber-700 border border-amber-400 bg-amber-100 dark:text-amber-400/70 dark:border-amber-500/20 dark:bg-amber-950/20 rounded px-1.5 py-0.5">
          running
        </span>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type Props = { events: FeedEvent[] };

export function AgentFeed({ events }: Props) {
  // Group events by agentId in order of first appearance
  const groups: { agentId: string; skill: string; skillColor: string; events: FeedEvent[] }[] = [];
  const seen = new Set<string>();

  for (const evt of events) {
    if (!seen.has(evt.agentId)) {
      seen.add(evt.agentId);
      groups.push({ agentId: evt.agentId, skill: evt.skill, skillColor: evt.skillColor, events: [] });
    }
    groups.find(g => g.agentId === evt.agentId)!.events.push(evt);
  }

  // Sort groups — active (has thinking/active event) first
  groups.sort((a, b) => {
    const aActive = a.events.some(e => e.isActive || e.type === "thinking");
    const bActive = b.events.some(e => e.isActive || e.type === "thinking");
    return Number(bActive) - Number(aActive);
  });

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Cpu size={32} className="text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground/40">No agent activity yet.</p>
        <p className="text-xs text-muted-foreground/30 mt-1">Run a skill to start the feed.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {groups.map((group) => {
        const isActive = group.events.some(e => e.isActive || e.type === "thinking");
        return (
          <div key={group.agentId}>
            <AgentGroupHeader
              skill={group.skill}
              agentId={group.agentId}
              skillColor={group.skillColor}
              isActive={isActive}
            />
            <div className="space-y-0.5 ml-3.5">
              {group.events.map((evt) => (
                <FeedEntry key={evt.id} event={evt} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
