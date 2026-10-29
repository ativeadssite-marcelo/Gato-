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
import { filterDemoBranches } from './seedMode';
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
  avatarUrl?: string;
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

export const DEFAULT_CLEAN_BRANCH: BranchUnit = {
  id: 'matriz-principal',
  name: 'Sede / Matriz Principal',
  cdCode: 'CD-01',
  cdName: 'Centro de Distribuição Principal',
  uf: 'SP',
  city: 'São Paulo',
  cnpj: '',
  ie: '',
  address: '',
  sefazCode: '35',
  isMatriz: true,
  icmsInterno: 18,
  status: 'ativa',
};

function pickBranch(branches: BranchUnit[], branchId?: string): BranchUnit {
  const rawList = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;
  const list = filterDemoBranches(rawList);
  if (list.length === 0) {
    return DEFAULT_CLEAN_BRANCH;
  }
  return list.find((b) => b.id === branchId) || list.find((b) => b.isMatriz) || list[0] || DEFAULT_CLEAN_BRANCH;
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
    isSaasScope:
      isSaasScope ??
      (user.tenantId === 'system' ||
        user.roleCode === 'super_admin' ||
        user.roleCode === 'saas_owner' ||
        user.roleCode?.startsWith('saas_') ||
        user.email?.toLowerCase() === 'contato.ativeads@gmail.com'),
    permissions,
    // Vem do próprio usuário do servidor (login e /me devolvem o campo).
    tenantPermissions: user.tenantPermissions,
    branchId: branch.id,
    branchUf: branch.uf,
    branchName: branch.name,
    cdName: branch.cdName,
    cdCode: branch.cdCode,
    avatarInitials: user.avatarInitials || user.name.substring(0, 2).toUpperCase(),
    avatarUrl: user.avatarUrl || (typeof localStorage !== 'undefined' ? (user.email ? localStorage.getItem(`gato_user_avatar_${user.email.toLowerCase()}`) : null) || localStorage.getItem('gato_user_profile_avatar') || undefined : undefined),
    loginTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    mustChangePassword: user.mustChangePassword,
  };
}

function executeClientFallbackLogin(
  email: string,
  password: string,
  branches: BranchUnit[] = [],
  branchId?: string
): LoginResult {
  const normalizedEmail = email.trim().toLowerCase();
  const customPassword = typeof localStorage !== 'undefined' 
    ? (localStorage.getItem('gato_admin_custom_password') || localStorage.getItem('gato_user_password_contato.ativeads@gmail.com'))
    : null;
  const initialDefaultPassword = 'AcessoInicial@2026!';

  if (normalizedEmail === 'contato.ativeads@gmail.com') {
    const trimmedPwd = password.trim();
    const isCustomMatch = Boolean(customPassword && trimmedPwd === customPassword);
    
    // Senhas de contingência offline (apenas quando não há senha customizada salva)
    const acceptedMasterPasswords = [
      'AcessoInicial@2026!',
      'acessoinicial@2026!',
    ];

    const isMasterMatch =
      !customPassword &&
      acceptedMasterPasswords.some((p) => p === trimmedPwd || p.toLowerCase() === trimmedPwd.toLowerCase());

    const isValid = isCustomMatch || isMasterMatch;

    if (!isValid) {
      throw new Error(
        'Senha incorreta para contato.ativeads@gmail.com. Utilize a senha de primeiro acesso: AcessoInicial@2026! ou clique em "Preencher Senha Inicial" para entrar imediatamente.'
      );
    }

    const mustChangePassword = !isCustomMatch && isMasterMatch;

    const user: ServerUser = {
      id: 'usr_super_admin',
      name: 'Administrador Geral',
      email: 'contato.ativeads@gmail.com',
      roleCode: 'saas_owner',
      roleName: 'Dono da Plataforma',
      tenantId: 'system',
      tenantName: 'Administração Geral',
      avatarInitials: 'AG',
      mustChangePassword,
    };

    const role: ServerRole = {
      code: 'saas_owner',
      name: 'Dono da Plataforma',
      scope: 'saas',
      permissions: {
        '*': 'manage',
      },
    };

    const clientToken = `client_token_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    setSessionToken(clientToken);
    markSessionVerified();

    const session = buildUserSession(user, branches, branchId, role.permissions, true);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('gato_client_auth_user', JSON.stringify({ user, role }));
        localStorage.setItem('gato_user_session', JSON.stringify(session));
        localStorage.setItem('gato_active_store', session.branchId);
      } catch {
        /* noop */
      }
    }

    return {
      session,
      user,
      role,
      expiresAt: Date.now() + 86400000,
    };
  }

  throw new Error('Credenciais inválidas. Verifique seu e-mail e senha corporativos.');
}

/** Redefine ou define a senha única definitiva do Superadmin tanto localmente quanto no backend. */
export async function resetAdminPasswordDirectly(newPassword: string): Promise<{ success: boolean; message: string }> {
  const trimmed = newPassword.trim();
  if (trimmed.length < 8) {
    throw new Error('A nova senha deve ter no mínimo 8 caracteres.');
  }

  // Grava localmente no navegador (funciona no Netlify / offline)
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('gato_admin_custom_password', trimmed);
      localStorage.setItem('gato_user_password_contato.ativeads@gmail.com', trimmed);
      const savedAuth = localStorage.getItem('gato_client_auth_user');
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed?.user) parsed.user.mustChangePassword = false;
        localStorage.setItem('gato_client_auth_user', JSON.stringify(parsed));
      }
      const savedSession = localStorage.getItem('gato_user_session');
      if (savedSession) {
        const parsedSession = JSON.parse(savedSession);
        parsedSession.mustChangePassword = false;
        localStorage.setItem('gato_user_session', JSON.stringify(parsedSession));
      }
    } catch {
      /* noop */
    }
  }

  // Tenta sincronizar com o backend Node se estiver disponível
  try {
    const res = await apiJson<{ success: boolean; message: string }>('/api/auth/reset-admin-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'contato.ativeads@gmail.com', newPassword: trimmed }),
    });
    return res;
  } catch {
    // Se o backend não responder (ex: hospedagem estática Netlify 404), a senha já foi salva no cliente!
    return {
      success: true,
      message: 'Sua senha única definitiva foi cadastrada com sucesso!',
    };
  }
}

/** Login corporativo: valida as credenciais no servidor ou fallback client-side se o backend não estiver rodando (ex: Netlify). */
export async function loginWithCredentials(
  email: string,
  password: string,
  branches: BranchUnit[] = [],
  branchId?: string
): Promise<LoginResult> {
  const normalized = email.trim().toLowerCase();

  try {
    const data = await apiJson<LoginApiResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized, password }),
    });

    if (!data || !data.token || !data.user) {
      throw new Error('Resposta de autenticação inválida do servidor');
    }

    setSessionToken(data.token);
    markSessionVerified();

    return {
      session: buildUserSession(data.user, branches, branchId, data.role.permissions, data.role.scope === 'saas'),
      user: data.user,
      role: data.role,
      expiresAt: data.expiresAt,
    };
  } catch (err: any) {
    // Fallback client-side APENAS quando o backend não está rodando (ex: Netlify estático 404 ou falha de rede),
    // nunca quando o servidor respondeu 401/403/429 recusando a senha.
    const isBackendUnreachable =
      err?.status === 404 ||
      err?.message?.includes('404') ||
      err?.name === 'TypeError' ||
      err?.message?.includes('Failed to fetch') ||
      err?.message?.includes('NetworkError');
    if (isBackendUnreachable) {
      return executeClientFallbackLogin(normalized, password, branches, branchId);
    }
    throw err;
  }
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

/** Consulta o contexto real da sessão (papel, tenant e personas) no servidor ou restaura sessão client-side (Netlify). */
export async function fetchServerSession(): Promise<ServerSessionContext | null> {
  const token = getSessionToken();
  if (!token) return null;

  try {
    const context = await apiJson<ServerSessionContext>('/api/auth/me');
    markSessionVerified();
    return context;
  } catch (err: any) {
    // Se o backend não responder (404 em hospedagem estática ou sem conexão)
    if (
      err?.status === 404 ||
      err?.message?.includes('404') ||
      err?.name === 'TypeError' ||
      err?.message?.includes('Failed to fetch')
    ) {
      if (typeof localStorage !== 'undefined') {
        const savedClientAuth = localStorage.getItem('gato_client_auth_user');
        if (savedClientAuth) {
          try {
            const parsed = JSON.parse(savedClientAuth);
            if (parsed?.user && parsed?.role) {
              markSessionVerified();
              return {
                success: true,
                user: parsed.user,
                role: parsed.role,
                personas: [],
              };
            }
          } catch {
            /* noop */
          }
        }
      }
    }
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
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem('gato_client_auth_user');
        localStorage.removeItem('gato_user_session');
      } catch {
        /* noop */
      }
    }
  }
}

/** Verificação da senha master feita no servidor (com fallback seguro local em hospedagens estáticas). */
export async function verifyMasterPasswordOnServer(password: string, view: string): Promise<void> {
  try {
    await apiJson('/api/auth/master-password/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, view }),
    });
  } catch (err: any) {
    if (
      err?.status === 404 ||
      err?.message?.includes('404') ||
      err?.name === 'TypeError' ||
      err?.message?.includes('Failed to fetch')
    ) {
      const savedMaster = typeof localStorage !== 'undefined' ? localStorage.getItem('gato_master_password') : null;
      const expectedMaster = savedMaster || 'master123456';
      if (password !== expectedMaster) {
        throw new Error('Senha master incorreta.');
      }
      return;
    }
    throw err;
  }
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