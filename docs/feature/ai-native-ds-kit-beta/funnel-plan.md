# Funnel, payments and the self-improving loop: plan

**Date:** 2026-10-24 · **Status:** DRAFT for the founder. Nothing in §3–§6 is built yet.
**Builds on:** DSC-16 (price ladder), DSC-17/18 (results-file-only quick report), and the two
learnings in `experiments/LEARNINGS.md` (low traffic can't settle A/B tests; one bet per seam).

## 1. The idea in one paragraph

Systemix sells to teams whose AI agents build UI. The promise: **"Find out in five minutes whether
your agents can follow your design system, without sending us your code."** The free scan runs on
the client's machine. A small paid report explains what to fix first. A €499 human-reviewed
audit goes deeper. Fix sprints do the work. Every step records what people did and what they said,
and once a week the engine proposes one change to the site, the report or the offer, based on that
evidence. A human approves every change before it ships.

## 2. Lemon Squeezy, set up without fixing the price

The report service never reads the price. It checks only two things: the license key comes from
**our store**, and from **the quick-report product**. So the price, the number of variants and any
discount can change in the Lemon Squeezy dashboard at any time, with no code change and no deploy.

### Steps

1. **Account and test mode.** Create the Lemon Squeezy account and store, then switch on **Test
   mode** (toggle in the dashboard). Test mode is a separate store with its own products, customers
   and IDs. Everything below happens in test mode first.
2. **Create the product.** Products → New product. Name: "Systemix Quick Report". Type: single
   payment. Price: a placeholder (€19.99 is fine). The price isn't locked in; you can change it later.
3. **Turn on license keys** (in the product's or variant's settings):
   - Activation limit **1**: one key buys one report.
   - No expiry.
   - A "3 reports" bundle later is just a second variant with limit 3. No code change.
4. **Variants for price tests (optional).** Add variants at different prices, for example €9.99 and
   €19.99. Keys from any variant of this product are accepted. Lemon Squeezy may also offer "pay
   what you want" with a minimum; check the pricing panel. I could not confirm it today.
5. **Tax.** Lemon Squeezy is the merchant of record, so it collects and pays EU VAT. Decide whether
   the shown price includes VAT. For EU buyers it usually should.
6. **Copy two IDs:**
   - The **store ID** (Settings → Stores).
   - The **product ID** (Products → the product's menu → copy ID).
7. **Test locally, not on a Vercel preview.** A preview may have deployment protection, which would
   block the CLI. Put this in `.env.local`:

   ```
   SYSTEMIX_REPORT_ACCESS=lemonsqueezy
   LEMONSQUEEZY_STORE_ID=<test store id>
   LEMONSQUEEZY_PRODUCT_ID=<test product id>
   ```

   Then:
   - Run `npm run dev`.
   - Buy the product with the test card `4242 4242 4242 4242`.
   - Run `SYSTEMIX_REPORT_SERVICE=http://localhost:3001 npx @getsystemix/cli audit report --dirs src --key <key> --yes`.
   - Run it a second time with the same key. It must be refused.
8. **Go live.**
   - Activate the store (Lemon Squeezy's identity check).
   - Create or copy the product in live mode. **The live IDs differ from the test IDs.**
   - Set the three variables on Vercel **Production**.
   - Redeploy. Vercel applies new environment variables only on the next deploy.

### What it costs per report

Third-party sources put Lemon Squeezy's fee at about 5% + $0.50 per sale; check the official
pricing page. The report itself costs close to nothing: no model call, one short server function.
So the floor price that still makes money is about €2–3. **€4.99–€19.99 is the useful range to
test.** The price is mostly a signal: a paid report is the cheapest real commitment for the G1
gate (money moved, not stated intent).

### Risk

Stripe owns Lemon Squeezy and is building its own merchant-of-record product (Managed Payments,
in public preview since early 2026). All the payment code is in one file
(`src/lib/report-access.ts`), so switching provider later is contained.

## 3. Problems on the site today

- **The site shows the old prices:** a €99 kit and a €249 audit (`src/lib/landing/content.ts`,
  `src/app/audit/page.tsx`). That contradicts DSC-16 (€19.99 quick report, €499 audit).
- **There is no way to buy the quick report.** No page, no checkout link. The CLI's refusal message
  says "buy a quick report" but gives no address.
- **Every conversion is a `mailto:` link.** PostHog sees the click, not whether an email was sent.
- **We only see the top of the funnel.** PostHog events today: `section_viewed`,
  `install_command_copied`, `hero_cta_click`, `audit_requested`. Nothing after the install command.

## 4. The funnel

| Step | What the visitor does | Signal (PostHog event) |
|---|---|---|
| 1. Land | reads the promise | `$pageview`, `section_viewed` |
| 2. Try free | copies the scan command | `install_command_copied` |
| 3. Preview | runs the scan and sees their score | `report_previewed` (server: score band only) |
| 4. Buy | buys the quick report | `checkout_clicked`, then `report_purchased` (Lemon Squeezy webhook) |
| 5. Get the report | the CLI posts the results file | `report_delivered` / `report_refused` (server) |
| 6. Rate it | answers "was this useful?" | `report_feedback` (rating + optional text) |
| 7. Go deeper | requests the €499 audit | `audit_requested` (a real form, not mailto) |
| 8. Fix | books a sprint | `sprint_requested` |

**Decision for you: what is free?** Recommended: the free tier gives the **overall score**, and
paying unlocks the caveats and recommendations. Seeing a score is the hook. Today everything is
behind the key, so we learn nothing from people who don't pay.

**Privacy stays as promised.** Server-side events carry the score band, the file-count band and
the price variant. They carry no paths, no repo names, and nothing from the results file beyond
those bands.

## 5. Feedback and signals

1. **Feedback at the end of the report.** Each report ends with a link:
   `getsystemix.vercel.app/feedback?r=<report id>`. One click for useful or not useful, a text box,
   and a "this recommendation was wrong" option per caveat. This is the strongest signal we'll have.
2. **PostHog surveys** on the site:
   - On `/audit` and the pricing section: "What's stopping you?" (exit intent).
   - After a purchase: "What made you buy?"
3. **The interview gate still matters most.** At about 100 visitors a month, A/B tests won't
   settle anything (learning from 2026-07-10). Written feedback, purchases and interviews will move
   decisions; percentages won't. The plan is built so a single sale or a single complaint is
   already usable evidence.

## 6. The self-improving loop

The engine already exists: the weekly `/propose-experiment` cron, approval cards on Home, and
`LEARNINGS.md`. What's missing is the new signals, so the plan is to feed it, not build a new agent.

- **Inputs, weekly:**
  - The PostHog funnel numbers from §4.
  - The feedback text from §5.
  - Lemon Squeezy sales by variant.
  - Learnings and goals.
- **What it may propose** (one bet a week, always as an approval card):
  - Site copy and layout changes. These ship through `/write-variants` and a PR.
  - Rewrites of a recommendation sentence that feedback flagged
    (`packages/cli/src/lib/quick-report-recommendations.json`).
  - A price-variant test (you change the price in Lemon Squeezy; no code).
  - A new survey question.
- **What it may never do alone:**
  - Change how the score is calculated (the rubric).
  - Change the privacy promise.
  - Change a price.
  - Change its own skills or rules.

  These always need your approval. Rubric changes also need a version bump, so old and new
  scores are never compared.
- **New goal:** `quick-report-sales`, to replace or join `consultancy-leads`. Success: the first
  10 paid reports with at least 60% "useful". Kill-if: 300 scan previews and no sale → the problem
  is the offer, not the funnel.

## 7. Build order (each step is a small PR)

1. **Prices in one place.** Correct the site to the new ladder. The quick-report price and checkout
   link come from settings, and the page says "coming soon / get notified" while no checkout link
   is set. The CLI's refusal message gives the buy link.
2. **Server-side funnel events** from `/api/report` (bands only), plus the `report_previewed` free
   score (once you decide §4).
3. **Feedback page and the report footer link.** PostHog surveys come after that.
4. **Lemon Squeezy webhook → `report_purchased`.** This needs a signing secret in Vercel.
5. **Feed the engine:** the new goal, plus funnel and feedback in `systemix propose context`.

## Open decisions for the founder

- What is free: the overall score (recommended), or nothing?
- The first price to show: one price, or two variants at once?
- Does the €499 audit get a real request form and a deposit through Lemon Squeezy, or stay a call?
- Who reads the weekly approval card, and on which day?
