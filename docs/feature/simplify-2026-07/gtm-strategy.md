# GTM strategy — the wedge funnel (2026-07-08)

## Positioning (the 12-year-old line)

> Systemix runs little experiments on your website, writes down what it learned
> and why, and suggests the next one — you approve every decision.

One diagram tells the story (Propose → Build → Measure → Learn ↺, two ✋).
The same diagram is on the landing and in the docs — never explain the product
two different ways again.

## ICP

The **agent-shipping founder**: pre-PMF, ships daily with Claude Code, owns the
whole stack alone, and keeps re-deciding things because nothing wrote down why.
Secondary: the design engineer whose AI-generated design system is turning to
slop.

## The ladder (locked, flat prices)

| Rung | Price | What it is | Where it converts |
|---|---|---|---|
| Open-source kit | Free | `npx @getsystemix/cli init` — the whole loop, self-serve | GitHub / hero CTA |
| AI-Readiness Report | $149 | done-for-you scored scan of your repo/site | /audit |
| AI Kit | $299 | the loop set up for you; includes the report | /kit |
| Sprint | from $2,500 | 1-week build wired to your signals | scoping call |

Rules that keep it honest:
- **Flat prices, no ranges.** A range reads as "we haven't decided."
- **Each rung rolls into the next** ($149 credits the Kit; Kit credits nothing —
  it's a product, the sprint is a service).
- **Free ≠ crippled.** The open-source kit is the whole loop. Paid = done for
  you, not unlocked features.
- **Design-partner seats** are a note inside the sprint tier (free, limited, in
  exchange for feedback) — not a separate confusing tier.

## Naming fix (shipped)

The free CLI (`npx @getsystemix/cli audit`) and the paid offer were both called "audit."
The paid product is now the **AI-Readiness Report** (route `/audit` unchanged);
the CLI keeps its name because it's the wedge printed everywhere.

## The funnel, mechanically

1. **Wedge:** `npx @getsystemix/cli audit` — free, zero-setup, immediate value in the
   founder's own repo. Every mention everywhere points here.
2. **Proof:** the site dogfoods itself — /experiments shows the live loop,
   /contract/memory shows the notebook. When the first learning lands, that
   page IS the pitch.
3. **Ascend:** free scan finds problems → $149 report scores them → $299 kit
   sets up the fix → $2,500+ sprint does it for you.
4. **Measure the ladder itself** with the loop: each rung has an event
   (`install_command_copied`, `audit-form submit`, `kit_requested`,
   `book_a_call`) — the funnel is an experiment in `experiments/`.

## What we stopped selling

Figma-to-code and design-system sync as headlines. They remain shipped adapters
one line deep in the docs. One product, one diagram, one ladder.

## The honest constraint

Traffic. At ~6 visitors/30d no rung converts and no experiment resolves. The
next GTM work is distribution, not features: ship the first closed learning as
content ("we ran the loop on ourselves, here's what it decided"), the npm
package, and the /kit / report offers in front of communities that already ship
with Claude Code.
