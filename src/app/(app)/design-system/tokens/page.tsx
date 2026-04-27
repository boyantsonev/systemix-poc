import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import matter from "gray-matter";

const TOKEN_DIR = join(process.cwd(), "contract", "tokens");

type Token = {
  slug:        string;
  name:        string;
  status:      string;
  collection:  string;
  value?:      string;
  "delta-e"?:  number | null;
};

function readTokens(): Token[] {
  const rows: Token[] = [];
  try {
    for (const entry of readdirSync(TOKEN_DIR)) {
      if (!entry.endsWith(".mdx")) continue;
      const full = join(TOKEN_DIR, entry);
      if (statSync(full).isDirectory()) continue;
      const { data: fm } = matter(readFileSync(full, "utf8"));
      if (!fm.token) continue;
      rows.push({
        slug:       entry.replace(".mdx", ""),
        name:       fm.token as string,
        status:     (fm.status as string) ?? "unknown",
        collection: (fm.collection as string) ?? "Other",
        value:      fm.value as string | undefined,
        "delta-e":  fm["delta-e"] as number | null | undefined,
      });
    }
  } catch {}
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function isColor(v?: string | null): boolean {
  if (!v) return false;
  return /^(#|oklch\(|oklab\(|rgb[a]?\(|hsl[a]?\()/i.test(v.trim());
}

function StatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    clean:              "bg-green-500/15 text-green-400 border-green-500/30",
    drifted:            "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    "missing-in-figma": "bg-blue-500/15 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-mono font-medium ${cls[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

export default function TokensDocIndexPage() {
  const tokens = readTokens();

  const collections: Record<string, Token[]> = {};
  for (const t of tokens) {
    (collections[t.collection] ??= []).push(t);
  }

  const drifted = tokens.filter(t => t.status === "drifted").length;
  const missing = tokens.filter(t => t.status === "missing-in-figma").length;

  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Design System</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">Tokens</h1>
      <p className="text-[16px] text-muted-foreground leading-relaxed mb-2">
        {tokens.length} design tokens — authored by Hermes, verified against Figma.
      </p>
      {(drifted > 0 || missing > 0) && (
        <div className="flex gap-3 mb-10 text-[12px] font-mono">
          {drifted > 0 && <span className="text-yellow-400/80">{drifted} drifted</span>}
          {missing > 0 && <span className="text-blue-400/80">{missing} missing in Figma</span>}
          <Link href="/contract" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            → resolve in contract triage
          </Link>
        </div>
      )}
      {tokens.length > 0 && drifted === 0 && missing === 0 && <div className="mb-10" />}

      <hr className="border-border/40 mb-10" />

      {tokens.length === 0 ? (
        <div className="rounded-xl border border-border/40 px-6 py-12 text-center">
          <p className="text-[14px] text-muted-foreground mb-2">No contracts yet</p>
          <p className="text-[13px] text-muted-foreground/60">
            Run Hermes to author token contracts into{" "}
            <code className="font-mono text-[12px]">contract/tokens/</code>
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(collections).map(([collection, items]) => (
            <section key={collection}>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-4">
                {collection}
              </h2>
              <div className="space-y-px rounded-xl overflow-hidden border border-border/40">
                {items.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/design-system/tokens/${t.slug}`}
                    className="flex items-center gap-4 px-4 py-3.5 bg-background hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                  >
                    {isColor(t.value) ? (
                      <span
                        className="shrink-0 w-5 h-5 rounded border border-white/10"
                        style={{ backgroundColor: t.value }}
                      />
                    ) : (
                      <span className="shrink-0 w-5 h-5 rounded border border-border/40 bg-muted/20" />
                    )}

                    <span className="flex-1 font-mono text-[13px] text-foreground">{t.name}</span>

                    {t.value && (
                      <span className="text-[11px] font-mono text-muted-foreground/50 hidden sm:block truncate max-w-[180px]">
                        {t.value}
                      </span>
                    )}

                    {t["delta-e"] != null && t["delta-e"] > 0 && (
                      <span className={`text-[10px] font-mono shrink-0 ${
                        t["delta-e"]! < 2 ? "text-green-400/60" :
                        t["delta-e"]! < 5 ? "text-yellow-400/80" : "text-red-400/80"
                      }`}>
                        ΔE {t["delta-e"]}
                      </span>
                    )}

                    <StatusPill status={t.status} />
                    <span className="text-muted-foreground/30 text-[11px]">→</span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}
