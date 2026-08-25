import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireAdminSessionUser, requireSessionUser } from "@/lib/api-auth";
import { isDemoSession } from "@/lib/auth-session";
import {
  findCategories,
  findCategory,
  findCategoryByName,
  createCategory,
  updateCategory,
  deleteCategory,
  countProductsInCategory,
} from "@/lib/data-access";

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
    if ("response" in auth) return auth.response;

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const categories = await findCategories(ctx);
    return jsonResponse(categories);
  } catch (error) {
    console.error("GET /api/categories", error);
    return errorResponse("Error fetching categories", 500);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminSessionUser();
    if ("response" in auth) return auth.response;

    if (await isDemoSession()) {
      return errorResponse("No se pueden crear categorías en modo demo", 403);
    }

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const data = await req.json();
    const name = normalizeCategoryName(String(data?.name ?? ""));
    const description =
      typeof data?.description === "string" && data.description.trim() !== ""
        ? data.description.trim()
        : null;

    if (!name) {
      return errorResponse("El nombre es requerido", 400);
    }

    const duplicate = await findCategoryByName(ctx, name);
    if (duplicate) {
      return errorResponse("Ya existe una categoría con ese nombre", 409);
    }

    const category = await createCategory(ctx, {
      name,
      normalizedName: computeNormalizedName(name),
      description,
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
    if ("response" in auth) return auth.response;

    if (await isDemoSession()) {
      return errorResponse("No se pueden editar categorías en modo demo", 403);
    }

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const data = await req.json();
    const id = String(data?.id ?? "").trim();
    const name = normalizeCategoryName(String(data?.name ?? ""));
    const description =
      typeof data?.description === "string" && data.description.trim() !== ""
        ? data.description.trim()
        : null;

    if (!id) return errorResponse("ID es requerido", 400);
    if (!name) return errorResponse("El nombre es requerido", 400);

    const existing = await findCategory(ctx, id);
    if (!existing) return errorResponse("La categoría no existe", 404);

    const duplicate = await findCategoryByName(ctx, name, id);
    if (duplicate) {
      return errorResponse("Ya existe una categoría con ese nombre", 409);
    }

    const updated = await updateCategory(ctx, id, {
      name,
      normalizedName: computeNormalizedName(name),
      description,
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
    if ("response" in auth) return auth.response;

    if (await isDemoSession()) {
      return errorResponse("No se pueden eliminar categorías en modo demo", 403);
    }

    const ctx = {
      storeId: auth.user.storeId,
      sessionId: auth.sessionId,
      userEmail: auth.user.email,
      userId: auth.user.id,
    };

    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") ?? "").trim();

    if (!id) return errorResponse("ID es requerido", 400);

    const existing = await findCategory(ctx, id);
    if (!existing) return errorResponse("La categoría no existe", 404);

    const productsCount = await countProductsInCategory(ctx, id);
    if (productsCount > 0) {
      return errorResponse(
        "No se puede eliminar la categoría porque tiene productos asociados",
        409,
      );
    }

    await deleteCategory(ctx, id);
    return jsonResponse({ message: "Categoría eliminada exitosamente" });
  } catch (error) {
    console.error("DELETE /api/categories", error);
    return errorResponse("Error deleting category", 500);
  }
}
