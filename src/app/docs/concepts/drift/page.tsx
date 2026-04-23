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
        Drift is any disagreement between what your design sources say a token&apos;s value should be.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">What drift is</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          It&apos;s not a bug — it&apos;s a normal part of working across Figma and code. Figma moves. CSS moves. They move at different rates, maintained by different people. Systemix makes drift visible and manageable instead of letting it silently poison agent outputs.
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
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">The Drift Room</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          The <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">/projects/[slug]/drift</code> view shows all pending HITL decisions. Each card shows the token name, both values, and the source. You approve (pick a winner) or defer (mark for later). Every decision is recorded in the contract&apos;s rationale layer.
        </p>
      </section>

      <section>
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Why this matters for agents</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          An agent that reads a <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">drifted</code> token without a rationale decision doesn&apos;t know which value to use. It will guess. The reconciliation process turns guesses into facts — and the GIGO score tracks how many facts you have.
        </p>
      </section>
    </article>
  );
}
