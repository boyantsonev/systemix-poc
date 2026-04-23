// AGENT-WRITTEN — components.ts
// Updated by: figma-to-code + design-drift-detector agents

export type ComponentStatus = "Synced" | "Drifted" | "Stale" | "New";
export type ComponentCategory = "primitives" | "forms" | "layout" | "feedback" | "navigation" | "data";

export type PropDef = {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
};

export type DriftInstance = {
  file: string;
  line: number;
  value: string;
  suggestedToken: string;
  severity: "critical" | "high" | "medium" | "low";
};

export type Component = {
  slug: string;
  name: string;
  category: ComponentCategory;
  status: ComponentStatus;
  description: string;
  figmaNodeId?: string;
  figmaFileKey?: string;
  githubPath: string;
  storybookId?: string;
  variants: string[];
  integrations: {
    figma: "synced" | "drifted" | "unlinked";
    storybook: "synced" | "drifted" | "missing";
    github: "clean" | "pr-open" | "pr-merged";
  };
  githubLastCommit?: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
  openPR?: {
    number: number;
    title: string;
    agentCreated: boolean;
    skill?: string;
  };
  props: PropDef[];
  tokenMappings: { token: string; property: string }[];
  driftInstances: DriftInstance[];
  codeSnippet: string;
  lastUpdated: string;
};

export const components: Component[] = [
  {
    slug: "button",
    name: "Button",
    category: "primitives",
    status: "Drifted",
    description: "Primary interactive element with multiple variants.",
    figmaNodeId: "12:345",
    figmaFileKey: "Xk9p2mDesignSystem",
    githubPath: "src/components/ui/button.tsx",
    storybookId: "components-button--primary",
    variants: ["default", "destructive", "outline", "ghost", "link"],
    integrations: {
      figma: "drifted",
      storybook: "synced",
      github: "pr-open",
    },
    githubLastCommit: {
      sha: "f3a9c1d",
      message: "fix(button): replace hardcoded color with --color-primary token",
      author: "ada-agent",
      date: "2026-03-09T10:14:00Z",
    },
    openPR: {
      number: 142,
      title: "fix(button): replace hardcoded #a855f7 with --color-primary token",
      agentCreated: true,
      skill: "/figma",
    },
    props: [
      { name: "variant", type: '"default" | "destructive" | "outline" | "ghost"', default: '"default"' },
      { name: "size", type: '"sm" | "md" | "lg"', default: '"md"' },
      { name: "disabled", type: "boolean", default: "false" },
      { name: "children", type: "React.ReactNode", required: true },
    ],
    tokenMappings: [
      { token: "--color-primary", property: "background-color" },
      { token: "--color-primary-foreground", property: "color" },
      { token: "--radius-md", property: "border-radius" },
      { token: "--spacing-4", property: "padding-x" },
    ],
    driftInstances: [
      {
        file: "src/components/ui/button.tsx",
        line: 24,
        value: "#a855f7",
        suggestedToken: "--color-primary",
        severity: "critical",
      },
    ],
    codeSnippet: `import { Button } from "@/components/ui/button"

export function Example() {
  return <Button variant="default">Click me</Button>
}`,
    lastUpdated: "2026-03-09T10:14:00Z",
  },
  {
    slug: "card",
    name: "Card",
    category: "layout",
    status: "Synced",
    description: "Surface container with optional header, content, and footer.",
    figmaNodeId: "12:346",
    figmaFileKey: "Xk9p2mDesignSystem",
    githubPath: "src/components/ui/card.tsx",
    storybookId: "components-card--default",
    variants: ["default", "elevated", "outlined"],
    integrations: {
      figma: "synced",
      storybook: "synced",
      github: "clean",
    },
    githubLastCommit: {
      sha: "d4f1b7e",
      message: "test(card): add interaction tests for CardHeader overflow",
      author: "sarah.chen",
      date: "2026-02-28T10:00:00Z",
    },
    props: [
      { name: "className", type: "string" },
      { name: "children", type: "React.ReactNode", required: true },
    ],
    tokenMappings: [
      { token: "--color-surface", property: "background-color" },
      { token: "--color-border", property: "border-color" },
      { token: "--radius-lg", property: "border-radius" },
    ],
    driftInstances: [],
    codeSnippet: `import { Card, CardHeader, CardContent } from "@/components/ui/card"

export function Example() {
  return (
    <Card>
      <CardHeader>Title</CardHeader>
      <CardContent>Content here</CardContent>
    </Card>
  )
}`,
    lastUpdated: "2026-02-28T10:00:00Z",
  },
  {
    slug: "badge",
    name: "Badge",
    category: "primitives",
    status: "Drifted",
    description: "Small status indicator with color variants.",
    figmaNodeId: "12:347",
    figmaFileKey: "Xk9p2mDesignSystem",
    githubPath: "src/components/ui/badge.tsx",
    storybookId: "components-badge--default",
    variants: ["default", "secondary", "destructive", "outline", "success"],
    integrations: {
      figma: "drifted",
      storybook: "synced",
      github: "pr-merged",
    },
    githubLastCommit: {
      sha: "d9e3f5c",
      message: "fix(badge): use --radius-full instead of hardcoded 9999px",
      author: "james.okafor",
      date: "2026-03-05T15:45:00Z",
    },
    props: [
      { name: "variant", type: '"default" | "secondary" | "destructive" | "outline"', default: '"default"' },
      { name: "children", type: "React.ReactNode", required: true },
    ],
    tokenMappings: [
      { token: "--color-primary", property: "background-color" },
      { token: "--radius-full", property: "border-radius" },
    ],
    driftInstances: [
      {
        file: "src/components/ui/badge.tsx",
        line: 18,
        value: "#a855f7",
        suggestedToken: "--color-primary",
        severity: "critical",
      },
    ],
    codeSnippet: `import { Badge } from "@/components/ui/badge"

export function Example() {
  return <Badge variant="default">New</Badge>
}`,
    lastUpdated: "2026-03-05T15:45:00Z",
  },
  {
    slug: "input",
    name: "Input",
    category: "forms",
    status: "Stale",
    description: "Text input field with label and error state support.",
    figmaNodeId: "14:120",
    figmaFileKey: "Xk9p2mDesignSystem",
    githubPath: "src/components/ui/input.tsx",
    storybookId: "components-input--default",
    variants: ["default", "error", "disabled", "with-icon"],
    integrations: {
      figma: "synced",
      storybook: "drifted",
      github: "clean",
    },
    githubLastCommit: {
      sha: "c2d8a5f",
      message: "fix(input): correct focus ring color to use --color-ring token",
      author: "marcus.lee",
      date: "2026-03-01T16:00:00Z",
    },
    props: [
      { name: "type", type: "string", default: '"text"' },
      { name: "placeholder", type: "string" },
      { name: "disabled", type: "boolean", default: "false" },
      { name: "error", type: "string" },
    ],
    tokenMappings: [
      { token: "--color-border", property: "border-color" },
      { token: "--color-background", property: "background-color" },
      { token: "--radius-md", property: "border-radius" },
    ],
    driftInstances: [],
    codeSnippet: `<input
  type="text"
  className="border border-border bg-background rounded-md px-3 py-2"
  placeholder="Enter value..."
/>`,
    lastUpdated: "2026-03-01T16:00:00Z",
  },
  {
    slug: "tabs",
    name: "Tabs",
    category: "navigation",
    status: "Synced",
    description: "Tabbed navigation for switching between content panels.",
    figmaNodeId: "21:800",
    figmaFileKey: "Xk9p2mDesignSystem",
    githubPath: "src/components/ui/tabs.tsx",
    storybookId: "components-tabs--default",
    variants: ["default", "pills", "underline"],
    integrations: {
      figma: "synced",
      storybook: "synced",
      github: "clean",
    },
    githubLastCommit: {
      sha: "e5f7a1b",
      message: "docs(select): add Select stories for default, disabled, and error states",
      author: "scout-agent",
      date: "2026-02-26T09:00:00Z",
    },
    props: [
      { name: "defaultValue", type: "string", required: true },
      { name: "children", type: "React.ReactNode", required: true },
    ],
    tokenMappings: [
      { token: "--color-surface", property: "background-color" },
      { token: "--color-primary", property: "active-indicator-color" },
    ],
    driftInstances: [],
    codeSnippet: `import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export function Example() {
  return (
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content</TabsContent>
    </Tabs>
  )
}`,
    lastUpdated: "2026-02-26T09:00:00Z",
  },
  {
    slug: "progress",
    name: "Progress",
    category: "feedback",
    status: "Synced",
    description: "Linear progress indicator for showing completion percentage.",
    figmaNodeId: "16:310",
    figmaFileKey: "Xk9p2mDesignSystem",
    githubPath: "src/components/ui/progress.tsx",
    storybookId: "components-progress--default",
    variants: ["default", "success", "warning", "danger"],
    integrations: {
      figma: "synced",
      storybook: "missing",
      github: "pr-merged",
    },
    githubLastCommit: {
      sha: "f2a8d6e",
      message: "refactor(progress): migrate inline styles to CSS custom properties",
      author: "sarah.chen",
      date: "2026-03-04T09:00:00Z",
    },
    props: [
      { name: "value", type: "number", required: true },
      { name: "max", type: "number", default: "100" },
      { name: "className", type: "string" },
    ],
    tokenMappings: [
      { token: "--color-primary", property: "fill-color" },
      { token: "--color-surface", property: "track-color" },
    ],
    driftInstances: [],
    codeSnippet: `import { Progress } from "@/components/ui/progress"

export function Example() {
  return <Progress value={72} />
}`,
    lastUpdated: "2026-03-04T09:00:00Z",
  },
  {
    slug: "tooltip",
    name: "Tooltip",
    category: "feedback",
    status: "Synced",
    description: "Contextual information overlay triggered on hover.",
    figmaNodeId: "17:400",
    figmaFileKey: "Xk9p2mDesignSystem",
    githubPath: "src/components/ui/tooltip.tsx",
    storybookId: "components-tooltip--default",
    variants: ["top", "right", "bottom", "left"],
    integrations: {
      figma: "synced",
      storybook: "synced",
      github: "clean",
    },
    githubLastCommit: {
      sha: "b9c4e7f",
      message: "feat(tooltip): add delay prop and keyboard trigger support",
      author: "james.okafor",
      date: "2026-03-02T14:30:00Z",
    },
    props: [
      { name: "content", type: "string", required: true },
      { name: "children", type: "React.ReactNode", required: true },
      { name: "side", type: '"top" | "right" | "bottom" | "left"', default: '"top"' },
    ],
    tokenMappings: [
      { token: "--color-surface", property: "background-color" },
      { token: "--color-border", property: "border-color" },
    ],
    driftInstances: [],
    codeSnippet: `import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function Example() {
  return (
    <Tooltip>
      <TooltipTrigger>Hover me</TooltipTrigger>
      <TooltipContent>Tooltip text</TooltipContent>
    </Tooltip>
  )
}`,
    lastUpdated: "2026-03-02T14:30:00Z",
  },
  {
    slug: "table",
    name: "Table",
    category: "data",
    status: "Drifted",
    description: "Data table with sortable columns and row selection.",
    figmaNodeId: "18:500",
    figmaFileKey: "Xk9p2mDesignSystem",
    githubPath: "src/components/ui/table.tsx",
    storybookId: "components-table--default",
    variants: ["default", "striped", "bordered"],
    integrations: {
      figma: "drifted",
      storybook: "drifted",
      github: "pr-open",
    },
    githubLastCommit: {
      sha: "b4e8f2a",
      message: "feat(table): add sortable columns with aria-sort support",
      author: "ada-agent",
      date: "2026-03-08T16:40:00Z",
    },
    openPR: {
      number: 141,
      title: "feat(table): add sortable columns and row selection",
      agentCreated: true,
      skill: "/figma",
    },
    props: [
      { name: "data", type: "unknown[]", required: true },
      { name: "columns", type: "ColumnDef[]", required: true },
    ],
    tokenMappings: [
      { token: "--color-border", property: "row-divider" },
      { token: "--color-surface", property: "header-background" },
    ],
    driftInstances: [
      {
        file: "src/components/ui/table.tsx",
        line: 42,
        value: "mt-[12px]",
        suggestedToken: "--spacing-3",
        severity: "medium",
      },
      {
        file: "src/components/ui/table.tsx",
        line: 67,
        value: "#374151",
        suggestedToken: "--color-gray-700",
        severity: "critical",
      },
    ],
    codeSnippet: `import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/table"

export function Example() {
  return (
    <Table>
      <TableHead><TableRow><TableCell>Name</TableCell></TableRow></TableHead>
      <TableBody><TableRow><TableCell>Value</TableCell></TableRow></TableBody>
    </Table>
  )
}`,
    lastUpdated: "2026-03-08T16:40:00Z",
  },
  {
    slug: "select",
    name: "Select",
    category: "forms",
    status: "Stale",
    description: "Dropdown selection with search, multi-select, and async loading.",
    figmaNodeId: "15:200",
    figmaFileKey: "Xk9p2mDesignSystem",
    githubPath: "src/components/ui/select.tsx",
    storybookId: "components-select--default",
    variants: ["default", "error", "disabled"],
    integrations: {
      figma: "synced",
      storybook: "missing",
      github: "pr-merged",
    },
    githubLastCommit: {
      sha: "e5f7a1b",
      message: "docs(select): add Select stories for default, disabled, and error states",
      author: "scout-agent",
      date: "2026-03-04T12:10:00Z",
    },
    props: [
      { name: "value", type: "string" },
      { name: "onValueChange", type: "(value: string) => void" },
      { name: "placeholder", type: "string", default: '"Select..."' },
      { name: "disabled", type: "boolean", default: "false" },
      { name: "children", type: "React.ReactNode", required: true },
    ],
    tokenMappings: [
      { token: "--color-border", property: "border-color" },
      { token: "--color-background", property: "background-color" },
      { token: "--radius-md", property: "border-radius" },
      { token: "--color-primary", property: "focus-ring-color" },
    ],
    driftInstances: [],
    codeSnippet: `import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function Example() {
  return (
    <Select>
      <SelectTrigger>
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
      </SelectContent>
    </Select>
  )
}`,
    lastUpdated: "2026-03-04T12:10:00Z",
  },
  {
    slug: "avatar",
    name: "Avatar",
    category: "primitives",
    status: "New",
    description: "User avatar with image, initials fallback, and presence indicator.",
    figmaNodeId: "19:600",
    figmaFileKey: "Xk9p2mDesignSystem",
    githubPath: "src/components/ui/avatar.tsx",
    variants: ["sm", "md", "lg", "with-image", "with-initials", "with-fallback"],
    integrations: {
      figma: "synced",
      storybook: "missing",
      github: "clean",
    },
    githubLastCommit: {
      sha: "a6b1c9d",
      message: "chore(tokens): add --spacing-18 and --spacing-22 to scale",
      author: "marcus.lee",
      date: "2026-03-01T10:00:00Z",
    },
    props: [
      { name: "src", type: "string" },
      { name: "alt", type: "string" },
      { name: "fallback", type: "string" },
      { name: "size", type: '"sm" | "md" | "lg"', default: '"md"' },
    ],
    tokenMappings: [
      { token: "--color-surface", property: "background-color" },
      { token: "--color-border", property: "border-color" },
      { token: "--radius-full", property: "border-radius" },
    ],
    driftInstances: [],
    codeSnippet: `import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Example() {
  return (
    <Avatar>
      <AvatarImage src="/avatar.jpg" alt="User" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  )
}`,
    lastUpdated: "2026-03-01T10:00:00Z",
  },
  {
    slug: "dialog",
    name: "Dialog",
    category: "feedback",
    status: "Synced",
    description: "Modal dialog with accessible focus management and backdrop.",
    figmaNodeId: "20:700",
    figmaFileKey: "Xk9p2mDesignSystem",
    githubPath: "src/components/ui/dialog.tsx",
    storybookId: "components-dialog--default",
    variants: ["default", "destructive", "form"],
    integrations: {
      figma: "synced",
      storybook: "synced",
      github: "pr-merged",
    },
    githubLastCommit: {
      sha: "c7d1a4b",
      message: "feat(dialog): add accessible Dialog with focus trap",
      author: "sarah.chen",
      date: "2026-03-07T11:30:00Z",
    },
    props: [
      { name: "open", type: "boolean" },
      { name: "onOpenChange", type: "(open: boolean) => void" },
      { name: "children", type: "React.ReactNode", required: true },
    ],
    tokenMappings: [
      { token: "--color-background", property: "background-color" },
      { token: "--color-border", property: "border-color" },
      { token: "--radius-xl", property: "border-radius" },
      { token: "--shadow-xl", property: "box-shadow" },
    ],
    driftInstances: [],
    codeSnippet: `import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function Example() {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <p>Dialog body content here.</p>
      </DialogContent>
    </Dialog>
  )
}`,
    lastUpdated: "2026-03-07T11:30:00Z",
  },
];

export const componentsMeta = {
  totalCount: components.length,
  syncedCount: components.filter(c => c.status === "Synced").length,
  driftedCount: components.filter(c => c.status === "Drifted").length,
  staleCount: components.filter(c => c.status === "Stale").length,
  newCount: components.filter(c => c.status === "New").length,
  lastUpdated: "2026-03-09T10:14:00Z",
};
