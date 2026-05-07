export default function DriftPage() {
  const driftTypes = [
    { type: "match",   desc: "Code and Figma agree. No action needed." },
    { type: "drifted", desc: "Values differ. A decision is required." },
    { type: "custom",  desc: "Only in one source (code-only or Figma-only)." },
    { type: "missing", desc: "Token referenced in components but not defined." },
    { type: "pending", desc: "Conflict flagged, awaiting a human decision." },
  ];

  const modes = [
    { label: "Code wins",  desc: "The CSS/codebase value is authoritative. Figma value is noted but not applied." },
    { label: "Figma wins", desc: "The Figma variable is authoritative. Code should be updated to match." },
    { label: "HITL",       desc: "Human in the loop. A decision card appears in the Drift Room for a human to approve or reject." },
  ];

  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Concepts</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        Drift &amp; Reconciliation
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-10">
        A supporting concept. Before you can trust an experiment result, the thing being tested needs to be in a known state. Drift detection ensures you measured what you designed — not an accidental variant.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">What drift is</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          Drift is any disagreement between what your design sources say a value should be — typically between Figma and code. It&apos;s a secondary concern for most pre-PMF founders, but it matters when you need to trust that your experiment measured the variant you intended, not an accidental divergence. Systemix makes drift visible and resolvable — it&apos;s not the primary workflow, but it keeps the primary workflow honest.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-5">Drift types</h2>
        <div className="space-y-px rounded-xl overflow-hidden border border-border/40">
          {driftTypes.map(({ type, desc }) => (
            <div key={type} className="flex items-start gap-4 px-4 py-4 bg-background border-b border-border/40 last:border-0">
              <code className="shrink-0 font-mono text-[12px] text-foreground/80 bg-muted/60 px-1.5 py-0.5 rounded mt-0.5">
                {type}
              </code>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Reconciliation modes</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-5">
          When two sources disagree on a token value, Systemix needs a rule. You configure this in <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">systemix.json</code>.
        </p>
        <div className="space-y-3">
          {modes.map(({ label, desc }) => (
            <div key={label} className="flex items-start gap-4 border border-border/40 rounded-xl px-4 py-4">
              <span className="shrink-0 text-[12px] font-bold font-mono text-foreground/80 mt-0.5">{label}</span>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Perceptual drift</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-3">
          String comparison misses the point for colour tokens. <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">oklch(0.45 0.18 250)</code> and <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">#0063c4</code> are not identical strings but they may be perceptually equivalent. Systemix uses CIEDE2000 (ΔE) to measure the actual visual distance:
        </p>
        <div className="space-y-px rounded-xl overflow-hidden border border-border/40">
          {[
            { range: "ΔE < 2.0",  label: "Imperceptible", desc: "Human eye cannot distinguish the values — auto-resolved as clean." },
            { range: "ΔE 2–5",    label: "Noticeable",    desc: "Visible under direct comparison. Requires a human decision." },
            { range: "ΔE > 5",    label: "Obvious",       desc: "Clearly different colours. Almost certainly a real drift." },
          ].map(({ range, label, desc }) => (
            <div key={range} className="flex items-start gap-4 px-4 py-4 bg-background border-b border-border/40 last:border-0">
              <code className="shrink-0 font-mono text-[12px] text-foreground/80 bg-muted/60 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap">{range}</code>
              <div>
                <p className="text-[13px] font-semibold text-foreground mb-0.5">{label}</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Resolving drift</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-3">
          Open <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">/design-system</code> to see all drifted tokens. Click any token to go to its detail page — it shows side-by-side colour swatches, the ΔE value, and an inline resolve control. Choose <strong className="text-foreground">code wins</strong> or <strong className="text-foreground">Figma wins</strong>. The decision is written back to the MDX frontmatter (<code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">resolve-decision</code>, <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">resolved: true</code>) and the quality score updates on the next load.
        </p>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          In non-interactive mode (CI or automated runs), Hermes writes a <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">.pending.json</code> sidecar file when it encounters a conflict it cannot auto-resolve. The CLI reads the sidecar and presents a Y/N prompt. Set <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">HITL_AUTO_APPROVE=1</code> to skip the prompt in CI.
        </p>
      </section>

      <section>
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Why this matters for hypothesis validation</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          An experiment result is only trustworthy if the thing being tested was in a known state when it ran. Unresolved drift means an agent or a deploy may have served a visual that differed from what you designed — and the PostHog result reflects that accidental variant, not the intended one. Resolving drift before shipping closes that gap.
        </p>
      </section>
    </article>
  );
}
