// Landing copy registry: the single place to edit the site's words.
// DSC-23 (G-005): the plugin is free and the whole product; we set it up for a product, priced
// per product. Copy deck history: docs/feature/ai-native-ds-kit-beta/copy-deck.md.
// Vocabulary (one term per thing, every page): design system agent · the plugin · the four
// commands by name · rules (design/rules.md) · setup (the paid service) · "you approve every step".
// Not in marketing copy: the loop as a noun on its own, the automation, ghost mode, quick report,
// full audit, design sprint as a product, "the rot".

import { SETUP_MAILTO, SPONSOR_URL, setupPrice } from "@/lib/pricing";

export const GITHUB_URL = "https://github.com/boyantsonev/systemix-poc";
export const LINKEDIN_URL = "https://www.linkedin.com/in/boyantsonev/";
export const AUDIT_COMMAND = "npx @getsystemix/cli audit";

// The Claude Code plugin is the front door. PLUGIN_MARKETPLACE is the GitHub repo that holds
// .claude-plugin/marketplace.json: this repo today (its root marketplace points at plugin/),
// the public plugin repo once it is published. One line to switch.
export const PLUGIN_MARKETPLACE = "boyantsonev/systemix-poc";
export const PLUGIN_ADD_COMMAND = `/plugin marketplace add ${PLUGIN_MARKETPLACE}`;
export const PLUGIN_INSTALL_COMMAND = "/plugin install systemix@systemix";
export const PLUGIN_FIRST_COMMAND = "/systemix:setup";
export const INIT_COMMAND = "npx @getsystemix/cli init";

/** The positioning line (G-002, approved). */
export const POSITIONING = "The design system agent for AI-native products.";

// ── Hero (approved H1 and subline, G-002 E1) ──────────────────────────────────

export const hero = {
  h1: POSITIONING,
  body: "Systemix sets up your design system, keeps it from rotting, and runs your design sprints, inside Claude Code.",
  fineprint: "Free · open source (MIT) · nothing leaves your machine",
};

export type HeroFact = { label: string; value: string };

export const heroFacts = {
  label: "The plugin",
  items: [
    { label: "Price", value: "free" },
    { label: "Commands", value: "4" },
    { label: "Runs in", value: "Claude Code" },
    { label: "Sent anywhere", value: "nothing" },
    { label: "A person approves", value: "every step" },
  ] satisfies HeroFact[],
};

// ── The four commands, grouped by the pitch's three pillars ──────────────────

export type Command = { key: string; pillar: string; command: string; when: string; body: string };

export const commands = {
  label: "Four commands",
  heading: "Deploy it. Keep it. Grow it in sprints.",
  items: [
    {
      key: "setup",
      pillar: "Deploy",
      command: "/systemix:setup",
      when: "once, to start",
      body: "Builds your design system and its rules from the code you ship, from a short interview, or from Claude Design. Every file waits for your yes.",
    },
    {
      key: "brief",
      pillar: "Keep",
      command: "/systemix:brief",
      when: "before you build",
      body: "One screen for the agent: the rules that apply, the tokens and components to start from, and what was already decided.",
    },
    {
      key: "check",
      pillar: "Keep",
      command: "/systemix:check",
      when: "before review",
      body: "Pass, pass with flags or fail, rule by rule, with where and how to fix. Add --score for your readiness score out of 100.",
    },
    {
      key: "loop",
      pillar: "Sprint · beta",
      command: "/systemix:loop",
      when: "to run a goal",
      body: "One sentence becomes a goal with evals, then pictures, code and a release. It stops at every gate for you.",
    },
  ] satisfies Command[],
};

// ── Rules as data: what makes the check trustworthy ──────────────────────────

export const rules = {
  label: "Your rules, as data",
  heading: "Every rule is a row an agent can check.",
  body: "Setup writes design/rules.md: one row per design, brand, voice or legal rule, each with its source and a test. Change a rule there and every command reads the new one. No skill keeps its own copy.",
  // a real starter row and a real check result (packages/cli/templates/rules)
  sample: {
    file: "design/rules.md",
    header: ["ID", "Rule", "Severity", "Test"],
    rows: [
      ["T1", "Colours come from tokens", "block", "script: css /#[0-9a-fA-F]{3,8}\\b/"],
      ["T4", "No arbitrary text sizes", "flag", "script: code /\\btext-\\[\\d+(\\.\\d+)?px\\]/"],
      ["C1", "One primary action per view", "flag", "review: more than one primary button?"],
    ],
  },
  // the starter's own run on its known-bad samples: `systemix rules check design/evals/rules/known-bad`
  result: {
    command: "systemix rules check design/evals/rules/known-bad",
    lines: [
      { mark: "✗", id: "T1", where: "T1-raw-hex.css:2", what: "#ff3366", severity: "block" },
      { mark: "!", id: "T4", where: "T4-arbitrary-size.tsx:1", what: "text-[13px]", severity: "flag" },
    ],
    more: "and 8 more",
    verdict: "FAIL · 4 blocks, 6 flags",
  },
  footnote: "Each scripted rule has a sample of bad work that the check must catch before anyone relies on it.",
};

// ── Proof: this repo's own score ──────────────────────────────────────────────

export const proof = {
  label: "Proof",
  heading: (score: number) => `Our own repo scores ${score} out of 100.`,
  body: "We run Systemix on this site. The score isn't flattering, and that's the point: it names what to fix first.",
  link: { label: "How the score works →", href: "/docs" },
};

// ── How it works ──────────────────────────────────────────────────────────────

export const howItWorks = {
  label: "How it works",
  heading: "Three steps to your first check.",
  steps: [
    { n: "1", title: "Install the plugin", body: "Two commands in Claude Code. No account, nothing to configure." },
    { n: "2", title: "Run /systemix:setup", body: "It proposes your design system and its rules from your code. You approve each file." },
    { n: "3", title: "Run /systemix:check", body: "On any folder, before review. Fix what fails, then build the next screen with /systemix:brief." },
  ],
};

// ── The offer: free plugin, sponsor it, or have it set up ────────────────────

export const offer = {
  label: "Pricing",
  heading: "The plugin is free. Setup is what we sell.",
  free: {
    name: "The plugin",
    price: "Free",
    note: "MIT · every command",
    body: "Everything on this page: the four commands, the rules check and the score. Yours to keep, change and share.",
    cta: { label: "Install the plugin", href: "/#install", event: "install_cta_clicked" as const },
    sponsor: { label: "Sponsor the work", href: SPONSOR_URL, event: "sponsor_clicked" as const },
  },
  setup: {
    name: "Set up for your product",
    price: setupPrice(),
    note: "scoped with you",
    body: "We do the discovery with you, build the design system and its rules from your product, and run the first loops together. Every product is different, so we scope it first.",
    includes: ["Discovery of your product and its use cases", "The design system and rules.md from your code", "Known-bad samples, so the check can be trusted", "Your first loops, run together"],
    cta: { label: "Talk about your product", href: SETUP_MAILTO, event: "setup_requested" as const },
  },
};

// ── FAQ ───────────────────────────────────────────────────────────────────────

export type FaqItem = { q: string; a: string };

export const faq = {
  label: "FAQ",
  heading: "Questions",
  items: [
    {
      q: "Is it really free?",
      a: "Yes. The plugin is open source under MIT, with every command. You pay only if you want us to set it up for your product.",
    },
    {
      q: "What leaves my machine?",
      a: "Nothing. The plugin bundles its own scan, makes no network calls and sends nothing anywhere.",
    },
    {
      q: "Does it change my code without asking?",
      a: "No. It proposes; you approve every file. A gate in /systemix:loop is a ruling only you can make.",
    },
    {
      q: "I don't have a design system yet.",
      a: "Run /systemix:setup. It drafts one with you, from a short interview or from the code you already have.",
    },
  ] satisfies FaqItem[],
};

// ── Bottom CTA ────────────────────────────────────────────────────────────────

export const bottomCta = {
  heading: "Install the plugin. It's free.",
  fineprint: "Open source · MIT · your files, your repo",
};

// ── Nav + footer ─────────────────────────────────────────────────────────────

export const nav = {
  links: [
    { label: "Commands", href: "/#commands" },
    { label: "How it works", href: "/#how-it-works" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Docs", href: "/docs" },
  ],
  cta: { label: "Install the plugin", href: "/#install" },
};

export const footer = {
  credit: "Made by Boyan Tsonev.",
  links: [
    { label: "GitHub", href: GITHUB_URL },
    { label: "Sponsor", href: SPONSOR_URL },
    { label: "LinkedIn", href: LINKEDIN_URL },
    { label: "Docs", href: "/docs" },
  ],
  badge: "Open source",
};
