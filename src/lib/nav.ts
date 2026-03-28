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
    section: "Get Started",
    items: [
      { label: "Introduction", href: "/"         },
      { label: "How It Works", href: "/pipeline" },
      { label: "Skills",       href: "/skills"   },
      { label: "Setup Guide",  href: "/setup"    },
    ],
  },
  {
    section: "Dashboard",
    items: [
      { label: "Overview",     href: "/dashboard"            },
      { label: "Run Queue",    href: "/queue"                },
      { label: "Drift Report", href: "/drift"                },
      { label: "Tokens",       href: "/design-system/tokens" },
    ],
  },
  {
    section: "Reference",
    items: [
      { label: "Components", href: "/components" },
      { label: "Brands",     href: "/brands"     },
      { label: "Figma",      href: "/figma"      },
      { label: "GitHub",     href: "/github"     },
    ],
  },
];
