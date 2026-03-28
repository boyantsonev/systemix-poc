// AGENT-WRITTEN — docs.ts
// Updated by: figma-to-code, design-drift-detector, token-sync, doc-sync agents

export type DocStatus = "current" | "stale" | "drifted" | "draft";

export type DocMeta = {
  writtenBy: string;
  writtenAt: string;
  runId: string;
  figmaNodeId?: string;
  sourceFile?: string;
};

export type PropRow = {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  description: string;
};

export type TokenRow = {
  cssVar: string;
  property: string;
  currentValue: string;
  figmaVariable: string;
  status: "synced" | "drift" | "stale";
};

export type DriftRow = {
  file: string;
  line: number;
  hardcodedValue: string;
  suggestedToken: string;
  severity: "critical" | "high" | "medium" | "low";
  autoFixAvailable: boolean;
};

export type VariantDef = {
  name: string;
  value: string;
  description: string;
};

export type ComponentDoc = {
  type: "component";
  slug: string;
  name: string;
  status: DocStatus;
  category: string;
  summary: string;
  meta: DocMeta;
  props: PropRow[];
  tokens: TokenRow[];
  driftInstances: DriftRow[];
  variants: VariantDef[];
  usageExample: string;
  storyCount: number;
  coverageScore: number;
};

export type VariableGroupDoc = {
  type: "variable-group";
  slug: string;
  name: string;
  status: DocStatus;
  meta: DocMeta;
  description: string;
  variables: {
    name: string;
    value: string;
    figmaVariable: string;
    syncStatus: "synced" | "drift" | "stale" | "new";
    usedIn: string[];
    description?: string;
  }[];
};

export type Doc = ComponentDoc | VariableGroupDoc;

export const docs: Doc[] = [
  // ─── Component Docs ────────────────────────────────────────────────────────

  {
    type: "component",
    slug: "button",
    name: "Button",
    status: "current",
    category: "primitives",
    summary: "Primary interactive element. Supports multiple variants, sizes, and renders via Radix Slot for polymorphic usage.",
    meta: {
      writtenBy: "figma-to-code",
      writtenAt: "2026-02-25T14:02:12Z",
      runId: "run-003",
      figmaNodeId: "12:345",
      sourceFile: "src/components/ui/button.tsx",
    },
    props: [
      {
        name: "variant",
        type: '"default" | "destructive" | "outline" | "ghost"',
        default: '"default"',
        description: "Visual variant — maps to Figma component property",
      },
      {
        name: "size",
        type: '"sm" | "md" | "lg"',
        default: '"md"',
        description: "Controls padding and font-size via spacing tokens",
      },
      {
        name: "disabled",
        type: "boolean",
        default: "false",
        description: "Reduces opacity to 50%; prevents interaction",
      },
      {
        name: "children",
        type: "React.ReactNode",
        required: true,
        description: "Button label content",
      },
      {
        name: "onClick",
        type: "() => void",
        description: "Click handler",
      },
      {
        name: "asChild",
        type: "boolean",
        default: "false",
        description: "Renders as child via Radix Slot",
      },
    ],
    tokens: [
      {
        cssVar: "--color-primary",
        property: "background-color",
        currentValue: "#a855f7",
        figmaVariable: "semantic/color/primary",
        status: "synced",
      },
      {
        cssVar: "--color-primary-foreground",
        property: "color",
        currentValue: "#ffffff",
        figmaVariable: "semantic/color/primary-foreground",
        status: "synced",
      },
      {
        cssVar: "--radius-md",
        property: "border-radius",
        currentValue: "0.375rem",
        figmaVariable: "radius/md",
        status: "synced",
      },
      {
        cssVar: "--spacing-4",
        property: "padding-x",
        currentValue: "1rem",
        figmaVariable: "spacing/4",
        status: "synced",
      },
      {
        cssVar: "--spacing-2",
        property: "padding-y",
        currentValue: "0.5rem",
        figmaVariable: "spacing/2",
        status: "synced",
      },
    ],
    driftInstances: [],
    variants: [
      {
        name: "default",
        value: "default",
        description: "Primary action. Uses --color-primary background.",
      },
      {
        name: "destructive",
        value: "destructive",
        description: "Destructive actions. Uses --color-danger.",
      },
      {
        name: "outline",
        value: "outline",
        description: "Secondary action. Border only.",
      },
      {
        name: "ghost",
        value: "ghost",
        description: "Minimal — no border or background.",
      },
    ],
    usageExample: `import { Button } from "@/components/ui/button"

// Default
<Button>Save changes</Button>

// Destructive
<Button variant="destructive">Delete account</Button>

// Ghost with icon
<Button variant="ghost" size="sm">⚙ Settings</Button>`,
    storyCount: 8,
    coverageScore: 100,
  },

  {
    type: "component",
    slug: "badge",
    name: "Badge",
    status: "drifted",
    category: "primitives",
    summary: "Inline label for statuses, categories, and counts. Has a critical drift instance where --color-primary is hardcoded as a hex.",
    meta: {
      writtenBy: "design-drift-detector",
      writtenAt: "2026-02-26T08:34:12Z",
      runId: "run-002",
      figmaNodeId: "12:347",
      sourceFile: "src/components/ui/badge.tsx",
    },
    props: [
      {
        name: "variant",
        type: '"default" | "secondary" | "destructive" | "outline"',
        default: '"default"',
        description: "Visual style — each variant maps to a semantic color token",
      },
      {
        name: "children",
        type: "React.ReactNode",
        required: true,
        description: "Label text or icon",
      },
    ],
    tokens: [
      {
        cssVar: "--color-primary",
        property: "background-color",
        currentValue: "#a855f7",
        figmaVariable: "semantic/color/primary",
        status: "drift",
      },
      {
        cssVar: "--radius-full",
        property: "border-radius",
        currentValue: "9999px",
        figmaVariable: "radius/full",
        status: "synced",
      },
    ],
    driftInstances: [
      {
        file: "src/components/ui/badge.tsx",
        line: 18,
        hardcodedValue: "#a855f7",
        suggestedToken: "--color-primary",
        severity: "critical",
        autoFixAvailable: true,
      },
    ],
    variants: [
      {
        name: "default",
        value: "default",
        description: "Uses --color-primary. Currently has a critical drift instance.",
      },
      {
        name: "secondary",
        value: "secondary",
        description: "Uses --color-secondary.",
      },
      {
        name: "destructive",
        value: "destructive",
        description: "Uses --color-danger.",
      },
      {
        name: "outline",
        value: "outline",
        description: "Border only, transparent background.",
      },
    ],
    usageExample: `import { Badge } from "@/components/ui/badge"

<Badge>New</Badge>
<Badge variant="secondary">Beta</Badge>
<Badge variant="destructive">Deprecated</Badge>`,
    storyCount: 4,
    coverageScore: 72,
  },

  {
    type: "component",
    slug: "card",
    name: "Card",
    status: "current",
    category: "layout",
    summary: "Surface container with header, content, and footer sub-components. Uses semantic surface and border tokens.",
    meta: {
      writtenBy: "figma-to-code",
      writtenAt: "2026-02-24T10:15:00Z",
      runId: "run-008",
      figmaNodeId: "12:346",
      sourceFile: "src/components/ui/card.tsx",
    },
    props: [
      {
        name: "className",
        type: "string",
        description: "Additional Tailwind classes for customization",
      },
      {
        name: "children",
        type: "React.ReactNode",
        required: true,
        description: "Sub-components: CardHeader, CardContent, CardFooter",
      },
    ],
    tokens: [
      {
        cssVar: "--color-surface",
        property: "background-color",
        currentValue: "#111827",
        figmaVariable: "semantic/color/surface",
        status: "synced",
      },
      {
        cssVar: "--color-border",
        property: "border-color",
        currentValue: "rgba(255,255,255,0.1)",
        figmaVariable: "semantic/color/border",
        status: "stale",
      },
      {
        cssVar: "--radius-lg",
        property: "border-radius",
        currentValue: "0.5rem",
        figmaVariable: "radius/lg",
        status: "synced",
      },
    ],
    driftInstances: [],
    variants: [
      {
        name: "Card",
        value: "Card",
        description: "Root container",
      },
      {
        name: "CardHeader",
        value: "CardHeader",
        description: "Top section with padding",
      },
      {
        name: "CardContent",
        value: "CardContent",
        description: "Main content area",
      },
      {
        name: "CardFooter",
        value: "CardFooter",
        description: "Bottom section, flex row",
      },
    ],
    usageExample: `import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"

<Card>
  <CardHeader>
    <h3 className="text-sm font-semibold">Card Title</h3>
    <p className="text-xs text-muted-foreground">Optional subtitle</p>
  </CardHeader>
  <CardContent>
    <p className="text-sm">Main content goes here.</p>
  </CardContent>
  <CardFooter>
    <Button size="sm">Confirm</Button>
    <Button size="sm" variant="ghost">Cancel</Button>
  </CardFooter>
</Card>`,
    storyCount: 5,
    coverageScore: 95,
  },

  {
    type: "component",
    slug: "table",
    name: "Table",
    status: "drifted",
    category: "data",
    summary: "Data table with header and body sub-components. Two drift instances detected: one magic spacing value and one hardcoded color.",
    meta: {
      writtenBy: "design-drift-detector",
      writtenAt: "2026-02-26T08:34:12Z",
      runId: "run-002",
      sourceFile: "src/components/ui/table.tsx",
    },
    props: [
      {
        name: "children",
        type: "React.ReactNode",
        required: true,
        description: "Table sub-components: TableHeader, TableBody, TableHead, TableRow, TableCell",
      },
    ],
    tokens: [
      {
        cssVar: "--color-border",
        property: "row-divider",
        currentValue: "rgba(255,255,255,0.1)",
        figmaVariable: "semantic/color/border",
        status: "stale",
      },
      {
        cssVar: "--color-surface",
        property: "header-background",
        currentValue: "#111827",
        figmaVariable: "semantic/color/surface",
        status: "synced",
      },
    ],
    driftInstances: [
      {
        file: "src/components/ui/table.tsx",
        line: 42,
        hardcodedValue: "mt-[12px]",
        suggestedToken: "--spacing-3",
        severity: "medium",
        autoFixAvailable: true,
      },
      {
        file: "src/components/ui/table.tsx",
        line: 67,
        hardcodedValue: "#374151",
        suggestedToken: "--color-gray-700",
        severity: "critical",
        autoFixAvailable: true,
      },
    ],
    variants: [],
    usageExample: `import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Last updated</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Button</TableCell>
      <TableCell>Synced</TableCell>
      <TableCell>2026-02-25</TableCell>
    </TableRow>
  </TableBody>
</Table>`,
    storyCount: 3,
    coverageScore: 58,
  },

  {
    type: "component",
    slug: "progress",
    name: "Progress",
    status: "draft",
    category: "feedback",
    summary: "Linear progress bar. Draft — not yet published to Storybook. Token mappings are synced; awaiting design review.",
    meta: {
      writtenBy: "figma-to-code",
      writtenAt: "2026-02-25T16:23:44Z",
      runId: "run-003",
      figmaNodeId: "15:892",
      sourceFile: "src/components/ui/progress.tsx",
    },
    props: [
      {
        name: "value",
        type: "number",
        required: true,
        description: "Current progress 0–100",
      },
      {
        name: "max",
        type: "number",
        default: "100",
        description: "Maximum value, defaults to 100",
      },
      {
        name: "className",
        type: "string",
        description: "Additional Tailwind classes",
      },
    ],
    tokens: [
      {
        cssVar: "--color-primary",
        property: "fill-color",
        currentValue: "#a855f7",
        figmaVariable: "semantic/color/primary",
        status: "synced",
      },
      {
        cssVar: "--color-surface",
        property: "track-color",
        currentValue: "#111827",
        figmaVariable: "semantic/color/surface",
        status: "synced",
      },
      {
        cssVar: "--radius-full",
        property: "border-radius",
        currentValue: "9999px",
        figmaVariable: "radius/full",
        status: "synced",
      },
    ],
    driftInstances: [],
    variants: [],
    usageExample: `import { Progress } from "@/components/ui/progress"

<Progress value={72} />
<Progress value={35} className="h-2" />`,
    storyCount: 2,
    coverageScore: 88,
  },

  // ─── Variable Group Docs ────────────────────────────────────────────────────

  {
    type: "variable-group",
    slug: "color-semantic",
    name: "Color / Semantic",
    status: "drifted",
    meta: {
      writtenBy: "token-sync",
      writtenAt: "2026-02-26T09:47:23Z",
      runId: "run-001",
    },
    description:
      "Semantic color tokens map intent to primitive values. Components must use these — never primitive or hardcoded colors. 2 drift instances detected.",
    variables: [
      {
        name: "--color-primary",
        value: "#a855f7",
        figmaVariable: "semantic/color/primary",
        syncStatus: "synced",
        usedIn: ["Button", "Badge", "Progress", "Tabs"],
      },
      {
        name: "--color-secondary",
        value: "#14b8a6",
        figmaVariable: "semantic/color/secondary",
        syncStatus: "drift",
        usedIn: ["Button"],
        description: "Drift: Figma value #0d9488, code value #14b8a6",
      },
      {
        name: "--color-accent",
        value: "#f59e0b",
        figmaVariable: "semantic/color/accent",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--color-success",
        value: "#10b981",
        figmaVariable: "semantic/color/success",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--color-danger",
        value: "#ef4444",
        figmaVariable: "semantic/color/danger",
        syncStatus: "synced",
        usedIn: ["Button"],
      },
      {
        name: "--color-background",
        value: "#030712",
        figmaVariable: "semantic/color/background",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--color-surface",
        value: "#111827",
        figmaVariable: "semantic/color/surface",
        syncStatus: "synced",
        usedIn: ["Card", "Tabs", "Table", "Progress"],
      },
      {
        name: "--color-border",
        value: "rgba(255,255,255,0.1)",
        figmaVariable: "semantic/color/border",
        syncStatus: "stale",
        usedIn: ["Card", "Table"],
        description: "Last synced 14 days ago",
      },
    ],
  },

  {
    type: "variable-group",
    slug: "spacing",
    name: "Spacing",
    status: "current",
    meta: {
      writtenBy: "token-sync",
      writtenAt: "2026-02-26T09:47:23Z",
      runId: "run-001",
    },
    description:
      "Spacing tokens follow a 4pt grid. All components must use these for margin, padding, and gap — never arbitrary px values.",
    variables: [
      {
        name: "--spacing-1",
        value: "0.25rem",
        figmaVariable: "spacing/1",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--spacing-2",
        value: "0.5rem",
        figmaVariable: "spacing/2",
        syncStatus: "synced",
        usedIn: ["Button"],
      },
      {
        name: "--spacing-3",
        value: "0.75rem",
        figmaVariable: "spacing/3",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--spacing-4",
        value: "1rem",
        figmaVariable: "spacing/4",
        syncStatus: "synced",
        usedIn: ["Button", "Card"],
      },
      {
        name: "--spacing-5",
        value: "1.25rem",
        figmaVariable: "spacing/5",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--spacing-6",
        value: "1.5rem",
        figmaVariable: "spacing/6",
        syncStatus: "synced",
        usedIn: ["Card"],
      },
      {
        name: "--spacing-8",
        value: "2rem",
        figmaVariable: "spacing/8",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--spacing-16",
        value: "4rem",
        figmaVariable: "spacing/16",
        syncStatus: "new",
        usedIn: [],
        description: "Added in Figma — not yet in codebase",
      },
    ],
  },

  {
    type: "variable-group",
    slug: "typography",
    name: "Typography",
    status: "drifted",
    meta: {
      writtenBy: "token-sync",
      writtenAt: "2026-02-26T09:47:23Z",
      runId: "run-001",
    },
    description:
      "Type scale tokens. font-size-3xl has drifted: Figma value 2rem, code value 1.875rem. Check for hardcoded font sizes in components.",
    variables: [
      {
        name: "--font-size-xs",
        value: "0.75rem",
        figmaVariable: "type/size/xs",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--font-size-sm",
        value: "0.875rem",
        figmaVariable: "type/size/sm",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--font-size-base",
        value: "1rem",
        figmaVariable: "type/size/base",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--font-size-lg",
        value: "1.125rem",
        figmaVariable: "type/size/lg",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--font-size-xl",
        value: "1.25rem",
        figmaVariable: "type/size/xl",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--font-size-2xl",
        value: "1.5rem",
        figmaVariable: "type/size/2xl",
        syncStatus: "synced",
        usedIn: [],
      },
      {
        name: "--font-size-3xl",
        value: "1.875rem",
        figmaVariable: "type/size/3xl",
        syncStatus: "drift",
        usedIn: [],
        description: "Drift: Figma 2rem vs code 1.875rem",
      },
      {
        name: "--font-size-4xl",
        value: "2.25rem",
        figmaVariable: "type/size/4xl",
        syncStatus: "synced",
        usedIn: [],
      },
    ],
  },
];

export const docsMeta = {
  componentDocs: docs.filter((d) => d.type === "component").length,
  variableGroupDocs: docs.filter((d) => d.type === "variable-group").length,
  currentDocs: docs.filter((d) => d.status === "current").length,
  driftedDocs: docs.filter((d) => d.status === "drifted").length,
  draftDocs: docs.filter((d) => d.status === "draft").length,
  staleDocs: docs.filter((d) => d.status === "stale").length,
  lastUpdated: "2026-02-26T09:47:23Z",
};
