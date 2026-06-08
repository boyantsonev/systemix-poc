// docs-manifest.ts
// Single source of truth for the product docs nav and migration status.
// Drives the sidebar (DocsSidebar.tsx) and the mobile nav (docs/layout.tsx).
//
// IA: journey-based — Get started → Configure → Run → Extend — with role accents
// (audience). See docs/feature/site-rebuild/docs-ia.md.
//
// status:
//   "missing"   — no page exists yet (MDX file + TSX shell both absent)
//   "draft"     — TSX content exists but not yet migrated to MDX
//   "review"    — MDX file written, awaiting human sign-off
//   "published" — MDX live, shell updated, migration complete
//   "stale"     — source data changed since last MDX update (flagged by sync-docs)

export type DocStatus = "published" | "review" | "draft" | "missing" | "stale";

export type DocSection =
  | "Get started"
  | "Configure"
  | "Run"
  | "Extend";

/** Role accent — used by the "Start here for…" chooser and (later) a nav tag. */
export type DocAudience = "operator" | "designer" | "engineer" | "all";

export type DocEntry = {
  /** Relative path used to resolve content/docs/{slug}.mdx */
  slug: string;
  title: string;
  section: DocSection;
  /** Full /docs/... route */
  href: string;
  status: DocStatus;
  /** Role accent (optional; defaults to "all" in the UI) */
  audience?: DocAudience;
  lastUpdated?: string;
  /** True for /design-system and /dashboard links */
  external?: boolean;
  /** True when interactive TSX sections stay; only prose is migrated to MDX */
  partial?: boolean;
};

export const docsManifest: DocEntry[] = [
  // ─── Get started ───────────────────────────────────────────────────────────
  {
    slug: "introduction",
    title: "Introduction",
    section: "Get started",
    href: "/docs/introduction",
    status: "review",
    audience: "all",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "quick-install",
    title: "Quick install",
    section: "Get started",
    href: "/docs/quick-install",
    status: "review",
    audience: "engineer",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "guides/setup",
    title: "First run",
    section: "Get started",
    href: "/docs/guides/setup",
    status: "review",
    audience: "engineer",
    lastUpdated: "2026-06-06",
  },

  // ─── Configure ─────────────────────────────────────────────────────────────
  // Most Configure pages are FRESH and tracked in #30 (init, feed-inputs,
  // define-hypothesis, config-reference, autonomy, self-improvement). Only the
  // already-written page is slotted here for now.
  {
    slug: "reference/posthog",
    title: "Signals & secrets",
    section: "Configure",
    href: "/docs/reference/posthog",
    status: "review",
    audience: "engineer",
    lastUpdated: "2026-06-06",
  },

  // ─── Run ───────────────────────────────────────────────────────────────────
  {
    slug: "concepts/hypothesis-validation",
    title: "The loop",
    section: "Run",
    href: "/docs/concepts/hypothesis-validation",
    status: "review",
    audience: "operator",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/hermes",
    title: "Hermes",
    section: "Run",
    href: "/docs/concepts/hermes",
    status: "review",
    audience: "operator",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/hitl",
    title: "HITL & Decision Queue",
    section: "Run",
    href: "/docs/concepts/hitl",
    status: "review",
    audience: "operator",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/evidence-layer",
    title: "Evidence Layer",
    section: "Run",
    href: "/docs/concepts/evidence-layer",
    status: "review",
    audience: "operator",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/instance-model",
    title: "Graph (instance model)",
    section: "Run",
    href: "/docs/concepts/instance-model",
    status: "review",
    audience: "operator",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/workflow-atlas",
    title: "Atlas (workflows)",
    section: "Run",
    href: "/docs/concepts/workflow-atlas",
    status: "review",
    audience: "operator",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/contract",
    title: "Contracts",
    section: "Run",
    href: "/docs/concepts/contract",
    status: "review",
    audience: "all",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/drift",
    title: "Drift & Reconciliation",
    section: "Run",
    href: "/docs/concepts/drift",
    status: "review",
    audience: "designer",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/quality-score",
    title: "Quality Score",
    section: "Run",
    href: "/docs/concepts/quality-score",
    status: "review",
    audience: "designer",
    lastUpdated: "2026-06-06",
  },
  // App surfaces (external routes)
  {
    slug: "",
    title: "System (design system)",
    section: "Run",
    href: "/design-system",
    status: "published",
    audience: "designer",
    external: true,
  },
  {
    slug: "",
    title: "Dashboard",
    section: "Run",
    href: "/dashboard",
    status: "published",
    audience: "operator",
    external: true,
  },

  // ─── Extend ────────────────────────────────────────────────────────────────
  {
    slug: "reference/skills",
    title: "Skills library",
    section: "Extend",
    href: "/docs/skills",
    status: "review",
    audience: "engineer",
    lastUpdated: "2026-06-06",
    partial: true,
  },
  {
    slug: "reference/mcp-server",
    title: "MCP server",
    section: "Extend",
    href: "/docs/reference/mcp-server",
    status: "review",
    audience: "engineer",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "concepts/figma-mcps",
    title: "Figma MCPs",
    section: "Extend",
    href: "/docs/concepts/figma-mcps",
    status: "review",
    audience: "designer",
    lastUpdated: "2026-06-06",
  },
  {
    slug: "reference/architecture",
    title: "Architecture",
    section: "Extend",
    href: "/docs/architecture",
    status: "review",
    audience: "engineer",
    lastUpdated: "2026-06-06",
    partial: true,
  },
];

// ─── Nav helpers ─────────────────────────────────────────────────────────────

const SECTION_ORDER: DocSection[] = [
  "Get started",
  "Configure",
  "Run",
  "Extend",
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

/** First non-external entry matching a role — used by the docs index chooser. */
export function getEntryForAudience(audience: DocAudience) {
  return docsManifest.find((e) => !e.external && e.audience === audience);
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
