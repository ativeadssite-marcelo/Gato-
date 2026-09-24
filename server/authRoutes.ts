// =========================================================================
// ROTAS DE AUTENTICAÇÃO — LOGIN, CADASTRO, SESSÃO E ELEVAÇÃO DE PRIVILÉGIO
// =========================================================================
// Substitui o modelo anterior em que a identidade vinha de cabeçalhos enviados
// pelo navegador (x-user-id / x-user-role) com fallback automático para Super
// Admin — o que permitia a qualquer visitante assumir o controle total.
// =========================================================================

import crypto from "crypto";
import { Router, Request, Response } from "express";
import {
  requireAuth,
  issueSessionToken,
  revokeToken,
  verifyPassword,
  registerCredential,
  isEmailRegistered,
  verifyMasterPassword,
  canElevateWithMasterPassword,
  isMasterPasswordConfigured,
  registerFailedAttempt,
  isAttemptBlocked,
  clearAttempts,
  getClientIp,
  recordAudit,
  isStrongPassword,
  isValidEmail,
  onlyDigits,
  getDefaultTenantId,
} from "./auth";
import { AUDIT_LOGS_DATA, RBAC_USERS_DATA, ROLE_DEFINITIONS, TENANTS_DATA, SAAS_PLANS, maskCnpj } from "./rbacEngine";
import { RbacRoleCode, RbacUser, TenantAccount } from "../src/types/rbac";

export const authRouter = Router();

const MAX_EMAIL_LENGTH = 160;
const MAX_PASSWORD_LENGTH = 200;

function maskEmailSafe(email: string): string {
  const clean = String(email || "").trim().toLowerCase();
  const at = clean.indexOf("@");
  if (at <= 0) return "*****";
  const user = clean.slice(0, at);
  const domain = clean.slice(at + 1);
  const visible = user.length > 2 ? user.slice(0, 2) : user.slice(0, 1);
  return `${visible}***@${domain}`;
}

/** Registra evento de autenticação na trilha de auditoria (com PII mascarada). */
function logAuthEvent(
  req: Request,
  action: string,
  email: string,
  status: "success" | "warning" | "blocked",
  details?: string,
  tenantId = "system"
) {
  // Limita o crescimento da trilha em memória (evita exaustão de memória)
  if (AUDIT_LOGS_DATA.length > 5000) AUDIT_LOGS_DATA.length = 4000;
  AUDIT_LOGS_DATA.unshift({
    id: `aud_auth_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    tenantId,
    userId: "anonymous",
    userName: maskEmailSafe(email),
    userRole: "super_admin",
    ipAddress: getClientIp(req),
    action,
    resource: "security_compliance",
    entityId: maskEmailSafe(email),
    timestamp: new Date().toISOString(),
    justification: details,
    status,
    anomalous: status !== "success",
  });
}

function appendAuthAudit(req: Request, actor: RbacUser, action: string, entityId: string, status: "success" | "blocked", details?: string) {
  logAuthEvent(req, action, actor.email, status === "success" ? "success" : "blocked", details, actor.tenantId);
  void entityId;
}

// =========================================================================
// 1. LOGIN CORPORATIVO (senha verificada com SCrypt no servidor)
// =========================================================================
authRouter.post("/login", (req: Request, res: Response) => {
  const email = String(req.body?.email || "").trim().slice(0, MAX_EMAIL_LENGTH);
  const password = String(req.body?.password || "").slice(0, MAX_PASSWORD_LENGTH);

  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Informe e-mail e senha corporativos." });
  }

  const ip = getClientIp(req);
  const attemptKey = `${email.toLowerCase()}|${ip}`;
  const blockedFor = isAttemptBlocked(attemptKey) || isAttemptBlocked(`ip:${ip}`);
  if (blockedFor > 0) {
    logAuthEvent(req, "LOGIN_BLOCKED_RATE_LIMIT", email, "blocked", "Múltiplas tentativas inválidas.");
    res.setHeader("Retry-After", String(blockedFor));
    return res.status(429).json({
      success: false,
      error: "Muitas tentativas de login inválidas. Tente novamente mais tarde.",
      retryAfter: blockedFor,
    });
  }

  const user = verifyPassword(email, password);

  if (!user) {
    // Resposta genérica: não revela se o e-mail existe (evita enumeração de contas)
    registerFailedAttempt(attemptKey);
    registerFailedAttempt(`ip:${ip}`, 20, 10 * 60 * 1000, 15 * 60 * 1000);
    logAuthEvent(req, "LOGIN_FAILED", email, "warning", "Credenciais inválidas.");
    return res.status(401).json({
      success: false,
      error: "Credenciais inválidas. Verifique e-mail e senha.",
      code: "GATO_INVALID_CREDENTIALS",
    });
  }

  clearAttempts(attemptKey);
  user.lastLoginAt = new Date().toISOString();
  user.lastLoginIp = ip;

  const { token, expiresAt } = issueSessionToken(user);
  const role = ROLE_DEFINITIONS[user.roleCode];

  logAuthEvent(req, "LOGIN_SUCCESS", user.email, "success", `Login autorizado para papel ${user.roleCode}.`, user.tenantId);

  res.json({
    success: true,
    token,
    expiresAt,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roleCode: user.roleCode,
      roleName: user.roleName,
      tenantId: user.tenantId,
      tenantName: user.tenantName,
      avatarInitials: user.avatarInitials,
      mfaEnabled: user.mfaEnabled,
      requiresMfa: !!role?.requiresMfa,
      // Capacidades operacionais finas do tenant (construtor flexível).
      // Lidas sempre vivas do RBAC_USERS_DATA em cada requisição, então uma
      // concessão nova vale sem exigir novo login.
      tenantPermissions: user.tenantPermissions,
    },
    role: {
      code: role?.code,
      name: role?.name,
      scope: role?.scope,
      permissions: role?.permissions,
    },
    tenant: user.tenantId,
    serverTime: new Date().toISOString(),
  });
});

// =========================================================================
// 2. CADASTRO DE EMPRESA (self-service) — cria tenant + admin no servidor
// =========================================================================
authRouter.post("/register-company", (req: Request, res: Response) => {
  const tradeName = String(req.body?.tradeName || "").trim().slice(0, 120);
  const corporateName = String(req.body?.corporateName || "").trim().slice(0, 160);
  const cnpjRaw = onlyDigits(String(req.body?.cnpj || "")).slice(0, 14);
  const stateRegistration = String(req.body?.stateRegistration || "").trim().slice(0, 30);
  const segment = String(req.body?.segment || "Autopeças Leves & Acessórios").trim().slice(0, 120);
  const adminName = String(req.body?.adminName || "").trim().slice(0, 120);
  const email = String(req.body?.email || "").trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH);
  const password = String(req.body?.password || "").slice(0, MAX_PASSWORD_LENGTH);
  const phone = String(req.body?.phone || "").trim().slice(0, 30);
  const city = String(req.body?.city || "Campo Grande").trim().slice(0, 80);
  const uf = String(req.body?.uf || "MS").trim().toUpperCase().slice(0, 2);

  if (!tradeName || !adminName || !email || !password) {
    return res.status(400).json({ success: false, error: "Nome fantasia, responsável, e-mail e senha são obrigatórios." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, error: "Informe um e-mail corporativo válido." });
  }
  const strength = isStrongPassword(password);
  if (!strength.ok) {
    return res.status(400).json({ success: false, error: strength.error });
  }
  if (cnpjRaw && cnpjRaw.length !== 14) {
    return res.status(400).json({ success: false, error: "CNPJ inválido: informe os 14 dígitos." });
  }
  if (isEmailRegistered(email)) {
    logAuthEvent(req, "SIGNUP_DUPLICATE_EMAIL", email, "warning", "Tentativa de cadastro com e-mail já existente.");
    return res.status(409).json({ success: false, error: "Este e-mail já possui cadastro. Faça login ou recupere a senha." });
  }

  const signupKey = `signup|${getClientIp(req)}`;
  if (isAttemptBlocked(signupKey)) {
    return res.status(429).json({ success: false, error: "Muitos cadastros a partir desta origem. Tente novamente mais tarde." });
  }
  registerFailedAttempt(signupKey, 5, 60 * 60 * 1000, 60 * 60 * 1000);

  const tenantId = `tnt_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const trialPlan = SAAS_PLANS.find((p) => p.code === "starter") || SAAS_PLANS[0];

  const tenant: TenantAccount = {
    id: tenantId,
    name: (corporateName || tradeName).slice(0, 160),
    tradeName,
    cnpj: cnpjRaw ? maskCnpj(cnpjRaw) : "não informado",
    planId: trialPlan.id,
    planName: `${trialPlan.name} — Teste Grátis 14 dias`,
    status: "trial",
    contactEmail: email,
    contactPhone: phone || "não informado",
    city,
    uf: uf || "MS",
    createdAt: new Date().toISOString(),
    mfaRequired: false,
    sessionTimeoutMinutes: 480,
    ipAllowlist: [],
    softBlockEnabled: true,
  };
  TENANTS_DATA.push(tenant);

  const userId = `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const roleCode: RbacRoleCode = "tenant_admin";
  const newUser: RbacUser = {
    id: userId,
    tenantId,
    tenantName: tradeName,
    name: adminName,
    email,
    roleCode,
    roleName: ROLE_DEFINITIONS[roleCode].name,
    department: "Diretoria / Proprietário",
    active: true,
    avatarInitials: adminName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase(),
    mfaEnabled: ROLE_DEFINITIONS[roleCode].requiresMfa,
    mfaEnforced: ROLE_DEFINITIONS[roleCode].requiresMfa,
    lastLoginAt: new Date().toISOString(),
    lastLoginIp: getClientIp(req),
    createdAt: new Date().toISOString(),
    sessionTimeoutMinutes: tenant.sessionTimeoutMinutes,
  };
  RBAC_USERS_DATA.push(newUser);

  // A senha nunca é gravada em texto plano: apenas salt + hash SCrypt.
  registerCredential(userId, email, password);

  const company = {
    id: tenantId,
    tenantId,
    tradeName,
    corporateName: corporateName || tradeName,
    cnpj: cnpjRaw ? maskCnpj(cnpjRaw) : "",
    stateRegistration: stateRegistration || "ISENTO",
    segment,
    phone: phone || "",
    email,
    city,
    uf: uf || "MS",
    isTrial: true,
    trialDaysRemaining: 14,
    planName: tenant.planName,
    createdAt: tenant.createdAt,
  };

  const { token, expiresAt } = issueSessionToken(newUser);
  appendAuthAudit(req, newUser, "CREATE_TENANT_ACCOUNT", tenant.id, "success", `Nova empresa cadastrada (${maskCnpj(cnpjRaw || "")}).`);

  res.status(201).json({
    success: true,
    token,
    expiresAt,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      roleCode: newUser.roleCode,
      roleName: newUser.roleName,
      tenantId: newUser.tenantId,
      tenantName: newUser.tenantName,
      avatarInitials: newUser.avatarInitials,
      mfaEnabled: newUser.mfaEnabled,
      requiresMfa: ROLE_DEFINITIONS[roleCode].requiresMfa,
    },
    role: {
      code: roleCode,
      name: ROLE_DEFINITIONS[roleCode].name,
      scope: ROLE_DEFINITIONS[roleCode].scope,
      permissions: ROLE_DEFINITIONS[roleCode].permissions,
    },
    tenant: tenantId,
    company,
    message: `Empresa "${tradeName}" cadastrada com sucesso. Teste grátis de 14 dias ativo.`,
  });
});

// =========================================================================
// 3. LOGOUT — revoga o token no servidor (não basta limpar o navegador)
// =========================================================================
authRouter.post("/logout", requireAuth, (req: Request, res: Response) => {
  const auth = req.auth!;
  revokeToken(auth.tokenId);
  recordAudit(req, auth.user, "LOGOUT", "security_compliance", auth.user.id, "success");
  res.json({ success: true, message: "Sessão encerrada com segurança." });
});

// =========================================================================
// 4. CONTEXTO DA SESSÃO (fonte da verdade: servidor)
// =========================================================================
authRouter.get("/me", requireAuth, (req: Request, res: Response) => {
  const auth = req.auth!;

  // Só o escopo SaaS enxerga o portfólio inteiro de personas; tenant vê apenas colegas.
  const source = auth.isSaasScope ? RBAC_USERS_DATA : RBAC_USERS_DATA.filter((u) => u.tenantId === auth.realUser.tenantId);
  const availablePersonas = source.map((u) => ({
    id: u.id,
    name: u.name,
    roleCode: u.roleCode,
    roleName: u.roleName,
    tenantId: u.tenantId,
    tenantName: u.tenantName,
    department: u.department,
    mfaEnabled: u.mfaEnabled,
  }));

  res.json({
    success: true,
    user: auth.user,
    realUser: auth.realUser,
    role: auth.role,
    tenantId: auth.tenantId,
    isSaasScope: auth.isSaasScope,
    impersonating: auth.impersonating,
    availablePersonas,
    allRoles: Object.values(ROLE_DEFINITIONS),
    serverTime: new Date().toISOString(),
  });
});

// =========================================================================
// 5. SENHA MASTER — status (nunca revela o segredo)
// =========================================================================
authRouter.get("/master-password/status", requireAuth, (req: Request, res: Response) => {
  const auth = req.auth!;
  res.json({
    success: true,
    configured: isMasterPasswordConfigured(),
    canElevate: canElevateWithMasterPassword(auth.user),
  });
});

// =========================================================================
// 6. ELEVAÇÃO DE PRIVILÉGIO — verificação server-side da senha master
// =========================================================================
authRouter.post("/master-password/verify", requireAuth, (req: Request, res: Response) => {
  const auth = req.auth!;
  const password = String(req.body?.password || "").slice(0, MAX_PASSWORD_LENGTH);
  const view = String(req.body?.view || "área restrita").slice(0, 80);

  if (!canElevateWithMasterPassword(auth.user)) {
    recordAudit(req, auth.user, "BLOCKED_MASTER_PASSWORD_ELEVATION", "security_compliance", auth.user.id, "blocked", {
      anomalous: true,
      details: `Papel '${auth.user.roleCode}' tentou elevar privilégio para '${view}'.`,
    });
    return res.status(403).json({
      success: false,
      error: "Seu perfil não possui autorização para elevação de privilégio nesta área.",
      code: "RBAC_ELEVATION_DENIED",
    });
  }

  if (!isMasterPasswordConfigured()) {
    return res.status(503).json({
      success: false,
      error:
        "Senha master não configurada no servidor. Defina a variável de ambiente GATO_MASTER_PASSWORD para habilitar áreas restritas.",
      code: "GATO_MASTER_PASSWORD_NOT_CONFIGURED",
    });
  }

  const attemptKey = `master|${auth.user.id}|${getClientIp(req)}`;
  const blockedFor = isAttemptBlocked(attemptKey);
  if (blockedFor > 0) {
    res.setHeader("Retry-After", String(blockedFor));
    return res.status(429).json({
      success: false,
      error: "Muitas tentativas incorretas de senha master. Aguarde alguns minutos.",
      retryAfter: blockedFor,
    });
  }

  if (!verifyMasterPassword(password)) {
    registerFailedAttempt(attemptKey, 5, 10 * 60 * 1000, 15 * 60 * 1000);
    recordAudit(req, auth.user, "MASTER_PASSWORD_FAILED", "security_compliance", auth.user.id, "blocked", {
      anomalous: true,
      details: `Tentativa de elevação negada para '${view}'.`,
    });
    return res.status(401).json({
      success: false,
      error: "Senha master incorreta. Acesso negado e registrado na auditoria.",
      code: "GATO_INVALID_MASTER_PASSWORD",
    });
  }

  clearAttempts(attemptKey);
  recordAudit(req, auth.user, "MASTER_PASSWORD_ELEVATION", "security_compliance", auth.user.id, "success", {
    justification: `Elevação autorizada para '${view}' com expiração de 30 minutos.`,
  });

  res.json({
    success: true,
    message: "Elevação de privilégio autorizada e registrada na trilha de auditoria.",
    expiresInMinutes: 30,
    elevatedAt: new Date().toISOString(),
  });
});

// =========================================================================
// 7. SIMULAÇÃO DE PERSONA (somente Super Admin, somente leitura, auditada)
// =========================================================================
authRouter.post("/switch-persona", requireAuth, (req: Request, res: Response) => {
  const auth = req.auth!;

  if (!auth.isSaasScope) {
    recordAudit(req, auth.user, "BLOCKED_SWITCH_PERSONA", "security_compliance", auth.user.id, "blocked", { anomalous: true });
    return res.status(403).json({ success: false, error: "Simulação de persona restrita à equipe da plataforma.", code: "RBAC_SAAS_SCOPE_REQUIRED" });
  }

  const targetUserId = String(req.body?.userId || "").trim().slice(0, 64);
  const target = RBAC_USERS_DATA.find((u) => u.id === targetUserId && u.active);
  if (!target) {
    return res.status(404).json({ success: false, error: "Persona não encontrada ou inativa." });
  }
  if (target.tenantId !== "system" && auth.user.roleCode !== "super_admin") {
    return res.status(403).json({
      success: false,
      error: "Apenas o Super Admin pode simular personas de empresas contratantes.",
      code: "RBAC_TENANT_ISOLATION",
    });
  }

  // Token curto e marcado como impersonação: bloqueia escrita nas rotas de dados.
  const { token, expiresAt } = issueSessionToken(auth.realUser, target.id);
  recordAudit(req, auth.realUser, "START_IMPERSONATION", "security_compliance", target.id, "warning", {
    details: `Simulação de persona iniciada: ${target.name} (${target.roleCode}) em ${target.tenantName}.`,
    targetTenantId: target.tenantId,
  });

  res.json({
    success: true,
    token,
    expiresAt,
    user: target,
    role: ROLE_DEFINITIONS[target.roleCode],
    impersonating: true,
    message: `Simulação iniciada como ${target.name}. Modo somente leitura.`,
  });
});

// =========================================================================
// 8. ENCERRAR SIMULAÇÃO — volta ao perfil real com novo token
// =========================================================================
authRouter.post("/end-impersonation", requireAuth, (req: Request, res: Response) => {
  const auth = req.auth!;

  if (!auth.impersonating) {
    const { token, expiresAt } = issueSessionToken(auth.realUser);
    return res.json({ success: true, token, expiresAt, message: "Sessão já está no perfil original." });
  }

  revokeToken(auth.tokenId);
  const { token, expiresAt } = issueSessionToken(auth.realUser);
  recordAudit(req, auth.realUser, "END_IMPERSONATION", "security_compliance", auth.user.id, "success");

  res.json({
    success: true,
    token,
    expiresAt,
    message: `Simulação encerrada. Você voltou para ${auth.realUser.name}.`,
  });
});

// =========================================================================
// 9. DIAGNÓSTICO DE SEGURANÇA — exige sessão; não revela segredos
// =========================================================================
authRouter.get("/config-status", requireAuth, (req: Request, res: Response) => {
  res.json({
    success: true,
    masterPasswordConfigured: isMasterPasswordConfigured(),
    sessionStoreMode: "signed-hmac-sha256",
    requesterScope: req.auth!.isSaasScope ? "saas" : "tenant",
  });
});