---
title: "Two presentations, one source — Design Hub + App Shell (IA draft)"
wave: DESIGN (early draft — written ahead of DISCUSS so the IA can be tested in interviews)
feature: ai-native-ds-kit-beta
date: 2026-10-11
status: DRAFT · not a decision · supersedes nothing until an ADR is accepted
inputs: discover/market-landscape.md §1 (Design Studio teardown), discover/reference-instances.md §1 (Vero hub), discover/current-state.md (packages/app)
---

# Two presentations, one source

The AI-native design system kit renders the **same files** two ways:

| | **Design Hub** | **App Shell** |
|---|---|---|
| Job | *Show* the system: the canonical surface first, then the tools | *Work in* the system: browse, review, approve, build |
| Audience | stakeholders, clients, the public, an audit buyer | the builder (designer / design engineer / founder) and their agent |
| Chrome | **floating navbar**: a glass pill that reserves no layout space, so full-bleed prototypes are judged at true height | **app shell**: icon rail → scoped resource tree → typed canvas |
| Mode | read-mostly; static export (deployable anywhere) | local and interactive (`systemix app`); writes only through the HITL queue |
| Where it runs | `systemix hub build` → static site (e.g. the Systemix site *is* its own hub) | `systemix app` → localhost, served by the CLI |
| Origin | Vero's `/design-hub` (proven) | Design Studio's IA (MIT reference) + Systemix's evidence layer |

**Rule: one content graph, two layouts.** Both layouts read the same registry and files. The Hub is a
static build of a subset of the App Shell's routes with different chrome; it is not a second app.
This is a consolidation, not an eighth surface: it replaces the dashboard parts of `src/app` and
grows `packages/app`.

---

## 1. The content graph (what both layouts read)

```
design/                       SYSTEM (the design system as an object; required)
  DESIGN.md                   google-labs DESIGN.md spec + evidence/decision extensions (≤15 KB)
  tokens.css                  canonical (oklch) → generated tokens.json (+contrast) · tokens.dtcg.json
  guardrails.mdx              checkable rules (≤25 KB) · guardrails/evidence/<id>.md
  context/*.md                context packs (owner, ≤90 lines)        ┐
  skills → .claude/skills/    scoped skills (system / prototype)      ┘ "Instructions"
  components/*.md             doc contract (+a11y) → manifest.json + llms.txt  ┐
  assets/ (fonts, icons, images, provenance)                                    ┘ "Toolkit"
  SCORE.md · VERSION · CHANGELOG.md (rotated) · decisions/ · loops/            "Health / Evidence"
  hub.json                    surfaces registry (front door, menu, labels, archive)
prototypes/<slug>/            PROTOTYPES (the unit of evidence)
  prototype.yaml              systemId · owner · status · route(s) · artifacts[] · hypothesis · metric
  about.md · handoff.md · discovery/{context.md, breadboard.excalidraw, flow.mermaid, lofi.tsx}
  (screens and states are routes in YOUR app, behind a flag, measured, not a sandbox copy)
experiments/                  EVIDENCE: <id>.mdx · LEARNINGS.md · goals/
.systemix/queue.json          the ONE human-in-the-loop queue
```

**Interop by design:**
- Import from Design Studio: `systems/<name>/{context,skills}` → `design/`, and `meta.json` →
  `prototype.yaml`.
- Export as a shadcn `registry:base`.
- Be consumable by Claude Design `/design-sync` and v0 DS import.

## 2. App Shell IA

### Global: the icon rail
`[logo] · Search (⌘K) · Inbox · Systems · Prototypes · Evidence · Docs`, with
`· Settings · Theme · Autonomy` at the bottom.

- **Inbox** (the buddy) is the default landing page. It holds HITL cards (proposals, close-proposals,
  write-backs, audit findings), each with a brief, plus a "what next?" line. Approving or rejecting
  goes through the one approval path (`systemix queue …`).
- **Autonomy** shows the instance's dial (ghost / assisted / autonomous). Self-modification is
  always HITL.

### System (scoped tree)
```
Product · Default system                         [⋯]
Resources                                  [search][collapse]
  Overview
  Instructions
    Context            (+)   ← design/context/*.md
    Skills             (+)   ← scoped SKILL.md frontmatter
    Guardrails               ← checkable rules + ledger status
  Theme
    Colors · Typography · Radius · Shadows · Spacing · Motion · Effects · Density · Other tokens
  Assets
    Fonts · Icons · Images                       (with provenance)
  Components
    Avatar · Badge · Button · … · AI-native ▸ Approval card · Tool steps · Citations · Usage meter · …
  Health
    Score · Decisions · Changelog
```

**System Overview: four cards.** The first three are Design Studio's; the fourth is Systemix's
difference.
1. **Instructions:** counts of context docs, skills and checkable guardrails, plus an
   *agent-readiness* line (DESIGN.md valid · manifest fresh · llms.txt generated). Empty state:
   "Bring in your product's terminology, workflows and requirements."
2. **Toolkit:** counts of components, theme tokens and local assets; a one-sentence character of the
   system; colour modes and density modes.
3. **Where it's used:** active prototypes (owner, status) and consuming apps (pinned version or tag).
   *Drift* shows when a consumer lags.
4. **Evidence:** score and trend (`SCORE.md`), open experiments, the last decisions with their
   reasons, the top learnings, and the last loop run. **This is "what we learned", not just "where
   it's used".**

**Component page:** purpose · upstream docs link · when to use (and when *not*) · live examples
(named) · props · states · accessibility (6 labels) · **decisions** (which experiments and decisions
touched this component, and why) · guardrails that apply · where it's used.

**Token page:** grouped rows of swatch · token · role · value (oklch) · contrast pair and ratio ·
*why* (link to the decision, if any).

### Prototype (scoped tree)
```
Feedback Inbox                                   [⋯]
System · Product ↗
Artifacts                                  [search][collapse][+]
  About this prototype          (about.md: problem · who · assumptions · open questions)
  Hypothesis & metric           (prototype.yaml → experiments/<id>.mdx)   ← Systemix
  App
    Overview · Inbox · Detail                     (live routes)
  States
    Inbox ▸ Open · Empty · No matches · New · Validation error · Row menu · Delete confirmation
    Detail ▸ Edit
  Discovery
    Lo-fi · Breadboard · Flow · Project context
  Handoff                       (generated: components used · tokens · decisions · gaps · states checklist)
  Measure                       (events per state · linked insight · results)   ← Systemix
  Decision                      (ruling + confidence + write-back diff)          ← Systemix
```

**Canvas:** renders by artifact type.
- Live route in an iframe (state via query param).
- Doc with an "On this page" TOC.
- Excalidraw canvas and Mermaid flow.
- **Compare mode:** picture vs code parity, from Vero's frames eval.
- **State matrix:** every state of every screen in a grid, with missing states flagged.

**What makes it different from Design Studio:** prototypes live *in your product* (routes behind a
flag, instrumented), not in a sandbox. Every prototype is a **bet** with a hypothesis, a measure and
a decision, and the decision writes back into the system through the HITL queue. "Where it's used"
becomes "what we learned".

## 3. Design Hub IA (static, floating navbar)

- **Front door:** the canonical surface first, then tools (from `hub.json`, as in Vero).
- **Floating navbar** (from Vero):
  - glass pill, `position: fixed`, no layout space;
  - opens top-centre on documents, bottom-left on full-bleed prototypes, offset by the rail width
    on shell surfaces;
  - draggable, with the position persisted; re-applies the default on navigation only if never
    dragged;
  - contents: logo, page label (longest-prefix match on the registry) and **one** menu (system ·
    prototypes · archive · view: theme / density).
- **Pages:**
  - **DESIGN.md** with a **Human ↔ Agent** toggle: live specimens under the matching headings vs the
    structured data view.
  - **Tokens:** specimens and contrast table.
  - **Components gallery:** generated from docs + previews, never hand-maintained.
  - **Prototypes:** public subset.
  - **Archive:** retired surfaces keep rendering, each with *was / why / superseded by*.
  - **Evidence:** public learnings and the decision log; opt-in per item.
- **Audit report delivery:** a paid audit report is a private Hub build, with score, findings,
  before/after and plan. The report *is* a Design Hub page, which shows the product while selling it.

## 4. Build notes

- **Stack:** keep `packages/app`'s Vite SPA + local server (it already reads instance files). Add a
  static export target for the Hub. Reference instance components are shadcn + Tailwind v4.
- **Server:** the App Shell server exposes read endpoints plus `POST /queue/:id/{approve,reject}`,
  which calls the CLI's single approval path. There are no other write endpoints.
- **Generated, not maintained:** gallery, counts, manifest, `llms.txt`, digest. Size budgets fail CI.
- **Registry-driven:** menu, labels, front door and archive are all views of `hub.json` and the
  manifests (Vero's lesson: three hand lists drifted apart).
- **First slice (to test in interviews):** System Overview with the four cards, plus one component
  page and one prototype with About / States / Hypothesis / Decision, on Systemix's own DS.
