export function uniqueSuffix() {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function makeCategoryData(baseName = "Bebidas") {
  return {
    name: `${baseName} ${uniqueSuffix()}`,
    description: "Categoria creada por E2E",
  };
}

export function makeProductData(categoryName: string) {
  const suffix = uniqueSuffix();
  return {
    name: `Coca Cola ${suffix}`,
    barcode: `779900${suffix.replace(/-/g, "").slice(0, 7)}`,
    price: 1000,
    cost: 700,
    stock: 10,
    minStock: 2,
    categoryName,
  };
}
