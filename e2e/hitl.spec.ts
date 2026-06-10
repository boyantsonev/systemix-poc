import { test, expect } from "@playwright/test";

// The standalone /queue page retired in the contract rework Phase C — the
// global ops view lives in /config (runtime panel + decision queue), and
// per-contract cards embed in the contract pages themselves.
test("queue lives in config — /queue redirects and the decision queue renders", async ({ page }) => {
  await page.goto("/queue");
  await expect(page).toHaveURL(/\/config$/);
  await expect(page.getByText("Decision queue")).toBeVisible();
});
