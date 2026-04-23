import Link from "next/link";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";

// ── Nav ──────────────────────────────────────────────────────────────────────

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <SLogo size={16} className="text-foreground" />
          <span className="text-[13px] font-black tracking-tight">systemix</span>
        </Link>

        <nav className="flex items-center gap-1 ml-4">
          <Link href="/docs" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50">
            Docs
          </Link>
          <a
            href="https://github.com/boyantsonev/systemix"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50"
          >
            GitHub
          </a>
          <Link href="/dashboard" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50">
            Dashboard
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/docs/quick-install"
            className="text-[12px] font-medium bg-foreground text-background px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity"
          >
            Get started →
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="border-t border-border/50 mt-32">
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <SLogo size={14} className="text-muted-foreground/40" />
          <span className="text-[12px] text-muted-foreground/40 font-mono">
            The design contract layer for agents and teams.
          </span>
        </div>
        <div className="flex items-center gap-4 text-[12px] text-muted-foreground/40 font-mono">
          <a
            href="https://github.com/boyantsonev/systemix"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors"
          >
            GitHub
          </a>
          <Link href="/docs" className="hover:text-muted-foreground transition-colors">
            Docs
          </Link>
          <span className="border border-border/50 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide font-bold">
            Open source
          </span>
        </div>
      </div>
    </footer>
  );
}

// ── Sections ─────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-24 pb-24">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-[2.75rem] sm:text-[3.5rem] font-black tracking-tight leading-[1.1] mb-6">
          Your design tokens are<br />
          <span className="text-muted-foreground">lying to your agents.</span>
        </h1>
        <p className="text-[17px] text-muted-foreground leading-relaxed max-w-lg mx-auto mb-10">
          Systemix builds a verified contract between Figma, your codebase, and every AI tool in your workflow — so agents stop hallucinating design decisions.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-4 py-2.5 font-mono text-[13px] select-all cursor-text">
            <span className="text-muted-foreground/40 select-none">$</span>
            npx @systemix/init
          </div>
          <Link
            href="/docs/quick-install"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Read the docs →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  const pains = [
    {
      label: "Figma drift",
      body: "Variable collections and CSS tokens diverge without anyone noticing.",
    },
    {
      label: "Agent hallucination",
      body: "LLMs confidently use the wrong token name because your sources disagree.",
    },
    {
      label: "No audit trail",
      body: "When a decision changes, there's no record of why — just a diff no one remembers.",
    },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-4">
          Design systems drift.<br />Agents make it worse.
        </h2>
        <div className="text-[15px] text-muted-foreground leading-relaxed space-y-4 mb-14 max-w-2xl">
          <p>
            Figma says <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded">primary</code> is{" "}
            <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded">#1a56db</code>. Your CSS says{" "}
            <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded">oklch(0.45 0.18 250)</code>. Your agent picks whichever it saw last and ships it.
          </p>
          <p>
            The problem isn&apos;t your team. It&apos;s that nothing formally owns the contract between your design system&apos;s sources of truth.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-px bg-border/40 rounded-xl overflow-hidden border border-border/40">
          {pains.map(({ label, body }) => (
            <div key={label} className="bg-background px-5 py-6">
              <p className="text-[12px] font-bold text-foreground/80 mb-2 uppercase tracking-wide">{label}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const stages = [
    {
      n: "01",
      name: "Ingest",
      desc: "Pull tokens, components, and variables from Figma, CSS, and your codebase. Every value is traced to its source.",
    },
    {
      n: "02",
      name: "Reconcile",
      desc: "When sources disagree, Systemix applies your rules — not guesses. Code wins, Figma wins, or you decide. Every conflict is logged.",
    },
    {
      n: "03",
      name: "Rationale",
      desc: "Decisions are annotated with the why. Deprecated tokens point to their replacements. Agents read the intent, not just the value.",
    },
    {
      n: "04",
      name: "Serve",
      desc: "The contract is exposed via MCP. Any agent — Claude Code, Cursor, Copilot — can ask for a verified, sourced answer.",
    },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-2">
          Four stages. One contract.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-14 max-w-xl">
          A pipeline that turns scattered design sources into a single, machine-readable contract — with lineage, rationale, and a quality score baked in.
        </p>

        <div className="space-y-px">
          {stages.map(({ n, name, desc }, i) => (
            <div key={n} className="flex gap-6 py-6 border-b border-border/40 last:border-0">
              <div className="shrink-0 w-8 pt-0.5">
                <span className="text-[11px] font-mono text-muted-foreground/30 tabular-nums">{n}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-foreground mb-1">{name}</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{desc}</p>
              </div>
              {i < stages.length - 1 && (
                <div className="shrink-0 self-center text-muted-foreground/20 text-[11px] font-mono hidden sm:block">→</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function UseCases() {
  const personas = [
    {
      label: "Consultancies managing multiple client themes",
      body: "You maintain 8 brands on one design system. Each client has token overrides, custom fonts, and a Figma file that's always slightly out of date. Systemix tracks which tokens are client-specific, which are shared, and flags the moment a shared base token breaks a client theme.",
    },
    {
      label: "AI-first product teams",
      body: "Your agents write components. They need to know what tokens exist, which are deprecated, and what the GIGO score is before they touch anything. Systemix is the MCP server your agents were waiting for.",
    },
    {
      label: "Solo engineers with a design system debt problem",
      body: "You've got 200 hardcoded hex values, a Figma file no one fully trusts, and a backlog of \"fix the tokens\" tickets. Systemix gives you a score, a ranked list of conflicts, and a path to ≥ 90%.",
    },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-14">
          Built for teams where design<br />and code both matter.
        </h2>

        <div className="space-y-px">
          {personas.map(({ label, body }) => (
            <div key={label} className="py-6 border-b border-border/40 last:border-0">
              <p className="text-[14px] font-bold text-foreground mb-2">{label}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed max-w-2xl">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GigoCallout() {
  const tiers = [
    { score: "≥ 90%", state: "Green", dot: "bg-emerald-500", body: "Contract is clean. Agent reads are reliable. Safe to ship." },
    { score: "≥ 80%", state: "Amber", dot: "bg-amber-500", body: "Drifts exist. Agents will encounter ambiguity. Triage recommended." },
    { score: "< 80%", state: "Red. Pipeline halts.", dot: "bg-red-400", body: "Data quality is too low to trust agent decisions. Fix conflicts before proceeding." },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-4">
          Know before you ship.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-12 max-w-xl">
          GIGO — Garbage In, Garbage Out — is Systemix&apos;s quality signal for your contract. It measures how trustworthy your design system data is before it reaches an agent or a CI gate.
        </p>

        <div className="space-y-px rounded-xl overflow-hidden border border-border/40">
          {tiers.map(({ score, state, dot, body }) => (
            <div key={score} className="flex items-start gap-4 px-5 py-5 bg-background border-b border-border/40 last:border-0">
              <span className={`mt-1 shrink-0 inline-block w-2 h-2 rounded-full ${dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground mb-1">
                  <span className="font-mono">{score}</span>
                  {" — "}
                  {state}
                </p>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[13px] text-muted-foreground leading-relaxed mt-6 max-w-xl">
          The score rises as you resolve conflicts. It drops when sources drift apart. It&apos;s a forcing function, not a vanity metric.
        </p>
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-10">
          Start in three commands.
        </h2>

        <div className="bg-muted/30 border border-border/40 rounded-xl px-5 py-5 font-mono text-[13px] space-y-2 mb-8">
          {[
            { cmd: "npx @systemix/init", comment: "scaffold config + .systemix folder" },
            { cmd: "systemix scan",      comment: "ingest sources, build contract.json" },
            { cmd: "systemix serve",     comment: "start MCP server on localhost:3845" },
          ].map(({ cmd, comment }) => (
            <div key={cmd} className="flex items-center gap-3">
              <span className="text-muted-foreground/30 select-none">$</span>
              <span className="text-foreground">{cmd}</span>
              <span className="text-muted-foreground/40 hidden sm:inline">{"# " + comment}</span>
            </div>
          ))}
        </div>

        <p className="text-[14px] text-muted-foreground mb-6">
          Your agent can now ask: &quot;What are the colour tokens?&quot; and get a sourced, versioned answer.
        </p>

        <a
          href="/docs/guides/setup"
          className="text-[13px] font-medium text-foreground hover:opacity-70 transition-opacity"
        >
          Read the getting started guide →
        </a>
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main className="max-w-4xl mx-auto px-6">
        <Hero />
        <Problem />
        <HowItWorks />
        <UseCases />
        <GigoCallout />
        <BottomCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
