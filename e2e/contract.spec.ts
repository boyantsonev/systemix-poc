import { test, expect } from "@playwright/test";

// Phase A of the contract rework (docs/feature/contract-rework/): the /system
// Fumadocs surface is re-rooted to /contract, with redirects preserving old URLs.
test.describe("Contract surface", () => {
  test("/contract renders the root contract with the goals index", async ({ page }) => {
    await page.goto("/contract");
    await expect(page.getByRole("heading", { name: "The Contract" })).toBeVisible();
    // The given-statement only renders inside the GoalsIndex card (the goal
    // title itself also appears in the sidebar + next-page footer).
    await expect(
      page.getByText("Build a landing page based on the velocity-gap thesis", { exact: false }),
    ).toBeVisible();
  });

  test("a goal page renders with its hypotheses", async ({ page }) => {
    await page.goto("/contract/goals/landing-validation");
    await expect(
      page.getByRole("heading", { name: "Build & validate the landing" }),
    ).toBeVisible();
    await expect(page.getByText("velocity gap", { exact: false }).first()).toBeVisible();
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
