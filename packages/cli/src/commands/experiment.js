"use strict";

// `systemix experiment …` — the CLI door onto the loop (experiments/).
// Thin wrapper over src/lib/experiments.js; the MCP server's experiment_* tools
// and the .claude/skills are the other two doors over the same files.

const path = require("path");
const exp = require("../lib/experiments");
const layout = require("../lib/layout");

const EXPERIMENT_HELP = `
  systemix experiment — drive the validation loop (experiments/)

  Usage:
    systemix experiment new <id> [--hypothesis "…"] [--icp …] [--jtbd "…"] [--given "…"] [--conclusion "…"] [--section …] [--metric …] [--control "…"] [--variant "…"]
    systemix experiment list [--status running|complete]
    systemix experiment measure <id> --event <posthog-event> [--metric <metric>]
    systemix experiment close <id> --result "…" --decision promote|iterate|kill|no-action [--confidence 0.0-1.0] [--learning "…"]
    systemix experiment learnings [--recent <n>] [--for <id>]   Loop memory — full, or scoped recall
    systemix experiment used <prior-id> --by <id>               Backlink: mark a prior learning Used by <id>
    systemix experiment audit            Running experiments + whether they're measured
`;

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) flags[key] = true;
      else { flags[key] = next; i++; }
    } else {
      positional.push(a);
    }
  }
  return { flags, positional };
}

const str = (v) => (typeof v === "string" ? v : undefined);

async function experiment(args = [], opts = {}) {
  const root = opts.projectRoot ?? process.cwd();
  const [sub, ...rest] = args;
  const { flags, positional } = parseFlags(rest);

  switch (sub) {
    case "new": {
      const id = positional[0] ?? str(flags.id);
      const file = exp.createExperiment(root, id, {
        hypothesis: str(flags.hypothesis),
        icp: str(flags.icp),
        jtbd: str(flags.jtbd),
        section: str(flags.section),
        metric: str(flags.metric),
        control: str(flags.control),
        variant_b: str(flags.variant),
        given: str(flags.given),
        conclusion: str(flags.conclusion),
      });
      console.log(`  ✓  created ${path.relative(root, file) || file} (status: running)`);
      console.log(`     next: build the variant, then \`systemix experiment measure ${id} --event <name>\``);
      break;
    }

    case "list":
    case "ls": {
      const items = exp.listExperiments(root, { status: str(flags.status) });
      if (!items.length) {
        console.log("  (no experiments yet — `systemix experiment new <id>`)");
        break;
      }
      for (const e of items) {
        console.log(`  ${String(e.status).padEnd(9)} ${e.id}${e.decision ? `  → ${e.decision}` : ""}`);
      }
      break;
    }

    case "measure": {
      const id = positional[0] ?? str(flags.id);
      const r = exp.setMeasurement(root, id, { event: str(flags.event), metric: str(flags.metric) });
      console.log(`  ✓  ${id}: posthog-event=${r["posthog-event"] ?? "—"} metric=${r.metric ?? "—"}`);
      break;
    }

    case "close": {
      const id = positional[0] ?? str(flags.id);
      const r = exp.closeExperiment(root, id, {
        result: str(flags.result),
        decision: str(flags.decision),
        confidence: flags.confidence != null && flags.confidence !== true ? Number(flags.confidence) : undefined,
        learning: str(flags.learning),
      });
      console.log(`  ✓  ${id} closed (decision: ${str(flags.decision) ?? "—"})`);
      console.log(`     learning appended → ${r.learningsFile}`);
      console.log(`     decision card queued → ${layout.rel.queue}`);
      break;
    }

    case "learnings": {
      const recent = flags.recent != null && flags.recent !== true ? Number(flags.recent) : undefined;
      const text = exp.readLearnings(root, { recent, forId: str(flags.for) });
      console.log(text ?? "  (no LEARNINGS.md yet — close an experiment to write the first learning)");
      break;
    }

    case "used": {
      const priorId = positional[0] ?? str(flags.id);
      const byId = str(flags.by);
      if (!priorId || !byId) {
        console.log("  usage: systemix experiment used <prior-id> --by <this-id>");
        process.exitCode = 1;
        break;
      }
      const r = exp.markLearningUsed(root, priorId, byId);
      console.log(
        r.updated
          ? `  ✓  [${priorId}] now Used by: ${r.usedBy.map((x) => `[${x}]`).join(", ")}`
          : `  (no learning citing [${priorId}] found in ${layout.rel.learnings})`
      );
      break;
    }

    case "audit": {
      const running = exp.listExperiments(root, { status: "running" });
      if (!running.length) {
        console.log("  (no running experiments)");
        break;
      }
      console.log(`  ${running.length} running:`);
      for (const e of running) {
        const measured = e["posthog-event"] ? "measured" : "NOT measured — run /measure";
        console.log(`  - ${e.id}  [${measured}]`);
      }
      break;
    }

    case undefined:
      console.log(EXPERIMENT_HELP);
      break;

    default:
      console.log(`\n  Unknown experiment subcommand: ${sub}`);
      console.log(EXPERIMENT_HELP);
      process.exitCode = 1;
  }
}

module.exports = { experiment, EXPERIMENT_HELP };
