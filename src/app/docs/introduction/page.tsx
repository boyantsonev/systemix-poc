import Link from "next/link";

export default function IntroductionPage() {
  return (
    <article className="prose-custom">
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Introduction</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        The evidence layer<br />for your design system.
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-10">
        Systemix connects your Figma tokens, production code, and PostHog experiments into one MDX contract per component — with a local LLM that writes the evidence, not just the diff.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">What it is</h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-3">
          Every component ships as a guess. PostHog measures whether it worked. Hermes — a local LLM running via Ollama — reads the result against the contract&apos;s prior decisions and writes the evidence back as a structured record in the component&apos;s MDX file. The next agent, the next sprint, starts from that ground.
        </p>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          Systemix also detects perceptual drift between Figma and CSS (CIEDE2000 ΔE scoring), surfaces decisions in a human-in-the-loop queue, and gives every AI coding agent a verified baseline through an MCP server.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">One evidence layer. Two ways teams use it.</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-5">
          The contract is the constant. What changes is the problem it solves.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {([
            {
              audience: "AI-native product teams",
              headline: "Give your agents evidence, not guesses.",
              sub: "Contract files carry verified token values, rationale, and prior experiment results — so agents don't hallucinate baselines.",
            },
            {
              audience: "PostHog / Statsig teams",
              headline: "Write experiment results back to the component.",
              sub: "Winning variants are recorded in the contract MDX. The next test starts from what already worked.",
            },
          ] as const).map(({ audience, headline, sub }) => (
            <div key={audience} className="border border-border/40 rounded-xl px-4 py-4">
              <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">{audience}</p>
              <p className="text-[13px] font-semibold text-foreground mb-1">{headline}</p>
              <p className="text-[12px] text-muted-foreground">{sub}</p>
            </div>
          ))}
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
            { href: "/docs/concepts/evidence-layer", label: "Evidence Layer",       sub: "How PostHog results are written back to the contract" },
            { href: "/docs/concepts/hermes",         label: "Hermes",               sub: "The local LLM that authors and updates contracts" },
            { href: "/docs/concepts/contract",       label: "MDX Contracts",        sub: "How the contract is structured" },
            { href: "/docs/architecture",            label: "Architecture",         sub: "How all the pieces connect" },
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
