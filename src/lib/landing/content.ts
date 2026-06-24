// Landing copy registry — the single place to edit the narrative, and the seam
// the hero A/B test reads from (useVariant("landing-hero")). Engine = Claude Code.
//
// Narrative arc: problem → effect → brand clone hook → solution (loop · doors) →
// services → trust → CTA. Copy is deliberately terse; the bento media slots +
// the orbiting loop carry the weight.

export const GITHUB_URL = "https://github.com/boyantsonev/systemix-poc";
export const INIT_COMMAND = "npx systemix init";
export const BRAND_CLONE_MAILTO =
  "mailto:boyan.works@gmail.com?subject=Brand%20clone%20request";

export const ROTATING_PHRASES = [
  "shipping memory",
  "decision log",
  "brand memory",
  "learning loop",
] as const;

export type HeroVariant = {
  eyebrow: string;
  body: string;
};

export const hero = {
  lead: "Your team's",
  phrases: ROTATING_PHRASES,
  /** A/B variants — same eyebrow/body for now; seam kept for future tests. */
  variants: {
    control: {
      eyebrow: "For design teams shipping without a memory",
      body: "Every week your team ships a variant, reads the data, and moves on. Six months later you rebuild the same test from scratch — because no one wrote down what you learned. Systemix is the loop that writes it back.",
    },
    variant_b: {
      eyebrow: "For design teams shipping without a memory",
      body: "Every week your team ships a variant, reads the data, and moves on. Six months later you rebuild the same test from scratch — because no one wrote down what you learned. Systemix is the loop that writes it back.",
    },
  } satisfies Record<"control" | "variant_b", HeroVariant>,
  spine: ["ship", "measure", "record", "repeat"],
  brandCloneCta: { label: "Send your site URL →", href: BRAND_CLONE_MAILTO },
  primaryCta: { label: INIT_COMMAND, command: INIT_COMMAND },
  secondaryCta: { label: "GitHub", href: GITHUB_URL },
  fineprint: "Free forever · brand clone in session one · no dashboard",
};

// ── Problem ───────────────────────────────────────────────────────────────────

export const gap = {
  label: "The gap",
  heading: "You're shipping faster than you're learning.",
  body: "Every experiment your team runs adds to the pile. The data sits in your analytics tool. The decision never gets written anywhere. In six months you run the same test again.",
  stats: [
    { k: "Time to ship a variant", v: "Days" },
    { k: "Time that decision resurfaces", v: "Never — unless someone remembers" },
  ],
};

// ── Effect ────────────────────────────────────────────────────────────────────

export const effect = {
  label: "What it costs you",
  heading: "Every ship lands in a void.",
  items: [
    { title: "Déjà-ship", body: "You run a test you've already run. Nothing flagged it because nothing wrote down the result." },
    { title: "Context amnesia", body: "The next teammate — or the next agent — who touches that component has no idea why it looks this way. The experiment is gone." },
    { title: "Evidence graveyard", body: "Your analytics tool recorded everything. The decision that followed? Nowhere. Not in code. Not in the design file. Gone." },
  ],
};

// ── Solution · the loop ───────────────────────────────────────────────────────

export const loop = {
  label: "How it works",
  heading: "One loop. Every decision, recorded.",
  body: "Systemix sits at the center of your shipping stack. Each experiment gets a file in your repo — hypothesis, result, decision. Written when you close the loop.",
  steps: [
    { n: "01", title: "ship" },
    { n: "02", title: "measure" },
    { n: "03", title: "record" },
    { n: "04", title: "repeat" },
  ],
};

// ── Solution · three interfaces ───────────────────────────────────────────────

export const doors = {
  label: "How you drive it",
  heading: "Terminal, agent, or slash command — your call.",
  body: "Three ways to run the same loop. Pick the one that fits how your team ships.",
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
  heading: "No black box. The files are yours.",
  body: "Open-source, plain MDX in your repo, and dogfooded on this site. There is no lock-in because there is no platform to lock into.",
  items: [
    { key: "oss", name: "Open source", body: "MIT, on GitHub. Read every line — then fork it.", span: 2, cta: { label: "Star on GitHub", href: GITHUB_URL }, media: "github-stars.png" },
    { key: "engine", name: "No platform dependency", body: "Plain files in your repo. The CLI, MCP, and skills are optional layers on top of MDX you already own.", span: 1, cta: { label: "Read the docs", href: "/docs" } },
    { key: "repo", name: "Your files, your repo", body: "Plain MDX you own. No lock-in, no dashboard.", span: 1, cta: { label: "See the files", href: "/docs" } },
    { key: "dogfood", name: "Runs on itself", body: "This site is a Systemix instance — the loop closes its own experiments.", span: 2, cta: { label: "See the loop", href: "#loop" }, media: "loop-demo.gif" },
  ] satisfies TrustItem[],
};

// ── Services / pick your path ─────────────────────────────────────────────────

export type ServiceTier = {
  name: string;
  price: string;
  body: string;
  cta: { label: string; href: string };
  highlight: boolean;
};

export const services = {
  label: "Pick your path",
  heading: "Free to start. Sprint to ship.",
  body: "The kit is open-source and runs locally. If you want it wired and running this week, that's a sprint.",
  tiers: [
    {
      name: "Free kit",
      price: "Forever free",
      body: "npx systemix init — four prompts, your experiments tracked in MDX, your repo. Claude Code skills included.",
      cta: { label: "Get the kit", href: GITHUB_URL },
      highlight: false,
    },
    {
      name: "1-week sprint",
      price: "Book a call",
      body: "Boyan wires the loop manually. Brand clone in session one, experiments live by end of week, loop you own when we're done.",
      cta: { label: "Book a scoping call", href: "mailto:boyan.works@gmail.com?subject=Systemix%20sprint" },
      highlight: true,
    },
    {
      name: "Building in public",
      price: "Follow along",
      body: "Systemix dogfoods itself. The experiments that shape this product are open in this repo.",
      cta: { label: "See the loop", href: "/experiments" },
      highlight: false,
    },
  ] satisfies ServiceTier[],
  note: "Boyan Tsonev · design engineer · the first call is scoping, not selling.",
};

// ── About ─────────────────────────────────────────────────────────────────────

export const about = {
  body: "Built by Boyan Tsonev — a design engineer who kept losing experiment context across every team he joined. Systemix is the tool I wished existed. Building it in public.",
  links: [
    { label: "Book a call →", href: "mailto:boyan.works@gmail.com?subject=Systemix%20scoping%20call" },
    { label: "LinkedIn →", href: "https://www.linkedin.com/in/boyantsonev/" },
  ],
};

// ── CTA ───────────────────────────────────────────────────────────────────────

export const bottomCta = {
  heading: "Your decisions deserve a record.",
  body: "Start with the free kit in minutes — or send your URL and we'll clone your brand identity in session one.",
  fineprint: "Free forever · open-source · no lock-in · files in your own repo",
};

export const brandClone = {
  label: "Session one",
  heading: "Paste your URL. We clone your brand.",
  body: "In the first working session, Systemix scrapes your live site and generates a globals.css diff that maps your colors, type scale, and radius to design tokens. Your brand, in code, before we've touched a component.",
  note: "Not a form. An email — Boyan replies the same day.",
  cta: { label: "Send your URL →", href: BRAND_CLONE_MAILTO },
};

export const nav = {
  links: [
    { label: "How it works", href: "#loop" },
    { label: "Sprint", href: "#services" },
    { label: "Docs", href: "/docs" },
  ],
  cta: { label: "Book a call →", href: "mailto:boyan.works@gmail.com?subject=Systemix%20scoping%20call" },
};

export const footer = {
  tagline: "Decisions deserve a record.",
  links: [
    { label: "GitHub", href: GITHUB_URL },
    { label: "Docs", href: "/docs" },
    { label: "Sprint", href: "#services" },
  ],
  badge: "Open source",
};
