import {
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from "@/lib/subscription-config";

const MERCADO_PAGO_API_BASE = "https://api.mercadopago.com";

function getMercadoPagoAccessToken() {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Missing MERCADO_PAGO_ACCESS_TOKEN env var");
  }
  return token;
}

export interface CreatePreapprovalInput {
  plan: SubscriptionPlan;
  payerEmail: string;
  externalReference: string;
}

export interface CreatePreapprovalResult {
  id: string;
  initPoint: string | null;
  sandboxInitPoint: string | null;
}

export async function createMercadoPagoPreapproval(
  input: CreatePreapprovalInput,
): Promise<CreatePreapprovalResult> {
  const token = getMercadoPagoAccessToken();
  const planConfig = SUBSCRIPTION_PLANS[input.plan];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const response = await fetch(`${MERCADO_PAGO_API_BASE}/preapproval`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      reason: `VendePro ${planConfig.label}`,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      back_url: `${appUrl}/app`,
      status: "pending",
      auto_recurring: {
        frequency: planConfig.frequency,
        frequency_type: planConfig.frequencyType,
        transaction_amount: planConfig.amountArs,
        currency_id: "ARS",
        start_date: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Mercado Pago preapproval error (${response.status}): ${errorBody}`,
    );
  }

  const data = await response.json();

  return {
    id: String(data.id),
    initPoint: data.init_point ? String(data.init_point) : null,
    sandboxInitPoint: data.sandbox_init_point
      ? String(data.sandbox_init_point)
      : null,
  };
}

export interface MercadoPagoPreapprovalDetails {
  id: string;
  status: string;
  frequencyType: "months" | "years" | null;
  dateCreated: Date | null;
  nextPaymentDate: Date | null;
}

export async function getMercadoPagoPreapproval(
  preapprovalId: string,
): Promise<MercadoPagoPreapprovalDetails> {
  const token = getMercadoPagoAccessToken();

  const response = await fetch(
    `${MERCADO_PAGO_API_BASE}/preapproval/${preapprovalId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Mercado Pago get preapproval error (${response.status}): ${errorBody}`,
    );
  }

  const data = await response.json();

  return {
    id: String(data.id),
    status: String(data.status ?? ""),
    frequencyType:
      data?.auto_recurring?.frequency_type === "years"
        ? "years"
        : data?.auto_recurring?.frequency_type === "months"
          ? "months"
          : null,
    dateCreated: data.date_created ? new Date(data.date_created) : null,
    nextPaymentDate: data.next_payment_date
      ? new Date(data.next_payment_date)
      : null,
  };
}
