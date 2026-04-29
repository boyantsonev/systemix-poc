export default function HermesPage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Concepts</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-2">
        Hermes
      </h1>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-10">
        Hermes is the local LLM that authors your contract. It watches for changes, reads the context, writes the rationale, and routes decisions to the HITL queue when confidence is low. No API key. No cloud. Runs on your machine.
      </p>

      <hr className="border-border/40 mb-8" />

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">What Hermes is</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Hermes is the <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">hermes3</code> model running via Ollama at <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">localhost:11434</code>. It&apos;s a local, air-gapped LLM — nothing leaves your machine. It handles two jobs: writing MDX contract files when design system state changes, and synthesizing PostHog evidence into hypothesis validation cards.
        </p>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          Hermes is not a chatbot. You don&apos;t talk to it. It runs as part of <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">npx systemix watch</code> — a background process that monitors your CSS, Figma sync output, and PostHog evidence, then writes or updates the contract when something changes.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-4">What Hermes writes</h2>
        <div className="space-y-3">
          {[
            {
              label: "Token contracts",
              body: "When globals.css changes or a Figma sync runs, Hermes writes or updates contract/tokens/<slug>.mdx — frontmatter state plus a prose rationale explaining the current value, its source, and any relevant history.",
            },
            {
              label: "Component contracts",
              body: "When a component's token consumption changes, its Storybook story updates, or PostHog evidence comes in, Hermes updates contract/components/<slug>.mdx with the latest parity state and instrumentation notes.",
            },
            {
              label: "Hypothesis validation cards",
              body: "When PostHog experiment results are available, Hermes synthesizes the result against the contract evidence and writes a HITL card to the queue — including its recommended action and the reasoning chain.",
            },
            {
              label: "Drift rationale",
              body: "When a token drifts (CSS and Figma diverge), Hermes writes an explanation of the divergence and suggests a resolution. High-confidence drift is auto-queued; ambiguous cases go to HITL.",
            },
          ].map(({ label, body }) => (
            <div key={label} className="border border-border/40 rounded-xl px-4 py-4">
              <p className="text-[13px] font-semibold text-foreground mb-1">{label}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">Confidence routing</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Not every Hermes action goes to the HITL queue. Hermes scores its own confidence before writing:
        </p>
        <div className="grid sm:grid-cols-3 gap-px bg-border/40 rounded-xl overflow-hidden border border-border/40">
          {[
            { level: "High confidence", action: "Writes directly to contract, no queue entry", color: "text-emerald-400" },
            { level: "Medium confidence", action: "Writes contract + creates a reviewable HITL card", color: "text-amber-400" },
            { level: "Low confidence", action: "Creates HITL card only — does not write until approved", color: "text-red-400" },
          ].map(({ level, action, color }) => (
            <div key={level} className="bg-background px-4 py-4">
              <p className={`text-[11px] font-mono font-bold uppercase tracking-wide mb-1.5 ${color}`}>{level}</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{action}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">Running Hermes</h2>
        <pre className="text-[12px] font-mono bg-muted/40 border border-border/40 rounded-xl p-4 overflow-x-auto text-foreground/80 leading-relaxed">{`# Install Ollama + pull hermes3
brew install ollama
ollama pull hermes3

# Start the Systemix watcher (runs Hermes in the background)
npx systemix watch

# Or run a one-shot contract generation (no Ollama required)
npm run generate-contracts -- --no-hermes`}</pre>
        <p className="text-[12px] font-mono text-muted-foreground/50 mt-3">
          The <code className="text-foreground/60">--no-hermes</code> flag generates placeholder contract files with status <code className="text-foreground/60">missing-in-figma</code> — useful for bootstrapping before Ollama is set up.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">See also</h2>
        <div className="flex flex-col gap-1.5 text-[13px] font-mono">
          <a href="/docs/concepts/evidence-layer" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ The Evidence Layer — what Hermes writes into</a>
          <a href="/docs/concepts/hitl" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ HITL & Decision Queue — Hermes-generated cards</a>
          <a href="/docs/architecture" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Architecture — how Hermes connects to everything</a>
        </div>
      </section>
    </article>
  );
}
