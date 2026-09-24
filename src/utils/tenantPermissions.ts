// =========================================================================
// CAPACIDADES OPERACIONAIS FINAS DO TENANT — ESPELHO NO FRONTEND
// =========================================================================
// A fonte da verdade é o servidor (`hasTenantPermission` em
// server/rbacEngine.ts + middleware `requireTenantPermission` em server/auth.ts).
// Aqui a mesma regra é reaplicada apenas para a interface reagir — esconder o
// que o usuário não pode fazer. Isto NUNCA é a barreira de segurança: o 403
// real vem do middleware, no servidor.
// =========================================================================

import type { UserSession } from '../types';
import type { TenantPermissionKey } from '../types/rbac';

/**
 * Admin do tenant e equipe SaaS possuem todas as capacidades por definição.
 * Espelha `hasTenantPermission` do servidor (rbacEngine.ts:328).
 */
export function hasAllTenantPermissions(user?: UserSession | null): boolean {
  if (!user) return false;
  return user.roleCode === 'tenant_admin' || !!user.isSaasScope;
}

/**
 * True quando o usuário possui a capacidade operacional fina.
 *
 * `tenantPermissions` ausente conta como "sem capacidades" — igual ao servidor,
 * que faz `!!user.tenantPermissions?.includes(key)`. Note que isto é diferente
 * da regra do menu, que só restringe quando o campo foi configurado; veja
 * `hasConfiguredTenantPermissions` em menuAccess.ts.
 */
export function hasTenantPermission(user: UserSession | null | undefined, key: TenantPermissionKey): boolean {
  if (!user) return false;
  if (hasAllTenantPermissions(user)) return true;
  return !!user.tenantPermissions?.includes(key);
}

/** True quando o usuário possui ao menos uma das capacidades informadas. */
export function hasAnyTenantPermission(
  user: UserSession | null | undefined,
  keys: readonly TenantPermissionKey[],
): boolean {
  if (keys.length === 0) return true;
  if (!user) return false;
  if (hasAllTenantPermissions(user)) return true;
  return keys.some((key) => !!user.tenantPermissions?.includes(key));
}
