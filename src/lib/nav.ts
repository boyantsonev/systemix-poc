export type NavItem = {
  label: string;
  href: string;
};

export type NavSection = {
  section: string;
  items: NavItem[];
};

export const nav: NavSection[] = [
  {
    section: "",
    items: [
      { label: "← Home", href: "/" },
      { label: "Workflow", href: "/pipeline" },
    ],
  },
  {
    section: "Operate",
    items: [
      { label: "Run Queue", href: "/queue"                },
      { label: "Drift",     href: "/drift"                },
      { label: "Tokens",    href: "/design-system/tokens" },
    ],
  },
  {
    section: "Labs",
    items: [
      { label: "Token Guard", href: "/token-guard" },
    ],
  },
];
