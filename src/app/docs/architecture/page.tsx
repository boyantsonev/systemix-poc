import Link from "next/link";
import { SystemGraph, GraphLegend } from "@/components/graph/SystemGraph";

export default function ArchitecturePage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Reference</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-2">
        Architecture
      </h1>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
        How PostHog, Hermes, the evidence contract, and your codebase connect into a continuous loop.
      </p>

      {/* Full-bleed graph canvas */}
      <div className="relative rounded-xl border border-border/40 overflow-hidden" style={{ height: 560 }}>
        <SystemGraph />
        <div className="absolute bottom-4 left-4 z-10">
          <GraphLegend />
        </div>
        <Link
          href="/graph"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/50 bg-background/80 backdrop-blur-sm text-[11px] font-mono text-muted-foreground/60 hover:text-foreground hover:border-border transition-colors"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0">
            <path d="M1 10L10 1M10 1H4M10 1V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Fullscreen
        </Link>
      </div>

      <p className="text-[12px] text-muted-foreground/50 font-mono mt-4 mb-10">
        Scroll to zoom · drag to pan · click a node to inspect
      </p>

      <hr className="border-border/40 mb-8" />

      <section className="mb-8">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">Node types</h2>
        <div className="space-y-2 text-[13px] text-muted-foreground">
          <p><span className="font-mono text-violet-400">source</span> — origin of truth (Figma, CSS, codebase)</p>
          <p><span className="font-mono text-amber-400">agent</span> — autonomous operator (Hermes, any Ollama model)</p>
          <p><span className="font-mono text-blue-400">artifact</span> — produced output (contract, decision, evidence record)</p>
          <p><span className="font-mono text-red-400">infra</span> — infrastructure (Ollama, MCP server)</p>
          <p><span className="font-mono text-cyan-400">tool</span> — external tool (Figma, PostHog, Vercel)</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-4">The loop</h2>
        <div className="space-y-3">
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[13px] font-semibold text-foreground mb-1.5">Hermes — local LLM via Ollama</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Hermes runs locally via Ollama — any compatible model, no API key required. It watches your codebase, Figma, and PostHog for changes; authors MDX contract files; and polls PostHog for experiment results. When evidence arrives, Hermes synthesizes it against the contract&apos;s prior decisions and writes the result back as a dated evidence record, then queues it for human review.
            </p>
          </div>
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[13px] font-semibold text-foreground mb-1.5">PostHog — production evidence source</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              PostHog closes the loop. When an experiment finishes, Hermes reads the result, checks the contract history — prior experiments, rejected directions, baseline rates — and writes the winning evidence back into the MDX frontmatter. The Decision Queue surfaces the synthesis as a HITL card for human approval before the contract is updated.
            </p>
          </div>
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[13px] font-semibold text-foreground mb-1.5">MCP server — agent access layer</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              The Systemix MCP server exposes contracts to Claude Code, Cursor, and any MCP-compatible agent. When an agent asks about a component or experiment, it gets the current value, the rationale, and the full evidence history — not a guess.
            </p>
          </div>
        </div>
      </section>

      <Link
        href="/docs/concepts/hypothesis-validation"
        className="text-[13px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        → How the hypothesis validation loop works
      </Link>
    </article>
  );
}
