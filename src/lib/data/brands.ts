// AGENT-WRITTEN — brands.ts
// Updated by: component-themer agent

export type BrandStatus = "production" | "staging" | "in-progress" | "archived";

export type TokenOverride = {
  token: string;
  originalValue: string;
  brandValue: string;
  layer: "primitive" | "semantic" | "component";
};

export type Brand = {
  slug: string;
  name: string;
  status: BrandStatus;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  tokenCoverage: number;
  tokenOverrides: TokenOverride[];
  componentCoverage: { component: string; covered: boolean }[];
  themeFile: string;
  figmaFileKey?: string;
  description: string;
  lastUpdated: string;
};

export const brands: Brand[] = [
  {
    slug: "default",
    name: "Systemix Default",
    status: "production",
    primaryColor: "#a855f7",
    secondaryColor: "#14b8a6",
    accentColor: "#f59e0b",
    tokenCoverage: 100,
    tokenOverrides: [],
    componentCoverage: [
      { component: "Button", covered: true },
      { component: "Card", covered: true },
      { component: "Badge", covered: true },
      { component: "Input", covered: true },
      { component: "Tabs", covered: true },
    ],
    themeFile: "src/app/globals.css",
    description: "The default dark theme. Purple primary, teal secondary, amber accent.",
    lastUpdated: "2026-02-26T10:00:00Z",
  },
  {
    slug: "finova",
    name: "Finova",
    status: "production",
    primaryColor: "#2563eb",
    secondaryColor: "#0ea5e9",
    accentColor: "#f59e0b",
    tokenCoverage: 94,
    tokenOverrides: [
      { token: "--color-primary", originalValue: "#a855f7", brandValue: "#2563eb", layer: "semantic" },
      { token: "--color-secondary", originalValue: "#14b8a6", brandValue: "#0ea5e9", layer: "semantic" },
      { token: "--font-family-sans", originalValue: "Inter", brandValue: "Sora", layer: "primitive" },
      { token: "--radius-lg", originalValue: "0.5rem", brandValue: "0.25rem", layer: "primitive" },
      { token: "--color-surface", originalValue: "#111827", brandValue: "#0f172a", layer: "semantic" },
    ],
    componentCoverage: [
      { component: "Button", covered: true },
      { component: "Card", covered: true },
      { component: "Badge", covered: true },
      { component: "Input", covered: true },
      { component: "Tabs", covered: false },
    ],
    themeFile: "src/tokens/themes/finova.css",
    figmaFileKey: "finova123",
    description: "Financial services brand. Blue-dominant, conservative radius, Sora typeface.",
    lastUpdated: "2026-02-24T16:00:00Z",
  },
  {
    slug: "verdure",
    name: "Verdure",
    status: "staging",
    primaryColor: "#16a34a",
    secondaryColor: "#0d9488",
    accentColor: "#eab308",
    tokenCoverage: 78,
    tokenOverrides: [
      { token: "--color-primary", originalValue: "#a855f7", brandValue: "#16a34a", layer: "semantic" },
      { token: "--color-secondary", originalValue: "#14b8a6", brandValue: "#0d9488", layer: "semantic" },
      { token: "--color-accent", originalValue: "#f59e0b", brandValue: "#eab308", layer: "semantic" },
      { token: "--font-family-sans", originalValue: "Inter", brandValue: "DM Sans", layer: "primitive" },
      { token: "--radius-lg", originalValue: "0.5rem", brandValue: "1rem", layer: "primitive" },
      { token: "--color-background", originalValue: "#030712", brandValue: "#052e16", layer: "semantic" },
    ],
    componentCoverage: [
      { component: "Button", covered: true },
      { component: "Card", covered: true },
      { component: "Badge", covered: false },
      { component: "Input", covered: false },
      { component: "Tabs", covered: true },
    ],
    themeFile: "src/tokens/themes/verdure.css",
    description: "Sustainability brand. Green-dominant, rounded radius, nature-inspired palette.",
    lastUpdated: "2026-02-22T11:00:00Z",
  },
  {
    slug: "nexatech",
    name: "NexaTech",
    status: "in-progress",
    primaryColor: "#f43f5e",
    secondaryColor: "#8b5cf6",
    accentColor: "#06b6d4",
    tokenCoverage: 52,
    tokenOverrides: [
      { token: "--color-primary", originalValue: "#a855f7", brandValue: "#f43f5e", layer: "semantic" },
      { token: "--color-secondary", originalValue: "#14b8a6", brandValue: "#8b5cf6", layer: "semantic" },
      { token: "--radius-lg", originalValue: "0.5rem", brandValue: "0rem", layer: "primitive" },
    ],
    componentCoverage: [
      { component: "Button", covered: true },
      { component: "Card", covered: false },
      { component: "Badge", covered: false },
      { component: "Input", covered: false },
      { component: "Tabs", covered: false },
    ],
    themeFile: "src/tokens/themes/nexatech.css",
    description: "Tech startup brand. Vibrant rose/violet, sharp edges, in active development.",
    lastUpdated: "2026-02-20T09:00:00Z",
  },
];

export const brandsMeta = {
  systemReadinessScore: 91,
  totalBrands: brands.length,
  productionBrands: brands.filter(b => b.status === "production").length,
  avgTokenCoverage: Math.round(brands.reduce((sum, b) => sum + b.tokenCoverage, 0) / brands.length),
  lastUpdated: "2026-02-26T10:00:00Z",
};
