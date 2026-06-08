import { ColorSwatch } from "@/components/tokens/ColorSwatch";

// Compact data header rendered above each System styleguide page, from the
// contract frontmatter. Read-only — the drift-resolve controls live in the
// (deprecated) /design-system dashboard, intentionally out of scope here.
export type ContractData = {
  token?: string;
  component?: string;
  hypothesis?: string;
  id?: string;
  status?: string;
  collection?: string;
  section?: string;
  value?: string;
  parity?: string;
  path?: string;
  "storybook-story"?: string;
  result?: string;
  decision?: string;
};

function Badge({ label }: { label: string }) {
  const tones: Record<string, string> = {
    clean: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
    drifted: "text-amber-500 border-amber-500/30 bg-amber-500/10",
    missing: "text-violet-500 border-violet-500/30 bg-violet-500/10",
    muted: "text-muted-foreground border-border bg-muted/40",
  };
  const key = /drift/i.test(label)
    ? "drifted"
    : /missing/i.test(label)
      ? "missing"
      : /clean|synced|complete|promote|confirm/i.test(label)
        ? "clean"
        : "muted";
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-mono ${tones[key]}`}
    >
      {label}
    </span>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[12px] text-foreground">
      {children}
    </code>
  );
}

export function ContractMeta({ data }: { data: ContractData }) {
  let row: React.ReactNode = null;

  if (data.token) {
    const v = data.value == null ? undefined : String(data.value);
    const isColor = !!v && /^(#|oklch|rgb|hsl|var\()/i.test(v.trim());
    row = (
      <>
        {isColor ? <ColorSwatch value={v} size="sm" /> : null}
        {v ? <Mono>{v}</Mono> : null}
        {data.collection ? <Badge label={String(data.collection)} /> : null}
        {data.status ? <Badge label={String(data.status)} /> : null}
      </>
    );
  } else if (data.component) {
    row = (
      <>
        {data.parity ? <Badge label={data.parity} /> : null}
        {data.path ? <Mono>{data.path}</Mono> : null}
        {data["storybook-story"] ? <Mono>{data["storybook-story"]}</Mono> : null}
      </>
    );
  } else if (data.hypothesis || data.id) {
    row = (
      <>
        {data.status ? <Badge label={data.status} /> : null}
        {data.section ? <Badge label={data.section} /> : null}
        {data.decision ? <Badge label={`decision: ${data.decision}`} /> : null}
      </>
    );
  }

  if (!row) return null;

  return (
    <div className="not-prose mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3">
      {row}
    </div>
  );
}
