import { expect, type Page } from "@playwright/test";
import { E2E_SEED } from "../utils/db";

export async function loginAsAdmin(page: Page) {
  await page.goto("/app");

  await page.getByTestId("login-email").fill(E2E_SEED.admin.email);
  await page.getByTestId("login-password").fill(E2E_SEED.admin.password);
  await page.getByTestId("login-submit").click();

  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByTestId("nav-pos")).toBeVisible();
}
