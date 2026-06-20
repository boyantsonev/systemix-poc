import {
  SiClaude,
  SiGithub,
  SiPosthog,
  SiFigma,
  SiLinear,
  SiGoogleanalytics,
  SiTailwindcss,
  SiRadixui,
  SiShadcnui,
  SiVercel,
  SiNextdotjs,
} from "@icons-pack/react-simple-icons";
import { cn } from "@/lib/utils";

// The orbit's tool constellation. Most logos come from simple-icons; MCP and
// Microsoft Clarity aren't in the set, so we hand-author small marks below.
//
// Color rule per node:
//   brand:true  → the simple-icon's official brand color (color="default")
//   color:"#…"  → an explicit brand color (for marks simple-icons renders mono)
//   neither     → currentColor (theme foreground) so mono brands stay visible
//                 on both warm-paper and dark.

type IconLike = React.ComponentType<{
  size?: number | string;
  color?: string;
  className?: string;
  title?: string;
}>;

export type BrandNode = {
  label: string;
  Comp: IconLike;
  brand?: boolean;
  color?: string;
};

// ── Hand-authored marks for brands missing from simple-icons ──────────────────

function McpGlyph({ size = 24, className }: { size?: number | string; className?: string }) {
  // a small node-graph: one node linking to two — "the protocol that connects"
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="5" cy="12" r="2.3" />
      <circle cx="18.5" cy="6" r="2.3" />
      <circle cx="18.5" cy="18" r="2.3" />
      <path d="M7.1 11 16.2 6.7" />
      <path d="M7.1 13 16.2 17.3" />
    </svg>
  );
}

function ClarityGlyph({ size = 24, className }: { size?: number | string; className?: string }) {
  // rising bars — Clarity is the analytics/insight signal
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <rect x="3" y="13" width="4.2" height="8" rx="1.2" />
      <rect x="9.9" y="8" width="4.2" height="13" rx="1.2" />
      <rect x="16.8" y="3" width="4.2" height="18" rx="1.2" />
    </svg>
  );
}

// ── The roster, grouped into three orbit rings (core → outer) ─────────────────

export const RINGS: BrandNode[][] = [
  // core — the engine + repo + the signal it reads
  [
    { label: "Claude Code", Comp: SiClaude, brand: true },
    { label: "MCP", Comp: McpGlyph },
    { label: "GitHub", Comp: SiGithub },
    { label: "PostHog", Comp: SiPosthog, color: "#1D4AFF" },
  ],
  // mid — the design + product signals
  [
    { label: "Figma", Comp: SiFigma, brand: true },
    { label: "Linear", Comp: SiLinear, brand: true },
    { label: "Google Analytics", Comp: SiGoogleanalytics, brand: true },
    { label: "Microsoft Clarity", Comp: ClarityGlyph, color: "#246FDB" },
  ],
  // outer — the design-system substrate + deploy surface (fades at the edge)
  [
    { label: "Tailwind CSS", Comp: SiTailwindcss, brand: true },
    { label: "Radix UI", Comp: SiRadixui },
    { label: "shadcn/ui", Comp: SiShadcnui },
    { label: "Vercel", Comp: SiVercel },
    { label: "Next.js", Comp: SiNextdotjs },
  ],
];

// ── A single orbiting node: the logo on a themed chip ─────────────────────────

export function BrandChip({ node, size }: { node: BrandNode; size: number }) {
  const { Comp, brand, color, label } = node;
  return (
    <div
      title={label}
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-xl border border-border/60 bg-card shadow-sm"
    >
      <span
        className={cn("flex items-center justify-center", !brand && !color && "text-foreground")}
        style={color ? { color } : undefined}
      >
        <Comp size={Math.round(size * 0.5)} {...(brand ? { color: "default" } : {})} />
      </span>
    </div>
  );
}
