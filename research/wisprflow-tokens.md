# Wisprflow Brand Tokens — CONFIRMED (exact)

> Source: `flowsite-dev.webflow.shared.1505e0e4e.min.css` (`:root` variables), provided 2026-06-02.
> **Supersedes the inferred values in `wisprflow-brand.md`** (which guessed `#A89CFF` lavender / `#FAF7F2` cream — both wrong). These are the real Webflow Variables.

## Named base palette
| Token | Hex | Read |
|---|---|---|
| `base-color--lumen` | `#ffffeb` | Warm **ivory** ground (not white; yellow-tinted) |
| `base-color--lumen-dark` | `#e4e4d0` | Darker ivory surface |
| `base-color--vast` | `#1a1a1a` | Near-black (text, dark ground) |
| `base-color--dawn` | `#f0d7ff` | Soft **lavender/lilac** — secondary bg + links (NOT a loud CTA) |
| `base-color--pulse` | `#7f1c34` | **Wine** — error-dark / serious accent |
| `base-color--fathom` | `#034f46` | Dark **teal-green** |
| `base-color--glow` | `#ffa946` | **Amber** highlight |
| `base-color--white` | `#fff` | Pure white |

Neutral ramp: `#000 · #111 · #222 · #444 · #666 · #aaa · #ccc · #eee · #fff`.

## System colors
| Role | Light | Dark |
|---|---|---|
| success | `#cef5ca` | `#114e0b` |
| warning | `#fcf8d8` | `#5e5515` |
| error | `#f8e4e4` | `#7f1c34` (= Pulse) |
| focus | `#2d62ff` | — |

## Semantic mapping (selected)
- text: primary→Vast · secondary→Lumen · tertiary→Dawn · alternate→White
- background: secondary→**Dawn (lavender)** · tertiary→Vast · alternate→White
- link: primary→**Dawn** · secondary→Vast
- border: primary `#1a1a1a4d` (Vast 30%) · secondary→Vast
- **Alpha system:** `--alpha--light--{2,5,10,15,30,50,70,90}` (Lumen-based) and `--alpha--dark--{…}` (Vast-based). Two grounds, layered tints — this is how Wisprflow gets depth without extra colors.

## Typography
- **Display / primary:** `EB Garamond` (editorial serif)
- **Body:** `Figtree`
- **Mono:** `IBM Plex Mono` / `Monaspace Neon`
- Scale (rem): h1 `7.5` (120px) · h1-small `6` · h2-big `4.6875` · h2 `4` · h3 `3` · h4 `2` · h5 `1.25` · h6 `1` · body xlarge `1.5` · large `1.25` · large-medium `1.375` · medium `1.125` · regular `1` · small `.875` · xsmall `.8125`

## Spacing & radius (editorial, generous)
- **Section radius:** x-tiny `1rem` · tiny `2rem` · small `2.5rem` · regular `3rem` · medium `4rem` · large `5rem` (16–80px)
- **Spacers:** medium `1.5rem` · large `3rem` · xx-huge `10rem`
- **Section paddings:** medium `6rem` · large `8rem` · x-large `10rem` · padding xx-huge `14rem` (96–224px)

## Design rationale (what to borrow)
1. **Warm ivory ground, not white** — `#ffffeb` sets a calm, paper-like editorial tone.
2. **Lavender is gentle** — Dawn is a soft secondary surface + link tint, never a shouty button.
3. **Few colors, deep accents** — wine (Pulse) + teal-green (Fathom) carry "serious"; amber (Glow) warms. Depth comes from the **alpha tint system**, not more hues.
4. **Big editorial type** — 120px serif H1 (EB Garamond) over clean Figtree body.
5. **Airy spacing + soft, large radii** — 96–224px section paddings, 16–80px radii.
6. **Light-only** — no dark theme ships; a dark mode must be derived (Vast ground + Lumen text via the alpha ramps).
