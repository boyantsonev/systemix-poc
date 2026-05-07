export default function QualityScorePage() {
  const tiers = [
    { score: "≥ 80",  state: "Evidence-ready",   dot: "bg-emerald-500", body: "Most contracts are backed by measured results. You can trust this as your experiment baseline — agents reading the contracts will get real decisions, not stale assumptions." },
    { score: "≥ 60",  state: "Partial coverage",  dot: "bg-amber-500",   body: "Some hypotheses are unresolved or lack PostHog evidence. You can proceed, but agents may encounter contracts where the decision is still pending." },
    { score: "< 60",  state: "Unbacked",          dot: "bg-red-400",     body: "Most contracts lack evidence. The baseline is not reliable — close open experiments and resolve pending HITL cards before trusting this for future hypotheses." },
  ];

  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Concepts</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        Quality Score
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-10">
        A 0–100 measure of how much evidence backs your hypothesis contracts. The score tells you whether you can trust the baseline your next experiment starts from.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">What it measures</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          The score reflects how much of your contract set is backed by real evidence — hypotheses with PostHog results, HITL decisions recorded, and resolved drift. A low score means the contracts hold assumptions, not measurements. A high score means when you or an agent reads a contract, the decision there is real.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-4">Formula</h2>
        <div className="bg-muted/20 border border-border/40 rounded-xl px-5 py-4 font-mono text-[12px] text-foreground/80 leading-relaxed mb-5 space-y-1.5">
          <div>tScore = (clean_tokens / total_tokens)</div>
          <div className="text-muted-foreground/60">{"        "}- (drifted_unresolved × 0.05)</div>
          <div className="text-muted-foreground/60">{"        "}- (missing_in_figma × 0.03)</div>
          <div className="mt-2">cScore = clean_components / total_components</div>
          <div className="mt-2 text-emerald-400/80">score = max(0, round(((tScore + cScore) / 2) × 100))</div>
        </div>
        <ul className="space-y-3">
          {[
            { term: "clean_tokens",        desc: "tokens where code and Figma agree, or where a resolve decision has been recorded" },
            { term: "drifted_unresolved",  desc: "tokens flagged as drifted with no human decision yet — penalised at 5 points each" },
            { term: "missing_in_figma",    desc: "tokens present in code but absent from Figma — penalised at 3 points each" },
            { term: "clean_components",    desc: "components where parity is confirmed clean" },
          ].map(({ term, desc }) => (
            <li key={term} className="flex items-start gap-3 text-[14px] text-muted-foreground">
              <code className="shrink-0 font-mono text-[12px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground mt-0.5">{term}</code>
              <span className="leading-relaxed">{desc}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-5">Thresholds</h2>
        <div className="space-y-px rounded-xl overflow-hidden border border-border/40">
          {tiers.map(({ score, state, dot, body }) => (
            <div key={score} className="flex items-start gap-4 px-4 py-5 bg-background border-b border-border/40 last:border-0">
              <span className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${dot}`} />
              <div>
                <p className="text-[13px] font-bold text-foreground mb-1">
                  <span className="font-mono">{score}</span> — {state}
                </p>
                <p className="text-[13px] text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Improving your score</h2>
        <ul className="space-y-2">
          {[
            "Open the HITL queue and resolve pending hypothesis cards — each approved decision adds evidence to a contract",
            "Close running PostHog experiments with /close-experiment — the result is written to the contract and the score updates",
            "Resolve any drifted visual state before shipping new variants — drift means the experiment may not have measured what you designed",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-[14px] text-muted-foreground">
              <span className="mt-2 shrink-0 w-1 h-1 rounded-full bg-muted-foreground/40" />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
