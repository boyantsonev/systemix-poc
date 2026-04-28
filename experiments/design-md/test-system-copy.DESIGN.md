---
version: alpha
name: Systemix Preservation Test
description: Probe whether x-systemix root keys and unknown H2 sections survive round-tripping through @google/design.md@0.1.1
colors:
  primary: "#3B82F6"
  surface: "#FFFFFF"
typography:
  body-md:
    fontFamily: "Inter"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
rounded:
  md: "8px"
spacing:
  md: "16px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
x-systemix:
  test-marker: "preservation-test-2026-04-28"
  evidence-posthog:
    button-primary:
      events-30d: 14223
      variants:
        primary:
          events: 9821
          conversion: 0.041
        secondary:
          events: 4402
          conversion: 0.038
---

## Overview

Test system for DESIGN.md preservation behaviour. Authored 2026-04-28 by Systemix Phase B preservation experiment ([SYSTMIX-268](https://linear.app/bastion-labs/issue/SYSTMIX-268)).

## Colors

Primary used for interactive surfaces. Surface is the canonical neutral background.

## Typography

Inter for body text at 16px. Default line-height 24px (1.5x).

## Layout

8px base unit. Spacing tokens are multiples of base.

## Elevation & Depth

N/A in this probe — depth tokens omitted.

## Shapes

Single radius scale: `md` = 8px. Rounded surfaces only.

## Components

`button-primary` inherits the brand primary color and surface text. Padding and radius from base tokens.

## Do's and Don'ts

**Do:** treat this as a synthetic probe.
**Don't:** ship to production.

## Production Evidence

The `button-primary` variant outperforms `secondary` by 7.9% on 14,223 thirty-day events (n=14,223; conversion delta +0.003 absolute, +7.9% relative). The next agent reading this contract should propose the primary variant for new placements unless the brand context contradicts.

> Source: PostHog insight #4421, queried 2026-04-28 by Hermes-3 8B via Ollama.

## Hermes Notes

Authored 2026-04-28 by Hermes-3 8B (Q4_K_M quant) via Ollama. Confidence: high. This section is a deliberate second unknown H2 to probe whether multiple unknown sections survive together.
