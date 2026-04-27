import Link from "next/link";
import { SystemGraph, GraphLegend } from "@/components/graph/SystemGraph";

export default function ArchitecturePage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Architecture</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-2">
        System graph
      </h1>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
        How Figma, skills, agents, and your codebase connect. Click any node to inspect it.
      </p>

      {/* Full-bleed graph canvas */}
      <div className="relative rounded-xl border border-border/40 overflow-hidden" style={{ height: 560 }}>
        <SystemGraph />
        <div className="absolute bottom-4 left-4 z-10">
          <GraphLegend />
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground/50 font-mono mt-4 mb-10">
        Scroll to zoom · drag to pan · click a node to inspect
      </p>

      <hr className="border-border/40 mb-8" />

      <section className="mb-8">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">Node types</h2>
        <div className="space-y-2 text-[13px] text-muted-foreground">
          <p><span className="font-mono text-violet-400">source</span> — origin of truth (Figma, CSS, codebase)</p>
          <p><span className="font-mono text-emerald-400">skill</span> — slash-command pipeline step</p>
          <p><span className="font-mono text-amber-400">agent</span> — autonomous operator (Hermes, Claude)</p>
          <p><span className="font-mono text-blue-400">artifact</span> — produced output (contract, token, story)</p>
          <p><span className="font-mono text-red-400">infra</span> — infrastructure (Ollama, MCP servers)</p>
          <p><span className="font-mono text-cyan-400">tool</span> — external tool (Figma, PostHog, Storybook)</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-4">Built on</h2>
        <div className="space-y-3">
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[13px] font-semibold text-foreground mb-1.5">Figma Console MCP — TJ Pitre</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              All Figma write operations — pushing token variables, placing screenshots, updating component descriptions — go through the Figma Console MCP by TJ Pitre. It executes the Figma Plugin API remotely via a Desktop Bridge, enabling bidirectional sync without leaving your terminal. Read operations use the official Figma REST MCP.
            </p>
          </div>
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[13px] font-semibold text-foreground mb-1.5">Hermes — local Ollama LLM</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Hermes is a local LLM running via Ollama (<code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">hermes3</code> model at <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">localhost:11434</code>). It reads CSS token values and Figma variable exports, then authors MDX contract files — one per token and component. No API key. No cloud.
            </p>
          </div>
        </div>
      </section>

      <Link
        href="/docs/skills"
        className="text-[13px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        → Browse the skills library
      </Link>
    </article>
  );
}
