# Systemix → DESIGN.md Schema Mapping

**Date**: 2026-04-28 | **Researcher**: nw-researcher (Nova) | **Confidence**: Medium-High | **Sources**: 8

> Mapping the Systemix SPIKE 2 token/component schema (finalized 2026-04-25) and the SPIKE 3 PostHog evidence-write-back loop onto Google Labs' DESIGN.md spec (open-sourced 2026-04-21 under Apache 2.0).

---

## 1. Spec Summary

DESIGN.md is "a format specification for describing a visual identity to coding agents" — a single markdown file pairing YAML frontmatter (machine-readable design tokens) with prose body sections (human-readable rationale and application rules) ([google-labs-code/design.md README](https://github.com/google-labs-code/design.md)). It was open-sourced by Google Labs on April 21, 2026, detached from the Stitch product so any coding agent on any platform can consume it ([Google blog announcement](https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/); [the-decoder coverage](https://the-decoder.com/googles-open-source-design-md-gives-ai-agents-a-prompt-ready-blueprint-for-brand-consistent-design/)).

The format is currently at `version: alpha` and is "under active development. Expect changes to the format as it matures" (README, quoted via WebFetch 2026-04-28). The frontmatter normatively encodes colors, typography, rounded (radii), spacing, and components; the prose body explains *why* values exist and *how* to apply them. The README states: "Tokens give agents exact values. Prose tells them why those values exist and how to apply them" — a clean separation that is structurally similar to Systemix's `value` (authoritative code value) plus prose context model.

DESIGN.md is intentionally narrow: it describes a *visual identity*, not a design-system *operations* layer. It has no provisions for telemetry, parity tracking, code paths, Figma references, or temporal metadata (confirmed via direct query of `docs/spec.md`).

---

## 2. DESIGN.md Frontmatter Schema Reference

Source: [docs/spec.md](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md), retrieved 2026-04-28.

```yaml
version:     <string>                      # optional, current: "alpha"
name:        <string>                      # required
description: <string>                      # optional
colors:      map<string, Color>            # hex "#…" in sRGB
typography:  map<string, Typography>       # fontFamily, fontSize, fontWeight,
                                           # lineHeight, letterSpacing,
                                           # fontFeature, fontVariation
rounded:     map<string, Dimension>        # px | em | rem
spacing:     map<string, Dimension|number>
components:  map<string, map<string, string>>
```

**Component property whitelist**: `backgroundColor`, `textColor`, `typography`, `rounded`, `padding`, `size`, `height`, `width`. Variants are expressed via naming convention (`button-primary-hover`).

**Token reference syntax**: `{colors.primary}`, `{typography.label-md}`, `{rounded.md}` — curly-brace dot-paths, resolvable only inside `components`.

**Unknown-content rules** (the de-facto extension contract):

| Case | Behavior |
|---|---|
| Unknown section heading | Preserve; do not error |
| Unknown color/typography token | Accept if structurally valid |
| Unknown component property | Accept with warning |
| Unknown spacing value | Accept; store as string if not a valid dimension |
| Duplicate section heading | Error; reject file |

---

## 3. DESIGN.md Body Sections

The spec mandates the following H2 sections, in order, omittable but not reorderable ([docs/spec.md](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)):

1. Overview (also seen as "Brand & Style" in [`examples/atmospheric-glass`](https://github.com/google-labs-code/design.md/blob/main/examples/atmospheric-glass/DESIGN.md))
2. Colors
3. Typography
4. Layout (also "Layout & Spacing")
5. Elevation & Depth
6. Shapes
7. Components
8. Do's and Don'ts

Note: that's **8** spec-mandated sections, not 9. The user's brief referenced "9 markdown sections" — likely conflating the spec's 8 with community add-ons such as "Responsive Behavior" and "Agent Prompt Guide" found in the [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) collection. Flagging as a discrepancy worth confirming with the brief author.

---

## 4. Extension Mechanism

**The spec is silent on a formal extension namespace.** There is no `x-*:` convention, no `extensions:` block, no `meta:` envelope. Confirmed via direct read of `docs/spec.md` and the README.

What the spec *does* offer is a **liberal preservation policy**: unknown headings, tokens, and component properties survive a round-trip through a conformant consumer. This is forward-compatibility-by-tolerance rather than by contract. The practical implications:

- A custom field added at the root of frontmatter (e.g., `x-systemix:` or `evidence-posthog:`) is **not addressed** by the spec. There is no rule guaranteeing root-level unknown keys will be preserved by all consumers — the preservation rules are scoped to *known sections* (sections, tokens within `colors`/`typography`, properties within `components`).
- Unknown component properties are explicitly tolerated with a warning, which is the closest the spec comes to a formal extension hook for component metadata.
- The community has begun extending via additional H2 sections (e.g., "Agent Prompt Guide", "Responsive Behavior" in the VoltAgent collection), relying on the "preserve unknown sections" rule.

**Recommended Systemix convention** (since the spec does not prescribe one): namespace all Systemix-specific keys under `x-systemix:` at the root of frontmatter, and add a single H2 body section `## Production Evidence` for Hermes-written prose. Rationale: (a) `x-*` is the prevailing prefix for forward-compatible extensions across markup standards (RFC 6648 deprecates the convention as a *requirement* but it remains the de-facto pattern), (b) a single root key contains the blast radius, (c) "Production Evidence" as an H2 falls under the spec's "Preserve unknown headings" rule and is therefore the safest body extension. Open issue: this is not endorsed by the spec — see Round-trip Risks.

---

## 5. Token Mapping Table

Systemix token file: `/contract/tokens/{name}.mdx`.

| Systemix field | Classification | DESIGN.md target | Note |
|---|---|---|---|
| `token` | NATIVE | The map key under `colors:` / `typography:` / `rounded:` / `spacing:` | DESIGN.md identifies tokens by their position in the typed map, not by an explicit `token:` field. |
| `value` | NATIVE | The map value (hex, dimension, typography object) | Authoritative per Systemix; matches DESIGN.md's "tokens are the normative values" stance ([README](https://github.com/google-labs-code/design.md)). |
| `figma-value` | EXTENSION | `x-systemix.figma-value` (frontmatter root) | DESIGN.md has no concept of a parallel design-tool value. Not preservation-guaranteed by spec. |
| `status` (`clean\|drifted\|missing-in-figma`) | EXTENSION | `x-systemix.status` | DESIGN.md's `diff` CLI computes drift between two DESIGN.md files but stores no status field on the token itself. Systemix's status is *between* code and Figma, which DESIGN.md does not model. |
| `resolved` (boolean) | EXTENSION | `x-systemix.resolved` | No analog in spec. |
| `source` (`css\|figma\|manual`) | EXTENSION | `x-systemix.source` | No analog. DESIGN.md is source-agnostic; assumes the file *is* the source. |
| `collection` | REFRAMED | Implicit via the typed map (`colors.brand.*`) or H2 sub-grouping in the prose body | DESIGN.md groups by token *type*, not by arbitrary collection. Trade-off: lose Figma-collection grouping unless mirrored in naming. |
| `last-updated` | EXTENSION | `x-systemix.last-updated` | Spec has no temporal metadata. |
| `last-resolver` (`human\|hermes\|null`) | EXTENSION | `x-systemix.last-resolver` | No analog. |
| `evidence-posthog` | EXTENSION | `x-systemix.evidence-posthog` | See Section 7 — strategic field. |

**Aggregation note**: DESIGN.md is one file per *system*, not one file per token. Systemix's per-token MDX files map to *entries* in a single DESIGN.md, not to separate DESIGN.md files. This is the largest structural impedance mismatch.

---

## 6. Component Mapping Table

Systemix component file: `/contract/components/{name}.mdx`.

| Systemix field | Classification | DESIGN.md target | Note |
|---|---|---|---|
| `component` | NATIVE | Map key under `components:` | E.g., `button-primary`. |
| `path` (codebase path) | EXTENSION | `x-systemix.components.{name}.path` OR unknown property under the component | Spec property whitelist excludes `path`. "Unknown component property: Accept with warning" applies — survives, but emits warnings in conformant consumers. |
| `figma-node` | EXTENSION | Same as above | No native field. |
| `storybook-story` | EXTENSION | Same as above | No native field. |
| `parity` (`clean\|drifted\|missing`) | EXTENSION | `x-systemix.components.{name}.parity` | DESIGN.md's `diff` CLI compares DESIGN.md files but does not store per-component parity state. |
| `last-screenshot` (ISO date) | EXTENSION | `x-systemix.components.{name}.last-screenshot` | No native temporal/visual-evidence concept. |
| `usage-count-30d` | EXTENSION | `x-systemix.components.{name}.usage-count-30d` | See Section 7. |

**Variant handling**: Systemix likely models variants as separate component files (e.g., `button.mdx` + `button-primary.mdx`) or as a `variants:` field. DESIGN.md models variants as separate map entries (`button-primary`, `button-primary-hover`) under `components:`, sharing a naming prefix. This is REFRAMED for any nested variant model.

---

## 7. Evidence (Axis C) Mapping — Strategic

This is the wedge. The Systemix evidence-write-back loop (SPIKE 3, completed 2026-04-25) has three artefacts that need a home:

**(a) `evidence-posthog` block** — structured 30d event counts by component+variant+size, captured via `posthog.capture('component_render', {component, variant, size})`.

**(b) `posthog-event-key`** — stable identifier for forward-compatible component renames.

**(c) "## Production Evidence" prose section** — Hermes-authored summary of PostHog query results.

| Artefact | Classification | DESIGN.md target | Rationale |
|---|---|---|---|
| `evidence-posthog` (per-component) | EXTENSION | `x-systemix.components.{name}.evidence-posthog` | Spec has no telemetry primitive. Putting it under a single root `x-systemix` key (rather than scattering as unknown component properties) avoids polluting the linter warning stream. |
| `posthog-event-key` | EXTENSION | `x-systemix.components.{name}.posthog-event-key` | Stable identity for renames. Critical for the rename-survival property. |
| "## Production Evidence" prose | NATIVE-via-tolerance | New H2 body section after "Components" | Falls under the spec's "Unknown section heading: Preserve; do not error" rule — the safest extension surface DESIGN.md offers. |

**Why this matters strategically**: the prose section is the *only* extension that has an explicit spec guarantee ("preserve, do not error"). The frontmatter `x-systemix.*` block has no such guarantee — it relies on YAML parsers preserving unknown root keys, which is conventional but not contractual. **If we want the evidence to be portable, the prose section is the resilient channel; if we want it queryable, the frontmatter is the necessary one.** The pragmatic answer is "both, with the prose section being the source-of-record and frontmatter the index."

This also defines a defensible vocabulary line: DESIGN.md owns "what the visual identity is"; Systemix owns "how the identity behaves under code+production load." The seam is between the two — Production Evidence belongs to Systemix.

---

## 8. Round-trip Risks

What breaks when a third-party consumer (Stitch, v0, shadcn) reads back a DESIGN.md authored by Systemix:

1. **Frontmatter `x-systemix:` block** — *not preservation-guaranteed*. The spec's preservation rules cover unknown *sections* and unknown *tokens within typed maps* and unknown *component properties*. They do **not** explicitly cover unknown *root-level frontmatter keys*. A strict YAML schema validator could reject; a permissive one will keep but ignore. Risk: Medium-High.

2. **Unknown component properties** (e.g., `path`, `figma-node`) — preserved with a warning per spec. Will produce noise in conformant CLIs (`design.md lint`). Risk: Low (works, but noisy).

3. **`## Production Evidence` body section** — explicitly preserved per spec ("Unknown section heading: Preserve; do not error"). Will render correctly in any markdown renderer. Risk: Low.

4. **v0 / Vercel** — v0 does not natively consume DESIGN.md as of the search dates checked (April 2026). v0's design-system path is the [shadcn registry standard](https://v0.app/docs/design-systems) (`tokens.css`, `globals.css`, registry JSON). A DESIGN.md → v0 path requires a *converter*. The spec's `export` CLI converts to Tailwind config and W3C DTCG `tokens.json` ([search results, 2026-04-28](https://github.com/google-labs-code/design.md)), which v0 can adjacently consume — but Systemix `x-*` extensions will be lost in that export step. Risk: High for evidence fidelity through v0.

5. **shadcn** — same story. shadcn registries are the consumption format; DESIGN.md is upstream. Extensions don't survive the bridge. Risk: High for evidence fidelity.

6. **Stitch** — the originating tool. Reasonable to assume best-in-class round-tripping of spec-conformant content; uncertain on `x-*` extensions. Risk: Unknown — needs empirical test.

7. **`alpha` versioning** — the README explicitly warns "Expect changes to the format as it matures." Anything we author today may need migration. Risk: Medium, mitigated by keeping the Systemix-side schema as the source of record.

8. **Token-level `diff` CLI** — DESIGN.md's `diff` produces token-level drift between two DESIGN.md files. It does *not* understand `x-systemix.status`, so Systemix's drift-vs-Figma signal is invisible to the official tooling. Acceptable: drift-vs-Figma is a Systemix concern, not a DESIGN.md concern.

---

## 9. Recommendation: **PARTIAL**

**Adopt DESIGN.md as the canonical carrier for the visual-identity layer (tokens + components + prose rationale). Keep the SPIKE 2 schema as the source of record for the operations layer (parity, status, evidence, telemetry, code paths, Figma refs).**

### What goes into DESIGN.md (NATIVE)
- All token values, names, types
- All component definitions (within the property whitelist)
- All eight body sections — with Systemix-authored prose
- A ninth body section: `## Production Evidence` (Hermes-written from PostHog)

### What stays in SPIKE 2 schema (the operations sidecar)
- `status`, `parity`, `resolved`, `source`, `last-updated`, `last-resolver`
- `figma-value`, `figma-node`, `storybook-story`, `path`, `last-screenshot`
- `evidence-posthog` structured data, `posthog-event-key`, `usage-count-30d`

### Why PARTIAL, not GO
Three driving fields make GO premature:
1. **`evidence-posthog`** — the wedge field. Putting it inside `x-systemix:` with no spec-guaranteed preservation makes the most strategically valuable Systemix data the most fragile under round-trip.
2. **`figma-value`** — DESIGN.md has no model of "the design tool's value vs the code's value." Systemix's drift-vs-Figma signal lives entirely outside the spec.
3. **`alpha` version status** — the README's own warning that the format will change makes betting the operations layer on it an unforced risk. The visual-identity layer is stable enough to bet on; the operations layer is not.

### Why PARTIAL, not HOLD
1. The visual-identity portion of DESIGN.md is well-specified, has Apache 2.0 governance, and is gaining traction (5.2k stars in 72 hours per [the-decoder](https://the-decoder.com/googles-open-source-design-md-gives-ai-agents-a-prompt-ready-blueprint-for-brand-consistent-design/)).
3. Authoring DESIGN.md now buys interop with Stitch and any future v0/shadcn ingestion, with effectively zero downside since the SPIKE 2 schema remains authoritative for the fields DESIGN.md doesn't cover.
4. The prose `## Production Evidence` section is preservation-guaranteed and is the strongest story for "Systemix-defined vocabulary that survives in third-party tools."

### The boundary
The seam is at the row level of the SPIKE 2 schema. SPIKE 2 stays the source of record. A bidirectional generator emits DESIGN.md from SPIKE 2 (one-way for now; reverse only if a non-Systemix tool authors a DESIGN.md we want to ingest). Hermes' PostHog query continues to write back to SPIKE 2; the DESIGN.md emission picks up the latest evidence on each generation.

---

## 10. Open Questions

1. **Section count discrepancy**: brief says 9 sections, spec defines 8. Confirm whether the brief author intended the 8 spec sections + a Systemix-added 9th (likely `## Production Evidence`), or whether they're counting a community convention (e.g., "Responsive Behavior") as native.
2. **Root-level frontmatter preservation**: the spec is silent on whether unknown *root* keys (like `x-systemix:`) are preservation-guaranteed by conformant consumers. A small experiment — author a DESIGN.md with `x-systemix: {test: true}`, run it through `design.md lint`, `diff`, and `export` — would settle this in one afternoon.
3. **Stitch round-trip behavior**: empirical question. Does Stitch preserve `x-systemix:` and `## Production Evidence` when it reads and re-writes a DESIGN.md? Cannot answer from sources.
4. **W3C DTCG export fidelity**: the `export` CLI converts to DTCG tokens.json. What does it do with `x-systemix.evidence-posthog`? Likely drops, but worth confirming if v0/shadcn ingestion via DTCG is a path we care about.
5. **Component variant model**: how does Systemix model variants today (separate files? nested array? property?). This determines how clean the REFRAMED mapping in Section 6 actually is.
6. **MDX vs MD**: Systemix files are `.mdx`; DESIGN.md is `.md`. MDX-specific syntax (JSX components inline) won't survive in a DESIGN.md emission. Confirm Systemix isn't relying on MDX features in the *contract* layer.
7. **CLI compatibility**: would Systemix want to depend on `@google/design.md` CLI for lint/diff/export, or maintain its own? The npm install issues and Windows binary-naming bugs in the open-issues list suggest the tooling is not yet production-grade.

---

## Source Analysis

| Source | Domain | Reputation | Type | Access Date | Cross-verified |
|---|---|---|---|---|---|
| google-labs-code/design.md README | github.com | High | Official | 2026-04-28 | Y |
| google-labs-code/design.md docs/spec.md | github.com | High | Official | 2026-04-28 | Y |
| google-labs-code/design.md examples/atmospheric-glass | github.com | High | Official | 2026-04-28 | Y |
| google-labs-code/design.md issues | github.com | High | Official | 2026-04-28 | N (read-only signal) |
| Google blog announcement | blog.google | High | Official | 2026-04-28 | Y (referenced in 5+ press) |
| the-decoder.com coverage | the-decoder.com | Medium-High | Industry reporting | 2026-04-28 | Y (cross-refs Google blog) |
| VoltAgent/awesome-design-md | github.com | Medium | Community | 2026-04-28 | N (treated as community signal only) |
| v0.app/docs/design-systems | v0.app | Medium-High | Vendor docs | 2026-04-28 | N (WebFetch denied; used search snippets only) |

Reputation: High: 5 (62%) | Medium-High: 2 (25%) | Medium: 1 (13%). Average ~0.9.

## Knowledge Gaps

1. **Live spec text not directly readable in some attempts** — WebFetch was denied for several URLs (Google blog, designmd.app, the-decoder, pasqualepillitteri). Compensated by WebSearch summaries plus successful WebFetch on the canonical GitHub spec. Risk: snippet summaries from search results may slightly distort emphasis.
2. **No direct read of `schema/` directory** — returned 404. Cannot confirm whether a JSON Schema with `additionalProperties` rules exists. The text spec is the only authoritative artifact verified.
3. **v0 docs inaccessible directly** — relied on community discussion threads ("V0 to respect existing tokens + components") and the search-result excerpt of the v0 docs page. Conclusion that v0 does not natively read DESIGN.md is *negative-evidence*: no source mentions v0 importing DESIGN.md. A direct read of [v0.app/docs/design-systems](https://v0.app/docs/design-systems) by a human would harden this.
4. **Stitch's behavior with `x-*` extensions** — purely theoretical. No empirical data.

---

## Full Citations

[1] Google Labs. "design.md — A format specification for describing a visual identity to coding agents." GitHub. https://github.com/google-labs-code/design.md. Accessed 2026-04-28.
[2] Google Labs. "DESIGN.md spec." GitHub. https://github.com/google-labs-code/design.md/blob/main/docs/spec.md. Accessed 2026-04-28.
[3] Google Labs. "examples/atmospheric-glass/DESIGN.md." GitHub. https://github.com/google-labs-code/design.md/blob/main/examples/atmospheric-glass/DESIGN.md. Accessed 2026-04-28.
[4] Google. "Stitch's DESIGN.md format is now open-source so you can use it across platforms." The Keyword. 2026-04-21. https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-design-md/. Accessed 2026-04-28.
[5] The Decoder. "Google's open-source DESIGN.md gives AI agents a prompt-ready blueprint for brand-consistent design." 2026. https://the-decoder.com/googles-open-source-design-md-gives-ai-agents-a-prompt-ready-blueprint-for-brand-consistent-design/. Accessed 2026-04-28.
[6] VoltAgent. "awesome-design-md." GitHub. https://github.com/VoltAgent/awesome-design-md. Accessed 2026-04-28.
[7] Vercel. "Design systems — v0 Docs." https://v0.app/docs/design-systems. Accessed 2026-04-28 (via search snippets).
[8] Pillitteri, P. "Google Stitch Open-Sources DESIGN.md." 2026. https://pasqualepillitteri.it/en/news/1251/google-stitch-design-md-open-source-spec-2026. Accessed 2026-04-28 (via search snippets).
