import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse } from "@/lib/api-helpers";
import { requirePermission } from "@/lib/api-auth";
import {
  SUBSCRIPTION_PLANS,
  isSubscriptionPlan,
  addDays,
} from "@/lib/subscription-config";
import { createMercadoPagoPreapproval } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  try {
    const auth = await requirePermission("subscription:manage");
    if ("response" in auth) {
      return auth.response;
    }

    const currentUser = auth.auth.user;

    const body = await req.json();
    const planRaw = String(body?.plan ?? "");

    if (!isSubscriptionPlan(planRaw)) {
      return errorResponse("Plan inválido. Debe ser monthly o annual", 400);
    }

    const plan = planRaw;
    const planConfig = SUBSCRIPTION_PLANS[plan];

    const preapproval = await createMercadoPagoPreapproval({
      plan,
      payerEmail: currentUser.email,
      externalReference: currentUser.storeId,
    });

    const now = new Date();
    const currentPeriodEnd = addDays(now, planConfig.intervalDays);

    await prisma.subscription.upsert({
      where: { storeId: currentUser.storeId },
      create: {
        storeId: currentUser.storeId,
        status: "trial",
        plan,
        currentPeriodStart: now,
        currentPeriodEnd,
        mercadoPagoPreapprovalId: preapproval.id,
      },
      update: {
        plan,
        currentPeriodStart: now,
        currentPeriodEnd,
        mercadoPagoPreapprovalId: preapproval.id,
      },
    });

    return jsonResponse(
      {
        plan,
        amountArs: planConfig.amountArs,
        preapprovalId: preapproval.id,
        initPoint: preapproval.initPoint,
        sandboxInitPoint: preapproval.sandboxInitPoint,
      },
      201,
    );
  } catch (error) {
    console.error("POST /api/subscription/create", error);
    return errorResponse("Error creando la suscripción", 500);
  }
}
