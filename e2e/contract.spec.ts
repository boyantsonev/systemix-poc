import { test, expect } from "@playwright/test";

// Phase A of the contract rework (docs/feature/contract-rework/): the /system
// Fumadocs surface is re-rooted to /contract, with redirects preserving old URLs.
test.describe("Contract surface", () => {
  test("/contract renders the contract index", async ({ page }) => {
    await page.goto("/contract");
    await expect(page.getByRole("heading", { name: "The Contract" })).toBeVisible();
    await expect(page.getByText("Hypotheses", { exact: true }).first()).toBeVisible();
  });

  test("a record page renders under /contract", async ({ page }) => {
    await page.goto("/contract/tokens/primary");
    await expect(page).toHaveURL(/\/contract\/tokens\/primary/);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("/system redirects to /contract", async ({ page }) => {
    await page.goto("/system");
    await expect(page).toHaveURL(/\/contract$/);
  });

  test("/system deep links redirect to the same record under /contract", async ({ page }) => {
    await page.goto("/system/tokens/primary");
    await expect(page).toHaveURL(/\/contract\/tokens\/primary/);
  });
});
