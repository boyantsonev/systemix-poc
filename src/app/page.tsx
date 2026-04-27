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
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/contract"
            className="text-[12px] font-medium border border-border text-foreground px-3 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
          >
            Try Contract →
          </Link>
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
            One infrastructure. Two use cases.
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
          One infrastructure · Two use cases
        </p>
        <h1 className="text-[2.75rem] sm:text-[3.5rem] font-black tracking-tight leading-[1.1] mb-6">
          Your design system<br />
          <span className="text-muted-foreground">is lying to you.</span>
        </h1>
        <p className="text-[17px] text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
          Token drift means your A/B test measured a variant nobody designed. Your platform migration starts from a Figma file nobody fully trusts. Systemix puts a verified contract between your design system and everything downstream — so the feedback loop is clean, and the baseline is real.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="https://github.com/boyantsonev/systemix-poc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[13px] font-medium bg-foreground text-background px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
          >
            Star on GitHub →
          </a>
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
      name: "Resolve",
      desc: "Conflicts surface in the contract UI. Each token shows both values, the perceptual difference (ΔE), and an inline decision control. Every resolution is recorded with rationale. The quality score tracks how many contracts are clean.",
    },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-2">
          How it works
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-6 max-w-xl">
          A pipeline that turns scattered design sources into a single, machine-readable contract — with lineage, rationale, and a quality score attached to every token.
        </p>
        <Link
          href="/graph"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-14"
        >
          See the full architecture diagram →
        </Link>

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

function TwoUseCases() {
  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-4">
          One infrastructure · Two use cases
        </p>
        <h2 className="text-[1.75rem] font-black tracking-tight mb-14">
          Same contract layer.<br />Different problem solved.
        </h2>

        <div className="grid sm:grid-cols-2 gap-px bg-border/40 rounded-xl overflow-hidden border border-border/40">
          {/* Use case 1 */}
          <div className="bg-background px-6 py-8">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-3">
              Use case 01
            </p>
            <p className="text-[16px] font-bold text-foreground mb-3 leading-snug">
              Test faster. Measure what you actually designed.
            </p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
              If a token drifted before your test ran, PostHog gave you an answer to the wrong question. Systemix keeps tokens and components in sync with your Figma source so every variant ships clean. The feedback loop runs on real data — not whatever the agent ingested last.
            </p>
            <div className="space-y-1.5">
              {[
                "Product teams shipping and testing variants",
                "Agencies building fast prototypes for clients",
                "AI-assisted workflows where agents author components",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                  <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-muted-foreground/40" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Use case 2 */}
          <div className="bg-background px-6 py-8 border-t sm:border-t-0 sm:border-l border-border/40">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-3">
              Use case 02
            </p>
            <p className="text-[16px] font-bold text-foreground mb-3 leading-snug">
              Know what you actually have before you redesign anything.
            </p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
              Inherited a platform nobody fully documented? Systemix audits every token and component, surfaces drift with perceptual accuracy (ΔE color difference), and gives you a structured path from chaos to a clean baseline. One number — the quality score — tells you when the system is trustworthy enough to build on.
            </p>
            <div className="space-y-1.5">
              {[
                "Enterprise design system teams doing platform redesigns",
                "Design ops managing drift across multiple codebases",
                "Consultancies inheriting a client's messy token layer",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                  <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-muted-foreground/40" />
                  {item}
                </div>
              ))}
            </div>
          </div>
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
    { n: "2", label: "Start the UI",       cmd: "npm run dev",         comment: "open /contract in the browser" },
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

        <a
          href="/docs/quick-install"
          className="text-[13px] font-medium text-foreground hover:opacity-70 transition-opacity"
        >
          See the full workflow →
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
        <TwoUseCases />
        <Problem />
        <QualityGate />
        <HowItWorks />
        <BottomCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
