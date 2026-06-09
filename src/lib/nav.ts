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
      { label: "← Dashboard", href: "/dashboard" },
    ],
  },
  {
    section: "Docs",
    items: [
      { label: "Introduction",   href: "/docs/introduction"  },
      { label: "Quick Install",  href: "/docs/quick-install" },
      { label: "Setup Guide",    href: "/docs/guides/setup"  },
      { label: "Skills",         href: "/docs/skills"        },
    ],
  },
  {
    section: "Reference",
    items: [
      { label: "Architecture", href: "/config" },
    ],
  },
];
