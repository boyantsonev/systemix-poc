# Pricing & packaging reorg — the €99 download (unbuilt)

## The new ladder (copy shipped this pass)

| Tier | Price | What | Delivery today |
|---|---|---|---|
| Free | €0 | every skill, ghost mode | `npx @getsystemix/cli init` (real) |
| **Full Kit** | **€99** | the whole context engine to download | **mailto → manual** (no checkout, no gate) |
| Readiness Audit | €249 | automated me-in-the-loop audit, 24–48h | mailto → human runs the skill |
| Consultancy | Custom | 2-week discovery + implementation sprint | mailto |

## The gating reality (why €99-as-a-download is a real build)

There is **zero gating today**:
- `packages/cli/package.json` is MIT, `publishConfig.access: public`, `files: [bin, src, pipelines, templates]` — **every skill ships in the public npm tarball.**
- `npx @getsystemix/cli init` vends ~24 skills by plain file-copy; `npx @getsystemix/cli add <x>` pulls the rest. The only "free vs paid" line is which pipelines `init` copies — trivially bypassable.
- No license key, no auth, no entitlement check anywhere (the one "gate" is a UI render-condition on the 3D graph, not payment).
- The Kit "purchase" is a `mailto:`.

So a paid **download** needs a real distribution boundary that doesn't exist yet.

## The model (decided): sell convenience, not code-DRM

You **cannot** meaningfully DRM the engine — it's MIT and the skills are inert markdown (the open-core literature is blunt about this; the Meetily precedent shows "Pro" features that are already in the MIT tree leak immediately). So don't try. **Gate convenience + service, not the code:**

- The **free** tier is genuinely the whole engine (every skill, `npx @getsystemix/cli init`). Never crippled.
- The **€99 Kit** sells *packaging + setup + updates + delivery*: the whole thing assembled, configured, and delivered as one download you own — you pay to not stitch it together yourself, and to get lifetime updates.
- The **€249 audit + consultancy** sell *labor* (a human running the readiness audit / wiring your instance) — naturally gated by payment, nothing to DRM.

## Delivery rail: LemonSqueezy (Merchant-of-Record)

For EUR pricing from the EU, **LemonSqueezy** is the pick: it's a Merchant-of-Record (collects + remits EU VAT/GST for you — the single biggest reason over plain Stripe), has built-in **license-key** generation + a validation API, ~3.5% + €0.30 per sale (vs Gumroad's flat 10%), and a developer-friendly REST API. Flow: checkout → license key + signed download URL → (optional) CLI key validation.

## The reorg (mechanically clean, when the split is built)

Skills are isolated, self-contained directories grouped by pipeline with manifests — easy to split:

1. **De-dupe first:** `figma`, `tokens`, `drift-report`, `check-parity`, `contract-query`, `sync-to-figma` exist in both `design-system` and `figma-to-code` on disk — collapse to one copy referenced by both manifests.
2. **Assemble the Kit artifact:** the design-system + figma-to-code pipelines + templates + app setup, zipped as the paid download. Keep it **out of the public npm `files` array** so it isn't free in the tarball; the free loop skills + `design-audit` stay public.
3. **Deliver via LemonSqueezy:** on purchase, the signed download URL serves the zip; the license key gates lifetime-update re-downloads. A CLI key check before `add`-ing Kit pipelines is optional **friction, not DRM** (the markdown is copyable — that's fine; you're selling the convenience).

## The code seam (shipped)

`src/lib/landing/content.ts` now exports `KIT_CHECKOUT_URL` / `AUDIT_CHECKOUT_URL`, defaulting to the existing mailto. Flipping to LemonSqueezy is a **one-line change per constant** once the products exist. `/kit`'s buy buttons already read `KIT_CHECKOUT_URL`.

## Interim honesty

Until the store + zip split exist: `/kit` copy says "download, pay once", but fulfillment is the `kit_requested` mailto → **deliver the artifact by hand**. Don't promise instant automated download beyond what a same-day email honors.

## Founder's external action

Create the LemonSqueezy store + two products (Full Kit €99, AI-Readiness Audit €249), configure license keys for the Kit, then paste the buy URLs into `KIT_CHECKOUT_URL` / `AUDIT_CHECKOUT_URL`.
