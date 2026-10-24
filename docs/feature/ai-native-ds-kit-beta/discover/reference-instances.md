---
title: "Reference instances — what Vero and the other builds teach the kit"
wave: DISCOVER (desk research)
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: evidence brief (public-safe summary)
note: >
  The reference repos are private (one is a client deliverable). This file keeps only
  patterns and conclusions. The full per-file deep dives were not committed to this public repo.
---

# Reference instances — what the real builds teach the kit

Four builds were studied alongside this repo:

| Instance | Stack | What it proves | Did a loop actually run? |
|---|---|---|---|
| **Vero**: a healthcare design system and the product repo that ships from it | Tamagui on One/Vite + Expo, inside a commercial starter | A DS can be *governed by loops*: dozens of DS releases in two months, a computed DS score taken from 77 to 88, hundreds of recorded decisions, 4 loops modelled as data | **Yes.** Strong on DS quality, thin on user evidence (market experiments stopped far short of their sample size) |
| **Instance B**: a shadcn client prototype (private) | Next 16, React 19, shadcn (Base UI), Tailwind v4, Storybook 10 + MCP | The best *judgement* (design contract, AI-trust primitives, runtime theme axes), but contract and code drifted within two days | **No.** No `design/`, no experiments, no checks |
| **Vero desktop app** (the DS consumer) | Tauri 2 + React + Vite, consuming Vero's source by alias + pinned SHA | How a real product consumes a DS, and how drift hides | Defers to Vero's loop; its own evals measure conformance |
| **AI-Native Path** (public course, 15 lessons) | Static React + serverless + Supabase | A free funnel that already teaches the Systemix loop ("describe intent → ship small → measure → learn") | Its own feedback → HITL → PR loop ran once, then stalled |

**Important:** Vero does **not** use the Systemix CLI, MCP or config at all. It uses Systemix
*conventions* (google-labs DESIGN.md, a docs manifest, experiment MDX, LEARNINGS, queue cards) and
grew its own bespoke skills. **What worked was the method, not the tooling.** The kit should package
the method that demonstrably worked.

## 1. Vero: the five assets that deserve to become the kit

1. **The score loop.** A computed DS score across six dimensions (tokens, components, architecture,
   enforcement, a11y, governance). Three choices keep it honest:
   - debt is measured as burn-downs against a frozen day-one baseline;
   - human caps hold a dimension below the maximum until a person decides what no script can;
   - the weights are calibrated once and pinned by a test.

   The bounded loop runs `ITERATION.md` (the prompt), `BACKLOG.md` (ordered; the loop always takes
   the first open item and never a `human` item) and `LOG.md`. Each iteration measures, acts, runs
   the checks and passes a **fresh-context reviewer** ("cheating? boilerplate?"). The reviewer
   corrected 9 of 12 iterations. The loop may never edit the weights, baselines, ledgers, tests or
   guardrails.
   *This is the mechanism for the paid audit, and for implementation as a service.*
2. **Checkable guardrails with a ledger.** Each rule has a statement, a `Checkable:` line and dated
   evidence. A checker runs allow-lists and count ratchets (counts may only fall) and outputs JSON.
   About a third of Vero's guardrails are domain-free: no AI slop · the page holds still ·
   navigation states what exists · a control announces itself · stacking · a11y · one field per
   fact · autonomy.
3. **Loops as data, plus goals.** One markdown file per loop, written to a grammar and compiled
   to JSON, with typed steps (agent / role / code / world) and gates. **Exactly one `decide` step
   per loop, led by a person.** Roles map to people and deputies in a roster, and the agent's entry
   lists what it may never do (approve, decide, merge unasked, tag). Goals carry evals (checked by ·
   bar · answered at). Context packs (5 sections, an owner, ≤90 lines) feed decision briefs, so a
   deputy can rule.
   - **Product loop:** goal → evals → design → shape → test → score → validate → learn.
   - **Build loop:** plan → hub → system → code → test → review → ship → measure.
   - **Market loop** and **score loop** (above).
4. **Token and doc contracts.**
   - `tokens.css` (oklch) is canonical. A compiler generates `tokens.json` with **contrast
     evidence** (84 pairs, both themes), a DTCG export, and a generated token block inside
     DESIGN.md, with a `--check` mode.
   - A component doc template (with a mandatory accessibility section) feeds a manifest
     (`systemix-docs-manifest/v1`) and a generated `llms.txt`.
   - A ~1-second pre-commit checker set.
5. **The Design Hub.** One surfaces registry drives the menu, page labels, front door and archive.
   - **Floating navbar:** a glass pill that reserves no layout space, so shell prototypes can be
     judged at full height. It opens top-centre on documents, bottom-left on full-bleed prototypes,
     and offset by the rail width on the canonical surface. It is draggable, its position persists,
     and it re-applies the default on navigation only if never dragged.
   - **Archive:** retired surfaces keep rendering, each with *was / why / superseded by*.
   - **Human ↔ Agent view of DESIGN.md:** the human view puts live token specimens under the
     matching headings; the agent view renders the same system as structured data.
   - **Frames registry with a parity eval:** code next to picture, scoring geometry, behaviour,
     copy (≥98%) and pixel share into a scorecard.

**What the hub does not show today**, which is exactly what the App Shell adds: component docs,
context packs, skills, the score, goals, sprints, decisions, the changelog. The data already
exists in files.

**Against the reference "Prototype → Artifacts" model** (About · Screens · States · Handoff ·
Discovery), about 70% of the data exists in Vero, spread across six places, with no per-prototype
page:
- **About** is split across a sprint brief and a goal doc.
- **States** has per-state frames but no state matrix.
- **Handoff** has strong data (binding decisions, component inventory, backend gaps) but no page.
- **Discovery** has lo-fi canvases (not linked to prototypes), a workflow atlas and flows, but
  **no breadboard**.
- **Context** docs exist but are not rendered.

The kit should generalise the frames registry plus the goal artifact list into **one per-prototype
manifest**.

### What the kit must NOT copy from Vero

1. **Any file without a provenance check.** Parts of Vero sit on a commercially licensed starter and
   on upstream code. Move patterns, not files. The kit is a clean rebuild on an MIT-clean stack.
2. **Unbounded narrative files:** a 142 KB CHANGELOG, 81 KB of guardrails, 73 KB of notes, a 32 KB
   DESIGN.md, a 5.5k-line hand-maintained gallery, and counts hand-typed into prose (the component
   count disagrees in four places).
3. **Release habits that let consumers drift:** version numbers reserved by branches, untagged
   releases, consumers pinned to stacks of unmerged PRs.

**Size budgets the kit should enforce in CI:**
- DESIGN.md ≤ 15 KB.
- Core guardrails ≤ 25 KB, with long evidence in `guardrails/evidence/<id>.md`.
- CHANGELOG: the last 10 releases or 60 days; older entries rotate to `changelog/<yyyy-qN>.md`.
- Notes become a deduplicated `traps.md`.
- Counts are interpolated from the manifest, never typed.
- A generated session digest (`design/.state/digest.md`, ≤ 2 KB): version, score, open gates, last
  10 decisions, top learnings.

**Process risk Vero exposes:** the process can outrun the people who gate it. Loops stay in
`draft` and a proposed verdict can wait weeks for a ruling. The kit needs **digest-first HITL**
(one inbox, briefs, deputies) or the loops will stall.

## 2. Instance B (shadcn client prototype): the most reusable AI-native components

- **AI-trust primitives** (rename the product's agent name to an `agentName` prop):
  - an AI badge and rationale, where overriding requires a typed reason;
  - provenance;
  - a confidence interval;
  - a dangerous-action confirmation (typed confirmation above a threshold, plus a delayed-send undo).

  Together with Vero's agent tier (approval card, claim review, citation chip, confidence meter,
  tool steps, uncertainty disclosure), these are the kit's genuinely AI-native blocks.
- **Runtime theme axes:** `data-base`, `data-primary`, `data-font`, `data-radius`, `data-density`
  on `<html>`, typed and stamped before first paint. Also a theme lab with a **live WCAG contrast
  readout**.
- **Agent-readable catalogue:** Storybook 10 with the MCP addon, where `play` tests assert that a
  token actually resolved. The coverage is thin, though: only 3 stories.
- **Prototype conventions:** open decisions become env flags; unbuilt screens render an honest
  "not built" empty state; route groups per role are fed by mock data; a workflow atlas draws the
  AI as a third actor on an **L0–L4 autonomy ladder**.
- **Discovery templates:** a numbered discovery pack, with JTBD + ODI tables, an assumption register
  with owners, IA and journey reviews, a service map, and every claim tagged [STATED] or
  [INFERRED].
- **Its design contract beats Systemix's DESIGN.md template.** It has contrast-measured colours, a
  tabular-numbers rule, an inventory split into copy / compose / build, and a Definition of Done.
- **Drift within 48 hours:**
  - the contract promises DTCG, zod and Recharts, and none is installed;
  - "no dark mode in beta", but dark mode is fully built;
  - the 12 px type floor is broken by `text-[0.65rem]`;
  - the theme-lab direction was never locked.

  *A design-system agent's audit has real work on day one.*

## 3. Vero's desktop app (the consumer): what "where it's used" looks like in practice

- **How it consumes the DS:** it aliases the DS source (tiered source folders) and pins a commit SHA
  in CI. A copy-in fork was rejected because it "defeats Systemix governance".
- **How drift hides:**
  - **Type holes:** an untyped alias collapsed all DS props to `any`, so a component swap failed
    only at runtime.
  - **An ambiguous public surface:** the bundle file looks like the barrel but omits key agent
    components.
  - **Dangling tokens:** a radius variable defined in neither repo makes corners silently come out
    square.
  - **Stale fallbacks:** fallbacks point at the wrong palette.
  - **Version skew:** CI and release pin different DS commits, and neither pins a tag.
- **A working prototype of the paid audit:**
  - a parity script renders hub frames next to the product and scores geometry rules, copy
    coverage and pixel diff, with a "known differences, not design misses" ledger;
  - a vocabulary guard (per-file copy counts may only fall);
  - a type-diagnostics baseline.
- **The only serious AI-native billing design in these builds:**
  - per-device keys;
  - daily usage rows (ASR seconds, composes, LLM calls);
  - a trial defined as an *AI-work allowance* with abuse bounds;
  - a signed offline lease;
  - 401/402 gates;
  - "read-only, never brick";
  - seats.

  Stripe Billing is designed but not built. **Port the model, not the code** (it is domain-bound
  Python/Rust).

## 4. AI-Native Path (public course): a funnel that leads nowhere

A free 15-lesson course on building with Claude: Desktop, Code, Skills, agents and autonomy,
context and cost, MCP, Markdown/MDX/YAML, deploying, measuring with PostHog, and self-improving
loops. Lesson 1 states the Systemix loop word for word; lesson 9 pitches a "design system audit"
with parity checks and token drift; lessons 12 and 14 teach measurement and loops. **Systemix is
mentioned zero times.** It is a ready-made top-of-funnel for the "AI-native builder" audience. (It has no billing or usage features to reuse.)

## 5. Ten divergences the kit must normalize

1. **One token contract.** `design/tokens.css` is canonical, with shadcn-compatible semantic names
   as the required layer and extensions in declared namespaces. DTCG and the DESIGN.md block are
   always generated.
2. **A linter for dangling `var(--x)` references and stale fallbacks.** The consumer's radius bug
   is the demo case.
3. **One DESIGN.md schema and path:** Vero's frontmatter plus Instance B's section skeleton.
4. **One theme-axis vocabulary:** `data-theme`, `data-density`, and optional primary / radius /
   font.
5. **One decision record with ids**, cited by flags and code comments.
6. **A declared public surface (manifest)**, separate from preview bundles and stories.
7. **A consumer lens:** a pinned tag, a local-extension registry, and a parity/drift report.
8. **Two separately named autonomy ladders:** what the AI *in the product* may do (L0–L4), and what
   the *agent* may do to the repo (ghost / assisted / autonomous).
9. **One atlas/workflow schema:** actor plus autonomy.
10. **One layout doc for Systemix itself.** Today CLAUDE.md (v5) and `layout.js` (v6) disagree.

## 6. Implications for the kit

- **Reference stack: Next.js + Tailwind v4 + shadcn, distributed as a registry.**
  - Tailwind v4 reads `tokens.css` directly, so the web needs no generated layer (Vero's biggest
    drift source disappears).
  - Copy-in components fit "you own your DS".
  - Agents are most fluent in this stack.
  - It is MIT-clean, and Systemix and Instance B already use it.
  - Keep Tamagui as a second adapter (token emitter only), with Vero as its proof.
- **Upstream into `systemix init`:**
  - generated tokens with contrast evidence and `--check`;
  - checkable guardrails with a ledger;
  - SCORE.md, a `score` skeleton and `design/loop/`;
  - VERSION and CHANGELOG with rotation;
  - context packs and briefs;
  - goals with evals;
  - the component doc contract, manifest and `llms.txt`;
  - the hub registry and archive;
  - the per-prototype manifest;
  - the pre-commit checker set;
  - size budgets.
- **The audit product already exists in pieces:**
  - Vero's score + bounded loop + reviewer gate;
  - the consumer's parity, vocabulary and type ratchets;
  - Instance B's contrast readout.

  Productize these rather than invent a new scorer.
- **The paid AI-native blocks have a seed:** the consumer's entitlement and usage model, plus
  Instance B's usage-meter preview block.
