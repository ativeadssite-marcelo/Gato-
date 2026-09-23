// =========================================================================
// ENFORCEMENT DE COTAS POR PLANO — GATO SaaS
// =========================================================================
// Verifica, ANTES de uma escrita (upload/cadastro), se o tenant ainda tem cota
// no recurso. O limite vem do plano do tenant (SAAS_PLANS); o uso corrente vem
// do store de uso (que espelha a tabela "TenantUsage"). O incremento é projetado
// (não contabilizado) na checagem e só é efetivado após a escrita ter sucesso.
// =========================================================================

import { SAAS_PLANS, TENANTS_DATA } from "./rbacEngine";
import { getUsage, setUsage } from "./store";
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
