import { v2 as cloudinary } from "cloudinary";

export const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER?.trim() || "products";

let configured = false;

export function getCloudinary(): typeof cloudinary {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary no está configurado. Agregá CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET a tus variables de entorno.",
    );
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}
