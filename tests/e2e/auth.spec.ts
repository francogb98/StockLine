import { test, expect } from "@playwright/test";
import { resetTestDatabase, E2E_SEED } from "./utils/db";

test.describe("Auth E2E", () => {
  test.beforeEach(async () => {
    await resetTestDatabase();
  });

  test("login admin redirige a la app", async ({ page }) => {
    await page.goto("/app");

    await page.getByTestId("login-email").fill(E2E_SEED.admin.email);
    await page.getByTestId("login-password").fill(E2E_SEED.admin.password);
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByTestId("nav-pos")).toBeVisible();
  });

  test("rechaza credenciales invalidas", async ({ page }) => {
    await page.goto("/app");

    await page.getByTestId("login-email").fill(E2E_SEED.admin.email);
    await page.getByTestId("login-password").fill("wrong-password");
    await page.getByTestId("login-submit").click();

    await expect(page.getByText("Credenciales inválidas")).toBeVisible();
  });
});
