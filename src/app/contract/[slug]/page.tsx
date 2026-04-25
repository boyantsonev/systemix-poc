import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import Link from "next/link";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote/rsc";
import { parse as parseColor, formatHex, differenceCiede2000 } from "culori";
import { TokenResolveControl } from "@/components/contract/TokenResolveControl";

const CONTRACT_DIR = join(process.cwd(), "contract");

function findMdxFile(slug: string): string | null {
  function scan(dir: string): string | null {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        const found = scan(full);
        if (found) return found;
      } else if (entry === `${slug}.mdx`) {
        return full;
      }
    }
    return null;
  }
  try { return scan(CONTRACT_DIR); } catch { return null; }
}

export async function generateStaticParams() {
  const slugs: { slug: string }[] = [];
  function scan(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) scan(full);
      else if (entry.endsWith(".mdx")) slugs.push({ slug: entry.replace(".mdx", "") });
    }
  }
  try { scan(CONTRACT_DIR); } catch {}
  return slugs;
}

type Fm = {
  token?: string;
  component?: string;
  value?: string;
  "figma-value"?: string | null;
  status?: string;
  parity?: string;
  resolved?: boolean;
  collection?: string;
  "last-updated"?: string;
  "last-resolver"?: string | null;
  "resolve-decision"?: string | null;
  "usage-count-30d"?: number | null;
  source?: string;
};

function isColorValue(v?: string | null): boolean {
  if (!v) return false;
  return /^(#|oklch\(|oklab\(|rgb[a]?\(|hsl[a]?\()/i.test(v.trim());
}

function computeDeltaE(a: string, b: string): number | null {
  try {
    const ca = parseColor(a);
    const cb = parseColor(b);
    if (!ca || !cb) return null;
    return Math.round(differenceCiede2000()(ca, cb) * 10) / 10;
  } catch {
    return null;
  }
}

function deltaELabel(de: number): { label: string; colour: string } {
  if (de < 2)  return { label: "imperceptible",  colour: "text-green-400" };
  if (de < 5)  return { label: "just perceptible", colour: "text-yellow-400" };
  return        { label: "obvious drift",       colour: "text-red-400" };
}

function toHex(v: string): string | null {
  try {
    const c = parseColor(v);
    return c ? (formatHex(c) ?? null) : null;
  } catch { return null; }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    clean:              "bg-green-500/15 text-green-400 border-green-500/30",
    drifted:            "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    "missing-in-figma": "bg-blue-500/15 text-blue-400 border-blue-500/30",
    blocked:            "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono font-medium ${colours[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status}
    </span>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[11px] font-mono text-muted-foreground w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-[13px] font-mono text-foreground break-all">{value}</span>
    </div>
  );
}

// ── Color swatch section (token-only) ─────────────────────────────────────────

function ColorSwatchSection({
  codeValue,
  figmaValue,
  status,
}: {
  codeValue: string;
  figmaValue: string | null | undefined;
  status: string | undefined;
}) {
  const hasFigma = figmaValue != null && figmaValue !== "null";
  const de = hasFigma ? computeDeltaE(codeValue, figmaValue!) : null;
  const codeHex = toHex(codeValue);

  return (
    <div className="mb-8">
      <div className={`flex gap-4 ${hasFigma ? "" : "max-w-xs"}`}>
        {/* Code swatch */}
        <div className="flex-1">
          <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-2">Code</p>
          <div
            className="h-16 rounded-lg border border-white/10 mb-2"
            style={{ backgroundColor: codeValue }}
          />
          <p className="text-[11px] font-mono text-muted-foreground">{codeValue}</p>
          {codeHex && codeHex !== codeValue && (
            <p className="text-[10px] font-mono text-muted-foreground/50">{codeHex}</p>
          )}
        </div>

        {/* Figma swatch */}
        {hasFigma && (
          <div className="flex-1">
            <p className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-2">Figma</p>
            <div
              className="h-16 rounded-lg border border-white/10 mb-2"
              style={{ backgroundColor: figmaValue! }}
            />
            <p className="text-[11px] font-mono text-muted-foreground">{figmaValue}</p>
          </div>
        )}
      </div>

      {/* ΔE indicator */}
      {de !== null && (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-[11px] font-mono text-muted-foreground/60">ΔE (CIEDE2000)</span>
          <span className="text-[13px] font-mono font-medium text-foreground">{de}</span>
          <span className={`text-[11px] font-mono ${deltaELabel(de).colour}`}>
            — {deltaELabel(de).label}
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden max-w-32">
            <div
              className={`h-full rounded-full transition-all ${de < 2 ? "bg-green-500" : de < 5 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${Math.min(100, (de / 10) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ContractPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const filePath = findMdxFile(slug);
  if (!filePath) notFound();

  const raw = readFileSync(filePath, "utf8");
  const { data: fm, content } = matter(raw) as { data: Fm; content: string };
  const name = fm.token ?? fm.component ?? slug;
  const status = fm.status ?? fm.parity;
  const isToken = Boolean(fm.token);
  const isColorToken = isToken && isColorValue(fm.value);
  const showResolve = isToken && status === "drifted" && fm.resolved === false;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* Breadcrumb nav */}
        <nav className="flex gap-6 mb-10 text-[11px] font-mono text-muted-foreground">
          <Link
            href={isToken ? "/contract/tokens" : "/contract/components"}
            className="hover:text-foreground transition-colors"
          >
            ← {isToken ? "tokens" : "components"}
          </Link>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
            {isToken ? `Token · ${fm.collection ?? "—"}` : "Component"}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-mono font-bold text-foreground">{name}</h1>
            {status && <StatusBadge status={status} />}
            {isToken && fm.resolved && (
              <span className="text-[10px] font-mono text-muted-foreground/60 border border-border/30 px-2 py-0.5 rounded">
                resolved by {fm["last-resolver"]}
              </span>
            )}
          </div>
        </div>

        {/* Color swatches — token only */}
        {isColorToken && (
          <ColorSwatchSection
            codeValue={fm.value!}
            figmaValue={fm["figma-value"]}
            status={status}
          />
        )}

        {/* Frontmatter table */}
        <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-2 mb-8 divide-y divide-border/20">
          {!isColorToken && fm.value && <Field label="value" value={fm.value} />}
          {!isColorToken && "figma-value" in fm && (
            <Field label="figma-value" value={fm["figma-value"] ?? "null"} />
          )}
          {fm.collection && <Field label="collection" value={fm.collection} />}
          {fm.source && <Field label="source" value={fm.source} />}
          {"resolved" in fm && (
            <Field label="resolved" value={String(fm.resolved)} />
          )}
          {fm["resolve-decision"] && (
            <Field label="decision" value={fm["resolve-decision"]} />
          )}
          {fm["last-updated"] && (
            <Field label="last-updated" value={String(fm["last-updated"]).slice(0, 10)} />
          )}
          {fm["last-resolver"] && (
            <Field label="last-resolver" value={String(fm["last-resolver"])} />
          )}
          {fm["usage-count-30d"] != null && (
            <Field label="usage-30d" value={String(fm["usage-count-30d"])} />
          )}
        </div>

        {/* Inline resolve control */}
        {showResolve && (
          <div className="rounded-lg border border-yellow-500/25 bg-yellow-500/5 px-4 py-4 mb-8">
            <p className="text-[11px] font-mono text-yellow-400/80 uppercase tracking-widest mb-3">
              Unresolved drift
            </p>
            <TokenResolveControl slug={slug} />
          </div>
        )}

        {/* Hermes rationale prose */}
        <div className="prose prose-sm prose-invert max-w-none text-muted-foreground leading-relaxed [&_code]:text-foreground/80 [&_code]:bg-muted/60 [&_code]:px-1 [&_code]:rounded [&_code]:text-[12px]">
          <MDXRemote source={content} />
        </div>

        <p className="mt-10 text-[10px] font-mono text-muted-foreground/40">
          {filePath.replace(process.cwd(), "")}
        </p>
      </div>
    </div>
  );
}
