import Link from "next/link";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { NavCTAs, InstallCommand, SectionTrack } from "@/components/systemix/LandingEvents";

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
          <Link href="/docs" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 hover:bg-muted/50">
            Docs
          </Link>
          <a
            href="https://github.com/boyantsonev/systemix"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 hover:bg-muted/50"
          >
            GitHub
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <NavCTAs />
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
            The Memory Layer for managing design systems.
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
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-6">
          The Memory Layer for managing design systems
        </p>
        <h1 className="text-[2.75rem] sm:text-[3.5rem] font-black tracking-tight leading-[1.1] mb-6">
          Your design system<br />
          <span className="text-muted-foreground">is lying to you.</span>
        </h1>
        <p className="text-[17px] text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
          Token drift means your A/B test measured a variant nobody designed. Your platform migration starts from a Figma file nobody fully trusts. Systemix puts a verified contract between your design system and everything downstream — so the feedback loop is clean, and the baseline is real.
        </p>

        <div className="flex justify-center">
          <InstallCommand />
        </div>

        <p className="text-[12px] font-mono text-muted-foreground/40 mt-6 max-w-md mx-auto leading-relaxed">
          When an agent asks &quot;what is <code className="text-muted-foreground/60">--color-primary</code>?&quot; — the contract answers. Not a hallucination.
        </p>
      </div>
    </section>
  );
}

function WorksWith() {
  const tools = [
    {
      name: "Claude Code",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 1.5a8.5 8.5 0 110 17 8.5 8.5 0 010-17zm0 3.25a.75.75 0 00-.75.75v3.75H7.5a.75.75 0 000 1.5h3.75v3.75a.75.75 0 001.5 0v-3.75h3.75a.75.75 0 000-1.5h-3.75V7.5A.75.75 0 0012 6.75z" />
        </svg>
      ),
    },
    {
      name: "Codex",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <path d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 004.981 4.18a5.985 5.985 0 00-3.998 2.9 6.046 6.046 0 00.743 7.097 5.98 5.98 0 00.51 4.911 6.051 6.051 0 006.515 2.9A5.985 5.985 0 0013.26 24a6.056 6.056 0 005.772-4.206 5.99 5.99 0 003.997-2.9 6.056 6.056 0 00-.747-7.073zM13.26 22.43a4.476 4.476 0 01-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 00.392-.681v-6.737l2.02 1.168a.071.071 0 01.038.052v5.583a4.504 4.504 0 01-4.494 4.494zM3.6 18.304a4.47 4.47 0 01-.535-3.014l.142.085 4.783 2.759a.771.771 0 00.78 0l5.843-3.369v2.332a.08.08 0 01-.033.062L9.74 19.95a4.5 4.5 0 01-6.14-1.646zM2.34 7.896a4.485 4.485 0 012.366-1.973V11.6a.766.766 0 00.388.676l5.815 3.355-2.02 1.168a.076.076 0 01-.071 0l-4.83-2.786A4.504 4.504 0 012.34 7.896zm16.597 3.868l-5.843-3.38 2.019-1.164a.076.076 0 01.072 0l4.83 2.786a4.49 4.49 0 01-.676 8.105v-5.683a.79.79 0 00-.402-.664zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 00-.785 0L9.409 9.23V6.897a.066.066 0 01.028-.061l4.83-2.787a4.5 4.5 0 016.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 01-.038-.057V6.075a4.5 4.5 0 017.375-3.453l-.142.08-4.778 2.758a.795.795 0 00-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
        </svg>
      ),
    },
    {
      name: "Gemini CLI",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      ),
    },
    {
      name: "OpenCode",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
    },
    {
      name: "Cursor",
      icon: (
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 12h8M12 8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="border-t border-border/40 py-5">
      <div className="flex items-center gap-6 flex-wrap justify-center">
        <span className="text-[11px] font-mono text-muted-foreground/30 uppercase tracking-widest shrink-0">
          Works with
        </span>
        {tools.map(({ name, icon }) => (
          <div key={name} className="flex items-center gap-1.5 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors">
            {icon}
            <span className="text-[12px] font-medium">{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Problem() {
  const pains = [
    {
      label: "Figma drift",
      body: "Variable collections and CSS tokens diverge without anyone noticing — quietly poisoning every prototype that ships.",
    },
    {
      label: "Unreliable data",
      body: "PostHog tells you the variant won. But if the token drifted before the test, you measured the wrong thing.",
    },
    {
      label: "Unknown baseline",
      body: "Years of software, a Figma file nobody fully trusts, hundreds of tokens with no clear owner. Before redesigning, you need to know what you actually have.",
    },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-4">
          Design systems drift.<br />Everything downstream suffers.
        </h2>
        <div className="text-[15px] text-muted-foreground leading-relaxed space-y-4 mb-14 max-w-2xl">
          <p>
            Figma says <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded">primary</code> is{" "}
            <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded">#1a56db</code>. Your CSS says{" "}
            <code className="font-mono text-[13px] bg-muted/60 px-1.5 py-0.5 rounded">oklch(0.45 0.18 250)</code>. Your agent ships whichever it saw last. Your test measures a variant nobody designed.
          </p>
          <p>
            The problem isn&apos;t your team. Nothing formally owns the contract between your design system&apos;s sources of truth.
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
  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-3">
          How it works
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-12 max-w-xl">
          PostHog tells you what happened. Hermes reads the contract memory — past results, prior decisions, rationale — and tells you why and what to test next. Every decision is written back to the contract so the next hypothesis starts from known ground.
        </p>

        {/* Hypothesis validation loop */}
        <div className="rounded-xl border border-border/40 bg-muted/5 overflow-hidden mb-6">
          <div className="px-4 py-2.5 border-b border-border/30 flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground/50">Hypothesis validation — what the loop looks like</span>
            <Link
              href="/dashboard"
              className="text-[11px] font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              Open Dashboard →
            </Link>
          </div>

          {/* Experiment result */}
          <div className="px-4 py-4 border-b border-border/20">
            <div className="flex items-center gap-3 mb-3">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium bg-cyan-500/15 text-cyan-400 border-cyan-500/30">
                experiment
              </span>
              <span className="text-[13px] font-mono text-foreground">Hero headline — variant A vs B</span>
              <span className="text-[10px] font-mono text-emerald-400 ml-auto">87% confidence</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: "Baseline (A)",  value: "3.2% CTR",  color: "text-muted-foreground" },
                { label: "Variant (B)",   value: "4.7% CTR",  color: "text-emerald-400"       },
                { label: "Delta",         value: "+47%  ↑",   color: "text-emerald-400"       },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg border border-border/40 px-3 py-2.5">
                  <p className="text-[10px] font-mono text-muted-foreground/50 mb-1">{label}</p>
                  <p className={`text-[13px] font-mono font-medium ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Hermes synthesis */}
            <div className="rounded-lg bg-muted/30 border border-border/30 px-3 py-2.5 mb-4">
              <p className="text-[10px] font-mono text-amber-400/70 uppercase tracking-widest mb-1.5">Hermes synthesis</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Variant B shows significant uplift at 87% confidence. Contract memory: the provocative framing tested in March performed 23% below baseline on the same segment. Recommend promoting variant B and updating the contract rationale.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 rounded border border-border/50 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                Promote variant
              </button>
              <button className="px-3 py-1.5 rounded border border-border/50 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:border-border transition-colors">
                Run longer
              </button>
              <span className="text-[11px] font-mono text-muted-foreground/30 ml-2">— decision is written to the contract</span>
            </div>
          </div>

          {/* Memory trace */}
          <div className="px-4 py-3 flex items-center gap-3 opacity-50">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium bg-blue-500/15 text-blue-400 border-blue-500/30">
              remembered
            </span>
            <span className="text-[12px] font-mono text-muted-foreground">Hero headline — contract updated 2026-04-27</span>
            <span className="text-[10px] font-mono text-muted-foreground/40 ml-auto">next test will read this</span>
          </div>
        </div>

        {/* Pipeline reference — secondary */}
        <div className="grid grid-cols-3 gap-3 mb-6 opacity-70">
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 mb-3 px-1">Sources</p>
            {[
              { label: "PostHog events", color: "bg-cyan-400"    },
              { label: "contract/",      color: "bg-blue-400"    },
              { label: "globals.css",    color: "bg-violet-400"  },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-muted/10">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
                <span className="text-[12px] font-mono text-muted-foreground truncate">{label}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 mb-3 px-1">Skills</p>
            {["/tokens", "/component", "/drift-report", "/deploy"].map((cmd) => (
              <div key={cmd} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-muted/10">
                <span className="text-muted-foreground/20 text-[10px] shrink-0">→</span>
                <code className="text-[12px] font-mono text-foreground/70">{cmd}</code>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 mb-3 px-1">Output</p>
            <div className="px-3 py-2 rounded-lg border border-border/40 bg-muted/10">
              <p className="text-[12px] font-mono text-muted-foreground">contract/</p>
              <p className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">memory per token + decision</p>
            </div>
            <div className="px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <p className="text-[12px] font-mono text-emerald-400">Score 83 / 100</p>
              <p className="text-[10px] font-mono text-muted-foreground/40 mt-0.5">healthy · 2 pending</p>
            </div>
          </div>
        </div>

        <Link
          href="/docs/architecture"
          className="text-[13px] text-muted-foreground/50 hover:text-muted-foreground transition-colors font-mono"
        >
          See full architecture diagram →
        </Link>
      </div>
    </section>
  );
}

function SectionGlossary() {
  const tools = [
    {
      name: "Dashboard",
      href: "/dashboard",
      tag: "app",
      desc: "Quality score overview across all your projects. Shows which projects have drifted tokens, pending decisions, and how connected each adapter is.",
    },
    {
      name: "Design System",
      href: "/design-system",
      tag: "triage + docs",
      desc: "Token and component parity in one place. See what drifted, compare code vs Figma values, make a resolution decision, and read the documentation Hermes authors as you go.",
    },
    {
      name: "Skills",
      href: "/docs/skills",
      tag: "commands",
      desc: "Slash commands you run inside Claude Code, Cursor, or any MCP editor. /figma reads Figma. /tokens syncs variables. /component maps code to design. /storybook links stories.",
    },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-3">
          What each part does
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-12 max-w-xl">
          Four tools. One workflow.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {tools.map(({ name, href, tag, desc }) => (
            <Link
              key={href}
              href={href}
              className="block border border-border/40 rounded-xl px-5 py-5 hover:border-border hover:bg-muted/20 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[14px] font-bold text-foreground group-hover:text-foreground">{name}</p>
                <span className="text-[10px] font-mono text-muted-foreground/40 border border-border/40 px-1.5 py-0.5 rounded">{tag}</span>
              </div>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function TwoUseCases() {
  const cases = [
    {
      audience: "Product teams",
      headline: "Measure what you actually designed.",
      body: "If a token drifted before your test ran, PostHog gave you an answer to the wrong question. Systemix keeps tokens in sync with Figma so every variant ships clean and the feedback loop runs on real data.",
    },
    {
      audience: "Agencies",
      headline: "Deliver on a verified baseline every sprint.",
      body: "Client approves the Figma. You ship the code. Systemix proves they match — and writes the rationale so the next agency doesn't have to reverse-engineer your decisions.",
    },
    {
      audience: "Legacy design systems",
      headline: "Know what you have before you redesign.",
      body: "Inherited a platform nobody documented? Systemix audits every token and component, surfaces drift with perceptual accuracy (ΔE), and gives you a quality score that rises as you resolve conflicts.",
    },
    {
      audience: "AI-assisted builders",
      headline: "Give your agents a memory.",
      body: "When an agent asks what --color-primary is, it reads the contract — not a stale comment or a hallucinated value. Every resolved token becomes a fact the whole pipeline can trust.",
    },
    {
      audience: "Consultancies",
      headline: "Turn audits into a repeatable deliverable.",
      body: "Run the pipeline on a client's repo. Export the contract. Hand over a structured audit with quality scores, drift findings, and Hermes-authored rationale — in hours, not weeks.",
    },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-4">
          One memory layer · Five use cases
        </p>
        <h2 className="text-[1.75rem] font-black tracking-tight mb-12">
          Same contract. Different problem solved.
        </h2>

        <div className="grid sm:grid-cols-2 gap-3">
          {cases.map(({ audience, headline, body }) => (
            <div key={audience} className="border border-border/40 rounded-xl px-5 py-6 bg-background">
              <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-3">
                {audience}
              </p>
              <p className="text-[14px] font-bold text-foreground mb-2 leading-snug">
                {headline}
              </p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QualityGate() {
  const tiers = [
    { score: "≥ 80", state: "Clean",           dot: "bg-emerald-500", body: "Most contracts are resolved. The design system is trustworthy — for agents, for prototypes, and for stakeholder sign-off." },
    { score: "≥ 60", state: "Needs attention", dot: "bg-amber-500",   body: "Unresolved drift exists. Prototypes may ship inconsistencies. Triage before relying on the contract." },
    { score: "< 60", state: "Critical",        dot: "bg-red-400",     body: "Too many unresolved conflicts. The contract is not reliable. Resolve open drift before using in any workflow." },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-4">
          A quality score on every contract.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-12 max-w-xl">
          Systemix calculates a 0–100 quality score from the ratio of clean tokens, unresolved drift, and missing Figma coverage. It&apos;s the single number that tells you whether the design system can be trusted downstream — for testing, for agents, for a platform migration.
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
          The score rises as you resolve conflicts. It drops when Figma and code drift apart. Both use cases converge on the same target: ≥ 80.
        </p>
      </div>
    </section>
  );
}

function BottomCTA() {
  const steps = [
    { n: "1", label: "Run Hermes locally", cmd: "ollama pull hermes3", comment: "local LLM — no API key needed" },
    { n: "2", label: "Start the UI",       cmd: "npm run dev",         comment: "open /design-system in the browser" },
    { n: "3", label: "Resolve drift",      cmd: "",                    comment: "click any token → see ΔE → decide" },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-4">
          Run it locally.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-10 max-w-xl">
          Hermes authors contracts locally via Ollama — no API key, no cloud. The quality score and drift resolution live in the browser.
        </p>

        <div className="space-y-px rounded-xl overflow-hidden border border-border/40 mb-8">
          {steps.map(({ n, label, cmd, comment }) => (
            <div key={n} className="flex items-start gap-4 px-5 py-4 bg-background border-b border-border/40 last:border-0">
              <span className="shrink-0 text-[11px] font-mono text-muted-foreground/30 tabular-nums pt-0.5">{n}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground mb-1">{label}</p>
                {cmd && (
                  <code className="text-[12px] font-mono text-muted-foreground/70">{cmd}</code>
                )}
                <span className="text-[12px] font-mono text-muted-foreground/40 ml-2"># {comment}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[13px] text-muted-foreground leading-relaxed mb-6 max-w-xl">
          Each token gets a contract file: code value, Figma value, perceptual distance, and a rationale written by Hermes. You approve or override. The score rises.
        </p>

        <Link
          href="/docs/quick-install"
          className="text-[13px] font-medium text-foreground hover:opacity-70 transition-opacity"
        >
          See the full workflow →
        </Link>
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
        <WorksWith />
        <SectionTrack name="two-use-cases"><TwoUseCases /></SectionTrack>
        <SectionTrack name="problem"><Problem /></SectionTrack>
        <SectionTrack name="how-it-works"><HowItWorks /></SectionTrack>
        <SectionTrack name="glossary"><SectionGlossary /></SectionTrack>
        <SectionTrack name="quality-gate"><QualityGate /></SectionTrack>
        <SectionTrack name="bottom-cta"><BottomCTA /></SectionTrack>
      </main>
      <LandingFooter />
    </div>
  );
}
