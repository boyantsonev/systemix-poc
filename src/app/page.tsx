import type { Metadata } from "next";
import Link from "next/link";
import { SLogo } from "@/components/systemix/SLogo";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { NavCTAs, InstallCommand, SectionTrack } from "@/components/systemix/LandingEvents";

export const metadata: Metadata = {
  title: "Systemix — Ship daily. Learn daily.",
  description: "You build at agent speed. Systemix closes the loop the day each experiment resolves — every result recorded in your repo, so the next thing you (or your agent) ship starts from evidence, not memory. Open source. Runs locally.",
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
            The hypothesis loop for builders.
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
          For builders shipping with Claude Code
        </p>
        <h1 className="text-[2.75rem] sm:text-[3.5rem] font-black tracking-tight leading-[1.1] mb-6">
          You ship every day.<br />
          <span className="text-muted-foreground">Your system should learn every day too.</span>
        </h1>
        <p className="text-[17px] text-muted-foreground leading-relaxed max-w-xl mx-auto mb-10">
          You&apos;re building at agent speed — a new variant a day. But learning still happens manually, a quarter behind. Systemix closes the loop the day each experiment resolves: every result recorded in your repo, so the next thing you ship — or your agent ships — starts from evidence, not memory.
        </p>

        <div className="flex flex-col items-center gap-4">
          <InstallCommand />
          <p className="text-[12px] font-mono text-muted-foreground/40">
            Hermes runs on Ollama — no API key, no cloud, no data leaving your machine.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── The gap, made concrete ────────────────────────────────────────────────────

function TheGap() {
  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-4">
          The gap
        </p>
        <h2 className="text-[1.75rem] font-black tracking-tight mb-3">
          Your shipping got 10× faster.<br />
          <span className="text-muted-foreground">Your learning didn&apos;t.</span>
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-10 max-w-xl">
          Agents let you ship a variant a day. But every ship still lands in a vacuum — PostHog records what happened, then nobody reads it back. The next agent starts from the same blank slate. Speed without a learning loop isn&apos;t compounding. It&apos;s just more guesses, faster.
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border border-border/40 rounded-xl px-5 py-4 bg-background">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-1.5">Your ship cadence</p>
            <p className="text-[15px] font-mono font-bold text-foreground">Daily</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed mt-1">A new variant every day — landing copy, onboarding, a pricing test.</p>
          </div>
          <div className="border border-border/40 rounded-xl px-5 py-4 bg-background">
            <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-1.5">Your learn cadence</p>
            <p className="text-[15px] font-mono font-bold text-muted-foreground/60">Quarterly &mdash; if ever</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed mt-1">Results sit in PostHog. Rationale lives in your head, or a Slack thread from March.</p>
          </div>
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
            // When next.angle wraps past 360°, add 360 before averaging to keep
            // the control point on the correct (short) arc side.
            const nextDeg = next.angle < node.angle ? next.angle + 360 : next.angle;
            const midAngle = ((node.angle + nextDeg) / 2 * Math.PI) / 180;
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
          { n: "01", label: "You write a hypothesis", body: "A landing variant, a copy test, a new onboarding flow. One MDX file with the question you're testing and what winning looks like. Takes 2 minutes." },
          { n: "02", label: "You ship it",           body: "PostHog picks up the events. Vercel logs the deploy. Social signals come in. Systemix listens — nothing moves, nothing new to learn." },
          { n: "03", label: "Hermes reads what happened", body: "A local LLM (any Ollama model) reads the signals against your contract's history — prior tests, rejected directions, original intent. No API key." },
          { n: "04", label: "A decision card queues for you", body: "Promote. Run longer. Kill it. Hermes shows the synthesis. You make the call. One click." },
          { n: "05", label: "The loop closes",       body: "Evidence written to the contract. Permanently co-located with the artifact. The next experiment — by you or an agent — starts from known ground, not a fresh guess." },
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
          Close the loop every day.<br />Not every quarter.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-12 max-w-xl">
          The same loop, whether you&apos;re testing a landing page, a copy variant, or a new onboarding flow — and it runs as often as you ship. Systemix ties together the tools you already use.
        </p>

        <LoopDiagram />
      </div>
    </section>
  );
}

// ── Surfaces (Config / System / Atlas) ───────────────────────────────────────

// Lightweight CSS mock frames — representative previews, not screenshots.
// Real captures of the live surfaces are a follow-up.
function SurfacePreview({ kind }: { kind: "config" | "atlas" | "system" }) {
  const frame = "relative h-40 rounded-lg border border-border/40 bg-muted/10 overflow-hidden";
  if (kind === "config") {
    return (
      <div className={frame} aria-hidden>
        <svg viewBox="0 0 200 130" className="w-full h-full text-muted-foreground/40">
          <line x1="60" y1="40" x2="120" y2="35" stroke="currentColor" strokeWidth="1" />
          <line x1="60" y1="40" x2="90" y2="90" stroke="currentColor" strokeWidth="1" />
          <line x1="120" y1="35" x2="150" y2="80" stroke="currentColor" strokeWidth="1" />
          <line x1="90" y1="90" x2="150" y2="80" stroke="currentColor" strokeWidth="1" />
          {[[60,40],[120,35],[90,90],[150,80],[40,95]].map(([x,y],i)=>(
            <circle key={i} cx={x} cy={y} r={i===0?6:4} fill="currentColor" className={i===1?"text-cyan-400/60":i===2?"text-violet-400/60":"text-muted-foreground/50"} />
          ))}
        </svg>
      </div>
    );
  }
  if (kind === "atlas") {
    return (
      <div className={frame} aria-hidden>
        <div className="absolute inset-0 flex items-center justify-center gap-2 px-4">
          {["start","agent","tool","end"].map((l,i)=>(
            <div key={l} className="flex items-center gap-2">
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[8px] font-mono text-amber-400/70">{l}</div>
              {i<3 && <span className="text-muted-foreground/40 text-[10px]">→</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={frame} aria-hidden>
      <div className="p-4 space-y-2">
        <div className="h-2 w-1/3 rounded bg-muted-foreground/30" />
        <div className="h-1.5 w-5/6 rounded bg-muted-foreground/15" />
        <div className="h-1.5 w-4/6 rounded bg-muted-foreground/15" />
        <div className="flex gap-1.5 pt-1">
          <span className="text-[7px] font-mono text-emerald-400/70 border border-emerald-500/30 rounded px-1">current</span>
          <span className="text-[7px] font-mono text-amber-400/70 border border-amber-500/30 rounded px-1">drifted</span>
        </div>
        <div className="h-1.5 w-3/6 rounded bg-muted-foreground/15" />
      </div>
    </div>
  );
}

function Surfaces() {
  const surfaces = [
    {
      kind: "config" as const,
      route: "/config",
      name: "Config",
      tagline: "Configure your instance.",
      body: "Your instance, editable. systemix.config.yaml rendered as a live 3D graph of components, tokens, contracts, and the signals tied to them — plus the runtime feed and the HITL queue. Local-first; nothing leaves your machine.",
      cta: { label: "Open config →", href: "/config" },
    },
    {
      kind: "system" as const,
      route: "/system",
      name: "System",
      tagline: "The record that updates itself.",
      body: "Your self-updating styleguide. Hermes keeps tokens, components, and hypotheses current and tags each with a status — current, drifted, stale. The most legible surface: agent-readable, always live.",
      cta: { label: "Open the system →", href: "/system" },
    },
    {
      kind: "atlas" as const,
      route: "/atlas",
      name: "Atlas",
      tagline: "Map your product's agentic workflows.",
      body: "A persona-filtered map of the agentic workflows your product runs — each typed by pattern (chain, routing, parallel, orchestration), each step click-through to its prototype. Generated per instance from your own contracts.",
      cta: { label: "Open Atlas →", href: "/atlas" },
    },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-4xl mx-auto">
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-4">
          What you get
        </p>
        <h2 className="text-[1.75rem] font-black tracking-tight mb-3">
          Three surfaces. One source of truth — your repo.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-12 max-w-xl">
          Systemix isn&apos;t a dashboard you log into. It installs into your repo and gives you surfaces that read your live state — the same ground your agents read from.
        </p>

        <div className="grid md:grid-cols-3 gap-3">
          {surfaces.map(({ kind, route, name, tagline, body, cta }) => (
            <div key={name} className="border border-border/40 rounded-xl px-4 pt-4 pb-5 bg-background flex flex-col">
              <SurfacePreview kind={kind} />
              <div className="flex items-center gap-2 mt-4 mb-1">
                <span className="text-[10px] font-mono text-muted-foreground/50 border border-border/40 px-1.5 py-0.5 rounded">
                  {route}
                </span>
              </div>
              <p className="text-[15px] font-black tracking-tight text-foreground mt-1">{name}</p>
              <p className="text-[13px] font-semibold text-muted-foreground mb-2">{tagline}</p>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-4">{body}</p>
              <div className="mt-auto pt-1">
                <Link href={cta.href} className="text-[12px] font-mono text-muted-foreground/50 hover:text-foreground transition-colors">
                  {cta.label}
                </Link>
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
    <section className="relative py-24 bg-zinc-950 overflow-hidden">
      {/* glassmorphism depth layer — the blur target */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-emerald-500/6 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-emerald-400/4 rounded-full blur-2xl" />
      </div>

      <div className="relative max-w-3xl mx-auto px-4">
        <p className="text-[11px] font-mono text-emerald-500/50 uppercase tracking-widest mb-4">
          The queue &middot; Your decision cadence
        </p>
        <h2 className="text-[1.75rem] font-black tracking-tight mb-3 text-white">
          Hermes did the synthesis.<br />You make the call.
        </h2>
        <p className="text-[15px] text-zinc-400 leading-relaxed mb-10 max-w-xl">
          Every running hypothesis produces a card. Confidence score, PostHog data, prior contract history. One click writes the decision back. That&apos;s the whole product.
        </p>

        {/* glassmorphism card */}
        <div className="rounded-2xl border border-zinc-700/50 bg-zinc-900/70 backdrop-blur-xl shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_50px_rgba(16,185,129,0.07)] overflow-hidden mb-6">
          <div className="px-5 pt-5 pb-5">

            {/* header row */}
            <div className="flex items-start gap-3 mb-4">
              <span className="text-[13px] font-mono mt-0.5 shrink-0 text-emerald-400" aria-hidden>◈</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">Hypothesis</span>
                  <span className="text-[10px] font-mono text-zinc-500">2h ago</span>
                  <span className="text-[10px] font-mono text-zinc-500">Systemix Landing</span>
                </div>
                <p className="text-[13px] font-mono text-zinc-100 leading-snug">
                  Hero headline — &ldquo;You shipped. Did it work?&rdquo; vs control framing
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide shrink-0 text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md">
                pending
              </span>
            </div>

            {/* stat boxes */}
            <div className="pl-6 mb-4 grid grid-cols-3 gap-2">
              {[
                { label: "Baseline", value: "3.2%", sub: "CTR", highlight: false },
                { label: "Variant B", value: "4.7%", sub: "CTR", highlight: true },
                { label: "Delta",     value: "+47%",  sub: "↑",   highlight: true },
              ].map(({ label, value, sub, highlight }) => (
                <div
                  key={label}
                  className={`rounded-xl border px-3 py-3 ${
                    highlight
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-zinc-700/60 bg-zinc-800/60"
                  }`}
                >
                  <p className="text-[9px] font-mono text-zinc-500 mb-1 uppercase tracking-wider">{label}</p>
                  <p className={`text-[15px] font-mono font-bold leading-none ${highlight ? "text-emerald-400" : "text-zinc-200"}`}>
                    {value} <span className="text-[10px] font-normal">{sub}</span>
                  </p>
                </div>
              ))}
            </div>

            {/* confidence bar */}
            <div className="pl-6 mb-3.5 flex items-center gap-3">
              <div className="w-[72px] h-1.5 rounded-full bg-zinc-700 overflow-hidden" role="progressbar" aria-valuenow={87} aria-valuemin={0} aria-valuemax={100} aria-label="87% confidence">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: "87%" }} />
              </div>
              <span className="text-[11px] font-mono text-zinc-400">87% confidence · 1,240 sessions</span>
            </div>

            {/* context */}
            <p className="text-[12px] text-zinc-400 leading-relaxed pl-6 mb-4">
              Variant B converts better on builder-persona traffic from Twitter and HN. Prior test (March) with the technical-founder framing underperformed 23% on the same audience. Contract history supports promoting B.
            </p>

            {/* Hermes recommends */}
            <div className="pl-6 mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3">
              <p className="text-[9px] font-mono text-emerald-500/60 uppercase tracking-widest mb-1.5">Hermes recommends</p>
              <p className="text-[12px] font-mono text-emerald-300 leading-relaxed">Promote variant B. Write rationale to contract. Test CTA copy next.</p>
            </div>

            {/* action buttons — clear hierarchy */}
            <div className="flex items-center gap-2">
              <button className="px-4 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 text-[11px] font-bold hover:bg-emerald-400 active:bg-emerald-600 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                Promote variant
              </button>
              <button className="px-4 py-1.5 rounded-lg bg-zinc-800 border border-zinc-600/60 text-zinc-200 text-[11px] font-bold hover:bg-zinc-700 transition-colors">
                Run longer
              </button>
              <button className="px-4 py-1.5 rounded-lg text-zinc-500 text-[11px] font-bold hover:text-zinc-300 transition-colors">
                Discard
              </button>
            </div>

          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/queue"
            className="text-[13px] font-mono text-zinc-400 hover:text-white transition-colors"
          >
            Open the queue →
          </Link>
          <Link
            href="/docs/concepts/hitl"
            className="text-[13px] font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
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
    { name: "PostHog / Statsig", role: "Where your experiment data already lives. Systemix reads it — nothing moves, nothing new to instrument." },
    { name: "Ollama (Hermes)",   role: "Runs the synthesis locally. No API key. Any Ollama-compatible model works — swap in a config line." },
    { name: "Vercel",            role: "Deploy target. The post-deploy hook tells Hermes a new variant is live and ready to measure." },
    { name: "MCP server",        role: "Exposes contracts to Claude Code, Cursor, or any MCP-compatible agent. Agents read the contract before they ship the next thing." },
    { name: "Social signals",    role: "Twitter, LinkedIn, Reddit referrers attributed to specific deploys. Know which channel converted, not just that conversion happened." },
    { name: "Figma",             role: "Supporting layer. Drift between Figma and code is detected before a test starts — so you measure what you designed, not a drifted variant." },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-4">
          The tools it connects
        </p>
        <h2 className="text-[1.75rem] font-black tracking-tight mb-3">
          The stack you have is the stack.<br />Systemix is the glue.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-10 max-w-xl">
          No new dashboard to learn. No data to migrate. Systemix wraps around what you already use — listening, synthesizing, writing results back to a single contract file in your repo.
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

// ── Storybook + drift (collapsed — for design system teams) ──────────────────

function StorybookCallout() {
  return (
    <section className="py-12 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <details className="group">
          <summary className="cursor-pointer list-none flex items-center gap-2 text-[12px] font-mono text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors select-none">
            <span className="group-open:rotate-90 transition-transform inline-block">›</span>
            For design system teams — Storybook, drift detection, and the evidence layer
          </summary>
          <div className="mt-6 border border-border/30 rounded-xl px-6 py-6 bg-muted/5">
            <h2 className="text-[1.25rem] font-black tracking-tight mb-3">
              Storybook tells your agent what exists.<br />Nobody tells it what worked.
            </h2>
            <p className="text-[14px] text-muted-foreground leading-relaxed mb-3 max-w-2xl">
              You can document a component. You can sync it across Figma and code. You can write a story for it. But you still can&apos;t answer the question that decides the next sprint: <em>did this design decision work?</em> The answer lives in PostHog, in someone&apos;s head, or in a Slack thread from March.
            </p>
            <p className="text-[14px] text-muted-foreground leading-relaxed mb-6 max-w-2xl">
              Systemix writes the answer back into the component&apos;s contract — measured in production, attributed to the variant, dated. The next agent reading it sees the evidence, not just the value.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              {[
                { label: "LOST RATIONALE", body: "The variant that won in March is now a hex value with no story attached. Six months later the same dead-end gets proposed again, by a human or an agent." },
                { label: "STALE CONTEXT",  body: "Your agent reads the current token value but not the experiment that set it. It ships whichever color was in the file last — not the one production validated." },
                { label: "BLIND BASELINE", body: "PostHog says variant B won. But if the token drifted before the test, you measured a variant nobody designed. The result isn't wrong — it's about the wrong thing." },
              ].map(({ label, body }) => (
                <div key={label} className="border border-border/40 rounded-xl px-4 py-4 bg-background">
                  <p className="text-[10px] font-mono font-bold text-muted-foreground/50 uppercase tracking-widest mb-2">{label}</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
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
        </details>
      </div>
    </section>
  );
}

// ── Quality gate (docs-only — removed from landing) ───────────────────────────

function QualityGate() {
  const tiers = [
    { score: "≥ 80", state: "Evidence-ready",  dot: "bg-emerald-500", body: "Contract is backed. Tokens are resolved against Figma, drift is cleared, recent production evidence is attached. Safe for agents to read, safe for the next experiment to build on." },
    { score: "≥ 60", state: "Partial evidence", dot: "bg-amber-500",   body: "Some claims are unbacked. Either drift is unresolved or production data is missing. Your agent will still read the contract — but the next decision is partly a guess." },
    { score: "< 60", state: "Unbacked",         dot: "bg-red-400",     body: "Too many open questions. Tokens drift, no recent production data, or contradictions Hermes flagged. Don't ship from this contract until it's triaged." },
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
          The score rises as evidence accumulates. It drops when Figma drifts, when PostHog data goes stale, or when a decision is overridden without rationale. Target: ≥ 80 on every contract your agent reads.
        </p>
      </div>
    </section>
  );
}

// ── Bottom CTA ────────────────────────────────────────────────────────────────

function BottomCTA() {
  const steps = [
    { n: "1", label: "Run Hermes locally",          cmd: "ollama pull hermes3",       comment: "any Ollama model — no API key" },
    { n: "2", label: "Init your first hypothesis",  cmd: "npx systemix init",         comment: "creates contract/hypotheses/ in your repo" },
    { n: "3", label: "Watch the loop",              cmd: "npx systemix watch",        comment: "Hermes polls, queue fills, evidence writes back" },
  ];

  return (
    <section className="py-24 border-t border-border/40">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[1.75rem] font-black tracking-tight mb-4">
          Up and running in three commands.
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-10 max-w-xl">
          Hermes runs on Ollama — no API key, no cloud, your data stays local. PostHog stays where it already is. The contract is a file in your repo. Three commands and the loop is live.
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

        <div className="rounded-xl border border-border/40 bg-muted/5 px-5 py-4 mb-8 space-y-3">
          <div>
            <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">Install a workflow</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-2">
              Every hypothesis gets a contract: the question, the variants, success criteria, and a Production Evidence section Hermes writes from your PostHog events. You approve. Evidence accumulates. The next experiment starts from known ground.
            </p>
            <code className="text-[12px] font-mono text-foreground/60 bg-muted/40 px-2 py-1 rounded">
              npx systemix workflow add hypothesis-validation
            </code>
          </div>
          <div>
            <p className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-2">MCP server</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed mb-2">
              Add Systemix as an MCP server in Claude Code or Cursor. Every agent query gets the contract, the signals, and the score — not a guess.
            </p>
            <code className="text-[12px] font-mono text-foreground/60 bg-muted/40 px-2 py-1 rounded">
              npx systemix-mcp --project-root .
            </code>
          </div>
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
        <SectionTrack name="hero" hypothesisId="landing-velocity-gap-2026-06"><Hero /></SectionTrack>
        <SectionTrack name="the-gap"><TheGap /></SectionTrack>
        <SectionTrack name="the-loop"><TheLoop /></SectionTrack>
        <SectionTrack name="surfaces"><Surfaces /></SectionTrack>
        <SectionTrack name="hitl-preview" hypothesisId="landing-hitl-card-glassmorphism-2026-05"><HitlPreview /></SectionTrack>
        <SectionTrack name="magic-glue"><MagicGlue /></SectionTrack>
        <SectionTrack name="bottom-cta"><BottomCTA /></SectionTrack>
        <SectionTrack name="storybook-callout"><StorybookCallout /></SectionTrack>
      </main>
      <LandingFooter />
    </div>
  );
}
