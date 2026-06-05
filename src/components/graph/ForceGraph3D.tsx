"use client";

// ForceGraph3D — the 3D architecture graph for /graph.
// Visual + interaction ported from the forced-graph prototype
// (/Users/boyan/Downloads/forced-graph-prototype). Data is the REAL Systemix
// system from src/lib/data/graph-data.ts (not the prototype's sample data).

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  GRAPH_NODES,
  GRAPH_LINKS,
  type GraphNode,
  type NodeType,
} from "@/lib/data/graph-data";
import {
  TweaksPanel,
  TweakSection,
  TweakSlider,
  TweakToggle,
  TweakRadio,
  useTweaks,
} from "./TweaksPanel";

// ── Palette (matches the repo's TYPE_COLOR light set) ───────────────────────────
const PALETTE: Record<NodeType, { hex: string; light: string; text: string; name: string }> = {
  source:   { hex: "#7c3aed", light: "#ede9fe", text: "#5b21b6", name: "Data source" },
  skill:    { hex: "#059669", light: "#d1fae5", text: "#065f46", name: "Skill" },
  agent:    { hex: "#d97706", light: "#fef3c7", text: "#92400e", name: "Agent / runtime" },
  artifact: { hex: "#2563eb", light: "#dbeafe", text: "#1e40af", name: "Artifact" },
  infra:    { hex: "#e11d48", light: "#ffe4e6", text: "#9f1239", name: "Infrastructure" },
  concept:  { hex: "#64748b", light: "#f1f5f9", text: "#334155", name: "Concept / UI" },
  tool:     { hex: "#0891b2", light: "#cffafe", text: "#0e7490", name: "AI tool" },
};
const NODE_TYPES = Object.keys(PALETTE) as NodeType[];

function hexAlpha(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ── 3d-force-graph instance typing (only the methods we use) ────────────────────
type NodeObj = GraphNode & { x?: number; y?: number; z?: number };
type LinkObj = { source: string | NodeObj; target: string | NodeObj };
interface FG {
  (el: HTMLElement): FG;
  backgroundColor(c: string): FG;
  showNavInfo(b: boolean): FG;
  nodeRelSize(n: number): FG;
  nodeResolution(n: number): FG;
  nodeOpacity(n: number): FG;
  nodeVal(fn: (n: NodeObj) => number): FG;
  nodeColor(fn: (n: NodeObj) => string): FG;
  nodeLabel(fn: (n: NodeObj) => string): FG;
  linkColor(fn: (l: LinkObj) => string): FG;
  linkWidth(fn: (l: LinkObj) => number): FG;
  linkOpacity(n: number): FG;
  linkDirectionalParticles(n: number): FG;
  linkDirectionalParticleWidth(n: number): FG;
  linkDirectionalParticleColor(fn: (l: LinkObj) => string): FG;
  linkDirectionalParticleSpeed(n: number): FG;
  onNodeHover(fn: (n: NodeObj | null) => void): FG;
  onNodeClick(fn: (n: NodeObj) => void): FG;
  d3AlphaDecay(n: number): FG;
  d3VelocityDecay(n: number): FG;
  warmupTicks(n: number): FG;
  cooldownTime(n: number): FG;
  graphData(d: { nodes: NodeObj[]; links: LinkObj[] }): FG;
  cameraPosition(pos: { x: number; y: number; z: number }, lookAt?: NodeObj, ms?: number): FG;
  zoomToFit(ms?: number, px?: number): FG;
  width(n: number): FG;
  height(n: number): FG;
  _destructor?(): void;
}

const linkId = (l: LinkObj, side: "source" | "target") => {
  const v = l[side];
  return typeof v === "object" ? v.id : v;
};

// ─────────────────────────────────────────────────────────────────────────────
export function ForceGraph3D() {
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<NodeObj | null>(null);
  const [hoveredNode, setHoveredNode] = useState<NodeObj | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [query, setQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<NodeType>>(new Set(NODE_TYPES));
  const [tweaksOpen, setTweaksOpen] = useState(true);
  const [tweaks, setTweak] = useTweaks();

  const mountRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<FG | null>(null);
  const selectedRef = useRef<NodeObj | null>(null);
  selectedRef.current = selectedNode;

  // Stable node objects (the force sim mutates these with x/y/z — keep refs alive)
  const allNodes = useRef<NodeObj[]>(GRAPH_NODES.map((n) => ({ ...n }))).current;
  const allLinks = GRAPH_LINKS;

  const BG = { warm: "#f5f4f1", cool: "#f2f3f8", white: "#f9fafb" } as const;

  const graphData = useMemo(() => {
    const visible = new Set(allNodes.filter((n) => activeTypes.has(n.type)).map((n) => n.id));
    return {
      nodes: allNodes.filter((n) => visible.has(n.id)),
      links: allLinks
        .filter((l) => visible.has(l.source) && visible.has(l.target))
        .map((l) => ({ source: l.source, target: l.target })) as LinkObj[],
    };
  }, [activeTypes, allNodes, allLinks]);

  const neighborNodes = useMemo(() => {
    if (!selectedNode) return [] as NodeObj[];
    const ids = new Set<string>();
    allLinks.forEach((l) => {
      if (l.source === selectedNode.id) ids.add(l.target);
      if (l.target === selectedNode.id) ids.add(l.source);
    });
    return allNodes.filter((n) => ids.has(n.id));
  }, [selectedNode, allNodes, allLinks]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [] as NodeObj[];
    return allNodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        (n.sub && n.sub.toLowerCase().includes(q)) ||
        (n.cmd && n.cmd.toLowerCase().includes(q)),
    );
  }, [query, allNodes]);

  // ── init (once) ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || graphRef.current) return;
    let cancelled = false;
    let cleanupFns: (() => void)[] = [];

    (async () => {
      const ForceGraph3DFactory = (await import("3d-force-graph")).default as unknown as () => FG;
      if (cancelled || !mountRef.current) return;

      const Graph = ForceGraph3DFactory()(mountRef.current)
        .backgroundColor(BG[tweaks.bgTone])
        .showNavInfo(false)
        .nodeRelSize(4.5)
        .nodeResolution(tweaks.nodeResolution)
        .nodeOpacity(0.92)
        .nodeVal((n) => n.val * tweaks.nodeSizeScale)
        .nodeColor((n) => {
          const sel = selectedRef.current;
          const pal = PALETTE[n.type];
          if (!sel) return pal.hex;
          if (n.id === sel.id) return pal.hex;
          const isNeighbor = allLinks.some(
            (l) =>
              (l.source === sel.id && l.target === n.id) ||
              (l.target === sel.id && l.source === n.id),
          );
          return isNeighbor ? hexAlpha(pal.hex, 0.9) : hexAlpha("#9ba3c0", 0.3);
        })
        .nodeLabel(
          (n) =>
            `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;background:rgba(255,255,255,0.95);border:1px solid rgba(200,205,225,0.8);padding:4px 8px;border-radius:5px;color:#1a1c28;pointer-events:none;">${n.label}</div>`,
        )
        .linkColor((l) => {
          const src = allNodes.find((n) => n.id === linkId(l, "source"));
          return hexAlpha(PALETTE[src?.type ?? "concept"].hex, 0.55);
        })
        .linkWidth((l) => {
          const sel = selectedRef.current;
          if (!sel) return 0.7;
          return linkId(l, "source") === sel.id || linkId(l, "target") === sel.id ? 2.0 : 0.3;
        })
        .linkOpacity(tweaks.edgeOpacity)
        .linkDirectionalParticles(tweaks.showParticles ? 2 : 0)
        .linkDirectionalParticleWidth(1.5)
        .linkDirectionalParticleColor((l) => {
          const src = allNodes.find((n) => n.id === linkId(l, "source"));
          return PALETTE[src?.type ?? "concept"].hex;
        })
        .linkDirectionalParticleSpeed(tweaks.particleSpeed)
        .onNodeHover((n) => {
          setHoveredNode(n || null);
          if (mountRef.current) mountRef.current.style.cursor = n ? "pointer" : "default";
        })
        .onNodeClick((n) => focusNode(n))
        .d3AlphaDecay(0.015)
        .d3VelocityDecay(0.25)
        .warmupTicks(80)
        .cooldownTime(9000)
        .graphData(graphData);

      graphRef.current = Graph;

      const t1 = setTimeout(() => setLoading(false), 2600);
      const t2 = setTimeout(() => Graph.zoomToFit(600, 90), 3100);
      cleanupFns.push(() => {
        clearTimeout(t1);
        clearTimeout(t2);
      });
    })();

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => fn());
      graphRef.current?._destructor?.();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── apply selection highlight imperatively ───────────────────────────────────
  const applyHighlight = useCallback(
    (n: NodeObj | null) => {
      const Graph = graphRef.current;
      if (!Graph) return;
      if (!n) {
        Graph.nodeColor((node) => PALETTE[node.type].hex)
          .linkWidth(() => 0.7)
          .linkOpacity(tweaks.edgeOpacity);
        return;
      }
      Graph.nodeColor((node) => {
        const pal = PALETTE[node.type];
        if (node.id === n.id) return pal.hex;
        const isN = allLinks.some(
          (l) =>
            (l.source === n.id && l.target === node.id) ||
            (l.target === n.id && l.source === node.id),
        );
        return isN ? hexAlpha(pal.hex, 0.9) : hexAlpha("#9ba3c0", 0.25);
      })
        .linkWidth((l) =>
          linkId(l, "source") === n.id || linkId(l, "target") === n.id ? 2.0 : 0.25,
        )
        .linkOpacity(0.8);
    },
    [allLinks, tweaks.edgeOpacity],
  );

  const focusNode = useCallback(
    (n: NodeObj) => {
      const Graph = graphRef.current;
      const prev = selectedRef.current;
      if (prev?.id === n.id) {
        setSelectedNode(null);
        applyHighlight(null);
        return;
      }
      setSelectedNode(n);
      if (Graph) {
        const dist = 120;
        const mag = Math.hypot(n.x || 0, n.y || 0, n.z || 0);
        const k = 1 + dist / Math.max(mag, 1);
        Graph.cameraPosition(
          { x: (n.x || 0) * k, y: (n.y || 0) * k, z: (n.z || 0) * k },
          n,
          700,
        );
      }
      applyHighlight(n);
    },
    [applyHighlight],
  );

  // ── update data on filter change ─────────────────────────────────────────────
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.graphData(graphData);
    if (selectedNode && !graphData.nodes.find((n) => n.id === selectedNode.id)) {
      setSelectedNode(null);
      applyHighlight(null);
    }
  }, [graphData, selectedNode, applyHighlight]);

  // ── update tweakable props ───────────────────────────────────────────────────
  useEffect(() => {
    const Graph = graphRef.current;
    if (!Graph) return;
    Graph.backgroundColor(BG[tweaks.bgTone])
      .nodeResolution(tweaks.nodeResolution)
      .nodeVal((n) => n.val * tweaks.nodeSizeScale)
      .linkDirectionalParticles(tweaks.showParticles ? 2 : 0)
      .linkDirectionalParticleSpeed(tweaks.particleSpeed);
    if (!selectedRef.current) Graph.linkOpacity(tweaks.edgeOpacity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tweaks]);

  // ── mouse + resize ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", onMove, { passive: true });
    const onResize = () => {
      const el = mountRef.current;
      if (graphRef.current && el)
        graphRef.current.width(el.clientWidth).height(el.clientHeight);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // ── actions ──────────────────────────────────────────────────────────────────
  const jumpToNode = useCallback(
    (id: string) => {
      const n = allNodes.find((x) => x.id === id);
      if (!n) return;
      setQuery("");
      focusNode(n);
    },
    [allNodes, focusNode],
  );

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
    applyHighlight(null);
  }, [applyHighlight]);

  const zoomToFit = useCallback(() => graphRef.current?.zoomToFit(600, 90), []);

  const toggleType = useCallback((type: NodeType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next.size === 0 ? prev : next;
    });
  }, []);

  const soloType = useCallback((type: NodeType) => {
    setActiveTypes((prev) => {
      const allOn = NODE_TYPES.every((t) => prev.has(t));
      if (prev.size === 1 && prev.has(type)) return new Set(NODE_TYPES);
      if (allOn) return new Set<NodeType>([type]);
      return new Set<NodeType>([type]);
    });
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div ref={mountRef} className="absolute inset-0" />

      {/* dot-grid overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(140,145,165,0.18) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* loading */}
      {loading && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3" style={{ background: BG[tweaks.bgTone] }}>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: "rgba(100,105,130,0.4)", animation: `pulse 1.4s ${i * 0.2}s ease-in-out infinite` }} />
            ))}
          </div>
          <span className="font-mono text-[11px]" style={{ color: "rgba(80,85,110,0.6)" }}>Initializing graph…</span>
          <style>{`@keyframes pulse{0%,100%{opacity:.35}50%{opacity:.75}}`}</style>
        </div>
      )}

      {/* stats top-right */}
      <div className="pointer-events-none absolute right-5 top-3 z-20 flex items-center gap-4 font-mono">
        <Stat v={graphData.nodes.length} l="nodes" />
        <Stat v={graphData.links.length} l="edges" />
      </div>

      {/* left stack */}
      <div className="absolute left-4 top-3 z-20 flex max-h-[calc(100%-24px)] flex-col gap-2.5">
        <SearchPanel query={query} onChange={setQuery} results={searchResults} onSelect={jumpToNode} />
        <LegendPanel activeTypes={activeTypes} onToggle={toggleType} onSolo={soloType} />
        <div className="mt-auto flex flex-col gap-1.5">
          <GlassBtn onClick={zoomToFit}>⊙ zoom to fit</GlassBtn>
          {selectedNode && <GlassBtn onClick={clearSelection}>✕ clear selection</GlassBtn>}
        </div>
      </div>

      {/* node info right */}
      {selectedNode && (
        <div className="absolute right-4 top-12 z-20">
          <NodeInfoPanel node={selectedNode} neighbors={neighborNodes} onClose={clearSelection} onJump={jumpToNode} />
        </div>
      )}

      {/* hover tooltip */}
      {hoveredNode && !selectedNode && <HoverTooltip node={hoveredNode} x={mousePos.x} y={mousePos.y} />}

      {/* controls hint */}
      {!loading && (
        <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2">
          <ControlsHint />
        </div>
      )}

      {/* tweaks */}
      <TweaksPanel open={tweaksOpen} onOpen={() => setTweaksOpen(true)} onClose={() => setTweaksOpen(false)}>
        <TweakSection label="Canvas" />
        <TweakRadio
          label="Background"
          value={tweaks.bgTone}
          options={[
            { value: "warm", label: "Warm" },
            { value: "cool", label: "Cool" },
            { value: "white", label: "White" },
          ]}
          onChange={(v) => setTweak("bgTone", v)}
        />
        <TweakSection label="Graph" />
        <TweakSlider label="Edge opacity" value={tweaks.edgeOpacity} min={0.02} max={0.55} step={0.01} onChange={(v) => setTweak("edgeOpacity", v)} />
        <TweakSlider label="Node size" value={tweaks.nodeSizeScale} min={0.4} max={2.5} step={0.1} onChange={(v) => setTweak("nodeSizeScale", v)} />
        <TweakSlider label="Node quality" value={tweaks.nodeResolution} min={6} max={24} step={2} onChange={(v) => setTweak("nodeResolution", v)} />
        <TweakSection label="Animation" />
        <TweakToggle label="Flow particles" value={tweaks.showParticles} onChange={(v) => setTweak("showParticles", v)} />
        <TweakSlider label="Particle speed" value={tweaks.particleSpeed} min={0.001} max={0.02} step={0.001} onChange={(v) => setTweak("particleSpeed", v)} />
      </TweaksPanel>
    </div>
  );
}

// ── sub-components ──────────────────────────────────────────────────────────────

function Stat({ v, l }: { v: number; l: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-[13px] font-bold" style={{ color: "#1a1c28" }}>{v}</span>
      <span className="text-[9px] uppercase tracking-wide" style={{ color: "rgba(80,88,120,0.6)" }}>{l}</span>
    </div>
  );
}

function GlassBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="whitespace-nowrap rounded-md border px-3 py-1 text-left font-mono text-[11px] transition-colors"
      style={{
        borderColor: "rgba(200,205,220,0.8)",
        background: "rgba(255,255,255,0.6)",
        color: "rgba(50,52,70,0.8)",
        backdropFilter: "blur(12px)",
      }}
    >
      {children}
    </button>
  );
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.78)",
  backdropFilter: "blur(20px) saturate(1.5)",
  border: "1px solid rgba(210,215,230,0.65)",
  borderRadius: 12,
  boxShadow: "0 2px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
};

function SearchPanel({
  query, onChange, results, onSelect,
}: {
  query: string; onChange: (v: string) => void; results: NodeObj[]; onSelect: (id: string) => void;
}) {
  const hasResults = results.length > 0 && query.trim();
  return (
    <div style={{ ...cardStyle, width: 240, overflow: "hidden" }}>
      <div style={{ padding: "10px 12px", position: "relative" }}>
        <svg width={13} height={13} viewBox="0 0 20 20" fill="none" style={{ position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
          <circle cx="8.5" cy="8.5" r="5.5" stroke="rgba(100,105,135,0.5)" strokeWidth="1.5" />
          <path d="M13 13L17 17" stroke="rgba(100,105,135,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Search nodes…"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%", padding: "7px 10px 7px 30px", border: "1px solid rgba(200,205,220,0.7)",
            borderRadius: 8, background: "rgba(255,255,255,0.6)", fontFamily: "'JetBrains Mono',monospace",
            fontSize: 12, color: "#1a1a2e", outline: "none",
          }}
        />
      </div>
      {hasResults && (
        <div style={{ borderTop: "1px solid rgba(210,215,230,0.5)", maxHeight: 220, overflowY: "auto" }}>
          {results.slice(0, 8).map((n) => (
            <button
              key={n.id}
              onClick={() => onSelect(n.id)}
              style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 14px", width: "100%", border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.03)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: PALETTE[n.type].hex, flexShrink: 0 }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "#1a1c28", flex: 1 }}>{n.label}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(100,105,135,0.55)", textTransform: "uppercase" }}>{n.type.slice(0, 4)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ display: "block" }}>
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" opacity="0.35" />
      <line x1="2.5" y1="2.5" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function LegendPanel({
  activeTypes, onToggle, onSolo,
}: {
  activeTypes: Set<NodeType>; onToggle: (t: NodeType) => void; onSolo: (t: NodeType) => void;
}) {
  const [hovered, setHovered] = useState<NodeType | null>(null);
  const allOn = NODE_TYPES.every((t) => activeTypes.has(t));
  return (
    <div style={{ ...cardStyle, padding: "12px 13px", minWidth: 196 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: "rgba(80,88,120,0.5)" }}>Node types</p>
        {!allOn && (
          <button
            onClick={() => NODE_TYPES.forEach((t) => { if (!activeTypes.has(t)) onToggle(t); })}
            style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(80,100,210,0.65)", background: "none", border: "none", cursor: "pointer" }}
          >
            show all
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {NODE_TYPES.map((type) => {
          const pal = PALETTE[type];
          const on = activeTypes.has(type);
          const isHovered = hovered === type;
          return (
            <div key={type} style={{ position: "relative" }} onMouseEnter={() => setHovered(type)} onMouseLeave={() => setHovered(null)}>
              <button
                onClick={() => onSolo(type)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "4px 7px", paddingRight: 28,
                  borderRadius: 7, border: "none",
                  background: (isHovered && on) || (on && !allOn) ? pal.light : "transparent",
                  cursor: "pointer", textAlign: "left", opacity: on ? 1 : 0.28, transition: "all 130ms ease",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? pal.hex : "rgba(140,145,170,0.35)", flexShrink: 0, boxShadow: on ? `0 0 5px ${hexAlpha(pal.hex, 0.4)}` : "none" }} />
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: on ? pal.text : "rgba(100,105,130,0.45)", fontWeight: on ? 500 : 400, textDecoration: on ? "none" : "line-through", flex: 1 }}>{pal.name}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(type); }}
                title={on ? "Hide" : "Show"}
                style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, color: on ? "rgba(90,98,130,0.4)" : "rgba(120,125,160,0.35)", opacity: isHovered ? 1 : 0, display: "flex", alignItems: "center" }}
              >
                <EyeIcon visible={on} />
              </button>
            </div>
          );
        })}
      </div>
      <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(110,115,150,0.35)", marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(210,215,230,0.5)" }}>row = solo · eye = toggle</p>
    </div>
  );
}

function NodeInfoPanel({
  node, neighbors, onClose, onJump,
}: {
  node: NodeObj; neighbors: NodeObj[]; onClose: () => void; onJump: (id: string) => void;
}) {
  const pal = PALETTE[node.type];
  return (
    <div style={{ ...cardStyle, width: 272, overflow: "hidden" }}>
      <div style={{ height: 3, background: pal.hex, opacity: 0.65 }} />
      <div style={{ padding: "14px 15px 13px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 11 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: pal.hex, flexShrink: 0, boxShadow: `0 0 7px ${hexAlpha(pal.hex, 0.5)}` }} />
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: pal.text, fontWeight: 600 }}>{pal.name}</span>
            </div>
            <p style={{ fontFamily: "var(--font-sans),sans-serif", fontSize: 15, fontWeight: 800, color: "#13141e", lineHeight: 1.2 }}>{node.label}</p>
            {node.sub && <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(80,88,120,0.55)", marginTop: 3 }}>{node.sub}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(90,95,125,0.4)", fontSize: 15, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, lineHeight: 1.7, color: "rgba(55,60,90,0.65)", marginBottom: node.cmd || node.docHrefs ? 12 : 0 }}>{node.desc}</p>

        {node.cmd && (
          <div style={{ padding: "7px 10px", borderRadius: 8, background: pal.light, border: `1px solid ${hexAlpha(pal.hex, 0.15)}`, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 700, color: pal.text }}>{node.cmd}</code>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: pal.text, opacity: 0.55, textTransform: "uppercase", letterSpacing: "0.08em" }}>skill</span>
          </div>
        )}

        {node.docHrefs && node.docHrefs.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: neighbors.length ? 12 : 0 }}>
            {node.docHrefs.map((d) => (
              <a key={d.href} href={d.href} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(80,100,210,0.7)", textDecoration: "none" }}>{d.label}</a>
            ))}
          </div>
        )}

        {neighbors.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(80,88,120,0.5)", marginBottom: 7 }}>Connected · {neighbors.length}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {neighbors.map((n) => (
                <button key={n.id} onClick={() => onJump(n.id)} style={{ padding: "3px 9px", borderRadius: 20, border: `1px solid ${hexAlpha(PALETTE[n.type].hex, 0.18)}`, background: PALETTE[n.type].light, fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: PALETTE[n.type].text, cursor: "pointer" }}>{n.label}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HoverTooltip({ node, x, y }: { node: NodeObj; x: number; y: number }) {
  const pal = PALETTE[node.type];
  return (
    <div style={{ position: "fixed", left: x + 14, top: y - 14, zIndex: 80, pointerEvents: "none", padding: "5px 10px", background: "rgba(255,255,255,0.93)", backdropFilter: "blur(10px)", border: "1px solid rgba(205,210,230,0.8)", borderRadius: 7, boxShadow: "0 2px 10px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: pal.hex, flexShrink: 0 }} />
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 600, color: "#1a1c28" }}>{node.label}</span>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: "rgba(90,98,135,0.55)" }}>{pal.name}</span>
    </div>
  );
}

function ControlsHint() {
  const items: [string, string][] = [["Left drag", "orbit"], ["Right drag", "pan"], ["Scroll", "zoom"], ["Click", "select"]];
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {items.map(([key, action]) => (
        <span key={key} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "rgba(90,98,130,0.45)", display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ padding: "1px 5px", borderRadius: 3, background: "rgba(255,255,255,0.7)", border: "1px solid rgba(200,205,225,0.8)", fontSize: 9, color: "rgba(60,65,90,0.65)" }}>{key}</span>
          {action}
        </span>
      ))}
    </div>
  );
}
