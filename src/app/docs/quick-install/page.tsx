import Link from "next/link";

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="shrink-0 pt-0.5">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-[11px] font-bold font-mono text-muted-foreground">
          {n}
        </span>
      </div>
      <div className="flex-1 pb-8 border-b border-border/40 last:border-0 last:pb-0">
        <p className="text-[14px] font-bold text-foreground mb-3">{title}</p>
        {children}
      </div>
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="bg-muted/30 border border-border/40 rounded-xl px-4 py-4 font-mono text-[13px] mb-3">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground/30 select-none">$</span>
        <span className="text-foreground">{children}</span>
      </div>
    </div>
  );
}

function OutputBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-muted/20 border border-border/40 rounded-xl px-4 py-4 font-mono text-[12px] text-muted-foreground leading-relaxed overflow-x-auto mt-3">
      {children}
    </pre>
  );
}

export default function QuickInstallPage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Getting Started</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        Quick Install
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-10">
        Pull Hermes, initialize your contract directory, write your first hypothesis — the validation loop is running in under 5 minutes.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-5">Prerequisites</h2>
        <ul className="space-y-2">
          {[
            "Node 18 or later",
            "Ollama installed — ollama.com",
            "A PostHog project (free tier works) — posthog.com",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-[14px] text-muted-foreground">
              <span className="mt-2 shrink-0 w-1 h-1 rounded-full bg-muted-foreground/40" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-12">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-6">Steps</h2>

        <div className="space-y-0">
          <Step n="1" title="Pull the Hermes model">
            <CodeBlock>ollama pull hermes3</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Hermes is the local LLM that synthesizes your experiment results. Runs entirely on your machine via Ollama at{" "}
              <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">localhost:11434</code> — no API key, no cloud. Any Ollama-compatible model works.
            </p>
          </Step>

          <Step n="2" title="Initialize Systemix in your repo">
            <CodeBlock>npx systemix init</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
              Creates <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">contract/hypotheses/</code> in your repo and writes a{" "}
              <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">.systemix/config.json</code> with your PostHog project key.
            </p>
          </Step>

          <Step n="3" title="Write your first hypothesis contract">
            <CodeBlock>npx systemix new hypothesis</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
              Scaffolds a new MDX contract in <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">contract/hypotheses/</code>. Fill in the hypothesis, ICP, variants, and success criteria — then commit it alongside the artifact you&apos;re testing.
            </p>
            <p className="text-[12px] font-mono text-muted-foreground/60 mb-1">A new contract looks like:</p>
            <OutputBlock>{`---
id: landing-headline-icp-match
hypothesis: "Ops-role visitors convert lower because the headline
  targets technical founders"
icp: ops-directors-linkedin
status: running
variants:
  control: "Your agents. Your source of truth."
  variant_b: "Ship faster without the ops overhead."
success-criteria: "+20% trial signups from LinkedIn traffic"
decision: null
confidence: null
evidence-posthog: null
last-updated: 2026-05-07
---

## Why this hypothesis

PostHog shows 46% of inbound from LinkedIn are ops-role.
Current headline is written for technical founders.
Hypothesis: framing for ops will lift conversion.`}</OutputBlock>
          </Step>

          <Step n="4" title="Start the watcher">
            <CodeBlock>npx systemix watch</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-2">
              Hermes runs in the background. It polls PostHog for experiment results and — when your experiment reaches significance — generates a HITL card in the dashboard queue.
            </p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Open the dashboard at{" "}
              <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">localhost:3000</code> to see the queue. When a card appears: approve, extend, or kill. The decision is written back to the contract.
            </p>
          </Step>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-6">Steps (continued)</h2>
        <div className="space-y-0">
          <Step n="5" title="Install the hypothesis-validation workflow">
            <CodeBlock>npx systemix workflow add hypothesis-validation</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
              Installs 4 Claude Code slash commands to{" "}
              <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">~/.claude/skills/</code>:{" "}
              <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">/init-experiment</code>,{" "}
              <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">/growth-audit</code>,{" "}
              <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">/write-variants</code>, and{" "}
              <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">/close-experiment</code>.
            </p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              These give Claude Code and Cursor the ability to read contracts, propose variants grounded in your ICP, and close experiments with evidence.
            </p>
          </Step>

          <Step n="6" title="Register the MCP server">
            <CodeBlock>npx systemix-mcp --project-root .</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Add this as an MCP server in your Claude Code or Cursor config. Any AI agent working in your codebase can now read your hypothesis contracts — prior experiments, rejected directions, production results — before touching anything you&apos;ve already tested.
            </p>
          </Step>
        </div>
      </section>

      <section>
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-4">What&apos;s next</h2>
        <div className="space-y-2 mb-8">
          {[
            { href: "/docs/concepts/hypothesis-validation", label: "Hypothesis Validation — the full loop, step by step" },
            { href: "/docs/concepts/evidence-layer",  label: "How production results are written back to the contract" },
            { href: "/docs/concepts/hermes",          label: "Hermes — the local LLM that authors contracts" },
            { href: "/docs/concepts/contract",        label: "MDX contract format — frontmatter + prose" },
            { href: "/docs/concepts/hitl",            label: "Decision Queue — approving Hermes cards" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-muted-foreground/40">→</span>
              {label}
            </Link>
          ))}
        </div>

        <div className="rounded-xl border border-border/40 px-4 py-4 bg-muted/20">
          <p className="text-[12px] font-bold text-foreground mb-1.5">Start the evidence loop</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed mb-2">
            Run <code className="font-mono text-[11px] bg-muted/60 px-1 py-0.5 rounded text-foreground">npx systemix watch</code> to keep Hermes running. It polls PostHog for experiment results and writes evidence back to each hypothesis contract as a dated record. The Decision Queue surfaces anything that needs your approval before the contract closes.
          </p>
          <Link
            href="/docs/concepts/evidence-layer"
            className="text-[11px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Evidence Layer →
          </Link>
        </div>
      </section>
    </article>
  );
}
