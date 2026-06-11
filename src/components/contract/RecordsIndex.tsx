import Link from "next/link";
import { contractSource } from "@/lib/contract-source";

// Generated records appendix for the root contract page — tokens, components,
// and workflow definitions the engine maintains while pursuing goals.
const CATEGORIES = [
  { key: "tokens", title: "Tokens", blurb: "Colors, spacing, radius — matched against the repo." },
  { key: "components", title: "Components", blurb: "Component contracts with parity + drift status." },
  { key: "workflows", title: "Workflows", blurb: "Agentic workflow definitions — the Atlas catalog source." },
];

export function RecordsIndex() {
  const pages = contractSource.getPages();

  return (
    <div className="not-prose space-y-6">
      {CATEGORIES.map(({ key, title, blurb }) => {
        const items = pages.filter((p) => p.slugs[0] === key);
        if (!items.length) return null;
        return (
          <section key={key}>
            <div className="mb-1 flex items-baseline gap-2">
              <h3 className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground/70">
                {title}
              </h3>
              <span className="text-[12px] text-muted-foreground/40">{items.length}</span>
            </div>
            <p className="mb-3 text-[13px] text-muted-foreground">{blurb}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {items.map((p) => (
                <Link
                  key={p.url}
                  href={p.url}
                  className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {p.data.title}
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
