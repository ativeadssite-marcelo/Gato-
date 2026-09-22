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
  RbacUser,
  TenantAccount,
  AuditLogRecord,
  InternalMessageItem
} from "../src/types/rbac";

export const rbacRouter = Router();

// =========================================================================
// MIDDLEWARE: CONTEXTO DE AUTENTICAÇÃO E TENANT
// =========================================================================

export function resolveAuthUser(req: Request): RbacUser {
  // Ler cabeçalhos de autenticação simulada / sessão
  const headerUserId = req.headers["x-user-id"] as string;
  const headerRole = req.headers["x-user-role"] as RbacRoleCode;
  const headerTenantId = req.headers["x-tenant-id"] as string;

  if (headerUserId) {
    const found = RBAC_USERS_DATA.find((u) => u.id === headerUserId);
    if (found) return found;
  }

  if (headerRole && ROLE_DEFINITIONS[headerRole]) {
    const foundByRole = RBAC_USERS_DATA.find((u) => u.roleCode === headerRole);
    if (foundByRole) return foundByRole;
  }

  // Fallback padrão: Super Admin (Eu)
  return RBAC_USERS_DATA[0];
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
        ipAddress: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1") as string,
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

  res.json({
    success: true,
    user,
    role: roleDef,
    tenant,
    allRoles: Object.values(ROLE_DEFINITIONS),
    availablePersonas: RBAC_USERS_DATA.map((u) => ({
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

// 2. Alternar persona / simulador de papéis
rbacRouter.post("/switch-persona", (req, res) => {
  const { userId, roleCode, tenantId } = req.body;
  let targetUser: RbacUser | undefined;

  if (userId) {
    targetUser = RBAC_USERS_DATA.find((u) => u.id === userId);
  } else if (roleCode) {
    targetUser = RBAC_USERS_DATA.find((u) => u.roleCode === roleCode);
  }

  if (!targetUser) {
    targetUser = RBAC_USERS_DATA[0];
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

  // Registrar auditoria da alternância de contexto
  AUDIT_LOGS_DATA.unshift({
    id: `aud_switch_${Date.now()}`,
    tenantId: targetUser.tenantId,
    userId: targetUser.id,
    userName: targetUser.name,
    userRole: targetUser.roleCode,
    ipAddress: (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1") as string,
    action: "SIMULATOR_SWITCH_PERSONA",
    resource: "security_compliance",
    entityId: targetUser.id,
    timestamp: new Date().toISOString(),
    status: "success",
    justification: `Alternância de persona para teste de isolamento operacional: ${targetUser.roleName}`
  });

  res.json({
    success: true,
    message: `Persona alternada para: ${targetUser.name} (${targetUser.roleName})`,
    user: targetUser,
    role: roleDef
  });
});

// 3. Matriz de permissões resumida
rbacRouter.get("/matrix", (req, res) => {
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
rbacRouter.get("/tenants", (req, res) => {
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
rbacRouter.get("/users", (req, res) => {
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
rbacRouter.post("/users", (req, res) => {
  const caller = resolveAuthUser(req);
  const callerRole = ROLE_DEFINITIONS[caller.roleCode];

  const { name, email, roleCode, tenantId, department } = req.body;

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
    createdAt: new Date().toISOString()
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
rbacRouter.put("/users/:id/role", (req, res) => {
  const caller = resolveAuthUser(req);
  const { id } = req.params;
  const { roleCode, customOverrides } = req.body;

  const targetUserIndex = RBAC_USERS_DATA.findIndex((u) => u.id === id);
  if (targetUserIndex === -1) {
    return res.status(404).json({ success: false, error: "Usuário não encontrado." });
  }

  const targetUser = RBAC_USERS_DATA[targetUserIndex];

  // Validação: Tenant Admin só altera usuários da sua própria empresa
  if (caller.roleCode === "tenant_admin" && targetUser.tenantId !== caller.tenantId) {
    return res.status(403).json({ success: false, error: "Você só pode alterar usuários do seu próprio tenant." });
  }

  const oldState = { ...targetUser };
  const roleDef = ROLE_DEFINITIONS[roleCode as RbacRoleCode] || ROLE_DEFINITIONS[targetUser.roleCode];

  targetUser.roleCode = roleCode as RbacRoleCode;
  targetUser.roleName = roleDef.name;
  if (customOverrides) {
    targetUser.customOverrides = customOverrides;
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
    afterState: { roleCode: targetUser.roleCode, roleName: targetUser.roleName, customOverrides },
    status: "success"
  });

  res.json({
    success: true,
    message: `Papel do usuário atualizado para '${roleDef.name}'.`,
    user: targetUser
  });
});

// 8. Reset de Senha Seguro (Suporte / Admin)
rbacRouter.post("/users/:id/reset-password", (req, res) => {
  const caller = resolveAuthUser(req);
  const { id } = req.params;

  const targetUser = RBAC_USERS_DATA.find((u) => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: "Usuário não encontrado." });
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
rbacRouter.get("/audit-logs", (req, res) => {
  const user = resolveAuthUser(req);
  const roleDef = ROLE_DEFINITIONS[user.roleCode];

  let logs = AUDIT_LOGS_DATA;

  // Se for usuário de tenant, só vê logs do seu próprio tenant
  if (roleDef.scope === "tenant") {
    logs = logs.filter((l) => l.tenantId === user.tenantId);
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
rbacRouter.get("/plans", (req, res) => {
  res.json({
    success: true,
    plans: SAAS_PLANS
  });
});

// 11. Obter Consumo e Cotas de um Tenant
rbacRouter.get("/quotas/:tenantId", (req, res) => {
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
rbacRouter.post("/plans/change", (req, res) => {
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
rbacRouter.post("/messages/send", (req, res) => {
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
rbacRouter.get("/lgpd/requests", (req, res) => {
  res.json({
    success: true,
    requests: LGPD_REQUESTS_DATA
  });
});

// 18. Exportar Dados do Titular (LGPD)
rbacRouter.post("/lgpd/export", (req, res) => {
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
    status: "completed" as const,
    completedAt: new Date().toISOString(),
    details: `Relatório de portabilidade e consentimento gerado. Motivo informado: ${reason || "Solicitação direta do titular"}`
  };

  LGPD_REQUESTS_DATA.unshift(reqItem);

  res.json({
    success: true,
    message: "Dossiê de dados pessoais gerado em conformidade com o Art. 19 da LGPD.",
    request: reqItem
  });
});

// 19. Anonimizar Cadastro (LGPD)
rbacRouter.post("/lgpd/anonymize", (req, res) => {
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
    status: "completed" as const,
    completedAt: new Date().toISOString(),
    details: `Registro pessoal anonimizado. Dados contábeis/fiscais preservados sob salvaguarda do Art. 16, I da LGPD.`
  };

  LGPD_REQUESTS_DATA.unshift(reqItem);

  res.json({
    success: true,
    message: "Cadastro pessoal anonimizado com sucesso.",
    request: reqItem
  });
});

// 20. Executar Bateria de Testes Automatizados de Isolamento e Permissão
rbacRouter.get("/test-isolation", (req, res) => {
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
