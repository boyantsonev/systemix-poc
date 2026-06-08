import path from "path";
import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(".") },
  async redirects() {
    return [
      { source: "/contract",                           destination: "/design-system",                   permanent: false },
      { source: "/contract/tokens",                    destination: "/design-system",                   permanent: false },
      { source: "/contract/components",                destination: "/design-system",                   permanent: false },
      { source: "/contract/:slug",                     destination: "/design-system",                   permanent: false },
      { source: "/docs/concepts/memory-layer",         destination: "/docs/concepts/evidence-layer",    permanent: true  },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
