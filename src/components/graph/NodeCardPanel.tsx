"use client";

import { useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { TYPE_COLOR_DARK, TYPE_COLOR_LIGHT, TYPE_LABEL, type NodeType } from "@/lib/data/system-graph";
import type { TopoNode, SourceCard } from "@/lib/state/instance-topology";
import { useCopySkill } from "@/components/skills/useCopySkill";

// The node inspector content (ADR-021/022). Rendered in the right push panel on
// /config when a graph node is selected. Polymorphic by node type: the `source`
// card carries the wired / "no signal" / manual / log-evidence state (the home
// for what was ADR-020's banner); every other type gets a typed body.
export function NodeCard({ node }: { node: TopoNode }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const col = (isDark ? TYPE_COLOR_DARK : TYPE_COLOR_LIGHT)[node.type];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5">
        <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: col.stroke }} />
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight text-foreground">{node.label}</p>
          {node.sub && <p className="mt-0.5 text-sm text-muted-foreground">{node.sub}</p>}
          <p className="mt-1 text-xs font-medium uppercase tracking-wide" style={{ color: col.stroke }}>
            {TYPE_LABEL[node.type]}
          </p>
        </div>
      </div>

      {node.type === "source" && node.card?.source ? (
        <SourceBody source={node.card.source} />
      ) : (
        <GenericBody node={node} />
      )}
    </div>
  );
}

const TYPE_DESC: Record<NodeType, string> = {
  source: "",
  skill: "A slash command in the validation loop — run it from Claude Code.",
  agent: "An agent in this instance's vocabulary; agents own steps in the loop.",
  artifact: "An experiment — a hypothesis rendered as its AI workflow, measured, then decided.",
  infra: "Instance plumbing — file-backed state the loop reads and writes.",
  concept: "A product surface this instance builds and tests.",
  tool: "Tooling the loop runs on.",
};

// Skill node: two ways to walk away with the skill. "copy skill" fetches the full
// SKILL.md body (via /api/skills/<name>) to reuse it elsewhere; "copy as reference"
// grabs a short snippet (invocation · one-liner · path) to attach to another
// project's context — the invocation string alone was never enough.
function SkillCopy({ node }: { node: TopoNode }) {
  const name = node.id.replace(/^skill:/, "");
  const { state: body, copy: copyBody } = useCopySkill(name);
  const [ref, setRef] = useState(false);

  const copyRef = useCallback(() => {
    const desc = NODE_DESC[node.id] ?? TYPE_DESC.skill;
    const snippet = `${node.label} — ${desc}\n.claude/skills/${name}/SKILL.md`;
    navigator.clipboard.writeText(snippet).then(() => {
      setRef(true);
      setTimeout(() => setRef(false), 1500);
    });
  }, [node.id, node.label, name]);

  const bodyLabel =
    body === "loading" ? "copying…" : body === "copied" ? "copied ✓" : body === "error" ? "not found" : "copy skill";

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-2.5">
      <div className="flex items-center gap-2">
        <code className="text-sm text-foreground">{node.label}</code>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            onClick={copyBody}
            disabled={body === "loading"}
            className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
          >
            {bodyLabel}
          </button>
          <button
            onClick={copyRef}
            className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {ref ? "copied ✓" : "copy as reference"}
          </button>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground/80">copy skill</span> grabs the full SKILL.md to reuse it;{" "}
        <span className="font-medium text-foreground/80">copy as reference</span> grabs a short snippet for another project&apos;s context.
      </p>
    </div>
  );
}

// Per-node descriptions that beat the generic type blurb for the loop's key nodes.
const NODE_DESC: Record<string, string> = {
  "agent:hermes": "Hermes synthesises evidence into decisions and queues HITL cards for review.",
  "infra:learnings":
    "The compounding memory ledger. Every closed experiment appends one cited learning; recall seeds the next experiment from it — all three doors read it.",
  "tool:cli":
    "The systemix CLI — one of three doors onto the loop. Creates experiments, reads the memory ledger (learnings --recent / --for), and runs the Ralph runner (systemix loop) that advances experiments to decision-ready.",
  "tool:mcp": "The systemix MCP — experiment_* tools so any agent can drive the loop. One of the three doors.",
};

function GenericBody({ node }: { node: TopoNode }) {
  const expSlug = node.type === "artifact" ? node.id.replace(/^experiment:/, "") : null;
  const desc = NODE_DESC[node.id] ?? TYPE_DESC[node.type];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
      {node.type === "skill" && <SkillCopy node={node} />}
      {expSlug && (
        <a
          href={`/experiments/${expSlug}`}
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          View experiment →
        </a>
      )}
      {node.id === "infra:learnings" && (
        <a
          href="/experiments/LEARNINGS"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          View the ledger →
        </a>
      )}
    </div>
  );
}

// Where "Set up this source →" points — the docs section on wiring a signal.
const SETUP_HREF = "/docs/labs/experiments#connect-posthog";
const SETUP_LINK = { href: SETUP_HREF, label: "Set up this source →" };

function SourceBody({ source }: { source: SourceCard }) {
  if (source.kind === "manual") {
    return (
      <Body
        tone="manual"
        title="Manual source"
        lines={[
          "No integration needed. Log evidence directly on the experiment: values, a screenshot, and an explanation.",
          "First-class — not a fallback. This is how non-API signals (e.g. LinkedIn engagement) feed the loop.",
        ]}
      />
    );
  }
  if (source.wired === true) {
    return (
      <Body
        tone="ok"
        title="Connected"
        lines={["Receiving evidence."]}
        cmd="systemix evidence check"
        cmdNote="verify capture + the last 24h of events"
      />
    );
  }
  if (source.wired === null) {
    return (
      <Body
        tone="muted"
        title="Wiring not verifiable here"
        lines={["This source's connection can't be confirmed from the app — check its own setup / credentials."]}
        link={SETUP_LINK}
      />
    );
  }
  return (
    <Body
      tone="warn"
      title="No signal connected"
      lines={[
        "This source is enabled but not wired, so experiments gather no live evidence from it. Experiments still run.",
      ]}
      cmd="/connect-signal"
      cmdNote="guided wiring → verify → flip it on"
      link={SETUP_LINK}
    />
  );
}

function Body({
  tone,
  title,
  lines,
  cmd,
  cmdNote,
  link,
}: {
  tone: "ok" | "warn" | "muted" | "manual";
  title: string;
  lines: string[];
  cmd?: string;
  cmdNote?: string;
  link?: { href: string; label: string };
}) {
  const dotColor = { ok: "var(--success)", warn: "var(--warning)", muted: "var(--muted-foreground)", manual: "var(--highlight)" }[tone];
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: dotColor }} />
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      {lines.map((l, i) => (
        <p key={i} className="text-sm leading-relaxed text-muted-foreground">
          {l}
        </p>
      ))}
      {cmd && (
        <div className="mt-1 rounded-lg border bg-muted/40 p-2.5">
          <code className=" text-sm text-foreground">{cmd}</code>
          {cmdNote && <p className="mt-1 text-xs text-muted-foreground">{cmdNote}</p>}
        </div>
      )}
      {link && (
        <a
          href={link.href}
          className="mt-0.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {link.label}
        </a>
      )}
    </div>
  );
}
