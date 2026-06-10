import { HitlQueue } from "@/components/systemix/HitlQueue";

// Per-contract decision embed: pending cards + decision history scoped to one
// goal or hypothesis, with approve / reject / defer in place (every action
// writes through /api/queue back to the contract). Unscoped on the root
// contract it shows the whole queue.
export function PendingDecisions({ goal, hypothesis }: { goal?: string; hypothesis?: string }) {
  return <HitlQueue goal={goal} hypothesis={hypothesis} title="Decisions" className="w-full not-prose" />;
}
