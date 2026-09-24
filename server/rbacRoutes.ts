import { Router, Request, Response, NextFunction } from "express";
import {
  ROLE_DEFINITIONS,
  TENANTS_DATA,
  RBAC_USERS_DATA,
  AUDIT_LOGS_DATA,
  SAAS_PLANS,
  MESSAGE_TEMPLATES,
  INTERNAL_MESSAGES_DATA,
  LGPD_REQUESTS_DATA,
  ROLE_OVERRIDES,
  PERMISSION_RESOURCES,
  PERMISSION_RESOURCE_LABELS,
  ACCESS_LEVELS,
  ACCESS_LEVEL_LABELS,
  TENANT_PERMISSION_CATALOG,
  TENANT_PERMISSION_GROUPS,
  evaluatePermission,
  evaluateTenantQuota,
  runSecurityIsolationTests,
  sanitizePayloadForAudit,
  maskCpf,
  maskCnpj,
  maskEmail,
  maskPhone
} from "./rbacEngine";
import {
  RbacRoleCode,
  PermissionResource,
  PermissionAccessLevel,
  RbacUser,
  TenantAccount,
  AuditLogRecord,
  InternalMessageItem,
  TenantPermissionKey
} from "../src/types/rbac";
import {
  requireAuth,
  requirePermission,
  requireSaasScope,
  issueSessionToken,
  getClientIp,
  recordAudit,
  TENANT_OPERATIONAL_RESOURCES,
} from "./auth";

export const rbacRouter = Router();

const VALID_TENANT_PERMISSIONS = new Set<string>(TENANT_PERMISSION_CATALOG.map((p) => p.key));

/**
 * Filtra e devolve apenas capacidades válidas do catálogo (ignora desconhecidas).
 *
 * Um array vazio é preservado como `[]`: significa "configurado sem nenhuma
 * capacidade", que o menu do usuário precisa distinguir de "nunca configurado".
 * Antes o vazio virava `undefined`, e como `undefined` mantém o acesso padrão do
 * papel, criar um usuário sem capacidade alguma o deixava com o menu inteiro.
 */
export function sanitizeTenantPermissions(input: unknown): TenantPermissionKey[] | undefined {
  if (!Array.isArray(input)) return undefined;
  return input.filter((k): k is TenantPermissionKey => typeof k === "string" && VALID_TENANT_PERMISSIONS.has(k));
}

const VALID_PERMISSION_RESOURCES = new Set<string>(PERMISSION_RESOURCES);
const VALID_ACCESS_LEVELS = new Set<string>(ACCESS_LEVELS);

/**
 * Mantém apenas overrides de recursos e níveis conhecidos.
 *
 * `customOverrides` tem precedência sobre a matriz do papel em
 * `effectiveAccessLevel`, então um valor arbitrário aqui vira privilégio —
 * daí a filtragem na entrada, e não só na leitura.
 */
export function sanitizeCustomOverrides(
  input: unknown,
): Partial<Record<PermissionResource, PermissionAccessLevel>> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const sanitized: Partial<Record<PermissionResource, PermissionAccessLevel>> = {};
  for (const [resource, level] of Object.entries(input as Record<string, unknown>)) {
    if (!VALID_PERMISSION_RESOURCES.has(resource)) continue;
    if (typeof level !== "string" || !VALID_ACCESS_LEVELS.has(level)) continue;
    sanitized[resource as PermissionResource] = level as PermissionAccessLevel;
  }
  return sanitized;
}

// Todas as rotas do motor RBAC exigem sessão autenticada válida.
// Sem isso, qualquer requisição anônima recebia identidade de Super Admin.
rbacRouter.use(requireAuth);

// =========================================================================
// MIDDLEWARE: CONTEXTO DE AUTENTICAÇÃO E TENANT
// =========================================================================

/**
 * Identidade SEMPRE derivada da sessão autenticada (token assinado verificado
 * no servidor pelo middleware requireAuth). Cabeçalhos enviados pelo navegador
 * (x-user-id / x-user-role) não são mais considerados — antes permitiam que
 * qualquer visitante se declarasse Super Admin.
 */
export function resolveAuthUser(req: Request): RbacUser {
  if (req.auth?.user) return req.auth.user;
  // Fail-closed: sem sessão válida não existe identidade. O middleware
  // requireAuth (montado no router) responde 401 antes de chegar aqui.
  const err = new Error("Sessão ausente ou inválida para operações RBAC.") as Error & { statusCode?: number };
  err.statusCode = 401;
  throw err;
}

// Middleware de autorização por recurso
export function requireRbacPermission(resource: PermissionResource) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = resolveAuthUser(req);
    const targetTenantId = (req.params.tenantId || req.body?.tenantId || req.query.tenantId || req.headers["x-target-tenant-id"]) as string;
    const justification = (req.headers["x-justification"] || req.body?.justification) as string;

    const evaluation = evaluatePermission(user, resource, targetTenantId, justification);

    if (!evaluation.allowed) {
      // Registrar tentativa de acesso negado na trilha de auditoria
      const blockedLog: AuditLogRecord = {
        id: `aud_block_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenantId: user.tenantId,
        userId: user.id,
        userName: user.name,
        userRole: user.roleCode,
        ipAddress: getClientIp(req),
        action: `BLOCKED_ACCESS_${resource.toUpperCase()}`,
        resource,
        entityId: targetTenantId || "unknown",
        timestamp: new Date().toISOString(),
        justification: justification || "Sem justificativa fornecida",
        status: "blocked",
        anomalous: true
      };
      AUDIT_LOGS_DATA.unshift(blockedLog);

      return res.status(403).json({
        success: false,
        error: evaluation.reason || "Acesso negado pela política de segurança RBAC.",
        code: "RBAC_PERMISSION_DENIED",
        resource,
        userRole: user.roleCode,
        requiresJustification: evaluation.requiresAudit
      });
    }

    // Se for acesso com auditoria obrigatória, registrar log com sucesso
    if (evaluation.requiresAudit) {
      const auditLog: AuditLogRecord = {
        id: `aud_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        tenantId: targetTenantId || user.tenantId,
        userId: user.id,
        userName: user.name,
        userRole: user.roleCode,
        ipAddress: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1") as string,
        action: `CONFIDENTIAL_ACCESS_${resource.toUpperCase()}`,
        resource,
        entityId: targetTenantId || user.tenantId,
        timestamp: new Date().toISOString(),
        justification,
        status: "success"
      };
      AUDIT_LOGS_DATA.unshift(auditLog);
    }

    next();
  };
}

// =========================================================================
// ROTAS RBAC
// =========================================================================

// 1. Obter usuário e contexto ativo
rbacRouter.get("/me", (req, res) => {
  const user = resolveAuthUser(req);
  const roleDef = ROLE_DEFINITIONS[user.roleCode];
  const tenant = user.tenantId === "system" ? null : TENANTS_DATA.find((t) => t.id === user.tenantId);

  const impersonating = !!req.auth?.impersonating;
  res.json({
    success: true,
    user,
    role: roleDef,
    tenant,
    impersonating,
    realUser: req.auth?.realUser,
    isSaasScope: !!req.auth?.isSaasScope,
    allRoles: Object.values(ROLE_DEFINITIONS),
    // A lista de personas (simulador) é recurso de plataforma: usuários de
    // tenant nunca recebem o diretório completo de contas da base.
    availablePersonas: req.auth?.isSaasScope
      ? RBAC_USERS_DATA.map((u) => ({
          id: u.id,
          name: u.name,
          roleCode: u.roleCode,
          roleName: u.roleName,
          tenantId: u.tenantId,
          tenantName: u.tenantName,
          department: u.department,
          mfaEnabled: u.mfaEnabled
        }))
      : RBAC_USERS_DATA.filter((u) => u.tenantId === user.tenantId).map((u) => ({
          id: u.id,
          name: u.name,
          roleCode: u.roleCode,
          roleName: u.roleName,
          tenantId: u.tenantId,
          tenantName: u.tenantName,
          department: u.department,
          mfaEnabled: u.mfaEnabled
        }))
  });
});

// 1.1 Catálogo de permissões operacionais do tenant (para o construtor flexível)
rbacRouter.get("/tenant-permissions", (req, res) => {
  res.json({
    success: true,
    groups: TENANT_PERMISSION_GROUPS,
    permissions: TENANT_PERMISSION_CATALOG,
  });
});

// 2. Alternar persona / simulador de papéis
// Restrito ao Super Admin. A troca emite um NOVO token assinado com a persona
// simulada ("act"), com validade curta, e fica registrada na auditoria.
// Anteriormente qualquer usuário podia assumir o papel de Super Admin apenas
// enviando outro x-user-role.
rbacRouter.post("/switch-persona", (req, res) => {
  const caller = resolveAuthUser(req);
  if (caller.roleCode !== "super_admin" || !req.auth?.isSaasScope) {
    recordAudit(req, caller, "BLOCKED_SWITCH_PERSONA", "security_compliance", caller.id, "blocked", {
      anomalous: true,
      details: "Somente o Super Admin pode iniciar simulação de persona.",
    });
    return res.status(403).json({
      success: false,
      error: "Somente o Super Admin pode utilizar o simulador de personas.",
      code: "RBAC_IMPERSONATION_DENIED",
    });
  }

  const { userId, roleCode, tenantId } = req.body;
  let targetUser: RbacUser | undefined;

  if (userId) {
    targetUser = RBAC_USERS_DATA.find((u) => u.id === userId);
  } else if (roleCode) {
    targetUser = RBAC_USERS_DATA.find((u) => u.roleCode === roleCode);
  }

  if (!targetUser) {
    return res.status(404).json({ success: false, error: "Persona não encontrada para simulação." });
  }

  // Se solicitou mudar o tenant do usuário
  if (tenantId && targetUser.roleCode.startsWith("tenant_")) {
    const targetTenant = TENANTS_DATA.find((t) => t.id === tenantId);
    if (targetTenant) {
      targetUser = {
        ...targetUser,
        tenantId: targetTenant.id,
        tenantName: targetTenant.name
      };
    }
  }

  const roleDef = ROLE_DEFINITIONS[targetUser.roleCode];

  // Token temporário: a identidade REAL continua sendo o Super Admin autenticado.
  const { token, expiresAt } = issueSessionToken(caller, targetUser.id);

  // Registrar auditoria da alternância de contexto
  recordAudit(req, caller, "SIMULATOR_SWITCH_PERSONA", "security_compliance", targetUser.id, "success", {
    targetTenantId: targetUser.tenantId,
    justification: `Simulação de persona iniciada (${targetUser.roleName}) por ${caller.name}. Expira em ${expiresAt}.`,
  });

  res.json({
    success: true,
    message: `Persona alternada para: ${targetUser.name} (${targetUser.roleName})`,
    user: targetUser,
    role: roleDef,
    token,
    expiresAt,
    impersonating: true,
  });
});

// 3. Matriz de permissões resumida
// Matriz completa de papéis e permissões: informação de arquitetura de segurança, restrita à plataforma.
rbacRouter.get("/matrix", requireSaasScope, (req, res) => {
  res.json({
    success: true,
    roles: ROLE_DEFINITIONS,
    summaryTable: Object.values(ROLE_DEFINITIONS).map((r) => ({
      code: r.code,
      name: r.name,
      scope: r.scope,
      requiresMfa: r.requiresMfa,
      permissions: r.permissions
    }))
  });
});

// 4. Listar Tenants (com isolamento estrito)
rbacRouter.get("/tenants", requireSaasScope, requirePermission("manage_accounts"), (req, res) => {
  const user = resolveAuthUser(req);
  const roleDef = ROLE_DEFINITIONS[user.roleCode];

  let tenantsList: TenantAccount[] = [];

  if (roleDef.scope === "saas") {
    // Equipe SaaS visualiza a carteira conforme permissão
    tenantsList = TENANTS_DATA;
  } else {
    // Tenant Contratante SÓ vê a própria empresa
    tenantsList = TENANTS_DATA.filter((t) => t.id === user.tenantId);
  }

  res.json({
    success: true,
    count: tenantsList.length,
    tenants: tenantsList
  });
});

// 5. Listar Usuários (com isolamento estrito)
rbacRouter.get("/users", requirePermission("contractor_users"), (req, res) => {
  const user = resolveAuthUser(req);
  const roleDef = ROLE_DEFINITIONS[user.roleCode];

  let usersList: RbacUser[] = [];

  if (roleDef.scope === "saas") {
    // Super Admin e CS podem ver todos; Suporte vê contratantes
    usersList = RBAC_USERS_DATA;
  } else {
    // Admin do Tenant ou Usuário só vê colegas da PRÓPRIA empresa
    usersList = RBAC_USERS_DATA.filter((u) => u.tenantId === user.tenantId);
  }

  res.json({
    success: true,
    count: usersList.length,
    users: usersList
  });
});

// 6. Criar / Convidar Usuário com papéis granulares
rbacRouter.post("/users", requirePermission("contractor_users", { write: true }), (req, res) => {
  const caller = resolveAuthUser(req);
  const callerRole = ROLE_DEFINITIONS[caller.roleCode];

  const { name, email, roleCode, tenantId, department, tenantPermissions } = req.body;

  if (!name || !email || !roleCode) {
    return res.status(400).json({ success: false, error: "Nome, e-mail e papel são obrigatórios." });
  }

  // Validação de fronteira de criação
  const targetTenantId = callerRole.scope === "saas" ? (tenantId || "system") : caller.tenantId;

  // Tenant Admin só pode criar usuários para seu PRÓPRIO tenant e com papel tenant_*
  if (callerRole.scope === "tenant") {
    if (roleCode.startsWith("saas_") || roleCode === "super_admin") {
      return res.status(403).json({ success: false, error: "Administradores de tenant não podem criar usuários administrativos da equipe SaaS." });
    }
  }

  const roleDef = ROLE_DEFINITIONS[roleCode as RbacRoleCode];
  const tenantObj = TENANTS_DATA.find((t) => t.id === targetTenantId) || TENANTS_DATA[0];

  const newUser: RbacUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    tenantId: targetTenantId,
    tenantName: targetTenantId === "system" ? "SaaS Plataforma Central" : tenantObj.name,
    name,
    email,
    roleCode: roleCode as RbacRoleCode,
    roleName: roleDef?.name || roleCode,
    department: department || "Operacional",
    active: true,
    avatarInitials: name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase(),
    mfaEnabled: roleDef?.requiresMfa || false,
    mfaEnforced: roleDef?.requiresMfa || false,
    lastLoginAt: "Nunca",
    lastLoginIp: "N/A",
    createdAt: new Date().toISOString(),
    tenantPermissions: sanitizeTenantPermissions(tenantPermissions),
  };

  RBAC_USERS_DATA.push(newUser);

  // Trilha de auditoria
  AUDIT_LOGS_DATA.unshift({
    id: `aud_usr_${Date.now()}`,
    tenantId: targetTenantId,
    userId: caller.id,
    userName: caller.name,
    userRole: caller.roleCode,
    ipAddress: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1") as string,
    action: "CREATE_USER_ACCOUNT",
    resource: "contractor_users",
    entityId: newUser.id,
    timestamp: new Date().toISOString(),
    afterState: sanitizePayloadForAudit(newUser),
    status: "success"
  });

  res.json({
    success: true,
    message: `Usuário '${newUser.name}' cadastrado com sucesso com perfil '${newUser.roleName}'.`,
    user: newUser
  });
});

// 7. Atualizar papel / permissões de um usuário
rbacRouter.put("/users/:id/role", requirePermission("contractor_users", { write: true }), (req, res) => {
  const caller = resolveAuthUser(req);
  const { id } = req.params;
  const { roleCode, customOverrides, tenantPermissions } = req.body;

  const targetUserIndex = RBAC_USERS_DATA.findIndex((u) => u.id === id);
  if (targetUserIndex === -1) {
    return res.status(404).json({ success: false, error: "Usuário não encontrado." });
  }

  const targetUser = RBAC_USERS_DATA[targetUserIndex];

  // Validação: Tenant Admin só altera usuários da sua própria empresa
  if (caller.roleCode === "tenant_admin" && targetUser.tenantId !== caller.tenantId) {
    return res.status(403).json({ success: false, error: "Você só pode alterar usuários do seu próprio tenant." });
  }

  // Fronteira de escopo do tenant. O escopo de tenant administra apenas as
  // contas operacionais da própria empresa — nada de camada de plataforma.
  if (ROLE_DEFINITIONS[caller.roleCode].scope === "tenant") {
    // a) Não concede papéis da equipe SaaS. Sem isto um admin do tenant se
    //    promovia a super_admin pelo corpo e, como o requireAuth relê o usuário
    //    vivo, ganhava escopo SaaS (todos os tenants) na requisição seguinte.
    if (typeof roleCode === "string" && (roleCode.startsWith("saas_") || roleCode === "super_admin")) {
      recordAudit(req, caller, "BLOCKED_ROLE_ESCALATION", "contractor_users", targetUser.id, "blocked", {
        anomalous: true,
        justification: `Tentativa de conceder o papel '${roleCode}' a partir do escopo de tenant.`,
      });
      return res.status(403).json({
        success: false,
        error: "Administradores de tenant não podem conceder papéis da equipe SaaS.",
        code: "RBAC_ROLE_ESCALATION_DENIED",
      });
    }

    // b) Não altera conta de escopo SaaS, mesmo que ela viva no mesmo tenant
    //    (as personas de demonstração criam exatamente esse caso).
    if (ROLE_DEFINITIONS[targetUser.roleCode]?.scope === "saas") {
      recordAudit(req, caller, "BLOCKED_PLATFORM_ACCOUNT_UPDATE", "contractor_users", targetUser.id, "blocked", {
        anomalous: true,
        justification: "Tentativa de alterar conta da equipe SaaS a partir do escopo de tenant.",
      });
      return res.status(403).json({
        success: false,
        error: "Contas da equipe SaaS só podem ser administradas pela própria plataforma.",
        code: "RBAC_PLATFORM_ACCOUNT_DENIED",
      });
    }

    // c) Não define `customOverrides`. Eles sobrepõem a matriz do papel em
    //    `effectiveAccessLevel`, e era por aí que um admin do tenant concedia a
    //    si mesmo recursos negados (security_compliance, manage_accounts...).
    if (customOverrides) {
      recordAudit(req, caller, "BLOCKED_CUSTOM_OVERRIDES", "contractor_users", targetUser.id, "blocked", {
        anomalous: true,
        justification: "Tentativa de definir overrides por usuário a partir do escopo de tenant.",
      });
      return res.status(403).json({
        success: false,
        error: "Ajustes finos de permissão por usuário são exclusivos da plataforma.",
        code: "RBAC_CUSTOM_OVERRIDES_DENIED",
      });
    }
  }

  const oldState = { ...targetUser };
  const roleDef = ROLE_DEFINITIONS[roleCode as RbacRoleCode] || ROLE_DEFINITIONS[targetUser.roleCode];

  // Usa o papel efetivamente resolvido, não o valor cru do body: sem `roleCode`
  // o corpo antigo gravava `undefined` no usuário e apagava o papel dele.
  targetUser.roleCode = roleDef.code;
  targetUser.roleName = roleDef.name;
  const cleanOverrides = sanitizeCustomOverrides(customOverrides);
  if (cleanOverrides) {
    targetUser.customOverrides = cleanOverrides;
  }
  if (Array.isArray(tenantPermissions)) {
    targetUser.tenantPermissions = sanitizeTenantPermissions(tenantPermissions);
  }

  AUDIT_LOGS_DATA.unshift({
    id: `aud_role_${Date.now()}`,
    tenantId: targetUser.tenantId,
    userId: caller.id,
    userName: caller.name,
    userRole: caller.roleCode,
    ipAddress: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1") as string,
    action: "UPDATE_USER_PERMISSIONS",
    resource: "contractor_users",
    entityId: targetUser.id,
    timestamp: new Date().toISOString(),
    beforeState: { roleCode: oldState.roleCode, roleName: oldState.roleName },
    afterState: { roleCode: targetUser.roleCode, roleName: targetUser.roleName, customOverrides: targetUser.customOverrides, tenantPermissions: targetUser.tenantPermissions },
    status: "success"
  });

  res.json({
    success: true,
    message: `Papel do usuário atualizado para '${roleDef.name}'.`,
    user: targetUser
  });
});

// 8. Reset de Senha Seguro (Suporte / Admin)
rbacRouter.post("/users/:id/reset-password", requirePermission("contractor_users", { write: true }), (req, res) => {
  const caller = resolveAuthUser(req);
  const { id } = req.params;

  const targetUser = RBAC_USERS_DATA.find((u) => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: "Usuário não encontrado." });
  }

  // Fronteira de escopo: o escopo de tenant só reseta quem é da própria empresa
  // e do próprio escopo. Sem isto, um admin do tenant disparava reset para
  // usuário de outro tenant — e via o e-mail mascarado dele na resposta.
  if (ROLE_DEFINITIONS[caller.roleCode].scope === "tenant") {
    const sameTenant = targetUser.tenantId === caller.tenantId;
    const targetIsPlatform = ROLE_DEFINITIONS[targetUser.roleCode]?.scope === "saas";
    if (!sameTenant || targetIsPlatform) {
      recordAudit(req, caller, "BLOCKED_CROSS_TENANT_PASSWORD_RESET", "contractor_users", targetUser.id, "blocked", {
        anomalous: true,
        justification: "Tentativa de redefinir senha de usuário fora do escopo do próprio tenant.",
      });
      return res.status(403).json({
        success: false,
        error: "Você só pode redefinir senhas de usuários da sua própria empresa.",
        code: "RBAC_TENANT_ISOLATION",
      });
    }
  }

  // Regra: Suporte pode resetar, mas sem ver a senha em texto plano (envio de link seguro)
  const token = Math.random().toString(36).substring(2, 15);

  AUDIT_LOGS_DATA.unshift({
    id: `aud_rst_${Date.now()}`,
    tenantId: targetUser.tenantId,
    userId: caller.id,
    userName: caller.name,
    userRole: caller.roleCode,
    ipAddress: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1") as string,
    action: "TRIGGER_PASSWORD_RESET",
    resource: "contractor_users",
    entityId: targetUser.id,
    timestamp: new Date().toISOString(),
    justification: "Reset de senha solicitado por chamado de suporte ou administrador.",
    beforeState: { email: maskEmail(targetUser.email) },
    afterState: { tokenIssued: true, tokenExpiryMinutes: 60 },
    status: "success"
  });

  res.json({
    success: true,
    message: `Link de redefinição de senha gerado e enviado com segurança para ${maskEmail(targetUser.email)}.`,
    maskedEmail: maskEmail(targetUser.email),
    expiresIn: "60 minutos"
  });
});

// 9. Trilha de Auditoria (Logs com sanitização de PII)
rbacRouter.get("/audit-logs", requirePermission("audit_logs"), (req, res) => {
  const user = resolveAuthUser(req);
  const roleDef = ROLE_DEFINITIONS[user.roleCode];

  let logs = AUDIT_LOGS_DATA;

  // Se for usuário de tenant, só vê logs do seu próprio tenant
  if (roleDef.scope === "tenant") {
    logs = logs.filter((l) => l.tenantId === user.tenantId);
  }

  // A trilha preserva CONTEÚDO — é o que a torna uma auditoria de verdade, e é o
  // que o contratante vê dos próprios eventos. Mas conteúdo de NEGÓCIO do
  // contratante não é exibido ao escopo da plataforma: o isolamento entre
  // contratantes vale inclusive para o dono do SaaS.
  //
  // O evento continua visível (quem, quando, qual empresa, qual ação, qual
  // resultado) — o que se omite é o payload (nome de cliente, valores, PII). Sem
  // isto a trilha virava a via pela qual a plataforma lia o cadastro do cliente.
  if (roleDef.scope === "saas") {
    logs = logs.map((l) =>
      TENANT_OPERATIONAL_RESOURCES.includes(l.resource as PermissionResource)
        ? {
            ...l,
            beforeState: undefined,
            afterState: undefined,
            justification: undefined,
            payloadWithheld: true,
          }
        : l,
    );
  }

  // Se for Suporte SaaS, logs com PII mascarado estritamente
  if (user.roleCode === "saas_suporte") {
    logs = logs.map((l) => ({
      ...l,
      beforeState: sanitizePayloadForAudit(l.beforeState),
      afterState: sanitizePayloadForAudit(l.afterState)
    }));
  }

  res.json({
    success: true,
    count: logs.length,
    logs
  });
});

// 10. Listar Planos SaaS e Cotas
rbacRouter.get("/plans", requireSaasScope, (req, res) => {
  res.json({
    success: true,
    plans: SAAS_PLANS
  });
});

// 11. Obter Consumo e Cotas de um Tenant
rbacRouter.get("/quotas/:tenantId", requirePermission("limits_quotas"), (req, res) => {
  const caller = resolveAuthUser(req);
  const { tenantId } = req.params;

  // Isolamento: usuário de tenant não pode ver cota de outro tenant
  if (ROLE_DEFINITIONS[caller.roleCode].scope === "tenant" && tenantId !== caller.tenantId) {
    return res.status(403).json({ success: false, error: "Você só tem acesso aos limites de cota do seu próprio tenant." });
  }

  const quota = evaluateTenantQuota(tenantId);
  res.json({
    success: true,
    quota
  });
});

// 12. Troca de Plano com Cálculo Proporcional (Pró-rata) e Auditoria
rbacRouter.post("/plans/change", requireSaasScope, requirePermission("limits_quotas", { write: true }), (req, res) => {
  const caller = resolveAuthUser(req);
  const { tenantId, targetPlanId, billingCycleDay } = req.body;

  const tenant = TENANTS_DATA.find((t) => t.id === tenantId);
  if (!tenant) {
    return res.status(404).json({ success: false, error: "Tenant não encontrado." });
  }

  const oldPlan = SAAS_PLANS.find((p) => p.id === tenant.planId) || SAAS_PLANS[0];
  const newPlan = SAAS_PLANS.find((p) => p.id === targetPlanId);
  if (!newPlan) {
    return res.status(400).json({ success: false, error: "Novo plano inválido." });
  }

  // Cálculo proporcional simples (dias restantes no mês, ex: 15 dias)
  const remainingDays = 15;
  const daysInMonth = 30;
  const priceDifference = newPlan.priceMonthly - oldPlan.priceMonthly;
  const proRataAmount = priceDifference > 0 
    ? Number(((priceDifference / daysInMonth) * remainingDays).toFixed(2))
    : 0;

  // Atualizar plano do tenant
  tenant.planId = newPlan.id;
  tenant.planName = newPlan.name;

  // Registrar auditoria
  AUDIT_LOGS_DATA.unshift({
    id: `aud_plan_${Date.now()}`,
    tenantId: tenant.id,
    userId: caller.id,
    userName: caller.name,
    userRole: caller.roleCode,
    ipAddress: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1") as string,
    action: "CHANGE_SAAS_PLAN",
    resource: "limits_quotas",
    entityId: tenant.id,
    timestamp: new Date().toISOString(),
    beforeState: { planId: oldPlan.id, planName: oldPlan.name, priceMonthly: oldPlan.priceMonthly },
    afterState: { planId: newPlan.id, planName: newPlan.name, priceMonthly: newPlan.priceMonthly, proRataCharged: proRataAmount },
    justification: `Migração solicitada para ${newPlan.name}. Diferença proporcional calculada: R$ ${proRataAmount}.`,
    status: "success"
  });

  // Notificação interna automática
  INTERNAL_MESSAGES_DATA.unshift({
    id: `msg_plan_${Date.now()}`,
    tenantId: tenant.id,
    senderId: caller.id,
    senderName: "Financeiro & Contratos SaaS",
    senderRole: "Admin SaaS",
    title: `Plano atualizado para ${newPlan.name}`,
    content: `A migração do plano ${oldPlan.name} para ${newPlan.name} foi concluída com sucesso. Seus novos limites foram liberados imediatamente. Cobrança proporcional de R$ ${proRataAmount} adicionada ao próximo boleto.`,
    channels: ["in_app", "email"],
    priority: "high",
    templateCode: "upgrade_solicitado",
    createdAt: new Date().toISOString(),
    readBy: [],
    optOutUsers: []
  });

  res.json({
    success: true,
    message: `Plano da empresa '${tenant.name}' atualizado com sucesso para '${newPlan.name}'.`,
    proRataAmount,
    newQuotas: newPlan.quotas
  });
});

// 13. Mensagens Internas & Notificações
rbacRouter.get("/messages", (req, res) => {
  const user = resolveAuthUser(req);
  const roleDef = ROLE_DEFINITIONS[user.roleCode];

  let messages = INTERNAL_MESSAGES_DATA;

  if (roleDef.scope === "tenant") {
    // Só vê mensagens destinadas a 'all' ou ao seu tenant específico
    messages = messages.filter((m) => m.tenantId === "all" || m.tenantId === user.tenantId);
  }

  res.json({
    success: true,
    count: messages.length,
    messages,
    templates: MESSAGE_TEMPLATES
  });
});

// 14. Enviar Mensagem Interna Segmentada
rbacRouter.post("/messages/send", requirePermission("internal_messages", { write: true }), (req, res) => {
  const caller = resolveAuthUser(req);
  const { tenantId, targetPlanId, title, content, templateCode, channels, priority } = req.body;

  if (!title || !content) {
    return res.status(400).json({ success: false, error: "Título e mensagem são obrigatórios." });
  }

  const newMessage: InternalMessageItem = {
    id: `msg_${Date.now()}`,
    tenantId: tenantId || "all",
    targetPlanId: targetPlanId || "all",
    senderId: caller.id,
    senderName: caller.name,
    senderRole: caller.roleName,
    title,
    content,
    channels: channels || ["in_app"],
    priority: priority || "normal",
    templateCode,
    createdAt: new Date().toISOString(),
    readBy: [],
    optOutUsers: []
  };

  INTERNAL_MESSAGES_DATA.unshift(newMessage);

  // Trilha de auditoria
  AUDIT_LOGS_DATA.unshift({
    id: `aud_msg_${Date.now()}`,
    tenantId: tenantId || "all",
    userId: caller.id,
    userName: caller.name,
    userRole: caller.roleCode,
    ipAddress: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1") as string,
    action: "SEND_INTERNAL_MESSAGE",
    resource: "internal_messages",
    entityId: newMessage.id,
    timestamp: new Date().toISOString(),
    afterState: { title, targetTenant: tenantId, channels },
    status: "success"
  });

  res.json({
    success: true,
    message: "Mensagem interna enviada com sucesso aos canais configurados.",
    item: newMessage
  });
});

// 15. Marcar Mensagem como Lida
rbacRouter.post("/messages/:id/read", (req, res) => {
  const user = resolveAuthUser(req);
  const { id } = req.params;

  const msg = INTERNAL_MESSAGES_DATA.find((m) => m.id === id);
  if (msg && !msg.readBy.includes(user.id)) {
    msg.readBy.push(user.id);
  }

  res.json({ success: true, message: "Mensagem marcada como lida." });
});

// 16. Opt-out de Mensagens / Notificações
rbacRouter.post("/messages/:id/opt-out", (req, res) => {
  const user = resolveAuthUser(req);
  const { id } = req.params;

  const msg = INTERNAL_MESSAGES_DATA.find((m) => m.id === id);
  if (msg && !msg.optOutUsers.includes(user.id)) {
    msg.optOutUsers.push(user.id);
  }

  res.json({ success: true, message: "Preferência de opt-out registrada com sucesso." });
});

// 17. Solicitações LGPD
rbacRouter.get("/lgpd/requests", requirePermission("security_compliance"), (req, res) => {
  res.json({
    success: true,
    requests: LGPD_REQUESTS_DATA
  });
});

// 18. Exportar Dados do Titular (LGPD)
rbacRouter.post("/lgpd/export", requirePermission("security_compliance", { write: true }), (req, res) => {
  const caller = resolveAuthUser(req);
  const { document, name, reason } = req.body;

  const reqItem = {
    id: `lgpd_${Date.now()}`,
    tenantId: caller.tenantId,
    subjectDocument: maskCpf(document || "29841283904"),
    subjectName: name || "Titular Solicitante",
    requestType: "export_data" as const,
    requestedBy: caller.name,
    requestedAt: new Date().toISOString(),
    // Honestidade do registro: a solicitação é REGISTRADA e fica pendente de
    // processamento pelo encarregado. Antes o sistema declarava "concluído"
    // sem gerar/depurar dados, o que cria risco de compliance (LGPD art. 19).
    status: "pending" as const,
    details: `Solicitação de portabilidade registrada e encaminhada ao encarregado (DPO) para extração e entrega em até 15 dias (LGPD art. 19). Motivo informado: ${reason || "Solicitação direta do titular"}`
  };

  LGPD_REQUESTS_DATA.unshift(reqItem);

  recordAudit(req, caller, "LGPD_EXPORT_REQUESTED", "security_compliance", reqItem.id, "success", {
    justification: reason || "Solicitação de titular registrada.",
  });

  res.json({
    success: true,
    message:
      "Solicitação de acesso/portabilidade registrada com protocolo. O encarregado (DPO) processará a extração dos dados pessoais em até 15 dias, conforme Art. 19 da LGPD.",
    request: reqItem
  });
});

// 19. Anonimizar Cadastro (LGPD)
rbacRouter.post("/lgpd/anonymize", requirePermission("security_compliance", { write: true }), (req, res) => {
  const caller = resolveAuthUser(req);
  const { document, name, reason } = req.body;

  const reqItem = {
    id: `lgpd_anon_${Date.now()}`,
    tenantId: caller.tenantId,
    subjectDocument: maskCpf(document || "11298044412"),
    subjectName: name || "Titular para Anonimização",
    requestType: "anonymize" as const,
    requestedBy: caller.name,
    requestedAt: new Date().toISOString(),
    // A anonimização exige execução sobre a base real (Supabase) e dupla
    // conferência do encarregado: fica registrada como pendente, sem falso
    // positivo de "dados anonimizados" que não foram de fato tratados.
    status: "pending" as const,
    details: `Solicitação de anonimização registrada e encaminhada ao encarregado (DPO) para execução sobre a base de dados. Registros contábeis/fiscais serão preservados conforme Art. 16, I da LGPD.`
  };

  LGPD_REQUESTS_DATA.unshift(reqItem);

  recordAudit(req, caller, "LGPD_ANONYMIZATION_REQUESTED", "security_compliance", reqItem.id, "warning", {
    justification: reason || "Solicitação de anonimização registrada.",
  });

  res.json({
    success: true,
    message:
      "Solicitação de anonimização registrada. A execução é feita pelo encarregado (DPO) sobre a base de dados, com preservação dos registros fiscais obrigatórios.",
    request: reqItem
  });
});

// 20. Executar Bateria de Testes Automatizados de Isolamento e Permissão
// Bateria de testes internos de segurança: execução restrita à equipe da plataforma.
rbacRouter.get("/test-isolation", requireSaasScope, (req, res) => {
  const results = runSecurityIsolationTests();
  const allPassed = results.every((r) => r.passed);

  res.json({
    success: true,
    summary: {
      totalTests: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
      status: allPassed ? "ALL_SECURITY_TESTS_PASSED" : "SECURITY_ANOMALY_DETECTED",
      executedAt: new Date().toISOString()
    },
    results
  });
});

// =========================================================================
// 21. OVERRIDES POR PAPEL — Super Admin define o que a camada inferior vê
// =========================================================================

// Lista a matriz, os recursos, os níveis e os overrides vigentes por papel.
rbacRouter.get("/role-overrides", requireSaasScope, (req, res) => {
  res.json({
    success: true,
    roles: ROLE_DEFINITIONS,
    resources: PERMISSION_RESOURCES,
    resourceLabels: PERMISSION_RESOURCE_LABELS,
    accessLevels: ACCESS_LEVELS,
    accessLevelLabels: ACCESS_LEVEL_LABELS,
    overrides: ROLE_OVERRIDES,
  });
});

// Define os acessos de um papel (camada). Restrito ao escopo SaaS com manage_accounts.
rbacRouter.put("/role-overrides/:code", requireSaasScope, requirePermission("manage_accounts", { write: true }), (req, res) => {
  const { code } = req.params;
  const { permissions } = req.body || {};

  if (!ROLE_DEFINITIONS[code as RbacRoleCode]) {
    return res.status(404).json({ success: false, error: "Papel não encontrado." });
  }
  if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) {
    return res.status(400).json({ success: false, error: "Informe um objeto de permissões válido." });
  }

  ROLE_OVERRIDES[code as RbacRoleCode] = permissions;
  recordAudit(req, req.auth!.user, "UPDATE_ROLE_OVERRIDES", "security_compliance", code, "success", {
    justification: `Acessos do papel '${code}' redefinidos pelo Super Admin.`,
  });

  res.json({ success: true, overrides: ROLE_OVERRIDES, message: `Acessos do papel '${code}' atualizados.` });
});

// Remove os overrides de um papel (volta à matriz padrão).
rbacRouter.delete("/role-overrides/:code", requireSaasScope, requirePermission("manage_accounts", { write: true }), (req, res) => {
  const { code } = req.params;
  delete ROLE_OVERRIDES[code as RbacRoleCode];
  recordAudit(req, req.auth!.user, "RESET_ROLE_OVERRIDES", "security_compliance", code, "success");
  res.json({ success: true, overrides: ROLE_OVERRIDES, message: `Overrides do papel '${code}' removidos (voltou ao padrão).` });
});
