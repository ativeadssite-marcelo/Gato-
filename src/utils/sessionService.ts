// =========================================================================
// SERVIÇO DE SESSÃO — AUTENTICAÇÃO REAL CONTRA O SERVIDOR
// =========================================================================
// Antes, o login era simulado no navegador: qualquer pessoa virava
// "administrador" editando o localStorage. Agora a identidade, o papel e o
// tenant vêm SEMPRE do servidor (token assinado), e o estado local é apenas um
// espelho para a interface.
// =========================================================================

import type { BranchUnit, CompanyProfile, UserRole, UserSession } from '../types';
import { INITIAL_BRANCHES } from '../data/initialData';
import {
  apiJson,
  clearSessionToken,
  getSessionToken,
  markSessionVerified,
  setSessionToken,
} from '../services/apiClient';

export interface ServerUser {
  id: string;
  name: string;
  email: string;
  roleCode: string;
  roleName: string;
  tenantId: string;
  tenantName: string;
  avatarInitials: string;
  mfaEnabled?: boolean;
  requiresMfa?: boolean;
  /** Capacidades operacionais finas do tenant (construtor flexível). */
  tenantPermissions?: string[];
  /** Exige troca de senha obrigatória (primeiro acesso) */
  mustChangePassword?: boolean;
}

export interface ServerRole {
  code?: string;
  name?: string;
  scope?: 'saas' | 'tenant';
  permissions?: Record<string, string>;
}

export interface ServerSessionContext {
  success: boolean;
  user: ServerUser;
  realUser?: ServerUser;
  role: ServerRole;
  tenantId: string;
  isSaasScope: boolean;
  impersonating: boolean;
  availablePersonas?: Array<{ id: string; name: string; roleCode: string; roleName: string; tenantId: string; tenantName: string }>;
}

export interface LoginResult {
  session: UserSession;
  user: ServerUser;
  role: ServerRole;
  expiresAt?: string;
}

interface LoginApiResponse {
  success: boolean;
  token: string;
  expiresAt: string;
  user: ServerUser;
  role: ServerRole;
  tenant: string;
}

/**
 * Mapeia o papel RBAC (fonte da verdade no servidor) para o papel usado pela
 * interface. Somente papéis realmente administrativos ganham 'administrador'.
 */
const RBAC_TO_UI_ROLE: Record<string, UserRole> = {
  super_admin: 'administrador',
  saas_financeiro: 'administrador',
  saas_fiscal: 'administrador',
  saas_suporte: 'administrador',
  saas_config: 'administrador',
  saas_cs: 'administrador',
  tenant_admin: 'gerente',
  tenant_user: 'vendedor',
  tenant_readonly: 'caixa',
};

export function toUiRole(roleCode: string): UserRole {
  return RBAC_TO_UI_ROLE[roleCode] || 'vendedor';
}

function pickBranch(branches: BranchUnit[], branchId?: string): BranchUnit {
  const list = branches.length > 0 ? branches : INITIAL_BRANCHES;
  return list.find((b) => b.id === branchId) || list.find((b) => b.isMatriz) || list[0];
}

/** Monta a sessão de interface a partir do usuário autenticado no servidor. */
export function buildUserSession(
  user: ServerUser,
  branches: BranchUnit[],
  branchId?: string,
  permissions?: Record<string, string>,
  isSaasScope?: boolean,
): UserSession {
  const branch = pickBranch(branches, branchId);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: toUiRole(user.roleCode),
    roleLabel: user.roleName,
    roleCode: user.roleCode,
    isSaasScope: isSaasScope ?? user.tenantId === 'system',
    permissions,
    // Vem do próprio usuário do servidor (login e /me devolvem o campo).
    tenantPermissions: user.tenantPermissions,
    branchId: branch.id,
    branchUf: branch.uf,
    branchName: branch.name,
    cdName: branch.cdName,
    cdCode: branch.cdCode,
    avatarInitials: user.avatarInitials || user.name.substring(0, 2).toUpperCase(),
    loginTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    mustChangePassword: user.mustChangePassword,
  };
}

/** Login corporativo: valida as credenciais no servidor e guarda o token da sessão. */
export async function loginWithCredentials(
  email: string,
  password: string,
  branches: BranchUnit[] = [],
  branchId?: string
): Promise<LoginResult> {
  const data = await apiJson<LoginApiResponse>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  setSessionToken(data.token);
  markSessionVerified();

  return {
    session: buildUserSession(data.user, branches, branchId, data.role.permissions, data.role.scope === 'saas'),
    user: data.user,
    role: data.role,
    expiresAt: data.expiresAt,
  };
}

export interface RegisterCompanyPayload {
  tradeName: string;
  corporateName?: string;
  cnpj?: string;
  stateRegistration?: string;
  segment?: string;
  adminName: string;
  email: string;
  password: string;
  phone?: string;
  city?: string;
  uf?: string;
}

export interface RegisterCompanyResult {
  session: UserSession;
  user: ServerUser;
  company: Partial<CompanyProfile>;
}

/** Cadastro de empresa + usuário administrador do tenant (criado no servidor). */
export async function registerCompany(
  payload: RegisterCompanyPayload,
  branches: BranchUnit[] = []
): Promise<RegisterCompanyResult> {
  const data = await apiJson<LoginApiResponse & { company: Partial<CompanyProfile> }>('/api/auth/register-company', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  setSessionToken(data.token);
  markSessionVerified();

  return {
    session: buildUserSession(data.user, branches, undefined, data.role.permissions, data.role.scope === 'saas'),
    user: data.user,
    company: data.company || {},
  };
}

/** Consulta o contexto real da sessão (papel, tenant e personas) no servidor. */
export async function fetchServerSession(): Promise<ServerSessionContext | null> {
  if (!getSessionToken()) return null;
  try {
    const context = await apiJson<ServerSessionContext>('/api/auth/me');
    markSessionVerified();
    return context;
  } catch {
    clearSessionToken();
    return null;
  }
}

/** Encerra a sessão no servidor (revoga o token) e limpa o estado local. */
export async function logoutSession(): Promise<void> {
  try {
    if (getSessionToken()) {
      await apiJson('/api/auth/logout', { method: 'POST' });
    }
  } catch {
    /* token já inválido: segue com a limpeza local */
  } finally {
    clearSessionToken();
  }
}

/** Verificação da senha master feita no servidor (nenhum segredo no bundle). */
export async function verifyMasterPasswordOnServer(password: string, view: string): Promise<void> {
  await apiJson('/api/auth/master-password/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, view }),
  });
}

export interface MasterPasswordStatus {
  configured: boolean;
  canElevate: boolean;
}

export async function fetchMasterPasswordStatus(): Promise<MasterPasswordStatus> {
  try {
    return await apiJson<MasterPasswordStatus>('/api/auth/master-password/status');
  } catch {
    return { configured: false, canElevate: false };
  }
}

/**
 * Login de demonstração só existe quando explicitamente habilitado em build/dev
 * E com senha fornecida por variável de ambiente (nunca embutida no código).
 */
export function getDemoLoginConfig(): { enabled: boolean; password: string } {
  const env = (import.meta as any)?.env || {};
  const flag = env.VITE_DEMO_LOGIN;
  const password = typeof env.VITE_DEMO_PASSWORD === 'string' && env.VITE_DEMO_PASSWORD ? env.VITE_DEMO_PASSWORD : 'senha123456';
  const isDev = env.DEV || env.MODE === 'development' || !env.PROD;
  const enabled = flag === 'true' || (flag !== 'false' && isDev);
  return { enabled, password };
}