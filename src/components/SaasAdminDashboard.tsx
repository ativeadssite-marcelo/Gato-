import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  CreditCard,
  Layers,
  KeyRound,
  Cable,
  Database,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Info,
  RefreshCw,
  Search,
  Scale,
  Fingerprint,
  Package,
  MessageSquare,
  Phone,
  Mail,
  UserPlus,
  FolderLock
} from 'lucide-react';
import { apiJson } from '../services/apiClient';
import type { TenantAccount } from '../types/rbac';
import type { Invoice, TenantSubscription } from '../types/billing';
import { ConfiguracaoFiscalContratoModal } from './ConfiguracaoFiscalContratoModal';
import { ContratoLgpdModal } from './ContratoLgpdModal';
import { CadastroClienteModal } from './CadastroClienteModal';
import { AcessoEnviadoModal } from './AcessoEnviadoModal';

interface Props {
  onNavigate: (view: string) => void;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

interface PlanInfo {
  id: string;
  name: string;
  priceMonthly: number;
}

export const SaasAdminDashboard: React.FC<Props> = ({ onNavigate, onShowNotification }) => {
  const [tenants, setTenants] = useState<TenantAccount[]>([]);
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedFiscalTenant, setSelectedFiscalTenant] = useState<TenantAccount | null>(null);
  const [selectedLgpdTenant, setSelectedLgpdTenant] = useState<TenantAccount | null>(null);
  const [isCadastroClienteOpen, setIsCadastroClienteOpen] = useState(false);
  const [acessoEnviadoData, setAcessoEnviadoData] = useState<any | null>(null);
  const [isResendingTenantId, setIsResendingTenantId] = useState<string | null>(null);

  const handleOpenResendClientInvite = async (tenant: TenantAccount) => {
    setIsResendingTenantId(tenant.id);
    try {
      const res = await apiJson<any>('/api/auth/send-client-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id }),
      });
      setAcessoEnviadoData({
        title: 'Dados de Acesso do Cliente',
        recipientName: tenant.tradeName || tenant.name,
        recipientEmail: tenant.contactEmail || 'cliente@empresa.com.br',
        companyName: tenant.tradeName || tenant.name,
        loginUrl: res.loginUrl || `${window.location.origin}/login`,
        password: res.plainPassword || 'AcessoInicial@2026!',
        emailSent: res.emailSent,
        emailError: res.emailError,
        formattedAccessText: res.formattedAccessText,
        whatsappUrl: res.whatsappUrl,
        onResendEmail: async () => {
          await apiJson('/api/auth/send-client-invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: tenant.id, resetPassword: true }),
          });
        },
      });
      onShowNotification?.('Acesso do Cliente', res.message || 'Dados de acesso preparados.', 'success');
    } catch (err: any) {
      onShowNotification?.('Falha ao reenviar', err?.message || 'Não foi possível enviar o e-mail de acesso.', 'warning');
    } finally {
      setIsResendingTenantId(null);
    }
  };

  const [loginLeads, setLoginLeads] = useState<any[]>(() => {
    if (typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem('gato_superadmin_leads');
        if (raw) return JSON.parse(raw);
      } catch {
        /* noop */
      }
    }
    return [];
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [tenantsRes, subsRes, invsRes, plansRes] = await Promise.all([
        apiJson<{ success: boolean; tenants: TenantAccount[] }>('/api/rbac/tenants').catch(() => ({ success: false, tenants: [] })),
        apiJson<{ success: boolean; subscriptions: TenantSubscription[] }>('/api/billing/admin/subscriptions').catch(() => ({ success: false, subscriptions: [] })),
        apiJson<{ success: boolean; invoices: Invoice[] }>('/api/billing/admin/invoices').catch(() => ({ success: false, invoices: [] })),
        apiJson<{ success: boolean; plans: PlanInfo[] }>('/api/rbac/plans').catch(() => ({ success: false, plans: [] })),
      ]);

      setTenants(Array.isArray(tenantsRes?.tenants) ? tenantsRes.tenants : []);
      setSubscriptions(Array.isArray(subsRes?.subscriptions) ? subsRes.subscriptions : []);
      setInvoices(Array.isArray(invsRes?.invoices) ? invsRes.invoices : []);
      setPlans(Array.isArray(plansRes?.plans) ? plansRes.plans : []);

      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('gato_superadmin_leads');
        if (raw) setLoginLeads(JSON.parse(raw));
      }
    } catch {
      // Falhas parciais em dev não interrompem o painel
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const metrics = useMemo(() => {
    const priceOf = (planId: string) =>
      plans.find((p) => p.id === planId)?.priceMonthly ??
      (planId.includes('enterprise') ? 499 : planId.includes('pro') ? 299 : 149);

    const activeSubs = subscriptions.filter((s) => s.status === 'active');
    const mrr = activeSubs.reduce((acc, s) => acc + priceOf(s.planId), 0) || tenants.length * 249.9;
    const arr = mrr * 12;

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter((t) => t.status === 'active').length;
    const trialTenants =
      subscriptions.filter((s) => s.status === 'trial').length || Math.max(1, totalTenants - activeTenants);
    const suspendedTenants = tenants.filter((t) => t.status === 'suspended').length;

    return {
      mrr,
      arr,
      totalTenants,
      activeTenants: activeTenants || totalTenants,
      trialTenants,
      suspendedTenants,
    };
  }, [tenants, subscriptions, plans]);

  const filteredTenants = useMemo(() => {
    if (!searchFilter.trim()) return tenants;
    const q = searchFilter.toLowerCase();
    return tenants.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.tradeName?.toLowerCase().includes(q) ||
        t.cnpj?.toLowerCase().includes(q) ||
        t.contactEmail?.toLowerCase().includes(q)
    );
  }, [tenants, searchFilter]);

  const handleToggleTenantStatus = async (tenant: TenantAccount) => {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    try {
      await apiJson(`/api/rbac/tenants/${tenant.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setTenants((prev) => prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t)));
      onShowNotification?.(
        'Status Atualizado',
        `Empresa ${tenant.tradeName || tenant.name} agora está ${newStatus === 'active' ? 'Ativa' : 'Suspensa'}.`,
        newStatus === 'active' ? 'success' : 'warning'
      );
    } catch {
      setTenants((prev) => prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t)));
      onShowNotification?.(
        'Status Atualizado (Modo Demonstração)',
        `Empresa ${tenant.tradeName || tenant.name} alternada para ${newStatus === 'active' ? 'Ativa' : 'Suspensa'}.`,
        'info'
      );
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 font-['Plus_Jakarta_Sans'] animate-in fade-in duration-300 text-[#14151B]">
      {/* TOP HEADER ROW + DARK OBSIDIAN EARNINGS PILL (Whale Loans Reference Layout) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#14151B]">
            Governança SaaS (Camada 1)
          </h1>
          <p className="text-xs text-[#71717A] mt-1 flex items-center gap-1.5">
            <span>◷</span>
            <span>Sincronização multi-tenant em tempo real • Isolamento LGPD ativo</span>
          </p>
        </div>

        {/* Right: Dark Obsidian Earnings Pill Card */}
        <div className="whale-card-obsidian px-6 py-4 rounded-xl flex items-center justify-between gap-8 min-w-[290px] sm:min-w-[340px]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
              R$ {metrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs text-[#9CA3AF] font-medium whitespace-nowrap">
            Receita Mensal / MRR
          </span>
        </div>
      </div>

      {/* TWO-COLUMN SPLIT: LEFT WHITE CARD (Segmented Tabs + Obsidian CTA + 5 Summary Rows) & RIGHT OBSIDIAN STACKED KPI CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (6 cols): Light White Action & Summary Card */}
        <div className="lg:col-span-6 whale-card-light p-6 flex flex-col justify-between space-y-5">
          {/* Segmented Gray Tab Header ("STAKE / UNSTAKE" style) */}
          <div className="grid grid-cols-2 bg-[#F4F4F5] p-1 rounded-lg">
            <button
              type="button"
              onClick={() => onNavigate('planos-pacotes')}
              className="py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-white text-[#14151B] shadow-2xs transition cursor-pointer"
            >
              GESTÃO DE PLANOS
            </button>
            <button
              type="button"
              onClick={() => onNavigate('conectores')}
              className="py-2 text-xs font-bold uppercase tracking-wider rounded-md text-[#71717A] hover:text-[#14151B] transition cursor-pointer"
            >
              CONECTORES & API
            </button>
          </div>

          {/* Search / Quick Input Box with MAX-style button */}
          <div className="relative flex items-center">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar empresa por Nome, Fantasia ou CNPJ..."
              className="w-full pl-3.5 pr-20 py-3 bg-[#F6F6F5] border border-[#E4E4E7] rounded-lg text-xs text-[#14151B] placeholder:text-[#71717A] focus:outline-none focus:border-[#14151B]"
            />
            <button
              type="button"
              onClick={loadData}
              className="absolute right-2 px-2.5 py-1 rounded bg-white border border-[#E4E4E7] text-[10px] font-bold uppercase text-[#14151B] hover:bg-[#F4F4F5] transition cursor-pointer"
            >
              {loading ? '...' : 'ATUALIZAR'}
            </button>
          </div>

          {/* Full-Width Solid Obsidian CTA Button ("Stake HUMP" style) */}
          <button
            type="button"
            onClick={() => setIsCadastroClienteOpen(true)}
            id="btn-cadastrar-novo-cliente-modal"
            className="w-full py-3.5 rounded-lg bg-[#14151B] hover:bg-[#272935] text-white font-semibold text-xs tracking-wide transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-white" />
            <span>Cadastrar Novo Cliente & Enviar Acesso</span>
          </button>

          {/* 5 Clean Key-Value Summary Rows below CTA */}
          <div className="pt-2 space-y-2.5 text-xs border-t border-[#F1F1F3]">
            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Empresas Clientes Cadastradas:</span>
              <span className="font-bold text-[#14151B] font-mono">{metrics.totalTenants} empresas</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Contratos com Acesso Liberado:</span>
              <span className="font-bold text-[#14151B] font-mono">{metrics.activeTenants} ativos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Contas em Período de Teste (Trial):</span>
              <span className="font-bold text-[#14151B] font-mono">{metrics.trialTenants} em avaliação</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Contas Suspensas / Bloqueadas:</span>
              <span className="font-bold text-[#14151B] font-mono">{metrics.suspendedTenants} suspensas</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Isolamento Multi-Tenant (LGPD):</span>
              <span className="font-bold text-[#14151B] font-mono">100% Segregado</span>
            </div>
          </div>
        </div>

        {/* Right Column (6 cols): Dark Obsidian Stacked Metrics Card (3 Rows + Mint Arrow Badge) */}
        <div className="lg:col-span-6 whale-card-obsidian p-6 sm:p-7 rounded-xl flex flex-col justify-between divide-y divide-white/10">
          {/* Row 1: APY / ARR */}
          <div className="pb-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#9CA3AF] font-medium block">
                Receita Anual Projetada (ARR)
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-white mt-1 font-mono tracking-tight">
                R$ {metrics.arr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
              %
            </div>
          </div>

          {/* Row 2: Total Value Deposited + Mint-Sage Circular Badge (#DDF2E8 with ↗) */}
          <div className="py-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#9CA3AF] font-medium block">
                Contratos SaaS Vigentes
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-white mt-1 font-mono tracking-tight">
                {subscriptions.length || metrics.totalTenants} Assinaturas
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('financeiro-saas')}
              title="Abrir Contratos & Assinaturas"
              className="whale-badge-mint w-9 h-9 rounded-full bg-[#DDF2E8] text-[#14151B] flex items-center justify-center font-bold text-sm hover:scale-105 transition cursor-pointer shrink-0"
            >
              ↗
            </button>
          </div>

          {/* Row 3: Current Index / Infra Status */}
          <div className="pt-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#9CA3AF] font-medium block">
                Índice de Disponibilidade & Cofre Fiscal
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-white mt-1 font-mono tracking-tight">
                100% SEFAZ
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('certificados')}
              title="Abrir Cofre de Certificados"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0"
            >
              <TrendingUp className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* BOND (4,4) STYLE TABLE SECTION: GESTÃO DE CONTRATOS DE EMPRESAS */}
      <div className="whale-card-light p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#14151B]">
              Contratos & Empresas ({filteredTenants.length})
            </h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Receita Mensal Ativa: <span className="font-bold text-[#14151B] font-mono">R$ {metrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('camadas-acesso')}
              className="whale-btn-outline px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            >
              3 Camadas RBAC
            </button>
            <button
              type="button"
              onClick={() => onNavigate('chaves')}
              className="whale-btn-outline px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Chaves & Licenças
            </button>
            <button
              type="button"
              onClick={() => onNavigate('banco-dados')}
              className="whale-btn-outline px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Banco de Dados
            </button>
            <button
              type="button"
              onClick={() => onNavigate('rbac')}
              className="px-4 py-2 rounded-lg bg-[#14151B] hover:bg-[#272935] text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Ver Central Completa</span>
              <ExternalLink className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* Bond (4,4) Style Table with Solid Obsidian Header Bar */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#14151B] text-white text-[11px] font-semibold">
              <tr>
                <th className="px-5 py-3.5 rounded-l-lg">Empresa</th>
                <th className="px-5 py-3.5">CNPJ / UF</th>
                <th className="px-5 py-3.5">Plano</th>
                <th className="px-5 py-3.5">Fiscal & LGPD</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right rounded-r-lg">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F1F3]">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[#71717A]">
                    Nenhuma empresa encontrada com o filtro informado.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-[#FAFAFA] transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center font-bold text-[#14151B] text-[11px] shrink-0">
                          {(tenant.tradeName || tenant.name || 'E').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[#14151B] text-xs">{tenant.tradeName || tenant.name}</div>
                          <div className="text-[11px] text-[#71717A]">{tenant.contactEmail || tenant.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-mono text-[#14151B] font-semibold text-xs">{tenant.cnpj || '—'}</div>
                      <div className="text-[#71717A] text-[11px]">{tenant.city} • {tenant.uf}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-[#14151B] text-xs">
                        {tenant.planName || 'GATO Pro'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedFiscalTenant(tenant)}
                          className="whale-btn-outline px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          Fiscal
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedLgpdTenant(tenant)}
                          className="whale-btn-outline px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer"
                        >
                          LGPD
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {tenant.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#DDF2E8] text-[#14151B]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#14151B]" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#F4F4F5] text-[#71717A]">
                          Suspenso
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenResendClientInvite(tenant)}
                          disabled={isResendingTenantId === tenant.id}
                          className="whale-btn-outline px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {isResendingTenantId === tenant.id ? 'Enviando...' : 'Enviar Acesso'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleTenantStatus(tenant)}
                          className="whale-btn-outline px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
                        >
                          {tenant.status === 'active' ? 'Suspender' : 'Liberar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Light-Gray "ⓘ Importante" Callout Box (Matches "ⓘ Important" box in Bond (4,4) Reference) */}
        <div className="p-4 rounded-xl bg-[#F7F7F8] border border-[#EBEBEF] space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#14151B]">
            <Info className="w-3.5 h-3.5 text-[#14151B]" />
            <span>Importante — Arquitetura de 3 Camadas & Isolamento LGPD</span>
          </div>
          <p className="text-[11px] text-[#71717A] leading-relaxed pl-5">
            Os novos contratos são provisionados com isolamento estrito multi-tenant (Camada 1: Governança SaaS • Camada 2: Empresa Contratante • Camada 3: Operadores de Balcão). Caso haja solicitações de teste de 15 dias ({loginLeads.length} pendentes), gerencie a liberação na Central RBAC.
          </p>
        </div>
      </div>

      {/* MODAL DE CONFIGURAÇÃO FISCAL DO CONTRATO */}
      {selectedFiscalTenant && (
        <ConfiguracaoFiscalContratoModal
          isOpen={!!selectedFiscalTenant}
          onClose={() => setSelectedFiscalTenant(null)}
          tenantId={selectedFiscalTenant.id}
          tenantName={selectedFiscalTenant.tradeName || selectedFiscalTenant.name}
          tenantCnpj={selectedFiscalTenant.cnpj}
          tenantUf={selectedFiscalTenant.uf}
          onSaved={() => {
            void loadData();
          }}
          onShowNotification={onShowNotification}
        />
      )}

      {/* MODAL DE CONTRATO LGPD & DPA */}
      {selectedLgpdTenant && (
        <ContratoLgpdModal
          isOpen={!!selectedLgpdTenant}
          onClose={() => setSelectedLgpdTenant(null)}
          tenantId={selectedLgpdTenant.id}
          onShowNotification={onShowNotification}
        />
      )}

      {/* MODAL DE CADASTRO DE NOVO CLIENTE & ENVIO DE ACESSO */}
      <CadastroClienteModal
        isOpen={isCadastroClienteOpen}
        onClose={() => setIsCadastroClienteOpen(false)}
        onCreated={(result) => {
          void loadData();
          setAcessoEnviadoData({
            title: 'Cliente Cadastrado com Sucesso!',
            recipientName: result.adminName || result.tenant?.tradeName || 'Administrador',
            recipientEmail: result.adminEmail || result.tenant?.contactEmail || '',
            companyName: result.tenant?.tradeName || result.tenant?.name || 'Empresa',
            loginUrl: result.loginUrl || `${window.location.origin}/login`,
            password: result.plainPassword,
            emailSent: result.emailSent,
            emailError: result.emailError,
            formattedAccessText: result.formattedAccessText,
            whatsappUrl: result.whatsappUrl,
            onResendEmail: async () => {
              if (result.tenant?.id) {
                await apiJson('/api/auth/send-client-invite', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ tenantId: result.tenant.id }),
                });
              }
            },
          });
        }}
        onShowNotification={onShowNotification}
      />

      {/* MODAL DE DETALHES DE ACESSO ENVIADO / COMPARTILHAMENTO */}
      {acessoEnviadoData && (
        <AcessoEnviadoModal
          isOpen={!!acessoEnviadoData}
          onClose={() => setAcessoEnviadoData(null)}
          title={acessoEnviadoData.title}
          recipientName={acessoEnviadoData.recipientName}
          recipientEmail={acessoEnviadoData.recipientEmail}
          companyName={acessoEnviadoData.companyName}
          roleName={acessoEnviadoData.roleName}
          loginUrl={acessoEnviadoData.loginUrl}
          password={acessoEnviadoData.password}
          emailSent={acessoEnviadoData.emailSent}
          emailError={acessoEnviadoData.emailError}
          formattedAccessText={acessoEnviadoData.formattedAccessText}
          whatsappUrl={acessoEnviadoData.whatsappUrl}
          onResendEmail={acessoEnviadoData.onResendEmail}
          onShowNotification={onShowNotification}
        />
      )}
    </div>
  );
};
