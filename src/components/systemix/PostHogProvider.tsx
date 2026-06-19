"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

// Build-time inlined. Absent → no signal connected: we don't initialise capture
// and we don't try to send events (posthog-js would otherwise console-warn). The
// honest unconfigured state is surfaced to the operator via /config (see ADR-020).
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!pathname || !POSTHOG_KEY) return;
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    ph.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

if (typeof window !== "undefined" && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    // Same-origin reverse proxy (see next.config rewrites → PostHog EU) so ad/tracker
    // blockers can't drop event capture. NEXT_PUBLIC_POSTHOG_HOST is no longer the
    // ingest host — the proxy is hardcoded to EU; the var stays as the ui_host fallback.
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.posthog.com",
    capture_pageview: false, // we handle it manually above
    capture_pageleave: true,
    person_profiles: "identified_only",
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}
