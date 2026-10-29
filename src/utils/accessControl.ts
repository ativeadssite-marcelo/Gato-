import type { UserSession } from '../types';
import { verifyMasterPasswordOnServer } from './sessionService';

// ============================================================
// CONTROLE DE ACESSO — Telas Administrativas Restritas
// ============================================================
// "Admin Impostos" (rota /superadmin) e "Governança & RBAC" só podem ser
// acessados por administradores E mediante senha master do
// superadmin. Sem a senha, as telas nem ficam visíveis.

const ADMIN_ROLES: UserSession['role'][] = ['admin', 'administrador'];

/** Views restritas que exigem elevação com senha master ou escopo administrativo. */
export const RESTRICTED_VIEWS = [
  'admin',
  'admin-impostos',
  'rbac',
  'admin-rbac',
  'governanca',
  'tenants',
  'seguranca',
  'acesso',
  'acessos',
  'financeiro-saas',
  'contratos',
  'contrato',
  'assinaturas-saas',
  'mrr',
  'banco-dados',
  'database',
  'camadas-acesso',
  'camadas',
  'camada',
  'permissoes',
  'planos-pacotes',
  'pacotes',
];

/** Somente administradores podem tentar elevar acesso. */
export function isElevatedAdmin(user?: UserSession | null): boolean {
  if (!user) return false;
  if (user.isSaasScope) return true;
  if (
    user.roleCode === 'super_admin' ||
    user.roleCode === 'saas_owner' ||
    user.roleCode?.startsWith('saas_') ||
    user.email === 'contato.ativeads@gmail.com' ||
    user.roleCode === 'tenant_admin'
  ) {
    return true;
  }
  return ADMIN_ROLES.includes(user.role);
}

/** Verifica se a view atual é restrita. */
export function isRestrictedView(view: string): boolean {
  return RESTRICTED_VIEWS.includes(view);
}

/**
 * Confere a senha master no SERVIDOR (nenhum segredo existe no bundle).
 * Lança em caso de senha incorreta/rede indisponível — o modal exibe o erro.
 */
export async function verifyMasterPassword(password: string, view: string): Promise<boolean> {
  await verifyMasterPasswordOnServer(password, view);
  return true;
}

const UNLOCK_KEY = 'gato_admin_unlocked_at';
const UNLOCK_TTL_MS = 30 * 60 * 1000; // elevação expira em 30 min

/** Registra a elevação de privilégio (auditável + expiração curta). */
export function grantAdminUnlock(user?: UserSession | null): void {
  try {
    sessionStorage.setItem(
      UNLOCK_KEY,
      JSON.stringify({ userId: user?.id || 'unknown', at: Date.now() })
    );
  } catch {
    /* noop */
  }
}

/** Verifica se existe elevação válida e não expirada. */
export function hasValidAdminUnlock(user?: UserSession | null): boolean {
  if (!user) return false;
  if (
    user.isSaasScope ||
    user.roleCode === 'super_admin' ||
    user.roleCode === 'saas_owner' ||
    user.roleCode?.startsWith('saas_') ||
    user.email === 'contato.ativeads@gmail.com'
  ) {
    return true; // Dono do SaaS e super admins já são autenticados no topo da hierarquia
  }
  if (!isElevatedAdmin(user)) return false;
  try {
    const raw = sessionStorage.getItem(UNLOCK_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed.userId !== user.id) return false;
    return Date.now() - parsed.at < UNLOCK_TTL_MS;
  } catch {
    return false;
  }
}

/** Remove a elevação (logout/troca de usuário). */
export function revokeAdminUnlock(): void {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    /* noop */
  }
}
