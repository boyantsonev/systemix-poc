import type { Metadata } from "next";
import Link from "next/link";
import {
  Eyebrow,
  GridFrame,
  LandingFooter,
  LandingNav,
  Lead,
  Section,
  SectionHeading,
} from "@/components/landing/sections";
import { InstallCommand, PluginInstall, SectionTrack, TrackedLink } from "@/components/systemix/LandingEvents";
import { PLUGIN_INSTALL_COMMAND } from "@/lib/landing/content";
import { loadOwnReport } from "@/lib/landing/own-score";
import { ThinkingStates } from "@/components/motion/ThinkingStates";
import { Button } from "@/components/ui/button";
import { FREE_SCORE_COMMAND, FULL_AUDIT, quickReportCheckoutUrl, quickReportPrice } from "@/lib/pricing";

// The quick report: the free score, then the full report for one small payment.
// Price and checkout link come from src/lib/pricing.ts (settings, not code).
export const metadata: Metadata = {
  title: "Free AI-readiness score for your design system | Systemix",
  description: `Install the Systemix plugin in Claude Code and get your design system's AI-readiness score out of 100, free. Your code never leaves your machine. The quick report, with what to fix first, is ${quickReportPrice()}.`,
  alternates: { canonical: "/report" },
};

const NOTIFY_MAILTO =
  "mailto:boyan.works@gmail.com?subject=Tell%20me%20when%20the%20Systemix%20quick%20report%20is%20live";

const STEPS = [
  { n: "1", t: "Install the plugin", b: "Two commands in Claude Code. No account, nothing to configure." },
  { n: "2", t: "Run /systemix:score", b: "In your repo. The score is computed on your machine and nothing is sent. Free: a score out of 100 and per area." },
  { n: "3", t: "Unlock the quick report", b: "Buy a key, add it to the plugin settings, run it again, and get what to fix first." },
];

// What /systemix:score does, step by step (the first line is the summary, shown without motion).
const SCORE_STEPS = [
  "/systemix:score reads your repo and sends nothing",
  "Reading your repo",
  "Counting colours, sizes and components",
  "Scoring six areas",
  "Score ready, on your machine",
];

const FREE_ITEMS = ["overall score out of 100", "a score for each of six areas", "how many caveats were found"];
const PAID_ITEMS = [
  "every caveat that costs points, biggest first",
  "what was measured for each",
  "one recommendation for each, in order",
  "the same code always gives the same report",
];

function BuyButton({ location, className }: { location: string; className?: string }) {
  const url = quickReportCheckoutUrl();
  const price = quickReportPrice();
  return url ? (
    <Button variant="secondary" size="lg" className={className} asChild>
      <TrackedLink href={url} event="checkout_clicked" location={location}>
        Buy the quick report: {price}
      </TrackedLink>
    </Button>
  ) : (
    <Button variant="outline" size="lg" className={className} asChild>
      <TrackedLink href={NOTIFY_MAILTO} event="report_notify_requested" location={location}>
        Quick report coming soon: email me
      </TrackedLink>
    </Button>
  );
}

export default async function QuickReportPage() {
  const sample = await loadOwnReport();
  const price = quickReportPrice();

  return (
    <div className="min-h-screen text-foreground">
      <LandingNav />
      <GridFrame>
        <main>
          <SectionTrack name="report-hero">
            <section className="border-b border-border/60 py-24 sm:py-28">
              <div className="mx-auto max-w-5xl px-6 text-center">
                <Eyebrow>Free score · quick report {price}</Eyebrow>
                <h1 className="mx-auto max-w-3xl text-[2rem] font-bold leading-[1.12] sm:text-[3rem] sm:leading-[1.1] [text-shadow:var(--glow-head)]">
                  Can your AI agents follow your design system?
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
                  Install the plugin in Claude Code. Get a score out of 100 in a few minutes, free. Your
                  code stays on your machine.
                </p>
                <div className="mt-9 flex flex-col items-center gap-3">
                  <PluginInstall location="report-hero" className="items-center" />
                  <p className="font-mono text-[11px] text-muted-foreground/70">
                    no Claude Code? <span className="text-foreground/80">{FREE_SCORE_COMMAND}</span>
                  </p>
                  <p className="mt-4 font-mono text-[12px]">
                    <ThinkingStates states={SCORE_STEPS} />
                  </p>
                </div>
              </div>
            </section>
          </SectionTrack>

          <SectionTrack name="report-steps">
            <Section>
              <div className="max-w-3xl">
                <Eyebrow>How it works</Eyebrow>
                <SectionHeading>Three steps, two minutes.</SectionHeading>
              </div>
              <div className="mt-12 grid gap-4 sm:grid-cols-3 sm:gap-5">
                {STEPS.map((s) => (
                  <div
                    key={s.n}
                    className="rounded-[var(--radius-screen)] border border-border bg-card p-6 shadow-[var(--shadow-panel)]"
                  >
                    <p className="font-mono text-[12px] text-highlight">{s.n}</p>
                    <p className="mt-2 text-[15px] font-bold text-foreground">{s.t}</p>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{s.b}</p>
                  </div>
                ))}
              </div>
            </Section>
          </SectionTrack>

          <SectionTrack name="report-tiers">
            <Section>
              <div className="max-w-3xl">
                <Eyebrow>What you get</Eyebrow>
                <SectionHeading>The score is free. The fixes cost {price}.</SectionHeading>
              </div>
              <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-5">
                <div className="flex min-w-0 flex-col rounded-[var(--radius-screen)] border border-border bg-card p-7 shadow-[var(--shadow-panel)]">
                  <p className="tva-label mb-3 text-[10px] text-muted-foreground">Free score</p>
                  <p className="text-[2rem] font-bold leading-none">€0</p>
                  <ul className="mt-5 flex-1 space-y-2 text-[14px] text-muted-foreground">
                    {FREE_ITEMS.map((i) => (
                      <li key={i}>· {i}</li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <InstallCommand cmd={PLUGIN_INSTALL_COMMAND} prompt=">" channel="plugin" step="install" location="report-tier-free" />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col rounded-[var(--radius-screen)] border border-primary bg-card p-7 shadow-[var(--shadow-panel)]">
                  <p className="tva-label mb-3 text-[10px] text-muted-foreground">Quick report</p>
                  <p className="text-[2rem] font-bold leading-none">{price}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">per report · instant</p>
                  <ul className="mt-5 flex-1 space-y-2 text-[14px] text-muted-foreground">
                    {PAID_ITEMS.map((i) => (
                      <li key={i}>· {i}</li>
                    ))}
                  </ul>
                  <BuyButton location="report-tier-paid" className="mt-6 w-full" />
                </div>
              </div>
            </Section>
          </SectionTrack>

          {sample && (
            <SectionTrack name="report-sample">
              <Section>
                <div className="max-w-3xl">
                  <Eyebrow>A real report</Eyebrow>
                  <SectionHeading>This is what our own repo got.</SectionHeading>
                  <Lead>
                    The report for this site&apos;s own code (commit {sample.commit}). We dogfood it, so the
                    score is not flattering.
                  </Lead>
                </div>
                <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <div className="min-w-0 rounded-[var(--radius-screen)] border border-border bg-card p-7 shadow-[var(--shadow-panel)]">
                    <p className="tva-label text-[10px] text-muted-foreground">Free score</p>
                    <p className="mt-3 text-[3rem] font-bold leading-none">
                      {sample.overall}
                      <span className="text-[1.25rem] text-muted-foreground"> / 100</span>
                    </p>
                    <ul className="mt-6 space-y-3">
                      {sample.areas.map((a) => (
                        <li key={a.key}>
                          <div className="flex justify-between text-[13px]">
                            <span className="text-foreground">{a.label}</span>
                            <span className="font-mono text-muted-foreground">{a.score} / 10</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-muted">
                            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${a.score * 10}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-6 text-[13px] text-muted-foreground">
                      {sample.caveatCount} caveats found. The quick report lists them.
                    </p>
                  </div>
                  <div className="min-w-0 break-words rounded-[var(--radius-screen)] border border-primary bg-card p-7 shadow-[var(--shadow-panel)]">
                    <p className="tva-label text-[10px] text-muted-foreground">Quick report · first 3 of {sample.caveatCount}</p>
                    <ol className="mt-4 space-y-5">
                      {sample.caveats.slice(0, 3).map((c, i) => (
                        <li key={c.id} className="text-[14px]">
                          <p className="font-bold text-foreground">
                            {i + 1}. {c.area}
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            {c.label.replace(/\.$/, "")}. Measured: {c.value}. Scored {c.points} of {c.max}.
                          </p>
                          {c.recommendation && (
                            <p className="mt-2 border-l-2 border-primary pl-3 text-foreground">{c.recommendation}</p>
                          )}
                        </li>
                      ))}
                    </ol>
                    <BuyButton location="report-sample" className="mt-7 w-full" />
                  </div>
                </div>
              </Section>
            </SectionTrack>
          )}

          <SectionTrack name="report-next">
            <Section>
              <p className="text-[13px] text-muted-foreground">
                What leaves your machine, and how to check it:{" "}
                <Link href="/#faq" className="text-foreground underline underline-offset-4 hover:text-highlight">
                  the FAQ →
                </Link>
              </p>
              <p className="mt-3 text-[13px] text-muted-foreground">
                Want a person to go through it with you?{" "}
                <TrackedLink
                  href="/audit"
                  event="cross_promo_click"
                  location="report-to-audit"
                  className="text-foreground underline underline-offset-4 hover:text-highlight"
                >
                  The full audit is {FULL_AUDIT.price}, delivered in {FULL_AUDIT.turnaround} →
                </TrackedLink>
              </p>
            </Section>
          </SectionTrack>
        </main>
      </GridFrame>
      <LandingFooter />
    </div>
  );
}
