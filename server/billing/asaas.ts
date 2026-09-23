// =========================================================================
// CLIENTE DO GATEWAY ASAAS — GATO SaaS
// =========================================================================
// Integração real via HTTPS (fetch) com o Asaas (Pix, Boleto e Cartão).
// - Credenciais vêm SOMENTE de variáveis de ambiente (nunca do bundle).
// - Modo sandbox por padrão (ASAAS_ENV=sandbox); use "production" em prod.
// - Nenhum segredo é logado; respostas de erro são truncadas/seguras.
// =========================================================================

import {
  getGatewayCustomer,
  upsertGatewayCustomer,
} from "../store";

export interface AsaasConfig {
  apiKey: string;
  sandbox: boolean;
}

export function getAsaasConfig(): AsaasConfig | null {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey || apiKey.length < 10) return null;
  return {
    apiKey,
    sandbox: (process.env.ASAAS_ENV || "sandbox") !== "production",
  };
}

export function isAsaasConfigured(): boolean {
  return getAsaasConfig() !== null;
}

const baseUrl = (sandbox: boolean) =>
  sandbox ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/api/v3";

async function request<T = any>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const config = getAsaasConfig();
  if (!config) {
    throw new Error("Gateway Asaas não configurado. Defina ASAAS_API_KEY.");
  }
  const res = await fetch(`${baseUrl(config.sandbox)}${path}`, {
    method,
    headers: {
      "access_token": config.apiKey,
      "Content-Type": "application/json",
      "User-Agent": "gato-saas/1.0",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 200) };
  }

  if (!res.ok) {
    const msg = (data?.errors?.[0]?.description || data?.error || data?.message || res.statusText || "erro")
      .toString()
      .slice(0, 200);
    throw new Error(`Asaas ${res.status}: ${msg}`);
  }
  return data as T;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
}

export interface CreateSubscriptionInput {
  customerId: string;
  billingType: "BOLETO" | "PIX" | "CREDIT_CARD";
  value: number;
  nextDueDate: string; // 'YYYY-MM-DD'
  cycle: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";
  description?: string;
}

/** Cria (ou reutiliza) o customer no Asaas para um tenant. */
export async function ensureAsaasCustomer(params: {
  tenantId: string;
  name: string;
  email: string;
  cpfCnpj?: string;
}): Promise<string> {
  const existing = await getGatewayCustomer(params.tenantId);
  if (existing && existing.gateway === "asaas") return existing.gatewayCustomerId;

  const created = await request<{ id: string }>("POST", "/customers", {
    name: params.name,
    email: params.email,
    cpfCnpj: params.cpfCnpj,
    notificationDisabled: false,
  });

  await upsertGatewayCustomer(params.tenantId, "asaas", created.id);
  return created.id;
}

/** Cria assinatura recorrente no Asaas e devolve o id da assinatura. */
export async function createAsaasSubscription(input: CreateSubscriptionInput): Promise<{ id: string; invoiceId?: string }> {
  const data = await request<any>("POST", "/subscriptions", {
    customer: input.customerId,
    billingType: input.billingType,
    value: input.value,
    nextDueDate: input.nextDueDate,
    cycle: input.cycle,
    description: input.description || "Assinatura GATO SaaS",
  });
  return { id: data.id, invoiceId: data.invoiceId ?? undefined };
}

/** Cancela a assinatura no Asaas. */
export async function cancelAsaasSubscription(subscriptionId: string): Promise<void> {
  await request("DELETE", `/subscriptions/${subscriptionId}`);
}

export interface AsaasWebhookPayload {
  event: string;
  payment?: { id: string; status?: string; invoiceUrl?: string; value?: number };
  subscription?: string;
}
