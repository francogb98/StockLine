-- AlterTable
ALTER TABLE "users" ADD COLUMN "passwordHash" VARCHAR(255);

-- Update existing users with a default hash
-- This is a temporary hash that won't work for login, but will prevent null constraint violations
UPDATE "users" SET "passwordHash" = '$2b$10$abcdefghijklmnopqrstuvwxyz' WHERE "passwordHash" IS NULL;

-- Make the column required
ALTER TABLE "users" ALTER COLUMN "passwordHash" SET NOT NULL;
