"use client";

import { CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type HitlItem = {
  id: string;
  skill: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
};

const DEMO_QUEUE: HitlItem[] = [
  { id: "1", skill: "/tokens", title: "3 token changes pending", description: "--background: #ffffff → #fafafa · --border: #e5e5e5 → #ebebeb · --muted: #f5f5f5 → #f0f0f0", priority: "high" },
  { id: "2", skill: "/component", title: "New file: Button.tsx", description: "src/components/ui/Button.tsx — 84 lines · uses cva() · 3 variants: default, outline, ghost", priority: "medium" },
];

type HitlDrawerProps = {
  queue?: HitlItem[];
};

export function HitlDrawer({ queue = DEMO_QUEUE }: HitlDrawerProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className={cn(
      "border-t border-border bg-card transition-all duration-200 flex-shrink-0",
      open ? "h-40" : "h-9",
    )}>
      {/* Drawer handle */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full px-4 h-9 hover:bg-muted/30 transition-colors border-b border-border"
      >
        <span className="text-[11px] font-black tracking-widest uppercase text-muted-foreground/70">
          Approval Queue
        </span>
        <span className="text-[11px] text-muted-foreground/50">
          — what HITL-gated steps look like when running in Claude Code
        </span>
        <span className="ml-auto text-muted-foreground">
          {open ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </span>
      </button>

      {/* Cards */}
      {open && (
        <div className="flex gap-3 px-4 py-3 overflow-x-auto h-[calc(100%-36px)]">
          {/* Context callout */}
          <div className="flex-shrink-0 w-56 flex flex-col justify-center gap-1.5 pr-3 border-r border-border">
            <p className="text-xs font-semibold text-foreground">Approvals happen in Claude Code</p>
            <p className="text-[11px] text-muted-foreground/70 leading-snug">
              When a step with an <span className="text-amber-400 font-semibold">HITL gate</span> runs, Claude pauses and shows the diff in your terminal. You type <code className="bg-muted px-1 rounded text-[10px]">approve</code> or <code className="bg-muted px-1 rounded text-[10px]">reject</code> — not here.
            </p>
          </div>

          {queue.map(item => (
            <div
              key={item.id}
              className="flex-shrink-0 w-64 border border-border rounded-lg bg-background px-3 py-2.5 flex flex-col gap-1.5 opacity-60"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <code className="font-mono text-[10px] text-teal-400">{item.skill}</code>
                  <p className="text-xs font-semibold text-foreground">{item.title}</p>
                </div>
                <span className={cn(
                  "text-[8px] font-black tracking-widest uppercase rounded px-1 py-0.5 flex-shrink-0 mt-0.5",
                  item.priority === "high" ? "bg-red-500/10 text-red-400" :
                  item.priority === "medium" ? "bg-amber-500/10 text-amber-400" :
                  "bg-muted text-muted-foreground",
                )}>
                  {item.priority}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{item.description}</p>
              <div className="flex gap-2 mt-auto pt-1">
                <div className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-400/50 border border-emerald-500/10 rounded-md py-1">
                  <CheckCircle size={11} /> approve
                </div>
                <div className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-red-400/50 border border-red-500/10 rounded-md py-1">
                  <XCircle size={11} /> reject
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
