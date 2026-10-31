/**
 * funnel.ts — the AARRR funnel, as data. Every PostHog event the site or the report
 * service sends is listed here with its stage, so the dashboard script
 * (scripts/posthog-funnel.mjs) and the docs read one definition.
 *
 * Web events come from the browser (posthog-js, via the /ingest proxy). Server events
 * come from /api/report (src/lib/analytics/server.ts) and carry bands, never paths,
 * repo names or keys. There is no user id across the two: the plugin sends only the
 * results file, so the funnel joins web and server steps by counts, not by person.
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
  { event: "free_score_clicked", stage: "acquisition", source: "web", meaning: "pricing → free score page" },
  { event: "install_command_copied", stage: "activation", source: "web", meaning: "copied a plugin install command", where: { channel: "plugin" } },
  { event: "score_served", stage: "activation", source: "server", meaning: "a free score was produced by the report service (older CLIs only: since DSC-22 the free score is computed on the user's machine and sends nothing)" },
  { event: "report_notify_requested", stage: "revenue", source: "web", meaning: "asked to be told when the full report is on sale (demand before launch)" },
  { event: "checkout_clicked", stage: "revenue", source: "web", meaning: "opened the Lemon Squeezy checkout" },
  { event: "report_delivered", stage: "revenue", source: "server", meaning: "a paid full report was produced (one license activation used)" },
  { event: "report_refused", stage: "revenue", source: "server", meaning: "a key was refused (invalid, used up, wrong product, service closed)" },
  { event: "audit_requested", stage: "revenue", source: "web", meaning: "requested the €499 full audit" },
  { event: "book_a_call", stage: "revenue", source: "web", meaning: "asked for a fix sprint call" },
  { event: "$pageview", stage: "referral", source: "web", meaning: "a visit from a shared report or the plugin README", where: { utm_source: ["quick-report", "plugin"] } },
  { event: "$pageview", stage: "retention", source: "web", meaning: "a returning visitor (PostHog retention on $pageview, weekly)" },
];

/** The main funnel, in order: visit → copy install → free score → checkout → paid report. */
export const MAIN_FUNNEL = ["$pageview", "install_command_copied", "score_served", "checkout_clicked", "report_delivered"] as const;

/** UTM tags for links we put in front of people outside the site. */
export const UTM = {
  report: "utm_source=quick-report&utm_medium=report",
  plugin: "utm_source=plugin&utm_medium=readme",
} as const;
