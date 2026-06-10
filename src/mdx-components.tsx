import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { StepFlow } from "@/components/docs/StepFlow";
import { MetricCard } from "@/components/docs/MetricCard";
import { SectionHeading } from "@/components/docs/SectionHeading";
import { StatusDot } from "@/components/docs/StatusDot";
import { Trait } from "@/components/docs/Trait";
import { WorkflowBeam } from "@/components/docs/WorkflowBeam";
import { SkillsBrowser } from "@/components/docs/SkillsBrowser";
import { ArchitectureGraph } from "@/components/docs/ArchitectureGraph";
import { DocsRoleChooser } from "@/components/docs/DocsRoleChooser";
import { GoalsIndex } from "@/components/contract/GoalsIndex";
import { GoalHypotheses } from "@/components/contract/GoalHypotheses";
import { RecordsIndex } from "@/components/contract/RecordsIndex";
import { NowStrip } from "@/components/contract/NowStrip";
import { PendingDecisions } from "@/components/contract/PendingDecisions";

// Component registry for all docs MDX. Fumadocs defaults (Cards, Code blocks,
// headings, etc.) merged with the Systemix domain components used inside the
// content/docs/*.mdx files.
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    StepFlow,
    MetricCard,
    SectionHeading,
    StatusDot,
    Trait,
    WorkflowBeam,
    SkillsBrowser,
    ArchitectureGraph,
    DocsRoleChooser,
    GoalsIndex,
    GoalHypotheses,
    RecordsIndex,
    NowStrip,
    PendingDecisions,
    ...components,
  };
}
