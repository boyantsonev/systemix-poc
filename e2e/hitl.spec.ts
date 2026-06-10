import { test, expect } from "@playwright/test";

// Smoke: the HITL decision queue surface renders. (The queue may be empty;
// this asserts the page itself loads, not a specific card.)
test("decision queue (HITL) page renders", async ({ page }) => {
  await page.goto("/queue");
  await expect(
    page.getByRole("heading", { name: "Decision Queue" }),
  ).toBeVisible();
});
