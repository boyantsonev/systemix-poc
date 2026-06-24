import { HitlQueue } from "@/components/systemix/HitlQueue";

// Per-contract decision embed: pending cards + decision history scoped to one
// goal or experiment — read-only. Contract pages display the state; decisions
// are taken on Home (each pending card links there). Unscoped on the root
// contract it shows the whole queue.
export function PendingDecisions({ goal, experiment }: { goal?: string; experiment?: string }) {
  return (
    <HitlQueue
      goal={goal}
      experiment={experiment}
      title="Decisions"
      className="w-full not-prose"
      readOnly
    />
  );
}
