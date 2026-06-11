import { test, expect } from "@playwright/test";

// Home (/config) shows the graph + feed by default; the config editor lives
// behind the gear as a slide-over.
test("home: instance settings open from the gear", async ({ page }) => {
  await page.goto("/config");
  // Default view: the editor is off-canvas — Save config exists but is hidden.
  await expect(page.getByRole("button", { name: "Save config" })).not.toBeInViewport();
  await page.getByRole("button", { name: "Instance settings" }).click();
  await expect(page.getByRole("button", { name: "Save config" })).toBeInViewport();
});
