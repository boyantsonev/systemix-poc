import Link from "next/link";

export default function IntroductionPage() {
  return (
    <article className="prose-custom">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Getting Started</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        What is Systemix?
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-10">
        A hypothesis validation loop for design systems. PostHog measures what you ship. Hermes reads the result and writes it back to the component contract. The next agent, sprint, or experiment starts from evidence — not a fresh guess.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">The loop</h2>
        <div className="space-y-0">
          {[
            { n: "1", label: "You ship a component.", body: "PostHog tracks how it performs — scroll, clicks, conversions, funnel position." },
            { n: "2", label: "Hermes reads the result.", body: "A local LLM (Ollama, any model) reads the PostHog data against the component contract: prior experiments, rejected directions, original intent." },
            { n: "3", label: "A decision surfaces.", body: "Hermes queues a HITL card — promote the variant, run longer, or reject. One click. No forms." },
            { n: "4", label: "Evidence is written back.", body: "The contract records the decision, the data, and the date. The next agent reading this component sees the full history." },
          ].map(({ n, label, body }) => (
            <div key={n} className="flex gap-3 pb-4">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-5 h-5 rounded-full border border-border/60 flex items-center justify-center text-[9px] font-mono font-bold text-muted-foreground/40">
                  {n}
                </div>
                {n !== "4" && <div className="w-px flex-1 bg-border/25 mt-1" />}
              </div>
              <div className="pb-1">
                <p className="text-[13px] font-semibold text-foreground mb-0.5">{label}</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">The tools it connects</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Systemix doesn&apos;t replace your stack. It wraps around what you already have.
        </p>
        <div className="space-y-2">
          {[
            { tool: "PostHog / Statsig", role: "Where your experiment data already lives. Systemix reads it — nothing moves." },
            { tool: "Figma",             role: "Source of design tokens and components. Drift between Figma and code is detected and surfaced for resolution." },
            { tool: "Ollama",            role: "Runs Hermes locally. No API key. Any Ollama-compatible model works." },
            { tool: "MDX contracts",     role: "One file per component in your repo. Machine-readable frontmatter + human-readable rationale. Same format as Google's DESIGN.md — you don't need to know that spec to use Systemix." },
            { tool: "MCP server",        role: "Exposes contracts to AI coding agents. When Claude Code or Cursor asks about a component, they get the value, the rationale, and the evidence — not a guess." },
            { tool: "Vercel",            role: "Deploy target. The post-deploy hook triggers Hermes to pull fresh PostHog data into the contract." },
          ].map(({ tool, role }) => (
            <div key={tool} className="flex gap-3 text-[13px]">
              <span className="font-mono text-foreground/60 shrink-0 w-[140px]">{tool}</span>
              <span className="text-muted-foreground leading-relaxed">{role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">What it&apos;s not</h2>
        <div className="space-y-2 text-[13px] text-muted-foreground">
          {[
            "Not a documentation site — the contract is in your repo, not behind a hosted UI.",
            "Not a Figma plugin — it reads Figma, but you work in your editor.",
            "Not a replacement for Storybook — it sits alongside it. Storybook shows what exists. Systemix shows what worked.",
            "Not locked to Hermes — any Ollama model reads and writes the contracts.",
          ].map((item) => (
            <p key={item} className="flex gap-2">
              <span className="text-muted-foreground/30 shrink-0">—</span>
              {item}
            </p>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-4">Start here</h2>
        <Link
          href="/docs/quick-install"
          className="block border border-border/60 rounded-xl px-5 py-5 hover:border-border hover:bg-muted/30 transition-colors group mb-3"
        >
          <p className="text-[14px] font-bold text-foreground mb-1">Quick Install →</p>
          <p className="text-[13px] text-muted-foreground">Up and running in under 5 minutes</p>
        </Link>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { href: "/docs/concepts/hypothesis-validation", label: "Hypothesis Validation", sub: "The full loop, step by step" },
            { href: "/docs/concepts/hermes",               label: "Hermes",                sub: "Configure your model, understand what it reads" },
            { href: "/docs/concepts/hitl",                 label: "HITL & Decision Queue", sub: "How you interact with the loop" },
            { href: "/docs/architecture",                  label: "Architecture",           sub: "How all the pieces connect" },
          ].map(({ href, label, sub }) => (
            <Link
              key={href}
              href={href}
              className="block border border-border/40 rounded-xl px-4 py-4 hover:border-border hover:bg-muted/30 transition-colors group"
            >
              <p className="text-[13px] font-semibold text-foreground mb-1">{label} →</p>
              <p className="text-[12px] text-muted-foreground">{sub}</p>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
