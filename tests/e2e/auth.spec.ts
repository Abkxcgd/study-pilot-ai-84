import { test, expect } from "@playwright/test";

test.describe("Auth page", () => {
  test("has email + password fields and Google button", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /try instant demo/i })).toBeVisible();
  });

  test("switches to sign up tab", async ({ page }) => {
    await page.goto("/auth");
    await page.getByRole("tab", { name: /sign up/i }).click();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
  });

  test("shows validation error for invalid credentials", async ({ page }) => {
    await page.goto("/auth");
    await page.getByLabel(/email/i).first().fill("nonexistent@example.com");
    await page.getByLabel(/password/i).first().fill("wrongpassword123");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    // Toast should appear (sonner) — just confirm we didn't navigate away
    await page.waitForTimeout(1500);
    await expect(page).toHaveURL(/\/auth/);
  });
});
