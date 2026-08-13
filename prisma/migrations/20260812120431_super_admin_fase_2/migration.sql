-- CreateEnum
CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('SUPER_ADMIN', 'STORE_USER', 'SYSTEM', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "AppErrorSource" AS ENUM ('API', 'PRISMA', 'MERCADO_PAGO', 'WEBHOOK', 'POS', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AppErrorSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- AlterTable: Subscription adds admin-side columns
ALTER TABLE "subscriptions" ADD COLUMN "admin_notes" TEXT,
ADD COLUMN "cancelled_by_admin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "cancelled_by_admin_user_id" TEXT,
ADD COLUMN "previous_status" TEXT;

-- CreateTable
CREATE TABLE "platform_config" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_config_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discount_type" "CouponDiscountType" NOT NULL,
    "discount_value" DECIMAL(12,2) NOT NULL,
    "duration_days" INTEGER NOT NULL DEFAULT 30,
    "max_redemptions" INTEGER,
    "redeemed_count" INTEGER NOT NULL DEFAULT 0,
    "applicable_plans" TEXT[],
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "coupon_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "redeemed_by_user_id" TEXT,
    "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "discount_applied" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_type" "AuditActorType" NOT NULL,
    "actor_user_id" TEXT,
    "store_id" TEXT,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_errors" (
    "id" TEXT NOT NULL,
    "store_id" TEXT,
    "source" "AppErrorSource" NOT NULL,
    "severity" "AppErrorSeverity" NOT NULL,
    "status_code" INTEGER,
    "method" TEXT,
    "path" TEXT,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "fingerprint" TEXT NOT NULL,
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_user_id" TEXT,
    "metadata" JSONB,

    CONSTRAINT "app_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_is_active_expires_at_idx" ON "coupons"("is_active", "expires_at");

-- CreateIndex
CREATE INDEX "coupon_redemptions_coupon_id_redeemed_at_idx" ON "coupon_redemptions"("coupon_id", "redeemed_at");

-- CreateIndex
CREATE INDEX "coupon_redemptions_store_id_idx" ON "coupon_redemptions"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_coupon_id_subscription_id_key" ON "coupon_redemptions"("coupon_id", "subscription_id");

-- CreateIndex
CREATE INDEX "audit_logs_store_id_created_at_idx" ON "audit_logs"("store_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "app_errors_fingerprint_last_seen_at_idx" ON "app_errors"("fingerprint", "last_seen_at" DESC);

-- CreateIndex
CREATE INDEX "app_errors_store_id_last_seen_at_idx" ON "app_errors"("store_id", "last_seen_at" DESC);

-- CreateIndex
CREATE INDEX "app_errors_source_severity_last_seen_at_idx" ON "app_errors"("source", "severity", "last_seen_at" DESC);

-- CreateIndex
CREATE INDEX "app_errors_resolved_at_severity_idx" ON "app_errors"("resolved_at", "severity");

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_errors" ADD CONSTRAINT "app_errors_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
