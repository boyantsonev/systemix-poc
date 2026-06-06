// docs-manifest.ts
// Single source of truth for the product docs nav and migration status.
// Replaces the hardcoded NAV array in DocsSidebar.tsx and MOBILE_NAV in docs/layout.tsx.
//
// status:
//   "missing"   — no page exists yet (MDX file + TSX shell both absent)
//   "draft"     — TSX content exists but not yet migrated to MDX
//   "review"    — MDX file written, awaiting human sign-off
//   "published" — MDX live, shell updated, migration complete
//   "stale"     — source data changed since last MDX update (flagged by sync-docs)

export type DocStatus = "published" | "review" | "draft" | "missing" | "stale";

export type DocSection =
  | "Getting Started"
  | "The loop"
  | "The stack"
  | "Reference";

export type DocEntry = {
  /** Relative path used to resolve content/docs/{slug}.mdx */
  slug: string;
  title: string;
  section: DocSection;
  /** Full /docs/... route */
  href: string;
  status: DocStatus;
  lastUpdated?: string;
  /** True for /design-system and /dashboard links in the Reference section */
  external?: boolean;
  /** True when interactive TSX sections stay; only prose is migrated to MDX */
  partial?: boolean;
};

export const docsManifest: DocEntry[] = [
  // ─── Getting Started ───────────────────────────────────────────────────────
  {
    slug: "introduction",
    title: "Introduction",
    section: "Getting Started",
    href: "/docs/introduction",
    status: "review",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "quick-install",
    title: "Quick Install",
    section: "Getting Started",
    href: "/docs/quick-install",
    status: "review",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "guides/setup",
    title: "Setup Guide",
    section: "Getting Started",
    href: "/docs/guides/setup",
    status: "review",
    lastUpdated: "2026-06-06",
  },

  // ─── The loop ──────────────────────────────────────────────────────────────
  {
    slug: "concepts/hypothesis-validation",
    title: "Hypothesis Validation",
    section: "The loop",
    href: "/docs/concepts/hypothesis-validation",
    status: "review",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/hermes",
    title: "Hermes",
    section: "The loop",
    href: "/docs/concepts/hermes",
    status: "review",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/hitl",
    title: "HITL & Decision Queue",
    section: "The loop",
    href: "/docs/concepts/hitl",
    status: "review",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/evidence-layer",
    title: "Evidence Layer",
    section: "The loop",
    href: "/docs/concepts/evidence-layer",
    status: "review",
    lastUpdated: "2026-06-06",
  },

  // ─── The stack ─────────────────────────────────────────────────────────────
  {
    slug: "concepts/contract",
    title: "MDX contracts",
    section: "The stack",
    href: "/docs/concepts/contract",
    status: "review",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/drift",
    title: "Drift & Reconciliation",
    section: "The stack",
    href: "/docs/concepts/drift",
    status: "review",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/quality-score",
    title: "Quality Score",
    section: "The stack",
    href: "/docs/concepts/quality-score",
    status: "review",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/figma-mcps",
    title: "Figma MCPs",
    section: "The stack",
    href: "/docs/concepts/figma-mcps",
    status: "review",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/instance-model",
    title: "Instance model",
    section: "The stack",
    href: "/docs/concepts/instance-model",
    status: "missing",
  },
  {
    slug: "concepts/workflow-atlas",
    title: "Workflow Atlas",
    section: "The stack",
    href: "/docs/concepts/workflow-atlas",
    status: "missing",
  },

  // ─── Reference ─────────────────────────────────────────────────────────────
  {
    slug: "reference/skills",
    title: "Skills library",
    section: "Reference",
    href: "/docs/skills",
    status: "draft",
    partial: true,
  },
  {
    slug: "reference/architecture",
    title: "Architecture",
    section: "Reference",
    href: "/docs/architecture",
    status: "draft",
    partial: true,
  },
  {
    slug: "reference/mcp-server",
    title: "MCP server",
    section: "Reference",
    href: "/docs/reference/mcp-server",
    status: "missing",
  },
  {
    slug: "reference/posthog",
    title: "PostHog integration",
    section: "Reference",
    href: "/docs/reference/posthog",
    status: "missing",
  },
  // External links — always visible in nav, no MDX file
  {
    slug: "",
    title: "System",
    section: "Reference",
    href: "/design-system",
    status: "published",
    external: true,
  },
  {
    slug: "",
    title: "Dashboard",
    section: "Reference",
    href: "/dashboard",
    status: "published",
    external: true,
  },
];

// ─── Nav helpers ─────────────────────────────────────────────────────────────

const SECTION_ORDER: DocSection[] = [
  "Getting Started",
  "The loop",
  "The stack",
  "Reference",
];

/** Returns manifest entries grouped into ordered sections for nav rendering. */
export function getNavSections() {
  return SECTION_ORDER.map((section) => ({
    section,
    items: docsManifest.filter((e) => e.section === section),
  }));
}

/** Returns manifest entries that have (or will have) a routable page. */
export function getRoutableEntries() {
  return docsManifest.filter((e) => !e.external);
}

/** Coverage summary for the sync-docs skill. */
export function getManifestCoverage() {
  const entries = getRoutableEntries();
  return {
    total: entries.length,
    published: entries.filter((e) => e.status === "published").length,
    review: entries.filter((e) => e.status === "review").length,
    draft: entries.filter((e) => e.status === "draft").length,
    missing: entries.filter((e) => e.status === "missing").length,
    stale: entries.filter((e) => e.status === "stale").length,
  };
}
