import { test, expect } from "@playwright/test";

// Protected routes should bounce unauthenticated users to /auth.
const protectedRoutes = [
  "/dashboard",
  "/chat",
  "/notes",
  "/planner",
  "/flashcards",
  "/tasks",
  "/calendar",
  "/analytics",
  "/brain",
];

for (const route of protectedRoutes) {
  test(`protected route ${route} redirects to /auth when signed out`, async ({ page }) => {
    await page.goto(route);
    await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  });
}
