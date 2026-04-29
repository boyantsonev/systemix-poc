export default function HitlPage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Concepts</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-2">
        HITL & Decision Queue
      </h1>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-10">
        Hermes acts autonomously when it&apos;s confident. When it&apos;s not, it queues a decision card for a human. One approval and the action executes — with the rationale written to the contract automatically.
      </p>

      <hr className="border-border/40 mb-8" />

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">What HITL means in Systemix</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Human-in-the-Loop is the gate between Hermes&apos;s analysis and a write to your codebase or Figma. Systemix doesn&apos;t auto-apply changes it&apos;s uncertain about. Instead it surfaces a card in the dashboard queue — with context, evidence, and a pre-filled recommendation — so a human can approve, reject, or modify in one click.
        </p>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          The queue persists in <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">.systemix/queue.json</code>. Cards stay until resolved. Every resolution is written back into the relevant contract MDX file as evidence — alongside the value, the rationale, and any prior experiments.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-4">Three card types</h2>
        <div className="space-y-3">
          {[
            {
              type: "drift",
              label: "Drift resolution",
              color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
              body: "A token's CSS value and Figma variable have diverged. Hermes shows both values, proposes which to trust as source of truth, and asks you to resolve. Options: update Figma to match code, update code to match Figma, or mark as intentional.",
              example: "--primary: oklch(0.205 0 0) in CSS vs oklch(0.35 0.1 250) in Figma",
            },
            {
              type: "instrumentation",
              label: "Instrumentation approval",
              color: "bg-blue-500/15 text-blue-400 border-blue-500/30",
              body: "Hermes wants to add PostHog instrumentation (posthog.capture calls) to a component. It shows the component, the proposed event name, and which interactions it would track. You approve or adjust the tracking scope.",
              example: "Add posthog.capture('hero_cta_click') to HeroCTAs component",
            },
            {
              type: "hypothesis",
              label: "Hypothesis validation",
              color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
              body: "A PostHog experiment has enough data. Hermes synthesizes the result against contract evidence and proposes an action. Options: promote the winning variant, run the test longer for more confidence, or reject the hypothesis.",
              example: "Hero headline A/B: variant B +47% CTR at 87% confidence — promote?",
            },
          ].map(({ type, label, color, body, example }) => (
            <div key={type} className="border border-border/40 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium ${color}`}>
                  {type}
                </span>
                <span className="text-[13px] font-semibold text-foreground">{label}</span>
              </div>
              <div className="px-4 py-3">
                <p className="text-[13px] text-muted-foreground leading-relaxed mb-2">{body}</p>
                <p className="text-[11px] font-mono text-muted-foreground/50 bg-muted/30 px-2 py-1 rounded">{example}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">What happens after approval</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Every approval triggers a sequence — not just the action, but the memory write:
        </p>
        <div className="space-y-2">
          {[
            { action: "Approve drift resolution", result: "globals.css or Figma updated, contract status set to clean, Hermes writes rationale" },
            { action: "Approve instrumentation", result: "PostHog capture call added to component, contract updated with evidence-tracking fields" },
            { action: "Promote hypothesis variant", result: "Token updated in globals.css, PostHog evidence written to contract, next test baseline recorded" },
            { action: "Reject hypothesis", result: "Rejection reason written to contract — prevents Hermes from re-proposing the same direction" },
          ].map(({ action, result }) => (
            <div key={action} className="flex gap-3 text-[13px]">
              <span className="font-mono text-foreground/70 shrink-0 w-[200px]">{action}</span>
              <span className="text-muted-foreground leading-relaxed">{result}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">Queue mechanics</h2>
        <pre className="text-[12px] font-mono bg-muted/40 border border-border/40 rounded-xl p-4 overflow-x-auto text-foreground/80 leading-relaxed">{`# .systemix/queue.json — one entry per pending card
{
  "cards": [
    {
      "id": "card_20260427_001",
      "type": "hypothesis",
      "component": "HeroCTAs",
      "experiment": "hero-headline-ab",
      "confidence": 0.87,
      "recommendation": "promote",
      "createdAt": "2026-04-27T12:00:00Z",
      "status": "pending"
    }
  ]
}`}</pre>
        <p className="text-[12px] font-mono text-muted-foreground/50 mt-3">
          Cards are served via <code className="text-foreground/60">GET /api/queue</code> and resolved via <code className="text-foreground/60">PATCH /api/queue/:id</code>. The dashboard polls this endpoint.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">See also</h2>
        <div className="flex flex-col gap-1.5 text-[13px] font-mono">
          <a href="/docs/concepts/hypothesis-validation" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Hypothesis Validation Loop — the full cycle</a>
          <a href="/docs/concepts/hermes" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Hermes — what generates the cards</a>
          <a href="/dashboard" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Dashboard — where the queue lives ↗</a>
        </div>
      </section>
    </article>
  );
}
