"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { WorkflowNode } from "./WorkflowNode";
import type { WorkflowDef, NodeStatus, WorkflowNodeDef } from "@/lib/data/workflows";
import { NODE_W, NODE_H, CANVAS_H } from "@/lib/data/workflows";

// ── Constants ─────────────────────────────────────────────────────────────

const MIN_ZOOM   = 0.25;
const MAX_ZOOM   = 2.0;
const ZOOM_STEP  = 0.12;
const DOT_GRID   = 20; // base dot-grid spacing in px

// ── Helpers ───────────────────────────────────────────────────────────────

function canvasContentWidth(nodes: WorkflowNodeDef[]) {
  const maxX = Math.max(...nodes.map((n) => n.position.x));
  return maxX + NODE_W + 56;
}

// ── SVG Edge ─────────────────────────────────────────────────────────────

type EdgeProps = {
  from: WorkflowNodeDef;
  to: WorkflowNodeDef;
  fromStatus: NodeStatus;
};

function Edge({ from, to, fromStatus }: EdgeProps) {
  const x1 = from.position.x + NODE_W;
  const y1 = from.position.y + NODE_H / 2;
  const x2 = to.position.x;
  const y2 = to.position.y + NODE_H / 2;
  const dx = Math.abs(x2 - x1) * 0.45;

  const active  = fromStatus === "done" || fromStatus === "approved";
  const running = fromStatus === "running";
  const waiting = fromStatus === "awaiting-approval";
  const error   = fromStatus === "error" || fromStatus === "rejected";

  const stroke = active
    ? "oklch(0.72 0.17 162)"    // emerald
    : error
    ? "oklch(0.7 0.22 27)"      // red
    : running || waiting
    ? "oklch(0.72 0.2 290)"     // violet
    : "oklch(1 0 0 / 14%)";     // muted

  const opacity     = active || running || waiting ? 1 : 0.45;
  const strokeWidth = active ? 2 : 1.5;
  const markerId    = `arr-${from.id}-${to.id}`;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth="7"
          markerHeight="7"
          refX="6"
          refY="3.5"
          orient="auto"
        >
          <path d="M0,0.5 L6,3.5 L0,6.5 Z" fill={stroke} opacity={opacity} />
        </marker>
      </defs>
      <path
        d={`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={running || waiting ? "7 4" : undefined}
        opacity={opacity}
        markerEnd={`url(#${markerId})`}
        className={running || waiting ? "animate-pulse" : undefined}
      />
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

type Props = {
  workflow: WorkflowDef;
  statuses: Record<string, NodeStatus>;
  selectedNodeId: string | null;
  onNodeClick: (id: string) => void;
  onRun: () => void;
  isRunning: boolean;
};

export function WorkflowCanvas({
  workflow, statuses, selectedNodeId, onNodeClick, onRun, isRunning,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan]   = useState({ x: 0, y: 0 });

  // Drag state stored in a ref so we don't re-render during drag
  const isDragging = useRef(false);
  const dragOrigin = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });

  const cw = canvasContentWidth(workflow.nodes);

  // ── Fit to viewport ──────────────────────────────────────────────────────
  const fitToViewport = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const padding = 72;
    const newZoom = Math.min(
      (width  - padding * 2) / cw,
      (height - padding * 2) / CANVAS_H,
      1.0,
    );
    setPan({
      x: (width  - cw       * newZoom) / 2,
      y: (height - CANVAS_H * newZoom) / 2,
    });
    setZoom(newZoom);
  }, [cw]);

  // Fit whenever the workflow changes
  useEffect(() => { fitToViewport(); }, [fitToViewport, workflow.id]);

  // ── Wheel zoom towards cursor ─────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;

      const rect = (containerRef.current as HTMLDivElement).getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setZoom((prev) => {
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
        const ratio = next / prev;
        setPan((p) => ({
          x: mouseX - ratio * (mouseX - p.x),
          y: mouseY - ratio * (mouseY - p.y),
        }));
        return next;
      });
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Drag-to-pan ───────────────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    if ((e.target as HTMLElement).closest("button")) return;
    isDragging.current = true;
    dragOrigin.current = { mouseX: e.clientX, mouseY: e.clientY, panX: pan.x, panY: pan.y };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    const { mouseX, mouseY, panX, panY } = dragOrigin.current;
    setPan({ x: panX + e.clientX - mouseX, y: panY + e.clientY - mouseY });
  }

  function onMouseUp() { isDragging.current = false; }

  // ── Zoom button helpers ────────────────────────────────────────────────────
  function zoomIn()  { setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2))); }
  function zoomOut() { setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2))); }

  const getStatus = (id: string): NodeStatus => statuses[id] ?? "idle";

  // ── Dot pattern shifts with pan and scales with zoom ───────────────────────
  const dotSize    = DOT_GRID * zoom;
  const dotOffsetX = ((pan.x % dotSize) + dotSize) % dotSize;
  const dotOffsetY = ((pan.y % dotSize) + dotSize) % dotSize;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        cursor: isDragging.current ? "grabbing" : "grab",
        // Dotted grid — moves with pan, scales with zoom
        backgroundImage:
          "radial-gradient(circle, oklch(0.5 0 0 / 0.18) 1.2px, transparent 1.2px)",
        backgroundSize:     `${dotSize}px ${dotSize}px`,
        backgroundPosition: `${dotOffsetX}px ${dotOffsetY}px`,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* ── Transform layer ──────────────────────────────────────────── */}
      <div
        style={{
          position:        "absolute",
          transformOrigin: "0 0",
          transform:       `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width:            cw,
          height:           CANVAS_H,
          willChange:       "transform",
        }}
      >
        {/* SVG edges */}
        <svg
          style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
          width={cw}
          height={CANVAS_H}
        >
          {workflow.edges.map((edge) => {
            const fromNode = workflow.nodes.find((n) => n.id === edge.from);
            const toNode   = workflow.nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            return (
              <Edge
                key={edge.id}
                from={fromNode}
                to={toNode}
                fromStatus={getStatus(fromNode.id)}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {workflow.nodes.map((node) => (
          <div key={node.id} data-node="true">
            <WorkflowNode
              node={node}
              status={getStatus(node.id)}
              isSelected={selectedNodeId === node.id}
              onClick={onNodeClick}
              onRun={node.type === "trigger" && !isRunning ? onRun : undefined}
              width={NODE_W}
              height={NODE_H}
            />
          </div>
        ))}
      </div>

      {/* ── Controls overlay ─────────────────────────────────────────── */}
      <div className="absolute bottom-4 right-4 flex items-center gap-0.5 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-1 shadow-lg">
        <button
          onClick={zoomIn}
          title="Zoom in"
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ZoomIn size={13} />
        </button>

        <span className="text-[10px] font-mono text-muted-foreground w-10 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={zoomOut}
          title="Zoom out"
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <ZoomOut size={13} />
        </button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <button
          onClick={fitToViewport}
          title="Fit to viewport"
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Maximize2 size={13} />
        </button>
      </div>

      {/* ── Keyboard hint ─────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 text-[10px] text-muted-foreground/40 pointer-events-none">
        scroll to zoom · drag to pan
      </div>
    </div>
  );
}
