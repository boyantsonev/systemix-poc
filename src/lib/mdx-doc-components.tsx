// mdx-doc-components.tsx
// Registry of components available inside all product docs MDX files.
// Passed to <MDXRemote components={mdxDocComponents} /> in each page shell.
//
// Rules:
//  - Components with "use client" (WorkflowBeam) are safe here — MDXRemote RSC
//    handles the server/client boundary when components declare it themselves.
//  - Map HTML element names (code, pre, hr) to override default rendering.
//  - Keep this file as the single place to add new doc components.

import { StepFlow } from "@/components/docs/StepFlow";
import { MetricCard } from "@/components/docs/MetricCard";
import { SectionHeading } from "@/components/docs/SectionHeading";
import { StatusDot } from "@/components/docs/StatusDot";
import { Trait } from "@/components/docs/Trait";
import { WorkflowBeam } from "@/components/docs/WorkflowBeam";
import type { MDXComponents } from "mdx/types";

export const mdxDocComponents: MDXComponents = {
  // ─── Domain components ────────────────────────────────────────────────────
  StepFlow,
  MetricCard,
  SectionHeading,
  StatusDot,
  Trait,
  WorkflowBeam,

  // ─── HTML element overrides ───────────────────────────────────────────────
  h1: ({ children }) => (
    <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-4">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[1.15rem] font-bold tracking-tight mb-3 mt-10">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[1rem] font-semibold tracking-tight mb-2 mt-6">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="space-y-1.5 mb-6 text-[13px] text-muted-foreground list-none pl-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-2 mb-6 text-[13px] text-muted-foreground list-none pl-0 counter-reset-steps">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-[13px] text-muted-foreground leading-relaxed">
      {children}
    </li>
  ),
  code: ({ children }) => (
    <code className="font-mono text-[12px] bg-muted/60 px-1.5 py-0.5 rounded text-foreground">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-muted/20 border border-border/40 rounded-xl px-4 py-4 font-mono text-[12px] text-muted-foreground leading-relaxed overflow-x-auto mb-6">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-amber-500/40 pl-4 py-0.5 my-4 [&>p]:text-[13px] [&>p]:text-muted-foreground [&>p]:leading-relaxed [&>p]:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-border/40 my-10" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
};
