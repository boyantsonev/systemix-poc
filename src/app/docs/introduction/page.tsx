import Link from "next/link";

export default function IntroductionPage() {
  return (
    <article className="prose-custom">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Introduction</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        The design contract layer<br />for your agents.
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-10">
        Systemix is an open-source tool that builds and maintains a verified contract between your Figma design system, your codebase, and the AI agents working on both.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">What it is</h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-4">
          Systemix ingests tokens and components from multiple sources, reconciles conflicts by your rules, annotates decisions with rationale, and serves the result via MCP.
        </p>
        <p className="text-[15px] text-muted-foreground leading-relaxed">
          The output is a single file — <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">contract.json</code> — that represents the verified state of your design system at a point in time. Every token is traced to its source. Every conflict is recorded. Every decision is annotated with rationale.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Who it&apos;s for</h2>
        <ul className="space-y-2">
          {[
            "Design system teams who need agents to understand their token structure",
            "Consultancies managing multiple client themes on one codebase",
            "Any team where Figma and code have drifted and agents are making it worse",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-[14px] text-muted-foreground leading-relaxed">
              <span className="mt-2 shrink-0 w-1 h-1 rounded-full bg-muted-foreground/40" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">The one-liner</h2>
        <div className="bg-muted/30 border border-border/40 rounded-xl px-5 py-5">
          <p className="text-[15px] leading-relaxed">
            Agents stop hallucinating design decisions when they have a verified, sourced contract to read from.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-5">Start here</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { href: "/docs/quick-install", label: "Quick Install", sub: "Up and running in under 5 minutes" },
            { href: "/docs/concepts/contract", label: "contract.json", sub: "How the contract is structured" },
            { href: "/docs/concepts/gigo-score", label: "GIGO Score", sub: "What quality means in Systemix" },
            { href: "/docs/guides/setup", label: "Setup Guide", sub: "Full walkthrough for your first project" },
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
