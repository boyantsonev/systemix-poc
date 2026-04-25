import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import matter from "gray-matter";
import { ContractFilterGrid, type ContractRow } from "@/components/contract/ContractFilterGrid";

const TOKEN_DIR = join(process.cwd(), "contract", "tokens");

function readTokenRows(): ContractRow[] {
  const rows: ContractRow[] = [];
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
        type:       "token",
        status:     (fm.status as string) ?? "unknown",
        value:      fm.value as string | undefined,
        figmaValue: (fm["figma-value"] as string | null | undefined) ?? undefined,
        collection: fm.collection as string | undefined,
        resolved:   fm.resolved as boolean | undefined,
      });
    }
  } catch {}
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export default function TokensIndexPage() {
  const rows = readTokenRows();
  const drifted = rows.filter(r => r.status === "drifted").length;
  const missing = rows.filter(r => r.status === "missing-in-figma").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Nav */}
        <nav className="flex gap-6 mb-10 text-[11px] font-mono text-muted-foreground">
          <Link href="/contract" className="hover:text-foreground transition-colors">
            ← contract
          </Link>
          <Link href="/contract/components" className="hover:text-foreground transition-colors">
            components →
          </Link>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
            Contract Index
          </p>
          <h1 className="text-2xl font-mono font-bold">Tokens</h1>
          <div className="flex gap-4 mt-2 text-[12px] font-mono text-muted-foreground">
            <span>{rows.length} total</span>
            {drifted > 0 && <span className="text-yellow-400/80">{drifted} drifted</span>}
            {missing > 0 && <span className="text-blue-400/80">{missing} missing in Figma</span>}
          </div>
        </div>

        <ContractFilterGrid rows={rows} type="token" />
      </div>
    </div>
  );
}
