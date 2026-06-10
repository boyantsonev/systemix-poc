import Link from "next/link";
import { getNavSections } from "@/lib/docs-manifest";

// "Start here for…" role chooser + section overview for the docs index
// (content/docs/index.mdx). Extracted from the old src/app/docs/page.tsx so the
// index can be a Fumadocs page like every other doc.
const ROLE_PATHS = [
  {
    role: "Operator",
    line: "Run the loops, work the HITL queue, read decisions.",
    href: "/docs/concepts/hypothesis-validation",
    cta: "Start with the loop →",
  },
  {
    role: "Designer",
    line: "Hypotheses, tokens, and components — the records of the living Contract.",
    href: "/contract",
    cta: "Open the Contract →",
  },
  {
    role: "Engineer",
    line: "Install, wire skills + MCP, own config and CI.",
    href: "/docs/quick-install",
    cta: "Start with quick install →",
  },
];

export function DocsRoleChooser() {
  const sections = getNavSections();

  return (
    <div className="not-prose">
      <p className="text-[11px] font-mono text-muted-foreground/60 uppercase tracking-widest mb-3">
        Start here for…
      </p>
      <div className="grid sm:grid-cols-3 gap-3 mb-12">
        {ROLE_PATHS.map(({ role, line, href, cta }) => (
          <Link
            key={role}
            href={href}
            className="group border border-border/40 rounded-xl px-4 py-4 bg-background hover:border-border transition-colors flex flex-col"
          >
            <p className="text-[14px] font-bold text-foreground mb-1.5">{role}</p>
            <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">{line}</p>
            <span className="mt-auto text-[12px] font-mono text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
              {cta}
            </span>
          </Link>
        ))}
      </div>

      <div className="space-y-6">
        {sections.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
              {section}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {items.map(({ title, href, external }) => (
                <Link
                  key={href}
                  href={href}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  {title}
                  {external && <span className="text-[10px] text-muted-foreground/30"> ↗</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
