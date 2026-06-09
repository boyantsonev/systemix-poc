"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  systemNodes,
  systemLinks,
  SIZE_VAL,
  TYPE_COLOR_DARK,
  TYPE_COLOR_LIGHT,
  TYPE_LABEL,
  type NodeType,
} from "@/lib/data/system-graph";
import { NodeInfoPanel } from "./NodeInfoPanel";

// react-force-graph-3d has no usable React types for arbitrary props/ref; the lib
// is loaded client-side only (it touches `window`/three at import), so it is kept
// behind a dynamic import and typed loosely at this single seam.
/* eslint-disable @typescript-eslint/no-explicit-any */
type ForceGraphHandle = {
  zoomToFit: (ms?: number, px?: number) => void;
  cameraPosition: (pos: { x: number; y: number; z: number }, lookAt?: unknown, ms?: number) => void;
};

const ALL_TYPES: NodeType[] = ["source", "skill", "agent", "artifact", "infra", "concept", "tool"];

function hexAlpha(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const linkEnd = (v: any): string => (typeof v === "object" ? v.id : v);

export function SystemGraph3D({
  dimNodeIds,
  className,
}: {
  dimNodeIds?: Set<string>;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const palette = isDark ? TYPE_COLOR_DARK : TYPE_COLOR_LIGHT;

  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphHandle | null>(null);
  const fittedRef = useRef(false);
  const [FG, setFG] = useState<any>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(() => new Set(ALL_TYPES));

  // Load the graph lib on the client only, then keep a ref for imperative camera moves.
  useEffect(() => {
    let mounted = true;
    import("react-force-graph-3d").then((m) => {
      if (mounted) setFG(() => m.default);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Size the canvas to its container (the lib needs explicit width/height in a flex panel).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rebuilds (and re-lays-out) only when the type filter changes.
  const graphData = useMemo(
    () => {
      const visible = new Set(systemNodes.filter((n) => activeTypes.has(n.type)).map((n) => n.id));
      return {
        nodes: systemNodes.filter((n) => visible.has(n.id)).map((n) => ({ ...n, val: SIZE_VAL[n.size] })),
        links: systemLinks.filter((l) => visible.has(l.source) && visible.has(l.target)).map((l) => ({ ...l })),
      };
    },
    [activeTypes],
  );

  const neighborIds = useMemo(() => {
    if (!selectedId) return new Set<string>();
    const s = new Set<string>();
    systemLinks.forEach((l) => {
      if (l.source === selectedId) s.add(l.target);
      if (l.target === selectedId) s.add(l.source);
    });
    return s;
  }, [selectedId]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return systemNodes
      .filter((n) => n.label.toLowerCase().includes(q) || n.type.toLowerCase().includes(q) || (n.sub?.toLowerCase().includes(q) ?? false))
      .slice(0, 6);
  }, [query]);

  // Visual accessors are plain closures (recreated each render) so selection / theme /
  // dim changes recolor without re-heating the force simulation.
  const dimGray = isDark ? "#64748b" : "#9ba3c0";

  const nodeColor = (node: any): string => {
    const pal = palette[node.type as NodeType];
    if (dimNodeIds?.has(node.id)) return hexAlpha(pal.stroke, 0.1);
    if (selectedId) {
      if (node.id === selectedId) return pal.stroke;
      if (neighborIds.has(node.id)) return hexAlpha(pal.stroke, 0.85);
      return hexAlpha(dimGray, 0.22);
    }
    return pal.stroke;
  };

  const linkColor = (link: any): string => {
    const s = linkEnd(link.source);
    const t = linkEnd(link.target);
    const srcType = (systemNodes.find((n) => n.id === s)?.type ?? "concept") as NodeType;
    const pal = palette[srcType];
    const faded = (dimNodeIds && (dimNodeIds.has(s) || dimNodeIds.has(t))) || (selectedId !== null && s !== selectedId && t !== selectedId);
    return hexAlpha(pal.stroke, faded ? 0.05 : 0.4);
  };

  const linkWidth = (link: any): number => {
    if (!selectedId) return 0.5;
    const s = linkEnd(link.source);
    const t = linkEnd(link.target);
    return s === selectedId || t === selectedId ? 1.8 : 0.2;
  };

  const particleColor = (link: any): string => {
    const srcType = (systemNodes.find((n) => n.id === linkEnd(link.source))?.type ?? "concept") as NodeType;
    return palette[srcType].stroke;
  };

  const flyTo = (node: any) => {
    if (node?.x == null || !fgRef.current) return;
    const dist = 120;
    const hyp = Math.hypot(node.x, node.y, node.z ?? 0) || 1;
    const ratio = 1 + dist / hyp;
    fgRef.current.cameraPosition({ x: node.x * ratio, y: node.y * ratio, z: (node.z ?? 0) * ratio }, node, 800);
  };

  const selectNode = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
    const node = graphData.nodes.find((n) => n.id === id);
    if (node) flyTo(node);
  };

  const toggleType = (t: NodeType) =>
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const bg = isDark ? "#080812" : "#f8fafc";
  const ready = FG && size;

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className ?? ""}`} style={{ background: bg }}>
      {ready && (
        <FG
          ref={fgRef}
          graphData={graphData}
          width={size.w}
          height={size.h}
          backgroundColor={bg}
          showNavInfo={false}
          controlType="orbit"
          nodeId="id"
          nodeVal={(n: any) => n.val}
          nodeRelSize={4.5}
          nodeResolution={16}
          nodeOpacity={0.92}
          nodeColor={nodeColor}
          nodeLabel={(n: any) =>
            `<div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;background:${
              isDark ? "rgba(8,8,22,0.95)" : "rgba(255,255,255,0.96)"
            };border:1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(200,205,225,0.8)"};padding:4px 8px;border-radius:5px;color:${
              isDark ? "#e2e8f0" : "#1a1c28"
            };pointer-events:none;">${n.label}${n.sub ? `<span style="opacity:0.5"> · ${n.sub}</span>` : ""}</div>`
          }
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkOpacity={0.55}
          linkDirectionalParticles={2}
          linkDirectionalParticleWidth={1.4}
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleColor={particleColor}
          onNodeClick={(n: any) => selectNode(n.id)}
          onBackgroundClick={() => setSelectedId(null)}
          onEngineStop={() => {
            if (!fittedRef.current) {
              fittedRef.current = true;
              fgRef.current?.zoomToFit(600, 60);
            }
          }}
        />
      )}

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-mono text-muted-foreground/40">loading topology…</span>
        </div>
      )}

      {/* Search */}
      <div className="absolute top-4 left-4 z-10 w-56">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search nodes…"
          className="w-full px-3 py-1.5 rounded-lg text-[11px] font-mono bg-background/85 backdrop-blur-sm border border-border/50 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-border"
        />
        {searchResults.length > 0 && (
          <div className="mt-1 rounded-lg border border-border/50 bg-background/95 backdrop-blur-sm overflow-hidden">
            {searchResults.map((n) => {
              const pal = palette[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    setSelectedId(n.id);
                    setQuery("");
                    const node = graphData.nodes.find((g) => g.id === n.id);
                    if (node) flyTo(node);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: pal.stroke }} />
                  <span className="text-[11px] font-mono text-foreground/80 truncate">{n.label}</span>
                  <span className="text-[9px] font-mono text-muted-foreground/40 ml-auto shrink-0">{n.type}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Node detail */}
      {selectedId && (
        <div className="absolute top-4 right-4 z-10">
          <NodeInfoPanel nodeId={selectedId} onClose={() => setSelectedId(null)} />
        </div>
      )}

      {/* Legend / type filter */}
      <div className="absolute bottom-5 left-5 z-10">
        <Legend isDark={isDark} activeTypes={activeTypes} onToggle={toggleType} />
      </div>

      {/* Controls + hint */}
      <div className="absolute bottom-5 right-5 z-10 flex flex-col items-end gap-2">
        <button
          onClick={() => fgRef.current?.zoomToFit(500, 60)}
          className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono bg-background/85 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          zoom to fit
        </button>
        <p className={`text-[10px] font-mono ${isDark ? "text-white/15" : "text-muted-foreground/30"}`}>
          drag to orbit · scroll to zoom · click a node
        </p>
      </div>
    </div>
  );
}

function Legend({
  isDark,
  activeTypes,
  onToggle,
}: {
  isDark: boolean;
  activeTypes: Set<NodeType>;
  onToggle: (t: NodeType) => void;
}) {
  const palette = isDark ? TYPE_COLOR_DARK : TYPE_COLOR_LIGHT;
  return (
    <div
      className={`flex flex-col gap-1 p-3 rounded-xl border backdrop-blur-sm ${
        isDark ? "border-white/5 bg-black/40" : "border-border/50 bg-background/90 shadow-sm"
      }`}
    >
      {ALL_TYPES.map((type) => {
        const on = activeTypes.has(type);
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            className="flex items-center gap-2 text-left transition-opacity"
            style={{ opacity: on ? 1 : 0.35 }}
          >
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: palette[type].stroke }} />
            <span className={`text-[10px] font-mono ${isDark ? "text-white/45" : "text-muted-foreground"}`}>
              {TYPE_LABEL[type]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
