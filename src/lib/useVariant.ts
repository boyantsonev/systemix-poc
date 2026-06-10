"use client";

import { useFeatureFlagVariantKey } from "posthog-js/react";

/**
 * Resolve the assigned variant for a PostHog feature flag.
 *
 * Returns `fallback` until the flag loads, when no such flag exists, or when
 * the flag is a plain boolean. This is the A/B seam: to start a real experiment,
 * create a multivariate feature flag in PostHog with key `flagKey` — no code
 * change needed to begin serving + measuring variants. Tag events with the
 * returned value so conversion can be split per variant.
 *
 * @example
 *   const variant = useVariant("landing-hero");      // "control" until a flag exists
 *   ph.capture("install_command_copied", { variant });
 */
export function useVariant(flagKey: string, fallback = "control"): string {
  const variant = useFeatureFlagVariantKey(flagKey);
  return typeof variant === "string" ? variant : fallback;
}
