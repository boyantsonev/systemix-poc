import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import matter from "gray-matter";

const TOKEN_DIR     = join(process.cwd(), "contract", "tokens");
const COMPONENT_DIR = join(process.cwd(), "contract", "components");

type ContractEntry = {
  slug:             string;
  name:             string;
  type:             "token" | "component";
  status:           string;
  lastUpdated:      string;
  rationale:        string;
  hasPosthogEvidence: boolean;
  href:             string;
  collection?:      string;
};

const BOILERPLATE = "No documentation yet.";

function rationaleSummary(content: string): string {
  const trimmed = content.trim();
  if (!trimmed || trimmed.startsWith(BOILERPLATE)) return "";
  return trimmed.slice(0, 160).replace(/\s+/g, " ").trim() + (trimmed.length > 160 ? "…" : "");
}

function readContracts(): ContractEntry[] {
  const entries: ContractEntry[] = [];

  try {
    for (const entry of readdirSync(TOKEN_DIR)) {
      if (!entry.endsWith(".mdx")) continue;
      const full = join(TOKEN_DIR, entry);
      if (statSync(full).isDirectory()) continue;
      const { data: fm, content } = matter(readFileSync(full, "utf8"));
      if (!fm.token) continue;
      const slug = entry.replace(".mdx", "");
      entries.push({
        slug,
        name:             fm.token as string,
        type:             "token",
        status:           (fm.status as string) ?? "unknown",
        lastUpdated:      String(fm["last-updated"] ?? ""),
        rationale:        rationaleSummary(content),
        hasPosthogEvidence: Boolean(fm["posthog-evidence"]),
        href:             `/design-system/tokens/${slug}`,
        collection:       fm.collection as string | undefined,
      });
    }
  } catch {}

  try {
    for (const entry of readdirSync(COMPONENT_DIR)) {
      if (!entry.endsWith(".mdx")) continue;
      const full = join(COMPONENT_DIR, entry);
      if (statSync(full).isDirectory()) continue;
      const { data: fm, content } = matter(readFileSync(full, "utf8"));
      if (!fm.component) continue;
      const slug = entry.replace(".mdx", "");
      entries.push({
        slug,
        name:         fm.component as string,
        type:         "component",
        status:       (fm.parity as string) ?? "unknown",
        lastUpdated:  String(fm["last-updated"] ?? ""),
        rationale:    rationaleSummary(content),
        hasPosthogEvidence: Boolean(fm["evidence-posthog"] ?? fm["posthog-evidence"]),
        href:         `/design-system/components/${slug}`,
      });
    }
  } catch {}

  return entries.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
}

function StatusPill({ status, type }: { status: string; type: "token" | "component" }) {
  const isComponent = type === "component";
  const map: Record<string, string> = {
    clean:              "bg-green-500/10 text-green-400 border-green-500/20",
    drifted:            "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    "missing-in-figma": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    unknown:            "bg-muted text-muted-foreground/50 border-border/30",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium ${map[status] ?? map.unknown}`}>
      {isComponent && status === "clean" ? "in sync" : status}
    </span>
  );
}

function TypeBadge({ type }: { type: "token" | "component" }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono ${
      type === "token"
        ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
        : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
    }`}>
      {type}
    </span>
  );
}

export default function ContractPage() {
  const entries = readContracts();
  const tokens     = entries.filter(e => e.type === "token");
  const components = entries.filter(e => e.type === "component");
  const withRationale = entries.filter(e => e.rationale.length > 0);
  const withEvidence  = entries.filter(e => e.hasPosthogEvidence);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border/50 px-4 md:px-8 py-5">
        <h1 className="text-[1.1rem] font-black tracking-tight">Contracts</h1>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          One MDX file per experiment. Production results, rationale, and decision history — written by Hermes, approved by you.
        </p>
      </div>

      <div className="px-4 md:px-8 py-6 max-w-4xl">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Tokens",       value: tokens.length,        color: "text-violet-400" },
            { label: "Components",   value: components.length,    color: "text-cyan-400"   },
            { label: "With rationale", value: withRationale.length, color: "text-foreground" },
            { label: "PostHog evidence", value: withEvidence.length, color: "text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="border border-border/40 rounded-lg px-3 py-3">
              <p className={`text-[1.4rem] font-mono font-bold leading-none mb-1 ${color}`}>{value}</p>
              <p className="text-[11px] text-muted-foreground/60">{label}</p>
            </div>
          ))}
        </div>

        {entries.length === 0 ? (
          <div className="rounded-xl border border-border/40 px-6 py-12 text-center">
            <p className="text-[14px] text-muted-foreground mb-2">No contracts yet</p>
            <p className="text-[12px] font-mono text-muted-foreground/50">
              Run <code>/tokens</code> or <code>/component</code> in Claude Code to generate contracts.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Components */}
            {components.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-3">
                  Components ({components.length})
                </h2>
                <div className="space-y-px rounded-xl overflow-hidden border border-border/40">
                  {components.map((e) => (
                    <Link
                      key={e.slug}
                      href={e.href}
                      className="flex items-start gap-4 px-4 py-4 bg-background hover:bg-muted/20 transition-colors border-b border-border/25 last:border-0 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-[13px] text-foreground">{e.name}</span>
                          <StatusPill status={e.status} type={e.type} />
                          {e.hasPosthogEvidence && (
                            <span className="text-[10px] font-mono text-emerald-400/60 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                              PostHog data
                            </span>
                          )}
                        </div>
                        {e.rationale ? (
                          <p className="text-[12px] text-muted-foreground/60 leading-relaxed line-clamp-2">{e.rationale}</p>
                        ) : (
                          <p className="text-[12px] text-muted-foreground/30 font-mono italic">No rationale written yet</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {e.lastUpdated && (
                          <p className="text-[10px] font-mono text-muted-foreground/30">{e.lastUpdated.slice(0, 10)}</p>
                        )}
                        <span className="text-muted-foreground/20 text-[11px] group-hover:text-muted-foreground/50 transition-colors">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Tokens */}
            {tokens.length > 0 && (
              <section>
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-3">
                  Tokens ({tokens.length})
                </h2>
                <div className="space-y-px rounded-xl overflow-hidden border border-border/40">
                  {tokens.map((e) => (
                    <Link
                      key={e.slug}
                      href={e.href}
                      className="flex items-start gap-4 px-4 py-4 bg-background hover:bg-muted/20 transition-colors border-b border-border/25 last:border-0 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-[13px] text-foreground">{e.name}</span>
                          {e.collection && (
                            <span className="text-[10px] font-mono text-muted-foreground/40">{e.collection}</span>
                          )}
                          <StatusPill status={e.status} type={e.type} />
                          {e.hasPosthogEvidence && (
                            <span className="text-[10px] font-mono text-emerald-400/60 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                              PostHog data
                            </span>
                          )}
                        </div>
                        {e.rationale ? (
                          <p className="text-[12px] text-muted-foreground/60 leading-relaxed line-clamp-2">{e.rationale}</p>
                        ) : (
                          <p className="text-[12px] text-muted-foreground/30 font-mono italic">No rationale written yet</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {e.lastUpdated && (
                          <p className="text-[10px] font-mono text-muted-foreground/30">{e.lastUpdated.slice(0, 10)}</p>
                        )}
                        <span className="text-muted-foreground/20 text-[11px] group-hover:text-muted-foreground/50 transition-colors">→</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
