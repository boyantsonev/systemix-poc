import type { Metadata } from "next";
import Link from "next/link";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { NavCTAs, InstallCommand, SectionTrack } from "@/components/systemix/LandingEvents";

export const metadata: Metadata = {
  title: "Systemix — You shipped. Did it work?",
  description: "The contract that holds what you shipped, what the signals said, and what you decided next. Hermes reads PostHog, Vercel, Figma, and social — you decide what ships next. Open source.",
};

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
            The contract for what you ship.
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
    <section className="pt-24 pb-20">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-6">
          The contract for what you ship, measure, and learn
        </p>
        <h1 className="text-[2.75rem] sm:text-[3.5rem] font-black tracking-tight leading-[1.1] mb-6">
          You shipped.<br />
          <span className="text-muted-foreground">Did it work?</span>
        </h1>
        <p className="text-[17px] text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
          A landing page, a component, a feature flag — every experiment leaves signals scattered across PostHog, Vercel, Figma, social. Systemix is the contract that pulls them together. Hermes reads everything. You decide what ships next.
        </p>

        <div className="flex flex-col items-center gap-4">
          <InstallCommand />
          <p className="text-[12px] font-mono text-muted-foreground/40">
            Open source · Works with Claude Code · Cursor · Codex · Gemini CLI
          </p>
        </div>
      </div>
    </section>
  );
}

// ── The Loop (circular diagram) ───────────────────────────────────────────────

function LoopDiagram() {
  const nodes = [
    { id: "ship",     label: "You ship",     sub: "landing, feature, prototype", angle: 270, color: "text-foreground", border: "border-border bg-muted/20" },
    { id: "signals",  label: "Signals",      sub: "PostHog · Vercel · social",   angle: 342, color: "text-cyan-400",   border: "border-cyan-500/30 bg-cyan-500/5" },
    { id: "hermes",   label: "Hermes",       sub: "synthesizes the result",      angle: 54,  color: "text-amber-400",  border: "border-amber-500/30 bg-amber-500/5" },
    { id: "decision", label: "Decision",     sub: "you approve or reject",       angle: 126, color: "text-violet-400", border: "border-violet-500/30 bg-violet-500/5" },
    { id: "contract", label: "Contract",     sub: "evidence written back",       angle: 198, color: "text-emerald-400", border: "border-emerald-500/30 bg-emerald-500/5" },
  ];

  const r = 130;
  const cx = 200;
  const cy = 200;

  return (
    <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-16">
      {/* SVG loop */}
      <div className="shrink-0 relative" style={{ width: 400, height: 400 }}>
        <svg viewBox="0 0 400 400" className="w-full h-full">
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="4 6"
            className="text-border/40"
          />

          {nodes.map((node, i) => {
            const next = nodes[(i + 1) % nodes.length];
            const aRad = (node.angle * Math.PI) / 180;
            const bRad = (next.angle * Math.PI) / 180;
            const ax = cx + r * Math.cos(aRad);
            const ay = cy + r * Math.sin(aRad);
            const bx = cx + r * Math.cos(bRad);
            const by = cy + r * Math.sin(bRad);
            const midAngle = ((node.angle + next.angle) / 2 * Math.PI) / 180;
            const mx = cx + (r + 18) * Math.cos(midAngle);
            const my = cy + (r + 18) * Math.sin(midAngle);
            return (
              <path
                key={node.id}
                d={`M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                markerEnd="url(#arrow)"
                className="text-border/50"
              />
            );
          })}

          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="currentColor" className="text-border/60" />
            </marker>
          </defs>

          {nodes.map((node) => {
            const rad = (node.angle * Math.PI) / 180;
            const x = cx + r * Math.cos(rad);
            const y = cy + r * Math.sin(rad);
            return (
              <circle key={node.id} cx={x} cy={y} r="8" fill="hsl(var(--background))" stroke="currentColor" strokeWidth="1.5" className="text-border" />
            );
          })}
        </svg>

        {nodes.map((node) => {
          const rad = (node.angle * Math.PI) / 180;
          const lx = cx + (r + 52) * Math.cos(rad);
          const ly = cy + (r + 52) * Math.sin(rad);
          return (
            <div
              key={node.id}
              className="absolute text-center"
              style={{
                left: `${(lx / 400) * 100}%`,
                top: `${(ly / 400) * 100}%`,
                transform: "translate(-50%, -50%)",
                width: 100,
              }}
            >
              <p className={`text-[11px] font-bold ${node.color} leading-none mb-0.5`}>{node.label}</p>
              <p className="text-[9px] font-mono text-muted-foreground/50 leading-tight">{node.sub}</p>
            </div>
          );
        })}

        <div
          className="absolute text-center"
          style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
        >
          <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest leading-tight">build<br />measure<br />learn</p>
        </div>
      </div>

      {/* Step-by-step */}
      <div className="flex-1 space-y-0">
        {[
          { n: "01", label: "You ship something", body: "A landing variant, a new component, a feature flag rollout, a Figma update. Anything that has consequences in production." },
          { n: "02", label: "Signals come in",    body: "PostHog tracks behavior. Vercel logs the deploy. Social posts get engagement. Figma drift gets flagged. Systemix listens to all of it." },
          { n: "03", label: "Hermes reads against the contract", body: "A local LLM (any Ollama model) reads the new signals against the contract's history — what was tested before, what was rejected, what worked." },
          { n: "04", label: "A decision card queues for you", body: "Promote the variant. Run longer. Reject the hypothesis. One click. Hermes shows the rationale, you decide." },
          { n: "05", label: "Evidence is written back", body: "The decision, the data, and the date are written into the contract. The next experiment — by you, an agent, or a teammate — starts from this ground." },
        ].map(({ n, label, body }) => (
          <div key={n} className="flex gap-4 pb-5">
            <div className="flex flex-col items-center gap-0 shrink-0">
              <div className="w-6 h-6 rounded-full border border-border/60 flex items-center justify-center text-[9px] font-mono font-bold text-muted-foreground/40 shrink-0">
                {n}
              </div>
              {n !== "05" && <div className="w-px flex-1 bg-border/25 mt-1" />}
            </div>
            <div className="pb-1">
              <p className="text-[13px] font-semibold text-foreground mb-1">{label}</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
        <Link
          href="/docs/concepts/hypothesis-validation"
          className="text-[12px] font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          Deep dive: the hypothesis validation loop →
        </Link>
      </div>
    </div>
  );
}

function TheLoop() {
  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-4xl mx-auto">
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-4">
          How it works
        </p>
        <h2 className="text-[1.75rem] font-black tracking-tight mb-3">
          One contract. Every signal.<br />The decision Hermes wrote so you don&apos;t have to.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-12 max-w-xl">
          The same loop, whether you&apos;re shipping a landing page, a component, or a full prototype. Systemix is the glue between the tools you already use.
        </p>

        <LoopDiagram />
      </div>
    </section>
  );
}

// ── What an experiment can be ────────────────────────────────────────────────

function ExperimentTypes() {
  const types = [
    {
      tag: "landing-page",
      label: "A landing page",
      example: "Test 'evidence layer' vs 'memory layer' framing on ops-role traffic",
      signals: ["PostHog conversion", "Twitter engagement", "Vercel deploy ID"],
      decision: "Promote variant B (+47% CTR · 87% confidence)",
    },
    {
      tag: "component",
      label: "A component",
      example: "Hero CTA button — copy and color variants",
      signals: ["PostHog click events", "Figma drift", "Storybook story"],
      decision: "Keep current variant — 5% lift not significant",
    },
    {
      tag: "feature-flag",
      label: "A feature flag",
      example: "New onboarding flow rolled out to 20% of new users",
      signals: ["PostHog activation funnel", "Retention cohort", "Support tickets"],
      decision: "Run longer — needs 14 days for retention signal",
    },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-4xl mx-auto">
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-4">
          What an experiment can be
        </p>
        <h2 className="text-[1.75rem] font-black tracking-tight mb-3">
          The contract scales with what you ship.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-12 max-w-xl">
          One MDX file per experiment. Same format. Same loop. Whether you&apos;re a builder testing a landing page or a team measuring a design system change — the contract holds the hypothesis, the signals, and the decision.
        </p>

        <div className="grid md:grid-cols-3 gap-3">
          {types.map(({ tag, label, example, signals, decision }) => (
            <div key={tag} className="border border-border/40 rounded-xl px-4 py-4 bg-background flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-mono text-muted-foreground/50 border border-border/40 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              </div>
              <p className="text-[14px] font-bold text-foreground mb-2">{label}</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-4">{example}</p>

              <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-1.5">Signals</p>
              <ul className="space-y-0.5 mb-4">
                {signals.map((s) => (
                  <li key={s} className="text-[11px] font-mono text-muted-foreground/70 flex gap-1.5">
                    <span className="text-muted-foreground/30">→</span>
                    {s}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-3 border-t border-border/30">
                <p className="text-[10px] font-mono text-emerald-400/70 uppercase tracking-widest mb-1">Decision</p>
                <p className="text-[11px] font-mono text-foreground/70 leading-snug">{decision}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── HITL Preview ──────────────────────────────────────────────────────────────

function HitlPreview() {
  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-4">
          Hermes &middot; Live decision card
        </p>
        <h2 className="text-[1.75rem] font-black tracking-tight mb-3">
          Hermes tells you what it found.<br />You decide what happens next.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-10 max-w-xl">
          When the signals reach significance, Hermes surfaces a card with the result, a recommendation, and the contract evidence behind the call. One click writes everything back.
        </p>

        <div className="rounded-xl border border-emerald-500/20 bg-card overflow-hidden mb-6">
          <div className="px-4 pt-3.5 pb-3">
            <div className="flex items-start gap-2.5 mb-3">
              <span className="text-[12px] font-mono mt-px shrink-0 text-emerald-400">◈</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Hypothesis</span>
                  <span className="text-[10px] font-mono text-muted-foreground/30">2h ago</span>
                  <span className="text-[10px] font-mono text-muted-foreground/30">Systemix Landing</span>
                </div>
                <p className="text-[12px] font-mono text-foreground/80 leading-snug">
                  Hero headline — &ldquo;You shipped. Did it work?&rdquo; vs control framing
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide shrink-0 text-amber-400">pending</span>
            </div>

            <div className="pl-5 mb-3 grid grid-cols-3 gap-2">
              {[
                { label: "Baseline", value: "3.2%", sub: "CTR" },
                { label: "Variant B", value: "4.7%", sub: "CTR", highlight: true },
                { label: "Delta", value: "+47%", sub: "↑", highlight: true },
              ].map(({ label, value, sub, highlight }) => (
                <div key={label} className={`rounded border px-2.5 py-2 ${highlight ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/40"}`}>
                  <p className="text-[9px] font-mono text-muted-foreground/40 mb-0.5 uppercase">{label}</p>
                  <p className={`text-[14px] font-mono font-bold ${highlight ? "text-emerald-400" : "text-foreground/60"}`}>{value} <span className="text-[10px]">{sub}</span></p>
                </div>
              ))}
            </div>

            <div className="pl-5 mb-2.5 flex items-center gap-3">
              <div className="w-[60px] h-1 rounded-full bg-muted/40 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500/60" style={{ width: "87%" }} />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/50">87% confidence · 1,240 sessions</span>
            </div>

            <p className="text-[11px] text-muted-foreground/60 leading-relaxed pl-5 mb-2.5">
              Variant B converts better on builder-persona traffic from Twitter and HN. Prior test (March) with the technical-founder framing underperformed 23% on the same audience. Contract history supports promoting B.
            </p>

            <div className="pl-5 mb-3 rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2">
              <p className="text-[9px] font-mono text-emerald-400/60 uppercase tracking-widest mb-1">Hermes recommends</p>
              <p className="text-[11px] font-mono text-emerald-300/80">Promote variant B. Write rationale to contract. Test CTA copy next.</p>
            </div>

            <div className="pl-5 flex items-center gap-1.5">
              <button className="px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors">
                Promote variant
              </button>
              <button className="px-3 py-1 rounded bg-muted border border-border text-muted-foreground text-[10px] font-bold hover:bg-muted/70 transition-colors">
                Run longer
              </button>
              <button className="px-3 py-1 rounded bg-muted border border-border text-muted-foreground/50 text-[10px] font-bold hover:bg-muted/70 transition-colors">
                Discard
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-[13px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            Open the dashboard →
          </Link>
          <Link
            href="/docs/concepts/hitl"
            className="text-[13px] font-mono text-muted-foreground/30 hover:text-muted-foreground transition-colors"
          >
            How HITL works →
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── The tools it connects ─────────────────────────────────────────────────────

function MagicGlue() {
  const tools = [
    { name: "PostHog / Statsig", role: "Where your experiment data already lives. Systemix reads it — nothing moves." },
    { name: "Vercel",            role: "Deploy target. The post-deploy hook tells Hermes a new variant is live, ready to measure." },
    { name: "Figma",             role: "Source of design tokens. Drift between Figma and code is detected and surfaced for resolution before a test starts." },
    { name: "Social signals",    role: "Twitter, LinkedIn, Reddit referrers attributed to specific deploys. Know which channel converted, not just that conversion happened." },
    { name: "Ollama (Hermes)",   role: "Runs the synthesis locally. No API key. Any Ollama-compatible model works as the backend — swap in a config line." },
    { name: "MCP server",        role: "Exposes contracts to Claude Code, Cursor, or any MCP-compatible agent. Agents read the contract before they ship the next variant." },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-4">
          The tools it connects
        </p>
        <h2 className="text-[1.75rem] font-black tracking-tight mb-3">
          Systemix is the magic glue.<br />Not another tool to learn.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-10 max-w-xl">
          The stack you already have is the stack. Systemix wraps around it — listening, synthesizing, writing back to a single contract that everyone (you, your agents, your teammates) reads.
        </p>

        <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/30">
          {tools.map(({ name, role }) => (
            <div key={name} className="flex items-start gap-4 px-5 py-4 bg-background">
              <span className="text-[12px] font-mono font-bold text-foreground/70 shrink-0 w-[160px] pt-0.5">{name}</span>
              <span className="text-[13px] text-muted-foreground leading-relaxed">{role}</span>
            </div>
          ))}
        </div>

        <p className="text-[12px] font-mono text-muted-foreground/40 mt-6">
          No database. No cloud account. No new API to learn. The contract is a file in your repo.
        </p>
      </div>
    </section>
  );
}

// ── Use cases ─────────────────────────────────────────────────────────────────

function UseCases() {
  const cases = [
    {
      audience: "Builders shipping prototypes",
      headline: "Know which experiment moved the metric.",
      body: "Ship a landing variant in the morning. Hermes reads the PostHog signals, the Twitter referrer engagement, and the Vercel deploy. By evening you have a decision card: promote, run longer, or kill. The contract holds the rationale for the next iteration.",
    },
    {
      audience: "Design system teams",
      headline: "Stop re-litigating tokens that production already settled.",
      body: "Every component carries the value, the rationale, and the production result that justified it. Your agent reads the contract before it ships. The variant that won in March doesn't get re-proposed by an agent in October.",
    },
    {
      audience: "PostHog / Statsig teams",
      headline: "Close the loop your analytics never closed.",
      body: "PostHog tells you variant B won. Systemix writes that result into the experiment's contract — attributed, dated, with confidence. Your next test starts from known ground.",
    },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-4">
          Three teams. Same contract.
        </p>
        <h2 className="text-[1.75rem] font-black tracking-tight mb-12">
          Same loop. Different problem solved.
        </h2>

        <div className="grid sm:grid-cols-3 gap-3">
          {cases.map(({ audience, headline, body }) => (
            <div key={audience} className="border border-border/40 rounded-xl px-5 py-5 bg-background">
              <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-3">
                {audience}
              </p>
              <p className="text-[14px] font-bold text-foreground mb-2 leading-snug">
                {headline}
              </p>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Storybook + drift (demoted, supporting context) ───────────────────────────

function StorybookCallout() {
  return (
    <section className="py-20 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-4">
          For design system teams &middot; Why this matters
        </p>
        <h2 className="text-[1.5rem] font-black tracking-tight mb-4">
          Storybook tells your agent what exists.<br />Nobody tells it what worked.
        </h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-6 max-w-2xl">
          You can document a component. You can sync it across Figma and code. You can write a story for it. But you still can&apos;t answer the question that decides the next sprint: <em>did this design decision work?</em> The contract carries the answer — measured in production, attributed to the variant, dated.
        </p>

        <div className="rounded-xl border border-border/40 bg-muted/5 px-5 py-4">
          <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">Drift detection — supporting layer</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Before any test result can be trusted, the component has to be in a known state. Systemix tracks Figma↔code token drift and surfaces it as a HITL card — so you know whether you measured what you designed, not a drifted variant.{" "}
            <Link href="/design-system" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2">
              Design System health →
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Quality gate ──────────────────────────────────────────────────────────────

function QualityGate() {
  const tiers = [
    { score: "≥ 80", state: "Evidence-ready",  dot: "bg-emerald-500", body: "Contract is backed. Recent production signals attached, drift cleared, decision history recorded. Safe for agents to read, safe for the next experiment to build on." },
    { score: "≥ 60", state: "Partial evidence", dot: "bg-amber-500",   body: "Some claims are unbacked. Either drift is unresolved or production signals are stale. Your agent will still read the contract — but the next decision is partly a guess." },
    { score: "< 60", state: "Unbacked",         dot: "bg-red-400",     body: "Too many open questions. No recent signals, contradictions Hermes flagged, or unresolved decisions. Don't ship from this contract until it's triaged." },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-4">
          An evidence score on every contract.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-12 max-w-xl">
          Systemix scores every contract from 0 to 100. The score reflects how much of the experiment is backed by evidence: signals attached, decisions recorded, drift cleared. It&apos;s the single number that tells your agent — and your team — whether the contract is ready to be relied on.
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
          The score rises as evidence accumulates. It drops when signals go stale, when a decision is overridden without rationale, or when drift goes unresolved. Target: ≥ 80 on every contract you ship from.
        </p>
      </div>
    </section>
  );
}

// ── Bottom CTA ────────────────────────────────────────────────────────────────

function BottomCTA() {
  const steps = [
    { n: "1", label: "Run Hermes locally",      cmd: "ollama pull hermes3", comment: "any Ollama model works · no API key · no cloud" },
    { n: "2", label: "Initialize Systemix",     cmd: "npx systemix init",   comment: "creates contracts/, connects to PostHog, sets up the Vercel hook" },
    { n: "3", label: "Start the loop",          cmd: "npx systemix watch",  comment: "Hermes pulls signals, queues HITL decisions" },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-4">
          Run it locally in three commands.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-10 max-w-xl">
          No database. No cloud account. No new API. Hermes runs on Ollama, the contract lives in your repo, and the signals come from where they already are. Works for any experiment you ship — not just design systems.
        </p>

        <div className="space-y-px rounded-xl overflow-hidden border border-border/40 mb-8">
          {steps.map(({ n, label, cmd, comment }) => (
            <div key={n} className="flex items-start gap-4 px-5 py-4 bg-background border-b border-border/40 last:border-0">
              <span className="shrink-0 text-[11px] font-mono text-muted-foreground/30 tabular-nums pt-0.5">{n}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-foreground mb-1">{label}</p>
                <code className="text-[12px] font-mono text-muted-foreground/70">{cmd}</code>
                <span className="text-[12px] font-mono text-muted-foreground/40 ml-2"># {comment}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border/40 bg-muted/5 px-5 py-4 mb-8">
          <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">MCP server</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-2">
            Add Systemix as an MCP server in Claude Code or Cursor. Every agent query gets the contract, the signals, and the score — not a guess.
          </p>
          <code className="text-[12px] font-mono text-foreground/60 bg-muted/40 px-2 py-1 rounded">
            npx systemix mcp
          </code>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/docs/quick-install"
            className="text-[13px] font-medium text-foreground hover:opacity-70 transition-opacity"
          >
            See the full workflow →
          </Link>
          <Link
            href="/docs/concepts/hermes"
            className="text-[13px] font-mono text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            Configure a different model →
          </Link>
        </div>
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
        <SectionTrack name="the-loop"><TheLoop /></SectionTrack>
        <SectionTrack name="experiment-types"><ExperimentTypes /></SectionTrack>
        <SectionTrack name="hitl-preview"><HitlPreview /></SectionTrack>
        <SectionTrack name="magic-glue"><MagicGlue /></SectionTrack>
        <SectionTrack name="use-cases"><UseCases /></SectionTrack>
        <SectionTrack name="storybook-callout"><StorybookCallout /></SectionTrack>
        <SectionTrack name="quality-gate"><QualityGate /></SectionTrack>
        <SectionTrack name="bottom-cta"><BottomCTA /></SectionTrack>
      </main>
      <LandingFooter />
    </div>
  );
}
