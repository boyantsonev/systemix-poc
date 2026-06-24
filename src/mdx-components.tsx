import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { GoalsIndex } from "@/components/contract/GoalsIndex";
import { RecordsIndex } from "@/components/contract/RecordsIndex";
import { NowStrip } from "@/components/contract/NowStrip";
import { PendingDecisions } from "@/components/contract/PendingDecisions";
import { AutonomyClause } from "@/components/contract/AutonomyClause";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    GoalsIndex,
    RecordsIndex,
    NowStrip,
    PendingDecisions,
    AutonomyClause,
    ...components,
  } as MDXComponents;
}
