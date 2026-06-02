# Wisprflow Brand Forensics

> Sourced from: HTML inspection, Webflow blog case study, rebrand article (wisprflow.ai/rebrand), and web search.
> Last updated: 2026-06-01

---

## Typefaces

### Display / Heading
**EB Garamond** — classic, high-contrast editorial serif with humanistic quirks in numerals and punctuation.
- Source: Google Fonts (free, variable weight available)
- Weights in use: Regular (400) for display headlines; likely Italic for expressive subheadings
- Role: Brand expressiveness — "adds warmth and personality"

### Body / UI
**Figtree** — geometric sans-serif with clean modernism.
- Source: Google Fonts (free)
- Weights in use: Regular (400) and Medium/SemiBold (500–600) for UI copy
- Role: Product UI, body copy, navigation — "brings clean modernism"

### Pairing logic
Editorial serif headlines on light cream ground, Figtree for all supporting text. The contrast is intentional — "less SaaS dashboard, more editorial Sunday."

---

## Color Tokens (hex values)

> Note: Wisprflow does not publish a public style guide with hex values. The values below are **inferred from visual inspection references, the Webflow blog case study, and cross-referenced design descriptions**. Colors marked [unconfirmed] are best estimates; colors marked [confirmed-description] have textual confirmation of hue but no exact hex.

### Background
| Token name | Description | Value |
|---|---|---|
| `--color-bg-base` | Warm cream / ivory page background | ~`#FAF7F2` [unconfirmed — warm off-white, not pure #FFF] |
| `--color-bg-surface` | Card / section surface | ~`#F5F1EA` [unconfirmed] |

### Primary accent — Lavender / Purple ("Pulse")
| Token name | Description | Value |
|---|---|---|
| `--color-accent-primary` | Lavender/purple — CTA buttons, links, highlights | ~`#A89CFF` or `#B3A8FF` [unconfirmed — confirmed as lavender-purple, no exact hex] |
| `--color-accent-soft` | Softer lavender tint for hover states | ~`#EAE7FF` [unconfirmed] |

### Green — announcement banner and social proof strip ("Lumen" or sage)
| Token name | Description | Value |
|---|---|---|
| `--color-green-dark` | Dark forest green — announcement banner background, social proof strip | ~`#1A3025` or `#1E3B2A` [unconfirmed — visually confirmed as dark forest green, no exact hex] |
| `--color-green-accent` | Sage/medium green — CTAs, checkmarks, "calm vitality" accents | ~`#4A7C59` [unconfirmed] |

### Text
| Token name | Description | Value |
|---|---|---|
| `--color-text-primary` | Near-black body text on cream | ~`#1C1A17` [unconfirmed] |
| `--color-text-muted` | Secondary/muted text | ~`#6B6460` [unconfirmed] |
| `--color-text-on-dark` | Text on dark green banner | ~`#F5F1EA` (cream reversed) [unconfirmed] |

### Named palette anchors (from rebrand article — no hex given)
- **"Lumen"** — described as bringing warmth and optimism; likely the cream/ivory background anchor
- **"Pulse"** — described as bringing contrast; likely the lavender/purple accent anchor

---

## Animation Libraries

The site is built on **Webflow** (confirmed — assets served from `cdn.prod.website-files.com`).

| Library | Status | Evidence |
|---|---|---|
| **GSAP** (GreenSock) | Likely — present via Webflow | Webflow's Interactions system natively integrates GSAP for scroll-triggered animations, SplitText, and staggers. Wisprflow's rebrand describes scroll behaviors and hover states consistent with GSAP Webflow interactions. |
| **Lottie** | Possible | Webflow supports Lottie playback via GSAP. Waveform bar animations could be implemented as Lottie files. |
| **Rive** | Possible | Webflow's Interactions also supports Rive. The circular rotating text hero could be a Rive animation or CSS/SVG. |
| **Framer Motion** | Unlikely | Framer Motion is React-specific; Webflow sites don't use it. |
| Custom CSS/SVG | Likely for circular text | Rotating circular text in the hero is commonly implemented with SVG `textPath` + CSS animation or GSAP rotation — no external library required. |

**Summary:** GSAP (via Webflow Interactions) is the most likely animation engine. Waveform bars are either Lottie or custom CSS keyframe animations. Circular text is likely SVG textPath + CSS/GSAP rotation. No Rive confirmed but plausible.

---

## CSS Custom Properties / Spacing

> Webflow compiles its Variables system to CSS custom properties. The Wisprflow CSS is served minified from `cdn.prod.website-files.com` and returns 403 on direct fetch — exact property names are unconfirmed. The following are inferred from visual/editorial descriptions.

| Property | Inferred value | Basis |
|---|---|---|
| `--radius-base` | `12px` or `16px` | "Soft corners and gentle curves" — editorial aesthetic typically uses 12–20px radius |
| `--radius-card` | `16px` or `20px` | Cards appear rounded, not sharp |
| `--spacing-section` | `80px` or `96px` | "Generous whitespace and wide margins" |
| `--spacing-column-gap` | `40px` or `48px` | "Spacious two-column layouts" |
| `--font-display` | `'EB Garamond', Georgia, serif` | Confirmed typeface |
| `--font-body` | `'Figtree', system-ui, sans-serif` | Confirmed typeface |

All values are **unconfirmed** — browser DevTools inspection required for exact values.

---

## Motion Patterns

| Pattern | Location | Implementation (inferred) |
|---|---|---|
| Rotating circular text | Hero section | SVG `<textPath>` on a circle element + CSS `animation: rotate` or GSAP rotation tween |
| Animated waveform bars | Hero section (listening state) | CSS keyframe animation or Lottie — vertical bars scaling up/down with staggered delays |
| Scroll-triggered fade-ins | Section reveals | GSAP ScrollTrigger (via Webflow Interactions) — "slow fades create emotional pacing" |
| Hover microinteractions | Buttons, cards | CSS transitions + Webflow hover states — "subtle microinteractions" |
| Text stagger reveals | Headings | GSAP SplitText or Webflow's built-in text animation — consistent with Webflow GSAP integration |

Rebrand explicitly names: "scroll behaviors, hover states, slow fades" as core to the motion system. Hero animation described as the hardest single design challenge — "conveying the power of Flow in seconds."

---

## Notes for Connecta Token Mapping

### Direct token mappings (rename and use)
- **Typography:** EB Garamond → `--font-display` directly maps to Connecta's serif slot. Figtree → `--font-body` maps cleanly.
- **Border radius:** Soft, generous radius (est. 12–20px) maps to Connecta's `--radius-base`. If Connecta uses 8px, bump to 12px or 16px.
- **Spacing:** Wide margins and generous whitespace — if Connecta's base spacing unit is 4px, Wisprflow likely uses 5px or 6px base (20–24px for comfortable padding).

### Colors needing adaptation
- **Cream background:** Wisprflow's warm cream (`~#FAF7F2`) is warmer than most design system defaults (`#F9FAFB`). If Connecta uses `--color-bg` mapped to pure white or cool gray, shift the hue toward warm (add ~5–10 points of yellow).
- **Lavender accent:** Lavender-purple is an unusual primary accent for SaaS. Map to Connecta's `--color-accent` or `--color-primary`. Ensure contrast against cream meets WCAG AA (lavender on cream needs careful tuning — aim for 4.5:1 with text).
- **Dark green:** Used only for high-contrast announcement strips/banners — not a primary brand color. Map to a `--color-surface-inverse` or dedicated `--color-banner-bg` token rather than the primary palette.
- **Sage green:** Secondary accent for CTAs and checkmarks. Could map to `--color-success` or a separate `--color-accent-secondary`.

### Naming conventions observed
- Wisprflow uses poetic/emotional color names ("Lumen", "Pulse") rather than semantic names ("primary", "accent") — suggests their internal Figma variables may use custom collection names. For Connecta, keep semantic names and add aliases if needed.

### What to verify with DevTools
1. Exact hex values for cream background and lavender accent
2. Whether EB Garamond is loaded via Google Fonts CDN or self-hosted
3. Exact `border-radius` on cards and buttons
4. Whether Rive `.riv` files appear in network requests (confirms Rive usage)
5. Whether `gsap` appears in script src URLs (confirms GSAP)
