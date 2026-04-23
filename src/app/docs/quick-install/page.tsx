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
        Get Systemix running and your first contract built in under 5 minutes.
      </p>

      <hr className="border-border/40 mb-10" />

      <section className="mb-10">
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-5">Prerequisites</h2>
        <ul className="space-y-2">
          {[
            "Node 18 or later",
            "A codebase with CSS custom properties (or Tailwind tokens)",
            "A Figma file key — optional for first run",
            "Claude Code, Cursor, or any MCP-compatible client",
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
          <Step n="1" title="Scaffold">
            <CodeBlock>npx @systemix/init</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Creates a <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">.systemix/</code> folder with <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">systemix.json</code>, <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">tokens.bridge.json</code>, and an empty <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">contract.json</code>.
            </p>
          </Step>

          <Step n="2" title="Scan">
            <CodeBlock>systemix scan</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
              Ingests your CSS tokens, runs reconciliation, and writes your first <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">contract.json</code>. You&apos;ll see a GIGO score.
            </p>
            <p className="text-[12px] font-mono text-muted-foreground/60 mb-1">Expected output:</p>
            <OutputBlock>{`✓ Ingested 47 tokens from globals.css
✓ Ingested 31 variables from Figma (h1m7dfFILe1wGSfxwQ6U02)
⚠  12 conflicts detected — run \`systemix drift\` to review
GIGO score: 0.82 (amber)
Contract written to .systemix/contract.json`}</OutputBlock>
          </Step>

          <Step n="3" title="Serve">
            <CodeBlock>systemix serve</CodeBlock>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Starts the MCP server on <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">localhost:3845</code>. Your agent can now query the contract.
            </p>
          </Step>
        </div>
      </section>

      <section>
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-4">What&apos;s next</h2>
        <div className="space-y-2">
          {[
            { href: "/docs/guides/setup",          label: "Read the Setup Guide for a full walkthrough" },
            { href: "/docs/concepts/contract",     label: "Learn about contract.json structure" },
            { href: "/docs/concepts/gigo-score",   label: "Understand your GIGO score" },
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
      </section>
    </article>
  );
}
