// Landing copy registry: the single place to edit the site's words.
// The product studio (docs/feature/product-studio/copy-deck.md): Systemix is the proof-of-concept
// brand for the studio until it moves to its own name. The studio is free; a designer setting it
// up for a product is what we sell, priced per product.
// Vocabulary (one term per thing, every page): the studio · the five commands by name · rules
// (design/rules.md) · "a person makes every call" · setup (the paid service, done by a designer).
// Not in marketing copy: "agent" as the product's name, the loop as a noun on its own, ghost mode,
// autonomy, "the rot".

import { SETUP_MAILTO, SPONSOR_URL, setupPrice } from "@/lib/pricing";

export const GITHUB_URL = "https://github.com/boyantsonev/systemix-poc";
export const LINKEDIN_URL = "https://www.linkedin.com/in/boyantsonev/";
export const AUDIT_COMMAND = "npx @getsystemix/cli audit";

// The Claude Code plugin is the front door. PLUGIN_MARKETPLACE is the GitHub repo that holds
// .claude-plugin/marketplace.json (this repo; the studio is its product-studio plugin).
export const PLUGIN_MARKETPLACE = "boyantsonev/systemix-poc";
export const PLUGIN_ADD_COMMAND = `/plugin marketplace add ${PLUGIN_MARKETPLACE}`;
export const PLUGIN_INSTALL_COMMAND = "/plugin install product-studio@systemix";
export const PLUGIN_FIRST_COMMAND = "/product-studio:check";
export const INIT_COMMAND = "npx @getsystemix/cli init";

/** The positioning line. "design system" stays in it for search. */
export const POSITIONING = "A product studio built on your design system.";

// ── Hero ──────────────────────────────────────────────────────────────────────

export const hero = {
  h1: POSITIONING,
  body: "A designer sets it up once. Then engineers, product and marketing ship through it, inside Claude Code: the agent reads your rules before it builds, code checks the work, and a person makes every call.",
  fineprint: "Free · open source (MIT) · nothing leaves your machine",
};

export type HeroFact = { label: string; value: string };

export const heroFacts = {
  label: "The studio",
  items: [
    { label: "Price", value: "free" },
    { label: "Commands", value: "5" },
    { label: "Works before setup", value: "yes" },
    { label: "Sent anywhere", value: "nothing" },
    { label: "Who makes the calls", value: "a person" },
  ] satisfies HeroFact[],
};

// ── Who uses it: one repo, one set of rules ──────────────────────────────────

export type Role = { key: string; who: string; does: string; types: string };

export const roles = {
  label: "Who uses it",
  heading: "One set of rules, for everyone who ships.",
  body: "The rules live in your repo, so the same ones hold whether the agent is building a screen, a landing page or an email.",
  items: [
    {
      key: "designer",
      who: "Designers",
      does: "Set the studio up once, approve tokens on a preview page, answer the questions it won't decide alone, and pick between variants.",
      types: "/product-studio:setup",
    },
    {
      key: "engineer",
      who: "Engineers",
      does: "Get a brief before building a screen and a check before the pull request. A CI step blocks a merge on a broken rule, with no key.",
      types: "/product-studio:check",
    },
    {
      key: "product",
      who: "Product managers",
      does: "Open a goal in one sentence, rule on its evals, and read what it taught you once it ships.",
      types: "/product-studio:loop open",
    },
    {
      key: "marketing",
      who: "Marketing",
      does: "Voice and claims are rules too: banned words, required disclosures, no promises you can't keep. Check a landing page or an email the way engineers check a component.",
      types: "/product-studio:brief",
    },
  ] satisfies Role[],
};

// ── The five commands, by the job they do ────────────────────────────────────

export type Command = { key: string; pillar: string; command: string; when: string; body: string };

export const commands = {
  label: "Five commands",
  heading: "Set it up, brief, check, then ship and learn.",
  items: [
    {
      key: "setup",
      pillar: "Set up",
      command: "/product-studio:setup",
      when: "once, to start",
      body: "Your design system as files: built from your code, a short interview, a Claude Design export or Figma variables. Nothing is written until you say yes.",
    },
    {
      key: "brief",
      pillar: "Before you build",
      command: "/product-studio:brief",
      when: "before a screen, page or email",
      body: "One screen: the rules that apply to this surface, what to start from, and what was already decided.",
    },
    {
      key: "check",
      pillar: "Review",
      command: "/product-studio:check",
      when: "before review",
      body: "Pass, pass with flags, or fail, rule by rule, with where each problem is and the fix. It works before any setup.",
    },
    {
      key: "loop",
      pillar: "Ship and learn · a person runs it",
      command: "/product-studio:loop",
      when: "to run a goal",
      body: "One sentence becomes a goal with evals, then variants in real code, a release and a measurement. It stops at every gate for your call.",
    },
    {
      key: "admin",
      pillar: "Look after it · a person runs it",
      command: "/product-studio:admin",
      when: "now and then",
      body: "What the studio did, where it misfired, and up to three proposals to improve it. You approve or decline each one.",
    },
  ] satisfies Command[],
};

// ── Rules as data: what makes the check trustworthy ──────────────────────────

export const rules = {
  label: "Your rules, as data",
  heading: "Every rule is a row a check can run.",
  body: "Setup writes design/rules.md: one row per design, brand, voice or legal rule, each with its source and a test. Change a rule there and every command reads the new one.",
  // real starter rows and a real check result (studio/templates/design/rules)
  sample: {
    file: "design/rules.md",
    header: ["ID", "Rule", "Severity", "Test"],
    rows: [
      ["T1", "Colours come from tokens", "block", "script: css /(?<=:[^;{}]*)#[0-9a-fA-F]{3,8}\\b/"],
      ["C1", "One primary action per view", "flag", "review: more than one primary button?"],
      ["L1", "No unqualified superlatives", "flag", "script: copy /\\b(best-in-class|guaranteed)\\b/i"],
    ],
  },
  // the starter's own run on its known-bad samples
  result: {
    command: "product-studio rules check design/rules/known-bad",
    lines: [
      { mark: "✗", id: "T1", where: "T1-raw-hex.css:2", what: "#ff3366", severity: "block" },
      { mark: "!", id: "L1", where: "L1-unqualified-claim.txt:1", what: "best-in-class", severity: "flag" },
    ],
    more: "and 10 more",
    verdict: "FAIL · 5 blocks, 7 flags",
  },
  footnote: "Each scripted rule has a sample of bad work the check must catch before anyone relies on it.",
};

// ── It improves itself, and you approve every change ─────────────────────────

export const improves = {
  label: "It improves itself",
  heading: "It learns from every run. You approve every change.",
  steps: [
    { n: "Logs", body: "Every command adds one line to a log on your machine. Now and then it asks for a thumbs up or down." },
    { n: "Proposes", body: "The admin command turns the log into at most three proposals: a rule that misfires, a check that missed, a step that confused." },
    { n: "Asks", body: "A person approves or declines each one. The checks run before and after, and a change that makes anything worse is undone." },
  ],
  footnote: "This site runs on the studio. Its goals and proposals are public GitHub issues.",
  link: { label: "Follow this site's loop →", href: `${GITHUB_URL}/issues?q=label%3Astudio` },
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
  heading: "Your first check in two minutes.",
  steps: [
    { n: "1", title: "Install the plugin", body: "Two commands in Claude Code. No account, nothing to configure." },
    { n: "2", title: "Run /product-studio:check", body: "It works before any setup: the starter rules and an audit of your UI, and nothing is written." },
    { n: "3", title: "Run /product-studio:setup", body: "A designer approves the tokens on a preview page and every file before it's written." },
  ],
};

// ── The offer: the studio is free; a designer setting it up is what we sell ──

export const offer = {
  label: "Pricing",
  heading: "The studio is free. Setting it up well takes a designer.",
  free: {
    name: "The studio",
    price: "Free",
    note: "MIT · every command",
    body: "The five commands, the rules check, the score and the self-improvement. Yours to keep, change and share.",
    cta: { label: "Install the plugin", href: "/#install", event: "install_cta_clicked" as const },
    sponsor: { label: "Sponsor the work", href: SPONSOR_URL, event: "sponsor_clicked" as const },
  },
  setup: {
    name: "Set up by a designer",
    price: setupPrice(),
    note: "scoped with you",
    body: "The studio runs without us. Setting it up well is design work: we learn your product and its people, build the system and its rules from your code, and run your first loops with your team.",
    includes: ["Discovery of your product and its use cases", "The design system and rules.md from your code", "A bad-work sample for every rule, so the check can be trusted", "Your first loops, run with your team"],
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
      a: "Yes. The studio is open source under MIT, with every command. You pay only if you want a designer to set it up for your product.",
    },
    {
      q: "Does it replace designers?",
      a: "No. It makes their decisions something the agent can read and code can check. Someone still has to make those decisions, and the studio asks a person every time it shouldn't decide alone.",
    },
    {
      q: "What leaves my machine?",
      a: "Nothing. The check, the score, the preview and the log all run locally, with no account, no key and no network calls.",
    },
    {
      q: "Does it change my code without asking?",
      a: "No. It shows every change first and writes it only after you say yes. Gates, merges and changes to the studio itself are a person's call.",
    },
    {
      q: "I don't have a design system yet.",
      a: "Run /product-studio:check anyway: it uses starter rules. Then /product-studio:setup drafts a system with you from your code or from a short interview.",
    },
  ] satisfies FaqItem[],
};

// ── Bottom CTA ────────────────────────────────────────────────────────────────

export const bottomCta = {
  heading: "Install the studio. It's free.",
  fineprint: "Open source · MIT · your files, your repo",
};

// ── Nav + footer ─────────────────────────────────────────────────────────────

export const nav = {
  links: [
    { label: "Who uses it", href: "/#roles" },
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
