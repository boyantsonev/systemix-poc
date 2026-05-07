export default function ContractPage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">The stack</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        MDX contracts
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-10">
        One file per hypothesis, in your repo. Machine-readable so agents can read it. Human-readable so you can. The contract is the single artifact where the loop closes.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">The format</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Two layers in one file. The frontmatter is machine-readable: hypothesis id, ICP, status, variants, result, decision, confidence, PostHog evidence. The prose body is human-readable: why the hypothesis was formed, what was tested, what got rejected, what Hermes concluded.
        </p>
        <p className="text-[13px] text-muted-foreground/60 leading-relaxed mb-6 border border-border/30 rounded-lg px-4 py-3 bg-muted/5">
          Contracts live in <code className="font-mono text-[11px]">contract/hypotheses/</code> in your repo. Systemix generates and updates them — you edit the MDX directly when you want to add context or override Hermes.
        </p>
        <pre className="bg-muted/20 border border-border/40 rounded-xl px-5 py-5 font-mono text-[12px] text-foreground/80 leading-relaxed overflow-x-auto">{`---
id: landing-headline-icp-match
hypothesis: "Ops-role visitors convert lower because the headline
  targets technical founders"
icp: ops-directors-linkedin
status: evidence-backed
variants:
  control: "Your agents. Your source of truth."
  variant_b: "Ship faster without the ops overhead."
result: variant-b-wins
decision: promote
confidence: 0.84
evidence-posthog:
  experiment: hero-headline-ab
  variant: variant_b
  lift: "+38% trial signups"
  sessions: 1840
  recorded: 2026-05-01
last-updated: 2026-05-01
---

## Landing headline — ICP match test

Hypothesis formed after PostHog showed 46% of inbound from LinkedIn
were ops-role, but headline was written for technical founders.

### Variants tested

- Control: "Your agents. Your source of truth." — baseline
- Variant B: "Ship faster without the ops overhead." — ops-framed

### Decision

Variant B promoted at 84% confidence across 1,840 sessions.
Prior direction ("AI-native" framing, March 2026) underperformed —
ops ICP reads "AI-native" as hype. Do not re-propose.`}</pre>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">How much context does an agent need to load?</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Contracts are intentionally small. A typical hypothesis contract is 50–200 lines of MDX. The frontmatter alone (20–40 lines) is enough for an agent to get the current status, last decision, and PostHog evidence. The full prose adds the rationale and rejected directions — useful when an agent is writing copy variants or planning the next experiment.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">Frontmatter only</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">~20–40 lines. Hypothesis status, last experiment result, decision, confidence. Use this when the agent is checking whether a hypothesis is resolved or still running.</p>
          </div>
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">Full contract</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">~50–200 lines. Adds the rationale, prior experiments, rejected directions. Use this when the agent is generating copy variants or proposing the next hypothesis.</p>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Who writes it</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-3">
          Hermes (via <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">npx systemix watch</code>) continuously authors and updates the contracts. When a PostHog experiment reaches significance, Hermes reads the result, checks the contract history, and writes both the decision and the rationale back to the MDX file. You approve through the HITL queue — the file is the source of truth, not a database.
        </p>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          When you resolve a drift decision in the dashboard, the resolve API writes directly to the MDX frontmatter. The contract file is committed to your repo. Your agents read it via the MCP server or directly from the filesystem.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">Who reads it</h2>
        <div className="space-y-2">
          {[
            { reader: "Hermes",           how: "Reads prior experiments and decisions before synthesizing a new result. This is how Hermes avoids re-proposing directions that were already tested and rejected." },
            { reader: "MCP server",       how: "Exposes contracts to Claude Code, Cursor, and any MCP-compatible agent via tool calls. The agent asks about a component; the MCP returns the frontmatter + evidence prose." },
            { reader: "Dashboard",         how: "Renders the HITL queue and contract evidence — decision cards, quality score, hypothesis status." },
            { reader: "You",              how: "The prose is readable. If Hermes writes bad rationale, you edit the MDX file directly. It's just a file." },
          ].map(({ reader, how }) => (
            <div key={reader} className="flex gap-3 text-[13px]">
              <span className="font-mono text-foreground/60 shrink-0 w-[120px]">{reader}</span>
              <span className="text-muted-foreground leading-relaxed">{how}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">See also</h2>
        <div className="flex flex-col gap-1.5 text-[13px] font-mono">
          <a href="/docs/concepts/hermes" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Hermes — what generates and updates the contracts</a>
          <a href="/docs/concepts/hypothesis-validation" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Hypothesis Validation — the full loop the contract supports</a>
          <a href="/docs/concepts/evidence-layer" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Evidence Layer — how production results reach the contract</a>
        </div>
      </section>
    </article>
  );
}
