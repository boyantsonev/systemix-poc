import Link from "next/link";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { PluginInstall, TrackedLink } from "@/components/systemix/LandingEvents";
import { MobileNav } from "@/components/landing/MobileNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { loadOwnReport } from "@/lib/landing/own-score";
import { HeroGeneration } from "@/components/motion/HeroGeneration";
import { ScoreDonut } from "@/components/motion/ScoreDonut";
import { FaqAccordion } from "@/components/motion/FaqAccordion";
import {
  GITHUB_URL,
  bottomCta,
  faq,
  footer,
  heroFacts,
  howItWorks,
  nav,
  pillars,
  pricing,
  proof,
} from "@/lib/landing/content";

// ── The soft grid (dense soft-grid pattern) ──────────────────────────────────
// A hairline-framed container; sections are bordered cells inside it. Text sits
// on clean paper/ink — the CRT effect lives only on .terminal/.crt-panel
// surfaces (spec v1.1).

export function GridFrame({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto max-w-[1200px] border-x border-border/60", className)}>
      {children}
    </div>
  );
}

// ── Shared section primitives ─────────────────────────────────────────────────

export function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("border-t border-border/60 py-12 sm:py-16", className)}>
      <div className="mx-auto px-6 sm:px-10">{children}</div>
    </section>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p data-reveal-line="0" className="tva-label mb-4 text-[11px] text-muted-foreground">
      {children}
    </p>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 data-reveal-line="1" className="text-[1.9rem] font-bold leading-[1.12] sm:text-[2.25rem]">
      {children}
    </h2>
  );
}

export function Lead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p data-reveal-line="2" className={cn("mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground", className)}>
      {children}
    </p>
  );
}

// ── Nav (announcement strip + bar, aligned to the frame) ─────────────────────

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center gap-6 px-6 sm:px-10">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <span className="text-xl font-bold tracking-tight">systemix</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {nav.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button variant="secondary" size="sm" asChild className="hidden md:inline-flex">
              <TrackedLink href={nav.cta.href} event="free_score_clicked" location="nav">
                {nav.cta.label}
              </TrackedLink>
            </Button>
            <MobileNav className="md:hidden" />
          </div>
        </div>
      </div>
    </header>
  );
}

// ── Hero row: copy | what you get ────────────────────────────────────────────

function HeroFacts() {
  return (
    <HeroGeneration className="flex flex-col p-6 sm:p-8">
      <p className="tva-label mb-4 text-[10px] text-muted-foreground">· {heroFacts.label}</p>
      <dl className="flex flex-1 flex-col justify-center">
        {heroFacts.items.map((f) => (
          <div
            key={f.label}
            className="flex items-baseline justify-between gap-4 border-b border-border/50 py-3 last:border-b-0"
          >
            <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
            <dd className="text-right font-mono text-[13px] font-bold text-highlight">{f.value}</dd>
          </div>
        ))}
      </dl>
    </HeroGeneration>
  );
}

export function HeroRow() {
  return (
    <section className="grid lg:grid-cols-[1.6fr_1fr] lg:divide-x divide-border/60 max-lg:divide-y">
      <LandingHero />
      <HeroFacts />
    </section>
  );
}

// ── What Systemix does: the three pillars ────────────────────────────────────

export function Pillars() {
  return (
    <Section id="what-it-does">
      <div className="max-w-3xl">
        <Eyebrow>{pillars.label}</Eyebrow>
        <SectionHeading>{pillars.heading}</SectionHeading>
      </div>
      <div className="mt-12 grid gap-4 sm:gap-5 lg:grid-cols-3">
        {pillars.items.map((p, i) => (
          <div
            key={p.key}
            data-reveal-card={i}
            className="flex flex-col rounded-[var(--radius-screen)] border border-border bg-card p-6 shadow-[var(--shadow-panel)]"
          >
            <p className="tva-label text-[10px] text-highlight">{p.tag}</p>
            <h3 className="mt-3 text-[1.15rem] font-bold leading-snug">{p.title}</h3>
            <p className="mt-3 flex-1 text-[14px] leading-relaxed text-muted-foreground">{p.body}</p>
            <code className="mt-5 font-mono text-[12px] text-foreground/80">{p.command}</code>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Proof: this repo's own score (a committed results file, never hand-written) ──

export async function Proof() {
  const report = await loadOwnReport();
  if (!report) return null;
  return (
    <Section id="proof">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <Eyebrow>{proof.label}</Eyebrow>
          <SectionHeading>{proof.heading(report.overall)}</SectionHeading>
          <Lead>{proof.body}</Lead>
          <Link
            href={proof.link.href}
            className="mt-6 inline-block text-[13px] font-medium text-foreground underline underline-offset-4 hover:text-highlight"
          >
            {proof.link.label}
          </Link>
        </div>
        <div
          data-reveal-card="1"
          className="grid items-center gap-6 rounded-[var(--radius-screen)] border border-border bg-card p-6 shadow-[var(--shadow-panel)] sm:grid-cols-[auto_minmax(0,1fr)]"
        >
          <div className="justify-self-center">
            <ScoreDonut score={report.overall} label="out of 100" />
          </div>
          <ul className="min-w-0 space-y-3">
            {report.areas.map((a) => (
              <li key={a.key}>
                <div className="flex justify-between gap-3 text-[13px]">
                  <span className="text-foreground">{a.label}</span>
                  <span className="font-mono text-muted-foreground">{a.score} / 10</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${a.score * 10}%` }} />
                </div>
              </li>
            ))}
            <li className="pt-2 font-mono text-[11px] text-muted-foreground">commit {report.commit} · rubric v1</li>
          </ul>
        </div>
      </div>
    </Section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

export function HowItWorks() {
  return (
    <Section id="how-it-works">
      <div className="max-w-3xl">
        <Eyebrow>{howItWorks.label}</Eyebrow>
        <SectionHeading>{howItWorks.heading}</SectionHeading>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-5">
        {howItWorks.steps.map((s, i) => (
          <div
            key={s.n}
            data-reveal-card={i}
            className="rounded-[var(--radius-screen)] border border-border bg-card p-6 shadow-[var(--shadow-panel)]"
          >
            <p className="font-mono text-[12px] text-highlight">{s.n}</p>
            <p className="mt-2 text-[15px] font-bold text-foreground">{s.title}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Pricing ladder ────────────────────────────────────────────────────────────

export function Pricing() {
  return (
    <Section id="pricing">
      <div className="max-w-3xl">
        <Eyebrow>{pricing.label}</Eyebrow>
        <SectionHeading>{pricing.heading}</SectionHeading>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
        {pricing.tiers.map((t, i) => (
          <div
            key={t.key}
            data-reveal-card={i}
            className={cn(
              "flex flex-col rounded-[var(--radius-screen)] border bg-card p-6 shadow-[var(--shadow-panel)]",
              t.highlight ? "border-primary" : "border-border",
            )}
          >
            <p className="tva-label mb-3 text-[10px] text-muted-foreground">{t.name}</p>
            <p className="text-[1.5rem] font-bold leading-none">{t.price}</p>
            {t.priceNote && <p className="mt-1 font-mono text-[11px] text-muted-foreground">{t.priceNote}</p>}
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-muted-foreground">{t.body}</p>
            <Button variant={t.highlight ? "secondary" : "outline"} size="sm" className="mt-5" asChild>
              <TrackedLink href={t.cta.href} event={t.cta.event} location={`pricing-${t.key}`}>
                {t.cta.label}
              </TrackedLink>
            </Button>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── FAQ (native details/summary; JSON-LD in FaqJsonLd) ───────────────────────

export function FaqSection() {
  return (
    <Section id="faq">
      <div className="max-w-3xl">
        <Eyebrow>{faq.label}</Eyebrow>
        <SectionHeading>{faq.heading}</SectionHeading>
      </div>
      <FaqAccordion items={faq.items} />
    </Section>
  );
}

/** FAQPage structured data (SEO brief §4) — render once per page that shows the FAQ. */
export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

// ── Bottom CTA ────────────────────────────────────────────────────────────────

export function BottomCTA() {
  return (
    <Section>
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <h2 className="text-[2rem] font-bold leading-[1.1] sm:text-[2.5rem]">{bottomCta.heading}</h2>
        <div className="mt-9">
          <PluginInstall location="bottom-cta" className="items-center" />
        </div>
        <p className="mt-7 font-mono text-[12px] text-muted-foreground/70">{bottomCta.fineprint}</p>
      </div>
    </Section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center sm:px-10">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[12px] text-muted-foreground/70">{footer.credit}</span>
          <ThemeToggle />
        </div>
        <div className="flex flex-wrap items-center gap-4 font-mono text-[12px] text-muted-foreground/70">
          {footer.links.map((l) =>
            l.href.startsWith("/") ? (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-foreground">
                {l.href === GITHUB_URL && <SiGithub size={12} aria-hidden />}
                {l.label}
              </a>
            ),
          )}
          <span className="tva-label rounded-sm border border-border px-1.5 py-0.5 text-[9px]">{footer.badge}</span>
        </div>
      </div>
    </footer>
  );
}
