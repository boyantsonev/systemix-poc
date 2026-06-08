# Systemix — Copy Spec

All copy for the landing page and docs site. Finalized text, ready to paste into components.
Tone: technical but human. Direct. No preamble. Lead with the problem, explain the mechanism, trust the reader.

---

## LANDING PAGE

### 1. Hero

**Headline:**
Your design tokens are lying to your agents.

**Tagline:**
Systemix builds a verified contract between Figma, your codebase, and every AI tool in your workflow — so agents stop hallucinating design decisions.

**Primary CTA (code block):**
```
npx @systemix/init
```

**Secondary CTA:**
Read the docs →

---

### 2. Problem

**Section heading:**
Design systems drift. Agents make it worse.

**Body:**
Figma says `primary` is `#1a56db`. Your CSS says `oklch(0.45 0.18 250)`. Your agent picks whichever it saw last and ships it.

Token values diverge. Component names desync. Nobody owns the gap between design and code — so agents fill it with guesses, and those guesses compound silently until a client notices the wrong button colour in production.

The problem isn't your team. It's that nothing formally owns the contract between your design system's sources of truth.

**Pain point grid (3 columns):**

| | |
|---|---|
| **Figma drift** | Variable collections and CSS tokens diverge without anyone noticing. |
| **Agent hallucination** | LLMs confidently use the wrong token name because your sources disagree. |
| **No audit trail** | When a decision changes, there's no record of why — just a diff no one remembers. |

---

### 3. How it works

**Section heading:**
Four stages. One contract.

**Subtitle:**
Systemix runs a pipeline that turns your scattered design sources into a single, machine-readable contract — with lineage, rationale, and a quality score baked in.

**Stages:**

1. **Ingest**
   Pull tokens, components, and variables from Figma, CSS, and your codebase. Every value is traced to its source.

2. **Reconcile**
   When sources disagree, Systemix applies your rules — not guesses. Code wins, Figma wins, or you decide. Every conflict is logged.

3. **Rationale**
   Decisions are annotated with the why. Deprecated tokens point to their replacements. Agents read the intent, not just the value.

4. **Serve**
   The contract is exposed via MCP. Any agent — Claude Code, Cursor, Copilot — can ask "what is the primary colour?" and get a verified, sourced answer.

---

### 4. Use cases

**Section heading:**
Built for teams where design and code both matter.

**Persona cards:**

**Consultancies managing multiple client themes**
You maintain 8 brands on one design system. Each client has token overrides, custom fonts, and a Figma file that's always slightly out of date. Systemix tracks which tokens are client-specific, which are shared, and flags the moment a shared base token breaks a client theme.

**AI-first product teams**
Your agents write components. They need to know what tokens exist, which are deprecated, and what the GIGO score is before they touch anything. Systemix is the MCP server your agents were waiting for.

**Solo engineers with a design system debt problem**
You've got 200 hardcoded hex values, a Figma file no one fully trusts, and a backlog of "fix the tokens" tickets. Systemix gives you a score, a ranked list of conflicts, and a path to ≥ 90%.

---

### 5. GIGO Score

**Section heading:**
Know before you ship.

**Body:**
GIGO — Garbage In, Garbage Out — is Systemix's quality signal for your contract. It measures how trustworthy your design system data is before it reaches an agent or a CI gate.

**Score tiers:**

- **≥ 90% — Green.** Contract is clean. Agent reads are reliable. Safe to ship.
- **≥ 80% — Amber.** Drifts exist. Agents will encounter ambiguity. Triage recommended.
- **< 80% — Red. Pipeline halts.** Data quality is too low to trust agent decisions. Fix conflicts before proceeding.

The score rises as you resolve conflicts. It drops when sources drift apart. It's a forcing function, not a vanity metric.

---

### 6. Bottom CTA

**Heading:**
Start in three commands.

**Terminal block:**
```bash
npx @systemix/init        # scaffold config + .systemix folder
systemix scan             # ingest sources, build contract.json
systemix serve            # start MCP server on localhost:3845
```

**Subtext:**
Your agent can now ask: "What are the colour tokens?" and get a sourced, versioned answer.

**CTA:** Read the getting started guide →

---

### 7. Footer

**Tagline:** The design contract layer for agents and teams.

**Links:** GitHub · Docs · Linear

**Badge:** Open source

---

## DOCS SITE

### Introduction page (`/docs/introduction`)

**H1:** Introduction

**Tagline:** The design contract layer for your agents.

**What it is:**
Systemix is an open-source tool that builds and maintains a verified contract between your Figma design system, your codebase, and the AI agents working on both. It ingests tokens and components from multiple sources, reconciles conflicts by your rules, annotates decisions with rationale, and serves the result via MCP.

**Who it's for:**
- Design system teams who need agents to understand their token structure
- Consultancies managing multiple client themes on one codebase
- Any team where Figma and code have drifted and agents are making it worse

**The one-liner:**
Agents stop hallucinating design decisions when they have a verified, sourced contract to read from.

**Link grid labels:**
- Quick Install — Up and running in under 5 minutes
- contract.json — How the contract is structured
- GIGO Score — What quality means in Systemix
- Setup Guide — Full walkthrough for your first project

---

### Quick Install (`/docs/quick-install`)

**H1:** Quick Install

**Prerequisites:**
- Node 18 or later
- A codebase with CSS custom properties (or Tailwind tokens)
- A Figma file key (optional for first run)
- Claude Code, Cursor, or any MCP-compatible client

**Steps:**

**Step 1 — Scaffold**
```bash
npx @systemix/init
```
Creates `.systemix/` folder with `systemix.json` config, `tokens.bridge.json`, and `contract.json` (empty).

**Step 2 — Scan**
```bash
systemix scan
```
Ingests your CSS tokens, runs reconciliation, and writes your first `contract.json`. You'll see a GIGO score.

**Step 3 — Serve**
```bash
systemix serve
```
Starts the MCP server on `localhost:3845`. Your agent can now query the contract.

**Expected output after Step 2:**
```
✓ Ingested 47 tokens from globals.css
✓ Ingested 31 variables from Figma (h1m7dfFILe1wGSfxwQ6U02)
⚠  12 conflicts detected — run `systemix drift` to review
GIGO score: 0.82 (amber)
Contract written to .systemix/contract.json
```

**What's next:**
- Read the Setup Guide for a full walkthrough
- Learn about contract.json structure
- Understand your GIGO score

---

### Concept: contract.json (`/docs/concepts/contract`)

**H1:** contract.json

**What it is:**
`contract.json` is the single artifact Systemix produces and maintains. It's a DTCG-extended JSON file that represents the verified state of your design system at a point in time — with every token traced to its source, every conflict recorded, and every decision annotated with rationale.

**Structure:**
```json
{
  "meta": {
    "version": "1.0.0",
    "gigoScore": 0.87,
    "generatedAt": "2026-04-23T12:00:00Z",
    "sources": ["globals.css", "figma:h1m7dfFILe1wGSfxwQ6U02"]
  },
  "tokens": {
    "color.primary": {
      "$type": "color",
      "$value": "oklch(0.45 0.18 250)",
      "source": "codebase",
      "figmaValue": "#1a56db",
      "drift": "drifted",
      "rationale": "Code wins — Figma file hasn't been updated since brand refresh."
    }
  },
  "components": [],
  "rationale": []
}
```

**Key fields:**
- `meta.gigoScore` — contract quality, 0.0–1.0
- `tokens[key].source` — which adapter wrote this value
- `tokens[key].drift` — match | drifted | custom | missing | pending
- `tokens[key].rationale` — why this value was chosen when sources conflicted

**Who reads it:**
The Systemix MCP server reads `contract.json` and exposes it to agents via tool calls. Agents never read raw CSS or Figma — they read the contract.

---

### Concept: GIGO Score (`/docs/concepts/gigo-score`)

**H1:** GIGO Score

**Definition:**
GIGO — Garbage In, Garbage Out — is a 0.0–1.0 quality signal that measures how trustworthy your `contract.json` is. A low score means your sources disagree too much for agents to rely on. A high score means conflicts are resolved and the contract is clean.

**How it's calculated:**
```
GIGO = (resolved_tokens / total_tokens) × source_coverage × completeness
```
- **Resolved tokens:** tokens where drift is `match` or has an explicit rationale decision
- **Source coverage:** what fraction of tokens have both a code and Figma value
- **Completeness:** no `pending` or `missing` tokens above a threshold

**Thresholds:**

| Score | State | Meaning |
|---|---|---|
| ≥ 0.90 | Green | Contract is clean. Safe to use in agent workflows and CI. |
| ≥ 0.80 | Amber | Drifts exist. Agents will encounter ambiguity. Triage recommended. |
| < 0.80 | Red | Pipeline halts. Too much noise for agents to trust. |

**Hard stop:**
If GIGO < 0.80, `systemix serve` will refuse to start until the score is raised. This is intentional — serving a low-quality contract to agents is worse than serving nothing.

**Improving your score:**
- Resolve drift conflicts in the Drift Room
- Connect both a codebase adapter and a Figma adapter
- Clear all `pending` tokens with explicit decisions

---

### Concept: Drift & Reconciliation (`/docs/concepts/drift`)

**H1:** Drift & Reconciliation

**What drift is:**
Drift is any disagreement between what your design sources say a token's value should be. It's not a bug — it's a normal part of working across Figma and code. Systemix makes it visible and manageable.

**Drift types:**

| Type | Meaning |
|---|---|
| `match` | Code and Figma agree. No action needed. |
| `drifted` | Values differ. A decision is required. |
| `custom` | Only in one source (code-only or Figma-only). |
| `missing` | Token referenced in components but not defined. |
| `pending` | Conflict flagged, awaiting a human decision. |

**Reconciliation modes:**
When two sources disagree on a token value, Systemix needs a rule:

- **Code wins** — the CSS/codebase value is authoritative. Figma value is noted but not applied.
- **Figma wins** — the Figma variable is authoritative. Code should be updated to match.
- **HITL** — Human in the loop. A decision card appears in the Drift Room for a human to approve or reject.

**The Drift Room:**
The `/projects/[slug]/drift` view shows all pending HITL decisions. Each card shows the token name, both values, and the source. You approve (pick a winner) or defer (mark for later). Every decision is recorded in the contract's rationale layer.

**Why this matters for agents:**
An agent that reads a `drifted` token without a rationale decision doesn't know which value to use. It will guess. The reconciliation process turns guesses into facts.

---

### Setup Guide (`/docs/guides/setup`)

**H1:** Setup Guide

**Intro:**
This guide walks you through setting up Systemix on a real project — from install to a running MCP server with a GIGO score above 0.80. Estimated time: 20–30 minutes.

**Before you start:**
You'll need:
- Node 18+ installed
- A codebase that uses CSS custom properties (`--color-primary`, etc.) or a Tailwind config
- Optionally: a Figma file key (the part of the URL after `/design/`)
- Claude Code, Cursor, or another MCP client

**Step 1 — Install**
```bash
npx @systemix/init
```
Answer the prompts: project name, codebase path, CSS entry point, Figma file key (optional).

What gets created:
```
.systemix/
  systemix.json       ← config
  contract.json       ← will be populated by scan
  tokens.bridge.json  ← hex/rgba conversion layer for Figma
```

**Step 2 — First scan**
```bash
systemix scan
```
Systemix reads your CSS tokens, fetches Figma variables (if configured), and writes `contract.json`.

Checkpoint: you should see a GIGO score. If it's below 0.80, that's expected — you haven't resolved any conflicts yet.

**Step 3 — Review your drift**
Open the Systemix dashboard or run:
```bash
systemix drift
```
You'll see a list of conflicts. Start with `drifted` tokens — these are the highest-value items to resolve.

For each conflict, choose:
- `code-wins` — your CSS value is right
- `figma-wins` — the Figma variable is right
- `defer` — skip for now

**Step 4 — Raise your score**
Keep resolving conflicts until GIGO ≥ 0.80. Each resolved conflict raises the score. Run `systemix scan` again to recalculate.

**Step 5 — Start the MCP server**
```bash
systemix serve
```
The server starts on `localhost:3845`. Add it to your Claude Code or Cursor config:

```json
{
  "mcpServers": {
    "systemix": {
      "command": "systemix",
      "args": ["serve"],
      "port": 3845
    }
  }
}
```

**Step 6 — Test it**
Ask your agent: *"What are the colour tokens in this design system?"*

It should respond with values sourced from your `contract.json`, not from guessing.

**Next steps:**
- CLI Reference — all `systemix` commands
- contract.json — understand the output format
- GIGO Score — what moves the number
