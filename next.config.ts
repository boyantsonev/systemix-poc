import path from "path";
import type { NextConfig } from "next";
import { createMDX } from "fumadocs-mdx/next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd().includes("/.claude/worktrees/")
      ? process.cwd().split("/.claude/")[0]
      : path.resolve("."),
  },
  async redirects() {
    return [
      { source: "/instance",                           destination: "/config",                          permanent: false },
      { source: "/graph",                              destination: "/config",                          permanent: false },
      { source: "/system",                             destination: "/contract",                        permanent: false },
      { source: "/system/:path*",                      destination: "/contract/:path*",                 permanent: false },
      { source: "/docs/concepts/memory-layer",         destination: "/docs/concepts/evidence-layer",    permanent: true  },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
