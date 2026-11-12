import type { Metadata } from "next";
import { SectionTrack } from "@/components/systemix/LandingEvents";
import {
  BottomCTA,
  FaqJsonLd,
  FaqSection,
  GridFrame,
  HeroRow,
  HowItWorks,
  LandingFooter,
  LandingNav,
  Commands,
  Pricing,
  Proof,
  Rules,
} from "@/components/landing/sections";
import { faq } from "@/lib/landing/content";

// DSC-23 (G-005): hero · the four commands · rules as data · proof · how it works · pricing
// (free plugin, sponsor, setup) · FAQ, then the install again.
export const metadata: Metadata = {
  title: "Systemix: the design system agent for Claude Code",
  description:
    "A free Claude Code plugin: it sets up your design system and its rules, checks your agents' work against them, and runs design sprints. Nothing leaves your machine.",
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen text-foreground">
      <FaqJsonLd items={faq.items} />
      <LandingNav />
      <GridFrame>
        <main>
          <SectionTrack name="hero">
            <HeroRow />
          </SectionTrack>
          <SectionTrack name="commands">
            <Commands />
          </SectionTrack>
          <SectionTrack name="rules">
            <Rules />
          </SectionTrack>
          <SectionTrack name="proof">
            <Proof />
          </SectionTrack>
          <SectionTrack name="how-it-works">
            <HowItWorks />
          </SectionTrack>
          <SectionTrack name="pricing">
            <Pricing />
          </SectionTrack>
          <SectionTrack name="faq">
            <FaqSection />
          </SectionTrack>
          <SectionTrack name="bottom-cta">
            <BottomCTA />
          </SectionTrack>
        </main>
      </GridFrame>
      <LandingFooter />
    </div>
  );
}
