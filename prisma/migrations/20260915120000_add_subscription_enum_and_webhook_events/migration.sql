-- Create SubscriptionStatus enum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- Add new columns to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "subscriptions" ADD COLUMN "canceled_at" TIMESTAMP(3);

-- Create WebhookEvent table
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- Create unique index on event_id
CREATE UNIQUE INDEX "webhook_events_event_id_key" ON "webhook_events"("event_id");

-- Create indexes on webhook_events
CREATE INDEX "webhook_events_provider_created_at_idx" ON "webhook_events"("provider", "created_at" DESC);
CREATE INDEX "webhook_events_status_idx" ON "webhook_events"("status");

-- Convert existing lowercase status values to enum values
-- First, add a temporary column with the enum type
ALTER TABLE "subscriptions" ADD COLUMN "status_new" "SubscriptionStatus";

-- Map existing values
UPDATE "subscriptions" SET "status_new" = CASE
    WHEN "status" = 'trial' THEN 'TRIAL'::"SubscriptionStatus"
    WHEN "status" = 'active' THEN 'ACTIVE'::"SubscriptionStatus"
    WHEN "status" = 'past_due' THEN 'PAST_DUE'::"SubscriptionStatus"
    WHEN "status" = 'canceled' THEN 'CANCELED'::"SubscriptionStatus"
    ELSE 'PAST_DUE'::"SubscriptionStatus"
END;

-- Drop the old column and rename the new one
ALTER TABLE "subscriptions" DROP COLUMN "status";
ALTER TABLE "subscriptions" RENAME COLUMN "status_new" TO "status";

-- Set NOT NULL and default
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'TRIAL';
