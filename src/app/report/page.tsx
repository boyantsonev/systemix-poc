import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import {
  Eyebrow,
  FaqJsonLd,
  GridFrame,
  LandingFooter,
  LandingNav,
  Lead,
  Section,
  SectionHeading,
} from "@/components/landing/sections";
import { InstallCommand, SectionTrack, TrackedLink } from "@/components/systemix/LandingEvents";
import { Button } from "@/components/ui/button";
import { FREE_SCORE_COMMAND, FULL_AUDIT, quickReportCheckoutUrl, quickReportPrice } from "@/lib/pricing";

// The quick report: the free score, then the full report for one small payment.
// Price and checkout link come from src/lib/pricing.ts (settings, not code).
export const metadata: Metadata = {
  title: "Free AI-readiness score for your design system | Systemix",
  description:
    "Run one command in your repo and get your design system's AI-readiness score out of 100, free. Your code never leaves your machine. The full report with what to fix first is one small payment.",
  alternates: { canonical: "/report" },
};

const NOTIFY_MAILTO =
  "mailto:boyan.works@gmail.com?subject=Tell%20me%20when%20the%20Systemix%20quick%20report%20is%20live";

const STEPS = [
  { n: "1", t: "Run one command", b: "In your repo's root. The scan runs on your machine and takes a minute or two." },
  { n: "2", t: "See your score", b: "Free: a score out of 100 and a score for each of six areas." },
  { n: "3", t: "Unlock the report", b: "Buy a key, run the same command with it, and get what to fix first." },
];

const FREE_ITEMS = ["overall score out of 100", "a score for each of six areas", "how many caveats were found"];
const PAID_ITEMS = [
  "every caveat that costs points, biggest first",
  "what was measured for each",
  "one recommendation for each, in order",
  "the same code always gives the same report",
];

const FAQ = [
  {
    q: "What leaves my machine?",
    a: "Only the results file: numbers, counter definitions, file and folder paths, and short names such as token names. Never your source code.",
  },
  {
    q: "Can I see exactly what is sent?",
    a: "Yes. Add --dry-run --payload-out results.json to write the file without sending it. Add --redact-paths to replace every file name with a hash; the score does not change.",
  },
  {
    q: "Is an AI judging my code?",
    a: "No. The numbers come from a deterministic scan and a published scoring rubric. Run it twice on the same commit and you get the same report.",
  },
  {
    q: "What do I need?",
    a: "Node.js 18 or newer, and a repo with a web UI. No account, no sign-up.",
  },
];

type SampleReport = {
  overall: number;
  areas: { key: string; label: string; score: number }[];
  caveats: { id: string; area: string; label: string; value: string; points: number; max: number; recommendation: string | null }[];
  caveatCount: number;
  commit: string;
};

/** The real report for this site's own repo (a committed results file), so the sample is never made up. */
async function loadSample(): Promise<SampleReport | null> {
  try {
    const file = path.join(process.cwd(), "packages/cli/tests/acceptance/skills/fixtures/systemix-poc-986a92fca0cb.counters.json");
    const counters = JSON.parse(fs.readFileSync(file, "utf8"));
    const { build } = await import("../../../packages/cli/src/lib/quick-report.js");
    const r = build(counters);
    if (!r.scored || r.overall === null) return null;
    return { overall: r.overall, areas: r.areas, caveats: r.caveats, caveatCount: r.caveatCount ?? r.caveats.length, commit: String(counters.repo?.commit ?? "").slice(0, 12) };
  } catch {
    return null;
  }
}

function BuyButton({ location, className }: { location: string; className?: string }) {
  const url = quickReportCheckoutUrl();
  const price = quickReportPrice();
  return url ? (
    <Button variant="secondary" size="lg" className={className} asChild>
      <TrackedLink href={url} event="checkout_clicked" location={location}>
        Buy the full report — {price}
      </TrackedLink>
    </Button>
  ) : (
    <Button variant="outline" size="lg" className={className} asChild>
      <TrackedLink href={NOTIFY_MAILTO} event="report_notify_requested" location={location}>
        Full report coming soon — email me
      </TrackedLink>
    </Button>
  );
}

export default async function QuickReportPage() {
  const sample = await loadSample();
  const price = quickReportPrice();

  return (
    <div className="min-h-screen text-foreground">
      <FaqJsonLd items={FAQ} />
      <LandingNav />
      <GridFrame>
        <main>
          <SectionTrack name="report-hero">
            <section className="border-b border-border/60 py-24 sm:py-28">
              <div className="mx-auto max-w-5xl px-6 text-center">
                <Eyebrow>Free score · full report {price}</Eyebrow>
                <h1 className="mx-auto max-w-3xl text-[2rem] font-bold leading-[1.12] sm:text-[3rem] sm:leading-[1.1] [text-shadow:var(--glow-head)]">
                  Can your AI agents follow your design system?
                </h1>
                <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
                  Run one command in your repo. Get a score out of 100 in a few minutes, free. Your code
                  stays on your machine.
                </p>
                <div className="mt-9 flex flex-col items-center gap-3">
                  <InstallCommand cmd={FREE_SCORE_COMMAND} location="report-hero" />
                  <p className="font-mono text-[11px] text-muted-foreground/70">
                    Node 18+ · run it in your repo&apos;s root · no account
                  </p>
                </div>
              </div>
            </section>
          </SectionTrack>

          <SectionTrack name="report-steps">
            <Section>
              <div className="max-w-3xl">
                <Eyebrow>How it works</Eyebrow>
                <SectionHeading>Three steps, one command.</SectionHeading>
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
                    <InstallCommand cmd={FREE_SCORE_COMMAND} location="report-tier-free" />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col rounded-[var(--radius-screen)] border border-primary bg-card p-7 shadow-[var(--shadow-panel)]">
                  <p className="tva-label mb-3 text-[10px] text-muted-foreground">Full quick report</p>
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
                <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <div className="rounded-[var(--radius-screen)] border border-border bg-card p-7 shadow-[var(--shadow-panel)]">
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
                      {sample.caveatCount} caveats found. The full report lists them.
                    </p>
                  </div>
                  <div className="rounded-[var(--radius-screen)] border border-primary bg-card p-7 shadow-[var(--shadow-panel)]">
                    <p className="tva-label text-[10px] text-muted-foreground">Full report · first 3 of {sample.caveatCount}</p>
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

          <SectionTrack name="report-faq">
            <Section>
              <div className="max-w-3xl">
                <Eyebrow>Your code stays yours</Eyebrow>
                <SectionHeading>The honest answers.</SectionHeading>
              </div>
              <div className="mt-10 flex flex-col divide-y divide-border/60 border-y border-border/60">
                {FAQ.map((f) => (
                  <details key={f.q} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold text-foreground [&::-webkit-details-marker]:hidden">
                      {f.q}
                      <span aria-hidden className="font-mono text-muted-foreground transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
              <p className="mt-8 text-[13px] text-muted-foreground">
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
