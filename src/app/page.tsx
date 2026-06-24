import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { InstallCommand, SectionTrack } from "@/components/systemix/LandingEvents";
import { LandingHero } from "@/components/landing/LandingHero";
import { LoopOrbit } from "@/components/landing/LoopOrbit";
import { ThreeDoorsBento } from "@/components/landing/ThreeDoorsBento";
import { TrustBento } from "@/components/landing/TrustBento";
import {
  GITHUB_URL,
  about,
  bottomCta,
  brandClone,
  doors,
  effect,
  footer,
  gap,
  loop,
  nav,
  services,
  trust,
} from "@/lib/landing/content";

export const metadata: Metadata = {
  title: "Systemix — your design decisions, finally written down",
  description:
    "Systemix closes the gap between shipping a variant and learning from it. Free CLI kit, or let Boyan wire the loop in a one-week sprint. Paste your URL — we clone your brand in session one.",
};

// ── Shared section primitives ─────────────────────────────────────────────────

function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("border-t border-border/40 py-28 sm:py-36", className)}>
      <div className="mx-auto max-w-5xl px-6">{children}</div>
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[2rem] font-black leading-[1.12] tracking-tight sm:text-[2.25rem]">
      {children}
    </h2>
  );
}

function Lead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground", className)}>
      {children}
    </p>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-3 pb-2">
      <div className="mx-auto flex h-12 max-w-5xl items-center gap-6 rounded-full border border-border/50 bg-background/80 px-5 shadow-[var(--shadow-sm)] backdrop-blur-md">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <span className="text-xl font-black tracking-tight">systemix</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 sm:flex">
          {nav.links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild>
            <a href={nav.cta.href}>
              {nav.cta.label}
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

// ── Problem ───────────────────────────────────────────────────────────────────

function Problem() {
  return (
    <Section>
      <div className="max-w-3xl">
        <Eyebrow>{gap.label}</Eyebrow>
        <SectionHeading>{gap.heading}</SectionHeading>
        <Lead>{gap.body}</Lead>
      </div>
      <div className="mt-14 grid gap-4 sm:grid-cols-2 sm:gap-5">
        {gap.stats.map((s) => (
          <div key={s.k} className="rounded-xl border border-border/40 bg-card px-6 py-5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              {s.k}
            </p>
            <p className="text-lg font-bold text-foreground">{s.v}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Effect ────────────────────────────────────────────────────────────────────

function Effect() {
  return (
    <Section>
      <div className="max-w-3xl">
        <Eyebrow>{effect.label}</Eyebrow>
        <SectionHeading>{effect.heading}</SectionHeading>
      </div>
      <div className="mt-14 grid gap-4 sm:grid-cols-3 sm:gap-5">
        {effect.items.map((it) => (
          <div key={it.title} className="rounded-xl border border-border/40 bg-card p-6">
            <p className="mb-2 text-[15px] font-bold text-foreground">{it.title}</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{it.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ── Brand clone hook ─────────────────────────────────────────────────────────

function BrandCloneHook() {
  return (
    <Section>
      <div className="grid gap-10 sm:grid-cols-2 sm:gap-16 sm:items-center">
        <div>
          <Eyebrow>{brandClone.label}</Eyebrow>
          <SectionHeading>{brandClone.heading}</SectionHeading>
          <Lead>{brandClone.body}</Lead>
        </div>
        <div className="rounded-xl border border-border/40 bg-card p-8">
          <p className="mb-5 text-[13px] font-medium text-foreground">
            Your site URL
          </p>
          <div className="flex flex-col gap-3">
            <div className="rounded border border-border/60 bg-background px-4 py-3 font-mono text-[13px] text-muted-foreground/60">
              https://your-site.com
            </div>
            <a
              href={brandClone.cta.href}
              className="rounded-full bg-foreground px-5 py-3 text-center text-[13px] font-medium text-background transition-opacity hover:opacity-90"
            >
              {brandClone.cta.label}
            </a>
          </div>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground/40">{brandClone.note}</p>
        </div>
      </div>
    </Section>
  );
}

// ── Solution · the loop ───────────────────────────────────────────────────────

function TheLoop() {
  return (
    <section id="loop" className="border-t border-border/40 py-28 sm:py-36">
      <div className="mx-auto max-w-5xl px-6">
        <div className="max-w-3xl">
          <Eyebrow>{loop.label}</Eyebrow>
          <SectionHeading>{loop.heading}</SectionHeading>
          <Lead>{loop.body}</Lead>
        </div>
      </div>

      {/* full-bleed tool constellation */}
      <LoopOrbit className="mx-auto mt-6 max-w-6xl px-6" />

      <div className="mx-auto mt-4 flex max-w-5xl items-center justify-center gap-2 px-6 font-mono text-[12px] text-muted-foreground/70">
        {loop.steps.map((s, i) => (
          <span key={s.title} className="flex items-center gap-2">
            <span>{s.title}</span>
            {i < loop.steps.length - 1 && (
              <span aria-hidden className="text-muted-foreground/30">
                →
              </span>
            )}
          </span>
        ))}
      </div>
    </section>
  );
}

// ── Solution · three doors ────────────────────────────────────────────────────

function ThreeDoors() {
  return (
    <Section>
      <div className="max-w-3xl">
        <Eyebrow>{doors.label}</Eyebrow>
        <SectionHeading>{doors.heading}</SectionHeading>
        <Lead>{doors.body}</Lead>
      </div>
      <div className="mt-14">
        <ThreeDoorsBento />
      </div>
    </Section>
  );
}

// ── Trust ─────────────────────────────────────────────────────────────────────

function Trust() {
  return (
    <Section>
      <div className="max-w-3xl">
        <Eyebrow>{trust.label}</Eyebrow>
        <SectionHeading>{trust.heading}</SectionHeading>
        <Lead>{trust.body}</Lead>
      </div>
      <div className="mt-14">
        <TrustBento />
      </div>
    </Section>
  );
}

// ── About ─────────────────────────────────────────────────────────────────────

function About() {
  return (
    <Section>
      <div className="max-w-xl">
        <p className="text-[14px] leading-relaxed text-muted-foreground/70">{about.body}</p>
        <div className="mt-5 flex items-center gap-5">
          {about.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] text-muted-foreground/60 underline underline-offset-4 transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

function BottomCTA() {
  return (
    <Section>
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <h2 className="text-[2rem] font-black leading-[1.1] tracking-tight sm:text-[2.5rem]">
          {bottomCta.heading}
        </h2>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          {bottomCta.body}
        </p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <InstallCommand />
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            or star on GitHub →
          </a>
        </div>
        <p className="mt-7 font-mono text-[12px] text-muted-foreground/40">{bottomCta.fineprint}</p>
      </div>
    </Section>
  );
}

// ── Services / pick your path ─────────────────────────────────────────────────

function Services() {
  return (
    <Section id="services">
      <div className="max-w-3xl">
        <Eyebrow>{services.label}</Eyebrow>
        <SectionHeading>{services.heading}</SectionHeading>
        <Lead className="max-w-2xl">{services.body}</Lead>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-3 sm:gap-5">
        {services.tiers.map((t) => (
          <div
            key={t.name}
            className={cn(
              "flex flex-col rounded-xl border bg-card p-6",
              t.highlight ? "border-foreground" : "border-border/40"
            )}
          >
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
              {t.price}
            </p>
            <p className="mb-3 text-[14px] font-bold text-foreground">{t.name}</p>
            <p className="flex-1 text-[13px] leading-relaxed text-muted-foreground">{t.body}</p>
            <a
              href={t.cta.href}
              className={cn(
                "mt-5 inline-block rounded-full px-4 py-2 text-[12px] font-medium transition-opacity hover:opacity-80",
                t.highlight
                  ? "bg-foreground text-background"
                  : "border border-border/60 text-foreground hover:border-foreground"
              )}
            >
              {t.cta.label} →
            </a>
          </div>
        ))}
      </div>

    </Section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="border-t border-border/50">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[12px] text-muted-foreground/40">{footer.tagline}</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[12px] text-muted-foreground/40">
          {footer.links.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-muted-foreground">
              {l.label}
            </Link>
          ))}
          <span className="rounded border border-border/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
            {footer.badge}
          </span>
        </div>
      </div>
    </footer>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <main>
        <SectionTrack name="hero" experimentId="landing-velocity-gap-2026-06">
          <LandingHero />
        </SectionTrack>
        <SectionTrack name="problem">
          <Problem />
        </SectionTrack>
        <SectionTrack name="effect">
          <Effect />
        </SectionTrack>
        <SectionTrack name="brand-clone">
          <BrandCloneHook />
        </SectionTrack>
        <SectionTrack name="loop">
          <TheLoop />
        </SectionTrack>
        <SectionTrack name="three-doors">
          <ThreeDoors />
        </SectionTrack>
        <SectionTrack name="services">
          <Services />
        </SectionTrack>
        <SectionTrack name="trust">
          <Trust />
        </SectionTrack>
        <SectionTrack name="about">
          <About />
        </SectionTrack>
        <SectionTrack name="bottom-cta">
          <BottomCTA />
        </SectionTrack>
      </main>
      <LandingFooter />
    </div>
  );
}
