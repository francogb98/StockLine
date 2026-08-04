import { getCloudinary, CLOUDINARY_FOLDER } from "./config";

export interface UploadedImage {
  imageUrl: string;
  cloudinaryPublicId: string;
}

export async function uploadImage(dataUrl: string): Promise<UploadedImage> {
  const result = await getCloudinary().uploader.upload(dataUrl, {
    folder: CLOUDINARY_FOLDER,
    resource_type: "image",
    overwrite: false,
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  });

  return {
    imageUrl: result.secure_url,
    cloudinaryPublicId: result.public_id,
  };
}

export async function deleteImage(publicId: string): Promise<void> {
  if (!publicId) return;

  try {
    await getCloudinary().uploader.destroy(publicId);
  } catch (error) {
    console.error("Error eliminando imagen de Cloudinary:", error);
  }
}
