import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import matter from "gray-matter";

const TOKEN_DIR     = join(process.cwd(), "contract", "tokens");
const COMPONENT_DIR = join(process.cwd(), "contract", "components");

// ── Data reading ──────────────────────────────────────────────────────────────

type TokenRecord = {
  slug: string;
  name: string;
  status: string;
  resolved?: boolean;
  collection?: string;
  "last-updated"?: string;
  "resolve-decision"?: string | null;
  "last-resolver"?: string | null;
};

type ComponentRecord = {
  slug: string;
  name: string;
  parity: string;
  path?: string;
  "last-updated"?: string;
};

function readTokens(): TokenRecord[] {
  const rows: TokenRecord[] = [];
  try {
    for (const entry of readdirSync(TOKEN_DIR)) {
      if (!entry.endsWith(".mdx")) continue;
      const { data: fm } = matter(readFileSync(join(TOKEN_DIR, entry), "utf8"));
      if (!fm.token) continue;
      rows.push({
        slug:             entry.replace(".mdx", ""),
        name:             fm.token as string,
        status:           (fm.status as string) ?? "unknown",
        resolved:         fm.resolved as boolean | undefined,
        collection:       fm.collection as string | undefined,
        "last-updated":   fm["last-updated"] as string | undefined,
        "resolve-decision": fm["resolve-decision"] as string | null | undefined ?? null,
        "last-resolver":  fm["last-resolver"] as string | null | undefined ?? null,
      });
    }
  } catch {}
  return rows;
}

function readComponents(): ComponentRecord[] {
  const rows: ComponentRecord[] = [];
  try {
    for (const entry of readdirSync(COMPONENT_DIR)) {
      if (!entry.endsWith(".mdx")) continue;
      const { data: fm } = matter(readFileSync(join(COMPONENT_DIR, entry), "utf8"));
      if (!fm.component) continue;
      rows.push({
        slug:           entry.replace(".mdx", ""),
        name:           fm.component as string,
        parity:         (fm.parity as string) ?? "unknown",
        path:           fm.path as string | undefined,
        "last-updated": fm["last-updated"] as string | undefined,
      });
    }
  } catch {}
  return rows;
}

function computeScore(tokens: TokenRecord[], components: ComponentRecord[]) {
  const totalT         = tokens.length;
  const cleanT         = tokens.filter(t => t.status === "clean").length;
  const driftedUnresolved = tokens.filter(t => t.status === "drifted" && !t.resolved).length;
  const missingInFigma = tokens.filter(t => t.status === "missing-in-figma").length;

  const totalC  = components.length;
  const cleanC  = components.filter(c => c.parity === "clean").length;

  const tScore = totalT === 0 ? 1 : (cleanT / totalT) - (driftedUnresolved * 0.05) - (missingInFigma * 0.03);
  const cScore = totalC === 0 ? 1 : cleanC / totalC;
  const overall = Math.max(0, Math.round(((tScore + cScore) / 2) * 100));

  return {
    overall,
    tokens: { total: totalT, clean: cleanT, driftedUnresolved, missingInFigma, drifted: tokens.filter(t => t.status === "drifted").length },
    components: { total: totalC, clean: cleanC, drifted: totalC - cleanC },
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function scoreColour(n: number) {
  if (n >= 80) return { text: "text-green-400",  bar: "bg-green-500",  ring: "border-green-500/40" };
  if (n >= 60) return { text: "text-yellow-400", bar: "bg-yellow-500", ring: "border-yellow-500/40" };
  return              { text: "text-red-400",    bar: "bg-red-500",    ring: "border-red-500/40" };
}

function ScoreLabel({ n }: { n: number }) {
  if (n >= 80) return <span className="text-green-400/70">healthy</span>;
  if (n >= 60) return <span className="text-yellow-400/70">needs attention</span>;
  return              <span className="text-red-400/70">critical</span>;
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContractLandingPage() {
  const tokens     = readTokens();
  const components = readComponents();
  const score      = computeScore(tokens, components);
  const col        = scoreColour(score.overall);

  // Issues: unresolved drifted + missing-in-figma tokens, drifted components
  const tokenIssues = tokens.filter(
    t => (t.status === "drifted" && !t.resolved) || t.status === "missing-in-figma"
  );
  const componentIssues = components.filter(c => c.parity !== "clean");

  // Recent decisions: resolved tokens, sorted newest first
  const recentDecisions = tokens
    .filter(t => t.resolved === true)
    .sort((a, b) => {
      const da = String(a["last-updated"] ?? "");
      const db = String(b["last-updated"] ?? "");
      return db.localeCompare(da);
    })
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">

        {/* ── Quality Score ─────────────────────────────────────── */}
        <div className="mb-10">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
            Contract Health
          </p>
          <div className="flex items-end gap-6 mb-4">
            <div>
              <span className={`text-7xl font-mono font-bold leading-none ${col.text}`}>
                {score.overall}
              </span>
              <span className="text-2xl font-mono text-muted-foreground/40 ml-1">/100</span>
            </div>
            <div className="pb-2">
              <p className="text-[14px] font-mono font-medium text-foreground">Quality Score</p>
              <p className="text-[12px] font-mono"><ScoreLabel n={score.overall} /></p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden max-w-sm">
            <div
              className={`h-full rounded-full transition-all ${col.bar}`}
              style={{ width: `${score.overall}%` }}
            />
          </div>
        </div>

        {/* ── Breakdown ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          {/* Tokens */}
          <div className={`rounded-lg border ${col.ring} bg-muted/10 px-4 py-4`}>
            <Link href="/contract/tokens" className="group block">
              <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-3">
                Tokens
              </p>
              <p className="text-3xl font-mono font-bold text-foreground mb-3">
                {score.tokens.clean}
                <span className="text-muted-foreground/40 text-lg">/{score.tokens.total}</span>
              </p>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">clean</span>
                  <span className="text-green-400">{score.tokens.clean}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">drifted</span>
                  <span className={score.tokens.drifted > 0 ? "text-yellow-400" : "text-muted-foreground/40"}>
                    {score.tokens.drifted}
                    {score.tokens.driftedUnresolved > 0 && (
                      <span className="text-orange-400/80"> ({score.tokens.driftedUnresolved} unresolved)</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">missing in Figma</span>
                  <span className={score.tokens.missingInFigma > 0 ? "text-blue-400" : "text-muted-foreground/40"}>
                    {score.tokens.missingInFigma}
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Components */}
          <div className="rounded-lg border border-border/50 bg-muted/10 px-4 py-4">
            <Link href="/contract/components" className="group block">
              <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-3">
                Components
              </p>
              <p className="text-3xl font-mono font-bold text-foreground mb-3">
                {score.components.clean}
                <span className="text-muted-foreground/40 text-lg">/{score.components.total}</span>
              </p>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">clean</span>
                  <span className="text-green-400">{score.components.clean}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">drifted</span>
                  <span className={score.components.drifted > 0 ? "text-yellow-400" : "text-muted-foreground/40"}>
                    {score.components.drifted}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* ── Issues ────────────────────────────────────────────── */}
        {(tokenIssues.length + componentIssues.length) > 0 && (
          <div className="mb-10">
            <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-3">
              Issues ({tokenIssues.length + componentIssues.length})
            </p>
            <div className="rounded-lg border border-border/50 overflow-hidden divide-y divide-border/30">
              {tokenIssues.map(t => (
                <Link
                  key={t.slug}
                  href={`/contract/${t.slug}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <span className="flex-1 font-mono text-[13px] text-foreground">{t.name}</span>
                  <StatusPill status={t.status} />
                  {t.status === "drifted" && !t.resolved && (
                    <span className="text-[10px] font-mono text-orange-400/80">unresolved</span>
                  )}
                  {t.collection && (
                    <span className="text-[10px] font-mono text-muted-foreground/50">{t.collection}</span>
                  )}
                  <span className="text-muted-foreground/30 text-[11px]">→</span>
                </Link>
              ))}
              {componentIssues.map(c => (
                <Link
                  key={c.slug}
                  href={`/contract/${c.slug}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <span className="flex-1 font-mono text-[13px] text-foreground">{c.name}</span>
                  <StatusPill status={c.parity} />
                  <span className="text-[10px] font-mono text-muted-foreground/50">component</span>
                  <span className="text-muted-foreground/30 text-[11px]">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Recent decisions ──────────────────────────────────── */}
        {recentDecisions.length > 0 && (
          <div className="mb-10">
            <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-3">
              Recent decisions
            </p>
            <div className="rounded-lg border border-border/50 overflow-hidden divide-y divide-border/30">
              {recentDecisions.map(t => (
                <Link
                  key={t.slug}
                  href={`/contract/${t.slug}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <span className="flex-1 font-mono text-[13px] text-foreground">{t.name}</span>
                  {t["resolve-decision"] && (
                    <span className="text-[11px] font-mono text-muted-foreground/60">
                      {t["resolve-decision"]}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-muted-foreground/40">
                    {t["last-resolver"] ?? "resolved"}
                  </span>
                  {t["last-updated"] && (
                    <span className="text-[10px] font-mono text-muted-foreground/40">
                      {String(t["last-updated"]).slice(0, 10)}
                    </span>
                  )}
                  <span className="text-muted-foreground/30 text-[11px]">→</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick actions ─────────────────────────────────────── */}
        <div>
          <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-3">
            Browse
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/contract/tokens"
              className="px-4 py-2 rounded border border-border text-[12px] font-mono text-foreground hover:border-foreground/50 hover:bg-muted/20 transition-colors"
            >
              All tokens ({score.tokens.total})
            </Link>
            <Link
              href="/contract/components"
              className="px-4 py-2 rounded border border-border text-[12px] font-mono text-foreground hover:border-foreground/50 hover:bg-muted/20 transition-colors"
            >
              All components ({score.components.total})
            </Link>
            {score.tokens.driftedUnresolved > 0 && (
              <Link
                href="/contract/tokens"
                className="px-4 py-2 rounded border border-yellow-500/40 text-[12px] font-mono text-yellow-400 hover:border-yellow-500/70 hover:bg-yellow-500/10 transition-colors"
              >
                {score.tokens.driftedUnresolved} unresolved drift{score.tokens.driftedUnresolved !== 1 ? "s" : ""}
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
