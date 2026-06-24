// Deterministic memory write-back for the root contract (contract/index.mdx).
// Memory is written only from closed experiments — every entry cites the
// experiment that earned it, with a confidence and a review-by date
// (docs/feature/contract-rework/contract-model.md). Pure functions: dates are
// passed in so the caller owns the clock and tests stay deterministic.

export type MemoryEntry = {
  date: string; // YYYY-MM-DD the entry was written
  title: string; // short human-readable learning
  experimentId: string; // the hypothesis id that earned it (provenance)
  decision: string; // promote | kill | iterate
  confidence: number | null;
  summary: string; // one or two sentences
  reviewBy: string; // YYYY-MM-DD — claims expire and get re-validated
};

/** Render the canonical memory bullet for one entry. */
export function renderMemoryLine(e: MemoryEntry): string {
  const conf = e.confidence != null ? `confidence ${e.confidence} · ` : "";
  const summary = e.summary.trim().replace(/\s+/g, " ");
  const dot = summary && !/[.!?]$/.test(summary) ? "." : "";
  return (
    `- **${e.date} · ${e.title}** — ${conf}from [${e.experimentId}], ` +
    `decision: ${e.decision}. ${summary}${dot} Review by: ${e.reviewBy}. Used by: —`
  );
}

/**
 * Append a memory entry to the `## Memory` section of a contract index, newest
 * first. The first write replaces the "*No entries yet.*" placeholder; the
 * intro paragraph is preserved. Returns the updated file, or null if there is
 * no `## Memory` heading to write into.
 */
export function appendMemoryEntry(raw: string, entry: MemoryEntry): string | null {
  const lines = raw.split("\n");
  const start = lines.findIndex((l) => l.trim() === "## Memory");
  if (start === -1) return null;

  let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
  if (end === -1) end = lines.length;

  const section = lines.slice(start + 1, end);

  // Intro = the first non-empty paragraph after the heading (kept verbatim).
  let i = 0;
  while (i < section.length && section[i].trim() === "") i++;
  const intro: string[] = [];
  while (i < section.length && section[i].trim() !== "") {
    intro.push(section[i]);
    i++;
  }

  // Existing entries (the placeholder paragraph and any other prose are dropped).
  const existing = section.filter((l) => l.startsWith("- "));

  const rebuilt = [
    "## Memory",
    "",
    ...intro,
    "",
    renderMemoryLine(entry),
    ...existing,
    "",
  ];

  return [...lines.slice(0, start), ...rebuilt, ...lines.slice(end)].join("\n");
}

/** A short title from a hypothesis statement (first clause, ~6 words). */
export function titleFromExperiment(statement: string | undefined, fallback: string): string {
  if (!statement) return fallback;
  const words = statement.replace(/\s+/g, " ").trim().split(" ");
  return words.slice(0, 6).join(" ") + (words.length > 6 ? "…" : "");
}

/** Add `days` to a YYYY-MM-DD date string, returning YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
