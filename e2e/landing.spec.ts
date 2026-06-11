import { test, expect } from "@playwright/test";

// Smoke for the velocity-gap landing (hypothesis: landing-velocity-gap-2026-06).
// Covers the two things the hypothesis measures: the install-command CTA and
// the Surfaces section — plus the variant_b hero headline.
test.describe("Landing (velocity-gap)", () => {
  test("hero shows the velocity-gap headline + install command", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /you ship every day/i }),
    ).toBeVisible();
    await expect(page.getByText("npx systemix init").first()).toBeVisible();
  });

  test("surfaces section shows Config · System · Atlas", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Three surfaces/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Home →" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open the system →" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open Atlas →" })).toBeVisible();
  });
});
