"use client";

import { usePostHog } from "posthog-js/react";
import { useEffect, useRef, useState } from "react";
import { morphText } from "@/lib/motion/morph";
import { motionAllowed } from "@/lib/motion/tokens";
import { useVariant } from "@/lib/useVariant";
import {
  AUDIT_COMMAND,
  PLUGIN_ADD_COMMAND,
  PLUGIN_INSTALL_COMMAND,
  PLUGIN_SCORE_COMMAND,
} from "@/lib/landing/content";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Install command with copy button ──────────────────────────────────────────

export function InstallCommand({
  cmd = AUDIT_COMMAND,
  location = "hero",
  prompt = "$",
  channel = "cli",
  step,
  className,
}: { cmd?: string; location?: string; prompt?: string; channel?: "cli" | "plugin"; step?: string; className?: string } = {}) {
  const ph = usePostHog();
  // A/B seam: create a `landing-hero` multivariate flag in PostHog to split this.
  const variant = useVariant("landing-hero");
  const [copied, setCopied] = useState(false);
  const label = useRef<HTMLSpanElement>(null);

  // transitions.dev / Text morph (33): COPY → COPIED ✓ and back, only the changing letters blur
  useEffect(() => {
    const el = label.current;
    if (!el) return;
    const next = copied ? "COPIED ✓" : "COPY";
    if (motionAllowed()) morphText(el, next);
    else {
      el.dataset.text = next;
      el.textContent = next;
    }
  }, [copied]);

  function copy() {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      ph.capture("install_command_copied", { location, variant, channel, ...(step ? { step } : {}) });
      // hero-cta-click-rate is experiment landing-ai-native-ds-2026-07's metric —
      // only fire it from the actual hero, or non-hero copies (kit, pricing,
      // bottom CTA) pollute a metric that's scoped to one section.
      if (location === "hero") {
        ph.capture("hero_cta_click", { cta: "install", variant });
      }
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div
      onClick={copy}
      className={cn(
        "inline-flex max-w-full items-center gap-3 font-mono text-[13px] bg-muted/60 border border-border/60 rounded-lg py-2.5 pl-4 pr-1.5 cursor-pointer hover:bg-muted transition-colors select-none",
        className,
      )}
      title="Click to copy"
    >
      <span className="text-muted-foreground/40">{prompt}</span>
      <span className="min-w-0 flex-1 break-words text-left text-foreground/80">{cmd}</span>
      {/* The copy affordance itself is the filed-btn (default Button variant) —
          stopPropagation so clicking it doesn't also fire the parent div's copy. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          copy();
        }}
        className={cn(buttonVariants({ size: "xs" }), "ml-1")}
      >
        <span ref={label} className="t-morph">
          COPY
        </span>
      </button>
    </div>
  );
}

// ── Plugin install: the two Claude Code commands, then the score ─────────────
// Each line copies on its own (pasting two slash commands at once runs only the
// first). install_command_copied carries channel "plugin" and the step.

export function PluginInstall({ location = "hero", className }: { location?: string; className?: string }) {
  return (
    <div className={cn("flex min-w-0 max-w-full flex-col items-start gap-2", className)}>
      <div className="flex w-fit max-w-full flex-col gap-2">
        <InstallCommand cmd={PLUGIN_ADD_COMMAND} prompt=">" channel="plugin" step="marketplace" location={location} className="w-full" />
        <InstallCommand cmd={PLUGIN_INSTALL_COMMAND} prompt=">" channel="plugin" step="install" location={location} className="w-full" />
      </div>
      <p className="font-mono text-[11px] text-muted-foreground/70">
        in Claude Code, then run <span className="text-foreground/80">{PLUGIN_SCORE_COMMAND}</span> in your repo
      </p>
    </div>
  );
}

// ── Tracked conversion link ───────────────────────────────────────────────────
// A plain anchor that fires a PostHog event on click. Used for the book-a-call /
// sprint CTAs so the `book_a_call` metric the landing experiment measures is real.

export function TrackedLink({
  href,
  event,
  location,
  persona,
  className,
  target,
  rel,
  children,
}: {
  href: string;
  event: string;
  location: string;
  /** Which /for/<persona> page fired this — a breakdown property, never a new event name. */
  persona?: string;
  className?: string;
  target?: string;
  rel?: string;
  children: React.ReactNode;
}) {
  const ph = usePostHog();
  // Tag conversions with the hero variant so the loop runner can split counts
  // per arm once a multivariate `landing-hero` flag goes live ("control" until then).
  const variant = useVariant("landing-hero");
  return (
    <a
      href={href}
      className={className}
      target={target}
      rel={rel}
      onClick={() => ph?.capture(event, { location, variant, ...(persona ? { persona } : {}) })}
    >
      {children}
    </a>
  );
}

// ── Section view tracker (Intersection Observer) ──────────────────────────────

export function SectionTrack({ name, experimentId, persona, children, className }: {
  name: string;
  experimentId?: string;
  /** Which /for/<persona> page this section rendered on — a breakdown property. */
  persona?: string;
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
          ph.capture("section_viewed", { section: name, ...(persona ? { persona } : {}) });
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
    // The motion layer's reveals (src/styles/motion.css) play when the section enters the view.
    // A separate observer: threshold 0, since a tall section may never be 30% in view on a phone.
    const reveal = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-shown");
          reveal.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    reveal.observe(el);
    return () => {
      obs.disconnect();
      reveal.disconnect();
    };
  }, [name, experimentId, persona, ph]);

  return <div ref={ref} className={className}>{children}</div>;
}
