import { loadInstanceConfig, signalStatus } from "@/lib/state/instance-config";
import { buildInstanceTopology } from "@/lib/state/instance-topology";
import { loadRuntimeState } from "@/lib/state/runtime-state";
import { loadLearnings } from "@/lib/contract/learnings";
import { getComparableTrend } from "@/lib/state/drift-history";
import { listSkills } from "@/lib/skill-map";
import { ConfigView } from "./ConfigView";

// Reads the local instance config at request time and writes it back on save.
// Chrome (sidebar + header) is owned by the (app) shell layout.
export const dynamic = "force-dynamic";

export default function ConfigPage() {
  // the deployed site holds no instance state: Home is the local hub (G-003 E3, DSC-22 D2)
  if (process.env.VERCEL) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="mb-2 text-sm font-medium text-foreground">Home runs on your machine</p>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            The decision queue, runs and settings read your repo, so they are never served from this site.
            Open them locally, in the repo that holds your design system:
          </p>
          <code className="inline-block rounded-lg border px-3 py-1.5 font-mono text-sm text-foreground">
            npx @getsystemix/cli app
          </code>
        </div>
      </div>
    );
  }
  const cfg = loadInstanceConfig();
  const runtime = loadRuntimeState();
  // The live instance loop as graph data (ADR-021) — slice 1 seeds source nodes.
  const topology = buildInstanceTopology(cfg);
  const signals = signalStatus(cfg);
  const learnings = loadLearnings();
  // scores from different formulas are not comparable: Home trends only the newest same-formula run
  const driftTrend = getComparableTrend(30);
  const skills = listSkills();
  // Skill runs spawn processes — a local-app capability, not a Vercel one.
  const runsEnabled = !process.env.VERCEL;

  if (!cfg) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="mb-2 text-sm font-medium text-foreground">No instance configured</p>
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            This repo has no <code className="font-mono text-foreground">systemix.config.yaml</code>. Run the
            setup wizard to scaffold a Systemix instance — then Home shows the live instance: the topology
            graph, the runtime feed, and the decision queue.
          </p>
          <code className="inline-block rounded-lg border px-3 py-1.5 font-mono text-sm text-foreground">
            npx @getsystemix/cli init
          </code>
        </div>
      </div>
    );
  }

  return (
    <ConfigView
      cfg={cfg}
      runtime={runtime}
      signals={signals}
      topology={topology}
      skills={skills}
      runsEnabled={runsEnabled}
      learnings={learnings}
      driftTrend={driftTrend}
    />
  );
}
