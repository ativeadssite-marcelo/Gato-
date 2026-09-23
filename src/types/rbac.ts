// ==========================================
// MODELO DE DADOS RBAC MULTI-TENANT E AUDITORIA
// ==========================================

export type RbacRoleCode =
  | 'super_admin'         // Super Admin — eu: Acesso total
  | 'saas_financeiro'     // Admin SaaS — Financeiro: Mensalidades, boletos, contratos, cobrança
  | 'saas_fiscal'         // Admin SaaS — Fiscal: Regras fiscais, impostos, CFOP/NCM, integrações
  | 'saas_suporte'        // Admin SaaS — Suporte: Atende bugs e tickets, logs técnicos mascarados, reset senha
  | 'saas_config'         // Admin SaaS — Config/Produto: Atualizações, conectores, layout, feature flags
  | 'saas_cs'             // Admin SaaS — Customer Success: Vê contas, uso, limites, mensagens internas
  | 'tenant_admin'        // Admin do Tenant — cliente contratante: Usuários, clientes, funcionários, itens
  | 'tenant_user'         // Usuário do Tenant: Operacional conforme função
  | 'tenant_readonly';    // Suporte somente leitura — opcional

export type PermissionAccessLevel =
  | 'full'               // ✅ Acesso total
  | 'read_only'          // 👁️ Visualização/leitura
  | 'none'               // ❌ Sem acesso
  | 'audit_required'     // ✅* Acesso total com auditoria e justificativa obrigatória
  | 'own_tenant_only'    // 👁️ ou ✅ restrito estritamente ao próprio tenant
  | 'masked';            // Visualização com mascaramento de PII

export type PermissionResource =
  | 'updates'                 // Atualizações da plataforma
  | 'billing_contracts'       // Mensalidade / contratos / cobrança
  | 'bug_support'             // Suporte a bugs / tickets
  | 'fiscal_config'           // Configuração fiscal e impostos
  | 'connectors'              // Conectores & integrações
  | 'layout_ui'               // Layout e customização visual
  | 'manage_accounts'         // Gerenciar contas de tenants
  | 'company_data'            // Dados da empresa contratante
  | 'customers_employees'     // Dados de clientes e funcionários
  | 'contractor_users'        // Usuários contratantes
  | 'limits_quotas'           // Limites e cadastros por plano
  | 'internal_messages'       // Mensagens internas
  | 'audit_logs'              // Trilha de auditoria
  | 'security_compliance';    // LGPD, MFA, IP allowlist

/**
 * Permissões operacionais finas do tenant. O admin contratante monta o acesso
 * de cada sub-usuário (vendedor, caixa, estoque, administrativo, gerente)
 * escolhendo quais dessas capacidades o usuário possui — "construtor flexível".
 * O `tenant_admin` e o escopo SaaS têm todas por padrão.
 */
export type TenantPermissionKey =
  | 'sales'                 // Vendas: orçamentos, pedidos, cotações
  | 'customer_register'     // Cadastro de clientes
  | 'invoicing'             // Faturamento / contas a receber
  | 'invoice_issuance'      // Emissão de NF-e / NFC-e (caixa)
  | 'payment_machines'      // Conexão a máquinas de pagamento (caixa)
  | 'stock_inbound'         // Entrada de nota / recebimento de mercadoria
  | 'stock_picking'         // Lista de separação
  | 'stock_location'        // Locação / endereçamento de estoque
  | 'item_register'         // Cadastro de peça / item
  | 'accounting_config'     // Configuração contábil (administrativo)
  | 'pricing_discounts'     // Descontos / campanhas / comissão (gerente)
  | 'margin_reports'        // Faturamento / margem (gerente)
  | 'marketplace';          // Conexão com marketplace (se contratado)

export interface TenantPermissionDefinition {
  key: TenantPermissionKey;
  name: string;
  group: 'vendas' | 'caixa' | 'estoque' | 'administrativo' | 'gerencia' | 'integracoes';
  description: string;
}

export interface PermissionDefinition {
  resource: PermissionResource;
  name: string;
  category: 'saas_admin' | 'tenant_core' | 'security';
  description: string;
}

export interface RoleDefinition {
  code: RbacRoleCode;
  name: string;
  scope: 'saas' | 'tenant';
  badgeColor: string;
  description: string;
  permissions: Record<PermissionResource, PermissionAccessLevel>;
  requiresMfa: boolean;
}

export interface TenantAccount {
  id: string;
  name: string;
  tradeName: string;
  cnpj: string;
  planId: string;
  planName: string;
  status: 'active' | 'suspended' | 'trial' | 'blocked';
  contactEmail: string;
  contactPhone: string;
  city: string;
  uf: string;
  createdAt: string;
  mfaRequired: boolean;
  sessionTimeoutMinutes: number;
  ipAllowlist: string[];
  softBlockEnabled: boolean;
}

export interface RbacUser {
  id: string;
  tenantId: string; // 'system' para equipe SaaS interna, ou ID do tenant específico
  tenantName: string;
  name: string;
  email: string;
  roleCode: RbacRoleCode;
  roleName: string;
  department?: string;
  active: boolean;
  avatarInitials: string;
  mfaEnabled: boolean;
  mfaEnforced: boolean;
  ipAllowlist?: string[];
  sessionTimeoutMinutes?: number;
  lastLoginAt: string;
  lastLoginIp: string;
  createdAt: string;
  customOverrides?: Partial<Record<PermissionResource, PermissionAccessLevel>>;
  /** Capacidades operacionais finas atribuídas pelo admin do tenant (construtor flexível). */
  tenantPermissions?: TenantPermissionKey[];
}

export interface PlanLimitConfig {
  id: string;
  code: 'starter' | 'pro' | 'enterprise' | 'custom';
  name: string;
  priceMonthly: number;
  quotas: {
    maxCustomers: number;
    maxItems: number;
    maxUsers: number;
    maxEmployees: number;
    maxStorageMb: number;
    maxInternalMessagesMonth: number;
    maxApiRequestsPerDay: number;
  };
  features: string[];
}

export interface TenantQuotaUsage {
  tenantId: string;
  tenantName: string;
  planId: string;
  planName: string;
  currentCustomers: number;
  maxCustomers: number;
  currentItems: number;
  maxItems: number;
  currentUsers: number;
  maxUsers: number;
  currentEmployees: number;
  maxEmployees: number;
  currentStorageMb: number;
  maxStorageMb: number;
  currentMessagesMonth: number;
  maxMessagesMonth: number;
  currentApiToday: number;
  maxApiPerDay: number;
  softBlockTolerancePercent: number; // ex: 10%
  status: 'normal' | 'warning_90' | 'soft_blocked' | 'hard_blocked';
  lastEvaluatedAt: string;
}

export interface AuditLogRecord {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  userRole: RbacRoleCode;
  ipAddress: string;
  userAgent?: string;
  action: string;
  resource: PermissionResource | string;
  entityId: string;
  timestamp: string;
  justification?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  status: 'success' | 'warning' | 'blocked';
  anomalous?: boolean;
}

export interface InternalMessageTemplate {
  id: string;
  code: 'boleto_vencido' | 'proximo_vencimento' | 'pagamento_confirmado' | 'limite_atingido' | 'upgrade_solicitado' | 'aviso_manutencao';
  title: string;
  content: string;
  channels: ('in_app' | 'email')[];
}

export interface InternalMessageItem {
  id: string;
  tenantId: string; // 'all' ou ID de um tenant específico
  targetPlanId?: string; // 'all' ou plano específico
  senderId: string;
  senderName: string;
  senderRole: string;
  title: string;
  content: string;
  channels: ('in_app' | 'email')[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  templateCode?: string;
  createdAt: string;
  readBy: string[]; // User IDs que já leram
  optOutUsers: string[]; // User IDs que optaram por não receber mais esse tipo
}

export interface LgpdSubjectRequest {
  id: string;
  tenantId: string;
  subjectDocument: string; // CPF mascarado
  subjectName: string;
  requestType: 'export_data' | 'anonymize' | 'revoke_consent';
  requestedBy: string;
  requestedAt: string;
  status: 'pending' | 'completed' | 'rejected';
  completedAt?: string;
  details: string;
}

export interface IsolationTestResult {
  testId: string;
  name: string;
  category: 'cross_tenant_isolation' | 'rbac_permission_guard' | 'pii_masking' | 'plan_quota' | 'mfa_audit';
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
  durationMs: number;
  auditTrailCaptured: boolean;
}
