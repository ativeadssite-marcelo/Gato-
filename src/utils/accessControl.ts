import type { UserSession } from '../types';

// ============================================================
// CONTROLE DE ACESSO — Telas Administrativas Restritas
// ============================================================
// "Admin Impostos" (rota /superadmin) e "Governança & RBAC" só podem ser
// acessados por administradores E mediante senha master do
// superadmin. Sem a senha, as telas nem ficam visíveis.

const ADMIN_ROLES: UserSession['role'][] = ['admin', 'administrador'];

/** Senha master do superadmin (em produção, vir de variável de ambiente/backend). */
export const SUPERADMIN_MASTER_PASSWORD =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPERADMIN_MASTER_PASSWORD) ||
  'GATO@MASTER2026';

/** Views restritas que exigem elevação com senha master. */
export const RESTRICTED_VIEWS = ['admin', 'admin-impostos', 'rbac', 'admin-rbac', 'governanca', 'tenants', 'seguranca'];

/** Somente administradores podem tentar elevar acesso. */
export function isElevatedAdmin(user?: UserSession | null): boolean {
  if (!user) return false;
  return ADMIN_ROLES.includes(user.role);
}

/** Verifica se a view atual é restrita. */
export function isRestrictedView(view: string): boolean {
  return RESTRICTED_VIEWS.includes(view);
}

/** Confere a senha master do superadmin. */
export function verifyMasterPassword(password: string): boolean {
  return password === SUPERADMIN_MASTER_PASSWORD;
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
  if (!isElevatedAdmin(user)) return false;
  try {
    const raw = sessionStorage.getItem(UNLOCK_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed.userId !== user!.id) return false;
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
