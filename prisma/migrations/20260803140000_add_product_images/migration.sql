-- Add optional product image fields (Cloudinary)
ALTER TABLE "products" ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "cloudinaryPublicId" TEXT;
