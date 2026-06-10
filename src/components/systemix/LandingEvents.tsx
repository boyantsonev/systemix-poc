"use client";

import { usePostHog } from "posthog-js/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/lib/site-config";
import { useVariant } from "@/lib/useVariant";

// ── Hero CTAs ─────────────────────────────────────────────────────────────────

export function HeroCTAs() {
  const ph = usePostHog();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
      <a
        href={siteConfig.githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => ph.capture("hero_cta_click", { cta: "github" })}
        className="inline-flex items-center gap-2 text-[13px] font-medium bg-foreground text-background px-4 py-2 hover:opacity-90 transition-opacity"
      >
        Star on GitHub →
      </a>
      <Link
        href="/docs/quick-install"
        onClick={() => ph.capture("hero_cta_click", { cta: "docs" })}
        className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
      >
        Read the docs →
      </Link>
    </div>
  );
}

// ── Nav CTAs ──────────────────────────────────────────────────────────────────

export function NavCTAs() {
  const ph = usePostHog();

  return (
    <div className="ml-auto flex items-center gap-2">
      <a
        href={siteConfig.githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => ph.capture("nav_cta_click", { cta: "github" })}
        className="text-[12px] font-medium border border-border text-foreground px-3 py-1.5 hover:bg-muted/50 transition-colors"
      >
        GitHub →
      </a>
      <Link
        href="/docs/quick-install"
        onClick={() => ph.capture("nav_cta_click", { cta: "get-started" })}
        className="text-[12px] font-medium bg-foreground text-background px-3 py-1.5 hover:opacity-90 transition-opacity"
      >
        Get started →
      </Link>
    </div>
  );
}

// ── Install command with copy button ──────────────────────────────────────────

export function InstallCommand() {
  const ph = usePostHog();
  // A/B seam: create a `landing-hero` multivariate flag in PostHog to split this.
  const variant = useVariant("landing-hero");
  const [copied, setCopied] = useState(false);
  const cmd = "npx systemix init";

  function copy() {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      ph.capture("install_command_copied", { location: "hero", variant });
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      onClick={copy}
      className="inline-flex items-center gap-3 font-mono text-[13px] bg-muted/60 border border-border/60 rounded-lg px-4 py-2.5 cursor-pointer hover:bg-muted transition-colors select-none"
      title="Click to copy"
    >
      <span className="text-muted-foreground/40">$</span>
      <span className="text-foreground/80">{cmd}</span>
      <span className="text-[10px] text-muted-foreground/40 ml-1">
        {copied ? "copied!" : "copy"}
      </span>
    </div>
  );
}

// ── Section view tracker (Intersection Observer) ──────────────────────────────

export function SectionTrack({ name, hypothesisId, children, className }: {
  name: string;
  hypothesisId?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ph = usePostHog();
  const ref = useRef<HTMLDivElement>(null);
  const fired = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          fired.current = true;
          ph.capture("section_viewed", { section: name });
          if (hypothesisId) {
            ph.capture("hypothesis_social_signal", {
              hypothesis_id: hypothesisId,
              section: name,
              signal_type: "section_view",
            });
          }
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [name, hypothesisId, ph]);

  return <div ref={ref} className={className}>{children}</div>;
}
