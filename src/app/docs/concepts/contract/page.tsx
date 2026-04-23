export default function ContractPage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Concepts</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        contract.json
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-10">
        The single artifact Systemix produces and maintains.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">What it is</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">contract.json</code> is a DTCG-extended JSON file that represents the verified state of your design system at a point in time — with every token traced to its source, every conflict recorded, and every decision annotated with rationale.
        </p>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          Agents never read raw CSS or Figma. They read the contract.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-4">Structure</h2>
        <pre className="bg-muted/20 border border-border/40 rounded-xl px-5 py-5 font-mono text-[12px] text-foreground/80 leading-relaxed overflow-x-auto">{`{
  "meta": {
    "version": "1.0.0",
    "gigoScore": 0.87,
    "generatedAt": "2026-04-23T12:00:00Z",
    "sources": ["globals.css", "figma:h1m7dfFILe1wGSfxwQ6U02"]
  },
  "tokens": {
    "color.primary": {
      "$type": "color",
      "$value": "oklch(0.45 0.18 250)",
      "source": "codebase",
      "figmaValue": "#1a56db",
      "drift": "drifted",
      "rationale": "Code wins — Figma file hasn't been updated since brand refresh."
    }
  },
  "components": [],
  "rationale": []
}`}</pre>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-5">Key fields</h2>
        <div className="space-y-px rounded-xl overflow-hidden border border-border/40">
          {[
            {
              field: "meta.gigoScore",
              desc: "Contract quality, 0.0–1.0. Below 0.80 stops the pipeline.",
            },
            {
              field: "tokens[key].source",
              desc: "Which adapter wrote this value — codebase or figma.",
            },
            {
              field: "tokens[key].drift",
              desc: "match · drifted · custom · missing · pending",
            },
            {
              field: "tokens[key].rationale",
              desc: "Why this value was chosen when sources conflicted.",
            },
          ].map(({ field, desc }) => (
            <div key={field} className="flex items-start gap-4 px-4 py-4 bg-background border-b border-border/40 last:border-0">
              <code className="shrink-0 font-mono text-[12px] text-foreground/80 bg-muted/60 px-1.5 py-0.5 rounded mt-0.5">
                {field}
              </code>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Who reads it</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          The Systemix MCP server reads <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">contract.json</code> and exposes it to agents via tool calls. When an agent asks &quot;what is the primary colour?&quot; it gets a sourced, versioned answer — not a guess based on last-seen CSS.
        </p>
      </section>
    </article>
  );
}
