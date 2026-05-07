export default function HitlPage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Concepts</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-2">
        HITL & Decision Queue
      </h1>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-10">
        The HITL queue is your primary decision surface. Every running hypothesis produces a card when it has enough data. Hermes synthesizes the result, you approve in one click, and the evidence is written permanently to the contract. This is the weekly cadence that closes the loop.
      </p>

      <hr className="border-border/40 mb-8" />

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">What HITL means in Systemix</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          The HITL queue is where you make product decisions. When a hypothesis has enough PostHog data, Hermes synthesizes the result against the full contract history — prior experiments, rejected directions, original intent — and surfaces a card with a recommendation. You approve, extend, or kill it in one click.
        </p>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          The queue persists in <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">.systemix/queue.json</code>. Cards stay until resolved. Every resolution is written back into the hypothesis contract as permanent evidence — the decision, the data, the date, and the rationale.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-4">Three actions on every card</h2>
        <div className="space-y-3">
          {[
            {
              type: "promote",
              label: "Promote",
              color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
              body: "The variant won. Hermes writes the result, the confidence, and the winning direction to the contract. The artifact becomes the new baseline. Future agents and experiments read this as known ground.",
              example: "Landing headline variant B +38% trial signups at 84% confidence — promoted 2026-05-01",
            },
            {
              type: "run longer",
              label: "Run longer",
              color: "bg-amber-500/15 text-amber-400 border-amber-500/30",
              body: "Confidence is below threshold or the sample is too small. The card is re-queued. Hermes records that you extended the test and why — so the next review starts with that context.",
              example: "Onboarding step 2 copy test — extended, 420 sessions, need 800 for 80% confidence",
            },
            {
              type: "kill",
              label: "Kill",
              color: "bg-red-500/15 text-red-400 border-red-500/30",
              body: "The hypothesis failed or isn't worth pursuing. The rejection is written to the contract permanently — preventing Hermes or any agent from re-proposing the same direction without surfacing the prior result.",
              example: "GTM offer: free audit — killed. Attracted wrong ICP. Do not re-propose without reframing the audience.",
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
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">What each action writes to the contract</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Every decision triggers an evidence write — not just the action, but the rationale that closes the loop:
        </p>
        <div className="space-y-2">
          {[
            { action: "Promote", result: "Result, confidence, winning variant, and rationale written to contract. New baseline for next experiment." },
            { action: "Run longer", result: "Extension reason written to contract. Card re-queued. Next synthesis picks up from here." },
            { action: "Kill", result: "Rejection reason written permanently to contract — prevents Hermes from re-proposing the same direction." },
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
      "id": "card_20260501_001",
      "type": "hypothesis",
      "hypothesis": "landing-headline-icp-match",
      "experiment": "hero-headline-ab",
      "confidence": 0.84,
      "recommendation": "promote",
      "createdAt": "2026-05-01T09:00:00Z",
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
