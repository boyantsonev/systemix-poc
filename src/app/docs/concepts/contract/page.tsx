export default function ContractPage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">The stack</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        MDX contracts
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-10">
        One file per component. YAML frontmatter the machines read. Prose rationale Hermes writes and humans approve. The contract is the single artifact where the loop closes.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">The format</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Two layers in one file. The frontmatter is machine-readable: token values, Figma state, experiment results, the decision that closed the last loop. The prose body is human-readable: why the value was chosen, what was tested, what got rejected, what Hermes learned.
        </p>
        <p className="text-[13px] text-muted-foreground/60 leading-relaxed mb-6 border border-border/30 rounded-lg px-4 py-3 bg-muted/5">
          This is the same MDX + YAML frontmatter pattern Google open-sourced as DESIGN.md in April 2026. You don&apos;t need to know that spec — Systemix generates and manages the contract file for you.
        </p>
        <pre className="bg-muted/20 border border-border/40 rounded-xl px-5 py-5 font-mono text-[12px] text-foreground/80 leading-relaxed overflow-x-auto">{`---
component: HeroCTA
status: evidence-backed
parity: clean
figma-node: https://figma.com/file/...
last-experiment: hero-headline-ab
last-result: variant-b-wins
confidence: 0.87
last-updated: 2026-04-27
---

## HeroCTA

CTA button in the hero section. Current copy: "Start the loop."

### Evidence

Variant B ("Start the loop") outperformed the control ("Get started")
by +47% CTR at 87% confidence across 1,240 sessions (April 2026).

Prior test (March 2026): "Ship faster" — underperformed by 23% on
ops-role visitors. Rejected. Do not re-propose this direction.

### Token bindings

Uses --color-primary and --radius-base. Both resolved, no active drift.`}</pre>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-3">How much context does an agent need to load?</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Contracts are intentionally small. A typical component contract is 50–200 lines of MDX. The frontmatter alone (20–40 lines) is enough for an agent to get the current value, parity status, and last decision. The full prose adds the rationale and experiment history — useful when an agent is generating variants or writing copy.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">Frontmatter only</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">~20–40 lines. Current value, Figma state, last experiment result, decision. Use this when the agent is reading a token or checking parity.</p>
          </div>
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">Full contract</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">~50–200 lines. Adds the decision rationale, experiment history, rejected directions. Use this when the agent is writing, proposing variants, or generating copy.</p>
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
            { reader: "Design System UI", how: "Renders contracts as the /design-system page — parity status, evidence rows, quality score." },
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
