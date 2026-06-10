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
      { source: "/dashboard",                          destination: "/config",                          permanent: false },
      { source: "/queue",                              destination: "/config",                          permanent: false },
      { source: "/projects/:path*",                    destination: "/config",                          permanent: false },
      { source: "/design-system",                      destination: "/contract",                        permanent: false },
      { source: "/design-system/decisions",            destination: "/contract/decisions",              permanent: false },
      { source: "/design-system/tokens",               destination: "/contract",                        permanent: false },
      { source: "/design-system/components",           destination: "/contract",                        permanent: false },
      { source: "/design-system/hypotheses",           destination: "/contract",                        permanent: false },
      { source: "/design-system/tokens/:slug",         destination: "/contract/tokens/:slug",           permanent: false },
      { source: "/design-system/components/:slug",     destination: "/contract/components/:slug",       permanent: false },
      { source: "/design-system/hypotheses/:slug",     destination: "/contract/hypotheses/:slug",       permanent: false },
      { source: "/docs/concepts/memory-layer",         destination: "/docs/concepts/evidence-layer",    permanent: true  },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(nextConfig);
