import type { Metadata } from "next";
import { AtlasCanvas } from "@/components/atlas/AtlasCanvas";

export const metadata: Metadata = {
  title: "Workflow Atlas — Systemix",
  description: "Systemix's own agentic workflows: the loop, design-system sync, and deploys, mapped per persona.",
};

export default function AtlasPage() {
  return <AtlasCanvas />;
}
