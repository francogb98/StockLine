-- AlterTable
ALTER TABLE "products" ALTER COLUMN "barcode" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "draftOnboardingState" JSONB,
ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0;
