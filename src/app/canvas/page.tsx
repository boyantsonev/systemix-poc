"use client";

import { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import Link from "next/link";
import { Play, ChevronLeft, Copy, Check, Terminal, Save } from "lucide-react";
import { SLogo } from "@/components/systemix/SLogo";
import { SkillNode, type SkillNodeData } from "@/components/canvas/SkillNode";
import { SkillLibrary, type LibrarySkill } from "@/components/canvas/SkillLibrary";
import { NodeInspector } from "@/components/canvas/NodeInspector";
import { HitlDrawer } from "@/components/canvas/HitlDrawer";
import { TemplateDropdown, WORKFLOW_TEMPLATES, WORKFLOW_TYPES, type WorkflowTemplate, type WorkflowType } from "@/components/canvas/TemplateDropdown";
import { cn } from "@/lib/utils";

// ── Node types ────────────────────────────────────────────────────────────────

const NODE_TYPES = { skill: SkillNode };

// ── Default pipeline: figma-to-code (5 steps) ─────────────────────────────────

const INITIAL_NODES: Node[] = [
  { id: "figma",     type: "skill", position: { x: 60,  y: 160 }, data: { command: "/figma",     name: "Extract from Figma", description: "Extract design context, tokens, and screenshot from any Figma URL.", mcp: "official", step: 1, status: "idle", hitl: false } satisfies SkillNodeData },
  { id: "tokens",    type: "skill", position: { x: 320, y: 80  }, data: { command: "/tokens",    name: "Sync Tokens",         description: "Diff Figma variables against your CSS token file.", mcp: "official", step: 2, status: "idle", hitl: true  } satisfies SkillNodeData },
  { id: "component", type: "skill", position: { x: 580, y: 160 }, data: { command: "/component", name: "Generate Component",  description: "Generate a production React component + Storybook story.", mcp: "official", step: 3, status: "idle", hitl: true  } satisfies SkillNodeData },
  { id: "storybook", type: "skill", position: { x: 840, y: 80  }, data: { command: "/storybook", name: "Verify Stories",      description: "Read, verify, and update Storybook stories vs Figma spec.", mcp: "none",     step: 4, status: "idle", hitl: false } satisfies SkillNodeData },
  { id: "deploy",    type: "skill", position: { x: 1100, y: 160 }, data: { command: "/deploy",    name: "Deploy Preview",      description: "Build and deploy to Vercel. Posts URL to Figma.", mcp: "none",     step: 5, status: "idle", hitl: false } satisfies SkillNodeData },
];

const INITIAL_EDGES: Edge[] = [
  { id: "e1-2", source: "figma",     target: "tokens",    animated: false, style: { stroke: "var(--color-teal, #14b8a6)", strokeWidth: 1.5, opacity: 0.5 } },
  { id: "e2-3", source: "tokens",    target: "component", animated: false, style: { stroke: "var(--color-teal, #14b8a6)", strokeWidth: 1.5, opacity: 0.5 } },
  { id: "e3-4", source: "component", target: "storybook", animated: false, style: { stroke: "var(--color-teal, #14b8a6)", strokeWidth: 1.5, opacity: 0.5 } },
  { id: "e4-5", source: "storybook", target: "deploy",    animated: false, style: { stroke: "var(--color-teal, #14b8a6)", strokeWidth: 1.5, opacity: 0.5 } },
];

// ── Install command generator ──────────────────────────────────────────────────

function useInstallCmd(nodes: Node[], pipelineName: string) {
  const [copied, setCopied] = useState(false);
  const slug = pipelineName.trim().toLowerCase().replace(/\s+/g, "-") || "my-pipeline";
  const cmd = `npx systemix add ${slug}`;

  const copy = async () => {
    await navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return { cmd, copied, copy };
}

// ── How-to-run strip ──────────────────────────────────────────────────────────

function HowToRunStrip({ nodes, installCmd, onCopyInstall, installCopied }: {
  nodes: Node[];
  installCmd: string;
  onCopyInstall: () => void;
  installCopied: boolean;
}) {
  const [copiedRun, setCopiedRun] = useState(false);
  const firstCmd = nodes[0] ? (nodes[0].data as SkillNodeData).command : "/figma";
  const runCmd = `${firstCmd} [your-figma-url]`;

  const copyRun = async () => {
    await navigator.clipboard.writeText(runCmd);
    setCopiedRun(true);
    setTimeout(() => setCopiedRun(false), 2000);
  };

  return (
    <div className="flex items-stretch border-t border-border bg-card flex-shrink-0 divide-x divide-border">
      {/* Step 1 */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 min-w-0">
        <span className="text-[10px] font-black text-muted-foreground/40 tabular-nums flex-shrink-0">1</span>
        <div>
          <p className="text-xs font-semibold text-foreground">Build here</p>
          <p className="text-[11px] text-muted-foreground/60">Drag skills, connect steps, toggle HITL gates</p>
        </div>
      </div>

      {/* Step 2 */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 min-w-0">
        <span className="text-[10px] font-black text-muted-foreground/40 tabular-nums flex-shrink-0">2</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground mb-0.5">Install to your project</p>
          <div className="flex items-center gap-1.5 bg-muted/60 rounded px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            <Terminal size={10} className="flex-shrink-0" />
            <span className="truncate">{installCmd}</span>
            <button onClick={onCopyInstall} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              {installCopied ? <Check size={10} className="text-teal-500" /> : <Copy size={10} />}
            </button>
          </div>
        </div>
      </div>

      {/* Step 3 */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 min-w-0 flex-1">
        <span className="text-[10px] font-black text-muted-foreground/40 tabular-nums flex-shrink-0">3</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground mb-0.5">Run in Claude Code</p>
          <div className="flex items-center gap-1.5 bg-teal-500/5 border border-teal-500/20 rounded px-2 py-0.5 font-mono text-[10px] text-teal-400">
            <span className="truncate">{runCmd}</span>
            <button onClick={copyRun} className="text-teal-500/50 hover:text-teal-400 transition-colors flex-shrink-0">
              {copiedRun ? <Check size={10} className="text-teal-500" /> : <Copy size={10} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Canvas page ────────────────────────────────────────────────────────────────

export default function CanvasPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState("figma-to-code");
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [workflowType, setWorkflowType] = useState<WorkflowType>("linear");
  const nodeIdCounter = useRef(100);

  const { cmd, copied, copy } = useInstallCmd(nodes, pipelineName);

  // Connect nodes
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges(eds =>
        addEdge({ ...params, animated: false, style: { stroke: "#14b8a6", strokeWidth: 1.5, opacity: 0.5 } }, eds),
      ),
    [setEdges],
  );

  // Select node
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

  // Add skill from library
  const onAddSkill = useCallback((skill: LibrarySkill) => {
    const id = `skill-${++nodeIdCounter.current}`;
    const newNode: Node = {
      id,
      type: "skill",
      position: { x: 300 + Math.random() * 200, y: 200 + Math.random() * 100 },
      data: {
        command: skill.command,
        name: skill.name,
        description: skill.description,
        mcp: skill.mcp,
        status: "idle",
        hitl: false,
      } satisfies SkillNodeData,
    };
    setNodes(ns => [...ns, newNode]);
    setSelectedNodeId(id);
  }, [setNodes]);

  // Update node data from inspector
  const onUpdateNode = useCallback((id: string, patch: Partial<SkillNodeData>) => {
    setNodes(ns =>
      ns.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n),
    );
  }, [setNodes]);

  // Load a template
  const onLoadTemplate = useCallback((t: WorkflowTemplate) => {
    setNodes(t.nodes);
    setEdges(t.edges);
    setPipelineName(t.id);
    setWorkflowType(t.type);
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  // Save workflow to .systemix/workflows/<slug>.json
  const onSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/workflows/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pipelineName, nodes, edges }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedSlug(data.slug);
        setTimeout(() => setSavedSlug(null), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  }, [pipelineName, nodes, edges]);

  // Simulate run
  const onRun = useCallback(() => {
    setIsRunning(true);
    const ids = nodes.map(n => n.id);
    ids.forEach((id, i) => {
      setTimeout(() => {
        setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, status: "running" } } : n));
        setEdges(es => es.map(e => e.source === id ? { ...e, animated: true } : e));
      }, i * 800);
      setTimeout(() => {
        const hitl = (nodes.find(n => n.id === id)?.data as SkillNodeData)?.hitl;
        setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, status: hitl ? "awaiting" : "success" } } : n));
        if (!hitl) setEdges(es => es.map(e => e.source === id ? { ...e, animated: false } : e));
      }, i * 800 + 600);
    });
    setTimeout(() => setIsRunning(false), ids.length * 800 + 800);
  }, [nodes, setNodes, setEdges]);

  const selectedNode = selectedNodeId
    ? (nodes.find(n => n.id === selectedNodeId) as { id: string; data: SkillNodeData } | undefined) ?? null
    : null;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">

      {/* ── Top bar ── */}
      <header className="flex items-center gap-2 px-4 h-12 border-b border-border flex-shrink-0 bg-card">
        <Link href="/" className="flex items-center gap-2 hover:opacity-70 transition-opacity mr-1">
          <ChevronLeft size={14} className="text-muted-foreground" />
          <SLogo size={16} className="text-foreground" />
        </Link>

        {/* Mode badge */}
        <span className="text-[10px] font-black tracking-widest uppercase text-muted-foreground/40 border border-border rounded px-1.5 py-0.5 hidden sm:block">
          Workflow Builder
        </span>

        <div className="w-px h-4 bg-border hidden sm:block" />

        {/* Workflow name */}
        <input
          value={pipelineName}
          onChange={e => setPipelineName(e.target.value)}
          className="bg-transparent border-0 outline-0 text-sm font-semibold text-foreground w-36 focus:bg-muted/30 rounded px-1.5 py-0.5 transition-colors"
          spellCheck={false}
        />

        {/* Workflow type badge */}
        {(() => {
          const info = WORKFLOW_TYPES[workflowType];
          return (
            <span className={cn("hidden sm:flex items-center gap-1 text-[10px] font-semibold border rounded px-1.5 py-0.5 border-current/20 bg-current/5", info.color)}>
              {info.icon}
              {info.label}
            </span>
          );
        })()}

        {/* Templates dropdown */}
        <TemplateDropdown
          currentType={workflowType}
          onLoadTemplate={onLoadTemplate}
          onTypeChange={setWorkflowType}
        />

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Save workflow */}
          <button
            onClick={onSave}
            disabled={isSaving}
            title="Save workflow to .systemix/workflows/"
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
              savedSlug
                ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
                : isSaving
                ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                : "text-muted-foreground border-border hover:text-foreground hover:border-border/80",
            )}
          >
            {savedSlug ? <><Check size={11} /> Saved</> : isSaving ? <><Save size={11} /> Saving…</> : <><Save size={11} /> Save</>}
          </button>

          {/* Preview simulation */}
          <button
            onClick={onRun}
            disabled={isRunning}
            title="Preview the workflow flow — actual execution happens in Claude Code (step 3)"
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
              isRunning
                ? "bg-muted text-muted-foreground border-border cursor-not-allowed"
                : "text-muted-foreground border-border hover:text-foreground hover:border-border/80",
            )}
          >
            <Play size={11} /> {isRunning ? "Previewing…" : "Preview"}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: skill library */}
        <SkillLibrary onAdd={onAddSkill} />

        {/* Center: canvas */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            deleteKeyCode="Backspace"
            className="bg-background"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--border, #e5e5e5)"
              style={{ opacity: 0.4 }}
            />
            <Controls
              className="!bg-card !border-border [&_button]:!bg-card [&_button]:!border-border [&_button]:!text-muted-foreground"
            />
            <MiniMap
              className="!bg-card !border-border"
              nodeColor={() => "#14b8a6"}
              maskColor="rgba(0,0,0,0.1)"
            />
          </ReactFlow>

          {/* How-to-run strip */}
          <HowToRunStrip
            nodes={nodes}
            installCmd={cmd}
            onCopyInstall={copy}
            installCopied={copied}
          />

          {/* HITL drawer */}
          <HitlDrawer />
        </div>

        {/* Right: node inspector */}
        {selectedNode && (
          <NodeInspector
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onUpdate={onUpdateNode}
          />
        )}
      </div>
    </div>
  );
}
