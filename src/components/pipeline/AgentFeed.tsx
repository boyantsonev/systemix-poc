"use client";

import { useMemo, useState } from "react";
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
import { useEventStream, type StreamEvent } from "@/hooks/useEventStream";

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

  // Determine type badge color class
  const typeBadgeClass = (() => {
    switch (event.type) {
      case "tool-call":     return "text-[--agent-flux]";
      case "file-write":    return "text-[--agent-ada]";
      case "thinking":      return "text-muted-foreground/60";
      case "error":         return "text-[--color-error]";
      default:              return "text-muted-foreground/50";
    }
  })();

  return (
    <div
      className={`flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0 font-mono text-[11px] ${isHitl ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}`}
    >
      {/* Timestamp */}
      <span className="hidden sm:flex text-muted-foreground/40 tabular-nums w-[52px] shrink-0 pt-px">
        {relativeTime(event.timestamp)}
      </span>

      {/* Type badge */}
      <span className={`hidden sm:flex text-[10px] uppercase tracking-wide w-[48px] shrink-0 pt-px font-mono ${typeBadgeClass}`}>
        {cfg.label.replace(" ", "_").toLowerCase().slice(0, 8)}
      </span>

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
        <p className="text-xs sm:text-[11px] text-foreground/80 font-mono leading-relaxed">
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

// ── StreamEvent → FeedEvent mapper ────────────────────────────────────────────

let _liveCounter = 0;

function mapStreamEvent(evt: StreamEvent): FeedEvent {
  const id = evt.id ?? `live-${++_liveCounter}`;
  const agentId = evt.agent ?? evt.runId ?? "live-agent";
  const skill = evt.agent ?? "live";
  const skillColor = "teal";
  const timestamp = evt.timestamp;
  const data = evt.data ?? {};

  switch (evt.type) {
    case "tool_call":
      return {
        id, agentId, skill, skillColor, timestamp,
        type: "tool-call",
        content: String(data.tool ?? data.summary ?? evt.type),
        toolName: data.tool ? String(data.tool) : undefined,
      };
    case "file_read":
      return {
        id, agentId, skill, skillColor, timestamp,
        type: "file-read",
        content: String(data.path ?? "file"),
      };
    case "file_write":
      return {
        id, agentId, skill, skillColor, timestamp,
        type: "file-write",
        content: String(data.path ?? "file"),
      };
    case "thinking":
      return {
        id, agentId, skill, skillColor, timestamp,
        type: "thinking",
        content: String(data.message ?? "thinking..."),
        isActive: true,
      };
    case "agent_start":
      return {
        id, agentId, skill, skillColor, timestamp,
        type: "step-start",
        content: `Agent started${data.command ? `: ${data.command}` : ""}`,
      };
    case "agent_complete":
      return {
        id, agentId, skill, skillColor, timestamp,
        type: "step-done",
        content: String(data.summary ?? "Agent completed"),
      };
    case "agent_error":
      return {
        id, agentId, skill, skillColor, timestamp,
        type: "error",
        content: String(data.message ?? "Agent error"),
      };
    case "hitl_requested":
      return {
        id, agentId, skill, skillColor, timestamp,
        type: "awaiting-hitl",
        content: String(data.prompt ?? "Awaiting human review"),
      };
    case "hitl_resolved":
      return {
        id, agentId, skill, skillColor, timestamp,
        type: "step-done",
        content: String(data.resolution ?? "Review resolved"),
      };
    case "sync_complete":
      return {
        id, agentId, skill, skillColor, timestamp,
        type: "step-done",
        content: String(data.summary ?? "Sync complete"),
      };
    case "deploy_complete":
      return {
        id, agentId, skill, skillColor, timestamp,
        type: "step-done",
        content: String(data.url ?? "Deploy complete"),
      };
    default:
      return {
        id, agentId, skill, skillColor, timestamp,
        type: "message",
        content: String(data.message ?? evt.type),
      };
  }
}

// ── Live status indicator ──────────────────────────────────────────────────────

function LiveIndicator({ connected }: { connected: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          connected
            ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse"
            : "bg-slate-400 dark:bg-slate-500"
        }`}
      />
      <span className={`text-[10px] font-mono font-semibold ${
        connected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"
      }`}>
        {connected ? "Live" : "Offline"}
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type Props = { events: FeedEvent[]; useLive?: boolean };

export function AgentFeed({ events: mockEvents, useLive = false }: Props) {
  const { events: streamEvents, connected } = useEventStream({ enabled: useLive });

  const liveEvents = useMemo(
    () => streamEvents.map(mapStreamEvent),
    [streamEvents],
  );

  // Prepend live events to mock; cap at 50
  const events = useLive
    ? [...liveEvents, ...mockEvents].slice(0, 50)
    : mockEvents;

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

  return (
    <div className="font-mono text-[11px]">
      {useLive && (
        <div className="flex items-center justify-between px-1 pb-2 mb-1 border-b border-border/60">
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/50">
            Agent Feed
          </span>
          <LiveIndicator connected={connected} />
        </div>
      )}

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Cpu size={28} className="text-muted-foreground/20 mb-3" />
          <p className="text-[12px] text-muted-foreground/40">No agent activity yet.</p>
          <p className="text-[11px] text-muted-foreground/30 mt-1">Run a skill to start the feed.</p>
        </div>
      ) : (
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
                <div className="space-y-0 ml-3.5">
                  {group.events.map((evt) => (
                    <FeedEntry key={evt.id} event={evt} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
