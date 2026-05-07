export default function EvidenceLayerPage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Concepts</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-2">
        The Evidence Layer
      </h1>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-10">
        The contract isn&apos;t a snapshot of what you built — it&apos;s the running record of what you tested and what worked. When you or an AI agent touches something you&apos;ve already experimented on, the evidence is there: the decision, the data, the date, and the rationale.
      </p>

      <hr className="border-border/40 mb-8" />

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">Why evidence, not memory</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Most pre-PMF founders make product decisions from memory — a Slack thread, a stale Notion doc, a vague recollection that &ldquo;we tested something like that.&rdquo; When an AI agent is about to ship a new landing variant, it has no way to know what you already ran, what got rejected, or why. It starts from scratch every time.
        </p>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          The point isn&apos;t to remember more. Plenty of tools already remember things. The point is that every claim a contract makes is backed by something a human can audit and an agent can act on: a PostHog result, a HITL decision, a dated rationale Hermes wrote. Memory is what you store. Evidence is what holds up under questioning.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-4">What the evidence holds</h2>
        <div className="space-y-3">
          {[
            {
              label: "Hypothesis and intent",
              body: "The original hypothesis — which ICP it targeted, which funnel stage it addressed, the strategic claim it made, and why it was written the way it was. The baseline, not just a value.",
            },
            {
              label: "Production evidence",
              body: "Experiment results from PostHog, attributed to the variant that ran. A landing headline that drove +38% trial signups is recorded here — dated, with confidence, with the segment it tested on.",
            },
            {
              label: "Hermes rationale",
              body: "Each time a hypothesis resolves, Hermes writes prose into the contract body — what was recommended, why, and what to test next. Audit trail in human language.",
            },
            {
              label: "HITL decisions",
              body: "Every promote / kill / extend made in the queue is written back. The decision and reasoning live with the artifact, not in a meeting note or Slack thread.",
            },
            {
              label: "Rejected directions",
              body: "What didn't work is as important as what did. Rejected hypotheses are recorded permanently — preventing agents and future sprints from re-proposing directions already tested.",
            },
          ].map(({ label, body }) => (
            <div key={label} className="border border-border/40 rounded-xl px-4 py-4">
              <p className="text-[13px] font-semibold text-foreground mb-1">{label}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">The contract as agent context</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          When Claude Code, Cursor, or any MCP editor runs a Systemix skill, it reads the contract before acting. That means:
        </p>
        <ul className="space-y-2 text-[14px] text-muted-foreground list-none">
          {[
            "A /write-variants skill reads the contract before generating copy — it knows what's been tried, which ICPs were targeted, and what got rejected.",
            "A /close-experiment skill pulls the PostHog result and writes it into the contract, so the next hypothesis starts from measured ground, not assumption.",
            "Claude Code or Cursor reading the contract via MCP sees the full chain: original hypothesis → variants tested → result measured → decision recorded.",
          ].map((item) => (
            <li key={item} className="flex gap-2.5">
              <span className="text-muted-foreground/40 mt-0.5 shrink-0">→</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">Why it matters for agents</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          The evidence layer is what makes Systemix useful to AI agents. When Claude Code or Cursor is about to ship a new landing variant, it can read the contract via the MCP server and see what you already ran — including directions that were rejected and why. That&apos;s the difference between an agent that guesses and one that builds on what&apos;s known.
        </p>
        <p className="text-[14px] text-muted-foreground leading-relaxed">
          The evidence is permanently co-located with the artifact it describes. It doesn&apos;t live in Notion, Slack, or your head. It lives in the repo, committed alongside the code, readable by anyone or anything that opens the file.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">What the evidence record looks like</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          The frontmatter is machine-readable. The prose body is written by Hermes and approved by you. Both persist in the same file, committed to your repo.
        </p>
        <pre className="text-[12px] font-mono bg-muted/40 border border-border/40 rounded-xl p-4 overflow-x-auto text-foreground/80 leading-relaxed">{`---
id: onboarding-step2-copy
hypothesis: "Step 2 drop-off is caused by friction in the
  'connect your repo' instruction, not intent to quit"
status: evidence-backed
decision: promote
confidence: 0.81
evidence-posthog:
  experiment: onboarding-step2-ab
  variant: simplified-instruction
  result: "+29% step completion"
  sessions: 640
  recorded: 2026-04-20
last-updated: 2026-04-20
---

## Production Evidence

Simplified instruction variant ("Paste your repo URL below")
outperformed the original ("Connect your codebase via the
GitHub integration") by +29% step completion at 81% confidence.

Prior direction: adding a video walkthrough — tested February 2026,
no measurable lift, increased time-on-step. Rejected.
Do not re-propose video without new evidence.`}</pre>
        <p className="text-[14px] text-muted-foreground leading-relaxed mt-4">
          The evidence record is durable. The copy can change. The onboarding flow can be rebuilt. The evidence — what ran, what won, when, and what was rejected — stays attached to the artifact it describes.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">See also</h2>
        <div className="flex flex-col gap-1.5 text-[13px] font-mono">
          <a href="/docs/concepts/hypothesis-validation" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Hypothesis Validation Loop — how the loop closes</a>
          <a href="/docs/concepts/hermes" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Hermes — who writes the rationale</a>
          <a href="/docs/concepts/hitl" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ HITL & Decision Queue — approving evidence cards</a>
          <a href="/docs/concepts/contract" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ MDX Contracts — schema reference</a>
        </div>
      </section>
    </article>
  );
}
