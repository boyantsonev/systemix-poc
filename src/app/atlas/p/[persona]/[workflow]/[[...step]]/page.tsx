import { notFound } from "next/navigation";
import { atlasCatalog } from "@/lib/data/atlas-catalog";
import { PrototypeView } from "@/components/atlas/PrototypeView";
import { PERSONAS, type Persona } from "@/lib/ports/atlas";

export default async function PrototypePage({
  params,
}: {
  params: Promise<{ persona: string; workflow: string; step?: string[] }>;
}) {
  const { persona, workflow: workflowId, step } = await params;

  const workflow = atlasCatalog.byId(workflowId);
  if (!workflow || !PERSONAS.includes(persona as Persona)) notFound();

  const activeStep = step?.[0] ?? workflow.steps[0]?.id ?? "";

  return <PrototypeView persona={persona as Persona} workflow={workflow} activeStep={activeStep} />;
}
