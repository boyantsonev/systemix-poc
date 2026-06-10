import { test, expect } from "@playwright/test";

// Smoke: the Atlas surface renders from the generated catalog (Phase-2),
// and the byId prototype route resolves a known workflow.
test.describe("Atlas", () => {
  test("canvas renders with the three persona tabs", async ({ page }) => {
    await page.goto("/atlas");
    await expect(page.getByText("Workflow Atlas")).toBeVisible();
    await expect(page.getByRole("button", { name: "Founder" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Designer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Engineer" })).toBeVisible();
  });

  test("switching persona keeps the canvas mounted", async ({ page }) => {
    await page.goto("/atlas");
    await page.getByRole("button", { name: "Designer" }).click();
    await expect(page.getByText("Workflow Atlas")).toBeVisible();
  });

  test("prototype route resolves a workflow by id", async ({ page }) => {
    const resp = await page.goto("/atlas/p/founder/founder-loop");
    expect(resp?.status()).toBeLessThan(400);
  });
});
