"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, Plus } from "lucide-react";
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
  isDataFlow?: boolean;
};

function Edge({ from, to, fromStatus, isDataFlow }: EdgeProps) {
  const x1 = from.position.x + NODE_W;
  const y1 = from.position.y + NODE_H / 2;
  const x2 = to.position.x;
  const y2 = to.position.y + NODE_H / 2;
  const dx = Math.abs(x2 - x1) * 0.45;

  const active  = fromStatus === "done" || fromStatus === "approved";
  const running = fromStatus === "running";
  const waiting = fromStatus === "awaiting-approval";
  const error   = fromStatus === "error" || fromStatus === "rejected";

  // Data-flow edges between skill nodes get a teal hint when active/idle
  const stroke = isDataFlow && (active || (!error && !running && !waiting))
    ? active
      ? "oklch(0.72 0.19 195)"    // teal active
      : "oklch(0.72 0.19 195 / 45%)" // teal muted
    : active
    ? "oklch(0.72 0.17 162)"    // emerald
    : error
    ? "oklch(0.7 0.22 27)"      // red
    : running || waiting
    ? "oklch(0.72 0.2 290)"     // violet
    : "oklch(1 0 0 / 14%)";     // muted

  const opacity     = active || running || waiting || isDataFlow ? 1 : 0.45;
  const strokeWidth = active ? 2 : 1.5;
  const markerId    = `arr-${from.id}-${to.id}`;

  // Data-flow arrows use a dashed pattern when idle/muted, solid when active
  const dashArray =
    running || waiting
      ? "7 4"
      : isDataFlow && !active
      ? "5 3"
      : undefined;

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
        strokeDasharray={dashArray}
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
  onAddStep?: () => void;
  stepTimings?: Record<string, { startedAt?: number; completedAt?: number }>;
};

export function WorkflowCanvas({
  workflow, statuses, selectedNodeId, onNodeClick, onRun, isRunning, onAddStep, stepTimings = {},
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan]   = useState({ x: 0, y: 0 });

  // Drag state stored in a ref so we don't re-render during drag
  const isDragging = useRef(false);
  const dragOrigin = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });

  // Touch state
  const lastTouchRef     = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDistRef = useRef<number | null>(null);

  // Detect touch/coarse pointer device for hint text
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

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

  // ── Touch pan & pinch zoom ────────────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1 && lastTouchRef.current) {
      const dx = e.touches[0].clientX - lastTouchRef.current.x;
      const dy = e.touches[0].clientY - lastTouchRef.current.y;
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (lastPinchDistRef.current !== null) {
        const delta = (dist - lastPinchDistRef.current) / 100;
        setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, +(z + delta).toFixed(4))));
      }
      lastPinchDistRef.current = dist;
    }
  }

  function handleTouchEnd() {
    lastTouchRef.current     = null;
    lastPinchDistRef.current = null;
  }

  // ── Zoom button helpers ────────────────────────────────────────────────────
  function zoomIn()  { setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2))); }
  function zoomOut() { setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2))); }

  const getStatus = (id: string): NodeStatus => statuses[id] ?? "idle";

  // Data-flow: edge is between two skill/output nodes (not trigger→skill or skill→hitl)
  const dataFlowNodeTypes = new Set(["skill", "output"]);
  function isDataFlowEdge(fromId: string, toId: string): boolean {
    const fromNode = workflow.nodes.find((n) => n.id === fromId);
    const toNode   = workflow.nodes.find((n) => n.id === toId);
    return !!fromNode && !!toNode &&
      dataFlowNodeTypes.has(fromNode.type) &&
      dataFlowNodeTypes.has(toNode.type);
  }

  // Last node in the workflow (for "Add Step" button)
  const lastNode = workflow.nodes.length > 0
    ? workflow.nodes.reduce((a, b) => (a.position.x > b.position.x ? a : b))
    : null;

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
        touchAction: "none",
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
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
                isDataFlow={isDataFlowEdge(edge.from, edge.to)}
              />
            );
          })}
        </svg>

        {/* Empty state */}
        {workflow.nodes.length === 0 && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
            className="flex flex-col items-center gap-2 text-center pointer-events-none"
          >
            <div className="w-8 h-8 rounded-md border border-dashed border-border/60 flex items-center justify-center">
              <Plus size={14} className="text-muted-foreground/30" />
            </div>
            <p className="text-[10px] font-mono text-muted-foreground/40 max-w-[180px] leading-relaxed">
              no steps — add a trigger to begin
            </p>
          </div>
        )}

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
              startedAt={stepTimings[node.id]?.startedAt}
              completedAt={stepTimings[node.id]?.completedAt}
            />
          </div>
        ))}

        {/* Add Step button — appears after the last node */}
        {lastNode && (
          <button
            data-node="true"
            onClick={() => {
              if (onAddStep) {
                onAddStep();
              }
            }}
            style={{
              position: "absolute",
              left: lastNode.position.x + NODE_W + 20,
              top: lastNode.position.y + NODE_H / 2 - 14,
            }}
            title="Add step"
            className="h-7 px-3 text-[11px] font-medium rounded-md border border-border/60 hover:bg-muted/60 inline-flex items-center gap-1.5 transition-colors text-muted-foreground hover:text-foreground"
          >
            <Plus size={11} />
            step
          </button>
        )}
      </div>

      {/* ── Controls overlay ─────────────────────────────────────────── */}
      <div className="absolute bottom-4 right-4 flex items-center gap-0.5 bg-card/80 backdrop-blur-sm border border-border/60 rounded-md p-0.5">
        <button
          onClick={zoomIn}
          title="Zoom in"
          className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <ZoomIn size={12} />
        </button>

        <span className="text-[10px] font-mono text-muted-foreground/60 w-9 text-center tabular-nums">
          {Math.round(zoom * 100)}%
        </span>

        <button
          onClick={zoomOut}
          title="Zoom out"
          className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <ZoomOut size={12} />
        </button>

        <div className="w-px h-3.5 bg-border/60 mx-0.5" />

        <button
          onClick={fitToViewport}
          title="Fit to viewport"
          className="p-1.5 rounded hover:bg-muted/60 text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <Maximize2 size={12} />
        </button>
      </div>

      {/* ── Keyboard hint ─────────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 text-[10px] font-mono text-muted-foreground/30 pointer-events-none">
        {isTouch ? "pinch to zoom · drag to pan" : "scroll to zoom · drag to pan"}
      </div>
    </div>
  );
}
