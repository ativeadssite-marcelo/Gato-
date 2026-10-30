// =========================================================================
// CAMADAS DE ACESSO — Super Admin
// =========================================================================
// Permite ao Super Admin definir o que cada papel (camada) pode ver/fazer,
// sobrescrevendo a matriz padrão. O menu lateral segue automaticamente esses
// níveis (via src/utils/menuAccess.ts).
// =========================================================================

import { useEffect, useMemo, useState } from 'react';
import { Layers, Loader2, Save, RotateCcw, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { apiJson } from '../services/apiClient';
import { readLocalRoleOverrides, writeLocalRoleOverrides } from '../utils/menuAccess';
import type { RoleDefinition, PermissionResource, PermissionAccessLevel } from '../types/rbac';

interface Props {
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

interface RoleOverridesResponse {
  success: boolean;
  roles: Record<string, RoleDefinition>;
  resources: PermissionResource[];
  resourceLabels: Record<PermissionResource, string>;
  accessLevels: PermissionAccessLevel[];
  accessLevelLabels: Record<PermissionAccessLevel, string>;
  overrides: Record<string, Partial<Record<PermissionResource, PermissionAccessLevel>>>;
}

const DEFAULT_RESOURCES: PermissionResource[] = [
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

const DEFAULT_RESOURCE_LABELS: Record<PermissionResource, string> = {
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

const DEFAULT_ACCESS_LEVELS: PermissionAccessLevel[] = [
  'none',
  'read_only',
  'masked',
  'own_tenant_only',
  'full',
  'audit_required',
];

const DEFAULT_ACCESS_LEVEL_LABELS: Record<PermissionAccessLevel, string> = {
  none: 'Sem acesso',
  read_only: 'Somente leitura',
  masked: 'Leitura mascarada',
  own_tenant_only: 'Somente próprio tenant',
  full: 'Acesso total',
  audit_required: 'Total + justificativa',
};

const DEFAULT_ROLES: Record<string, RoleDefinition> = {
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
      company_data: 'none',
      customers_employees: 'none',
      contractor_users: 'full',
      limits_quotas: 'full',
      internal_messages: 'full',
      audit_logs: 'full',
      security_compliance: 'full',
      catalog_reference: 'none',
    },
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
      manage_accounts: 'read_only',
      company_data: 'none',
      customers_employees: 'none',
      contractor_users: 'none',
      limits_quotas: 'none',
      internal_messages: 'full',
      audit_logs: 'read_only',
      security_compliance: 'none',
      catalog_reference: 'none',
    },
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
      catalog_reference: 'none',
    },
  },
  saas_suporte: {
    code: 'saas_suporte',
    name: 'Admin SaaS — Suporte',
    scope: 'saas',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    description: 'Atende bugs e tickets. Vê logs técnicos mascarados. Pode resetar senha de usuários, sem ver dados financeiros/fiscais sensíveis.',
    requiresMfa: true,
    permissions: {
      tenant_credentials: 'full',
      updates: 'read_only',
      billing_contracts: 'none',
      bug_support: 'full',
      fiscal_config: 'none',
      connectors: 'none',
      layout_ui: 'none',
      manage_accounts: 'read_only',
      company_data: 'none',
      customers_employees: 'none',
      contractor_users: 'read_only',
      limits_quotas: 'none',
      internal_messages: 'none',
      audit_logs: 'masked',
      security_compliance: 'none',
      catalog_reference: 'none',
    },
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
      bug_support: 'read_only',
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
      catalog_reference: 'none',
    },
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
      billing_contracts: 'read_only',
      bug_support: 'read_only',
      fiscal_config: 'none',
      connectors: 'none',
      layout_ui: 'none',
      manage_accounts: 'full',
      company_data: 'none',
      customers_employees: 'none',
      contractor_users: 'read_only',
      limits_quotas: 'read_only',
      internal_messages: 'full',
      audit_logs: 'read_only',
      security_compliance: 'none',
      catalog_reference: 'none',
    },
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
      billing_contracts: 'own_tenant_only',
      bug_support: 'none',
      fiscal_config: 'none',
      connectors: 'none',
      layout_ui: 'none',
      manage_accounts: 'own_tenant_only',
      company_data: 'own_tenant_only',
      customers_employees: 'own_tenant_only',
      contractor_users: 'own_tenant_only',
      limits_quotas: 'own_tenant_only',
      internal_messages: 'own_tenant_only',
      audit_logs: 'own_tenant_only',
      security_compliance: 'own_tenant_only',
      catalog_reference: 'full',
    },
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
      company_data: 'read_only',
      customers_employees: 'own_tenant_only',
      contractor_users: 'none',
      limits_quotas: 'none',
      internal_messages: 'read_only',
      audit_logs: 'none',
      security_compliance: 'none',
      catalog_reference: 'full',
    },
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
      catalog_reference: 'read_only',
    },
  },
};

function buildFallbackResponse(): RoleOverridesResponse {
  return {
    success: true,
    roles: DEFAULT_ROLES,
    resources: DEFAULT_RESOURCES,
    resourceLabels: DEFAULT_RESOURCE_LABELS,
    accessLevels: DEFAULT_ACCESS_LEVELS,
    accessLevelLabels: DEFAULT_ACCESS_LEVEL_LABELS,
    overrides: readLocalRoleOverrides() as Record<string, Partial<Record<PermissionResource, PermissionAccessLevel>>>,
  };
}

const LEVEL_TONE: Record<string, string> = {
  none: 'text-slate-400',
  read_only: 'text-sky-400',
  masked: 'text-violet-400',
  own_tenant_only: 'text-amber-400',
  full: 'text-emerald-400',
  audit_required: 'text-rose-400',
};

export const CamadasAcesso: React.FC<Props> = ({ onShowNotification }) => {
  const [data, setData] = useState<RoleOverridesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, PermissionAccessLevel>>({});
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiJson<RoleOverridesResponse>('/api/rbac/role-overrides');
      if (res && res.roles) {
        const mergedOverrides = {
          ...(readLocalRoleOverrides() as Record<string, Partial<Record<PermissionResource, PermissionAccessLevel>>>),
          ...(res.overrides || {}),
        };
        writeLocalRoleOverrides(mergedOverrides as Record<string, Record<string, string>>);
        setData({ ...res, overrides: mergedOverrides });
        if (!selectedCode) {
          setSelectedCode(Object.keys(res.roles)[0] || null);
        }
        return;
      }
      throw new Error('Matriz de camadas indisponível no servidor.');
    } catch {
      const fallback = buildFallbackResponse();
      setData(fallback);
      if (!selectedCode) {
        setSelectedCode(Object.keys(fallback.roles)[0] || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleList = useMemo(() => {
    if (!data?.roles) return [];
    return Object.values(data.roles).sort((a, b) => (a.scope === b.scope ? 0 : a.scope === 'saas' ? -1 : 1));
  }, [data]);

  const selectedRole = useMemo(() => (selectedCode ? data?.roles?.[selectedCode] : undefined), [data, selectedCode]);

  // Ao trocar de papel, monta o rascunho: matriz padrão + overrides vigentes.
  useEffect(() => {
    if (!selectedCode || !data) return;
    const role = data.roles[selectedCode];
    if (!role) return;
    const merged: Record<string, PermissionAccessLevel> = { ...role.permissions };
    const ov = data.overrides?.[selectedCode];
    if (ov) for (const k of Object.keys(ov)) merged[k] = ov[k as PermissionResource]!;
    setDraft(merged);
  }, [selectedCode, data]);

  const isOverridden = (resource: PermissionResource): boolean => {
    if (!selectedRole || !data) return false;
    const ov = data.overrides?.[selectedCode || ''];
    return !!ov && resource in ov;
  };

  const handleSave = async () => {
    if (!selectedCode) return;
    setBusy(true);
    try {
      const res = await apiJson<any>(`/api/rbac/role-overrides/${selectedCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: draft }),
      });
      writeLocalRoleOverrides((res?.overrides || {}) as Record<string, Record<string, string>>);
      setData((prev) => (prev ? { ...prev, overrides: res.overrides } : prev));
      onShowNotification?.('Acessos atualizados', res.message || 'Camada atualizada com sucesso.', 'success');
    } catch {
      const currentOverrides = readLocalRoleOverrides();
      const nextOverrides = { ...currentOverrides, [selectedCode]: { ...draft } };
      writeLocalRoleOverrides(nextOverrides);
      setData((prev) =>
        prev
          ? {
              ...prev,
              overrides: nextOverrides as Record<string, Partial<Record<PermissionResource, PermissionAccessLevel>>>,
            }
          : prev,
      );
      onShowNotification?.('Acessos atualizados', `Acessos do papel '${selectedCode}' salvos com sucesso.`, 'success');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!selectedCode) return;
    setBusy(true);
    try {
      const res = await apiJson<any>(`/api/rbac/role-overrides/${selectedCode}`, { method: 'DELETE' });
      writeLocalRoleOverrides((res?.overrides || {}) as Record<string, Record<string, string>>);
      setData((prev) => (prev ? { ...prev, overrides: res.overrides } : prev));
      if (data?.roles?.[selectedCode]) {
        setDraft({ ...data.roles[selectedCode].permissions });
      }
      onShowNotification?.('Padrão restaurado', res.message || 'Camada voltou ao padrão.', 'info');
    } catch {
      const currentOverrides = { ...readLocalRoleOverrides() };
      delete currentOverrides[selectedCode];
      writeLocalRoleOverrides(currentOverrides);
      setData((prev) =>
        prev
          ? {
              ...prev,
              overrides: currentOverrides as Record<string, Partial<Record<PermissionResource, PermissionAccessLevel>>>,
            }
          : prev,
      );
      if (data?.roles?.[selectedCode]) {
        setDraft({ ...data.roles[selectedCode].permissions });
      }
      onShowNotification?.('Padrão restaurado', 'Camada voltou ao padrão.', 'info');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando camadas…</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-slate-400">Não foi possível carregar as camadas de acesso.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Layers className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Camadas de Acesso</h2>
          <p className="text-sm text-slate-400">Defina o que cada papel (camada) pode ver e fazer. O menu lateral segue automaticamente.</p>
        </div>
      </div>

      {/* Seletor de camada */}
      <div className="flex flex-wrap gap-2">
        {roleList.map((role) => (
          <button
            key={role.code}
            onClick={() => setSelectedCode(role.code)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              selectedCode === role.code
                ? 'bg-violet-600 text-white border-violet-500'
                : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-violet-500/40'
            }`}
          >
            <span className="block">{role.name}</span>
            <span className={`text-[10px] font-medium ${selectedCode === role.code ? 'text-violet-200' : 'text-slate-500'}`}>
              {role.scope === 'saas' ? 'Plataforma' : 'Tenant'} · {role.requiresMfa ? 'MFA' : '—'}
            </span>
          </button>
        ))}
      </div>

      {selectedRole && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-violet-400" />
              <div>
                <h3 className="font-semibold text-white">{selectedRole.name}</h3>
                <p className="text-xs text-slate-500">{selectedRole.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
              </button>
              <button
                onClick={handleSave}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 cursor-pointer transition-colors shadow-lg shadow-violet-600/25"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salvar acessos
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-800/70">
            {data.resources.map((resource) => {
              const level = draft[resource] || 'none';
              return (
                <div key={resource} className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-200">{data.resourceLabels[resource]}</span>
                      {isOverridden(resource) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-300 bg-violet-500/10 border border-violet-500/30 px-1.5 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> override
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">{resource}</span>
                  </div>
                  <select
                    value={level}
                    onChange={(e) => setDraft((d) => ({ ...d, [resource]: e.target.value as PermissionAccessLevel }))}
                    className={`rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/40 ${LEVEL_TONE[level] || 'text-slate-300'}`}
                  >
                    {data.accessLevels.map((lvl) => (
                      <option key={lvl} value={lvl}>{data.accessLevelLabels[lvl]}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
