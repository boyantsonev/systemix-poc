// Landing copy registry — the single place to edit the narrative, and the seam
// the hero A/B test reads from (useVariant("landing-hero")). Engine = Claude Code.
//
// Narrative arc: problem → effect → solution (loop · doors) → trust → CTA →
// secondary trust + CTA (services). Copy is deliberately terse; the bento media
// slots + the orbiting loop carry the weight.

export const GITHUB_URL = "https://github.com/boyantsonev/systemix-poc";
export const INIT_COMMAND = "npx systemix init";

/**
 * The rotating phrase in the hero — completes "Systemix is your ⟨phrase⟩".
 * Leads with "experiment" (the unit of evidence); the rest add meaning and the
 * last one amplifies the system⇄mix wordplay. Terminal slot = no mid-line reflow.
 */
export const ROTATING_PHRASES = [
  "experiment loop",
  "learning loop",
  "evidence layer",
  "shipping memory",
  "system, mixed",
] as const;

export type HeroVariant = {
  eyebrow: string;
  body: string;
};

export const hero = {
  lead: "Systemix is your",
  phrases: ROTATING_PHRASES,
  /** A/B variants keyed to useVariant("landing-hero", "variant_b"); default = variant_b (the new hero). */
  variants: {
    control: {
      eyebrow: "For builders shipping with agents",
      body: "You ship every day. Your learning still happens a quarter behind. Systemix closes the loop the day each experiment resolves — every result recorded in your repo, so the next thing you ship starts from evidence, not memory.",
    },
    variant_b: {
      eyebrow: "Open-source · runs in Claude Code",
      body: "Your agents ship a variant a day. Your learning still lands a quarter behind. Systemix closes the loop the day each experiment resolves — the result and the decision written back into your repo, so the next ship starts from evidence, not memory.",
    },
  } satisfies Record<"control" | "variant_b", HeroVariant>,
  spine: ["ship", "measure", "learn", "decide"],
  primaryCta: { label: INIT_COMMAND, command: INIT_COMMAND },
  secondaryCta: { label: "GitHub", href: GITHUB_URL },
  /** The system⇄mix wordplay, kept as a quiet kicker. */
  tagline: "system × mix — one system for your mix of signals",
};

// ── Problem ───────────────────────────────────────────────────────────────────

export const gap = {
  label: "The problem",
  heading: "Your shipping got 10× faster. Your learning didn't.",
  body: "Agents ship a variant a day. The signal lands in PostHog — and nobody reads it back.",
  stats: [
    { k: "Ship cadence", v: "Daily" },
    { k: "Learn cadence", v: "Quarterly — if ever" },
  ],
};

// ── Effect ────────────────────────────────────────────────────────────────────

export const effect = {
  label: "What it costs you",
  heading: "So every ship lands in a vacuum.",
  items: [
    { title: "Blank slate", body: "The next agent starts from zero — your last test never happened." },
    { title: "Repeated work", body: "You re-run experiments you already have the answer to." },
    { title: "Lost evidence", body: "PostHog records what happened. The decision never gets written down." },
  ],
};

// ── Solution · the loop ───────────────────────────────────────────────────────

export const loop = {
  label: "The loop",
  heading: "Ship. Measure. Learn. Decide. Repeat.",
  body: "One loop at the center of your stack — wired into the tools you already ship, measure, and design with.",
  steps: [
    { n: "01", title: "ship" },
    { n: "02", title: "measure" },
    { n: "03", title: "learn" },
    { n: "04", title: "decide" },
  ],
};

// ── Solution · three doors ────────────────────────────────────────────────────

export const doors = {
  label: "One loop, three doors",
  heading: "Drive it however your stack works.",
  body: "Plain MDX in your repo. Three doors read and write the same files — so any agent can run it.",
  cta: { label: "Read the docs", href: "/docs" },
  items: [
    { key: "cli", name: "CLI", code: "systemix experiment new", body: "Scriptable in CI and your terminal.", media: "cli-demo.gif" },
    { key: "mcp", name: "MCP", code: "experiment_new · close", body: "Any agent or AI tool can call it.", media: "mcp-demo.mp4" },
    { key: "skills", name: "Claude Code skills", code: "/init-experiment", body: "Slash commands, human-in-the-loop.", media: "skills-demo.gif" },
  ],
};

// ── Trust ─────────────────────────────────────────────────────────────────────

export type TrustItem = {
  key: string;
  name: string;
  body: string;
  span: 1 | 2;
  cta: { label: string; href: string };
  media?: string;
};

export const trust = {
  label: "Built in the open",
  heading: "No black box. It runs on itself.",
  body: "Open-source, runs in Claude Code, and dogfooded right here — the loop validates Systemix's own bets.",
  items: [
    { key: "oss", name: "Open source", body: "MIT, on GitHub. Read every line — then fork it.", span: 2, cta: { label: "Star on GitHub", href: GITHUB_URL }, media: "github-stars.png" },
    { key: "engine", name: "Runs in Claude Code", body: "The engine is Claude Code. No extra service to run.", span: 1, cta: { label: "Why Claude Code", href: "/docs" } },
    { key: "repo", name: "Your files, your repo", body: "Plain MDX you own. No lock-in, no dashboard.", span: 1, cta: { label: "See the files", href: "/docs" } },
    { key: "dogfood", name: "Runs on itself", body: "This site is a Systemix instance — the loop closes its own experiments.", span: 2, cta: { label: "See the loop", href: "#loop" }, media: "loop-demo.gif" },
  ] satisfies TrustItem[],
};

// ── Secondary trust + CTA · services ──────────────────────────────────────────

export const services = {
  label: "Done with you",
  heading: "Want it running this week?",
  body: "The kit is free forever. If you'd rather not wire it solo, I'll run a focused sprint on your highest-leverage loop.",
  sprints: [
    { name: "Experiment / growth", body: "PostHog wired, first experiments live, a loop you own." },
    { name: "Design system", body: "Tokens, guardrails, code-first drift — the optional substrate." },
    { name: "Design engineer", body: "Figma ↔ code reconciled, components evidenced." },
    { name: "Landing / funnel", body: "A measured landing and the experiments that move signup." },
  ],
  cta: { label: "Book a 30-min scoping call", href: "mailto:boyan.works@gmail.com?subject=Systemix%20scoping%20call" },
  note: "Secondary to the free kit. The first call is scoping, not selling.",
};

// ── CTA ───────────────────────────────────────────────────────────────────────

export const bottomCta = {
  heading: "Start free. The loop is yours.",
  body: "Four questions to set up. Your files, your repo, no lock-in.",
  fineprint: "Open-source · runs in Claude Code · your files, your repo",
};

export const nav = {
  links: [
    { label: "How it works", href: "#loop" },
    { label: "Services", href: "#services" },
    { label: "Docs", href: "/docs" },
  ],
  cta: { label: "GitHub →", href: GITHUB_URL },
};

export const footer = {
  tagline: "The experiment loop for builders.",
  links: [
    { label: "GitHub", href: GITHUB_URL },
    { label: "Docs", href: "/docs" },
    { label: "Services", href: "#services" },
  ],
  badge: "Open source",
};
