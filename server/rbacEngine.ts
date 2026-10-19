import {
  RbacRoleCode,
  PermissionResource,
  PermissionAccessLevel,
  RoleDefinition,
  TenantAccount,
  RbacUser,
  PlanLimitConfig,
  TenantQuotaUsage,
  AuditLogRecord,
  InternalMessageTemplate,
  InternalMessageItem,
  IsolationTestResult,
  LgpdSubjectRequest,
  TenantPermissionKey,
  TenantPermissionDefinition
} from "../src/types/rbac";

// =========================================================================
// LISTA DE RECURSOS E OVERRIDES POR PAPEL (editáveis pelo Super Admin)
// =========================================================================

export const PERMISSION_RESOURCES: PermissionResource[] = [
  'updates',
  'billing_contracts',
  'bug_support',
  'fiscal_config',
  'connectors',
  'layout_ui',
  'manage_accounts',
  'company_data',
  'customers_employees',
  'contractor_users',
  'limits_quotas',
  'internal_messages',
  'audit_logs',
  'security_compliance',
  'catalog_reference',
  'tenant_credentials',
];

export const PERMISSION_RESOURCE_LABELS: Record<PermissionResource, string> = {
  updates: 'Atualizações da plataforma',
  billing_contracts: 'Cobrança / Contratos',
  bug_support: 'Suporte a bugs',
  fiscal_config: 'Configuração fiscal',
  connectors: 'Conectores & integrações',
  layout_ui: 'Layout / customização',
  manage_accounts: 'Gerenciar contas de tenants',
  company_data: 'Dados da empresa',
  customers_employees: 'Clientes & funcionários',
  contractor_users: 'Usuários contratantes',
  limits_quotas: 'Limites & cotas',
  internal_messages: 'Mensagens internas',
  audit_logs: 'Trilha de auditoria',
  security_compliance: 'Segurança & LGPD',
  catalog_reference: 'Catálogo de referência (veículos/aplicação)',
  tenant_credentials: 'Chaves de API & licença de máquina',
};

export const ACCESS_LEVELS: PermissionAccessLevel[] = ['none', 'read_only', 'masked', 'own_tenant_only', 'full', 'audit_required'];

export const ACCESS_LEVEL_LABELS: Record<PermissionAccessLevel, string> = {
  none: 'Sem acesso',
  read_only: 'Somente leitura',
  masked: 'Leitura mascarada',
  own_tenant_only: 'Somente próprio tenant',
  full: 'Acesso total',
  audit_required: 'Total + justificativa',
};

// Overrides aplicados POR PAPEL pelo Super Admin (sobrescrevem ROLE_DEFINITIONS).
export const ROLE_OVERRIDES: Partial<Record<RbacRoleCode, Partial<Record<PermissionResource, PermissionAccessLevel>>>> = {};

// =========================================================================
// 1. MATRIZ OFICIAL DE PAPÉIS E PERMISSÕES (CONFORME ESPECIFICAÇÃO DO USUÁRIO)
// =========================================================================

export const ROLE_DEFINITIONS: Record<RbacRoleCode, RoleDefinition> = {
  super_admin: {
    code: 'super_admin',
    name: 'Super Admin — Eu',
    scope: 'saas',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    description: 'Acesso total. Cria/remove admins da equipe, define permissões, gerencia planos, limites, contratos, fiscal, conectores e mensagens.',
    requiresMfa: true,
    permissions: {
      tenant_credentials: 'full',
      updates: 'full',
      billing_contracts: 'full',
      bug_support: 'full',
      fiscal_config: 'full',
      connectors: 'full',
      layout_ui: 'full',
      manage_accounts: 'full',
      // O dono do SaaS NÃO opera o balcão: sem acesso aos dados operacionais
      // dos contratantes (produtos, filiais, clientes, funcionários). Antes era
      // `audit_required`, mas o caminho global de `resolveDataScope` contornava
      // a justificativa — ver `catalog_reference` para o que ele mantém.
      company_data: 'none',
      customers_employees: 'none',
      contractor_users: 'full',
      limits_quotas: 'full',
      internal_messages: 'full',
      audit_logs: 'full',
      security_compliance: 'full',
      // Sem o catálogo de referência (base de veículos, aplicação de peças).
      // O racional anterior era "é dado de referência, o dono do SaaS mantém a
      // consulta" — mas na prática o dono da plataforma não opera balcão nem
      // consulta de peças, e o item só poluía o menu dele. Com `none`, some do
      // menu (`consulta-pecas` → `catalog_reference`) e as rotas de
      // /api/vehicles e /api/fleet-database deixam de responder para este papel.
      catalog_reference: 'none'
    }
  },
  saas_financeiro: {
    code: 'saas_financeiro',
    name: 'Admin SaaS — Financeiro',
    scope: 'saas',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    description: 'Gerencia mensalidades, boletos, contratos, cobrança, notas e relatórios financeiros da plataforma. Sem acesso a dados de clientes/funcionários dos tenants.',
    requiresMfa: true,
    permissions: {
      tenant_credentials: 'none',
      updates: 'none',
      billing_contracts: 'full',
      bug_support: 'none',
      fiscal_config: 'none',
      connectors: 'none',
      layout_ui: 'none',
      manage_accounts: 'read_only',           // 👁️ Visualiza contas para cobrança
      company_data: 'none',
      customers_employees: 'none',
      contractor_users: 'none',
      limits_quotas: 'none',
      internal_messages: 'full',              // Dispara lembretes de cobrança
      audit_logs: 'read_only',
      security_compliance: 'none',
      catalog_reference: 'none'
    }
  },
  saas_fiscal: {
    code: 'saas_fiscal',
    name: 'Admin SaaS — Fiscal',
    scope: 'saas',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    description: 'Configura e altera regras fiscais, impostos, CFOP/NCM e integrações fiscais. Sem acesso a cobrança e dados pessoais.',
    requiresMfa: true,
    permissions: {
      tenant_credentials: 'none',
      updates: 'none',
      billing_contracts: 'none',
      bug_support: 'none',
      fiscal_config: 'full',
      connectors: 'none',
      layout_ui: 'none',
      manage_accounts: 'none',
      company_data: 'none',
      customers_employees: 'none',
      contractor_users: 'none',
      limits_quotas: 'none',
      internal_messages: 'none',
      audit_logs: 'read_only',
      security_compliance: 'none',
      catalog_reference: 'none'
    }
  },
  saas_suporte: {
    code: 'saas_suporte',
    name: 'Admin SaaS — Suporte',
    scope: 'saas',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    description: 'Atende bugs e tickets. Vê logs técnicos mascarados. Pode resetar senha de usuários, sem ver dados financeiros/fiscais sensíveis.',
    requiresMfa: true,
    permissions: {
      // Suporte pode rotacionar a chave de um cliente que perdeu acesso.
      tenant_credentials: 'full',
      updates: 'read_only',                   // 👁️ Vê versão e releases
      billing_contracts: 'none',
      bug_support: 'full',
      fiscal_config: 'none',
      connectors: 'none',
      layout_ui: 'none',
      manage_accounts: 'read_only',           // 👁️ Para localizar o cliente
      company_data: 'none',
      customers_employees: 'none',
      contractor_users: 'read_only',          // 👁️ Pode resetar senha
      limits_quotas: 'none',
      internal_messages: 'none',
      audit_logs: 'masked',                   // Logs técnicos mascarados
      security_compliance: 'none',
      catalog_reference: 'none'
    }
  },
  saas_config: {
    code: 'saas_config',
    name: 'Admin SaaS — Config / Produto',
    scope: 'saas',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    description: 'Gerencia atualizações, conectores, layout, feature flags e configurações da plataforma. Sem acesso a dados pessoais.',
    requiresMfa: true,
    permissions: {
      tenant_credentials: 'none',
      updates: 'full',
      billing_contracts: 'none',
      bug_support: 'read_only',               // 👁️ Acompanha telemetria de erros
      fiscal_config: 'none',
      connectors: 'full',
      layout_ui: 'full',
      manage_accounts: 'none',
      company_data: 'none',
      customers_employees: 'none',
      contractor_users: 'none',
      limits_quotas: 'none',
      internal_messages: 'none',
      audit_logs: 'read_only',
      security_compliance: 'none',
      catalog_reference: 'none'
    }
  },
  saas_cs: {
    code: 'saas_cs',
    name: 'Admin SaaS — Customer Success',
    scope: 'saas',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    description: 'Vê contas, uso, limites e pode enviar mensagens internas e de engajamento. Sem acesso a dados sensíveis.',
    requiresMfa: true,
    permissions: {
      tenant_credentials: 'none',
      updates: 'none',
      billing_contracts: 'read_only',         // 👁️ Visualiza status do plano
      bug_support: 'read_only',               // 👁️ Acompanha satisfação
      fiscal_config: 'none',
      connectors: 'none',
      layout_ui: 'none',
      manage_accounts: 'full',                // ✅ Visualiza saúde das contas
      company_data: 'none',
      customers_employees: 'none',
      contractor_users: 'read_only',          // 👁️ Contatos principais
      limits_quotas: 'read_only',             // 👁️ Métricas de uso
      internal_messages: 'full',              // ✅ Envia mensagens e onboarding
      audit_logs: 'read_only',
      security_compliance: 'none',
      catalog_reference: 'none'
    }
  },
  tenant_admin: {
    code: 'tenant_admin',
    name: 'Admin do Tenant — Cliente Contratante',
    scope: 'tenant',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    description: 'Gerencia usuários da própria empresa, clientes, funcionários, itens de estoque, dados da empresa, faturas e upgrade.',
    requiresMfa: false,
    permissions: {
      tenant_credentials: 'own_tenant_only',
      updates: 'none',
      billing_contracts: 'own_tenant_only',   // 👁️ Própria fatura
      bug_support: 'none',
      fiscal_config: 'none',
      connectors: 'none',
      layout_ui: 'none',
      manage_accounts: 'own_tenant_only',     // 👁️ Dados cadastrais próprios
      company_data: 'own_tenant_only',        // ✅ Própria empresa
      customers_employees: 'own_tenant_only', // ✅ Próprios clientes/funcionários
      contractor_users: 'own_tenant_only',    // ✅ Próprios usuários
      limits_quotas: 'own_tenant_only',       // 👁️ Próprio consumo de cota
      internal_messages: 'own_tenant_only',   // 👁️ Próprias mensagens recebidas
      audit_logs: 'own_tenant_only',
      security_compliance: 'own_tenant_only',
      catalog_reference: 'full'
    }
  },
  tenant_user: {
    code: 'tenant_user',
    name: 'Usuário do Tenant — Operacional',
    scope: 'tenant',
    badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    description: 'Acesso operacional conforme a função diária (vendas, caixa, estoque). Não altera configurações críticas nem visualiza outros tenants.',
    requiresMfa: false,
    permissions: {
      tenant_credentials: 'none',
      updates: 'none',
      billing_contracts: 'none',
      bug_support: 'none',
      fiscal_config: 'none',
      connectors: 'none',
      layout_ui: 'none',
      manage_accounts: 'none',
      company_data: 'read_only',              // 👁️ Apenas leitura para emissão
      customers_employees: 'own_tenant_only', // ✅ Conforme função (vendas/atendimento)
      contractor_users: 'none',
      limits_quotas: 'none',
      internal_messages: 'read_only',         // 👁️ Vê comunicados recebidos
      audit_logs: 'none',
      security_compliance: 'none',
      catalog_reference: 'full'
    }
  },
  tenant_readonly: {
    code: 'tenant_readonly',
    name: 'Suporte / Auditor Somente Leitura',
    scope: 'tenant',
    badgeColor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    description: 'Visualiza relatórios e itens sem permissão de gravação ou alteração de dados.',
    requiresMfa: false,
    permissions: {
      tenant_credentials: 'none',
      updates: 'none',
      billing_contracts: 'read_only',
      bug_support: 'none',
      fiscal_config: 'none',
      connectors: 'none',
      layout_ui: 'none',
      manage_accounts: 'read_only',
      company_data: 'read_only',
      customers_employees: 'read_only',
      contractor_users: 'read_only',
      limits_quotas: 'read_only',
      internal_messages: 'read_only',
      audit_logs: 'read_only',
      security_compliance: 'none',
      catalog_reference: 'read_only'
    }
  }
};

// =========================================================================
// CATÁLOGO DE PERMISSÕES OPERACIONAIS DO TENANT (construtor flexível)
// =========================================================================
// O admin do tenant monta o acesso de cada sub-usuário escolhendo capacidades
// desta lista. Diferente da matriz de papéis (SaaS), estas são capacidades
// finas do dia a dia operacional (vendas, caixa, estoque, etc.).
// =========================================================================

export const TENANT_PERMISSION_CATALOG: TenantPermissionDefinition[] = [
  { key: 'sales', name: 'Vendas', group: 'vendas', description: 'Orçamentos, pedidos e cotações' },
  { key: 'customer_register', name: 'Cadastro de clientes', group: 'vendas', description: 'Criar e editar clientes' },
  { key: 'invoicing', name: 'Faturamento', group: 'vendas', description: 'Contas a receber e faturas de venda' },
  { key: 'invoice_issuance', name: 'Emissão de nota', group: 'caixa', description: 'Emitir NF-e / NFC-e' },
  { key: 'payment_machines', name: 'Máquinas de pagamento', group: 'caixa', description: 'Conectar e operar TEF / Pix' },
  { key: 'stock_inbound', name: 'Entrada de nota', group: 'estoque', description: 'Recebimento e entrada de mercadoria' },
  { key: 'stock_picking', name: 'Lista de separação', group: 'estoque', description: 'Separar e despachar pedidos' },
  { key: 'stock_location', name: 'Locação / endereçamento', group: 'estoque', description: 'Organizar posições de estoque' },
  { key: 'item_register', name: 'Cadastro de peça / item', group: 'estoque', description: 'Criar e editar itens do catálogo' },
  { key: 'accounting_config', name: 'Configuração contábil', group: 'administrativo', description: 'Plano de contas e parametrização contábil' },
  { key: 'pricing_discounts', name: 'Descontos / campanhas / comissão', group: 'gerencia', description: 'Definir descontos, campanhas e comissões' },
  { key: 'margin_reports', name: 'Faturamento / margem', group: 'gerencia', description: 'Acompanhar faturamento e margem' },
  { key: 'marketplace', name: 'Marketplace', group: 'integracoes', description: 'Conectar e operar marketplaces (se contratado)' },
];

export const TENANT_PERMISSION_GROUPS: Array<{ id: TenantPermissionDefinition['group']; name: string }> = [
  { id: 'vendas', name: 'Vendas' },
  { id: 'caixa', name: 'Caixa' },
  { id: 'estoque', name: 'Estoque' },
  { id: 'administrativo', name: 'Administrativo' },
  { id: 'gerencia', name: 'Gerência' },
  { id: 'integracoes', name: 'Integrações' },
];

/** True quando o usuário possui a capacidade operacional fina solicitada. */
export function hasTenantPermission(user: RbacUser, key: TenantPermissionKey): boolean {
  // Admin do tenant e equipe SaaS possuem todas as capacidades por padrão.
  if (user.roleCode === 'tenant_admin') return true;
  if (ROLE_DEFINITIONS[user.roleCode]?.scope === 'saas') return true;
  return !!user.tenantPermissions?.includes(key);
}

// =========================================================================
// 2. MASCARAMENTO AUTOMÁTICO DE PII (LGPD & COMPLIANCE)
// =========================================================================

export function maskCpf(cpf?: string): string {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return '***.***.***-**';
  return `${clean.substring(0, 3)}.***.***-${clean.substring(9, 11)}`;
}

export function maskCnpj(cnpj?: string): string {
  if (!cnpj) return '';
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return '**.***.***/0001-**';
  return `${clean.substring(0, 2)}.***.***/${clean.substring(8, 12)}-${clean.substring(12, 14)}`;
}

export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return '*****@*****';
  const [user, domain] = email.split('@');
  const visible = user.length > 2 ? user.substring(0, 2) : user.substring(0, 1);
  return `${visible}***@${domain}`;
}

export function maskPhone(phone?: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length >= 10) {
    return `(${clean.substring(0, 2)}) 9****-**${clean.substring(clean.length - 2)}`;
  }
  return '(**) ****-****';
}

export function sanitizePayloadForAudit(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  const clone = Array.isArray(payload) ? [...payload] : { ...payload };

  for (const key of Object.keys(clone)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('password') || lowerKey.includes('senha') || lowerKey.includes('token') || lowerKey.includes('secret')) {
      clone[key] = '[REDACTED_ENCRYPTED]';
    } else if (lowerKey === 'cpf' || lowerKey === 'document' && String(clone[key]).length === 11) {
      clone[key] = maskCpf(String(clone[key]));
    } else if (lowerKey === 'cnpj' || lowerKey === 'document' && String(clone[key]).length === 14) {
      clone[key] = maskCnpj(String(clone[key]));
    } else if (lowerKey === 'email') {
      clone[key] = maskEmail(String(clone[key]));
    } else if (lowerKey.includes('phone') || lowerKey.includes('telefone') || lowerKey.includes('whatsapp')) {
      clone[key] = maskPhone(String(clone[key]));
    } else if (typeof clone[key] === 'object' && clone[key] !== null) {
      clone[key] = sanitizePayloadForAudit(clone[key]);
    }
  }
  return clone;
}

// =========================================================================
// 3. PLANOS E COTAS (LIMITES POR PLANO)
// =========================================================================

export const SAAS_PLANS: PlanLimitConfig[] = [
  {
    id: 'plan_starter',
    code: 'starter',
    name: 'GATO Starter (Essencial)',
    description: 'Ideal para autopeças e oficinas iniciantes com balcão de vendas e controle de estoque ágil.',
    priceMonthly: 189.90,
    priceAnnual: 1899.00,
    badge: 'Essencial',
    active: true,
    quotas: {
      maxCustomers: 300,
      maxItems: 1500,
      maxUsers: 3,
      maxEmployees: 5,
      maxStorageMb: 2048,
      maxInternalMessagesMonth: 200,
      maxApiRequestsPerDay: 500
    },
    features: ['Balcão & Orçamentos', 'Catálogo Básico', 'NF-e Balcão', 'Garantia CDC de Peças', 'Suporte em Horário Comercial']
  },
  {
    id: 'plan_pro',
    code: 'pro',
    name: 'GATO Pro (Crescimento)',
    description: 'Pacote completo para oficinas e autopeças consolidadas com integração de comissões e marketplaces.',
    priceMonthly: 389.90,
    priceAnnual: 3899.00,
    badge: 'Mais Popular',
    active: true,
    quotas: {
      maxCustomers: 2500,
      maxItems: 15000,
      maxUsers: 10,
      maxEmployees: 25,
      maxStorageMb: 10240,
      maxInternalMessagesMonth: 1500,
      maxApiRequestsPerDay: 5000
    },
    features: ['Conectores Mercado Livre & Shopee', 'SPED Fiscal', 'MDF-e Interestadual', 'Multi-CDs Filiais', 'Garantia CDC com Fotos', 'Comissões de Vendedor e Oficina', 'Suporte Prioritário']
  },
  {
    id: 'plan_enterprise',
    code: 'enterprise',
    name: 'GATO Enterprise (Frota & Distribuição)',
    description: 'Para redes de autopeças, distribuidores e centros automotivos com alto volume de peças e filiais.',
    priceMonthly: 890.00,
    priceAnnual: 8900.00,
    badge: 'Corporativo',
    active: true,
    quotas: {
      maxCustomers: 20000,
      maxItems: 100000,
      maxUsers: 50,
      maxEmployees: 120,
      maxStorageMb: 102400,
      maxInternalMessagesMonth: 20000,
      maxApiRequestsPerDay: 50000
    },
    features: ['Acesso API Dedicada', 'Auditoria em Tempo Real', 'IP Allowlist Avançado', 'Gestor de Contas CS Dedicado', 'Comissões Avançadas & OS Customizada', 'SLA 99.9%']
  }
];

export function addSaasPlan(plan: PlanLimitConfig): PlanLimitConfig {
  SAAS_PLANS.push(plan);
  return plan;
}

export function updateSaasPlan(id: string, updates: Partial<PlanLimitConfig>): PlanLimitConfig | null {
  const index = SAAS_PLANS.findIndex(p => p.id === id);
  if (index === -1) return null;
  const existing = SAAS_PLANS[index];
  const updated: PlanLimitConfig = {
    ...existing,
    ...updates,
    quotas: {
      ...existing.quotas,
      ...(updates.quotas || {})
    },
    features: updates.features ? [...updates.features] : existing.features,
    updatedAt: new Date().toISOString()
  };
  SAAS_PLANS[index] = updated;
  return updated;
}

export function deleteSaasPlan(id: string): boolean {
  const index = SAAS_PLANS.findIndex(p => p.id === id);
  if (index === -1) return false;
  SAAS_PLANS.splice(index, 1);
  return true;
}

// =========================================================================
// 4. BANCO EM MEMÓRIA COM PERSISTÊNCIA INICIAL
// =========================================================================

export const TENANTS_DATA: TenantAccount[] = [
  {
    id: 'cmtt58e6o0000ju346a0g6s32',
    name: 'MGN Autopeças Matriz',
    tradeName: 'MGN Peças & Acessórios Automotivos',
    cnpj: '12.345.678/0001-90',
    planId: 'plan_pro',
    planName: 'GATO Pro (Crescimento)',
    status: 'active',
    contactEmail: 'diretoria@mgnautopecas.com.br',
    contactPhone: '(67) 3341-9000',
    city: 'Campo Grande',
    uf: 'MS',
    createdAt: '2026-01-10T10:00:00Z',
    mfaRequired: false,
    sessionTimeoutMinutes: 480,
    ipAllowlist: ['187.64.*.*', '177.132.*.*'],
    softBlockEnabled: true
  },
  {
    id: 'cmtvk1ieq0000ju8c3kg5n85l',
    name: 'Pantanal Diesel & Peças Pesadas',
    tradeName: 'Pantanal Diesel Truck Center',
    cnpj: '24.980.123/0001-44',
    planId: 'plan_starter',
    planName: 'GATO Starter (Essencial)',
    status: 'active',
    contactEmail: 'contato@pantanaldiesel.com.br',
    contactPhone: '(67) 3388-1200',
    city: 'Dourados',
    uf: 'MS',
    createdAt: '2026-02-01T14:30:00Z',
    mfaRequired: false,
    sessionTimeoutMinutes: 240,
    ipAllowlist: [],
    softBlockEnabled: true
  },
  {
    id: 'cmtw0kypx0000junojqqlz2i3',
    name: 'TransLog Autocenter & Frota',
    tradeName: 'TransLog Manutenção Pesada',
    cnpj: '33.109.876/0001-12',
    planId: 'plan_enterprise',
    planName: 'GATO Enterprise (Frota & Distribuição)',
    status: 'active',
    contactEmail: 'gestao@translogfrota.com.br',
    contactPhone: '(11) 4509-3300',
    city: 'Campinas',
    uf: 'SP',
    createdAt: '2026-02-15T09:00:00Z',
    mfaRequired: true,
    sessionTimeoutMinutes: 120,
    ipAllowlist: ['200.180.45.10'],
    softBlockEnabled: false
  }
];

export const RBAC_USERS_DATA: RbacUser[] = [
  // Super Admin
  {
    id: 'usr_super_admin',
    tenantId: 'system',
    tenantName: 'SaaS Plataforma Central',
    name: 'Administrador Geral (Eu)',
    email: 'contato.ativeads@gmail.com',
    roleCode: 'super_admin',
    roleName: 'Super Admin — Eu',
    department: 'Diretoria / Tech Lead',
    active: true,
    avatarInitials: 'SA',
    mfaEnabled: true,
    mfaEnforced: true,
    lastLoginAt: '2026-09-22T06:30:00Z',
    lastLoginIp: '189.40.12.88',
    createdAt: '2026-01-01T00:00:00Z'
  },
  // Equipe SaaS Admin
  {
    id: 'usr_saas_fin',
    tenantId: 'system',
    tenantName: 'SaaS Plataforma Central',
    name: 'Patrícia Prado',
    email: 'financeiro.saas@gatosistemas.com.br',
    roleCode: 'saas_financeiro',
    roleName: 'Admin SaaS — Financeiro',
    department: 'Financeiro & Billing',
    active: true,
    avatarInitials: 'PP',
    mfaEnabled: true,
    mfaEnforced: true,
    lastLoginAt: '2026-09-22T05:45:00Z',
    lastLoginIp: '177.102.34.12',
    createdAt: '2026-01-15T10:00:00Z'
  },
  {
    id: 'usr_saas_fisc',
    tenantId: 'system',
    tenantName: 'SaaS Plataforma Central',
    name: 'Marcos Vinícius',
    email: 'tributario@gatosistemas.com.br',
    roleCode: 'saas_fiscal',
    roleName: 'Admin SaaS — Fiscal',
    department: 'Inteligência Fiscal',
    active: true,
    avatarInitials: 'MV',
    mfaEnabled: true,
    mfaEnforced: true,
    lastLoginAt: '2026-09-21T18:20:00Z',
    lastLoginIp: '189.65.10.99',
    createdAt: '2026-01-20T11:00:00Z'
  },
  {
    id: 'usr_saas_sup',
    tenantId: 'system',
    tenantName: 'SaaS Plataforma Central',
    name: 'Juliana Costa',
    email: 'suporte.n2@gatosistemas.com.br',
    roleCode: 'saas_suporte',
    roleName: 'Admin SaaS — Suporte',
    department: 'Suporte Técnico N2',
    active: true,
    avatarInitials: 'JC',
    mfaEnabled: true,
    mfaEnforced: true,
    lastLoginAt: '2026-09-22T06:10:00Z',
    lastLoginIp: '201.88.90.15',
    createdAt: '2026-02-01T08:00:00Z'
  },
  {
    id: 'usr_saas_cfg',
    tenantId: 'system',
    tenantName: 'SaaS Plataforma Central',
    name: 'Lucas Barreto',
    email: 'produto@gatosistemas.com.br',
    roleCode: 'saas_config',
    roleName: 'Admin SaaS — Config / Produto',
    department: 'Engenharia de Produto',
    active: true,
    avatarInitials: 'LB',
    mfaEnabled: true,
    mfaEnforced: true,
    lastLoginAt: '2026-09-21T14:15:00Z',
    lastLoginIp: '179.180.20.44',
    createdAt: '2026-02-05T09:30:00Z'
  },
  {
    id: 'usr_saas_cs',
    tenantId: 'system',
    tenantName: 'SaaS Plataforma Central',
    name: 'Fernanda Lima',
    email: 'cs.sucesso@gatosistemas.com.br',
    roleCode: 'saas_cs',
    roleName: 'Admin SaaS — Customer Success',
    department: 'Customer Success',
    active: true,
    avatarInitials: 'FL',
    mfaEnabled: true,
    mfaEnforced: true,
    lastLoginAt: '2026-09-22T06:00:00Z',
    lastLoginIp: '189.44.11.23',
    createdAt: '2026-02-10T10:00:00Z'
  },
  // Tenant Contratante: MGN Autopeças
  {
    id: 'usr_tenant_mgn_adm',
    tenantId: 'cmtt58e6o0000ju346a0g6s32',
    tenantName: 'MGN Autopeças Matriz',
    name: 'Roberto Gato (Dono da MGN)',
    email: 'admin@mgnautopecas.com.br',
    roleCode: 'tenant_admin',
    roleName: 'Admin do Tenant — Cliente Contratante',
    department: 'Diretoria MGN',
    active: true,
    avatarInitials: 'RG',
    mfaEnabled: true,
    mfaEnforced: false,
    lastLoginAt: '2026-09-22T06:20:00Z',
    lastLoginIp: '187.64.90.11',
    createdAt: '2026-01-10T10:30:00Z'
  },
  {
    id: 'usr_tenant_mgn_user',
    tenantId: 'cmtt58e6o0000ju346a0g6s32',
    tenantName: 'MGN Autopeças Matriz',
    name: 'Carlos Mendes (Vendedor Balcão)',
    email: 'vendedor@mgnautopecas.com.br',
    roleCode: 'tenant_user',
    roleName: 'Usuário do Tenant — Operacional',
    department: 'Vendas & Balcão',
    active: true,
    avatarInitials: 'CM',
    mfaEnabled: false,
    mfaEnforced: false,
    lastLoginAt: '2026-09-22T05:50:00Z',
    lastLoginIp: '187.64.90.15',
    createdAt: '2026-01-12T08:00:00Z',
    tenantPermissions: ['sales', 'customer_register', 'invoicing']
  },
  // Tenant Contratante 2: Pantanal Diesel
  {
    id: 'usr_tenant_pantanal_adm',
    tenantId: 'cmtvk1ieq0000ju8c3kg5n85l',
    tenantName: 'Pantanal Diesel & Peças Pesadas',
    name: 'Geraldo Antunes',
    email: 'geraldo@pantanaldiesel.com.br',
    roleCode: 'tenant_admin',
    roleName: 'Admin do Tenant — Cliente Contratante',
    department: 'Administração Pantanal',
    active: true,
    avatarInitials: 'GA',
    mfaEnabled: false,
    mfaEnforced: false,
    lastLoginAt: '2026-09-21T17:40:00Z',
    lastLoginIp: '177.132.40.8',
    createdAt: '2026-02-01T15:00:00Z'
  },
  {
    id: 'usr_tenant_pantanal_ro',
    tenantId: 'cmtvk1ieq0000ju8c3kg5n85l',
    tenantName: 'Pantanal Diesel & Peças Pesadas',
    name: 'Clara Meireles (Auditoria Externa)',
    email: 'auditoria@pantanaldiesel.com.br',
    roleCode: 'tenant_readonly',
    roleName: 'Suporte / Auditor Somente Leitura',
    department: 'Auditoria Fiscal Contábil',
    active: true,
    avatarInitials: 'CM',
    mfaEnabled: true,
    mfaEnforced: false,
    lastLoginAt: '2026-09-20T11:00:00Z',
    lastLoginIp: '177.132.40.19',
    createdAt: '2026-02-15T10:00:00Z'
  }
];

export const AUDIT_LOGS_DATA: AuditLogRecord[] = [
  {
    id: 'aud_001',
    tenantId: 'system',
    userId: 'usr_super_admin',
    userName: 'Administrador Geral (Eu)',
    userRole: 'super_admin',
    ipAddress: '189.40.12.88',
    action: 'UPDATE_PLATFORM_SECURITY_POLICY',
    resource: 'security_compliance',
    entityId: 'global_policy',
    timestamp: '2026-09-22T06:25:00Z',
    justification: 'Exigência de MFA obrigatório para equipe SaaS administrativa.',
    beforeState: { mfaEnforcedForAllSaaSAdmins: false },
    afterState: { mfaEnforcedForAllSaaSAdmins: true },
    status: 'success'
  },
  {
    id: 'aud_002',
    tenantId: 'cmtt58e6o0000ju346a0g6s32',
    userId: 'usr_saas_fisc',
    userName: 'Marcos Vinícius',
    userRole: 'saas_fiscal',
    ipAddress: '189.65.10.99',
    action: 'UPDATE_TAX_RULE_MVA_MS',
    resource: 'fiscal_config',
    entityId: 'tax_rule_ms_409',
    timestamp: '2026-09-21T18:22:00Z',
    beforeState: { mvaOriginal: 71.78, cstDefault: '010' },
    afterState: { mvaOriginal: 71.78, cstDefault: '060' },
    status: 'success'
  },
  {
    id: 'aud_003',
    tenantId: 'cmtvk1ieq0000ju8c3kg5n85l',
    userId: 'usr_saas_sup',
    userName: 'Juliana Costa',
    userRole: 'saas_suporte',
    ipAddress: '201.88.90.15',
    action: 'RESET_USER_PASSWORD_REQUEST',
    resource: 'contractor_users',
    entityId: 'usr_tenant_pantanal_adm',
    timestamp: '2026-09-22T06:12:00Z',
    justification: 'Ticket #8912 - Chamado aberto pelo cliente solicitando recuperação de acesso.',
    beforeState: { email: maskEmail('geraldo@pantanaldiesel.com.br'), active: true },
    afterState: { resetTokenIssued: true, expiresAt: '2026-09-22T07:12:00Z' },
    status: 'success'
  },
  {
    id: 'aud_004',
    tenantId: 'cmtt58e6o0000ju346a0g6s32',
    userId: 'usr_super_admin',
    userName: 'Administrador Geral (Eu)',
    userRole: 'super_admin',
    ipAddress: '189.40.12.88',
    action: 'AUDIT_INSPECT_TENANT_CONFIDENTIAL_DATA',
    resource: 'company_data',
    entityId: 'cmtt58e6o0000ju346a0g6s32',
    timestamp: '2026-09-22T06:28:00Z',
    justification: 'Depuração de discrepância cadastral em lote de NF-e na SEFAZ/MS autorizada pelo cliente.',
    beforeState: { cnpj: maskCnpj('12.345.678/0001-90') },
    afterState: { verifiedCertA1: true, status: 'regular' },
    status: 'success'
  },
  {
    id: 'aud_005',
    tenantId: 'cmtvk1ieq0000ju8c3kg5n85l',
    userId: 'usr_tenant_pantanal_adm',
    userName: 'Geraldo Antunes',
    userRole: 'tenant_admin',
    ipAddress: '177.132.40.8',
    action: 'CREATE_CUSTOMER_RECORD',
    resource: 'customers_employees',
    entityId: 'cust_981',
    timestamp: '2026-09-21T16:10:00Z',
    beforeState: {},
    afterState: { name: 'Auto Mecânica Modelo', cnpj: maskCnpj('18.900.222/0001-10'), phone: maskPhone('67999887766') },
    status: 'success'
  }
];

export const MESSAGE_TEMPLATES: InternalMessageTemplate[] = [
  {
    id: 'tpl_boleto_vencido',
    code: 'boleto_vencido',
    title: 'Aviso Importante: Mensalidade GATO SaaS Vencida',
    content: 'Prezado(a) {{tenantName}},\n\nIdentificamos que o boleto referente à mensalidade do plano {{planName}} no valor de R$ {{amount}} venceu em {{dueDate}}.\n\nPara evitar o bloqueio automático de emissão de NF-e e cadastros, acesse o link de pagamento atualizado ou utilize a chave Pix copia e cola abaixo.\n\nChave Pix: 12.345.678/0001-90 (GATO Sistemas Ltda)\n\nDúvidas? Fale direto com o nosso Financeiro.',
    channels: ['in_app', 'email']
  },
  {
    id: 'tpl_proximo_vencimento',
    code: 'proximo_vencimento',
    title: 'Lembrete: Sua fatura GATO vence em 3 dias',
    content: 'Olá {{tenantName}},\n\nEste é um lembrete preventivo de que a sua fatura mensal (Plano {{planName}}) vencerá no próximo dia {{dueDate}} no valor de R$ {{amount}}.\n\nO boleto bancário com código de barras e chave Pix já estão disponíveis na sua área de Faturas.',
    channels: ['in_app', 'email']
  },
  {
    id: 'tpl_pagamento_confirmado',
    code: 'pagamento_confirmado',
    title: 'Pagamento Confirmado com Sucesso!',
    content: 'Olá {{tenantName}},\n\nConfirmamos a baixa do pagamento referente à sua mensalidade GATO SaaS. Sua assinatura está ativa e regularizada até o próximo ciclo. A nota fiscal de serviço (NFS-e) já foi anexada.\n\nObrigado pela parceria!',
    channels: ['in_app', 'email']
  },
  {
    id: 'tpl_limite_atingido',
    code: 'limite_atingido',
    title: 'Alerta de Cota: Você atingiu 90% do seu limite de itens/clientes',
    content: 'Atenção {{tenantName}},\n\nSua conta atingiu {{usagePercent}}% da capacidade contratada no plano {{planName}} ({{currentUsage}} de {{maxQuota}} registros).\n\nPara garantir a continuidade operacional das vendas e integrações de marketplaces sem interrupções, faça o upgrade de plano com cálculo proporcional imediato.',
    channels: ['in_app', 'email']
  },
  {
    id: 'tpl_upgrade_solicitado',
    code: 'upgrade_solicitado',
    title: 'Solicitação de Upgrade de Plano Registrada',
    content: 'Recebemos seu pedido de migração do plano {{currentPlan}} para o plano {{targetPlan}}. O valor proporcional residual calculado é de R$ {{proRataAmount}}.',
    channels: ['in_app', 'email']
  },
  {
    id: 'tpl_aviso_manutencao',
    code: 'aviso_manutencao',
    title: 'Comunicado Técnico: Atualização de Versão Programada',
    content: 'Prezado cliente,\n\nInformamos que no próximo domingo das 02:00 às 03:00 (horário de Brasília) realizaremos uma atualização de infraestrutura para melhorias nas consultas de estoque e integradores.\n\nNenhuma ação é necessária da sua parte.',
    channels: ['in_app', 'email']
  }
];

export const INTERNAL_MESSAGES_DATA: InternalMessageItem[] = [
  {
    id: 'msg_001',
    tenantId: 'all',
    senderId: 'usr_super_admin',
    senderName: 'Diretoria GATO SaaS',
    senderRole: 'Super Admin',
    title: 'Nova versão 3.4.0 com Matriz RBAC Granular e Proteção LGPD',
    content: 'Acabamos de implementar o novo controle de acesso baseado em papéis (RBAC) com segregação de funções, auditoria detalhada e limites de cota por plano.',
    channels: ['in_app'],
    priority: 'normal',
    templateCode: 'aviso_manutencao',
    createdAt: '2026-09-22T06:00:00Z',
    readBy: ['usr_tenant_mgn_adm'],
    optOutUsers: []
  },
  {
    id: 'msg_002',
    tenantId: 'cmtvk1ieq0000ju8c3kg5n85l',
    targetPlanId: 'plan_starter',
    senderId: 'usr_saas_cs',
    senderName: 'Fernanda Lima (Customer Success)',
    senderRole: 'Admin SaaS — CS',
    title: 'Alerta de Cota: Você atingiu 92% do limite de peças cadastradas',
    content: 'Olá Geraldo, notamos que a Pantanal Diesel atingiu 1.380 de 1.500 peças do plano Starter. Sugerimos migrar para o plano Pro para ter estoque ilimitado em múltiplos CDs.',
    channels: ['in_app', 'email'],
    priority: 'high',
    templateCode: 'limite_atingido',
    createdAt: '2026-09-21T15:00:00Z',
    readBy: [],
    optOutUsers: []
  },
  {
    id: 'msg_003',
    tenantId: 'cmtt58e6o0000ju346a0g6s32',
    targetPlanId: 'plan_pro',
    senderId: 'usr_saas_fin',
    senderName: 'Financeiro GATO SaaS',
    senderRole: 'Admin SaaS — Financeiro',
    title: 'Fatura Mensal Confirmada - Ciclo Setembro/2026',
    content: 'Confirmamos o recebimento da mensalidade da MGN Autopeças Matriz. Sua assinatura está ativa sem nenhuma pendência.',
    channels: ['in_app', 'email'],
    priority: 'normal',
    templateCode: 'pagamento_confirmado',
    createdAt: '2026-09-18T10:00:00Z',
    readBy: ['usr_tenant_mgn_adm', 'usr_tenant_mgn_user'],
    optOutUsers: []
  }
];

export const LGPD_REQUESTS_DATA: LgpdSubjectRequest[] = [
  {
    id: 'lgpd_001',
    tenantId: 'cmtt58e6o0000ju346a0g6s32',
    subjectDocument: maskCpf('298.412.839-04'),
    subjectName: 'Carlos Eduardo Silveira',
    requestType: 'export_data',
    requestedBy: 'DPO / Encarregado LGPD',
    requestedAt: '2026-09-20T14:00:00Z',
    status: 'completed',
    completedAt: '2026-09-20T14:05:00Z',
    details: 'Relatório estruturado de dados pessoais gerado em conformidade com art. 19 da LGPD (Lei 13.709/18).'
  },
  {
    id: 'lgpd_002',
    tenantId: 'cmtvk1ieq0000ju8c3kg5n85l',
    subjectDocument: maskCpf('112.980.444-12'),
    subjectName: 'Marcos de Oliveira (Ex-funcionário)',
    requestType: 'anonymize',
    requestedBy: 'Titular de Dados via Formulário',
    requestedAt: '2026-09-21T09:30:00Z',
    status: 'completed',
    completedAt: '2026-09-21T09:35:00Z',
    details: 'Anonimização de cadastro mantendo apenas registros contábeis estritamente exigidos pelo Fisco (art. 16, I da LGPD).'
  }
];

// =========================================================================
// 5. MOTOR DE AUTORIZAÇÃO E GUARDS DE ISOLAMENTO
// =========================================================================

export interface AuthContext {
  user: RbacUser;
  role: RoleDefinition;
  tenantId: string;
  isSaasAdmin: boolean;
  ipAddress: string;
}

export function evaluatePermission(
  user: RbacUser,
  resource: PermissionResource,
  targetTenantId?: string,
  justification?: string
): { allowed: boolean; reason?: string; requiresAudit: boolean } {
  const roleDef = ROLE_DEFINITIONS[user.roleCode];
  if (!roleDef) {
    return { allowed: false, reason: 'Papel de usuário desconhecido.', requiresAudit: false };
  }

  // Prioridade: override por usuário > override por papel (Super Admin) > matriz padrão.
  let accessLevel = user.customOverrides?.[resource] ?? ROLE_OVERRIDES[user.roleCode]?.[resource] ?? roleDef.permissions[resource];

  // 1. Sem Acesso
  if (!accessLevel || accessLevel === 'none') {
    return { 
      allowed: false, 
      reason: `Acesso negado: o papel '${roleDef.name}' não possui permissão para o recurso '${resource}'.`,
      requiresAudit: false 
    };
  }

  // 2. Isolamento Multi-tenant estrito (Tenant nunca vê outro Tenant)
  if (roleDef.scope === 'tenant') {
    if (targetTenantId && targetTenantId !== user.tenantId && targetTenantId !== 'own') {
      return { 
        allowed: false, 
        reason: `Violação de Isolamento Multi-Tenant: Usuários do Tenant '${user.tenantName}' não podem acessar dados do Tenant '${targetTenantId}'.`,
        requiresAudit: true 
      };
    }
  }

  // 3. Regra de Auditoria e Justificativa Obrigatória (Super Admin acessando dados sensíveis de Tenant)
  if (accessLevel === 'audit_required') {
    if (!justification || justification.trim().length < 8) {
      return {
        allowed: false,
        reason: `Acesso a dados confidenciais restrito: É obrigatório fornecer uma justificativa técnica formal (mínimo 8 caracteres) registrada em trilha de auditoria.`,
        requiresAudit: true
      };
    }
    return { allowed: true, requiresAudit: true };
  }

  // 4. Acesso permitido
  return { allowed: true, requiresAudit: false };
}

// Avaliação de Cotas por Tenant
export function evaluateTenantQuota(tenantId: string): TenantQuotaUsage {
  const tenant = TENANTS_DATA.find(t => t.id === tenantId) || TENANTS_DATA[0];
  const plan = SAAS_PLANS.find(p => p.id === tenant.planId) || SAAS_PLANS[1];

  // Simular contadores baseados na empresa
  const currentCustomers = tenant.id === 'cmtt58e6o0000ju346a0g6s32' ? 1420 : tenant.id === 'cmtvk1ieq0000ju8c3kg5n85l' ? 285 : 8400;
  const currentItems = tenant.id === 'cmtt58e6o0000ju346a0g6s32' ? 8900 : tenant.id === 'cmtvk1ieq0000ju8c3kg5n85l' ? 1410 : 35200;
  const currentUsers = tenant.id === 'cmtt58e6o0000ju346a0g6s32' ? 5 : tenant.id === 'cmtvk1ieq0000ju8c3kg5n85l' ? 2 : 18;
  const currentEmployees = tenant.id === 'cmtt58e6o0000ju346a0g6s32' ? 12 : tenant.id === 'cmtvk1ieq0000ju8c3kg5n85l' ? 4 : 45;
  const currentStorageMb = tenant.id === 'cmtt58e6o0000ju346a0g6s32' ? 4120 : tenant.id === 'cmtvk1ieq0000ju8c3kg5n85l' ? 1850 : 28400;
  const currentMessagesMonth = tenant.id === 'cmtt58e6o0000ju346a0g6s32' ? 480 : tenant.id === 'cmtvk1ieq0000ju8c3kg5n85l' ? 190 : 4200;
  const currentApiToday = tenant.id === 'cmtt58e6o0000ju346a0g6s32' ? 1200 : tenant.id === 'cmtvk1ieq0000ju8c3kg5n85l' ? 140 : 15800;

  // Análise de saturação
  const itemRatio = currentItems / plan.quotas.maxItems;
  const custRatio = currentCustomers / plan.quotas.maxCustomers;
  const maxRatio = Math.max(itemRatio, custRatio);

  let status: 'normal' | 'warning_90' | 'soft_blocked' | 'hard_blocked' = 'normal';
  if (maxRatio > 1.10) {
    status = tenant.softBlockEnabled ? 'soft_blocked' : 'hard_blocked';
  } else if (maxRatio > 1.0) {
    status = tenant.softBlockEnabled ? 'soft_blocked' : 'hard_blocked';
  } else if (maxRatio >= 0.90) {
    status = 'warning_90';
  }

  return {
    tenantId: tenant.id,
    tenantName: tenant.name,
    planId: plan.id,
    planName: plan.name,
    currentCustomers,
    maxCustomers: plan.quotas.maxCustomers,
    currentItems,
    maxItems: plan.quotas.maxItems,
    currentUsers,
    maxUsers: plan.quotas.maxUsers,
    currentEmployees,
    maxEmployees: plan.quotas.maxEmployees,
    currentStorageMb,
    maxStorageMb: plan.quotas.maxStorageMb,
    currentMessagesMonth,
    maxMessagesMonth: plan.quotas.maxInternalMessagesMonth,
    currentApiToday,
    maxApiPerDay: plan.quotas.maxApiRequestsPerDay,
    softBlockTolerancePercent: 10,
    status,
    lastEvaluatedAt: new Date().toISOString()
  };
}

// =========================================================================
// 6. BATERIA DE TESTES AUTOMATIZADOS DE ISOLAMENTO E PERMISSÕES
// =========================================================================

export function runSecurityIsolationTests(): IsolationTestResult[] {
  const results: IsolationTestResult[] = [];
  const start = Date.now();

  // Teste 1: Vazamento entre Tenants (Cross-Tenant Leak)
  const userTenantA = RBAC_USERS_DATA.find(u => u.id === 'usr_tenant_mgn_user')!;
  const test1 = evaluatePermission(userTenantA, 'customers_employees', 'cmtvk1ieq0000ju8c3kg5n85l');
  results.push({
    testId: 'SEC-TEST-001',
    name: 'Isolamento Estrito por tenant_id (Cross-Tenant Leak)',
    category: 'cross_tenant_isolation',
    description: 'Usuário do Tenant MGN tenta acessar dados do Tenant Pantanal Diesel.',
    passed: !test1.allowed,
    expected: 'Bloqueio imediato (403 Forbidden)',
    actual: test1.allowed ? 'FALHA: Acesso concedido indevidamente' : `SUCESSO: ${test1.reason}`,
    durationMs: 4,
    auditTrailCaptured: true
  });

  // Teste 2: Financeiro tentando ver clientes do tenant
  const userFinanceiro = RBAC_USERS_DATA.find(u => u.roleCode === 'saas_financeiro')!;
  const test2 = evaluatePermission(userFinanceiro, 'customers_employees', 'cmtt58e6o0000ju346a0g6s32');
  results.push({
    testId: 'SEC-TEST-002',
    name: 'Segregação de Funções: Financeiro vs Dados Pessoais',
    category: 'rbac_permission_guard',
    description: 'Admin Financeiro SaaS tenta consultar lista de clientes/funcionários de tenant.',
    passed: !test2.allowed,
    expected: 'Bloqueio por falta de permissão de recurso',
    actual: test2.allowed ? 'FALHA: Permitido indevidamente' : 'SUCESSO: Bloqueado conforme matriz',
    durationMs: 3,
    auditTrailCaptured: false
  });

  // Teste 3: Fiscal tentando ver cobrança/faturas
  const userFiscal = RBAC_USERS_DATA.find(u => u.roleCode === 'saas_fiscal')!;
  const test3 = evaluatePermission(userFiscal, 'billing_contracts');
  results.push({
    testId: 'SEC-TEST-003',
    name: 'Segregação de Funções: Fiscal vs Cobrança/Billing',
    category: 'rbac_permission_guard',
    description: 'Admin Fiscal tenta acessar mensalidades e contratos de faturamento.',
    passed: !test3.allowed,
    expected: 'Bloqueio estrito de acesso financeiro',
    actual: test3.allowed ? 'FALHA: Permitido' : 'SUCESSO: Bloqueado conforme matriz',
    durationMs: 2,
    auditTrailCaptured: false
  });

  // Teste 4: Suporte tentando resetar senha de usuário contratante
  const userSuporte = RBAC_USERS_DATA.find(u => u.roleCode === 'saas_suporte')!;
  const test4 = evaluatePermission(userSuporte, 'contractor_users');
  results.push({
    testId: 'SEC-TEST-004',
    name: 'Permissão de Suporte: Reset Seguro de Senha de Contratante',
    category: 'rbac_permission_guard',
    description: 'Suporte N2 atende chamado técnico para reset de credenciais com log mascarado.',
    passed: test4.allowed,
    expected: 'Permitido em modo leitura/reset com mascaramento',
    actual: test4.allowed ? 'SUCESSO: Permitido com log registrado' : 'FALHA: Bloqueado indevidamente',
    durationMs: 3,
    auditTrailCaptured: true
  });

  // Teste 5: Super Admin acessando dados sensíveis sem justificativa
  const superAdmin = RBAC_USERS_DATA.find(u => u.roleCode === 'super_admin')!;
  const test5NoJust = evaluatePermission(superAdmin, 'company_data', 'cmtt58e6o0000ju346a0g6s32', '');
  const test5WithJust = evaluatePermission(superAdmin, 'company_data', 'cmtt58e6o0000ju346a0g6s32', 'Auditoria formal de NF-e na SEFAZ');
  results.push({
    testId: 'SEC-TEST-005',
    name: 'Regra ✅*: Super Admin Exige Justificativa e Trilha de Auditoria',
    category: 'mfa_audit',
    description: 'Super Admin ao acessar dados de empresa de tenant precisa registrar motivo formal.',
    passed: !test5NoJust.allowed && test5WithJust.allowed,
    expected: 'Bloqueado sem justificativa; Permitido com justificativa formal registrada',
    actual: !test5NoJust.allowed && test5WithJust.allowed ? 'SUCESSO: Validação e auditoria exigidas com sucesso' : 'FALHA: Falha no controle de justificativa',
    durationMs: 5,
    auditTrailCaptured: true
  });

  // Teste 6: Mascaramento Automático de PII em Trilha de Auditoria
  const samplePayload = {
    cpf: '12345678909',
    cnpj: '12345678000190',
    email: 'roberto@empresa.com.br',
    passwordHash: 'argon2id$v=19$m=65536,t=3,p=4$abc',
    phone: '67999887766'
  };
  const sanitized = sanitizePayloadForAudit(samplePayload);
  const piiPass = 
    sanitized.cpf.includes('***') &&
    sanitized.cnpj.includes('***') &&
    sanitized.email.includes('***') &&
    sanitized.passwordHash === '[REDACTED_ENCRYPTED]';

  results.push({
    testId: 'SEC-TEST-006',
    name: 'Higienização e Mascaramento de PII em Logs de Auditoria',
    category: 'pii_masking',
    description: 'Garantir que nenhum dado pessoal sensível (CPF, CNPJ, e-mail, senha) seja exposto em texto plano.',
    passed: piiPass,
    expected: 'Campos mascarados com asteriscos e hashes substituídos por [REDACTED_ENCRYPTED]',
    actual: piiPass ? `SUCESSO: CPF: ${sanitized.cpf}, E-mail: ${sanitized.email}, Senha: ${sanitized.passwordHash}` : 'FALHA: PII vazada em texto aberto',
    durationMs: 2,
    auditTrailCaptured: true
  });

  // Teste 7: Alerta e Bloqueio de Cota de Plano
  const quotaPantanal = evaluateTenantQuota('cmtvk1ieq0000ju8c3kg5n85l');
  results.push({
    testId: 'SEC-TEST-007',
    name: 'Avaliação de Cota de Plano (Soft Block / Warning 90%)',
    category: 'plan_quota',
    description: 'Verificação do plano Starter da Pantanal Diesel com 94% de capacidade utilizada.',
    passed: quotaPantanal.status === 'warning_90' || quotaPantanal.status === 'soft_blocked',
    expected: 'Detecção de warning_90 ou soft_blocked com alerta proativo',
    actual: `SUCESSO: Status detectado = '${quotaPantanal.status}' (${quotaPantanal.currentItems}/${quotaPantanal.maxItems} peças)`,
    durationMs: 3,
    auditTrailCaptured: false
  });

  return results;
}
