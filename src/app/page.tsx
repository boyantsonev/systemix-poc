import Link from "next/link";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { HeroCTAs, NavCTAs, InstallCommand, SectionTrack } from "@/components/systemix/LandingEvents";

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
        <HeroCTAs />

        <div className="mt-5 flex justify-center">
          <InstallCommand />
        </div>

        <p className="text-[12px] font-mono text-muted-foreground/40 mt-6 max-w-md mx-auto leading-relaxed">
          When an agent asks &quot;what is <code className="text-muted-foreground/60">--color-primary</code>?&quot; — the contract answers. Not a hallucination.
        </p>
      </div>
    </section>
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
