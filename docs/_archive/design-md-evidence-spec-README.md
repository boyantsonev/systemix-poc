# design-md-evidence-spec

**A draft extension to Google's DESIGN.md for production-evidence fields.**

DESIGN.md describes what a visual identity *is*. This spec describes what it *did* — which variants shipped, which converted, and what was decided. The evidence lives in the same file so any agent reading the design system also reads its history.

---

## The gap

Google's [DESIGN.md](https://github.com/google-labs-code/design.md) is an open format for describing a visual identity to coding agents. It covers tokens, components, and prose rationale. It does not cover what happened after you shipped.

When you change a button radius, three months later you have no record of why. When you run an A/B test and variant B wins, the result lives in PostHog, the decision lives in Slack, and neither is visible to the next agent that touches the component.

This extension closes that loop.

---

## The extension

Two additions to a DESIGN.md file. Both pass `design.md lint` with zero errors.

### 1. `x-systemix:` frontmatter block

Added at the root of the YAML frontmatter alongside `colors`, `typography`, and `components`. Contains structured operational metadata that a coding agent can query.

```yaml
x-systemix:
  last-updated: "2026-05-01"
  components:
    button-primary:
      posthog-event-key: "btn_primary"
      usage-count-30d: 14823
      evidence-posthog:
        variant_b:
          renders: 9241
          clicks: 831
          conversion_rate: 0.090
        control:
          renders: 5582
          clicks: 387
          conversion_rate: 0.069
```

**Fields:**

| Field | Type | Description |
|---|---|---|
| `last-updated` | ISO date string | When the evidence block was last written |
| `components.<name>.posthog-event-key` | string | Stable identifier — survives component renames |
| `components.<name>.usage-count-30d` | integer | Total renders in the last 30 days |
| `components.<name>.evidence-posthog` | map | Per-variant event counts from PostHog |
| `evidence-posthog.<variant>.renders` | integer | Total render events |
| `evidence-posthog.<variant>.clicks` | integer | Interaction events |
| `evidence-posthog.<variant>.conversion_rate` | float | Downstream conversion rate (0.0–1.0) |

### 2. `## Production Evidence` body section

A new H2 section added after `## Components`. Written in natural language by an agent from PostHog query results. Intended for human review and for coding agents reading the file as context.

```markdown
## Production Evidence

**button-primary** (30d, as of 2026-05-01)

Variant B (rounded, `radius: 6px`) outperformed the control (sharp, `radius: 2px`) across all
segments: +30% click rate, +30% conversion rate. Strongest lift in mobile (375px viewport):
+38% conversion. Decision: promote Variant B. Confidence: 0.91.

Previous experiment (2026-02-14): increased padding from 12px to 16px, +8% click rate,
+3% conversion. Promoted. Confidence: 0.84.
```

---

## Why two channels

The `x-systemix:` block is **queryable** — an agent can extract it, run comparisons, and make decisions from structured data. The `## Production Evidence` section is **resilient** — it is explicitly preserved by the DESIGN.md spec's unknown-section rule, meaning it survives any conformant consumer including Stitch.

| Channel | Queryable | Preservation guarantee | Used for |
|---|---|---|---|
| `x-systemix:` frontmatter | Yes | Conventional (YAML parsers preserve unknown root keys) | Agent queries, decision logic |
| `## Production Evidence` prose | No (full-text only) | Spec-guaranteed ("Unknown section heading: Preserve; do not error") | Human review, LLM context window |

Use both. The prose section is the source-of-record for audits; the frontmatter is the index.

---

## Conformance

Tested against `@google/design.md@0.1.1` (the canonical CLI).

```
$ design.md lint system.DESIGN.md
{ "findings": [
    { "severity": "info", "message": "Design system defines 2 colors, 1 typography scale, ..." }
  ],
  "summary": { "errors": 0, "warnings": 0, "infos": 1 }
}
```

- `x-systemix:` root key — **not flagged** (no warning, no error)
- `## Production Evidence` H2 — **not flagged**
- `design.md diff` between two files with evidence blocks — **no spurious diff signals** (diff is token-level only; evidence is Systemix's concern, not DESIGN.md's)

Full experiment results: [`experiments/design-md/RESULTS.md`](https://github.com/boyantsonev/systemix/blob/main/experiments/design-md/RESULTS.md)

---

## What the evidence loop looks like

```bash
# 1. Init an experiment
/init-experiment button-radius-2026-05

# 2. Ship. Run analytics.

# 3. Pull social signal
npx systemix social-signal \
  --platform linkedin \
  --hypothesis button-radius-2026-05 \
  --impressions 3200 --clicks 91 --replies 14

# 4. After PostHog has enough data, run the growth audit
/growth-audit

# 5. Close the experiment — writes result + decision back to DESIGN.md
/close-experiment button-radius-2026-05
```

The `## Production Evidence` section in your DESIGN.md is updated automatically. The next agent that touches the component sees what you tried and what happened.

---

## What this is not

This is not a dashboard. Dashboards are read-only. This is not a wiki — wikis require a human to remember to write them. This is a contract that writes itself.

The visual-identity layer (tokens, components, rationale) is Google's. The evidence layer (what shipped, what worked, what was decided) is this spec's. The seam is clean.

---

## Reference implementation

[Systemix](https://github.com/boyantsonev/systemix) — an open CLI that implements this spec. It installs the PostHog write-back loop, the `/init-experiment`, `/growth-audit`, and `/close-experiment` Claude Code skills, and the `emit-design-md.ts` generator that keeps your DESIGN.md in sync with the evidence schema.

```bash
npx systemix init
# Select: hypothesis-validation
```

---

## Schema

Full JSON Schema for the `x-systemix:` block: [`schema/x-systemix.json`](./schema/x-systemix.json)

The schema is open. Implement the `## Production Evidence` section and `x-systemix:` block in your own stack, with your own analytics tool, and submit a PR with your implementation notes. The spec is the thing; Systemix is one implementation of it.

---

## Status

Draft. The extension fields are stable for the current experiment cycle. The `x-systemix:` prefix may migrate if the DESIGN.md spec formalises an extension namespace in a future version.

DESIGN.md is currently at `version: alpha`. This spec tracks it. Breaking changes will be versioned.

---

## License

Apache 2.0 — same as DESIGN.md.
