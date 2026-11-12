/**
 * funnel.ts — the AARRR funnel, as data. Every PostHog event the site sends is listed here with
 * its stage, so the dashboard script (scripts/posthog-funnel.ts) and the docs read one definition.
 *
 * All events come from the browser (posthog-js, via the /ingest proxy). Since DSC-23 the plugin
 * is free and sends nothing, so activation inside Claude Code is invisible by design: the last
 * step we can see is a copied install command. Revenue is a setup conversation started.
 */

export type Stage = "acquisition" | "activation" | "retention" | "referral" | "revenue";

export type FunnelEvent = {
  event: string;
  stage: Stage;
  source: "web" | "server";
  meaning: string;
  /** Optional property filter that makes the event this step (PostHog property → value). */
  where?: Record<string, string | string[]>;
};

export const FUNNEL_EVENTS: FunnelEvent[] = [
  { event: "$pageview", stage: "acquisition", source: "web", meaning: "a visit (utm_source tells the channel)" },
  { event: "section_viewed", stage: "acquisition", source: "web", meaning: "a section scrolled into view" },
  { event: "install_cta_clicked", stage: "acquisition", source: "web", meaning: "nav or pricing → the install commands" },
  { event: "install_command_copied", stage: "activation", source: "web", meaning: "copied a plugin install command", where: { channel: "plugin" } },
  { event: "sponsor_clicked", stage: "revenue", source: "web", meaning: "opened the sponsor page" },
  { event: "setup_requested", stage: "revenue", source: "web", meaning: "started a setup conversation (the paid service)" },
  { event: "$pageview", stage: "referral", source: "web", meaning: "a visit from the plugin README or a shared link", where: { utm_source: ["plugin"] } },
  { event: "$pageview", stage: "retention", source: "web", meaning: "a returning visitor (PostHog retention on $pageview, weekly)" },
];

/** The main funnel, in order: visit → open install → copy install → ask for setup. */
export const MAIN_FUNNEL = ["$pageview", "install_cta_clicked", "install_command_copied", "setup_requested"] as const;

/** UTM tags for links we put in front of people outside the site. */
export const UTM = {
  plugin: "utm_source=plugin&utm_medium=readme",
} as const;
