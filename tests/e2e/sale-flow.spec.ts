import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./fixtures/auth";
import { prisma, resetTestDatabase, E2E_SEED } from "./utils/db";

test.describe("Sale flow E2E", () => {
  test.beforeEach(async ({ page }) => {
    await resetTestDatabase();
    await loginAsAdmin(page);
  });

  test("login -> categoria -> producto -> venta -> stock/db/dashboard", async ({
    page,
  }) => {
    const categoryName = "Bebidas";
    const productName = "Coca Cola";
    const barcode = "7791234500012";

    await page.getByTestId("nav-stock").click();

    await page.getByTestId("open-category-dialog-btn").click();
    await page.getByTestId("create-category-btn").click();
    await page.getByLabel("Nombre").fill(categoryName);
    await page.getByLabel("Descripción (opcional)").fill("Gaseosas y bebidas");
    await page.getByRole("button", { name: "Crear categoría" }).click();

    await expect(page.getByText("Categoría creada")).toBeVisible();
    await expect(page.getByText(categoryName)).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByTestId("open-product-dialog-btn").click();
    await page.getByLabel("Código de Barras *").fill(barcode);
    await page.getByLabel("Nombre del Producto *").fill(productName);
    await page.getByLabel("Categoría *").selectOption({ label: categoryName });
    await page.getByLabel("Precio de Venta *").fill("1000");
    await page.getByLabel("Costo *").fill("700");
    await page.getByLabel("Stock Actual *").fill("10");
    await page.getByLabel("Stock Mínimo *").fill("2");
    await page.getByTestId("submit-product-btn").click();

    await expect(page.getByTestId(`stock-row-${barcode}`)).toContainText(
      productName,
    );

    await page.getByTestId("nav-pos").click();
    await page.getByPlaceholder("Buscar productos...").fill(productName);

    const addToCartButton = page
      .locator('[data-testid="add-to-cart"][data-product-name="Coca Cola"]')
      .first();
    await addToCartButton.click();

    await page.getByRole("button", { name: "Efectivo" }).click();
    await page.getByTestId("complete-sale").click();

    await expect(page.getByText("Venta completada")).toBeVisible();

    await page.getByTestId("nav-stock").click();
    await expect(page.getByTestId(`stock-value-${barcode}`)).toHaveText("9");

    const categoryInDb = await prisma.category.findFirst({
      where: {
        name: categoryName,
        storeId: E2E_SEED.store.id,
      },
    });

    expect(categoryInDb).toBeTruthy();

    const productInDb = await prisma.product.findUnique({
      where: { barcode },
    });

    expect(productInDb).toBeTruthy();
    expect(productInDb?.name).toBe(productName);
    expect(productInDb?.stock).toBe(9);

    const saleInDb = await prisma.sale.findFirst({
      where: {
        storeId: E2E_SEED.store.id,
        userId: E2E_SEED.admin.id,
      },
      include: {
        items: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    expect(saleInDb).toBeTruthy();
    expect(saleInDb?.paymentMethod).toBe("cash");
    expect(saleInDb?.items.length).toBeGreaterThan(0);

    const saleItem = saleInDb?.items.find(
      (item) => item.productId === productInDb?.id,
    );
    expect(saleItem).toBeTruthy();
    expect(saleItem?.quantity).toBe(1);

    await page.getByTestId("nav-dashboard").click();
    await page.getByRole("button", { name: "Hoy" }).click();

    await expect(page.getByTestId("dashboard-sales-card")).toContainText("1");
    await expect(page.getByTestId("dashboard-revenue-card")).not.toContainText(
      "$ 0,00",
    );
  });
});
