// =========================================================================
// LÓGICA DE ASSINATURA — GATO SaaS
// =========================================================================
// Conversão trial -> pago, cálculo pró-rata, mapeamento de eventos do gateway
// para o ciclo de vida da assinatura e enforcement de acesso por status.
// =========================================================================

import { SAAS_PLANS, TENANTS_DATA } from "../rbacEngine";
import {
  PaymentGateway,
  SubscriptionStatus,
  TenantSubscription,
} from "../../src/types/billing";
import {
  createInvoice,
  getSubscriptionByTenant,
  listInvoices,
  listSubscriptions,
  markInvoicePaid,
  upsertSubscription,
} from "../store";
import {
  cancelAsaasSubscription,
  createAsaasSubscription,
  ensureAsaasCustomer,
  isAsaasConfigured,
} from "./asaas";

export const DEFAULT_TRIAL_DAYS = 14;

export function findPlan(planId: string) {
  return SAAS_PLANS.find((p) => p.id === planId) || SAAS_PLANS.find((p) => p.code === "starter") || SAAS_PLANS[0];
}

/** Calcula o valor proporcional de upgrade/downgrade pelos dias restantes. */
export function computeProRata(
  oldPrice: number,
  newPrice: number,
  remainingDays = 15,
  daysInMonth = 30,
): number {
  const diff = newPrice - oldPrice;
  if (diff <= 0) return 0;
  return Number(((diff / daysInMonth) * remainingDays).toFixed(2));
}

/**
 * Mapeia eventos do Asaas para o status da assinatura.
 * Referência: PAYMENT_RECEIVED/CONFIRMED -> active; PAYMENT_OVERDUE -> past_due;
 * SUBSCRIPTION_INACTIVE -> canceled.
 */
export function mapAsaasEventToStatus(event: string): SubscriptionStatus | null {
  const e = (event || "").toUpperCase();
  if (["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "SUBSCRIPTION_ACTIVE", "SUBSCRIPTION_UPDATE"].includes(e)) return "active";
  if (["PAYMENT_OVERDUE", "PAYMENT_DELETED"].includes(e)) return "past_due";
  if (["SUBSCRIPTION_INACTIVE"].includes(e)) return "canceled";
  if (["SUBSCRIPTION_EXPIRED"].includes(e)) return "expired";
  return null;
}

/** Verifica se um status de assinatura permite acesso ao sistema. */
export function isAccessGranted(status: SubscriptionStatus): boolean {
  return status === "trial" || status === "active" || status === "past_due";
}

/** Cria (ou devolve) a assinatura trial de um tenant. */
export async function ensureTrialSubscription(
  tenantId: string,
  planId?: string,
): Promise<TenantSubscription> {
  const existing = await getSubscriptionByTenant(tenantId);
  if (existing) return existing;

  const plan = findPlan(planId || "plan_starter");
  const trialEndsAt = new Date(Date.now() + DEFAULT_TRIAL_DAYS * 86400000).toISOString();
  return upsertSubscription({
    tenantId,
    planId: plan.id,
    planName: plan.name,
    status: "trial",
    trialEndsAt,
    currentPeriodEndsAt: trialEndsAt,
    gateway: null,
    gatewayCustomerId: null,
    gatewaySubscriptionId: null,
    cancelAtPeriodEnd: false,
  });
}

export interface ConvertTrialInput {
  tenantId: string;
  tenantName: string;
  contactEmail: string;
  cnpj?: string;
  billingType?: "BOLETO" | "PIX" | "CREDIT_CARD";
  planId?: string;
}

export interface ConvertTrialResult {
  subscription: TenantSubscription;
  gateway: PaymentGateway;
  paymentLink: string | null;
  pendingExternalSetup: boolean;
}

/**
 * Converte trial -> pago. Se o gateway estiver configurado, cria customer +
 * assinatura recorrente reais. Caso contrário, registra a assinatura como
 * ativa em modo "aguardando setup do gateway" (sem falso positivo de cobrança).
 */
export async function convertTrialToPaid(input: ConvertTrialInput): Promise<ConvertTrialResult> {
  const current = await getSubscriptionByTenant(input.tenantId);
  const plan = findPlan(input.planId || current?.planId || "plan_starter");

  const nextDue = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  let gateway: PaymentGateway = null;
  let gatewayCustomerId: string | null = null;
  let gatewaySubscriptionId: string | null = null;
  let paymentLink: string | null = null;
  let pendingExternalSetup = false;

  if (isAsaasConfigured()) {
    gateway = "asaas";
    gatewayCustomerId = await ensureAsaasCustomer({
      tenantId: input.tenantId,
      name: input.tenantName,
      email: input.contactEmail,
      cpfCnpj: input.cnpj,
    });
    const created = await createAsaasSubscription({
      customerId: gatewayCustomerId,
      billingType: input.billingType || "PIX",
      value: plan.priceMonthly,
      nextDueDate: nextDue,
      cycle: "MONTHLY",
    });
    gatewaySubscriptionId = created.id;
    paymentLink = "https://sandbox.asaas.com"; // substituído pelo link real da fatura no webhook
  } else {
    // Sem gateway: o operador cadastra manualmente; assinatura fica ativa e o
    // financeiro gera a fatura. Evita afirmar que houve cobrança que não houve.
    pendingExternalSetup = true;
  }

  const subscription = await upsertSubscription({
    tenantId: input.tenantId,
    planId: plan.id,
    planName: plan.name,
    status: "active",
    trialEndsAt: current?.trialEndsAt ?? null,
    currentPeriodEndsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    gateway,
    gatewayCustomerId,
    gatewaySubscriptionId,
    cancelAtPeriodEnd: false,
  });

  await createInvoice({
    tenantId: input.tenantId,
    subscriptionId: subscription.id,
    amount: plan.priceMonthly,
    dueDate: nextDue,
    paymentMethod: input.billingType === "CREDIT_CARD" ? "credit_card" : "pix",
    paymentLink,
  });

  return { subscription, gateway, paymentLink, pendingExternalSetup };
}

/** Suspende/cancela uma assinatura (cancelamento local + gateway). */
export async function cancelSubscription(tenantId: string): Promise<TenantSubscription | null> {
  const sub = await getSubscriptionByTenant(tenantId);
  if (!sub) return null;
  if (sub.gateway === "asaas" && sub.gatewaySubscriptionId && isAsaasConfigured()) {
    await cancelAsaasSubscription(sub.gatewaySubscriptionId).catch(() => {
      /* gateway fora do ar: seguimos com o cancelamento local */
    });
  }
  return upsertSubscription({ ...sub, status: "canceled", cancelAtPeriodEnd: true });
}

/** Atualiza o status da assinatura a partir de um evento de pagamento do gateway. */
export async function applyGatewayPaymentEvent(params: {
  tenantId: string;
  event: string;
  paid: boolean;
  paymentMethod?: "pix" | "boleto" | "credit_card" | null;
}): Promise<TenantSubscription | null> {
  const sub = await getSubscriptionByTenant(params.tenantId);
  if (!sub) return null;

  const status: SubscriptionStatus = params.paid
    ? "active"
    : mapAsaasEventToStatus(params.event) ?? "past_due";

  // Marca faturas abertas do tenant como pagas quando o pagamento é confirmado.
  if (params.paid) {
    for (const inv of await listInvoices(params.tenantId)) {
      if (inv.status === "open") {
        await markInvoicePaid(inv.id, { paymentMethod: params.paymentMethod ?? null });
        break;
      }
    }
  }

  return upsertSubscription({
    ...sub,
    status,
    currentPeriodEndsAt:
      params.paid && status === "active"
        ? new Date(Date.now() + 30 * 86400000).toISOString()
        : sub.currentPeriodEndsAt,
  });
}

/** Varre assinaturas cujo trial venceu sem pagamento e as expira (modo leitura). */
export async function expireTrials(): Promise<number> {
  const subs = await listSubscriptions();
  let expired = 0;
  for (const sub of subs) {
    if (sub.status === "trial" && sub.trialEndsAt && new Date(sub.trialEndsAt).getTime() < Date.now()) {
      await upsertSubscription({ ...sub, status: "expired" });
      expired += 1;
    }
  }
  return expired;
}

/** Devolve o plano + status de acesso de um tenant (para enforcement em middleware). */
export async function getTenantAccess(tenantId: string): Promise<{ status: SubscriptionStatus; granted: boolean; planName: string }> {
  const sub = await getSubscriptionByTenant(tenantId);
  if (!sub) return { status: "trial", granted: true, planName: "starter" };
  return { status: sub.status, granted: isAccessGranted(sub.status), planName: sub.planName };
}

/** Referência de tenants existentes (para validação em rotas de billing). */
export function tenantExists(tenantId: string): boolean {
  return TENANTS_DATA.some((t) => t.id === tenantId);
}
