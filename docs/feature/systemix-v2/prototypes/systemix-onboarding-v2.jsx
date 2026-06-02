import { useState, useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { X, Copy, Check, Settings, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, Activity, Layers, Radio, Sliders, RefreshCw, ExternalLink, FileText, Cpu, Server, Wrench, Box, Eye, Code as CodeIcon } from "lucide-react";

/* ============================================================
   SYSTEMIX — onboarding graph + your-instance configurator
   ============================================================ */

const TYPE = {
  source:   { label: "Source",         color: "#3c3e50", icon: Eye,      desc: "Where the agent that reads contracts lives." },
  skill:    { label: "Skill",          color: "#7c3aed", icon: CodeIcon, desc: "A markdown prompt file installed at .claude/skills/ (project-scoped)." },
  agent:    { label: "Agent",          color: "#d97706", icon: Cpu,      desc: "Autonomous operator. Reads, decides, writes." },
  artifact: { label: "Artifact",       color: "#2563eb", icon: FileText, desc: "Produced output that lives in your repo or filesystem." },
  infra:    { label: "Infrastructure", color: "#059669", icon: Server,   desc: "Runtime layer the system depends on." },
  tool:     { label: "Tool",           color: "#0891b2", icon: Wrench,   desc: "External service the system reads signals from." },
  ui:       { label: "UI",             color: "#e11d48", icon: Layers,   desc: "Surface where humans interact with the loop." },
};

const SURFACES = ["landing", "onboarding", "features", "design-system", "gtm"];
const SIGNALS = ["posthog", "vercel", "social", "figma"];

const SURFACE_LABEL = { landing: "Landing", onboarding: "Onboarding", features: "Features", "design-system": "Design system", gtm: "GTM / channels" };
const SIGNAL_LABEL = { posthog: "PostHog", vercel: "Vercel", social: "Social", figma: "Figma" };

const AUTONOMY = [
  { id: "conservative", label: "Conservative", desc: "Every Hermes decision → HITL queue. Hermes never writes autonomously.", thresholds: "auto-write off · all decisions queued" },
  { id: "balanced",     label: "Balanced",     desc: "High-confidence (>0.85) writes directly. Medium/low always queue a card.", thresholds: "high ≥ 0.85 auto-write · else HITL" },
  { id: "progressive",  label: "Progressive",  desc: "Hermes writes unless confidence is low (<0.55). Queue is shorter, autonomy higher.", thresholds: "high ≥ 0.85 auto · med ≥ 0.55 auto+card · low queue" },
];

const SI_MODES = [
  { id: "off",     label: "Off",                  desc: "Fixed thresholds. Hermes never adjusts itself." },
  { id: "audit",   label: "Audit only",           desc: "Hermes reviews its own hit-rate, logs to meta-contract, never changes anything." },
  { id: "tuning",  label: "Self-tuning",          desc: "Hermes proposes threshold changes as HITL cards. You approve." },
  { id: "auto",    label: "Autonomous in bounds", desc: "Hermes adjusts thresholds within preset limits. Every change logged." },
];

/* ============================================================
   NODES — each carries type-specific content for the panel
   ============================================================ */

const NODES = [
  // ─── SOURCES ────────────────────────────────────────────────
  {
    id: "claude-code", name: "Claude Code", type: "source",
    desc: "Anthropic's CLI agent. The primary builder-facing client that reads Systemix contracts before shipping.",
    role: "Claude Code is the consumer. When you ask it to write copy or change a component, it queries the MCP server for the relevant contract first — so it knows what's already been tested and what was rejected.",
    setup: { title: "Connect via MCP", code: "# in your project root\nnpx systemix-mcp --project-root .\n\n# claude code picks it up automatically" },
    meta: [
      { label: "Access pattern", value: "Read-only via MCP" },
      { label: "Reads", value: "Contract frontmatter, prose body" },
    ],
  },
  {
    id: "cursor", name: "Cursor", type: "source",
    desc: "MCP-compatible editor. Same access surface as Claude Code.",
    role: "Cursor accesses Systemix through the same MCP server. Any agent compatible with MCP can read the contracts.",
    setup: { title: "Add to Cursor MCP config", code: '{\n  "mcpServers": {\n    "systemix": {\n      "command": "npx",\n      "args": ["systemix-mcp", "--project-root", "."]\n    }\n  }\n}' },
  },

  // ─── TOOLS ──────────────────────────────────────────────────
  {
    id: "posthog", name: "PostHog", type: "tool", signals: ["posthog"],
    desc: "Where your experiment data already lives. Systemix reads it — nothing migrates, nothing new to instrument beyond what you'd already do.",
    role: "PostHog is the source of truth for conversion data. When an experiment reaches significance, Hermes pulls the result and writes it into the contract. Without PostHog, the loop has no quantitative signal to close on.",
    setup: { title: "Required env vars", code: "POSTHOG_API_KEY=phc_xxx\nPOSTHOG_PROJECT_ID=12345\nPOSTHOG_HOST=https://eu.posthog.com" },
    meta: [
      { label: "Provides", value: "Conversion rates, funnel events, A/B variant results" },
      { label: "Polled by", value: "systemix watch (every 5 min default)" },
    ],
  },
  {
    id: "vercel", name: "Vercel", type: "tool", signals: ["vercel"],
    desc: "Deploy target. The post-deploy hook tells Hermes a new variant is live and ready to measure.",
    role: "Vercel is optional but useful — it gives Hermes the deployment timestamp so it knows when to start the measurement window for a new variant. Without it, you tell systemix manually when a variant ships.",
    setup: { title: "Add deploy hook", code: "# vercel.json\n{\n  \"git\": {\n    \"deploymentEnabled\": { \"main\": true }\n  }\n}\n\n# point post-deploy to:\n# https://your-domain/api/systemix/deploy-hook" },
  },
  {
    id: "social", name: "Social signals", type: "tool", signals: ["social"],
    desc: "Twitter / LinkedIn / Reddit referrers attributed to specific deploys. Tells you which channel converted, not just that conversion happened.",
    role: "Social attribution is layered on top of PostHog session data. Hermes uses it to refine ICP fit — e.g. 'variant B wins on builder-persona traffic from Twitter and HN, but loses on LinkedIn traffic.'",
  },
  {
    id: "figma", name: "Figma", type: "tool", signals: ["figma"], surfaces: ["design-system"],
    desc: "Optional. Drift between Figma and code is detected before a test starts — so you measure what you designed, not a drifted variant.",
    role: "Figma is read-only for Systemix. The /drift-report skill compares Figma variables against the code tokens and surfaces mismatches as HITL cards. Resolve them before running any visual experiment.",
    setup: { title: "Figma MCP", code: "# install the Figma Console MCP\nnpx figma-console-mcp --token $FIGMA_PAT" },
  },
  {
    id: "storybook", name: "Storybook", type: "tool", surfaces: ["design-system"],
    desc: "Shows what exists. Systemix shows what worked. Sits alongside.",
    role: "Storybook documents the inventory of components. Systemix layers the evidence on top: which variant won, when, in what production conditions. No replacement — complementary.",
  },

  // ─── AGENTS ─────────────────────────────────────────────────
  {
    id: "hermes", name: "Hermes", type: "agent",
    desc: "Local LLM via Ollama. Reads your contracts and PostHog signals, synthesizes a decision card with a recommendation, confidence score, and rationale. No API key, air-gapped.",
    role: "Hermes is the brain of the loop. It is NOT a chatbot — you don't talk to it. It runs in the background under `systemix watch`, polls PostHog, reads contract history, and queues a HITL card whenever an experiment reaches significance. Every recommendation it makes is grounded in the contract's prior-art so it never re-proposes a rejected direction.",
    runtime: { title: "Start Hermes", code: "# install ollama + pull a model\nbrew install ollama\nollama pull hermes3\n\n# start the watcher (runs hermes continuously)\nnpx systemix watch" },
    meta: [
      { label: "Default model", value: "hermes3 via Ollama" },
      { label: "Endpoint", value: "http://localhost:11434" },
      { label: "Confidence routing", value: "High → auto-write · Medium → write + card · Low → card only" },
      { label: "Trust tier at init", value: "0 — Ghost Mode" },
    ],
  },
  {
    id: "orchestrator", name: "Orchestrator", type: "agent",
    desc: "Reads systemix.config, routes signals to Hermes, applies your confidence thresholds, dispatches the right skills. The Orchestrator is the only thing that holds your customization.",
    role: "The Orchestrator is what makes your Systemix yours. It reads systemix.config.yaml at boot — which surfaces you validate, which signals are enabled, what autonomy mode Hermes runs in, whether self-improvement is on. It dispatches skills based on these and routes Hermes's outputs to either the contract directly (auto-write) or to the HITL queue.",
    runtime: { title: "Inspect config", code: "# show your active configuration\nnpx systemix config show\n\n# re-run the onboarding wizard\nnpx systemix init --reconfigure" },
    meta: [
      { label: "Reads", value: "systemix.config.yaml" },
      { label: "Writes", value: "Routing decisions, Hermes thresholds" },
      { label: "Trust tier at init", value: "0 — never executes autonomously without config" },
    ],
  },

  // ─── SKILLS ─────────────────────────────────────────────────
  {
    id: "s-hypothesis", name: "/hypothesis", type: "skill",
    surfaces: ["landing","onboarding","features","gtm"],
    desc: "Define what you're testing. Creates an MDX contract with the metric, baseline, variants, and prose rationale. Step 1 of the validation loop.",
    role: "First skill of every experiment. Generates the contract file before any code changes. Reads existing contracts to prevent ID collisions and to seed prior-art so you don't re-test rejected directions.",
    install: "npx systemix workflow add hypothesis-validation",
    skillContent: `---
name: hypothesis
description: Create an MDX hypothesis contract for an experiment about to run
trigger: [/hypothesis, "new experiment", "test hypothesis"]
---

# /hypothesis

Create a new hypothesis contract in \`contract/hypotheses/\`.

## Inputs to ask the user
- Hypothesis statement (one sentence — what you're claiming)
- ICP segment (who you're testing on)
- Target metric + current baseline
- Variant proposals (control + 1-3 variants)
- Success criteria (lift threshold + min sessions)

## Steps
1. Read \`contract/hypotheses/\` to avoid duplicate IDs and surface prior-art
2. Slugify the hypothesis → contract filename
3. Write MDX with frontmatter: id, hypothesis, icp, status: running, variants, success_criteria
4. Write prose body with rationale + a "Rejected directions" section pulled from prior contracts
5. Commit with message: "hypothesis: <slug> — running"

## Output
A new file at \`contract/hypotheses/<slug>.mdx\`, status \`running\`,
ready for /measure and /experiment to wire up.`,
  },
  {
    id: "s-measure", name: "/measure", type: "skill",
    surfaces: ["landing","onboarding","features"], signals: ["posthog"],
    desc: "Instrument a component with PostHog capture calls. Reads the contract for what to measure. Shows the diff before writing. Step 2.",
    role: "Turns the contract's success criteria into actual PostHog events. Will not proceed without a hypothesis contract — fails loudly if you skip step 1.",
    install: "npx systemix workflow add hypothesis-validation",
    skillContent: `---
name: measure
description: Instrument a component with PostHog capture for an active hypothesis
trigger: [/measure, "add posthog tracking", "instrument component"]
---

# /measure

Instrument the component referenced by a hypothesis contract.

## Steps
1. Read the contract — identify metric + funnel events
2. Locate the component file
3. Generate the capture() calls — event names match the contract's metric IDs
4. Show the diff
5. Wait for user confirmation
6. Write changes
7. Update the contract: set \`instrumented: true\`

## Refuses to run if
- No matching hypothesis contract exists (run /hypothesis first)
- Contract is in status \`evidence-backed\` or \`killed\` (experiment is over)`,
  },
  {
    id: "s-experiment", name: "/experiment", type: "skill",
    surfaces: ["landing","onboarding","features"], signals: ["posthog"],
    desc: "Wire a PostHog feature flag into the component to serve the variant. Updates the contract with experiment configuration. Step 3.",
    role: "Connects the variant rollout to PostHog. Writes the experiment ID into the contract so /evidence knows which experiment to read results from.",
    install: "npx systemix workflow add hypothesis-validation",
    skillContent: `---
name: experiment
description: Wire a PostHog feature flag to serve the variant for an active hypothesis
trigger: [/experiment, "set up feature flag", "ship the variant"]
---

# /experiment

Connect a hypothesis variant to a PostHog feature flag.

## Steps
1. Read the contract — get variant IDs and ICP
2. Create the feature flag in PostHog (idempotent — reuses existing)
3. Wrap the variant in posthog.getFeatureFlag(<key>) check
4. Update the contract with the experiment key + flag ID
5. Set contract status: \`experiment-live\`

## Important
- The flag rollout % is set in PostHog UI, NOT here. /experiment only wires the code.
- Once live, /evidence will start polling for results.`,
  },
  {
    id: "s-evidence", name: "/evidence", type: "skill", signals: ["posthog"],
    desc: "Pull PostHog experiment results and write the outcome back into the MDX contract. Queues a HITL card. Step 4.",
    role: "The skill that closes the measurement half of the loop. Reads PostHog results, writes them into the contract frontmatter, queues a Hermes synthesis card.",
    install: "npx systemix workflow add hypothesis-validation",
    skillContent: `---
name: evidence
description: Pull PostHog results and write the outcome to the hypothesis contract
trigger: [/evidence, "check experiment results", "is it significant yet"]
---

# /evidence

Pull experiment results from PostHog and write into the contract.

## Steps
1. Read the contract — get experiment key + success criteria
2. Query PostHog for the experiment's current state
3. If sessions < min_sessions or below significance → exit (still running)
4. Otherwise:
   - Write \`evidence-posthog:\` block to frontmatter
   - Set status: \`evidence-pending-review\`
   - Queue a HITL card pointing to this contract
5. Trigger /hermes to synthesize a recommendation`,
  },
  {
    id: "s-hermes", name: "/hermes", type: "skill",
    desc: "Trigger Hermes (local Ollama LLM) to synthesize contract evidence and write a decision recommendation to the HITL queue. Step 5.",
    role: "Explicit invocation of Hermes. Normally `systemix watch` runs Hermes automatically, but /hermes lets you trigger synthesis manually — useful when debugging or running a contract in dry-mode.",
    install: "npx systemix workflow add hypothesis-validation",
    skillContent: `---
name: hermes
description: Trigger Hermes to synthesize a hypothesis contract into a decision
trigger: [/hermes, "synthesize this", "what does hermes say"]
---

# /hermes

Run Hermes synthesis against a specific contract.

## Steps
1. Read the full contract (frontmatter + prose body)
2. Read up to 5 most recent contracts on the same surface (prior-art)
3. Build the prompt: original hypothesis + evidence + prior decisions
4. Send to Ollama at localhost:11434
5. Parse Hermes output: { recommendation, confidence, rationale }
6. Apply confidence routing (per systemix.config):
   - high → write decision directly to contract
   - medium → write + queue HITL card
   - low → queue HITL card only`,
  },
  {
    id: "s-close", name: "/close-experiment", type: "skill",
    desc: "Record the result, decision, and confidence in the contract. Pushes a synthesis card to the HITL queue. Closes the loop.",
    role: "Final skill of the loop. Marks the contract as resolved. After /close-experiment, the contract becomes prior-art for future experiments and agents.",
    install: "npx systemix workflow add hypothesis-validation",
    skillContent: `---
name: close-experiment
description: Resolve a hypothesis with a final decision and write to the contract
trigger: [/close-experiment, "promote variant", "kill experiment"]
---

# /close-experiment

Resolve a hypothesis contract with a final decision.

## Inputs
- Contract slug
- Decision: promote | kill | run-longer | inconclusive

## Steps
1. Read contract
2. Apply decision to frontmatter:
   - status: evidence-backed | killed | inconclusive
   - decision: <choice>
   - confidence: from Hermes
   - last-updated: today
3. Append to prose body: "Decision rationale" section
4. Remove from HITL queue
5. If decision is "promote": optionally update the source file to use the winning variant`,
  },
  {
    id: "s-growth", name: "/growth-audit", type: "skill",
    surfaces: ["gtm","landing"], signals: ["posthog"],
    desc: "Cross-reference running experiments against PostHog evidence. Scores signal strength (insufficient / weak / strong) and produces a prioritized decision brief.",
    role: "Strategic overview skill. Run weekly to see which running experiments are close to a decision and which are stalled. Not part of the per-experiment loop — operates across all live contracts.",
    install: "npx systemix workflow add hypothesis-validation",
    skillContent: `---
name: growth-audit
description: Score all running experiments and produce a prioritized decision brief
trigger: [/growth-audit, "weekly review", "what should i decide on"]
---

# /growth-audit

Audit all running hypotheses and rank by readiness to decide.

## Steps
1. List all contracts with status: running | experiment-live
2. For each: pull current PostHog state
3. Score signal strength:
   - strong: above significance threshold, sessions > min
   - weak: trending but below threshold
   - insufficient: not enough data
4. Output a markdown brief ranking experiments
5. Suggest next action per experiment (close, extend, kill)`,
  },
  {
    id: "s-variants", name: "/write-variants", type: "skill",
    surfaces: ["landing","onboarding","gtm"],
    desc: "Generate ICP-calibrated variant copy proposals for a running experiment. Reads contract history first to avoid rejected framings.",
    role: "Generative skill. Uses the contract to know what's been tried before — so the variants it proposes don't repeat rejected directions. Optionally writes the winning variant back to the source file.",
    install: "npx systemix workflow add hypothesis-validation",
    skillContent: `---
name: write-variants
description: Generate ICP-calibrated copy variants for a running experiment
trigger: [/write-variants, "more variants", "alternative copy"]
---

# /write-variants

Generate copy variants for a running hypothesis.

## Steps
1. Read the contract — extract ICP + current variants + rejected directions
2. Read prior contracts on the same surface (last 6 months)
3. Generate 3 new variant proposals that:
   - Match the ICP framing
   - Avoid any "rejected directions" listed in prior contracts
   - Vary along a dimension not yet tested
4. Output as markdown — user picks one
5. Optionally apply the chosen variant to the source file`,
  },
  {
    id: "s-figma", name: "/figma", type: "skill", surfaces: ["design-system"],
    desc: "Figma → code. Reads design context for components — variants, properties, descendants.",
    role: "Design-system entry skill. Pulls structured component data from Figma via the Figma Console MCP and prepares it for /tokens and /drift-report.",
    install: "npx systemix workflow add design-system",
    skillContent: `---
name: figma
description: Read Figma design context for a component
trigger: [/figma, "get figma context", "design context"]
---

# /figma

Fetch structured design data from Figma for a component.

## Steps
1. Resolve the Figma node ID (from URL or component name)
2. Query Figma MCP for: properties, variants, descendants, tokens used
3. Output structured JSON ready for /tokens or /drift-report
4. Cache result for 1 hour to avoid redundant API calls`,
  },
  {
    id: "s-tokens", name: "/tokens", type: "skill", surfaces: ["design-system"],
    desc: "Sync token architecture. shadcn/ui + Tailwind v4 conventions as canonical source of truth.",
    role: "Token bridge. Reads Figma variables, writes Tailwind/shadcn token definitions, generates the bridge file that maps between them.",
    install: "npx systemix workflow add design-system",
    skillContent: `---
name: tokens
description: Sync design tokens between Figma variables and Tailwind/shadcn
trigger: [/tokens, "sync tokens", "update design tokens"]
---

# /tokens

Bidirectional token sync — Figma variables ↔ Tailwind config.

## Steps
1. Read Figma variable collections (color, spacing, radius, typography)
2. Read current Tailwind config (tailwind.config.ts) + shadcn theme
3. Diff the two — output a structured mismatch list
4. For each mismatch, propose: keep Figma | keep code | merge
5. Apply approved changes — write to both sides as needed
6. Write tokens.bridge.json — the canonical map between the two`,
  },
  {
    id: "s-drift", name: "/drift-report", type: "skill",
    surfaces: ["design-system"], signals: ["figma"],
    desc: "Surface Figma↔code drift as a HITL card before any test starts — so you measure what you designed, not a drifted variant.",
    role: "Pre-experiment gate for design-system work. Detects when a component's code has drifted from its Figma reference. Refuses to greenlight a visual experiment until drift is resolved.",
    install: "npx systemix workflow add design-system",
    skillContent: `---
name: drift-report
description: Detect Figma ↔ code drift and queue HITL cards before testing
trigger: [/drift-report, "check drift", "is this in sync"]
---

# /drift-report

Detect mismatches between Figma source and shipped code.

## Steps
1. Pull current Figma state for the component
2. Compare against shipped code (CSS / Tailwind classes / token values)
3. For each mismatch:
   - Compute ΔE (perceptual color distance) for color drift
   - Compute pixel delta for spacing / size drift
4. If any drift > threshold → queue HITL card
5. Block /experiment on this component until card is resolved`,
  },

  // ─── SELF-IMPROVEMENT SKILL ─────────────────────────────────
  {
    id: "s-meta-audit", name: "/meta-audit", type: "skill", meta: true,
    desc: "Hermes reviews its OWN past decisions vs what actually happened. Did promoted variants keep winning? Outputs a meta-evidence card.",
    role: "Points the validation loop at Systemix itself. The same hypothesis pattern Hermes uses on your experiments, Hermes uses on its own decisions. If at 'medium' confidence Hermes was right 88% of the time over 6 months, /meta-audit proposes promoting that threshold — as a HITL card you approve.",
    install: "Bundled when self-improvement is enabled",
    skillContent: `---
name: meta-audit
description: Hermes audits its own past decisions against subsequent outcomes
trigger: [/meta-audit, "how is hermes doing", "audit hermes accuracy"]
---

# /meta-audit

Score Hermes against its own past recommendations.

## Steps
1. Read \`contract/meta/hermes-accuracy.mdx\` (the meta-contract)
2. For each closed contract in the last N days:
   - What did Hermes recommend?
   - What was the final outcome (did the decision hold up)?
3. Compute hit-rate per confidence bucket (high / medium / low)
4. If a bucket's hit-rate consistently exceeds its threshold by >10%
   → propose promoting the threshold (e.g. medium → high)
5. If a bucket underperforms by >15%
   → propose demoting the threshold
6. Output proposals as HITL cards

## Modes (set in systemix.config)
- audit: log only, never propose changes
- tuning: propose changes as HITL cards
- auto: apply changes within preset bounds, log all changes`,
  },

  // ─── ARTIFACTS ──────────────────────────────────────────────
  {
    id: "contract", name: "MDX contract", type: "artifact",
    desc: "One file per hypothesis in your repo. Machine-readable frontmatter + human-readable rationale. The single artifact where the loop closes.",
    role: "The center of Systemix. Every skill reads from it or writes to it. It's a real file in your repo — committed, diffable, editable. No database, no hosted UI.",
    schema: `---
id: landing-headline-icp-match
hypothesis: "Ops-role visitors convert lower because the
  headline targets technical founders"
icp: ops-directors-linkedin
status: evidence-backed
variants:
  control: "Your agents. Your source of truth."
  variant_b: "Ship faster without the ops overhead."
result: variant-b-wins
decision: promote
confidence: 0.84
evidence-posthog:
  experiment: hero-headline-ab
  variant: variant_b
  lift: "+38% trial signups"
  sessions: 1840
  recorded: 2026-05-01
last-updated: 2026-05-01
---

## Landing headline — ICP match test

Hypothesis formed after PostHog showed 46% of inbound from
LinkedIn were ops-role, but headline was written for technical
founders.

### Decision
Variant B promoted at 84% confidence across 1,840 sessions.
Prior direction ("AI-native" framing, March) underperformed —
ops ICP reads "AI-native" as hype. Do not re-propose.`,
    meta: [
      { label: "Location", value: "contract/hypotheses/*.mdx" },
      { label: "Typical size", value: "50–200 lines" },
      { label: "Written by", value: "/hypothesis, /evidence, /close-experiment, Hermes" },
      { label: "Read by", value: "All skills, Hermes, MCP server (→ Claude Code / Cursor)" },
    ],
  },
  {
    id: "evidence", name: "Evidence record", type: "artifact",
    desc: "Production results, decisions, rejected directions — permanently co-located with the artifact they describe.",
    role: "Not a separate file — it's the evidence-posthog block + the prose body of the contract. The reason the contract is durable: when copy changes, the evidence stays attached to what it described at the time of measurement.",
    schema: `evidence-posthog:
  experiment: onboarding-step2-ab
  variant: simplified-instruction
  result: "+29% step completion"
  sessions: 640
  confidence: 0.81
  recorded: 2026-04-20

## Production Evidence (prose body)

Simplified instruction variant outperformed the original by
+29% step completion at 81% confidence.

Prior direction: video walkthrough — tested Feb 2026, no
measurable lift, increased time-on-step. Rejected.
Do not re-propose video without new evidence.`,
  },
  {
    id: "hitl-card", name: "HITL decision card", type: "artifact",
    desc: "Hermes writes: recommendation (promote / run longer / kill), confidence, rationale. One click to resolve.",
    role: "Surfaces in the dashboard queue. When you resolve it, the resolve API writes the decision back to the MDX contract. The card is ephemeral — once resolved it's gone from the queue, but the decision persists in the contract.",
    schema: `// queue.json entry
{
  "id": "card_2026-05-31_landing-headline",
  "contract": "landing-headline-icp-match",
  "type": "hypothesis-decision",
  "recommendation": "promote",
  "confidence": 0.87,
  "rationale": "Variant B converts +47% on builder-persona\\ntraffic. Prior 'technical-founder' framing rejected in\\nMarch — Hermes recommends promote.",
  "data": {
    "lift": "+47%",
    "sessions": 1240,
    "ci_lower": 0.32, "ci_upper": 0.61
  },
  "created": "2026-05-31T13:14:00Z"
}`,
    meta: [
      { label: "Location", value: "queue.json" },
      { label: "Lifecycle", value: "Created by Hermes → surfaced in dashboard → resolved by human → archived" },
    ],
  },
  {
    id: "meta-contract", name: "Hermes meta-contract", type: "artifact", meta: true,
    desc: "Tracks Hermes's own hit-rate and confidence-threshold history. The hypothesis loop pointed at Systemix itself.",
    role: "Only exists when self-improvement is on. The meta-contract is structurally identical to a normal contract — same MDX format — but its hypothesis is about Hermes's calibration. /meta-audit reads it; Hermes writes to it on every closed contract.",
    schema: `---
id: hermes-accuracy
hypothesis: "Hermes's confidence buckets are well-calibrated
  — actual hit-rate should match the threshold"
status: running
self-improvement-mode: tuning
thresholds:
  high: 0.85
  medium: 0.55
window-days: 90
hit-rates:
  high: 0.94   # 47/50 decisions held up
  medium: 0.88 # 22/25 decisions held up
  low: 0.42    # 5/12 — appropriately uncertain
last-updated: 2026-05-30
---

## Hermes accuracy — running

Medium-confidence decisions are holding up at 88% — above
the 55% threshold by a wide margin. Proposing promotion of
medium → high (threshold raise from 0.55 → 0.70).

Awaiting HITL approval.`,
    meta: [
      { label: "Location", value: "contract/meta/hermes-accuracy.mdx" },
      { label: "Only present when", value: "Self-improvement ≠ off" },
    ],
  },
  {
    id: "config", name: "systemix.config", type: "artifact",
    desc: "Generated by onboarding. Holds your surfaces, signal access, confidence thresholds, self-improvement mode. The Orchestrator reads this at boot.",
    role: "The single source of truth for YOUR configuration. Every choice from the onboarding wizard ends up here. Edit by hand or re-run the wizard — both work.",
    schema: `# systemix.config.yaml
version: 1
surfaces:
  - landing
  - onboarding
signals:
  posthog:
    enabled: true
    poll_interval_sec: 300
  vercel:
    enabled: true
hermes:
  model: hermes3
  endpoint: http://localhost:11434
  autonomy: balanced
  thresholds:
    high: 0.85
    medium: 0.55
self_improvement:
  mode: tuning
  meta_contract: contract/meta/hermes-accuracy.mdx
  audit_window_days: 90
trust:
  orchestrator_tier: 0
  hermes_tier: 0`,
    meta: [
      { label: "Location", value: "systemix.config.yaml (repo root)" },
      { label: "Written by", value: "Onboarding wizard, `systemix init --reconfigure`" },
      { label: "Read by", value: "Orchestrator, Hermes, all skills" },
    ],
  },

  // ─── INFRASTRUCTURE ─────────────────────────────────────────
  {
    id: "ollama", name: "Ollama", type: "infra",
    desc: "Runs Hermes locally at localhost:11434. Any compatible model. No cloud.",
    role: "Infrastructure dependency for Hermes. Air-gapped — no API key, no data leaves your machine. Swap models by changing one line in systemix.config.",
    runtime: { title: "Install + pull model", code: "brew install ollama\nollama serve            # runs at localhost:11434\nollama pull hermes3     # default model\n\n# verify\ncurl http://localhost:11434/api/tags" },
    meta: [
      { label: "Endpoint", value: "http://localhost:11434" },
      { label: "Default model", value: "hermes3 (~4.7 GB)" },
      { label: "Alternative models", value: "Any Ollama-compatible LLM" },
    ],
  },
  {
    id: "mcp", name: "MCP server", type: "infra",
    desc: "Exposes contracts to Claude Code and Cursor. Agents read the contract before they ship the next thing.",
    role: "The agent access layer. Tool calls like contract_read, contract_list, contract_write_hypothesis_result are exposed here. Without the MCP server, your agents can't see contracts — they'd just guess.",
    runtime: { title: "Run the server", code: "npx systemix-mcp --project-root .\n\n# claude code picks it up automatically\n# for cursor: add to .cursor/mcp.json (see Cursor node)" },
    meta: [
      { label: "Transport", value: "stdio (local), SSE optional" },
      { label: "Tools exposed", value: "contract_read, contract_list, contract_write_hypothesis_result, contract_query" },
    ],
  },
  {
    id: "cli", name: "CLI (watch/init)", type: "infra",
    desc: "systemix init scaffolds contracts. systemix watch runs Hermes continuously, polling signals and filling the queue.",
    role: "The operator interface. `init` is one-time setup. `watch` is the long-running process — leave it running in a terminal or background it via launchd / systemd.",
    runtime: { title: "Common commands", code: "# one-time setup\nnpx systemix init\n\n# add a workflow (set of skills)\nnpx systemix workflow add hypothesis-validation\n\n# the watcher (run continuously)\nnpx systemix watch\n\n# one-shot contract generation (no Hermes)\nnpm run generate-contracts -- --no-hermes" },
  },
  {
    id: "quality", name: "Quality Score", type: "infra", surfaces: ["design-system"],
    desc: "Scores contract completeness + design-system parity. Surfaces what needs attention.",
    role: "Health metric across all contracts. Combines: % of contracts with evidence, % of components with no drift, freshness of last update. Visible on the dashboard.",
  },

  // ─── UI ─────────────────────────────────────────────────────
  {
    id: "queue", name: "Decision Queue (HITL)", type: "ui",
    desc: "Every running hypothesis produces a card. Confidence score, PostHog data, prior contract history. One click writes the decision back.",
    role: "Your weekly cadence. Open the dashboard, work the queue, close cards. Each resolved card writes evidence back to the MDX contract. The queue is the only human ritual the loop demands.",
    meta: [
      { label: "Access", value: "getsystemix.vercel.app/dashboard" },
      { label: "Card lifetime", value: "Until resolved" },
    ],
  },
  {
    id: "dashboard", name: "Dashboard", type: "ui",
    desc: "Renders the HITL queue, contract evidence, quality score, hypothesis status.",
    role: "Read-mostly UI. The contracts are the source of truth — the dashboard is a view over them. You don't edit contracts here; you approve Hermes decisions, which then trigger writes to the MDX files.",
  },
];

/* ============================================================
   EDGES — with prose narratives for the panel
   ============================================================ */
const LINKS = [
  // signals in
  { s: "posthog", t: "hermes", label: "experiment results", text: "PostHog pushes experiment results to Hermes once an A/B test reaches significance." },
  { s: "vercel", t: "hermes", label: "deploy event", text: "Vercel's post-deploy hook notifies Hermes that a new variant is live and the measurement window has started." },
  { s: "social", t: "hermes", label: "referrer attribution", text: "Social signal events tell Hermes which channel a conversion came from — used to refine ICP-level synthesis." },
  { s: "figma", t: "s-drift", label: "design source", text: "Figma supplies the design reference that /drift-report compares against shipped code." },
  { s: "storybook", t: "quality", label: "component inventory", text: "Storybook's component list feeds the Quality Score so it knows what exists." },
  // skills → artifacts
  { s: "s-hypothesis", t: "contract", label: "creates", text: "/hypothesis writes a new MDX contract — the starting artifact of every experiment." },
  { s: "s-measure", t: "posthog", label: "instruments", text: "/measure adds PostHog capture() calls to the component referenced by the contract." },
  { s: "s-experiment", t: "posthog", label: "feature flag", text: "/experiment creates a PostHog feature flag and wraps the variant code in a flag check." },
  { s: "s-evidence", t: "contract", label: "writes result", text: "/evidence pulls PostHog results and writes the evidence-posthog block to the contract." },
  { s: "s-evidence", t: "queue", label: "queues card", text: "/evidence queues a HITL card pointing to the contract once an experiment is significant." },
  { s: "s-hermes", t: "hermes", label: "invokes", text: "/hermes is the explicit invocation of Hermes — manual trigger of synthesis on a contract." },
  { s: "s-close", t: "contract", label: "records decision", text: "/close-experiment writes the final decision and rationale to the contract." },
  { s: "s-growth", t: "queue", label: "decision brief", text: "/growth-audit produces a weekly brief that surfaces in the queue alongside individual cards." },
  { s: "s-variants", t: "contract", label: "reads history", text: "/write-variants reads the contract's rejected directions before generating new copy proposals." },
  // design-system
  { s: "s-figma", t: "figma", label: "reads", text: "/figma queries the Figma MCP for component context." },
  { s: "s-tokens", t: "contract", label: "token bridge", text: "/tokens writes the tokens.bridge.json that maps Figma variables to Tailwind tokens." },
  { s: "s-drift", t: "queue", label: "drift card", text: "/drift-report queues a HITL card whenever drift exceeds threshold." },
  // hermes core
  { s: "hermes", t: "contract", label: "writes evidence", text: "Hermes writes synthesized decisions and prose rationale into the contract MDX file." },
  { s: "hermes", t: "hitl-card", label: "synthesizes", text: "For medium/low confidence, Hermes outputs a HITL card instead of writing directly." },
  { s: "hermes", t: "ollama", label: "runs on", text: "Hermes is an LLM served by Ollama at localhost:11434 — air-gapped, no API key." },
  { s: "contract", t: "evidence", label: "holds", text: "The contract holds the evidence record inline — frontmatter and prose, one file." },
  { s: "hitl-card", t: "queue", label: "surfaces in", text: "HITL cards appear in the decision queue UI for you to resolve." },
  { s: "queue", t: "dashboard", label: "renders in", text: "The queue is rendered by the dashboard at /dashboard." },
  // orchestrator
  { s: "config", t: "orchestrator", label: "configures", text: "The Orchestrator reads systemix.config.yaml at boot to know which skills, signals, and thresholds apply." },
  { s: "orchestrator", t: "hermes", label: "sets thresholds", text: "The Orchestrator passes confidence thresholds and autonomy mode to Hermes." },
  { s: "orchestrator", t: "cli", label: "dispatches", text: "The Orchestrator is invoked through the CLI — systemix init, watch, config commands." },
  { s: "cli", t: "hermes", label: "runs watch", text: "`systemix watch` is the long-running process that keeps Hermes alive in the background." },
  // agent access
  { s: "contract", t: "mcp", label: "exposed via", text: "Contracts are exposed to MCP-compatible agents through tool calls on the MCP server." },
  { s: "mcp", t: "claude-code", label: "reads", text: "Claude Code reads contracts via the MCP server before writing any code that touches a tested surface." },
  { s: "mcp", t: "cursor", label: "reads", text: "Cursor reads contracts via the same MCP server — any MCP-compatible agent can." },
  // self-improvement (meta)
  { s: "hermes", t: "meta-contract", label: "logs decisions", text: "Every Hermes decision is logged to the meta-contract — what it recommended, confidence, outcome.", meta: true },
  { s: "s-meta-audit", t: "meta-contract", label: "reads outcomes", text: "/meta-audit reads the meta-contract to score Hermes against its own past calls.", meta: true },
  { s: "s-meta-audit", t: "config", label: "proposes threshold change", text: "If Hermes is consistently right above its threshold, /meta-audit proposes updating systemix.config.", meta: true },
  { s: "meta-contract", t: "queue", label: "meta-evidence card", text: "Threshold-change proposals surface as HITL cards in the same queue.", meta: true },
];

/* ============================================================
   APP
   ============================================================ */
export default function App() {
  const [surfaces, setSurfaces] = useState(new Set(["landing", "onboarding"]));
  const [signals, setSignals] = useState(new Set(["posthog", "vercel"]));
  const [autonomy, setAutonomy] = useState("balanced");
  const [siMode, setSiMode] = useState("tuning");

  const [wizardOpen, setWizardOpen] = useState(true);
  const [wizardStep, setWizardStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [runtimeOpen, setRuntimeOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // responsive detection
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 820px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // esc closes panels
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        if (selected) setSelected(null);
        else if (wizardOpen) setWizardOpen(false);
        else if (runtimeOpen) setRuntimeOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, wizardOpen, runtimeOpen]);

  const metaOn = siMode !== "off";

  const visibleNodes = useMemo(
    () => NODES.filter((n) => {
      if (n.meta && !metaOn) return false;
      if (n.surfaces && ![...n.surfaces].some((s) => surfaces.has(s))) return false;
      if (n.signals && ![...n.signals].some((s) => signals.has(s))) return false;
      return true;
    }),
    [surfaces, signals, metaOn]
  );

  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  const visibleLinks = useMemo(
    () => LINKS.filter((l) => {
      if (l.meta && !metaOn) return false;
      return visibleIds.has(l.s) && visibleIds.has(l.t);
    }),
    [visibleIds, metaOn]
  );

  const summary = [
    `${surfaces.size} surface${surfaces.size !== 1 ? "s" : ""}`,
    `${signals.size} signal${signals.size !== 1 ? "s" : ""}`,
    AUTONOMY.find((a) => a.id === autonomy).label,
    `Self-improve: ${SI_MODES.find((m) => m.id === siMode).label}`,
  ];

  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, sans-serif",
      background: "#f5f4f1", color: "#3c3e50",
      height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <Header
        summary={summary}
        onConfigure={() => { setWizardOpen(true); setWizardStep(0); }}
        runtimeOpen={runtimeOpen}
        setRuntimeOpen={setRuntimeOpen}
        isMobile={isMobile}
      />

      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <GraphCanvas
          nodes={visibleNodes}
          links={visibleLinks}
          onSelect={setSelected}
          runtimeOpen={runtimeOpen}
        />
        {runtimeOpen && (
          <RuntimePanel
            signals={signals} autonomy={autonomy} siMode={siMode} metaOn={metaOn}
            isMobile={isMobile} onClose={() => setRuntimeOpen(false)}
          />
        )}
        {selected && (
          <DetailPanel
            node={selected}
            allLinks={visibleLinks}
            onClose={() => setSelected(null)}
            onJump={(id) => setSelected(NODES.find((n) => n.id === id))}
            isMobile={isMobile}
          />
        )}
      </div>

      {wizardOpen && (
        <ConfigureWizard
          step={wizardStep} setStep={setWizardStep}
          surfaces={surfaces} setSurfaces={setSurfaces}
          signals={signals} setSignals={setSignals}
          autonomy={autonomy} setAutonomy={setAutonomy}
          siMode={siMode} setSiMode={setSiMode}
          onClose={() => setWizardOpen(false)}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

/* ============================================================
   HEADER — responsive top nav
   ============================================================ */
function Header({ summary, onConfigure, runtimeOpen, setRuntimeOpen, isMobile }) {
  return (
    <div style={{
      borderBottom: "1px solid #e6e5e0", background: "#fbfbf9",
      padding: isMobile ? "10px 14px" : "12px 20px",
      display: "flex", flexDirection: isMobile ? "column" : "row",
      alignItems: isMobile ? "stretch" : "center",
      gap: isMobile ? 8 : 16, flexShrink: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 6, background: "#3c3e50",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#f5f4f1", fontWeight: 700, fontSize: 14, fontFamily: "ui-monospace, monospace", flexShrink: 0,
        }}>S</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: ".14em", color: "#a8a99f", textTransform: "uppercase" }}>
            Your Systemix instance
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Onboarding graph
          </div>
        </div>
      </div>

      {!isMobile && (
        <div style={{
          flex: 1, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
          padding: "0 12px", minWidth: 0,
        }}>
          {summary.map((s, i) => (
            <span key={i} style={{
              fontSize: 10.5, padding: "4px 10px", borderRadius: 20,
              background: "#fff", border: "1px solid #e6e5e0", color: "#6b6c64", whiteSpace: "nowrap",
            }}>
              {s}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={onConfigure}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
            padding: "8px 12px", borderRadius: 8, cursor: "pointer",
            border: "1px solid #dcdcd6", background: "#fff", color: "#3c3e50",
          }}
        >
          <Settings size={13} /> Configure
        </button>
        <button
          onClick={() => setRuntimeOpen(!runtimeOpen)}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600,
            padding: "8px 12px", borderRadius: 8, cursor: "pointer",
            border: `1px solid ${runtimeOpen ? "#059669" : "#dcdcd6"}`,
            background: runtimeOpen ? "#059669" : "#fff",
            color: runtimeOpen ? "#fff" : "#3c3e50",
          }}
        >
          <Activity size={13} />
          {runtimeOpen ? "Runtime on" : "Runtime"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   GRAPH
   ============================================================ */
function GraphCanvas({ nodes: nodeData, links: linkData, onSelect, runtimeOpen }) {
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 560 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setDims({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    const { w, h } = dims;
    if (w < 50 || h < 50) return;

    const nodes = nodeData.map((d) => ({ ...d }));
    const links = linkData.map((d) => ({ source: d.s, target: d.t, label: d.label, meta: d.meta }));

    const g = svg.append("g");
    const zoom = d3.zoom().scaleExtent([0.3, 3]).on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    const defs = svg.append("defs");
    [["arrow", "#cbccc9"], ["arrow-meta", "#7c3aed"]].forEach(([id, color]) => {
      defs.append("marker")
        .attr("id", id).attr("viewBox", "0 -5 10 10").attr("refX", 24)
        .attr("markerWidth", 5).attr("markerHeight", 5).attr("orient", "auto")
        .append("path").attr("d", "M0,-4L8,0L0,4").attr("fill", color);
    });

    const link = g.append("g").selectAll("line").data(links).join("line")
      .attr("stroke", (d) => (d.meta ? "#7c3aed" : "#cbccc9"))
      .attr("stroke-width", (d) => (d.meta ? 1.6 : 1.1))
      .attr("stroke-dasharray", (d) => (d.meta ? "4 3" : null))
      .attr("opacity", 0.55)
      .attr("marker-end", (d) => (d.meta ? "url(#arrow-meta)" : "url(#arrow)"));

    const linkLabel = g.append("g").selectAll("text").data(links).join("text")
      .text((d) => d.label).attr("font-size", 7.5).attr("fill", "#9b9c93")
      .attr("text-anchor", "middle").attr("font-family", "system-ui, sans-serif")
      .attr("pointer-events", "none").style("opacity", 0);

    const node = g.append("g").selectAll("g").data(nodes).join("g")
      .style("cursor", "pointer")
      .call(d3.drag()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    const radius = (d) => (d.type === "agent" || d.type === "artifact" ? 11 : d.type === "infra" ? 8 : 9);

    node.append("circle")
      .attr("r", radius)
      .attr("fill", (d) => TYPE[d.type].color)
      .attr("stroke", "#f5f4f1").attr("stroke-width", 2);

    node.append("text")
      .text((d) => d.name)
      .attr("x", (d) => radius(d) + 5).attr("y", 3)
      .attr("font-size", 9.5).attr("font-family", "system-ui, sans-serif")
      .attr("fill", "#3c3e50").attr("font-weight", 500)
      .attr("pointer-events", "none");

    node.on("click", (e, d) => { e.stopPropagation(); onSelect(d); });
    node.on("mouseenter", function (_, d) {
      link.attr("opacity", (l) => (l.source.id === d.id || l.target.id === d.id ? 0.95 : 0.1));
      linkLabel.style("opacity", (l) => (l.source.id === d.id || l.target.id === d.id ? 1 : 0));
      node.style("opacity", (n) => {
        if (n.id === d.id) return 1;
        const conn = links.some((l) => (l.source.id === d.id && l.target.id === n.id) || (l.target.id === d.id && l.source.id === n.id));
        return conn ? 1 : 0.28;
      });
    });
    node.on("mouseleave", () => {
      link.attr("opacity", 0.55);
      linkLabel.style("opacity", 0);
      node.style("opacity", 1);
    });

    const sim = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(85).strength(0.5))
      .force("charge", d3.forceManyBody().strength(-340))
      .force("center", d3.forceCenter(w / 2, h / 2))
      .force("collide", d3.forceCollide().radius(34))
      .on("tick", () => {
        link.attr("x1", (d) => d.source.x).attr("y1", (d) => d.source.y)
            .attr("x2", (d) => d.target.x).attr("y2", (d) => d.target.y);
        linkLabel.attr("x", (d) => (d.source.x + d.target.x) / 2).attr("y", (d) => (d.source.y + d.target.y) / 2);
        node.attr("transform", (d) => `translate(${d.x},${d.y})`);
      });

    return () => sim.stop();
  }, [nodeData, linkData, dims, onSelect]);

  return (
    <div ref={wrapRef} style={{ flex: 1, position: "relative", minWidth: 0 }}>
      <svg ref={svgRef} width={dims.w} height={dims.h} style={{ display: "block" }} />
      <div style={{
        position: "absolute", left: 12, bottom: 12,
        background: "rgba(251,251,249,.94)", border: "1px solid #e6e5e0", borderRadius: 8,
        padding: "8px 10px", display: "flex", gap: 10, flexWrap: "wrap", maxWidth: 420,
      }}>
        {Object.entries(TYPE).map(([k, v]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: "#6b6c64" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: v.color }} />{v.label}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, color: "#7c3aed" }}>
          <span style={{ width: 12, height: 0, borderTop: "1.5px dashed #7c3aed" }} /> self-improvement
        </div>
      </div>
      <div style={{ position: "absolute", right: 12, top: 10, fontSize: 9.5, color: "#a8a99f" }}>
        {nodeData.length} nodes · {linkData.length} flows
      </div>
    </div>
  );
}

/* ============================================================
   DETAIL PANEL — type-aware
   ============================================================ */
function DetailPanel({ node, allLinks, onClose, onJump, isMobile }) {
  const Icon = TYPE[node.type].icon;
  const color = TYPE[node.type].color;
  const outgoing = allLinks.filter((l) => (l.s === node.id || l.s?.id === node.id) || (typeof l.s === "object" && l.s.id === node.id));
  const incoming = allLinks.filter((l) => (l.t === node.id || l.t?.id === node.id) || (typeof l.t === "object" && l.t.id === node.id));
  // since d3 mutates links, we compare against the original raw set:
  const rawOut = LINKS.filter((l) => l.s === node.id && (l.meta ? allLinks.some((x) => x.label === l.label) : true));
  const rawIn = LINKS.filter((l) => l.t === node.id && (l.meta ? allLinks.some((x) => x.label === l.label) : true));

  const style = isMobile
    ? { position: "fixed", left: 0, right: 0, bottom: 0, height: "80vh", borderTop: "1px solid #e6e5e0", borderTopLeftRadius: 14, borderTopRightRadius: 14, zIndex: 50 }
    : { width: 360, borderLeft: "1px solid #e6e5e0" };

  return (
    <div style={{
      ...style, background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden",
      boxShadow: isMobile ? "0 -10px 40px rgba(0,0,0,.12)" : "none",
    }}>
      {/* header */}
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid #f0efea" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px",
            borderRadius: 12, background: color + "15", color, fontSize: 10, fontWeight: 700, letterSpacing: ".08em",
          }}>
            <Icon size={11} />{TYPE[node.type].label.toUpperCase()}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8a99f", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.01em", marginBottom: 6 }}>{node.name}</div>
        <div style={{ fontSize: 12, color: "#6b6c64", lineHeight: 1.55 }}>{node.desc}</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px 20px" }}>
        {/* role */}
        {node.role && <Section title="Role in the system"><Prose>{node.role}</Prose></Section>}

        {/* type-specific */}
        {node.type === "skill" && node.skillContent && (
          <Section title="Skill content" hint=".md file installed at .claude/skills/">
            <CodeBlock content={node.skillContent} language="markdown" />
          </Section>
        )}
        {node.type === "skill" && node.install && (
          <Section title="Install">
            <CodeBlock content={node.install} language="bash" compact />
          </Section>
        )}

        {(node.type === "agent" || node.type === "infra") && node.runtime && (
          <Section title={node.runtime.title}>
            <CodeBlock content={node.runtime.code} language="bash" />
          </Section>
        )}

        {node.type === "artifact" && node.schema && (
          <Section title="Sample / schema" hint="What this artifact looks like in your repo">
            <CodeBlock content={node.schema} language="yaml" />
          </Section>
        )}

        {node.type === "tool" && node.setup && (
          <Section title={node.setup.title}>
            <CodeBlock content={node.setup.code} language="bash" />
          </Section>
        )}

        {node.type === "source" && node.setup && (
          <Section title={node.setup.title}>
            <CodeBlock content={node.setup.code} language="bash" />
          </Section>
        )}

        {/* metadata */}
        {node.meta && node.meta.length > 0 && (
          <Section title="Properties">
            <div style={{ background: "#fbfbf9", border: "1px solid #f0efea", borderRadius: 8, padding: 4 }}>
              {node.meta.map((m, i) => (
                <div key={i} style={{ padding: "8px 10px", borderBottom: i < node.meta.length - 1 ? "1px solid #f0efea" : "none" }}>
                  <div style={{ fontSize: 9, letterSpacing: ".1em", color: "#a8a99f", textTransform: "uppercase", marginBottom: 2 }}>{m.label}</div>
                  <div style={{ fontSize: 11.5, color: "#3c3e50" }}>{m.value}</div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* connections */}
        {(rawOut.length > 0 || rawIn.length > 0) && (
          <Section title="Information flow">
            {rawOut.length > 0 && (
              <div style={{ marginBottom: rawIn.length > 0 ? 12 : 0 }}>
                <FlowGroup label="Outgoing" icon={<ArrowRight size={11} />} color="#059669">
                  {rawOut.map((l, i) => (
                    <FlowItem key={i} target={NODES.find((n) => n.id === l.t)} text={l.text} meta={l.meta} direction="out" onJump={onJump} />
                  ))}
                </FlowGroup>
              </div>
            )}
            {rawIn.length > 0 && (
              <FlowGroup label="Incoming" icon={<ArrowLeft size={11} />} color="#2563eb">
                {rawIn.map((l, i) => (
                  <FlowItem key={i} target={NODES.find((n) => n.id === l.s)} text={l.text} meta={l.meta} direction="in" onJump={onJump} />
                ))}
              </FlowGroup>
            )}
          </Section>
        )}
      </div>
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: ".12em", color: "#6b6c64", textTransform: "uppercase", fontWeight: 700 }}>{title}</div>
        {hint && <div style={{ fontSize: 9.5, color: "#a8a99f", fontStyle: "italic" }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Prose({ children }) {
  return <div style={{ fontSize: 12, color: "#3c3e50", lineHeight: 1.7 }}>{children}</div>;
}

function CodeBlock({ content, language, compact }) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    try {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (e) {}
  };
  return (
    <div style={{ position: "relative" }}>
      <pre style={{
        background: "#1a1c25", color: "#e8e8e8",
        padding: compact ? "8px 12px" : "12px 14px",
        paddingRight: 50,
        borderRadius: 8, fontSize: compact ? 11 : 10.5,
        fontFamily: "ui-monospace, SFMono-Regular, monospace",
        lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word",
        maxHeight: compact ? "none" : 320, overflowY: "auto", userSelect: "all",
      }}>
        {content}
      </pre>
      <button onClick={doCopy} style={{
        position: "absolute", top: 6, right: 6, fontSize: 10, fontWeight: 600,
        padding: "4px 8px", borderRadius: 5, cursor: "pointer", border: "none",
        background: copied ? "#059669" : "rgba(255,255,255,.12)", color: "#fff",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        {copied ? <Check size={11} /> : <Copy size={11} />}
        {copied ? "copied" : "copy"}
      </button>
      {language && (
        <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 9, color: "#6b6c64", fontFamily: "ui-monospace, monospace" }}>
          {language}
        </div>
      )}
    </div>
  );
}

function FlowGroup({ label, icon, color, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, letterSpacing: ".08em", color, textTransform: "uppercase", fontWeight: 700, marginBottom: 6 }}>
        {icon}{label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function FlowItem({ target, text, meta, direction, onJump }) {
  if (!target) return null;
  const color = TYPE[target.type].color;
  return (
    <div
      onClick={() => onJump(target.id)}
      style={{
        padding: "8px 10px", borderRadius: 7, cursor: "pointer",
        border: "1px solid #f0efea", marginBottom: 5, background: "#fff",
        transition: "all .12s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = "#fcfcfa"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#f0efea"; e.currentTarget.style.background = "#fff"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "#3c3e50" }}>{target.name}</span>
        <span style={{ fontSize: 9, color: "#a8a99f" }}>· {TYPE[target.type].label.toLowerCase()}</span>
        {meta && <span style={{ fontSize: 9, color: "#7c3aed", marginLeft: "auto" }}>meta</span>}
      </div>
      <div style={{ fontSize: 10.5, color: "#6b6c64", lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

/* ============================================================
   WIZARD
   ============================================================ */
function ConfigureWizard({
  step, setStep,
  surfaces, setSurfaces, signals, setSignals,
  autonomy, setAutonomy, siMode, setSiMode,
  onClose, isMobile,
}) {
  const steps = [
    { id: "surfaces", title: "What are you validating?", subtitle: "Determines which skills appear in your instance." },
    { id: "signals", title: "What signals can Hermes read?", subtitle: "Without signals, Hermes has no evidence to synthesize." },
    { id: "autonomy", title: "How much should Hermes decide alone?", subtitle: "Sets the confidence thresholds for auto-write vs HITL." },
    { id: "si", title: "Should Systemix improve itself?", subtitle: "Points the validation loop at Hermes's own decisions." },
  ];

  const cur = steps[step];
  const last = step === steps.length - 1;

  const toggleSet = (set, setter, val) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,16,21,.55)",
      display: "flex", alignItems: isMobile ? "stretch" : "center", justifyContent: "center",
      zIndex: 100, padding: isMobile ? 0 : 20,
    }}>
      <div style={{
        background: "#fbfbf9", borderRadius: isMobile ? 0 : 14,
        width: "100%", maxWidth: isMobile ? "none" : 620,
        height: isMobile ? "100%" : "auto", maxHeight: isMobile ? "none" : "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 30px 80px rgba(0,0,0,.3)",
      }}>
        {/* header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid #e6e5e0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".14em", color: "#a8a99f", textTransform: "uppercase", marginBottom: 4 }}>
              Configure your Systemix · {step + 1} / {steps.length}
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.01em" }}>{cur.title}</div>
            <div style={{ fontSize: 12, color: "#6b6c64", marginTop: 4 }}>{cur.subtitle}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8a99f", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* progress */}
        <div style={{ display: "flex", padding: "8px 22px", gap: 4 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? "#3c3e50" : "#e6e5e0",
              transition: "background .2s",
            }} />
          ))}
        </div>

        {/* step body */}
        <div style={{ flex: 1, padding: "16px 22px 18px", overflowY: "auto" }}>
          {step === 0 && (
            <WizardOptions
              multi
              options={SURFACES.map((s) => ({
                id: s, label: SURFACE_LABEL[s],
                desc: surfaceDesc(s),
              }))}
              selected={surfaces}
              onToggle={(v) => toggleSet(surfaces, setSurfaces, v)}
              color="#7c3aed"
            />
          )}
          {step === 1 && (
            <WizardOptions
              multi
              options={SIGNALS.map((s) => ({
                id: s, label: SIGNAL_LABEL[s],
                desc: signalDesc(s),
              }))}
              selected={signals}
              onToggle={(v) => toggleSet(signals, setSignals, v)}
              color="#0891b2"
            />
          )}
          {step === 2 && (
            <WizardOptions
              options={AUTONOMY.map((a) => ({ id: a.id, label: a.label, desc: a.desc, sub: a.thresholds }))}
              selected={new Set([autonomy])}
              onToggle={(v) => setAutonomy(v)}
              color="#d97706"
            />
          )}
          {step === 3 && (
            <WizardOptions
              options={SI_MODES.map((m) => ({ id: m.id, label: m.label, desc: m.desc }))}
              selected={new Set([siMode])}
              onToggle={(v) => setSiMode(v)}
              color="#e11d48"
            />
          )}
        </div>

        {/* footer */}
        <div style={{
          padding: "14px 22px", borderTop: "1px solid #e6e5e0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            style={{
              display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
              padding: "9px 13px", borderRadius: 7, border: "1px solid #e6e5e0",
              background: "#fff", cursor: step === 0 ? "not-allowed" : "pointer",
              color: step === 0 ? "#c4c5bc" : "#3c3e50",
            }}
          >
            <ChevronLeft size={14} /> Back
          </button>
          <button
            onClick={() => last ? onClose() : setStep(step + 1)}
            style={{
              display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600,
              padding: "9px 14px", borderRadius: 7, border: "none",
              background: "#3c3e50", color: "#fff", cursor: "pointer",
            }}
          >
            {last ? "Done — show me my Systemix" : "Next"}
            {!last && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function WizardOptions({ options, selected, onToggle, color, multi }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {options.map((o) => {
        const on = selected.has(o.id);
        return (
          <div
            key={o.id}
            onClick={() => onToggle(o.id)}
            style={{
              padding: "12px 14px", borderRadius: 9, cursor: "pointer",
              background: on ? color + "10" : "#fff",
              border: `1.5px solid ${on ? color : "#e6e5e0"}`,
              transition: "all .12s",
              display: "flex", alignItems: "flex-start", gap: 12,
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: multi ? 4 : "50%", flexShrink: 0, marginTop: 1,
              border: `2px solid ${on ? color : "#dcdcd6"}`, background: on ? color : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {on && <Check size={11} color="#fff" />}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#3c3e50", marginBottom: 3 }}>{o.label}</div>
              <div style={{ fontSize: 11.5, color: "#6b6c64", lineHeight: 1.55 }}>{o.desc}</div>
              {o.sub && <div style={{ fontSize: 10.5, color: color, marginTop: 5, fontFamily: "ui-monospace, monospace" }}>{o.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function surfaceDesc(s) {
  const map = {
    "landing": "Hero copy, CTA framing, headline tests. Adds /hypothesis, /measure, /write-variants.",
    "onboarding": "Activation flow, step completion, drop-off. Adds the full hypothesis-validation skill set.",
    "features": "In-product features, A/B feature gates. Same skill set as landing.",
    "design-system": "Component drift, token sync. Adds /figma, /tokens, /drift-report and the Quality Score.",
    "gtm": "Channel attribution, campaign tests. Adds /growth-audit and /write-variants.",
  };
  return map[s];
}
function signalDesc(s) {
  const map = {
    "posthog": "Conversion + funnel events. Without this, Hermes has no quantitative ground.",
    "vercel": "Deploy timestamps so Hermes knows when to start measurement windows.",
    "social": "Twitter/LinkedIn/Reddit referrer attribution per deploy.",
    "figma": "Design source for drift detection. Required for /drift-report.",
  };
  return map[s];
}

/* ============================================================
   RUNTIME PANEL
   ============================================================ */
function RuntimePanel({ signals, autonomy, siMode, metaOn, isMobile, onClose }) {
  const style = isMobile
    ? { position: "fixed", left: 0, right: 0, top: 0, bottom: 0, zIndex: 40 }
    : { width: 260, borderLeft: "1px solid #e6e5e0" };
  return (
    <div style={{ ...style, background: "#fbfbf9", padding: 16, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: ".12em", color: "#059669", textTransform: "uppercase", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#059669" }} />
          Runtime
        </div>
        {isMobile && (
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#a8a99f" }}>
            <X size={18} />
          </button>
        )}
      </div>
      <RuntimeRow label="systemix watch" val="polling" ok />
      <RuntimeRow label="Hermes / Ollama" val="hermes3 · ready" ok />
      <RuntimeRow label="Signals" val={[...signals].map((s) => SIGNAL_LABEL[s]).join(", ") || "none"} ok={signals.size > 0} />
      <RuntimeRow label="Autonomy" val={AUTONOMY.find((a) => a.id === autonomy).label} ok />
      <RuntimeRow label="Self-improve" val={SI_MODES.find((m) => m.id === siMode).label} ok={metaOn} />
      <div style={{ marginTop: 14, padding: "10px 12px", background: "#fff", border: "1px solid #e6e5e0", borderRadius: 8 }}>
        <div style={{ fontSize: 9, color: "#a8a99f", letterSpacing: ".1em", marginBottom: 4 }}>QUEUE</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#d97706" }}>3</div>
        <div style={{ fontSize: 10, color: "#6b6c64" }}>cards awaiting decision</div>
      </div>
      {metaOn && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#fdf2f6", border: "1px solid #f6d4e2", borderRadius: 8 }}>
          <div style={{ fontSize: 9, color: "#e11d48", letterSpacing: ".1em", marginBottom: 4 }}>META-AUDIT</div>
          <div style={{ fontSize: 11, color: "#6b6c64", lineHeight: 1.5 }}>
            Hermes hit-rate <b style={{ color: "#3c3e50" }}>88%</b> at medium confidence. Proposing medium→high promotion.
          </div>
        </div>
      )}
    </div>
  );
}

function RuntimeRow({ label, val, ok }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0efea" }}>
      <span style={{ fontSize: 11, color: "#6b6c64" }}>{label}</span>
      <span style={{ fontSize: 10.5, color: ok ? "#059669" : "#a8a99f", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: ok ? "#059669" : "#c4c5bc" }} />
        {val}
      </span>
    </div>
  );
}
