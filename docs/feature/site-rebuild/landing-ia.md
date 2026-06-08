# Landing IA — Section Blueprint

**Derives from:** [`positioning.md`](./positioning.md) (story order) and
[`product-model.md`](./product-model.md) (truth). Current landing source:
`src/app/page.tsx` + `src/components/systemix/LandingEvents.tsx`.

Legend: **REUSE** = keep the existing component as-is · **EDIT** = keep but change
copy/props · **NEW** = build new (spec only this round).

---

## Section-by-section

| # | Section | Verdict | Intent / copy direction | Source / build target | PostHog event |
|---|---|---|---|---|---|
| 1 | **Nav** | EDIT | Add a "Layers" link (anchors to §7) alongside Docs/GitHub. | `LandingNav()` in `src/app/page.tsx` | `nav_click` |
| 2 | **Hero** | EDIT | Keep headline. Broaden one subcopy line toward "a local app you install in your repo." Keep `InstallCommand` + Ollama line. | `Hero()` + `InstallCommand`/`NavCTAs` (`LandingEvents.tsx`) | `hero_view`, `install_copy` |
| 3 | **The loop** | REUSE | The circular loop diagram + 5-step walkthrough. Unchanged. | `LoopDiagram()` / `TheLoop()` in `src/app/page.tsx` | `loop_view` |
| 4 | **HITL preview** | REUSE | The glassmorphic decision card. Unchanged. | `HitlPreview()` | `hitl_preview_view` |
| 5 | **Install / setup** | **NEW** | "Install in one command, then it configures the loop to your inputs." Show the flow: `init` → feed **Figma / existing repo / desired UI** → **define hypothesis** → pipeline asks the rest. Render a representative `systemix.config.yaml`. | Build new; ground in `src/lib/state/instance-config.ts`, `systemix.config.yaml`, `packages/cli/` | `setup_view` |
| 6 | **Wears your brand** | **NEW** | "A shadcn shell themed by your design system." Primary color + font pulled from the client DS; prototypes render in your look & feel. Visual = the Connecta-themed shell (reference screenshots). | Build new; see `surfaces-brief.md` theming contract | `brand_view` |
| 7 | **Three layers** | **NEW** | Three cards (Config / System / Atlas) with the canonical one-liners (`positioning.md`) + one visual each. Config visual = the **3D force-directed graph** + settings; System visual = the Fumadocs styleguide; Atlas visual = ReactFlow + persona tabs + inline prototype (reference screenshots). | Build new; visuals per `../systemix-rework/app-three-layers.md` | `layers_view`, `layer_card_click` |
| 8 | **What a hypothesis can be** | EDIT | Recast the 3 example cards around the **three domains** (UI / workflows / landing value props), not three random examples. | `ExperimentTypes()` in `src/app/page.tsx` | `experiment_types_view` |
| 9 | **The stack it connects** | EDIT | Keep the 2-col table; ensure rows = PostHog/Statsig · Ollama (Hermes) · Vercel · MCP · Figma · Social. Light copy edit. | `MagicGlue()` | `stack_view` |
| 10 | **Who it's for** | EDIT | Recast with the **role lens**: Operator / Designer / Engineer (replaces the current "you / your agent" framing). | `UseCases()` | `audience_view` |
| 11 | **Storybook & drift callout** | REUSE | Keep as the collapsed details section. | `StorybookCallout()` | `storybook_callout_expand` |
| 12 | **Quality gate** | REUSE | Evidence-score tiers (≥80 / ≥60 / <60). Unchanged. | `QualityGate()` | `quality_gate_view` |
| 13 | **Bottom CTA** | EDIT | Keep the 3-step quickstart; align step copy with the new setup flow (§5). | `BottomCTA()` | `cta_view`, `cta_click` |
| 14 | **Footer** | REUSE | Unchanged (verify GitHub handle — open question #5). | `LandingFooter()` | — |

## Build-new sections — detail

### §5 Install / setup
- Three input chips: **Figma file**, **Existing repo**, **Desired UI**.
- Then **Define hypothesis** (one field, example: "pre-seed MVP landing tracking").
- Then a muted "the pipeline asks the rest" line.
- Right side: a real `systemix.config.yaml` snippet (surfaces, signals, hermes,
  self_improvement) — copy the shape from the repo's `systemix.config.yaml`.

### §6 Wears your brand
- One sentence + the themed-shell visual. Sub-line: "Atlas renders your prototypes
  in the same theme — no generic viewer."

### §7 Three layers
- 3-card row. Each card: layer name, canonical one-liner, one visual, a
  "Learn more →" link to the matching **Run** doc (`docs-ia.md` → `layers/*`).
- Config card merges the old Config + Graph (settings + 3D force graph). Note Atlas
  is **gated** behind init + DS sync (the card can show a "after your DS syncs" hint).

## Reuse map (carry forward verbatim)
- `src/app/page.tsx`: `LoopDiagram`, `HitlPreview`, `QualityGate`,
  `StorybookCallout`.
- `src/components/systemix/LandingEvents.tsx`: `SectionTrack` (the
  analytics-on-scroll wrapper — every section above wires its event through it),
  `InstallCommand`, `NavCTAs`.
- `ThemeToggle`, `SLogo`.

## Analytics rule
Every section keeps the existing `SectionTrack` IntersectionObserver pattern; the
event names in the table above are the contract. New sections (§5–§7) must register
their events so the loop can measure the rebuild itself.
