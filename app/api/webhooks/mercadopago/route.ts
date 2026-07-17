import { NextRequest } from "next/server";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { getMercadoPagoPreapproval } from "@/lib/mercadopago";
import {
  markSubscriptionFromWebhook,
  mapMercadoPagoStatusToSubscriptionStatus,
} from "@/lib/subscription-service";

if (
  process.env.NODE_ENV === "production" &&
  !process.env.MERCADO_PAGO_WEBHOOK_SECRET
) {
  throw new Error(
    "Missing MERCADO_PAGO_WEBHOOK_SECRET in production environment",
  );
}

function validateWebhookSecret(req: NextRequest) {
  const expectedSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!expectedSecret) {
    return { ok: true as const };
  }

  const providedSecret = req.headers.get("x-webhook-secret");
  if (!providedSecret) {
    return {
      ok: false as const,
      statusCode: 401,
      message: "Falta x-webhook-secret",
    };
  }

  if (providedSecret !== expectedSecret) {
    return {
      ok: false as const,
      statusCode: 403,
      message: "Firma inválida",
    };
  }

  return { ok: true as const };
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
    return true;
  }

  const topic = String(
    body?.topic ?? body?.type ?? body?.resource ?? "",
  )
    .trim()
    .toLowerCase();

  if (topic && SUBSCRIPTION_TOPIC_VALUES.has(topic)) {
    return true;
  }

  if (body?.data?.id && !body?.type) {
    return true;
  }

  if (typeof body?.type === "string" && body.type.toLowerCase() === "payment") {
    return false;
  }

  const action = String(body?.action ?? "").trim().toLowerCase();
  if (action && SUBSCRIPTION_ACTION_VALUES.has(action)) {
    return true;
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const secretValidation = validateWebhookSecret(req);

    if (!secretValidation.ok) {
      return errorResponse(
        secretValidation.message,
        secretValidation.statusCode,
      );
    }

    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    const preapprovalId = String(
      body?.data?.id ?? body?.id ?? url.searchParams.get("id") ?? "",
    ).trim();

    console.info(
      `[Subscription] webhook received type=${body?.type ?? "n/a"} topic=${body?.topic ?? "n/a"} action=${body?.action ?? "n/a"} preapprovalId=${preapprovalId || "missing"} (source=webhook) payload=${JSON.stringify(body)}`,
    );

    if (!isSubscriptionEvent(body)) {
      console.info(
        `[Subscription] webhook ignored (not a subscription event) type=${body?.type ?? "n/a"} (source=webhook)`,
      );
      return jsonResponse({ ok: true, ignored: true, reason: "not-subscription" });
    }

    if (!preapprovalId) {
      return jsonResponse({ ok: true, ignored: true });
    }

    const mpSubscription = await getMercadoPagoPreapproval(preapprovalId);

    const mappedStatus = mapMercadoPagoStatusToSubscriptionStatus(
      mpSubscription.status,
    );

    console.info(
      `[Subscription] mp preapproval fetched preapprovalId=${preapprovalId} rawStatus="${mpSubscription.status}" mappedStatus="${mappedStatus}" frequencyType=${mpSubscription.frequencyType ?? "n/a"} dateCreated=${mpSubscription.dateCreated?.toISOString() ?? "n/a"} nextPaymentDate=${mpSubscription.nextPaymentDate?.toISOString() ?? "n/a"} fullPayload=${JSON.stringify(mpSubscription)} (source=webhook)`,
    );

    await markSubscriptionFromWebhook({
      preapprovalId,
      status: mpSubscription.status,
      plan: mpSubscription.frequencyType === "years" ? "annual" : "monthly",
      currentPeriodStart: mpSubscription.dateCreated ?? undefined,
      currentPeriodEnd: mpSubscription.nextPaymentDate ?? undefined,
      source: "webhook",
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error("POST /api/webhooks/mercadopago", error);
    return errorResponse("Error procesando webhook de Mercado Pago", 500);
  }
}
