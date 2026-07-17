import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./fixtures/auth";
import { makeCategoryData, makeProductData } from "./utils/factories";
import { prisma, resetTestDatabase, E2E_SEED } from "./utils/db";

test.describe("Product E2E", () => {
  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();
    await loginAsAdmin(page);
  });

  test("crear producto asociado y validar en DB", async ({ page }) => {
    const category = makeCategoryData();
    const product = makeProductData(category.name);

    await page.getByTestId("nav-stock").click();
    await page.getByTestId("open-category-dialog-btn").click();
    await page.getByTestId("create-category-btn").click();
    await page.getByLabel("Nombre").fill(category.name);
    await page.getByRole("button", { name: "Crear categoría" }).click();
    await expect(page.getByText(category.name)).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByTestId("open-product-dialog-btn").click();

    await page.getByLabel("Código de Barras *").fill(product.barcode);
    await page.getByLabel("Nombre del Producto *").fill(product.name);
    await page.getByLabel("Categoría *").selectOption({ label: category.name });
    await page.getByLabel("Precio de Venta *").fill(String(product.price));
    await page.getByLabel("Costo *").fill(String(product.cost));
    await page.getByLabel("Stock Actual *").fill(String(product.stock));
    await page.getByLabel("Stock Mínimo *").fill(String(product.minStock));

    await page.getByTestId("submit-product-btn").click();

    await expect(
      page.getByTestId(`stock-row-${product.barcode}`),
    ).toContainText(product.name);

    const created = await prisma.product.findUnique({
      where: { barcode: product.barcode },
    });

    expect(created).toBeTruthy();
    expect(created?.storeId).toBe(E2E_SEED.store.id);
    expect(created?.categoryId).toBeTruthy();
  });
});
