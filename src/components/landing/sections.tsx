import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import matter from "gray-matter";
import {
  SiClaude,
  SiFigma,
  SiGithub,
  SiPosthog,
  SiShadcnui,
  SiTailwindcss,
  SiVercel,
} from "@icons-pack/react-simple-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/systemix/ThemeToggle";
import { InstallCommand, PluginInstall, TrackedLink } from "@/components/systemix/LandingEvents";
import { LiveLoopProof } from "@/components/landing/LiveLoopProof";
import { MobileNav } from "@/components/landing/MobileNav";
import { LandingHero } from "@/components/landing/LandingHero";
import { DeepDiveMockup } from "@/components/landing/DeepDiveMockups";
import {
  GITHUB_URL,
  announcement,
  audiences,
  bottomCta,
  brandClone,
  personaValue,
  credibility,
  deepDives,
  faq,
  footer,
  heroFacts,
  logoRows,
  nav,
  pricing,
  proof,
  statement,
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
  return <p className="tva-label mb-4 text-[11px] text-muted-foreground">{children}</p>;
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[1.9rem] font-bold leading-[1.12] sm:text-[2.25rem]">{children}</h2>
  );
}

export function Lead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground", className)}>
      {children}
    </p>
  );
}

// ── Nav (announcement strip + bar, aligned to the frame) ─────────────────────

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50">
      <a
        href={announcement.href}
        target="_blank"
        rel="noopener noreferrer"
        className="tva-label block bg-foreground py-2 text-center text-[10px] text-background transition-opacity hover:opacity-90"
      >
        {announcement.text} <span aria-hidden>→</span>
      </a>
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
            {/* Desktop (≥md): inline Star CTA. Mobile (<md): the CTA lives in the
                MobileNav sheet, so the bar stays wordmark + toggle + hamburger. */}
            <Button variant="outline" size="sm" asChild className="hidden md:inline-flex">
              <TrackedLink
                href={nav.cta.href}
                event="github_star_click"
                location="nav"
                className="flex items-center gap-1.5"
              >
                <SiGithub size={14} aria-hidden />
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

// ── Hero row — copy | facts table | tool grid (dense soft-grid pattern) ──────

/** Count earned bullets under `## Memory` in LEARNINGS.md (0 while none). */
function countLearnings(): number {
  try {
    const raw = fs.readFileSync(path.join(process.cwd(), "experiments", "LEARNINGS.md"), "utf8");
    const memory = raw.split(/^##\s+Memory\s*$/m)[1] ?? "";
    return memory.split(/\r?\n/).filter((l) => l.trim().startsWith("- ")).length;
  } catch {
    return 0;
  }
}

/** Count experiment MDX files (the live caseload). */
function countExperiments(): number {
  try {
    const dir = path.join(process.cwd(), "experiments");
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => matter(fs.readFileSync(path.join(dir, f), "utf8")).data as { type?: string })
      .filter((fm) => fm.type === "experiment").length;
  } catch {
    return 0;
  }
}

function HeroFacts() {
  // Honest by construction: recorded decisions once LEARNINGS has entries,
  // the live caseload until then. Never a hand-written number.
  const learnings = countLearnings();
  const experiments = countExperiments();
  const liveFact =
    learnings > 0
      ? { label: "Decisions recorded", value: String(learnings) }
      : { label: "Experiments live on this site", value: String(experiments) };

  return (
    <div className="flex flex-col p-6 sm:p-8">
      <p className="tva-label mb-4 text-[10px] text-muted-foreground">· {heroFacts.label}</p>
      <dl className="flex flex-1 flex-col justify-center">
        {[...heroFacts.items, liveFact].map((f) => (
          <div
            key={f.label}
            className="flex items-baseline justify-between gap-4 border-b border-border/50 py-3 last:border-b-0"
          >
            <dt className="text-[13px] text-muted-foreground">{f.label}</dt>
            <dd className="text-right font-mono text-[13px] font-bold text-highlight">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const TOOL_ICONS: Record<string, React.ComponentType<{ size?: number | string; className?: string }> | undefined> = {
  "Claude Code": SiClaude,
};

function HeroTools() {
  return (
    <div className="crt-panel flex flex-col p-6 sm:p-8">
      <p className="tva-label mb-4 text-[10px] text-muted-foreground">· {logoRows.tools.label}</p>
      <div className="grid flex-1 grid-cols-1 content-center gap-2">
        {logoRows.tools.items.map((name) => {
          const Icon = TOOL_ICONS[name];
          return (
            <div
              key={name}
              className="flex items-center gap-3 rounded-md border border-border/60 bg-card/60 px-4 py-3"
            >
              {Icon ? (
                <Icon size={16} aria-hidden className="opacity-80" />
              ) : (
                <span aria-hidden className="font-mono text-[13px] text-highlight">
                  ▸
                </span>
              )}
              <span className="font-mono text-[13px] text-foreground">{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HeroRow() {
  return (
    <section className="grid lg:grid-cols-[1.4fr_1fr_1fr] lg:divide-x divide-border/60 max-lg:divide-y">
      <LandingHero />
      <HeroFacts />
      <HeroTools />
    </section>
  );
}

// ── Stack strip — one bordered logo band ─────────────────────────────────────

const STACK_ICONS: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  GitHub: SiGithub,
  PostHog: SiPosthog,
  Vercel: SiVercel,
  shadcn: SiShadcnui,
  Tailwind: SiTailwindcss,
  "Figma (optional)": SiFigma,
};

export function StackStrip() {
  return (
    <section className="flex flex-wrap items-stretch border-t border-border/60">
      <p className="tva-label flex items-center px-6 py-4 text-[10px] text-muted-foreground sm:px-10">
        {logoRows.stack.label}
      </p>
      <div className="flex flex-1 flex-wrap sm:divide-x sm:divide-border/60 sm:border-l sm:border-border/60">
        {logoRows.stack.items.map((name) => {
          const Icon = STACK_ICONS[name];
          return (
            <span
              key={name}
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap px-4 py-4 text-[13px] font-medium text-muted-foreground"
            >
              {Icon && <Icon size={14} aria-hidden className="opacity-80" />}
              {name}
            </span>
          );
        })}
      </div>
    </section>
  );
}

// ── Statement block — two-tone problem/resolution ────────────────────────────

export function Statement() {
  return (
    <Section>
      <p className="max-w-3xl text-[1.6rem] font-bold leading-[1.3] sm:text-[1.9rem]">
        <span className="text-foreground">{statement.strong} </span>
        <span className="text-muted-foreground">{statement.dim}</span>
      </p>
    </Section>
  );
}

// ── Feature deep-dives — alternating text / product mockup ───────────────────

function DeepDiveRow({ dive, index }: { dive: (typeof deepDives)[number]; index: number }) {
  const flip = index % 2 === 1;
  return (
    <div className="grid items-center gap-8 sm:grid-cols-2 sm:gap-14">
      <div className={cn(flip && "sm:order-2")}>
        <Eyebrow>{String(index + 1).padStart(2, "0")}</Eyebrow>
        <h3 className="text-[1.45rem] font-bold leading-[1.15] sm:text-[1.7rem]">{dive.headline}</h3>
        <p className="mt-4 max-w-md text-[14px] leading-relaxed text-muted-foreground">{dive.body}</p>
      </div>
      <div className={cn(flip && "sm:order-1")}>
        <DeepDiveMockup mockup={dive.mockup} />
      </div>
    </div>
  );
}

export function FeatureDeepDives() {
  return (
    <Section id="deep-dives">
      <div className="flex flex-col gap-20 sm:gap-28">
        {deepDives.map((d, i) => (
          <DeepDiveRow key={d.key} dive={d} index={i} />
        ))}
      </div>
    </Section>
  );
}

// ── Audiences — the design system as an architecture ─────────────────────────

export function Audiences() {
  return (
    <Section id="audiences">
      <div className="max-w-3xl">
        <Eyebrow>{audiences.label}</Eyebrow>
        <SectionHeading>{audiences.heading}</SectionHeading>
        <Lead className="max-w-2xl">{audiences.body}</Lead>
      </div>
      <div className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-screen)] border border-border/60 bg-border/60 sm:grid-cols-2 lg:grid-cols-5">
        {audiences.items.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex flex-col gap-2 bg-background p-5 transition-colors hover:bg-accent"
          >
            <span className="tva-label text-[10px] text-highlight">{a.name}</span>
            <span className="text-[13px] leading-relaxed text-muted-foreground group-hover:text-foreground">
              {a.line}
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-4 font-mono text-[12px] text-muted-foreground">{audiences.note}</p>
    </Section>
  );
}

// ── Proof — running on itself (persona shared section, export name TheLoop) ──

export function TheLoop() {
  return (
    <section id="loop" className="border-t border-border/60 py-12 sm:py-16">
      <div className="mx-auto px-6 sm:px-10">
        <div className="max-w-3xl">
          <Eyebrow>{proof.label}</Eyebrow>
          <SectionHeading>{proof.heading}</SectionHeading>
          <Lead>{proof.body}</Lead>
        </div>
      </div>

      {/* The strongest proof is the live loop itself — no diagram needed here.
          The 6-step meta-loop lives in /docs. */}
      <LiveLoopProof className="mx-auto mt-10 max-w-3xl px-6 sm:px-10" />

      <div className="mx-auto mt-8 max-w-3xl px-6">
        <Link href="/docs/concepts/the-meta-loop" className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground">
          How the whole loop works →
        </Link>
      </div>
    </section>
  );
}

// ── Three doors (persona shared section — export name kept as TwoDoors) ──────

export function TwoDoors() {
  const dive = deepDives.find((d) => d.key === "doors") ?? deepDives[2];
  return (
    <Section id="doors">
      <div className="grid items-center gap-8 sm:grid-cols-2 sm:gap-14">
        <div>
          <Eyebrow>The doors</Eyebrow>
          <SectionHeading>{dive.headline}</SectionHeading>
          <Lead>{dive.body}</Lead>
          <Link
            href="/docs"
            className="mt-6 inline-block text-[13px] font-medium text-foreground underline underline-offset-4 hover:text-highlight"
          >
            Read the docs →
          </Link>
        </div>
        <DeepDiveMockup mockup={dive.mockup} />
      </div>
    </Section>
  );
}

// ── Brand clone hook (persona shared; brand_clone_request) ───────────────────

export function BrandCloneHook() {
  return (
    <Section>
      <div className="grid gap-10 sm:grid-cols-2 sm:items-center sm:gap-16">
        <div>
          <Eyebrow>{brandClone.label}</Eyebrow>
          <SectionHeading>{brandClone.heading}</SectionHeading>
          <Lead>{brandClone.body}</Lead>
        </div>
        <div className="rounded-[var(--radius-screen)] border border-border bg-card p-6 shadow-[var(--shadow-panel)] sm:p-7">
          <p className="tva-label mb-3 text-[10px] text-muted-foreground">src/app/globals.css</p>
          <pre className="terminal overflow-x-auto p-4 font-mono text-[12px] leading-relaxed">
            <code>
              <span style={{ opacity: 0.55 }}>  :root {`{`}</span>{"\n"}
              <span style={{ color: "var(--screen-destructive)" }}>-   --primary: #A8511A;</span>{"\n"}
              <span style={{ color: "var(--screen-success)" }}>+   --primary: oklch(0.55 0.21 27);</span>{"\n"}
              <span style={{ color: "var(--screen-destructive)" }}>-   --radius: 0.3125rem;</span>{"\n"}
              <span style={{ color: "var(--screen-success)" }}>+   --radius: 0.875rem;</span>{"\n"}
              <span style={{ opacity: 0.55 }}>  {`}`}</span>
            </code>
          </pre>
          <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
            Your colors, type scale, and radius — scraped from your live site, mapped to design
            tokens. A reviewable diff, not a redesign.
          </p>
          <Button variant="secondary" size="lg" className="mt-5 w-full" asChild>
            <TrackedLink href={brandClone.cta.href} event="brand_clone_request" location="brand-clone">
              {brandClone.cta.label}
            </TrackedLink>
          </Button>
          <p className="mt-4 text-[11px] text-muted-foreground/70">{brandClone.note}</p>
        </div>
      </div>
    </Section>
  );
}

// ── Credibility (persona shared section — export name kept as Trust) ─────────

export function Trust() {
  return (
    <Section>
      <div className="max-w-3xl">
        <Eyebrow>{credibility.label}</Eyebrow>
        <SectionHeading>{credibility.heading}</SectionHeading>
        <Lead>{credibility.body}</Lead>
        <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href={credibility.cta.href}
            className="text-[14px] font-medium text-highlight underline underline-offset-4 hover:opacity-80"
          >
            {credibility.cta.label}
          </Link>
          {credibility.links.map((l) =>
            l.href.startsWith("mailto:") ? (
              <TrackedLink
                key={l.href}
                href={l.href}
                event="book_a_call"
                location="credibility"
                className="text-[13px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                {l.label}
              </TrackedLink>
            ) : (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
              >
                {l.label}
              </a>
            ),
          )}
        </div>
      </div>
    </Section>
  );
}

// ── Pricing ladder (persona shared section — export name kept as Services) ───

export function Services() {
  return (
    <Section id="services">
      <div className="max-w-3xl">
        <Eyebrow>{pricing.label}</Eyebrow>
        <SectionHeading>{pricing.heading}</SectionHeading>
      </div>

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
        {pricing.tiers.map((t) => (
          <div
            key={t.key}
            className={cn(
              "flex flex-col rounded-[var(--radius-screen)] border bg-card p-6 shadow-[var(--shadow-panel)]",
              t.highlight ? "border-primary" : "border-border",
            )}
          >
            <p className="tva-label mb-3 text-[10px] text-muted-foreground">{t.name}</p>
            <p className="text-[1.5rem] font-bold leading-none">{t.price}</p>
            {t.priceNote && (
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{t.priceNote}</p>
            )}
            <p className="mt-4 flex-1 text-[13px] leading-relaxed text-muted-foreground">{t.body}</p>
            {"command" in t.cta ? (
              <div className="mt-5">
                <InstallCommand cmd={t.cta.command} location={`pricing-${t.key}`} />
              </div>
            ) : (
              <Button
                variant={t.highlight ? "secondary" : "outline"}
                size="sm"
                className="mt-5"
                asChild
              >
                <TrackedLink href={t.cta.href} event={t.cta.event} location={`pricing-${t.key}`}>
                  {t.cta.label}
                </TrackedLink>
              </Button>
            )}
          </div>
        ))}
      </div>

      <p className="tva-label mt-8 text-center text-[11px] text-highlight">{pricing.anchorLine}</p>
    </Section>
  );
}

// ── Per-persona value — expandable rows (tap a row for what it means) ────────

export function PersonaValueTable() {
  return (
    <Section>
      <div className="max-w-3xl">
        <Eyebrow>{personaValue.label}</Eyebrow>
        <SectionHeading>{personaValue.heading}</SectionHeading>
        <p className="mt-3 font-mono text-[12px] text-muted-foreground">{personaValue.hint}</p>
      </div>
      <div className="mt-10">
        {/* header row */}
        <div className="grid grid-cols-[7rem_1fr] gap-4 border-b-2 border-border pb-3 sm:grid-cols-[10rem_1fr]">
          <span className="tva-label text-[10px] text-muted-foreground">{personaValue.columns.role}</span>
          <span className="tva-label text-[10px] text-muted-foreground">{personaValue.columns.gets}</span>
        </div>
        {personaValue.rows.map((r) => (
          <details key={r.role} className="group border-b border-border/60">
            <summary className="grid cursor-pointer list-none grid-cols-[7rem_1fr] items-baseline gap-4 py-3 text-[14px] transition-colors hover:bg-accent/40 sm:grid-cols-[10rem_1fr] [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-foreground">{r.role}</span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  aria-hidden
                  className="font-mono text-[12px] text-muted-foreground transition-transform group-open:rotate-90"
                >
                  ▸
                </span>
                {r.gets}
              </span>
            </summary>
            <p className="max-w-2xl pb-4 pl-6 pr-4 text-[13px] leading-relaxed text-muted-foreground sm:pl-[11rem]">
              {r.detail}
            </p>
          </details>
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
      <div className="mt-10 flex flex-col divide-y divide-border/60 border-y border-border/60">
        {faq.items.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold text-foreground [&::-webkit-details-marker]:hidden">
              {f.q}
              <span
                aria-hidden
                className="font-mono text-muted-foreground transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
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
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          {bottomCta.body}
        </p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <PluginInstall location="bottom-cta" className="items-center" />
          <TrackedLink
            href={GITHUB_URL}
            event="github_star_click"
            location="bottom-cta"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            ★ Star on GitHub
          </TrackedLink>
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
          <span className="font-mono text-[12px] text-muted-foreground/70">{footer.tagline}</span>
          <ThemeToggle />
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-4 font-mono text-[12px] text-muted-foreground/70">
            {footer.links.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
            <span className="tva-label rounded-sm border border-border px-1.5 py-0.5 text-[9px]">
              {footer.badge}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
