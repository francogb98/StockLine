import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireAdminSessionUser, requireSessionUser } from "@/lib/api-auth";

function normalizeCategoryName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function computeNormalizedName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export async function GET() {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const categories = await prisma.category.findMany({
      where: { storeId: auth.user.storeId },
      orderBy: { name: "asc" },
    });
    return jsonResponse(categories);
  } catch (error) {
    console.error("GET /api/categories", error);
    return errorResponse("Error fetching categories", 500);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const data = await req.json();
    const name = normalizeCategoryName(String(data?.name ?? ""));
    const description =
      typeof data?.description === "string" && data.description.trim() !== ""
        ? data.description.trim()
        : null;

    if (!name) {
      return errorResponse("El nombre es requerido", 400);
    }

    const duplicate = await prisma.category.findFirst({
      where: {
        storeId: auth.user.storeId,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      return errorResponse("Ya existe una categoría con ese nombre", 409);
    }

    const category = await prisma.category.create({
      data: {
        storeId: auth.user.storeId,
        name,
        normalizedName: computeNormalizedName(name),
        description,
      },
    });

    return jsonResponse(category, 201);
  } catch (error) {
    console.error("POST /api/categories", error);
    return errorResponse("Error creating category", 500);
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAdminSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const data = await req.json();
    const id = String(data?.id ?? "").trim();
    const name = normalizeCategoryName(String(data?.name ?? ""));
    const description =
      typeof data?.description === "string" && data.description.trim() !== ""
        ? data.description.trim()
        : null;

    if (!id) {
      return errorResponse("ID es requerido", 400);
    }
    if (!name) {
      return errorResponse("El nombre es requerido", 400);
    }

    const existing = await prisma.category.findFirst({
      where: {
        id,
        storeId: auth.user.storeId,
      },
      select: { id: true },
    });

    if (!existing) {
      return errorResponse("La categoría no existe", 404);
    }

    const duplicate = await prisma.category.findFirst({
      where: {
        storeId: auth.user.storeId,
        id: { not: id },
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      return errorResponse("Ya existe una categoría con ese nombre", 409);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name,
        normalizedName: computeNormalizedName(name),
        description,
      },
    });

    return jsonResponse(updated);
  } catch (error) {
    console.error("PUT /api/categories", error);
    return errorResponse("Error updating category", 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdminSessionUser();
    if ("response" in auth) {
      return auth.response;
    }

    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "").trim();

    if (!id) {
      return errorResponse("ID es requerido", 400);
    }

    const existing = await prisma.category.findFirst({
      where: {
        id,
        storeId: auth.user.storeId,
      },
      select: { id: true },
    });

    if (!existing) {
      return errorResponse("La categoría no existe", 404);
    }

    const productsCount = await prisma.product.count({
      where: {
        storeId: auth.user.storeId,
        categoryId: id,
      },
    });

    if (productsCount > 0) {
      return errorResponse(
        "No se puede eliminar la categoría porque tiene productos asociados",
        409,
      );
    }

    await prisma.category.delete({ where: { id } });
    return jsonResponse({ message: "Categoría eliminada exitosamente" });
  } catch (error) {
    console.error("DELETE /api/categories", error);
    return errorResponse("Error deleting category", 500);
  }
}
