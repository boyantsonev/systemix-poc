import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import matter from "gray-matter";

const COMP_DIR = join(process.cwd(), "contract", "components");
const TOKEN_DIR = join(process.cwd(), "contract", "tokens");

type ComponentStory = {
  slug: string;
  name: string;
  parity: string;
  path: string | null;
  lastUpdated: string | null;
  prose: string;
};

type TokenDecision = {
  slug: string;
  name: string;
  status: string;
  resolveDecision: string | null;
  lastUpdated: string | null;
};

function readComponentStories(): ComponentStory[] {
  try {
    return readdirSync(COMP_DIR)
      .filter(f => f.endsWith(".mdx"))
      .map(f => {
        const { data: fm, content } = matter(readFileSync(join(COMP_DIR, f), "utf8"));
        const slug = f.replace(/\.mdx$/, "");
        return {
          slug,
          name: (fm.component as string) ?? slug,
          parity: (fm.parity as string) ?? "unknown",
          path: (fm.path as string) ?? null,
          lastUpdated: (fm["last-updated"] as string) ?? null,
          prose: content.trim(),
        };
      });
  } catch {
    return [];
  }
}

function readTokenDecisions(): TokenDecision[] {
  try {
    return readdirSync(TOKEN_DIR)
      .filter(f => f.endsWith(".mdx"))
      .filter(f => {
        const { data: fm } = matter(readFileSync(join(TOKEN_DIR, f), "utf8"));
        return fm.resolved === true;
      })
      .map(f => {
        const { data: fm } = matter(readFileSync(join(TOKEN_DIR, f), "utf8"));
        const slug = f.replace(/\.mdx$/, "");
        return {
          slug,
          name: (fm.token as string) ?? slug,
          status: (fm.status as string) ?? "unknown",
          resolveDecision: (fm["resolve-decision"] as string) ?? null,
          lastUpdated: (fm["last-updated"] as string) ?? null,
        };
      })
      .sort((a, b) => String(b.lastUpdated ?? "").localeCompare(String(a.lastUpdated ?? "")));
  } catch {
    return [];
  }
}

function ParityBadge({ parity }: { parity: string }) {
  const cls: Record<string, string> = {
    clean:   "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    drifted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    unknown: "bg-muted/40 text-muted-foreground/50 border-border",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold ${cls[parity] ?? cls.unknown}`}>
      {parity}
    </span>
  );
}

// Truncate prose to roughly 2 sentences
function truncateProse(prose: string, limit = 180): string {
  if (!prose || prose.length <= limit) return prose;
  const cut = prose.slice(0, limit);
  const lastDot = cut.lastIndexOf(".");
  return lastDot > 80 ? cut.slice(0, lastDot + 1) : cut + "…";
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const components = readComponentStories();
  const decisions = readTokenDecisions();
  const hasContent = components.length > 0 || decisions.length > 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-6 md:px-6 md:py-8">

        {!hasContent ? (
          /* ── Empty state ──────────────────────────────────────────────── */
          <div className="mt-12 text-center">
            <p className="text-[14px] font-semibold text-foreground mb-2">Rationale &amp; Stories</p>
            <p className="text-[12px] font-mono text-muted-foreground/40 leading-relaxed max-w-xs mx-auto mb-6">
              The &quot;why&quot; behind every token and component decision — authored by Hermes and edited by your team.
            </p>
            <div className="rounded-lg border border-dashed border-border/50 px-5 py-5 text-left max-w-sm mx-auto">
              <p className="text-[11px] font-mono text-muted-foreground/50 mb-2">To populate this view:</p>
              <ol className="space-y-1 text-[11px] font-mono text-muted-foreground/40">
                <li>1. npm run generate-contracts</li>
                <li>2. Open /design-system to review</li>
                <li>3. Stories appear here after contracts are generated</li>
              </ol>
            </div>
            <p className="text-[10px] font-mono text-muted-foreground/25 mt-8">
              SYSTMIX-92 · or run <code>npx systemix watch</code>
            </p>
          </div>
        ) : (
          <>
            {/* ── Component rationale ──────────────────────────────────── */}
            {components.length > 0 && (
              <section className="mb-10">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40 mb-4">
                  Components ({components.length})
                </h2>
                <div className="space-y-4">
                  {components.map(c => (
                    <article key={c.slug} className="border border-border/40 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[14px] font-bold text-foreground">{c.name}</span>
                        <ParityBadge parity={c.parity} />
                      </div>
                      {c.prose ? (
                        <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
                          {truncateProse(c.prose)}
                        </p>
                      ) : (
                        <p className="text-[12px] font-mono text-muted-foreground/30 mb-3">No rationale written yet.</p>
                      )}
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/design-system/components/${c.slug}`}
                          className="text-[11px] font-mono text-muted-foreground/50 hover:text-foreground transition-colors"
                        >
                          Full contract →
                        </Link>
                        {c.lastUpdated && (
                          <span className="text-[10px] font-mono text-muted-foreground/30">
                            {String(c.lastUpdated).slice(0, 10)}
                          </span>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* ── Token decisions ───────────────────────────────────────── */}
            {decisions.length > 0 && (
              <section>
                <h2 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40 mb-4">
                  Recent token decisions ({decisions.length})
                </h2>
                <div className="rounded-xl border border-border/40 overflow-hidden divide-y divide-border/30">
                  {decisions.slice(0, 10).map(d => (
                    <Link
                      key={d.slug}
                      href={`/design-system/tokens/${d.slug}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                    >
                      <span className="flex-1 font-mono text-[12px] text-foreground/80">{d.name}</span>
                      {d.resolveDecision && (
                        <span className="text-[11px] font-mono text-muted-foreground/50 shrink-0">{d.resolveDecision}</span>
                      )}
                      {d.lastUpdated && (
                        <span className="text-[10px] font-mono text-muted-foreground/30 shrink-0">
                          {String(d.lastUpdated).slice(0, 10)}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
