import { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { getMercadoPagoPreapproval } from "@/lib/mercadopago";
import {
  markSubscriptionFromWebhook,
  mapMercadoPagoStatusToSubscriptionStatus,
} from "@/lib/subscription-service";
import { recordAuditEvent, extractAuditContext } from "@/lib/audit-service";
import { reportError } from "@/lib/error-reporter";
import { prisma } from "@/lib/prisma";

if (
  process.env.NODE_ENV === "production" &&
  !process.env.MERCADO_PAGO_WEBHOOK_SECRET
) {
  throw new Error(
    "Missing MERCADO_PAGO_WEBHOOK_SECRET in production environment",
  );
}

// ── M1: HMAC-SHA256 Signature Verification ──────────────────────
// Mercado Pago signs webhooks with x-signature header containing
// ts=<timestamp>,v1=<hmac-sha256>. The HMAC is computed over
// `ts:<timestamp>.id:<requestId>` using the webhook secret as key.
function validateWebhookSignature(req: NextRequest): {
  ok: true;
} | {
  ok: false;
  statusCode: number;
  message: string;
} {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured (dev mode) — allow
    return { ok: true };
  }

  const signatureHeader = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");

  // If MP sends x-signature, validate HMAC. Otherwise fall back to x-webhook-secret.
  if (signatureHeader) {
    // Parse: "ts=1234567890,v1=abc123..."
    const parts = new Map<string, string>();
    for (const part of signatureHeader.split(",")) {
      const [key, value] = part.split("=", 2);
      if (key && value) {
        parts.set(key.trim(), value.trim());
      }
    }

    const ts = parts.get("ts");
    const v1 = parts.get("v1");

    if (!ts || !v1) {
      return {
        ok: false,
        statusCode: 401,
        message: "x-signature missing ts or v1",
      };
    }

    // Build the manifest: "ts:<timestamp>.id:<requestId>"
    // If x-request-id is not available, use just the timestamp
    const manifest = requestId
      ? `ts:${ts}.id:${requestId}`
      : `ts:${ts}`;

    const expectedHmac = createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");

    if (v1 !== expectedHmac) {
      return {
        ok: false,
        statusCode: 403,
        message: "HMAC signature inválida",
      };
    }

    return { ok: true };
  }

  // Fallback: simple x-webhook-secret header comparison
  const providedSecret = req.headers.get("x-webhook-secret");
  if (!providedSecret) {
    return {
      ok: false,
      statusCode: 401,
      message: "Falta x-webhook-secret o x-signature",
    };
  }

  if (providedSecret !== secret) {
    return {
      ok: false,
      statusCode: 403,
      message: "Firma inválida",
    };
  }

  return { ok: true };
}

const SUBSCRIPTION_TOPIC_VALUES = new Set([
  "subscription_preapproval",
  "preapproval",
  "preapproval_plan",
]);

const SUBSCRIPTION_ACTION_VALUES = new Set([
  "created",
  "updated",
  "payment.created",
  "payment.updated",
  "authorized",
  "paused",
  "cancelled",
  "canceled",
]);

function isSubscriptionEvent(body: any): boolean {
  if (!body || typeof body !== "object") {
    return false;
  }

  const topic = String(
    body?.topic ?? body?.type ?? body?.resource ?? "",
  )
    .trim()
    .toLowerCase();

  if (topic && SUBSCRIPTION_TOPIC_VALUES.has(topic)) {
    return true;
  }

  if (typeof body?.type === "string" && body.type.toLowerCase() === "payment") {
    return false;
  }

  const action = String(body?.action ?? "").trim().toLowerCase();
  if (action && SUBSCRIPTION_ACTION_VALUES.has(action)) {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  // Extract event ID from body early for WebhookEvent logging
  const rawBody = await req.json().catch(() => ({}));
  const url = new URL(req.url);
  const webhookEventId = String(
    rawBody?.data?.id ?? rawBody?.id ?? url.searchParams.get("id") ?? "",
  ).trim() || `gen-${Date.now()}`;

  let webhookRecordId: string | null = null;

  try {
    // ── 1. Validate signature ──
    const sigValidation = validateWebhookSignature(req);
    if (!sigValidation.ok) {
      // Log the failed attempt
      await prisma.webhookEvent.create({
        data: {
          eventId: webhookEventId,
          provider: "MERCADOPAGO",
          eventType: String(rawBody?.type ?? rawBody?.topic ?? "unknown"),
          payload: rawBody as any,
          status: "FAILED",
          error: sigValidation.message,
        },
      }).catch(() => {});

      return errorResponse(sigValidation.message, sigValidation.statusCode);
    }

    // ── 2. Persist raw webhook event (BEFORE processing) ──
    const webhookRecord = await prisma.webhookEvent.create({
      data: {
        eventId: webhookEventId,
        provider: "MERCADOPAGO",
        eventType: String(rawBody?.type ?? rawBody?.topic ?? "unknown"),
        payload: rawBody as any,
        status: "RECEIVED",
      },
    });
    webhookRecordId = webhookRecord.id;

    // ── 3. Process ──
    const body = rawBody;
    const preapprovalId = String(
      body?.data?.id ?? body?.id ?? url.searchParams.get("id") ?? "",
    ).trim();

    console.info(
      `[Subscription] webhook received type=${body?.type ?? "n/a"} topic=${body?.topic ?? "n/a"} action=${body?.action ?? "n/a"} preapprovalId=${preapprovalId || "missing"} eventId=${webhookEventId} (source=webhook)`,
    );

    if (!isSubscriptionEvent(body)) {
      console.info(
        `[Subscription] webhook ignored (not a subscription event) type=${body?.type ?? "n/a"} topic=${body?.topic ?? "n/a"} (source=webhook)`,
      );

      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: "IGNORED" },
      });

      return jsonResponse({ ok: true, ignored: true, reason: "not-subscription" });
    }

    if (!preapprovalId) {
      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: "IGNORED", error: "missing preapprovalId" },
      });
      return jsonResponse({ ok: true, ignored: true });
    }

    // ── 4. Idempotency check via WebhookEvent table ──
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentDuplicate = await prisma.webhookEvent.findFirst({
      where: {
        eventId: webhookEventId,
        status: "PROCESSED",
        createdAt: { gte: tenMinutesAgo },
        id: { not: webhookRecord.id },
      },
    });

    if (recentDuplicate) {
      console.info(
        `[Subscription] webhook deduplicated eventId=${webhookEventId} preapprovalId=${preapprovalId} (source=webhook)`,
      );

      await prisma.webhookEvent.update({
        where: { id: webhookRecord.id },
        data: { status: "IGNORED", error: "duplicate" },
      });

      return jsonResponse({ ok: true, deduplicated: true });
    }

    // ── 5. Fetch from Mercado Pago and sync ──
    const mpSubscription = await getMercadoPagoPreapproval(preapprovalId);

    const mappedStatus = mapMercadoPagoStatusToSubscriptionStatus(
      mpSubscription.status,
    );

    console.info(
      `[Subscription] mp preapproval fetched preapprovalId=${preapprovalId} rawStatus="${mpSubscription.status}" mappedStatus="${mappedStatus}" frequencyType=${mpSubscription.frequencyType ?? "n/a"} (source=webhook)`,
    );

    await markSubscriptionFromWebhook({
      preapprovalId,
      status: mpSubscription.status,
      plan: mpSubscription.frequencyType === "years" ? "annual" : "monthly",
      currentPeriodStart: mpSubscription.dateCreated ?? undefined,
      currentPeriodEnd: mpSubscription.nextPaymentDate ?? undefined,
      source: "webhook",
    });

    const sub = await prisma.subscription.findFirst({
      where: { mercadoPagoPreapprovalId: preapprovalId },
      select: { storeId: true },
    });

    const { ipAddress, userAgent } = extractAuditContext(req);
    await recordAuditEvent({
      actorType: "WEBHOOK",
      storeId: sub?.storeId ?? null,
      action: "subscription.synced",
      targetType: "Subscription",
      targetId: preapprovalId,
      metadata: {
        rawMpStatus: mpSubscription.status,
        mappedStatus,
        preapprovalId,
        eventId: webhookEventId,
      },
      ipAddress,
      userAgent,
    });

    // Mark as processed
    await prisma.webhookEvent.update({
      where: { id: webhookRecord.id },
      data: { status: "PROCESSED" },
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("POST /api/webhooks/mercadopago", error);
    const err = error instanceof Error ? error : new Error(String(error));

    // Mark webhook event as failed
    if (webhookRecordId) {
      await prisma.webhookEvent.update({
        where: { id: webhookRecordId },
        data: { status: "FAILED", error: err.message },
      }).catch(() => {});
    }

    void reportError({
      source: "WEBHOOK",
      severity: "ERROR",
      message: err.message || "Mercado Pago webhook failed",
      stack: err.stack,
      method: "POST",
      path: "/api/webhooks/mercadopago",
      statusCode: 500,
    }).catch(() => {});
    return errorResponse("Error procesando webhook de Mercado Pago", 500);
  }
}
