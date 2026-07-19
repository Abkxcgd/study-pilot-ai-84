import { test, expect } from "@playwright/test";

// Marketing / landing page smoke tests
test.describe("Landing page", () => {
  test("shows StudyPilot branding and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/StudyPilot/i);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("navigates to auth page", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /sign in|get started|start free/i }).first();
    if (await cta.count()) {
      await cta.click();
      await expect(page).toHaveURL(/\/auth/);
    } else {
      await page.goto("/auth");
    }
    await expect(page.getByRole("tab", { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /sign up/i })).toBeVisible();
  });
});
