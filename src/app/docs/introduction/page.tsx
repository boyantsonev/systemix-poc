import Link from "next/link";

export default function IntroductionPage() {
  return (
    <article className="prose-custom">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Introduction</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        The design contract layer<br />for your agents.
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-10">
        Systemix keeps your Figma design system and codebase in verified sync — one token at a time, with a local LLM that writes the rationale, not just the diff.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">What it is</h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed">
          Systemix ingests tokens and components from Figma and your codebase, detects perceptual drift between them, and has a local LLM (Hermes, via Ollama) author a human-readable contract for each one — with rationale, not just values. The result is a browsable documentation layer where every token and component has a verified status and a prose explanation of any conflict.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-5">Two use cases. One infrastructure.</h2>
        <div className="space-y-3">
          <div className="border border-border/40 rounded-xl px-5 py-5">
            <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">Use case 01</p>
            <p className="text-[14px] font-semibold text-foreground mb-2">Test faster. Measure what you actually designed.</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              If a token drifted before your test ran, PostHog gave you an answer to the wrong question. Systemix keeps tokens and components in sync with your Figma source so every variant ships clean. The feedback loop runs on real data.
            </p>
            <p className="text-[12px] text-muted-foreground/50 mt-3">
              For: product teams, agencies, AI-assisted workflows
            </p>
          </div>
          <div className="border border-border/40 rounded-xl px-5 py-5">
            <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">Use case 02</p>
            <p className="text-[14px] font-semibold text-foreground mb-2">Know what you actually have before you redesign anything.</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Inherited a platform nobody fully documented? Systemix audits every token and component, surfaces drift with perceptual accuracy (ΔE), and gives you a structured path from chaos to a clean baseline. One number — the quality score — tells you when the system is trustworthy enough to build on.
            </p>
            <p className="text-[12px] text-muted-foreground/50 mt-3">
              For: enterprise design system teams, platform redesign projects, design ops
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-5">Start here</h2>

        {/* Primary CTA */}
        <Link
          href="/docs/quick-install"
          className="block border border-border/60 rounded-xl px-5 py-5 hover:border-border hover:bg-muted/30 transition-colors group mb-3"
        >
          <p className="text-[14px] font-bold text-foreground mb-1 group-hover:text-foreground">
            Quick Install →
          </p>
          <p className="text-[13px] text-muted-foreground">Up and running in under 5 minutes</p>
        </Link>

        {/* Secondary links */}
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { href: "/docs/concepts/contract",     label: "MDX Contracts",   sub: "How the contract is structured" },
            { href: "/docs/guides/setup",           label: "Setup Guide",     sub: "Full walkthrough for your first project" },
            { href: "/docs/concepts/drift",         label: "Drift & Reconciliation", sub: "How drift is detected and resolved" },
            { href: "/docs/architecture",           label: "Architecture",    sub: "How all the pieces connect" },
          ].map(({ href, label, sub }) => (
            <Link
              key={href}
              href={href}
              className="block border border-border/40 rounded-xl px-4 py-4 hover:border-border hover:bg-muted/30 transition-colors group"
            >
              <p className="text-[13px] font-semibold text-foreground mb-1 group-hover:text-foreground">
                {label} →
              </p>
              <p className="text-[12px] text-muted-foreground">{sub}</p>
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
