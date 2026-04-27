export default function HypothesisValidationPage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Concepts</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-2">
        Hypothesis Validation Loop
      </h1>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-10">
        Every section of your landing page is a claim. The hypothesis loop turns those claims into tested decisions — and writes the reasoning back to memory so the next agent, sprint, or campaign starts from known ground, not a blank slate.
      </p>

      <hr className="border-border/40 mb-8" />

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">What gets tested</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          The hypothesis loop isn&apos;t about visual tokens. It&apos;s about the decisions that determine whether a visitor converts: how the problem is framed, whether the value proposition matches the ICP arriving from a given channel, whether the &ldquo;How it works&rdquo; section reduces or creates friction, and which CTA copy drives action. The contract stores the rationale behind those decisions — and the evidence that validated or refuted them.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: "Messaging", examples: ["Value proposition headline variants", "Problem framing for different ICPs", "Benefit ordering by funnel stage"] },
            { label: "Structure", examples: ["Section sequence (proof before features?)", "Above-the-fold density vs. clarity", "Social proof placement and format"] },
            { label: "Conversion", examples: ["CTA copy and placement", "Form field count vs. completion rate", "Pricing anchor visibility"] },
            { label: "Audience fit", examples: ["Channel-specific landing variants", "Persona-matched problem framing", "Segment-aware feature emphasis"] },
          ].map(({ label, examples }) => (
            <div key={label} className="border border-border/40 rounded-xl px-4 py-4">
              <p className="text-[12px] font-bold uppercase tracking-wide text-foreground/70 mb-2">{label}</p>
              <ul className="space-y-1">
                {examples.map((ex) => (
                  <li key={ex} className="text-[12px] text-muted-foreground flex gap-2">
                    <span className="text-muted-foreground/40 shrink-0">→</span>
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-4">The loop, step by step</h2>
        <div className="space-y-0">
          {[
            {
              step: "1",
              label: "Intent is written to contract",
              body: "When a section is written or revised, its rationale is recorded in the contract: the ICP it targets, the funnel stage it addresses, the strategic claim it makes, and why the copy was written the way it was. This is the baseline — not a visual state, but an argument.",
            },
            {
              step: "2",
              label: "Growth agent identifies the hypothesis",
              body: "A growth or CRO agent reads PostHog funnel data and the contract memory for that section. It surfaces where drop-off is occurring, which ICP segments aren't converting, and proposes a testable hypothesis — e.g. \"The Problem section is written for technical founders but 60% of inbound is coming from ops-heavy roles via LinkedIn.\"",
            },
            {
              step: "3",
              label: "Marketing agent writes the variants",
              body: "A marketing or ad creative agent generates copy variants grounded in the hypothesis. Each variant is tied to a specific claim: who it's written for, what objection it addresses, what conversion action it targets. Variants are stored in the contract before the experiment ships.",
            },
            {
              step: "4",
              label: "Experiment runs in PostHog",
              body: "Feature flags or A/B tests serve the variants. PostHog tracks the events that matter for that section — scroll depth, section engagement time, click-through to the next stage, and ultimately conversion. Systemix doesn't replace your experimentation layer — it wraps around it.",
            },
            {
              step: "5",
              label: "Hermes synthesizes the result",
              body: "When the experiment reaches significance, Hermes reads the result against the full contract memory for that section: the original intent, the ICP hypothesis, every prior test and its outcome. It generates a HITL card with the result, a confidence score, and a recommended action — grounded in what's been tried before.",
            },
            {
              step: "6",
              label: "Decision written to contract",
              body: "The approved decision — promote the variant, run longer, or reject the hypothesis — is written back to the contract. The next agent, the next sprint, the next growth campaign starts from this known ground. Nothing is re-litigated from scratch.",
            },
          ].map(({ step, label, body }) => (
            <div key={step} className="flex gap-4 pb-6">
              <div className="flex flex-col items-center gap-0 shrink-0">
                <div className="w-6 h-6 rounded-full border border-border/60 flex items-center justify-center text-[10px] font-mono font-bold text-muted-foreground/60 shrink-0">
                  {step}
                </div>
                {parseInt(step) < 6 && <div className="w-px flex-1 bg-border/30 mt-1" />}
              </div>
              <div className="pb-2">
                <p className="text-[13px] font-semibold text-foreground mb-1">{label}</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">Why contract memory makes experiments trustworthy</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Without a record of intent, experiments produce isolated data points. You know which variant won — you don&apos;t know why the original was written the way it was, which audience hypothesis it was testing, or what was tried and rejected before. That context disappears into Slack threads and stale Notion docs.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-red-400/80 mb-2">Without Systemix</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              PostHog shows the Problem section has 47% drop-off. You rewrite it. Six months later a new growth agent (or new hire) proposes the exact framing you already tested and rejected. The cycle repeats. Institutional knowledge lives in no one&apos;s head consistently.
            </p>
          </div>
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-emerald-400/80 mb-2">With Systemix</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              The contract shows: this section was written for ops-heavy ICPs in March, a more technical variant was tested in April and rejected at 62% confidence, and the current copy won on scroll-to-pricing conversion. Hermes proposes the next hypothesis informed by all of this — not from scratch.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">Example: value proposition test</h2>
        <pre className="text-[12px] font-mono bg-muted/40 border border-border/40 rounded-xl p-4 overflow-x-auto text-foreground/80 leading-relaxed">{`# HITL card generated by Hermes

type: hypothesis
section: hero-value-prop
experiment: vp-icp-match-test
hypothesis: "Ops-role visitors (46% of LinkedIn traffic) convert
  lower because the headline targets technical founders"
variants:
  control: "Your design system. Your agents. Your source of truth."
  variant_b: "Ship faster without the ops overhead of keeping
    design and code in sync."
confidence: 0.84
result: variant_b +38% scroll-to-pricing, +22% trial signup
recommendation: promote
rationale: |
  Variant B addresses the ops-overhead framing directly.
  Prior test (March) that leaned harder on 'AI agent' language
  underperformed — current ICP reads 'agent' as hype.
  Recommend promoting B and testing CTA copy next.`}</pre>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">What Hermes reads before synthesizing</h2>
        <ul className="space-y-2 text-[14px] text-muted-foreground list-none">
          {[
            "The original copywriting rationale for the section — who it was written for and what claim it makes",
            "The ICP hypothesis that motivated the current copy — including the channel and funnel stage",
            "Every prior experiment result recorded in the contract for this section, including rejections",
            "PostHog funnel data: where visitors come from, where they drop, what they do after the section",
            "Adjacent section performance — whether context before or after the section is influencing the result",
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <span className="text-muted-foreground/40 mt-0.5 shrink-0">→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">Multi-agent orchestration</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          The hypothesis loop is designed to be composable. Growth agents surface the opportunity. Marketing and ad creative agents write the variants. Hermes synthesizes results against memory and generates the HITL card. The approval writes the decision back. Each agent reads the contract for context — and writes to it when the loop closes.
        </p>
        <div className="space-y-2">
          {[
            { agent: "Growth / Analytics agent", role: "Reads PostHog funnel data, identifies low-converting sections, proposes testable hypotheses" },
            { agent: "Ad Creative / Marketing agent", role: "Generates copy variants grounded in the hypothesis — per ICP, per funnel stage, per channel" },
            { agent: "Hermes (local LLM)", role: "Synthesizes experiment results against contract memory, generates HITL card with recommendation" },
            { agent: "Human (HITL queue)", role: "Approves, rejects, or modifies — decision and rationale written to contract before loop closes" },
          ].map(({ agent, role }) => (
            <div key={agent} className="flex gap-3 text-[13px]">
              <span className="font-mono text-foreground/70 shrink-0 w-[210px]">{agent}</span>
              <span className="text-muted-foreground leading-relaxed">{role}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">See also</h2>
        <div className="flex flex-col gap-1.5 text-[13px] font-mono">
          <a href="/docs/concepts/memory-layer" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Memory Layer — how decisions persist across agents and sprints</a>
          <a href="/docs/concepts/hermes" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Hermes — the synthesis engine that reads the contract</a>
          <a href="/docs/concepts/hitl" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ HITL & Decision Queue — approving hypothesis cards</a>
        </div>
      </section>
    </article>
  );
}
