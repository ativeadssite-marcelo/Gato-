// =========================================================================
// ENFORCEMENT DE COTAS POR PLANO — GATO SaaS
// =========================================================================
// Verifica, ANTES de uma escrita (upload/cadastro), se o tenant ainda tem cota
// no recurso. O limite vem do plano do tenant (SAAS_PLANS); o uso corrente vem
// do store de uso (que espelha a tabela "TenantUsage"). O incremento é projetado
// (não contabilizado) na checagem e só é efetivado após a escrita ter sucesso.
// =========================================================================

import { SAAS_PLANS, TENANTS_DATA } from "./rbacEngine";
import { consumeApiRequest, getApiRequestsToday, getUsage, setUsage } from "./store";
import { QuotaCheckResult, QuotaStatus } from "../src/types/billing";

export type QuotaResource = "customers" | "items" | "users" | "storage";

const LIMIT_KEY: Record<QuotaResource, keyof (typeof SAAS_PLANS)[number]["quotas"]> = {
  customers: "maxCustomers",
  items: "maxItems",
  users: "maxUsers",
  storage: "maxStorageMb",
};

const USAGE_KEY: Record<QuotaResource, keyof { customers: number; items: number; users: number; employees: number; storageMb: number }> = {
  customers: "customers",
  items: "items",
  users: "users",
  storage: "storageMb",
};

function planFor(tenantId: string) {
  const tenant = TENANTS_DATA.find((t) => t.id === tenantId);
  const plan = SAAS_PLANS.find((p) => p.id === tenant?.planId) || SAAS_PLANS[1];
  return { tenant, plan };
}

function usageValue(u: Awaited<ReturnType<typeof getUsage>>, resource: QuotaResource): number {
  return Number(u[USAGE_KEY[resource]]) || 0;
}

/**
 * Avalia a cota de um recurso para um tenant, projetando `increment` novas
 * unidades. Não muta o uso (a efetivação é responsabilidade de incrementUsage).
 */
export async function checkQuota(
  tenantId: string,
  resource: QuotaResource,
  increment = 1,
): Promise<QuotaCheckResult> {
  const { tenant, plan } = planFor(tenantId);
  const limit = plan.quotas[LIMIT_KEY[resource]];
  const current = usageValue(await getUsage(tenantId), resource);
  const projected = current + increment;
  const ratio = limit > 0 ? projected / limit : projected > 0 ? 1.1 : 0;

  let status: QuotaStatus = "normal";
  if (ratio >= 0.9 && ratio <= 1.0) status = "warning_90";
  else if (ratio > 1.0) status = tenant?.softBlockEnabled === false ? "hard_blocked" : "soft_blocked";

  const allowed = status !== "soft_blocked" && status !== "hard_blocked";
  const labels: Record<QuotaResource, string> = {
    customers: "clientes",
    items: "itens (peças)",
    users: "usuários",
    storage: "armazenamento (MB)",
  };

  return {
    allowed,
    status,
    resource,
    current: projected,
    limit,
    reason: allowed
      ? undefined
      : `Cota de ${labels[resource]} do plano '${plan.name}' excedida (${projected}/${limit}). Faça upgrade para continuar.`,
  };
}

/** Efetiva o consumo de cota após uma escrita bem-sucedida. */
export async function incrementUsage(
  tenantId: string,
  resource: QuotaResource,
  amount = 1,
): Promise<void> {
  const current = await getUsage(tenantId);
  const patch: Record<string, number> = {};
  patch[USAGE_KEY[resource]] = usageValue(current, resource) + amount;
  await setUsage(tenantId, patch);
}

// -------------------------------------------------------------------------
// COTA DIÁRIA DE API (integração por chave de API)
// -------------------------------------------------------------------------
// Diferente de `checkQuota`, que apenas projeta e deixa a escrita efetivar: aqui
// a requisição já está acontecendo, então o consumo é atômico. Requisição RECUSADA
// não é contada — senão uma integração acima da cota se afundaria cada vez mais.

export interface ApiQuotaDecision {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  /** Segundos até a virada do dia, para o header Retry-After quando bloqueado. */
  retryAfterSeconds: number;
}

function secondsUntilTomorrow(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return Math.max(1, Math.ceil((tomorrow.getTime() - now.getTime()) / 1000));
}

/** Uso do dia e limite do plano, sem consumir nada (para exibir a cota). */
export async function getApiQuota(tenantId: string): Promise<{ used: number; limit: number }> {
  const { plan } = planFor(tenantId);
  return { used: await getApiRequestsToday(tenantId), limit: plan.quotas.maxApiRequestsPerDay };
}

/** Consome 1 requisição da cota de API do dia, ou recusa por limite atingido. */
export async function consumeApiQuota(tenantId: string): Promise<ApiQuotaDecision> {
  const { plan } = planFor(tenantId);
  const limit = plan.quotas.maxApiRequestsPerDay;
  const retryAfterSeconds = secondsUntilTomorrow();

  // Plano sem cota de API (0) = sem acesso por integração.
  if (limit <= 0) {
    return {
      allowed: false,
      used: await getApiRequestsToday(tenantId),
      limit,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  const current = await getApiRequestsToday(tenantId);
  if (current >= limit) {
    return { allowed: false, used: current, limit, remaining: 0, retryAfterSeconds };
  }

  const used = await consumeApiRequest(tenantId);
  return { allowed: true, used, limit, remaining: Math.max(0, limit - used), retryAfterSeconds };
}
