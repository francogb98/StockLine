import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./fixtures/auth";
import { makeCategoryData } from "./utils/factories";
import { prisma, resetTestDatabase, E2E_SEED } from "./utils/db";

test.describe("Category E2E", () => {
  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();
    await loginAsAdmin(page);
  });

  test("crear categoria y validar en DB", async ({ page }) => {
    const category = makeCategoryData();

    await page.getByTestId("nav-stock").click();
    await page.getByTestId("open-category-dialog-btn").click();
    await page.getByTestId("create-category-btn").click();

    await page.getByLabel("Nombre").fill(category.name);
    await page.getByLabel("Descripción (opcional)").fill(category.description);
    await page.getByRole("button", { name: "Crear categoría" }).click();

    await expect(page.getByText("Categoría creada")).toBeVisible();
    await expect(page.getByText(category.name)).toBeVisible();

    const categoryInDb = await prisma.category.findFirst({
      where: {
        name: category.name,
        storeId: E2E_SEED.store.id,
      },
    });

    expect(categoryInDb).toBeTruthy();
  });
});
