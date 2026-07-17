-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "mercadoPagoPreapprovalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_storeId_key" ON "subscriptions"("storeId");

-- Backfill
INSERT INTO "subscriptions" (
    "id",
    "storeId",
    "status",
    "plan",
    "currentPeriodStart",
    "currentPeriodEnd",
    "trialEndsAt",
    "createdAt",
    "updatedAt"
)
SELECT
    md5(random()::text || clock_timestamp()::text || s."id"),
    s."id",
    'trial',
    'monthly',
    NOW(),
    NOW() + INTERVAL '15 days',
    NOW() + INTERVAL '15 days',
    NOW(),
    NOW()
FROM "stores" s
LEFT JOIN "subscriptions" sub ON sub."storeId" = s."id"
WHERE sub."id" IS NULL;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
