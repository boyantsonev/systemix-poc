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
import { FULL_AUDIT, quickReportPrice } from "@/lib/pricing";

// The full AI-Readiness Audit (price in src/lib/pricing.ts): the readiness-audit skill
// drafts it, a person reviews and rewrites the judged parts, delivered in 24h.
export const metadata: Metadata = {
  title: `Full audit of your design system, ${FULL_AUDIT.price} | Systemix`,
  description: `We run the scan, then a person writes what to fix, in what order, and why. ${FULL_AUDIT.price}, delivered in ${FULL_AUDIT.turnaround}.`,
  alternates: { canonical: "/audit" },
};

export default function AuditPage() {
  return (
    <div className="min-h-screen text-foreground">
      <LandingNav />
      <GridFrame>
      <main>
        <SectionTrack name="audit-hero">
          <section className="border-b border-border/60 py-20 sm:py-24">
            <div className="mx-auto max-w-5xl px-6 text-center">
              <h1 className="mx-auto max-w-3xl text-[2rem] font-bold leading-[1.12] sm:text-[3rem] sm:leading-[1.1] [text-shadow:var(--glow-head)]">
                Full audit, {FULL_AUDIT.price}, in {FULL_AUDIT.turnaroundLong}.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
                We run the scan, then a person writes what to fix, in what order, and why.
              </p>
              <p className="mt-6 text-[13px] text-muted-foreground">
                Not sure yet?{" "}
                <TrackedLink
                  href="/report"
                  event="cross_promo_click"
                  location="audit-to-report"
                  className="text-foreground underline underline-offset-4 hover:text-highlight"
                >
                  Start with the free score, or the {quickReportPrice()} quick report →
                </TrackedLink>
              </p>
            </div>
          </section>
        </SectionTrack>

        <SectionTrack name="audit-form">
          <Section id="form">
            <div className="grid gap-10 sm:grid-cols-2 sm:items-start sm:gap-16">
              <div>
                <Eyebrow>Request it</Eyebrow>
                <SectionHeading>Send your repo. Get the audit.</SectionHeading>
                <Lead>
                  Read-only: nothing is written to your repo. You get a score out of 100, the six areas,
                  and the fixes in order, within {FULL_AUDIT.turnaround}.
                </Lead>
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
