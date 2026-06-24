"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";
import { useVariant } from "@/lib/useVariant";

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

export function SectionTrack({ name, experimentId, children, className }: {
  name: string;
  experimentId?: string;
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
          if (experimentId) {
            ph.capture("experiment_social_signal", {
              experiment_id: experimentId,
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
  }, [name, experimentId, ph]);

  return <div ref={ref} className={className}>{children}</div>;
}
