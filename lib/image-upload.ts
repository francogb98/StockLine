export interface UploadedImage {
  imageUrl: string;
  cloudinaryPublicId: string;
}

export async function uploadProductImage(file: File): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/products/image", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Error al subir la imagen" }));
    throw new Error(error.error || "Error al subir la imagen");
  }

  return response.json();
}
