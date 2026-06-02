# Connecta Design System — Revamp Plan (Wisprflow rationale × Connecta DS)

> The "separate plan task": analyse the **confirmed** Wisprflow tokens (`wisprflow-tokens.md`) against **Connecta's current design system** (`connecta-current-state.md`), and define how to tweak/revamp Connecta with Wisprflow's editorial design rationale — **without losing Connecta's playful, K-12-appropriate energy.**
>
> This refines `connecta-tamagui-theme.md` (which used inferred values) and feeds the `tamagui.config.ts` implementation (#9). The tasks below are tracked as GitHub issues (label `connecta-ds`, milestone M1).

## The two systems, side by side

| Dimension | Connecta (current) | Wisprflow (confirmed) |
|---|---|---|
| Ground | `paper #FFFFFF` (pure white) | `Lumen #ffffeb` (warm ivory) |
| Text near-black | `ink #0F1A24` (blue-black) | `Vast #1a1a1a` (neutral) |
| Primary | `coral #F35F49` (energetic CTA) | — (no coral) |
| Energetic highlight | `lime #DEFB50` | `Glow #ffa946` (amber) |
| Soft secondary | — | `Dawn #f0d7ff` (lavender) |
| Deep "alert" | `plum #571B32` (wine) | `Pulse #7f1c34` (wine) ⟵ **near-identical** |
| Deep green | `olive #424F1A` | `Fathom #034f46` (teal-green) |
| Display font | DM Sans (one family) | **EB Garamond** serif |
| Body font | DM Sans | **Figtree** |
| Mono | JetBrains Mono | IBM Plex Mono |
| Radius | 4–28px (component) | 16–80px (section, editorial) |
| Spacing | 8pt (4–96px) | 96–224px section paddings |
| Dark mode | none | none (light-only) |

**The happy surprise:** Connecta and Wisprflow already share a deep-accent structure — Connecta's **plum ≈ Pulse** (wine alert) and **olive ≈ Fathom** (deep green). The merge is less of a collision than expected; mostly it's *adopting Wisprflow's calm ground + editorial type + airiness* onto Connecta's energetic core.

## Revamp decisions (per dimension)

1. **Ground → warm ivory.** Replace `paper #FFFFFF` with `Lumen #ffffeb` as the base background; `lumen-dark #e4e4d0` for surfaces. Keeps K-12 warmth, gains editorial calm.
2. **Text.** Keep Connecta `ink #0F1A24` (brand warmth + identity) as primary text on ivory — it reads near-black and is more "Connecta" than neutral Vast. (Open: adopt Vast `#1a1a1a` for stricter neutrality — minor.)
3. **Primary stays coral**, darkened to `#C9442F` for full WCAG AA on ivory (decision E). Coral is Connecta's equity and differentiates it from Wisprflow.
4. **Adopt Dawn lavender `#f0d7ff`** as a soft secondary surface + link/focus tint — this is the single biggest "Wisprflow calm" injection. Never a CTA.
5. **Lime stays** as Connecta's fill-only energetic highlight (its identity); Glow amber is *not* adopted (lime fills the warm-highlight role).
6. **Align deep accents:** `plum → Pulse` semantics (wine = alert/serious), `olive → Fathom` semantics (deep green = success/grounded). Pick whether to keep Connecta's exact hexes or shift toward Wisprflow's — recommend keep Connecta's (close enough, preserves identity).
7. **Typography → editorial pairing:** **EB Garamond** display + **Figtree** body (replace DM Sans; Figtree is a close cousin). Keep JetBrains Mono (or adopt IBM Plex Mono). Adopt a larger display scale for landing heroes.
8. **Radius:** keep Connecta's component scale but soften the default to 16px; **add a section-radius scale** (32–80px) for the editorial landing cards/sections.
9. **Spacing:** keep 8pt for components; **add generous section paddings** (96–224px) for the airy landing rhythm.
10. **Alpha tint system:** adopt Wisprflow's two-ground alpha ramps (ivory-based + ink-based at 2–90%) — this is how depth is achieved with few colors.
11. **Dark mode:** derive a Connecta dark theme (Wisprflow ships none) — Vast/ink ground + ivory text via the alpha ramps. New work.

## Net identity
**Connecta, calmer.** Coral + lime energy on a warm ivory editorial ground, with EB Garamond gravitas, soft lavender secondary, aligned wine/green deep accents, and airy spacing. Playful enough for K-12; refined enough to feel intentional.

## Task breakdown (→ GitHub issues, `connecta-ds`)
- **R1 Color system** — merge named palettes (Lumen/Vast/Dawn/Pulse/Fathom/Glow × coral/lime/plum/olive/ink) into the final Connecta token set + alpha ramps.
- **R2 Typography** — EB Garamond + Figtree + mono; editorial display scale; replace DM Sans.
- **R3 Ground & surfaces** — ivory ground + Dawn lavender tints; retire pure-white paper.
- **R4 Radius & spacing** — soften default radius, add section-radius + section-padding scales.
- **R5 Dark mode** — derive inverse tokens (Connecta ships none today).
- These feed **#9** (`tamagui.config.ts`) and **#10** (docs/styleguide).

## Figma variable-sync canvas (for #9)
The Tamagui base UI kit (Figma **Connecta Base Design System — Tamagui v1.2.1**, fileKey `xUmpx0VCvIpdQIkYkgK4AO`) is the **un-themed template** (Inter, standard tokens) — it's the canvas where the revamped Connecta variables get defined and **synced to code** via `/sync-to-figma` ↔ `/tokens`. It is *not* a source of brand hex (those come from `wisprflow-tokens.md` + Connecta's codebase). Old token-bridge file `h1m7dfFILe1wGSfxwQ6U02` is superseded for the Connecta theme.
