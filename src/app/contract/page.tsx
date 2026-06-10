import Link from "next/link";
import { DocsPage, DocsBody, DocsTitle } from "fumadocs-ui/page";
import { contractSource } from "@/lib/contract-source";

const CATEGORIES = [
  { key: "hypotheses", title: "Hypotheses", blurb: "Experiments and the evidence that closed them." },
  { key: "tokens", title: "Tokens", blurb: "Colors, spacing, radius — matched against the repo." },
  { key: "components", title: "Components", blurb: "Component contracts with parity + drift status." },
];

export default function ContractIndex() {
  const pages = contractSource.getPages();

  return (
    <DocsPage>
      <DocsTitle>The Contract</DocsTitle>
      <DocsBody>
        <p className="text-fd-muted-foreground">
          The living agreement between this team and the engine — the records the
          loop reads, validates, and writes back. Pick a category, or browse from
          the sidebar.
        </p>

        <div className="not-prose mt-8 space-y-6">
          {CATEGORIES.map(({ key, title, blurb }) => {
            const items = pages.filter((p) => p.slugs[0] === key);
            if (!items.length) return null;
            return (
              <section key={key}>
                <div className="mb-1 flex items-baseline gap-2">
                  <h2 className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {title}
                  </h2>
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
      </DocsBody>
    </DocsPage>
  );
}
