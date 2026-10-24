import type { Metadata } from "next";
import {
  Eyebrow,
  GridFrame,
  LandingFooter,
  LandingNav,
  Lead,
  Section,
  SectionHeading,
} from "@/components/landing/sections";
import { SectionTrack, TrackedLink } from "@/components/systemix/LandingEvents";
import { AuditRequestForm } from "@/components/landing/AuditRequestForm";
import { Button } from "@/components/ui/button";
import { FULL_AUDIT, quickReportPrice } from "@/lib/pricing";

// The full AI-Readiness Audit (price in src/lib/pricing.ts): the readiness-audit skill
// drafts it, a person reviews and rewrites the judged parts, delivered in 24h.
export const metadata: Metadata = {
  title: "AI-Readiness Audit — is your design system AI-ready? | Systemix",
  description:
    `A scored AI-readiness report for your design system, drafted by AI and reviewed by a person: drift, duplicates, what to fix first, and how. ${FULL_AUDIT.price}, delivered in ${FULL_AUDIT.turnaround}.`,
  alternates: { canonical: "/audit" },
};

export default function AuditPage() {
  return (
    <div className="min-h-screen text-foreground">
      <LandingNav />
      <GridFrame>
      <main>
        <SectionTrack name="audit-hero">
          <section className="border-b border-border/60 py-24 sm:py-28">
            <div className="mx-auto max-w-5xl px-6 text-center">
              <Eyebrow>Full audit · {FULL_AUDIT.price} · delivered in {FULL_AUDIT.turnaround}</Eyebrow>
              <h1 className="mx-auto max-w-3xl text-[2rem] font-bold leading-[1.12] sm:text-[3rem] sm:leading-[1.1] [text-shadow:var(--glow-head)]">
                Is your design system AI-ready?
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
                Send us your repo. You get back a scored readiness report, drafted by AI and reviewed
                and rewritten by a person: the drift, the duplicates, what to fix first, and how.
              </p>
              <Button variant="secondary" size="lg" className="mt-9" asChild>
                <a href="#form">Request the audit</a>
              </Button>
            </div>
          </section>
        </SectionTrack>

        <SectionTrack name="audit-paths">
          <Section>
            <div className="max-w-3xl">
              <Eyebrow>What you get</Eyebrow>
              <SectionHeading>A scored report, not a vibe check.</SectionHeading>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 sm:gap-5">
              <div className="flex flex-col rounded-[var(--radius-screen)] border border-primary bg-card p-7 shadow-[var(--shadow-panel)]">
                <p className="tva-label mb-3 text-[10px] text-muted-foreground">Full audit</p>
                <p className="text-[2rem] font-bold leading-none">{FULL_AUDIT.price}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  reviewed by a person · delivered in {FULL_AUDIT.turnaround}
                </p>
                <p className="mt-4 flex-1 text-[14px] leading-relaxed text-muted-foreground">
                  A readiness score 0–100 across six dimensions, the drift + slop map, an opportunity
                  ranking, and the exact setup to fix it.
                </p>
                <Button variant="secondary" size="sm" className="mt-6 w-full" asChild>
                  <a href="#form">Request the audit</a>
                </Button>
              </div>
              <div className="flex flex-col rounded-[var(--radius-screen)] border border-border bg-card p-7 shadow-[var(--shadow-panel)]">
                <p className="tva-label mb-3 text-[10px] text-muted-foreground">Quick report</p>
                <p className="text-[2rem] font-bold leading-none">{quickReportPrice()}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">instant · no person involved</p>
                <p className="mt-4 flex-1 text-[14px] leading-relaxed text-muted-foreground">
                  Not sure yet? Get your score free, then the caveats and recommendations for{" "}
                  {quickReportPrice()}. It runs on your machine; your code is never sent.
                </p>
                <Button variant="outline" size="sm" className="mt-6 w-full" asChild>
                  <TrackedLink href="/report" event="cross_promo_click" location="audit-to-report">
                    Start with the free score →
                  </TrackedLink>
                </Button>
              </div>
            </div>
          </Section>
        </SectionTrack>

        <SectionTrack name="audit-form">
          <Section id="form">
            <div className="grid gap-10 sm:grid-cols-2 sm:items-start sm:gap-16">
              <div>
                <Eyebrow>The form</Eyebrow>
                <SectionHeading>Send it. Get the report.</SectionHeading>
                <Lead>
                  Read-only: nothing is written to your repo. AI drafts the readiness audit, a person
                  reviews and rewrites it, and you get your scored report within {FULL_AUDIT.turnaround}.
                </Lead>
                <p className="mt-6 font-mono text-[12px] text-muted-foreground">
                  {FULL_AUDIT.price}, one-time. A real report, reviewed by a person, not a bot dump.
                </p>
              </div>
              <AuditRequestForm />
            </div>
          </Section>
        </SectionTrack>

      </main>
      </GridFrame>
      <LandingFooter />
    </div>
  );
}
