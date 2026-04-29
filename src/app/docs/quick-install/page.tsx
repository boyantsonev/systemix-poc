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
        Clone the repo, pull Hermes, run two scripts — you have a live quality score and inline drift triage in under 5 minutes.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-5">Prerequisites</h2>
        <ul className="space-y-2">
          {[
            "Node 18 or later",
            "Ollama installed — ollama.com",
            "Git — to clone the repo",
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
          <Step n="1" title="Clone and install">
            <CodeBlock>git clone https://github.com/boyantsonev/systemix-poc && cd systemix-poc && npm install</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              The repo is a Next.js app with npm workspaces. One install sets up the web app, the CLI package, and the MCP server.
            </p>
          </Step>

          <Step n="2" title="Pull the Hermes model">
            <CodeBlock>ollama pull hermes3</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Hermes is the local LLM that authors your MDX contract files. Runs entirely on your machine via Ollama at{" "}
              <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">localhost:11434</code> — no API key, no cloud.
            </p>
          </Step>

          <Step n="3" title="Convert tokens, then generate contracts">
            <CodeBlock>npm run tokens</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
              Reads <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">src/app/globals.css</code>, converts every CSS custom property from OKLCH to hex + Figma RGBA, and writes <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">.systemix/tokens.bridge.json</code>.
            </p>
            <CodeBlock>npm run generate-contracts</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
              Walks the bridge file and calls Hermes to author one MDX contract per token, written to <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">contract/tokens/</code>. If Ollama is not running, placeholder prose is written instead — you can run again later to fill it in.
            </p>
            <p className="text-[12px] font-mono text-muted-foreground/60 mb-1">Each generated contract looks like:</p>
            <OutputBlock>{`---
token: color-primary
value: oklch(0.45 0.18 250)
figma-value: null
status: missing-in-figma
resolved: false
collection: Semantic
source: css
last-updated: 2026-04-27
last-resolver: null
resolve-decision: null
---

The primary brand colour is defined in code as oklch(0.45 0.18 250) and
has not yet been verified against a Figma variable. Until the Figma sync
runs, this token carries missing-in-figma status.`}</OutputBlock>
          </Step>

          <Step n="4" title="Open the Design System">
            <CodeBlock>npm run dev</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-2">
              Open <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">/design-system</code> in the browser. The quality score shows your clean / drifted / unresolved split.
            </p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Click any token to see the side-by-side colour swatches, the ΔE value (when Figma data is present), and an inline resolve control — choose <strong className="text-foreground font-medium">code wins</strong> or <strong className="text-foreground font-medium">Figma wins</strong>. The decision is written back to the MDX frontmatter and the score updates.
            </p>
          </Step>
        </div>
      </section>

      <section>
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-4">What&apos;s next</h2>
        <div className="space-y-2 mb-8">
          {[
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
            Run <code className="font-mono text-[11px] bg-muted/60 px-1 py-0.5 rounded text-foreground">npx systemix watch</code> to start Hermes continuously. It watches your CSS and Figma for changes, polls PostHog for experiment results, and writes evidence back into each component&apos;s MDX contract as a dated record. The Decision Queue surfaces anything that needs human approval before the contract updates.
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
