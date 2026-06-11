import { HitlQueue } from "@/components/systemix/HitlQueue";

// Per-contract decision embed: pending cards + decision history scoped to one
// goal or hypothesis — read-only. Contract pages display the state; decisions
// are taken on Home (each pending card links there). Unscoped on the root
// contract it shows the whole queue.
export function PendingDecisions({ goal, hypothesis }: { goal?: string; hypothesis?: string }) {
  return (
    <HitlQueue
      goal={goal}
      hypothesis={hypothesis}
      title="Decisions"
      className="w-full not-prose"
      readOnly
    />
  );
}
