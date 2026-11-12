# Acme Notes · design

## Product

Acme Notes is a shared notebook for small teams (2 to 20 people). People open it to write a
note fast, find one later, and share a notebook with a teammate. The paid plans add more
notebooks, history and admin controls.

## People

- **Writers**: everyone on a team. They want the editor out of the way.
- **Admins**: the person who pays. They read the pricing page, the checkout and the settings.

## Principles

1. Calm over clever: one primary action per view, plenty of space, no decoration that moves.
2. Say the price plainly: the period, the currency and what renews, on the same line.
3. The system before the screen: tokens and components from `src/components/ui/` first.

## Colour

Neutral slate for text and surfaces, one brand indigo for the primary action and focus. Red is
for destructive actions only. Colours live in `studio/tokens.css` as reference tokens
(`--ref-*`) and the role tokens that point at them; components use role tokens only.
Pure black is never used: ink comes from the neutral scale.

## Type

The type scale is `--font-size-xs` to `--font-size-2xl`; nothing is set below 12px.

## Voice

Plain, warm, short. Sentence case. No exclamation marks and no emoji in the product. We call
them notes and notebooks, never memos. Links say where they go.

## Claims

We never promise outcomes. No "guaranteed", no "best-in-class", and we do not say "free forever":
the free plan has limits and we name them.
