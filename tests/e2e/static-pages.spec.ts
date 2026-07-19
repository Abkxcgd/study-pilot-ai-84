import { test, expect } from "@playwright/test";

test.describe("Static content pages", () => {
  for (const path of ["/about", "/privacy", "/terms"]) {
    test(`${path} renders`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading").first()).toBeVisible();
    });
  }
});
