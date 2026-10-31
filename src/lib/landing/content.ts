// Landing copy registry: the single place to edit the site's words.
// Copy deck: docs/feature/ai-native-ds-kit-beta/copy-deck.md (G-002, shaped 2026-10-31).
// Vocabulary (one term per thing, every page): design system agent · free score ·
// quick report · full audit · design sprint · "you approve every step".
// Not in marketing copy: the loop, the automation, ghost mode, Learning Kit, "the rot".

import { FULL_AUDIT, SPRINT, quickReportPrice } from "@/lib/pricing";

export const GITHUB_URL = "https://github.com/boyantsonev/systemix-poc";
export const LINKEDIN_URL = "https://www.linkedin.com/in/boyantsonev/";
export const AUDIT_COMMAND = "npx @getsystemix/cli audit";

// The Claude Code plugin is the front door. PLUGIN_MARKETPLACE is the GitHub repo that holds
// .claude-plugin/marketplace.json: this repo today (its root marketplace points at plugin/),
// the public plugin repo once it is published. One line to switch.
export const PLUGIN_MARKETPLACE = "boyantsonev/systemix-poc";
export const PLUGIN_ADD_COMMAND = `/plugin marketplace add ${PLUGIN_MARKETPLACE}`;
export const PLUGIN_INSTALL_COMMAND = "/plugin install systemix@systemix";
export const PLUGIN_SCORE_COMMAND = "/systemix:score";
export const INIT_COMMAND = "npx @getsystemix/cli init";
export const CALL_MAILTO = "mailto:boyan.works@gmail.com?subject=Systemix%20design%20sprint";

// The audit request falls back to email until a checkout exists for it. The quick
// report's checkout link and price live in src/lib/pricing.ts.
export const AUDIT_CHECKOUT_URL = "mailto:boyan.works@gmail.com?subject=Systemix%20full%20audit";

/** The positioning line (G-002, approved). */
export const POSITIONING = "The design system agent for AI-native products.";

// ── Hero (approved H1 and subline, G-002 E1) ──────────────────────────────────

export const hero = {
  h1: POSITIONING,
  body: "Systemix sets up your design system, keeps it from rotting, and runs your design sprints, inside Claude Code.",
  fineprint: "Open source · MIT · your files, your repo",
};

export type HeroFact = { label: string; value: string };

export const heroFacts = {
  label: "What you get",
  items: [
    { label: "Price", value: "€0" },
    { label: "Runs in", value: "Claude Code" },
    { label: "Your code leaves your machine", value: "never" },
    { label: "A person approves", value: "every step" },
  ] satisfies HeroFact[],
};

// ── What Systemix does: three pillars, each tagged with what ships today (G-002 E2) ──

export type Pillar = { key: string; tag: string; title: string; body: string; command: string };

export const pillars = {
  label: "What Systemix does",
  heading: "Deploy it. Keep it. Grow it in sprints.",
  items: [
    {
      key: "deploy",
      tag: "in the plugin · partial",
      title: "Deploys your design system",
      body: "A short interview drafts your design system, or the audit proposes one from the code you have. Every file waits for your yes.",
      command: "/systemix:design-interview",
    },
    {
      key: "keep",
      tag: "in the plugin",
      title: "Keeps it from rotting",
      body: "A free, repeatable score and audits that find raw colours, one-off sizes and duplicate components. Same code, same numbers.",
      command: "/systemix:score",
    },
    {
      key: "sprint",
      tag: "in the plugin · beta",
      title: "Runs your design sprints",
      body: "One sentence becomes a goal, then pictures, a prototype in your components and a release. You approve every step.",
      command: "/systemix:goal",
    },
  ] satisfies Pillar[],
};

// ── Proof: this repo's own score ──────────────────────────────────────────────

export const proof = {
  label: "Proof",
  heading: (score: number) => `Our own repo scores ${score} out of 100.`,
  body: "We run Systemix on this site. The score isn't flattering, and that's the point.",
  link: { label: "See how it's scored →", href: "/report" },
};

// ── How it works ──────────────────────────────────────────────────────────────

export const howItWorks = {
  label: "How it works",
  heading: "Three steps, two minutes.",
  steps: [
    { n: "1", title: "Install the plugin", body: "Two commands in Claude Code. No account." },
    { n: "2", title: "Run /systemix:score", body: "It reads your repo on your machine. Nothing is sent." },
    {
      n: "3",
      title: "Fix what costs points",
      body: `Do it yourself, or get the ${quickReportPrice()} quick report that lists each fix, biggest first.`,
    },
  ],
};

// ── Pricing (approved ladder, DSC-16 and DSC-20) ─────────────────────────────

export type PricingTier = {
  key: string;
  name: string;
  price: string;
  priceNote?: string;
  body: string;
  cta: { label: string; href: string; event: "audit_requested" | "book_a_call" | "quick_report_clicked" | "free_score_clicked" };
  highlight: boolean;
};

export const pricing = {
  label: "Pricing",
  heading: "Start free. Pay when it earns it.",
  tiers: [
    {
      key: "free",
      name: "Free score",
      price: "€0",
      body: "The plugin, every skill, and your score per area.",
      cta: { label: "Get your free score →", href: "/report", event: "free_score_clicked" },
      highlight: false,
    },
    {
      key: "quick-report",
      name: "Quick report",
      price: quickReportPrice(),
      priceNote: "instant",
      body: "Everything that costs points, biggest first, with a fix for each.",
      cta: { label: "See the quick report →", href: "/report", event: "quick_report_clicked" },
      highlight: true,
    },
    {
      key: "audit",
      name: "Full audit",
      price: FULL_AUDIT.price,
      priceNote: FULL_AUDIT.turnaround,
      body: "Drafted by AI, reviewed and rewritten by a person: what to fix, in what order, and why.",
      cta: { label: "Request the audit →", href: "/audit", event: "audit_requested" },
      highlight: false,
    },
    {
      key: "sprint",
      name: "Design sprint",
      price: SPRINT.price,
      priceNote: SPRINT.length,
      body: "We plan, prototype in your components and update your system with you.",
      cta: { label: "Book a sprint →", href: CALL_MAILTO, event: "book_a_call" },
      highlight: false,
    },
  ] satisfies PricingTier[] as PricingTier[],
};

// ── FAQ: four questions ───────────────────────────────────────────────────────

export type FaqItem = { q: string; a: string };

export const faq = {
  label: "FAQ",
  heading: "Questions",
  items: [
    {
      q: "Do I own the files?",
      a: "Yes. Everything is plain files in your repo. Stop anytime and keep them.",
    },
    {
      q: "Does it change my code without asking?",
      a: "No. It proposes; you approve every file.",
    },
    {
      q: "What leaves my machine?",
      a: `Nothing, for the free score. The ${quickReportPrice()} quick report sends only numbers and file names, never code, and only after you say yes. /systemix:score shows you what it would send first.`,
    },
    {
      q: "I don't have a design system yet.",
      a: "Run /systemix:design-interview and it drafts one with you.",
    },
  ] satisfies FaqItem[],
};

// ── Bottom CTA ────────────────────────────────────────────────────────────────

export const bottomCta = {
  heading: "Get your free score.",
  fineprint: "Open source · MIT · your files, your repo",
};

// ── Nav + footer ─────────────────────────────────────────────────────────────

export const nav = {
  links: [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Free score", href: "/report" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Docs", href: "/docs" },
  ],
  cta: { label: "Get your free score", href: "/report" },
};

export const footer = {
  credit: "Made by Boyan Tsonev.",
  links: [
    { label: "GitHub", href: GITHUB_URL },
    { label: "LinkedIn", href: LINKEDIN_URL },
    { label: "Docs", href: "/docs" },
  ],
  badge: "Open source",
};
