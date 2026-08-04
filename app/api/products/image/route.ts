import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { isTestUserEmail } from "@/lib/test-users";
import { uploadImage } from "@/lib/cloudinary/image-service";
import { validateImageFile } from "@/lib/validations";

export const runtime = "nodejs";

const DEMO_IMAGE_URL = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e2e8f0"/><rect x="75" y="55" width="50" height="90" rx="4" fill="#94a3b8"/><rect x="85" y="35" width="30" height="20" rx="3" fill="#94a3b8"/><text x="100" y="165" font-family="sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Imagen demo</text></svg>`,
)}`;

export async function POST(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("No se proporcionó una imagen", 400);
    }

    const validationError = validateImageFile(file);
    if (validationError) {
      return errorResponse(validationError, 400);
    }

    // Demo/test users: simular subida sin credenciales de Cloudinary
    if (isTestUserEmail(auth.user.email)) {
      const demoId = `demo-${Date.now()}`;
      return jsonResponse(
        { imageUrl: DEMO_IMAGE_URL, cloudinaryPublicId: demoId },
        201,
      );
    }

    const bytes = await file.arrayBuffer();
    const dataUrl = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;

    const uploaded = await uploadImage(dataUrl);
    return jsonResponse(uploaded, 201);
  } catch (error) {
    console.error("POST /api/products/image", error);
    return errorResponse(
      error instanceof Error ? error.message : "Error al subir la imagen",
      500,
    );
  }
}
