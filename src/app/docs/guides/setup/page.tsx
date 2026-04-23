import Link from "next/link";

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="flex flex-col items-center shrink-0">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-foreground text-background text-[11px] font-bold font-mono shrink-0">
          {n}
        </span>
        <div className="flex-1 w-px bg-border/40 mt-2" />
      </div>
      <div className="flex-1 pb-10 last:pb-0">
        <p className="text-[15px] font-bold text-foreground mb-4 mt-0.5">{title}</p>
        {children}
      </div>
    </div>
  );
}

function Cmd({ children }: { children: string }) {
  return (
    <div className="bg-muted/30 border border-border/40 rounded-xl px-4 py-3.5 font-mono text-[13px] mb-4 flex items-center gap-2">
      <span className="text-muted-foreground/30 select-none">$</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-amber-500/40 pl-4 py-0.5 my-4">
      <p className="text-[13px] text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}

export default function SetupGuidePage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Guides</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
        Setup Guide
      </h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-4">
        From install to a running MCP server with a GIGO score above 0.80. Estimated time: 20–30 minutes.
      </p>
      <p className="text-[14px] text-muted-foreground mb-10">
        Before you start, you&apos;ll need Node 18+, a codebase that uses CSS custom properties, and optionally a Figma file key (the part of the URL after <code className="font-mono text-[13px] bg-muted/60 px-1 py-0.5 rounded text-foreground">/design/</code>).
      </p>

      <hr className="border-border/40 mb-10" />

      <div>
        <Step n="1" title="Install">
          <Cmd>npx @systemix/init</Cmd>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
            Answer the prompts: project name, codebase path, CSS entry point, Figma file key (optional).
          </p>
          <p className="text-[12px] text-muted-foreground/60 font-mono mb-2">What gets created:</p>
          <pre className="bg-muted/20 border border-border/40 rounded-xl px-4 py-4 font-mono text-[12px] text-muted-foreground leading-relaxed overflow-x-auto">{`.systemix/
  systemix.json       ← config
  contract.json       ← populated by scan
  tokens.bridge.json  ← hex/rgba conversion layer`}</pre>
        </Step>

        <Step n="2" title="First scan">
          <Cmd>systemix scan</Cmd>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
            Systemix reads your CSS tokens, fetches Figma variables (if configured), and writes <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">contract.json</code>.
          </p>
          <Note>
            Checkpoint: you should see a GIGO score. If it&apos;s below 0.80, that&apos;s expected — you haven&apos;t resolved any conflicts yet.
          </Note>
        </Step>

        <Step n="3" title="Review your drift">
          <Cmd>systemix drift</Cmd>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
            You&apos;ll see a list of conflicts. Start with <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">drifted</code> tokens — these are the highest-value items to resolve.
          </p>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-2">For each conflict, choose:</p>
          <div className="space-y-2 mb-3">
            {[
              { cmd: "code-wins",  label: "Your CSS value is right" },
              { cmd: "figma-wins", label: "The Figma variable is right" },
              { cmd: "defer",      label: "Skip for now" },
            ].map(({ cmd, label }) => (
              <div key={cmd} className="flex items-center gap-3 text-[13px]">
                <code className="font-mono text-[12px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground shrink-0">{cmd}</code>
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </Step>

        <Step n="4" title="Raise your score">
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
            Keep resolving conflicts until GIGO ≥ 0.80. Each resolved conflict raises the score. Run <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">systemix scan</code> again to recalculate.
          </p>
          <Note>
            You don&apos;t need to resolve everything — just enough to hit 0.80. Deferred tokens don&apos;t count against you until the threshold.
          </Note>
        </Step>

        <Step n="5" title="Start the MCP server">
          <Cmd>systemix serve</Cmd>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
            The server starts on <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">localhost:3845</code>. Add it to your Claude Code or Cursor config:
          </p>
          <pre className="bg-muted/20 border border-border/40 rounded-xl px-5 py-4 font-mono text-[12px] text-foreground/80 leading-relaxed overflow-x-auto">{`{
  "mcpServers": {
    "systemix": {
      "command": "systemix",
      "args": ["serve"],
      "port": 3845
    }
  }
}`}</pre>
        </Step>

        <Step n="6" title="Test it">
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">
            Ask your agent: <em className="not-italic text-foreground">&quot;What are the colour tokens in this design system?&quot;</em>
          </p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            It should respond with values sourced from your <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">contract.json</code>, not from guessing.
          </p>
        </Step>
      </div>

      <hr className="border-border/40 my-10" />

      <section>
        <h2 className="text-[1.15rem] font-bold tracking-tight mb-4">Next steps</h2>
        <div className="space-y-2">
          {[
            { href: "/docs/concepts/contract",   label: "contract.json — understand the output format" },
            { href: "/docs/concepts/gigo-score", label: "GIGO Score — what moves the number" },
            { href: "/docs/concepts/drift",      label: "Drift & Reconciliation — deep dive" },
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
