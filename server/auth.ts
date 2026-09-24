// =========================================================================
// NÚCLEO DE AUTENTICAÇÃO, AUTORIZAÇÃO E SESSÃO — GATO SaaS
// =========================================================================
// Objetivo: eliminar a confiança em cabeçalhos enviados pelo cliente e o
// fallback silencioso para Super Admin. Toda identidade passa a ser provada
// por um token de sessão assinado (HMAC-SHA256) emitido somente no login.
//
// Princípios aplicados:
//  - Nenhuma credencial (senha de banco, chave mestra, senha demo) fica
//    embutida no bundle do cliente; a verificação é sempre server-side.
//  - O tenant de dados é SEMPRE derivado da sessão autenticada, nunca do
//    corpo/headers da requisição (evita vazamento entre tenants).
//  - Comparações de segredo usam timingSafeEqual (evita timing attack).
// =========================================================================

import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import {
  ROLE_DEFINITIONS,
  RBAC_USERS_DATA,
  AUDIT_LOGS_DATA,
  ROLE_OVERRIDES,
  hasTenantPermission,
} from "./rbacEngine";
import { TENANTS_DATA, SAAS_PLANS } from "./rbacEngine";
import {
  RbacUser,
  RbacRoleCode,
  PermissionAccessLevel,
  PermissionResource,
  TenantPermissionKey,
} from "../src/types/rbac";
import {
  AVAILABLE_USERS,
  DEFAULT_COMPANY_PROFILE,
} from "../src/data/initialData";
import { evaluateSubscriptionAccess, getTenantAccess } from "./billing/subscriptions";
import { findCredentialBySecret, touchLastUsed } from "./credentials";
import { consumeApiQuota } from "./quotas";
import type { ApiAuthContext } from "../src/types/credentials";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
      /**
       * Identidade resolvida por CHAVE DE API (integração por tenant). É separada
       * de `auth` de propósito: as rotas de /api/v1 leem daqui, então o alcance da
       * chave é exatamente as rotas que declaram `requireApiKey`.
       */
      apiAuth?: ApiAuthContext;
      rawBody?: Buffer;
    }
  }
}

export interface AuthContext {
  /** Usuário efetivo (persona ativa quando há impersonação) */
  user: RbacUser;
  role: (typeof ROLE_DEFINITIONS)[RbacRoleCode];
  /** Usuário realmente autenticado (quem fez login) */
  realUser: RbacUser;
  /** true quando um Super Admin está simulando outra persona */
  impersonating: boolean;
  tenantId: string;
  isSaasScope: boolean;
  ip: string;
  tokenId: string;
}

export interface SessionTokenPayload {
  sub: string; // ID do usuário autenticado (RBAC)
  act?: string; // ID da persona simulada (impersonação auditada)
  tid: string; // tenant do usuário autenticado
  role: RbacRoleCode;
  jti: string;
  iat: number;
  exp: number;
}

// =========================================================================
// CONFIGURAÇÃO DE SEGREDOS (SOMENTE SERVIDOR)
// =========================================================================

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const DEFAULT_TENANT_ID =
  process.env.GATO_DEFAULT_TENANT_ID ||
  DEFAULT_COMPANY_PROFILE.tenantId ||
  "cmtt58e6o0000ju346a0g6s32";
const SESSION_TTL_MINUTES = Math.max(
  5,
  parseInt(process.env.GATO_SESSION_TTL_MINUTES || "480", 10) || 480,
);
const IMPERSONATION_TTL_MINUTES = Math.max(
  5,
  parseInt(process.env.GATO_IMPERSONATION_TTL_MINUTES || "60", 10) || 60,
);

let ephemeralSecretWarned = false;

function getSessionSecret(): string {
  const configured = process.env.GATO_SESSION_SECRET;
  if (configured && configured.length >= 32) return configured;

  if (IS_PRODUCTION) {
    // Fail-closed: sem segredo forte não é possível assinar sessões com segurança.
    throw new Error(
      "[GATO Security] GATO_SESSION_SECRET ausente ou com menos de 32 caracteres. " +
        "Defina a variável de ambiente com um valor aleatório forte antes de iniciar em produção.",
    );
  }

  if (!ephemeralSecretWarned) {
    ephemeralSecretWarned = true;
    console.warn(
      "[GATO Security] GATO_SESSION_SECRET não configurado — usando segredo efêmero de desenvolvimento. " +
        "As sessões serão invalidadas ao reiniciar o servidor.",
    );
  }
  if (!(globalThis as any).__gatoEphemeralSecret) {
    (globalThis as any).__gatoEphemeralSecret = crypto
      .randomBytes(48)
      .toString("hex");
  }
  return (globalThis as any).__gatoEphemeralSecret as string;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(
    padded + "=".repeat((4 - (padded.length % 4)) % 4),
    "base64",
  );
}

/** Comparação resistente a timing attacks. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Ainda consome tempo constante para não revelar o tamanho.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function sign(payloadEncoded: string): string {
  return base64UrlEncode(
    crypto
      .createHmac("sha256", getSessionSecret())
      .update(payloadEncoded)
      .digest(),
  );
}

// =========================================================================
// TOKENS DE SESSÃO
// =========================================================================

export function issueSessionToken(
  user: RbacUser,
  impersonateUserId?: string,
): { token: string; expiresAt: string } {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ttl = impersonateUserId
    ? IMPERSONATION_TTL_MINUTES
    : SESSION_TTL_MINUTES;

  const payload: SessionTokenPayload = {
    sub: user.id,
    tid: user.tenantId,
    role: user.roleCode,
    jti: crypto.randomBytes(16).toString("hex"),
    iat: nowSeconds,
    exp: nowSeconds + ttl * 60,
  };
  if (impersonateUserId) payload.act = impersonateUserId;

  const encoded = base64UrlEncode(JSON.stringify(payload));
  const token = `${encoded}.${sign(encoded)}`;
  return { token, expiresAt: new Date(payload.exp * 1000).toISOString() };
}

export function verifySessionToken(
  token?: string | null,
): SessionTokenPayload | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  let expected: string;
  try {
    expected = sign(encoded);
  } catch {
    return null;
  }
  if (!safeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(
      base64UrlDecode(encoded).toString("utf8"),
    ) as SessionTokenPayload;
    if (!payload?.sub || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  const header = (req.headers["authorization"] || "") as string;
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  const fallback = req.headers["x-session-token"] as string | undefined;
  return fallback ? fallback.trim() : null;
}

// =========================================================================
// CONTROLE DE TENTATIVAS (anti brute-force)
// =========================================================================

interface AttemptRecord {
  count: number;
  firstAt: number;
  blockedUntil?: number;
}
const attempts = new Map<string, AttemptRecord>();
const revokedTokens = new Map<string, number>(); // jti -> expiração em ms

export function revokeToken(tokenId: string, expiresAtMs?: number) {
  revokedTokens.set(
    tokenId,
    expiresAtMs || Date.now() + SESSION_TTL_MINUTES * 60 * 1000,
  );
}

export function isTokenRevoked(tokenId: string): boolean {
  const expiresAt = revokedTokens.get(tokenId);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    revokedTokens.delete(tokenId);
    return false;
  }
  return true;
}

export function registerFailedAttempt(
  key: string,
  maxAttempts = 8,
  windowMs = 10 * 60 * 1000,
  blockMs = 15 * 60 * 1000,
) {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.firstAt > windowMs) {
    attempts.set(key, { count: 1, firstAt: now });
    return;
  }
  record.count += 1;
  if (record.count >= maxAttempts) record.blockedUntil = now + blockMs;
}

export function isAttemptBlocked(key: string): number {
  const record = attempts.get(key);
  if (!record?.blockedUntil) return 0;
  if (record.blockedUntil <= Date.now()) {
    attempts.delete(key);
    return 0;
  }
  return Math.ceil((record.blockedUntil - Date.now()) / 1000);
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}

/** Limpeza periódica para evitar crescimento indefinido em memória. */
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of attempts.entries()) {
      const expired = record.blockedUntil
        ? record.blockedUntil <= now
        : now - record.firstAt > 60 * 60 * 1000;
      if (expired) attempts.delete(key);
    }
    for (const [tokenId, expiresAt] of revokedTokens.entries()) {
      if (expiresAt <= now) revokedTokens.delete(tokenId);
    }
  },
  5 * 60 * 1000,
).unref?.();

// =========================================================================
// CREDENCIAIS DE ACESSO (SCrypt) — NUNCA EM TEXTO PLANO
// =========================================================================

interface CredentialRecord {
  userId: string;
  email: string;
  salt: string;
  hash: string;
}

const credentials = new Map<string, CredentialRecord>();

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function addCredential(userId: string, email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) return;
  const salt = crypto.randomBytes(16).toString("hex");
  credentials.set(normalized, {
    userId,
    email: normalized,
    salt,
    hash: hashPassword(password, salt),
  });
}

export function verifyPassword(
  email: string,
  password: string,
): RbacUser | null {
  const normalized = (email || "").trim().toLowerCase();
  const record = credentials.get(normalized);
  if (!record || !password) return null;
  if (!safeEqual(hashPassword(password, record.salt), record.hash)) return null;
  const user = RBAC_USERS_DATA.find((u) => u.id === record.userId);
  if (!user || !user.active) return null;
  return user;
}

export function isEmailRegistered(email: string): boolean {
  return credentials.has((email || "").trim().toLowerCase());
}

/** Cria a credencial (senha com salt + SCrypt). Retorna false se o e-mail já existe. */
export function registerCredential(
  userId: string,
  email: string,
  password: string,
): boolean {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized || !password) return false;
  if (credentials.has(normalized)) return false;
  addCredential(userId, normalized, password);
  return true;
}

/**
 * Validação de força mínima de senha (evita contas com senha trivial).
 */
export function isStrongPassword(password: string): {
  ok: boolean;
  error?: string;
} {
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, error: "A senha deve ter no mínimo 8 caracteres." };
  }
  if (password.length > 200) {
    return { ok: false, error: "A senha excede o tamanho máximo permitido." };
  }
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    return { ok: false, error: "A senha deve combinar letras e números." };
  }
  const weak = ["12345678", "senha123", "password", "gato1234", "admin123"];
  if (weak.includes(password.toLowerCase())) {
    return {
      ok: false,
      error: "Senha muito previsível. Escolha uma combinação mais forte.",
    };
  }
  return { ok: true };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test((email || "").trim());
}

export function onlyDigits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

const OPS_ROLE_MAP: Record<string, RbacRoleCode> = {
  administrador: "super_admin",
  admin: "super_admin",
  gerente: "tenant_admin",
  vendedor: "tenant_user",
  caixa: "tenant_user",
};

function upsertPrincipal(
  principal: Partial<RbacUser> & {
    id: string;
    email: string;
    name: string;
    roleCode: RbacRoleCode;
    tenantId: string;
  },
): RbacUser {
  const existing = RBAC_USERS_DATA.find((u) => u.id === principal.id);
  if (existing) {
    existing.roleCode = principal.roleCode;
    existing.roleName =
      ROLE_DEFINITIONS[principal.roleCode]?.name || principal.roleCode;
    existing.tenantId = principal.tenantId;
    existing.tenantName = principal.tenantName || existing.tenantName;
    return existing;
  }
  const created: RbacUser = {
    id: principal.id,
    tenantId: principal.tenantId,
    tenantName: principal.tenantName || "Empresa Contratante",
    name: principal.name,
    email: principal.email,
    roleCode: principal.roleCode,
    roleName: ROLE_DEFINITIONS[principal.roleCode]?.name || principal.roleCode,
    department: principal.department || "Operacional",
    active: true,
    avatarInitials: principal.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    mfaEnabled: ROLE_DEFINITIONS[principal.roleCode]?.requiresMfa || false,
    mfaEnforced: ROLE_DEFINITIONS[principal.roleCode]?.requiresMfa || false,
    lastLoginAt: "Nunca",
    lastLoginIp: "N/A",
    createdAt: new Date().toISOString(),
  };
  RBAC_USERS_DATA.push(created);
  return created;
}

/** Contas adicionais definidas por ambiente (GATO_USERS_JSON), sem senha no código. */
function seedEnvUsers() {
  const raw = process.env.GATO_USERS_JSON;
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed))
      throw new Error("GATO_USERS_JSON deve ser um array.");
    for (const entry of parsed) {
      if (!entry?.email || !entry?.password) continue;
      const roleCode = (entry.roleCode || "tenant_user") as RbacRoleCode;
      if (!ROLE_DEFINITIONS[roleCode]) continue;
      const tenantId = String(entry.tenantId || DEFAULT_TENANT_ID);
      const id = String(
        entry.id || `usr_env_${crypto.randomBytes(6).toString("hex")}`,
      );
      const user = upsertPrincipal({
        id,
        email: String(entry.email),
        name: String(entry.name || entry.email),
        roleCode,
        tenantId,
        tenantName: entry.tenantName,
        department: entry.department,
      });
      addCredential(user.id, user.email, String(entry.password));
    }
  } catch (err: any) {
    console.error(
      "[GATO Security] Falha ao interpretar GATO_USERS_JSON:",
      err?.message || err,
    );
  }
}

function seedDemoUsers() {
  // Em produção as contas de demonstração só existem se explicitamente habilitadas.
  const flag = process.env.GATO_ALLOW_DEMO_LOGIN;
  const demoEnabled = flag === "true" || (flag !== "false" && !IS_PRODUCTION);
  if (!demoEnabled) return;

  const demoPassword = process.env.GATO_DEMO_PASSWORD || "senha123456";

  // Personas operacionais da aplicação (payload → papel RBAC)
  for (const ops of AVAILABLE_USERS) {
    const roleCode = OPS_ROLE_MAP[ops.role] || "tenant_user";
    const user = upsertPrincipal({
      id: `usr_ops_${ops.id}`,
      email: ops.email,
      name: ops.name,
      roleCode,
      tenantId: DEFAULT_TENANT_ID,
      tenantName: DEFAULT_COMPANY_PROFILE.tradeName,
      department: ops.roleLabel,
    });
    addCredential(user.id, ops.email, demoPassword);
  }

  // Todos os usuários RBAC ativos (plataforma + tenants) recebem a senha demo,
  // permitindo testar o isolamento multi-tenant com contas reais.
  for (const rbacUser of RBAC_USERS_DATA.filter((u) => u.active)) {
    addCredential(rbacUser.id, rbacUser.email, demoPassword);
  }

  console.warn(
    `[GATO Security] Login de demonstração habilitado (${credentials.size} contas). ` +
      "Defina GATO_ALLOW_DEMO_LOGIN=false e use GATO_USERS_JSON em produção.",
  );
}

export function initCredentials() {
  seedEnvUsers();
  seedDemoUsers();
  // Remove qualquer credencial órfã (usuário inexistente/inativo)
  for (const [email, record] of credentials.entries()) {
    if (!RBAC_USERS_DATA.some((u) => u.id === record.userId && u.active))
      credentials.delete(email);
  }
}

initCredentials();

// =========================================================================
// REGISTRO DE EMPRESAS (SELF-SERVICE) — evita criação de tenant duplicado
// =========================================================================

export interface TenantRegistrationResult {
  ok: boolean;
  status: number;
  error?: string;
  tenantId?: string;
  userId?: string;
}

export function registerTenantWithAdmin(input: {
  corporateName: string;
  tradeName: string;
  cnpj: string;
  stateRegistration?: string;
  segment?: string;
  contactEmail: string;
  contactPhone?: string;
  city?: string;
  uf?: string;
  adminName: string;
  password: string;
}): TenantRegistrationResult {
  const corporateName = String(input.corporateName || "")
    .trim()
    .slice(0, 160);
  const tradeName = String(input.tradeName || corporateName)
    .trim()
    .slice(0, 160);
  const contactEmail = String(input.contactEmail || "")
    .trim()
    .toLowerCase()
    .slice(0, 160);
  const adminName = String(input.adminName || "")
    .trim()
    .slice(0, 120);
  const cnpjDigits = onlyDigits(input.cnpj);
  const uf = String(input.uf || "MS")
    .trim()
    .toUpperCase()
    .slice(0, 2);

  if (!corporateName || !tradeName) {
    return {
      ok: false,
      status: 400,
      error: "Razão social e nome fantasia são obrigatórios.",
    };
  }
  if (!isValidEmail(contactEmail)) {
    return { ok: false, status: 400, error: "E-mail corporativo inválido." };
  }
  if (cnpjDigits.length !== 14) {
    return {
      ok: false,
      status: 400,
      error: "CNPJ inválido: informe os 14 dígitos.",
    };
  }
  if (!adminName) {
    return {
      ok: false,
      status: 400,
      error: "Informe o nome do administrador responsável.",
    };
  }
  const strength = isStrongPassword(input.password);
  if (!strength.ok) return { ok: false, status: 400, error: strength.error };

  // Unicidade: nem CNPJ nem e-mail podem ser reaproveitados (evita sequestro de conta/tenant).
  if (TENANTS_DATA.some((t) => onlyDigits(t.cnpj) === cnpjDigits)) {
    return {
      ok: false,
      status: 409,
      error: "Já existe uma empresa cadastrada com este CNPJ.",
    };
  }
  if (
    isEmailRegistered(contactEmail) ||
    RBAC_USERS_DATA.some((u) => u.email.toLowerCase() === contactEmail)
  ) {
    return {
      ok: false,
      status: 409,
      error:
        "Este e-mail já possui acesso cadastrado. Faça login ou recupere sua senha.",
    };
  }

  const tenantId = `tnt_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const starterPlan =
    SAAS_PLANS.find((p) => p.code === "starter") || SAAS_PLANS[0];
  const nowIso = new Date().toISOString();

  TENANTS_DATA.push({
    id: tenantId,
    name: corporateName,
    tradeName,
    cnpj: input.cnpj || cnpjDigits,
    planId: starterPlan?.id || "plan_starter",
    planName: starterPlan?.name || "GATO SaaS Starter",
    status: "trial",
    contactEmail,
    contactPhone: String(input.contactPhone || "").slice(0, 40),
    city: String(input.city || "")
      .trim()
      .slice(0, 80),
    uf,
    createdAt: nowIso,
    mfaRequired: false,
    sessionTimeoutMinutes: 480,
    ipAllowlist: [],
    softBlockEnabled: true,
  } as any);

  const userId = `usr_tnt_admin_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const user = upsertPrincipal({
    id: userId,
    email: contactEmail,
    name: adminName,
    roleCode: "tenant_admin",
    tenantId,
    tenantName: tradeName,
    department: "Diretoria / Proprietário",
  });
  user.createdAt = nowIso;
  user.lastLoginAt = nowIso;

  if (!registerCredential(user.id, contactEmail, input.password)) {
    return {
      ok: false,
      status: 409,
      error: "Não foi possível criar a credencial: e-mail já cadastrado.",
    };
  }

  return { ok: true, status: 201, tenantId, userId };
}

// =========================================================================
// SENHA MASTER DO SUPERADMIN (verificada no servidor, nunca no cliente)
// =========================================================================

let masterPasswordSalt: string | null = null;
let masterPasswordHash: string | null = null;

function getMasterPasswordHash(): { salt: string; hash: string } | null {
  const configured = process.env.GATO_MASTER_PASSWORD;
  if (!configured || configured.length < 8) return null;
  if (!masterPasswordHash || !masterPasswordSalt) {
    masterPasswordSalt = crypto
      .createHash("sha256")
      .update("gato-master-salt")
      .digest("hex")
      .slice(0, 32);
    masterPasswordHash = hashPassword(configured, masterPasswordSalt);
  }
  return { salt: masterPasswordSalt, hash: masterPasswordHash };
}

export function verifyMasterPassword(password: string): boolean {
  const stored = getMasterPasswordHash();
  if (!stored) return false;
  return safeEqual(hashPassword(password || "", stored.salt), stored.hash);
}

export function isMasterPasswordConfigured(): boolean {
  return (process.env.GATO_MASTER_PASSWORD || "").length >= 8;
}

/** Papéis autorizados a elevar privilégio com a senha master. */
export function canElevateWithMasterPassword(user: RbacUser): boolean {
  const role = ROLE_DEFINITIONS[user.roleCode];
  if (!role) return false;
  return (
    user.roleCode === "super_admin" ||
    role.permissions.security_compliance === "full" ||
    role.permissions.fiscal_config === "full"
  );
}

// =========================================================================
// HELPERS DE AUDITORIA E REDE
// =========================================================================

export function getClientIp(req: Request): string {
  const trustProxy = process.env.GATO_TRUST_PROXY === "true";
  if (trustProxy) {
    const forwarded = (req.headers["x-forwarded-for"] as string) || "";
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return (req.socket?.remoteAddress || "127.0.0.1").slice(0, 64);
}

export function recordAudit(
  req: Request,
  actor: RbacUser,
  action: string,
  resource: PermissionResource | string,
  entityId: string,
  status: "success" | "warning" | "blocked",
  extra?: {
    justification?: string;
    details?: string;
    targetTenantId?: string;
    anomalous?: boolean;
  },
) {
  // Limita o crescimento da trilha em memória (evita exaustão de memória)
  if (AUDIT_LOGS_DATA.length > 5000) AUDIT_LOGS_DATA.length = 4000;

  AUDIT_LOGS_DATA.unshift({
    id: `aud_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    tenantId: extra?.targetTenantId || actor.tenantId || "system",
    userId: actor.id,
    userName: actor.name,
    userRole: actor.roleCode,
    ipAddress: getClientIp(req),
    action,
    resource: resource as PermissionResource,
    entityId,
    timestamp: new Date().toISOString(),
    justification: extra?.justification,
    status,
    anomalous: extra?.anomalous,
    afterState: extra?.details ? { details: extra.details } : undefined,
  });
}

// =========================================================================
// MIDDLEWARES
// =========================================================================

function unauthorized(
  res: Response,
  message = "Sessão ausente, inválida ou expirada. Faça login novamente.",
) {
  return res
    .status(401)
    .json({ success: false, error: message, code: "GATO_UNAUTHENTICATED" });
}

/** Exige token de sessão válido e resolve a identidade no servidor (fonte da verdade). */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const payload = verifySessionToken(extractToken(req));
  if (!payload) return unauthorized(res);
  if (isTokenRevoked(payload.jti))
    return unauthorized(
      res,
      "Sessão encerrada por logout. Faça login novamente.",
    );

  const realUser = RBAC_USERS_DATA.find((u) => u.id === payload.sub);
  if (!realUser || !realUser.active)
    return unauthorized(res, "Usuário não encontrado ou inativo.");

  let effectiveUser = realUser;
  let impersonating = false;
  if (payload.act) {
    // Impersonação só é permitida se o usuário real ainda for Super Admin.
    if (realUser.roleCode !== "super_admin") {
      return res.status(403).json({
        success: false,
        error: "Token de simulação inválido para este usuário.",
        code: "GATO_IMPERSONATION_DENIED",
      });
    }
    const target = RBAC_USERS_DATA.find(
      (u) => u.id === payload.act && u.active,
    );
    if (!target) return unauthorized(res, "Persona simulada não encontrada.");
    effectiveUser = target;
    impersonating = true;
  }

  const role = ROLE_DEFINITIONS[effectiveUser.roleCode];
  if (!role) return unauthorized(res, "Papel de usuário desconhecido.");

  req.auth = {
    user: effectiveUser,
    role,
    realUser,
    impersonating,
    tenantId: effectiveUser.tenantId,
    isSaasScope: role.scope === "saas",
    ip: getClientIp(req),
    tokenId: payload.jti,
  };
  return enforceSubscriptionAccess(req, res, next);
}

/**
 * Rota que permanece acessível mesmo com assinatura bloqueada: identidade/sessão
 * (`/api/auth/*`) e autosserviço de billing (`/api/billing/*`) — o caminho para o
 * tenant consultar e reativar a própria assinatura. Webhooks (sem sessão) e as
 * rotas admin do billing (escopo SaaS) não chegam a este gate.
 */
function isSubscriptionSelfService(req: Request): boolean {
  const fullPath = req.baseUrl + req.path;
  return fullPath.startsWith("/api/auth") || fullPath.startsWith("/api/billing");
}

/**
 * Gate de assinatura executado ao final do `requireAuth`. Isenta o escopo SaaS
 * (a equipe da plataforma gerencia tenants em qualquer status) e o autosserviço.
 * Tenant com trial/active/past_due segue; `expired` vira somente leitura (escrita
 * retorna 402); `suspended`/`canceled` são bloqueados (403). Bloqueios geram
 * trilha de auditoria.
 */
function enforceSubscriptionAccess(
  req: Request,
  res: Response,
  proceed: NextFunction,
): void {
  const auth = req.auth;
  if (!auth) return proceed();

  if (auth.isSaasScope) return proceed();
  if (isSubscriptionSelfService(req)) return proceed();

  getTenantAccess(auth.tenantId)
    .then((access) => {
      const decision = evaluateSubscriptionAccess(access.status, req.method);
      if (decision.kind === "allowed") return proceed();

      recordAudit(
        req,
        auth.user,
        `BLOCKED_${decision.code}`,
        "billing_contracts",
        auth.tenantId,
        "blocked",
        { details: `status=${access.status} method=${req.method}`, anomalous: true },
      );

      return res.status(decision.status).json({
        success: false,
        code: decision.code,
        error: decision.error,
        suggestion: decision.suggestion,
        subscriptionStatus: decision.subscriptionStatus,
      });
    })
    .catch((err: unknown) => {
      // Falha ao consultar o store de billing: não derruba a aplicação
      // (fail-open) — o espelho em memória raramente falha. Registra para triagem.
      const message = err instanceof Error ? err.message : String(err);
      console.error("[GATO Auth] Falha ao verificar acesso de assinatura:", message);
      return proceed();
    });
}

/** Bloqueia escrita (POST/PUT/PATCH/DELETE) para papéis somente leitura. */
function isWriteMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export function effectiveAccessLevel(
  user: RbacUser,
  resource: PermissionResource,
): PermissionAccessLevel | undefined {
  const role = ROLE_DEFINITIONS[user.roleCode];
  return user.customOverrides?.[resource] ?? ROLE_OVERRIDES[user.roleCode]?.[resource] ?? role?.permissions?.[resource];
}

export interface AuthorizationDecision {
  allowed: boolean;
  status: number;
  code?: string;
  error?: string;
  requiresAudit?: boolean;
}

/**
 * Avalia permissão e fronteira de tenant.
 * targetTenantId só é aceito para papéis SaaS e exige justificativa/auditoria.
 */
export function authorize(
  user: RbacUser,
  resource: PermissionResource,
  options: {
    method?: string;
    targetTenantId?: string;
    justification?: string;
    allowImpersonationWrites?: boolean;
  } = {},
): AuthorizationDecision {
  const role = ROLE_DEFINITIONS[user.roleCode];
  if (!role) {
    return {
      allowed: false,
      status: 403,
      code: "RBAC_UNKNOWN_ROLE",
      error: "Papel de usuário desconhecido.",
    };
  }

  const level = effectiveAccessLevel(user, resource);
  if (!level || level === "none") {
    return {
      allowed: false,
      status: 403,
      code: "RBAC_PERMISSION_DENIED",
      error: `Acesso negado: o papel '${role.name}' não possui permissão para '${resource}'.`,
    };
  }

  if (
    isWriteMethod(options.method || "GET") &&
    (level === "read_only" || level === "masked")
  ) {
    return {
      allowed: false,
      status: 403,
      code: "RBAC_READ_ONLY",
      error: `Operação de escrita bloqueada: o papel '${role.name}' possui apenas leitura em '${resource}'.`,
    };
  }

  const target = options.targetTenantId?.trim();

  // Isolamento multi-tenant: papéis de tenant JAMAIS acessam outro tenant.
  if (role.scope === "tenant") {
    if (target && target !== user.tenantId) {
      return {
        allowed: false,
        status: 403,
        code: "RBAC_TENANT_ISOLATION",
        error: `Violação de isolamento multi-tenant: '${user.tenantName}' não pode acessar dados de outro tenant.`,
        requiresAudit: true,
      };
    }
    return { allowed: true, status: 200 };
  }

  // Papéis SaaS: acessar tenant alvo exige permissão específica + justificativa.
  if (target && target !== user.tenantId) {
    if (level === "audit_required") {
      if (!options.justification || options.justification.trim().length < 8) {
        return {
          allowed: false,
          status: 403,
          code: "RBAC_JUSTIFICATION_REQUIRED",
          error:
            "Acesso a dados de tenant exige justificativa técnica formal (mínimo 8 caracteres), registrada na trilha de auditoria.",
          requiresAudit: true,
        };
      }
      return { allowed: true, status: 200, requiresAudit: true };
    }
    // Papéis SaaS com leitura/escrita simples não podem atravessar tenants.
    if (
      level === "read_only" ||
      level === "masked" ||
      level === "own_tenant_only"
    ) {
      return {
        allowed: false,
        status: 403,
        code: "RBAC_TENANT_ISOLATION",
        error:
          "Acesso a dados de outro tenant não é permitido para este papel.",
        requiresAudit: true,
      };
    }
  }

  return {
    allowed: true,
    status: 200,
    requiresAudit: level === "audit_required",
  };
}

interface PermissionOptions {
  write?: boolean;
  allowImpersonation?: boolean;
}

/** Middleware: exige autenticação + permissão para um recurso. */
/**
 * Recursos que carregam dado OPERACIONAL do contratante: cadastro de itens,
 * clientes, fornecedores, filiais, orçamentos. Isolados por tenant e invisíveis
 * para a plataforma — inclusive para o dono do SaaS.
 */
export const TENANT_OPERATIONAL_RESOURCES: PermissionResource[] = [
  "company_data",
  "customers_employees",
];

export function requirePermission(
  resource: PermissionResource,
  options: PermissionOptions = {},
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return unauthorized(res);

    // Dado operacional do contratante é negado por COMPLETO sob simulação de
    // persona — leitura inclusive. A persona serve para ver estrutura, menus e
    // permissões; sem isto, assumir a identidade do admin do cliente dava acesso
    // de leitura a produto/cliente/orçamento dele, e o bloqueio de escrita logo
    // abaixo não bastava para sustentar a separação entre plataforma e contratante.
    if (auth.impersonating && TENANT_OPERATIONAL_RESOURCES.includes(resource)) {
      recordAudit(
        req,
        auth.user,
        `BLOCKED_IMPERSONATED_${resource.toUpperCase()}`,
        resource,
        readTargetTenantId(req) || auth.tenantId,
        "blocked",
        {
          anomalous: true,
          details:
            "Simulação de persona tentou acessar dado operacional de contratante. A persona é restrita a estrutura e permissões.",
        },
      );
      return res.status(403).json({
        success: false,
        error:
          "Simulação de persona não acessa dados operacionais de contratantes. Volte ao seu perfil, se for um atendimento autorizado.",
        code: "RBAC_IMPERSONATION_TENANT_DATA_DENIED",
        resource,
      });
    }

    if (
      auth.impersonating &&
      !options.allowImpersonation &&
      isWriteMethod(req.method)
    ) {
      // Simulação de persona é estritamente para leitura/inspeção.
      return res.status(403).json({
        success: false,
        error:
          "Modo de simulação de persona é somente leitura. Volte ao seu perfil para executar alterações.",
        code: "RBAC_IMPERSONATION_READ_ONLY",
      });
    }

    const decision = authorize(auth.user, resource, {
      method: req.method,
      targetTenantId: readTargetTenantId(req),
      justification: readJustification(req),
    });

    if (!decision.allowed) {
      recordAudit(
        req,
        auth.user,
        `BLOCKED_${resource.toUpperCase()}`,
        resource,
        readTargetTenantId(req) || "unknown",
        "blocked",
        {
          justification: readJustification(req),
          details: decision.error,
          anomalous: true,
        },
      );
      return res.status(decision.status).json({
        success: false,
        error:
          decision.error || "Acesso negado pela política de segurança RBAC.",
        code: decision.code,
        resource,
        userRole: auth.user.roleCode,
      });
    }

    if (decision.requiresAudit) {
      recordAudit(
        req,
        auth.user,
        `AUDITED_ACCESS_${resource.toUpperCase()}`,
        resource,
        readTargetTenantId(req) || auth.tenantId,
        "success",
        {
          justification: readJustification(req),
        },
      );
    }
    return next();
  };
}

/** Middleware: exige escopo SaaS (equipe da plataforma). */
export function requireSaasScope(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.auth) return unauthorized(res);
  if (!req.auth.isSaasScope) {
    recordAudit(
      req,
      req.auth.user,
      "BLOCKED_SAAS_SCOPE",
      "security_compliance",
      req.auth.tenantId,
      "blocked",
      { anomalous: true },
    );
    return res.status(403).json({
      success: false,
      error:
        "Operação restrita à equipe administrativa da plataforma (escopo SaaS).",
      code: "RBAC_SAAS_SCOPE_REQUIRED",
    });
  }
  return next();
}

/**
 * Exige uma capacidade operacional fina do tenant (construtor flexível).
 * Deve vir DEPOIS de `requireAuth` e ANTES de `requirePermission`. O admin do
 * tenant e o escopo SaaS possuem todas as capacidades; os demais usuários de
 * tenant precisam da capacidade atribuída explicitamente pelo admin.
 */
export function requireTenantPermission(key: TenantPermissionKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) return unauthorized(res);
    if (hasTenantPermission(auth.user, key)) return next();

    recordAudit(
      req,
      auth.user,
      `BLOCKED_TENANT_PERMISSION_${key.toUpperCase()}`,
      "customers_employees",
      auth.tenantId,
      "blocked",
      { details: `capacidade '${key}' não atribuída ao usuário`, anomalous: true },
    );

    return res.status(403).json({
      success: false,
      code: "TENANT_PERMISSION_DENIED",
      error: `Seu perfil não possui a permissão operacional '${key}'. Solicite ao administrador da sua empresa.`,
      requiredPermission: key,
    });
  };
}

/**
 * Autoriza quando o usuário possui permissão em QUALQUER um dos recursos listados.
 * Útil para recursos operacionais compartilhados entre setores (ex.: pedidos de loja
 * e cadastros) sem abrir mão do isolamento por tenant.
 */
export function requireAnyPermission(
  resources: PermissionResource[],
  options: PermissionOptions = {},
) {
  const guards = resources.map((resource) =>
    requirePermission(resource, options),
  );
  return (req: Request, res: Response, next: NextFunction) => {
    let index = 0;
    const tryNext = (): void => {
      const guard = guards[index++];
      if (!guard) {
        // Todas as alternativas negaram acesso.
        if (!res.headersSent) {
          res.status(403).json({
            success: false,
            error: `Acesso negado: nenhum dos perfis do usuário possui permissão para ${resources.join(" / ")}.`,
            code: "RBAC_PERMISSION_DENIED",
          });
        }
        return;
      }
      const originalJson = res.json.bind(res);
      // Intercepta negações (403) para tentar o próximo recurso; se qualquer
      // recurso for permitido, segue imediatamente para o handler da rota.
      res.json = ((body: any) => {
        if (res.statusCode === 403) {
          res.json = originalJson;
          res.statusCode = 200;
          tryNext();
          return res;
        }
        return originalJson(body);
      }) as typeof res.json;
      guard(req, res, () => {
        res.json = originalJson;
        next();
      });
    };
    tryNext();
  };
}

/**
 * Aceita sessão autenticada OU chave de ingestão server-to-server
 * (webhooks de gateways/marketplaces). Sem chave configurada, o endpoint
 * permanece fechado (fail-closed) em vez de processar dados não autenticados.
 */
export function requireIngestAuth(apiKeyEnvName = "GATO_INGEST_API_KEY") {
  return (req: Request, res: Response, next: NextFunction) => {
    const payload = verifySessionToken(extractToken(req));
    if (payload && !isTokenRevoked(payload.jti))
      return requireAuth(req, res, next);

    const configured = process.env[apiKeyEnvName];
    const provided = (req.headers["x-gato-ingest-key"] as string) || "";
    if (
      configured &&
      configured.length >= 16 &&
      provided &&
      safeEqual(provided, configured)
    ) {
      return next();
    }

    return res.status(401).json({
      success: false,
      error: configured
        ? "Credenciais de ingestão inválidas."
        : `Webhook fechado: configure a variável de ambiente ${apiKeyEnvName} para habilitar integrações externas.`,
      code: configured ? "GATO_UNAUTHENTICATED" : "GATO_WEBHOOK_NOT_CONFIGURED",
    });
  };
}

/**
 * Ator sintético APENAS para a trilha de auditoria — nunca para autorização.
 *
 * A chave de API não tem usuário, mas o registro de auditoria precisa de um nome
 * para exibir. Se este objeto fosse usado para decidir acesso, a chave herdaria
 * todo o alcance do papel escolhido aqui — por isso a autorização de /api/v1 sai
 * de `req.apiAuth`, não daqui.
 */
export function apiActorFor(credential: { id: string; tenantId: string; label: string }): RbacUser {
  return {
    id: credential.id,
    tenantId: credential.tenantId,
    tenantName:
      TENANTS_DATA.find((t) => t.id === credential.tenantId)?.name || credential.tenantId,
    name: `${credential.label} (chave de API)`,
    email: "",
    roleCode: "tenant_user",
    roleName: "Integração via chave de API",
    active: true,
    avatarInitials: "API",
    mfaEnabled: false,
    mfaEnforced: false,
    lastLoginAt: "",
    lastLoginIp: "",
    createdAt: "",
  };
}

function denyApiKey(
  req: Request,
  res: Response,
  credential: { id: string; tenantId: string; label: string },
  status: number,
  code: string,
  error: string,
  details: string,
  extra: Record<string, unknown> = {},
) {
  recordAudit(req, apiActorFor(credential), code, "tenant_credentials", credential.id, "blocked", {
    targetTenantId: credential.tenantId,
    details,
    anomalous: true,
  });
  return res.status(status).json({ success: false, error, code, ...extra });
}

/**
 * Autentica e autoriza uma requisição por CHAVE DE API do tenant.
 *
 * Diferente de `requireIngestAuth` (chave global de env, sem tenant), aqui a chave
 * resolve um contratante e o escopo fica travado nele: o `tenantId` sai de
 * `req.apiAuth` e nunca do corpo ou da query string.
 *
 * Ordem das checagens — assinatura, assinatura vencida, capacidade, cota. A
 * capacidade vem ANTES da cota de propósito: uma requisição que a chave nem tem
 * permissão de fazer não deve consumir a franquia diária do cliente.
 */
export function requireApiKey(requiredCapability: TenantPermissionKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const provided = String(req.headers["x-api-key"] || "").trim();
    if (!provided) {
      return res.status(401).json({
        success: false,
        error: "Informe a chave de API no cabeçalho x-api-key.",
        code: "API_KEY_REQUIRED",
      });
    }

    const credential = await findCredentialBySecret(provided);

    // Chave desconhecida não é auditada: não há tenant para registrar, e qualquer
    // prefixo inventado viraria flood na trilha de auditoria.
    if (!credential) {
      return res.status(401).json({
        success: false,
        error: "Chave de API inválida.",
        code: "API_KEY_INVALID",
      });
    }

    if (!credential.active) {
      return denyApiKey(req, res, credential, 401, "API_KEY_REVOKED",
        "Esta chave de API foi revogada.", "Requisição com chave de API revogada.");
    }

    // A integração respeita o mesmo bloqueio de assinatura que a interface: um
    // tenant suspenso não continua sincronizando dados por API.
    const access = await getTenantAccess(credential.tenantId);
    const subscriptionDecision = evaluateSubscriptionAccess(access.status, req.method);
    if (subscriptionDecision.kind !== "allowed") {
      return denyApiKey(req, res, credential, subscriptionDecision.status, subscriptionDecision.code,
        subscriptionDecision.error,
        `Assinatura do tenant impediu a chamada de API (status=${access.status}).`,
        { suggestion: subscriptionDecision.suggestion, subscriptionStatus: subscriptionDecision.status });
    }

    if (!credential.capabilities.includes(requiredCapability)) {
      return denyApiKey(req, res, credential, 403, "API_KEY_CAPABILITY_DENIED",
        `Esta chave não tem a permissão operacional '${requiredCapability}'.`,
        `Chave sem a capacidade '${requiredCapability}'.`);
    }

    const quota = await consumeApiQuota(credential.tenantId);
    res.setHeader("X-RateLimit-Limit", String(quota.limit));
    if (!quota.allowed) {
      res.setHeader("X-RateLimit-Remaining", "0");
      res.setHeader("Retry-After", String(quota.retryAfterSeconds));
      return denyApiKey(req, res, credential, 429, "API_QUOTA_EXCEEDED",
        `Cota diária de ${quota.limit} requisições de API do plano foi atingida. Tente novamente após a virada do dia.`,
        `Cota diária de API atingida (${quota.used}/${quota.limit}).`,
        { quota: { used: quota.used, limit: quota.limit, resetInSeconds: quota.retryAfterSeconds } });
    }
    res.setHeader("X-RateLimit-Remaining", String(quota.remaining));

    req.apiAuth = {
      credentialId: credential.id,
      tenantId: credential.tenantId,
      label: credential.label,
      capabilities: credential.capabilities,
    };

    // Não bloqueia a resposta: o carimbo de uso é acessório.
    void touchLastUsed(credential.id);
    return next();
  };
}

export function readTargetTenantId(req: Request): string | undefined {
  const raw = (req.params?.tenantId ||
    (req.body && typeof req.body === "object"
      ? req.body.tenantId
      : undefined) ||
    (req.query?.tenantId as string) ||
    (req.headers["x-target-tenant-id"] as string)) as string | undefined;
  return raw ? String(raw).trim().slice(0, 64) : undefined;
}

export function readJustification(req: Request): string | undefined {
  const raw = ((req.headers["x-justification"] as string) ||
    (req.body && typeof req.body === "object"
      ? req.body.justification
      : undefined)) as string | undefined;
  return raw ? String(raw).trim().slice(0, 500) : undefined;
}

export interface DataScope {
  ok: boolean;
  status: number;
  tenantId?: string;
  /** true = consulta global (todo o portfólio de tenants) — apenas equipe SaaS, sempre auditado. */
  global?: boolean;
  code?: string;
  error?: string;
}

/**
 * Define QUAL tenant os dados podem ser lidos/gravados.
 * Regra: papel de tenant sempre usa o próprio tenant (ignora o que o cliente pediu).
 * Papel SaaS pode informar um tenant alvo, sujeito a justificativa/auditoria.
 */
export function resolveDataScope(
  req: Request,
  resource: PermissionResource = "company_data",
): DataScope {
  const auth = req.auth;
  if (!auth)
    return {
      ok: false,
      status: 401,
      code: "GATO_UNAUTHENTICATED",
      error: "Sessão inválida.",
    };

  // Defesa em profundidade: o guard de `requirePermission` já barra isto, mas o
  // escopo é o último ponto antes da query — se uma rota futura esquecer o
  // middleware, o dado operacional do contratante ainda não sai sob persona.
  if (auth.impersonating && TENANT_OPERATIONAL_RESOURCES.includes(resource)) {
    return {
      ok: false,
      status: 403,
      code: "RBAC_IMPERSONATION_TENANT_DATA_DENIED",
      error:
        "Simulação de persona não acessa dados operacionais de contratantes.",
    };
  }

  if (!auth.isSaasScope) {
    return { ok: true, status: 200, tenantId: auth.user.tenantId };
  }

  const requested = readTargetTenantId(req);

  if (!requested) {
    // Recurso com auditoria obrigatória continua exigindo justificativa AQUI
    // também. Sem isto bastava omitir o tenant alvo para trocar a justificativa
    // por um escopo MAIOR: o caminho global devolve todas as empresas, então a
    // saída para não se justificar era pedir mais dado, não menos.
    if (effectiveAccessLevel(auth.user, resource) === "audit_required") {
      const justificativaGlobal = readJustification(req);
      if (!justificativaGlobal || justificativaGlobal.trim().length < 8) {
        return {
          ok: false,
          status: 403,
          code: "RBAC_JUSTIFICATION_REQUIRED",
          error:
            "Consulta global a dados de tenants exige justificativa técnica formal (mínimo 8 caracteres), registrada na trilha de auditoria.",
        };
      }
    }

    // Equipe da plataforma consultando o portfólio inteiro: acesso amplo, porém auditado.
    recordAudit(
      req,
      auth.user,
      `GLOBAL_TENANT_DATA_${resource.toUpperCase()}`,
      resource,
      "all-tenants",
      "warning",
      {
        details:
          "Consulta global de dados de tenants executada pela equipe administrativa da plataforma.",
        justification: readJustification(req),
      },
    );
    return { ok: true, status: 200, global: true };
  }

  const target = requested;

  const decision = authorize(auth.user, resource, {
    method: req.method,
    targetTenantId: target,
    justification: readJustification(req),
  });

  if (!decision.allowed) {
    return {
      ok: false,
      status: decision.status,
      code: decision.code,
      error: decision.error,
    };
  }
  if (decision.requiresAudit) {
    recordAudit(
      req,
      auth.user,
      `AUDITED_TENANT_DATA_${resource.toUpperCase()}`,
      resource,
      target,
      "success",
      {
        justification: readJustification(req),
        targetTenantId: target,
      },
    );
  }
  return { ok: true, status: 200, tenantId: target };
}

/** Resposta padronizada de negação de escopo. */
export function sendScopeDenied(res: Response, scope: DataScope) {
  return res.status(scope.status || 403).json({
    success: false,
    error: scope.error || "Acesso negado ao escopo de dados solicitado.",
    code: scope.code,
  });
}

export function getDefaultTenantId(): string {
  return DEFAULT_TENANT_ID;
}
