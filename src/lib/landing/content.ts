// Landing copy registry — the single place to edit the narrative, and the seam
// the hero A/B test reads from (useVariant("landing-hero")). Engine = Claude Code.
//
// Rebrand (landing-rebrand-hifi-2026-07), revision 2: dense soft-grid arc —
// announcement → hero row (copy | facts | tools) → stack strip → statement →
// deep-dives → audiences → proof → credibility → pricing → build-vs-buy → FAQ.
// Voice: outcome first, mechanism below the fold. "The loop" is BANNED in
// marketing copy — say "the automation", "an AI-native design system that
// learns from your signals", "the agentic feed / context layer". Product
// surfaces keep the concrete nouns (experiments, learnings, decisions).
// Copy decks: docs/feature/rebrand-hifi/ · SEO: seo-gtm-brief.md

import { FULL_AUDIT, quickReportPrice } from "@/lib/pricing";

export const GITHUB_URL = "https://github.com/boyantsonev/systemix-poc";
export const AUDIT_COMMAND = "npx @getsystemix/cli audit";

// The Claude Code plugin is the front door. PLUGIN_MARKETPLACE is the GitHub repo that holds
// .claude-plugin/marketplace.json: this repo today (its root marketplace points at plugin/),
// the public plugin repo once it is published. One line to switch.
export const PLUGIN_MARKETPLACE = "boyantsonev/systemix-poc";
export const PLUGIN_ADD_COMMAND = `/plugin marketplace add ${PLUGIN_MARKETPLACE}`;
export const PLUGIN_INSTALL_COMMAND = "/plugin install systemix@systemix";
export const PLUGIN_SCORE_COMMAND = "/systemix:score";
export const INIT_COMMAND = "npx @getsystemix/cli init";
export const BRAND_CLONE_MAILTO =
  "mailto:boyan.works@gmail.com?subject=Brand%20clone%20request";
export const KIT_MAILTO = "mailto:boyan.works@gmail.com?subject=Systemix%20AI%20Kit";
export const CALL_MAILTO = "mailto:boyan.works@gmail.com?subject=Systemix%20scoping%20call";

// Checkout seam — flip these to the LemonSqueezy product URLs once the store is
// live (e.g. "https://<store>.lemonsqueezy.com/buy/<id>"). Until then they fall
// back to the existing mailto/form so nothing breaks. One-line change per tier.
export const KIT_CHECKOUT_URL = KIT_MAILTO;
export const AUDIT_CHECKOUT_URL = "mailto:boyan.works@gmail.com?subject=Systemix%20AI-Readiness%20Audit";

/** The positioning line — say this before any jargon (SEO brief §1). */
export const POSITIONING = "Systemix keeps your design system from rotting.";

// ── Announcement strip ────────────────────────────────────────────────────────

export const announcement = {
  text: "Claude Code plugin · Open source · Free AI-readiness score",
  href: GITHUB_URL,
};

// ── Hero (flag: landing-hero — keep control / variant_b) ─────────────────────

export type HeroVariant = {
  h1: string;
  body: string;
};

export const hero = {
  /**
   * A/B seam — experiment `landing-rebrand-hifi-2026-07` ships through the same
   * `landing-hero` flag as its predecessor. No flag configured → everyone gets
   * variant_b (ship-and-compare); control is kept for a future real split.
   */
  variants: {
    control: {
      h1: "Your design system rots. Systemix fixes that.",
      body: "Systemix watches what you ship, catches drift, and proposes fixes your team approves. Your system learns instead of decaying.",
    },
    variant_b: {
      h1: "Your design system rots. This one learns.",
      body: "An AI-native design system that learns from the signals it gets: every release it catches what drifted, proposes the fix, and remembers why.",
    },
  } satisfies Record<"control" | "variant_b", HeroVariant>,
  fineprint: "Open source · ghost mode by default · your files, your repo",
};

// ── Hero facts — the "what you get" table cell (dense soft-grid pattern) ─────

export type HeroFact = { label: string; value: string };

export const heroFacts = {
  label: "What you get",
  items: [
    { label: "Monthly fee", value: "$0" },
    { label: "Runs on", value: "your AI coding tool" },
    { label: "Touches your code", value: "never uninvited" },
    { label: "Ways in", value: "Claude Code plugin · CLI · MCP" },
    // + a dynamic row derived at build time from experiments/ + LEARNINGS.md
  ] satisfies HeroFact[],
};

// ── Logo rows ─────────────────────────────────────────────────────────────────

export const logoRows = {
  tools: {
    label: "Use it with your AI coding tool",
    items: ["Claude Code", "Cursor", "Codex"],
  },
  stack: {
    label: "Plugs into your stack",
    items: ["GitHub", "PostHog", "Vercel", "shadcn", "Tailwind", "Figma (optional)"],
  },
};

// ── Statement block — the two-tone problem/resolution (soft-grid pattern) ────

export const statement = {
  strong: "AI can generate a design system in an afternoon. Keeping it true is the hard part.",
  dim: "Nobody writes down why the decisions were made — so by week two it drifts, and by week six it's slop. Systemix runs inside your AI coding tool, watches every release, and writes down what changed and why.",
};

// ── Feature deep-dives — negative→positive headline + mockup key ─────────────

export type DeepDive = {
  key: string;
  headline: string;
  body: string;
  mockup: "experiment-card" | "learnings-feed" | "doors-code" | "signals-card" | "hitl-card" | "drift-report";
};

// Trimmed to three: what it does (autopilot, with receipts folded in), how you
// run it (doors), and why it's safe (control). Signals + drift live in the FAQ.
export const deepDives: DeepDive[] = [
  {
    key: "autopilot",
    headline: "Your design system, on autopilot.",
    body: "Every ship is a signal. Systemix watches what changed, proposes the decision, and — once you approve — writes down the reason with its evidence. Solved problems stay solved; you never re-decide the same thing.",
    mockup: "experiment-card",
  },
  {
    key: "doors",
    headline: "Install it like any Claude Code plugin.",
    body: "Two commands in Claude Code and /systemix:score tells you how well your agents can follow your design system. The same scan runs from the terminal CLI or over MCP, on the same files, for teams on Cursor or Codex.",
    mockup: "doors-code",
  },
  {
    key: "control",
    headline: "You stay in control.",
    body: "It starts in ghost mode — suggest only. Dial up to assisted or autonomous when you trust it. A human always closes the decision.",
    mockup: "hitl-card",
  },
];

// ── Audiences — the design system as an architecture ─────────────────────────

export const audiences = {
  label: "Every role",
  heading: "Everyone works from the same notes.",
  body: "One source of truth your whole team — and your AI agents — read from: the decisions, the tokens, and the evidence, all in your repo. A design system has always connected these roles; this one keeps the notes for them.",
  items: [
    { name: "Engineers", href: "/docs/guides/engineers", line: "tokens and guardrails, canonical in code" },
    { name: "Designers", href: "/docs/guides/designers", line: "rationale that survives every handoff" },
    { name: "Marketing", href: "/docs/guides/marketers", line: "headlines and flows become evidence" },
    { name: "Business", href: "/docs/guides/business", line: "decisions with receipts, not meetings" },
    { name: "AI agents", href: "/docs/guides/agents", line: "the notes your agents read first" },
  ],
  note: "Even clients read it — the system explains its own choices.",
};

// ── Proof — running on itself (shared with /for/* pages) ─────────────────────

export const proof = {
  label: "See it live",
  heading: "This page is the product.",
  body: "This site is a Systemix instance. The feed below isn't a screenshot — it's live files in this repo: every experiment, decision, and learning, written by the automation and kept by a human. Drop-in context files like these are common now; the difference here is they update themselves with evidence and drift instead of going stale.",
  steps: [
    { n: "01", title: "ship" },
    { n: "02", title: "measure" },
    { n: "03", title: "learn" },
    { n: "04", title: "decide" },
  ],
};

// ── Credibility — small-team framing is load-bearing (NOT an agency) ─────────

export const credibility = {
  label: "Who's behind it",
  heading: "Built by a two-person studio that got tired of watching design systems rot.",
  body: "Systemix runs its own site. Every headline you're reading is a live, running bet — proposed by the automation, and you can watch it get decided.",
  cta: { label: "See it running →", href: "/experiments" },
  links: [
    { label: "GitHub →", href: GITHUB_URL },
    { label: "LinkedIn →", href: "https://www.linkedin.com/in/boyantsonev/" },
  ],
};

// ── Pricing ladder ────────────────────────────────────────────────────────────

export type PricingTier = {
  key: string;
  name: string;
  price: string;
  priceAnchor?: string; // strike-through anchor (e.g. €299 → €99)
  priceNote?: string;
  body: string;
  cta: { label: string; href: string; event: "kit_requested" | "audit_requested" | "book_a_call" | "quick_report_clicked" | "free_score_clicked" } | { label: string; command: string };
  highlight: boolean;
};

export const pricing = {
  label: "Pick your tier",
  heading: "Start free. Pay when it earns it.",
  anchorLine: "Own the files. No seats, no meter.",
  tiers: [
    {
      key: "free",
      name: "Free score",
      price: "€0",
      priceNote: "runs on your machine",
      body: "Your design system's AI-readiness score out of 100, per area. Only the results file is sent, never your code. Every skill stays free and MIT.",
      cta: { label: "Get your free score →", href: "/report", event: "free_score_clicked" },
      highlight: false,
    },
    {
      key: "quick-report",
      name: "Quick report",
      price: quickReportPrice(),
      priceNote: "instant · pay per report",
      body: "What costs you points, biggest first, with one recommendation for each. No AI guesswork in the numbers: the same code gives the same report.",
      cta: { label: "See the quick report →", href: "/report", event: "quick_report_clicked" },
      highlight: true,
    },
    {
      key: "audit",
      name: "Full audit",
      price: FULL_AUDIT.price,
      priceNote: `delivered in ${FULL_AUDIT.turnaround}`,
      body: "The same scan, written up by AI and reviewed and rewritten by a person: what to fix, in what order, and why.",
      cta: { label: "Request the audit →", href: "/audit", event: "audit_requested" },
      highlight: false,
    },
    {
      key: "sprint",
      name: "Fix sprint",
      price: "Custom",
      priceNote: "quoted per job",
      body: "We make the fixes with you: tokens, guardrails, components, and the checks that keep them in place.",
      cta: { label: "Book a call →", href: CALL_MAILTO, event: "book_a_call" },
      highlight: false,
    },
  ] satisfies PricingTier[] as PricingTier[],
};

// ── Per-persona value — what each role actually gets (expandable rows) ────────
// Replaces the old build-hours table: value by role, not internal mechanism.

export type PersonaValueRow = { role: string; gets: string; detail: string };

export const personaValue = {
  label: "One Learning Kit, every audience",
  heading: "What each role gets.",
  hint: "Tap a row for what it means in practice.",
  columns: { role: "Role", gets: "What you get" },
  rows: [
    {
      role: "Engineers",
      gets: "tokens + drift, canonical in code",
      detail: "A design system that documents itself in MDX next to the code, with drift caught before review. Three doors — CLI, MCP, Claude Code skills — over one set of files you own.",
    },
    {
      role: "Designers",
      gets: "rationale that survives handoff",
      detail: "The why behind every token and component, recorded where engineers and agents read it. Drift surfaces itself as a feed instead of ambushing next quarter's audit; Figma bridges when you want it.",
    },
    {
      role: "Marketers",
      gets: "headlines + flows become evidence",
      detail: "Every variant, CTA test, and funnel bet is one readable page: hypothesis, live PostHog evidence, decision. A ledger remembers what converted, so you never rerun a dead test.",
    },
    {
      role: "Business",
      gets: "decisions with receipts",
      detail: "Every bet closes with a recorded call — promote, iterate, kill — cited to the evidence that earned it. One weekly synthesis instead of five dashboards; the next sprint starts from what the last one proved.",
    },
    {
      role: "AI agents",
      gets: "the context layer, machine-readable",
      detail: "The whole system exposed over MCP as plain files: read tokens, contracts, drift, and learnings; open and measure experiments; write evidence back — with human-in-the-loop guardrails on every decision that matters.",
    },
  ] satisfies PersonaValueRow[],
};

// ── FAQ — permission-granting, short answers ─────────────────────────────────

export type FaqItem = { q: string; a: string };

export const faq = {
  label: "FAQ",
  heading: "The honest answers.",
  items: [
    {
      q: "Do I own the files?",
      a: "Yes. Everything lives in your repo as plain files. Cancel anytime, keep everything.",
    },
    {
      q: "Does it touch my code without asking?",
      a: "No. It starts in ghost mode (suggest-only). You choose when to give it more.",
    },
    {
      q: "I don't have a design system yet — can I use this?",
      a: "Yes. npx @getsystemix/cli init scaffolds one and starts watching from day one. Wire PostHog later if you want evidence; it runs without it, and catches drift on its own.",
    },
    {
      q: "Is it really open source?",
      a: "Yes — every skill is on GitHub, MIT. Start free; the €99 Learning Kit is the whole thing packaged to download and own.",
    },
    {
      q: "What leaves my machine when I get a score?",
      a: "Only the results file: numbers, counter definitions, file and folder paths, and short names such as token names. Never your source code. Add --redact-paths to hash the file names, or --dry-run to read the file before anything is sent.",
    },
    {
      q: "Which AI tools does it work with?",
      a: "Claude Code first: it installs as a plugin (/plugin install systemix@systemix). Cowork runs it too. The same scan runs from the CLI or MCP, so Cursor and Codex work as well.",
    },
  ] satisfies FaqItem[],
};

// ── Brand clone hook (kept — persona pages share it; brand_clone_request) ────

export const brandClone = {
  label: "Session one",
  heading: "Paste your URL. We clone your brand.",
  body: "In the first working session, Systemix scrapes your live site and generates a globals.css diff that maps your colors, type scale, and radius to design tokens. Your brand, in code, before we've touched a component.",
  note: "Not a form. An email — you get a reply the same day.",
  cta: { label: "Send your URL →", href: BRAND_CLONE_MAILTO },
};

// ── Bottom CTA ────────────────────────────────────────────────────────────────

export const bottomCta = {
  heading: "Stop the rot.",
  body: "Install the plugin in Claude Code and get your design system's AI-readiness score in a few minutes. Free, read-only, and your code never leaves your machine.",
  fineprint: "Open source · no lock-in · files in your own repo",
};

// ── Nav + footer ─────────────────────────────────────────────────────────────

export const nav = {
  links: [
    { label: "How it works", href: "/#deep-dives" },
    { label: "Free score", href: "/report" },
    { label: "Audit", href: "/audit" },
    { label: "Learning Kit", href: "/kit" },
    { label: "Docs", href: "/docs" },
  ],
  cta: { label: "Star on GitHub", href: GITHUB_URL },
};

export const footer = {
  tagline: POSITIONING,
  links: [
    { label: "GitHub", href: GITHUB_URL },
    { label: "Docs", href: "/docs" },
    { label: "Free score", href: "/report" },
    { label: "Audit", href: "/audit" },
    { label: "Learning Kit", href: "/kit" },
  ],
  badge: "Open source",
};
