export default function GigoScorePage() {
  const tiers = [
    { score: "≥ 0.90", state: "Green",  dot: "bg-emerald-500", body: "Contract is clean. Safe to use in agent workflows and CI." },
    { score: "≥ 0.80", state: "Amber",  dot: "bg-amber-500",   body: "Drifts exist. Agents will encounter ambiguity. Triage recommended." },
    { score: "< 0.80", state: "Red",    dot: "bg-red-400",     body: "Pipeline halts. Too much noise for agents to trust." },
  ];

  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Concepts</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        GIGO Score
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-10">
        Garbage In, Garbage Out — a 0.0–1.0 quality signal that measures how trustworthy your <code className="font-mono text-[14px] bg-muted/60 px-1.5 py-0.5 rounded">contract.json</code> is.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Definition</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          A low score means your sources disagree too much for agents to rely on. A high score means conflicts are resolved and the contract is clean. It&apos;s a forcing function, not a vanity metric — it rises as you resolve conflicts, and drops when sources drift apart.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-4">How it&apos;s calculated</h2>
        <div className="bg-muted/20 border border-border/40 rounded-xl px-5 py-4 font-mono text-[13px] text-foreground/80 mb-5">
          GIGO = (resolved_tokens / total_tokens) × source_coverage × completeness
        </div>
        <ul className="space-y-3">
          {[
            { term: "Resolved tokens", desc: "tokens where drift is match or has an explicit rationale decision" },
            { term: "Source coverage", desc: "what fraction of tokens have both a code and Figma value" },
            { term: "Completeness", desc: "no pending or missing tokens above a threshold" },
          ].map(({ term, desc }) => (
            <li key={term} className="flex items-start gap-3 text-[14px] text-muted-foreground">
              <span className="shrink-0 font-semibold text-foreground">{term}:</span>
              {desc}
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

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Hard stop</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          If GIGO &lt; 0.80, <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">systemix serve</code> will refuse to start. Serving a low-quality contract to agents is worse than serving nothing — agents that get ambiguous answers don&apos;t fail loudly, they guess quietly.
        </p>
      </section>

      <section>
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Improving your score</h2>
        <ul className="space-y-2">
          {[
            "Resolve drift conflicts in the Drift Room",
            "Connect both a codebase adapter and a Figma adapter",
            "Clear all pending tokens with explicit decisions",
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
