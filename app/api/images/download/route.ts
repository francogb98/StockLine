import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requireSessionUser } from "@/lib/api-auth";
import { isDemoSession } from "@/lib/auth-session";
import { isTestUserEmail } from "@/lib/test-users";
import { uploadImage } from "@/lib/cloudinary/image-service";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE } from "@/lib/validations";

const DOWNLOAD_TIMEOUT = 15000;

export async function POST(request: Request) {
  try {
    const auth = await requireSessionUser();
    if ("response" in auth) return auth.response;

    if (await isDemoSession()) {
      return errorResponse("No se pueden descargar imágenes en modo demo", 403);
    }

    const body = await request.json();
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

    if (!imageUrl) {
      return errorResponse("La URL de la imagen es requerida", 400);
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return errorResponse("URL de imagen inválida", 400);
    }

    // Demo/test users: return mock
    if (isTestUserEmail(auth.user.email)) {
      const demoId = `demo-${Date.now()}`;
      const demoUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e2e8f0"/><rect x="75" y="55" width="50" height="90" rx="4" fill="#94a3b8"/><rect x="85" y="35" width="30" height="20" rx="3" fill="#94a3b8"/><text x="100" y="165" font-family="sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Imagen demo</text></svg>`,
      )}`;
      return jsonResponse({ imageUrl: demoUrl, cloudinaryPublicId: demoId });
    }

    // Download image
    let response: Response;
    try {
      response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT),
        headers: {
          "User-Agent": "StockLine/1.0",
        },
      });
    } catch {
      return errorResponse("No se pudo descargar la imagen", 502);
    }

    if (!response.ok) {
      return errorResponse("La imagen no está disponible", 502);
    }

    // Validate content type
    const contentType = response.headers.get("content-type") || "";
    const isImage = ALLOWED_IMAGE_TYPES.some(
      (t) => contentType.includes(t) || contentType.includes("image/"),
    );
    if (!isImage && !contentType.includes("octet-stream")) {
      return errorResponse("El archivo no es una imagen válida", 400);
    }

    // Get image bytes
    const arrayBuffer = await response.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);

    // Validate size
    if (bytes.length > MAX_IMAGE_SIZE) {
      return errorResponse("La imagen supera los 5 MB permitidos", 400);
    }

    // Determine MIME type
    const mimeType = contentType.includes("image/")
      ? contentType.split(";")[0].trim()
      : "image/jpeg";

    // Upload to Cloudinary
    const dataUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
    const uploaded = await uploadImage(dataUrl);

    return jsonResponse(uploaded);
  } catch (error) {
    console.error("POST /api/images/download", error);
    return errorResponse("Error al procesar la imagen", 500);
  }
}
