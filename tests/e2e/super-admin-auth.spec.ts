import { test, expect } from "@playwright/test";
import { resetTestDatabase, E2E_SEED } from "./utils/db";

test.describe("Super Admin auth E2E", () => {
  test.beforeEach(async () => {
    await resetTestDatabase();
  });

  test("SA user lands on /super-admin and sees welcome message", async ({ page }) => {
    await page.goto("/app");

    await page.getByTestId("login-email").fill(E2E_SEED.superAdmin.email);
    await page.getByTestId("login-password").fill(E2E_SEED.superAdmin.password);
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/super-admin/);
    await expect(page.getByText(`Bienvenido, ${E2E_SEED.superAdmin.name}`)).toBeVisible();
  });

  test("store admin is rejected from /super-admin", async ({ page }) => {
    await page.goto("/app");

    await page.getByTestId("login-email").fill(E2E_SEED.admin.email);
    await page.getByTestId("login-password").fill(E2E_SEED.admin.password);
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/app/);

    await page.goto("/super-admin");

    await expect(page.getByText("403 — Acceso restringido")).toBeVisible();
  });

  test("SA user is redirected from /app to /super-admin", async ({ page }) => {
    await page.goto("/app");

    await page.getByTestId("login-email").fill(E2E_SEED.superAdmin.email);
    await page.getByTestId("login-password").fill(E2E_SEED.superAdmin.password);
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/super-admin/);
  });
});
