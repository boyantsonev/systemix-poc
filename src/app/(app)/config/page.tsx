import { loadInstanceConfig, signalStatus } from "@/lib/state/instance-config";
import { buildInstanceTopology } from "@/lib/state/instance-topology";
import { loadRuntimeState } from "@/lib/state/runtime-state";
import { ConfigView } from "./ConfigView";

// Reads the local instance config at request time and writes it back on save.
// Chrome (sidebar + header) is owned by the (app) shell layout.
export const dynamic = "force-dynamic";

export default function ConfigPage() {
  const cfg = loadInstanceConfig();
  const runtime = loadRuntimeState();
  // The live instance loop as graph data (ADR-021) — slice 1 seeds source nodes.
  const topology = buildInstanceTopology(cfg);
  // Signals enabled in config but not wired (e.g. posthog with no key).
  const unwiredSignals = signalStatus(cfg)
    .filter((s) => s.enabled && s.wired === false)
    .map((s) => s.id);

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
            npx systemix init
          </code>
        </div>
      </div>
    );
  }

  return <ConfigView cfg={cfg} runtime={runtime} unwiredSignals={unwiredSignals} topology={topology} />;
}
