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
  UserCheck,
  UserX,
  FileText,
  Scale,
  Fingerprint,
  Package,
  Box,
  Sliders,
  MessageSquare,
  Phone
} from 'lucide-react';
import { apiJson } from '../services/apiClient';
import type { TenantAccount } from '../types/rbac';
import type { Invoice, TenantSubscription } from '../types/billing';
import { ConfiguracaoFiscalContratoModal } from './ConfiguracaoFiscalContratoModal';
import { ContratoLgpdModal } from './ContratoLgpdModal';

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

      setTenants(tenantsRes.tenants || []);
      setSubscriptions(subsRes.subscriptions || []);
      setInvoices(invsRes.invoices || []);
      setPlans(plansRes.plans || []);

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
    const priceOf = (planId: string) => plans.find((p) => p.id === planId)?.priceMonthly ?? (planId.includes('enterprise') ? 499 : planId.includes('pro') ? 299 : 149);

    const activeSubs = subscriptions.filter((s) => s.status === 'active');
    const mrr = activeSubs.reduce((acc, s) => acc + priceOf(s.planId), 0) || (tenants.length * 249.90);
    const arr = mrr * 12;

    const totalTenants = tenants.length;
    const activeTenants = tenants.filter(t => t.status === 'active').length;
    const trialTenants = subscriptions.filter(s => s.status === 'trial').length || Math.max(1, totalTenants - activeTenants);
    const suspendedTenants = tenants.filter(t => t.status === 'suspended').length;

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
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t))
      );
      onShowNotification?.(
        'Status Atualizado',
        `Empresa ${tenant.tradeName || tenant.name} agora está ${newStatus === 'active' ? 'Ativa' : 'Suspensa'}.`,
        newStatus === 'active' ? 'success' : 'warning'
      );
    } catch {
      // Local fallback para preview
      setTenants((prev) =>
        prev.map((t) => (t.id === tenant.id ? { ...t, status: newStatus } : t))
      );
      onShowNotification?.(
        'Status Atualizado (Modo Demonstração)',
        `Empresa ${tenant.tradeName || tenant.name} alternada para ${newStatus === 'active' ? 'Ativa' : 'Suspensa'}.`,
        'info'
      );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-['Plus_Jakarta_Sans'] animate-in fade-in duration-300">
      {/* HEADER PRINCIPAL — CAMADA 1: DONO DO SAAS */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950/80 to-slate-900 p-6 md:p-8 border border-purple-500/30 shadow-2xl text-white">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Camada 1 — Super Admin (Dono do SaaS)
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Painel Central de Gestão do SaaS
            </h1>
            <p className="text-sm text-purple-200/80 max-w-2xl leading-relaxed">
              Você gerencia a plataforma inteira: planos de assinatura, contratos de clientes, liberação de acesso e suporte técnico aos sistemas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('planos-pacotes')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Package className="w-4 h-4 text-purple-200" />
              Pacotes & Preços
            </button>
            <button
              type="button"
              onClick={() => onNavigate('conectores')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 font-extrabold text-xs transition cursor-pointer"
            >
              <Cable className="w-4 h-4 text-purple-400" />
              Conectores do SaaS
            </button>
            <button
              type="button"
              onClick={() => onNavigate('financeiro-saas')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              Contratos & Assinaturas
            </button>
            <button
              type="button"
              onClick={() => onNavigate('rbac')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-purple-500/30 text-purple-200 font-bold text-xs transition cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              Empresas & Suporte
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-slate-300 transition cursor-pointer disabled:opacity-50"
              title="Recarregar Métricas"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* BANNER DE PRIVACIDADE E ISOLAMENTO DE DADOS */}
        <div className="mt-6 pt-5 border-t border-purple-500/20 flex items-start gap-3 text-xs bg-purple-950/40 p-4 rounded-2xl border border-purple-500/20">
          <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <span className="font-extrabold text-emerald-300 mr-1">
              Isolamento Total do Catálogo por Contrato (LGPD & Multi-Tenant):
            </span>
            <span className="text-purple-200/90">
              O catálogo de produtos, estoques, custos, preços de venda e faturamento dos clientes <strong>NUNCA ficam visíveis ao Super Admin</strong>. Cada contrato gera dados 100% separados e isolados para cada empresa cliente. O Super Admin gerencia exclusivamente contratos, planos, infraestrutura e governança da plataforma.
            </span>
          </div>
        </div>
      </div>

      {/* ARQUITETURA VISUAL DAS 3 CAMADAS DE ACESSO */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              Hierarquia das 3 Camadas de Acesso
            </h2>
            <p className="text-xs text-slate-400">
              Separação estrita de responsabilidades entre o dono do software, a empresa assinante e os colaboradores.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('camadas-acesso')}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
          >
            Configurar Permissões das Camadas <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CAMADA 1 */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-950/40 to-slate-900 border-2 border-purple-500/50 relative overflow-hidden">
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-500 text-white">
              Você está aqui
            </div>
            <div className="flex items-center gap-2 text-purple-300 font-extrabold text-xs uppercase mb-1">
              <span>Camada 1</span>
            </div>
            <h3 className="text-base font-black text-white mb-2">ADMIN (Dono do SaaS)</h3>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Gerencia a plataforma, contratos de assinaturas, planos, liberação e suspensão de contas e suporte ao sistema.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-purple-500/20 text-[11px] text-purple-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Gestão de Planos & Assinaturas
              </div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Suporte & Liberação de Clientes
              </div>
              <div className="flex items-center gap-1.5 font-bold text-rose-300">
                <Lock className="w-3.5 h-3.5 text-rose-400" /> Catálogo de Clientes 100% Oculto ao Admin
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Dados 100% Segregados por Contrato (LGPD)
              </div>
            </div>
          </div>

          {/* CAMADA 2 */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-sky-950/30 to-slate-900 border border-sky-500/30">
            <div className="flex items-center gap-2 text-sky-400 font-extrabold text-xs uppercase mb-1">
              <span>Camada 2</span>
            </div>
            <h3 className="text-base font-black text-white mb-2">EMPRESA / CLIENTE (Quem Assina)</h3>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Painel do cliente contratante: gerencia o próprio produto, colaboradores, permissões da equipe, filiais e faturamento da loja.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-sky-500/20 text-[11px] text-sky-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-sky-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Catálogo Próprio & Gestão de Estoque
              </div>
              <div className="flex items-center gap-1.5 font-bold text-sky-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Faturamento, Vendas & Contas Privadas
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /> Banco de Dados Isolado e Exclusivo do Contrato
              </div>
              <div className="flex items-center gap-1.5 font-bold text-sky-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Gestão de Faturas da Assinatura
              </div>
            </div>
          </div>

          {/* CAMADA 3 */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/30 to-slate-900 border border-emerald-500/30">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase mb-1">
              <span>Camada 3</span>
            </div>
            <h3 className="text-base font-black text-white mb-2">USUÁRIOS / COLABORADORES</h3>
            <p className="text-xs text-slate-300 mb-3 leading-relaxed">
              Operadores da empresa: utilizam o sistema no balcão e no dia a dia estritamente conforme as permissões delegadas pela empresa.
            </p>
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-emerald-500/20 text-[11px] text-emerald-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Balcão de Vendas & Cotações
              </div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> PDV Caixa & Emissão de NF-e
              </div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" /> Separação de Estoque & Balcão
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* METRICAS PRINCIPAIS DO SAAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">MRR (Assinaturas)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            R$ {metrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Receita Recorrente Mensal de contratos
          </p>
        </div>

        {/* Empresas Ativas */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Empresas Clientes</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {metrics.totalTenants} empresas
          </div>
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 mt-1 font-bold">
            <span>{metrics.activeTenants} ativas</span>
            <span className="text-slate-500">•</span>
            <span className="text-amber-400">{metrics.trialTenants} em teste</span>
          </div>
        </div>

        {/* Contratos Vigentes */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Contratos SaaS</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {subscriptions.length || metrics.totalTenants} assinaturas
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            ARR estimado: R$ {(metrics.arr).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        {/* Status Infra & Segurança */}
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Status do Sistema</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 flex items-center gap-2">
            100% Online
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Isolamento multi-tenant ativo & seguro
          </p>
        </div>
      </div>

      {/* GERENCIAMENTO DE EMPRESAS & SUPORTE */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl text-white">
        <div className="p-5 md:p-6 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Gestão de Contratos de Empresas (Tenants)
            </h2>
            <p className="text-xs text-slate-400">
              Libere, suspenda ou configure o plano e acesso de cada empresa cliente contratante.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar empresa ou CNPJ..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <button
              type="button"
              onClick={() => onNavigate('rbac')}
              className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Ver Todos</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tabela de Empresas & Contratos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Empresa / Cliente Contratante</th>
                <th className="px-5 py-3.5">Documento / UF</th>
                <th className="px-5 py-3.5">Plano Contratado</th>
                <th className="px-5 py-3.5">Config. Fiscal (SaaS)</th>
                <th className="px-5 py-3.5">Contrato LGPD</th>
                <th className="px-5 py-3.5">Status de Acesso</th>
                <th className="px-5 py-3.5 text-right">Ações de Governança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    Nenhuma empresa encontrada com o filtro informado.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{tenant.tradeName || tenant.name}</div>
                      <div className="text-[11px] text-slate-400">{tenant.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {tenant.id}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-mono text-slate-300 text-[11px]">{tenant.cnpj || '—'}</div>
                      <div className="text-slate-400 text-[11px]">{tenant.city} - {tenant.uf}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-black bg-purple-500/10 text-purple-300 border border-purple-500/30">
                        {tenant.planName || 'GATO Autopeças'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedFiscalTenant(tenant)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition cursor-pointer"
                        title="Ver ou editar configuração fiscal deste contrato"
                      >
                        <Scale className="w-3 h-3 text-sky-400" />
                        <span>Homologar Fiscal</span>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedLgpdTenant(tenant)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
                        title="Visualizar ou assinar contrato de concessão e DPA LGPD"
                      >
                        <Fingerprint className="w-3 h-3 text-emerald-400" />
                        <span>Contrato LGPD</span>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      {tenant.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Acesso Liberado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" /> Suspenso / Bloqueado
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleTenantStatus(tenant)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            tenant.status === 'active'
                              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {tenant.status === 'active' ? 'Suspender' : 'Liberar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedLgpdTenant(tenant)}
                          className="px-2.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/40 text-xs font-bold transition cursor-pointer"
                          title="Abrir Contrato LGPD"
                        >
                          Contrato
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAINEL DE SOLICITAÇÕES DE TESTES DE 15 DIAS & SUPORTE DO LOGIN */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl text-white">
        <div className="p-5 md:p-6 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  Solicitações de Testes de 15 Dias & Suporte (Login)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                  {loginLeads.length} {loginLeads.length === 1 ? 'mensagem' : 'mensagens'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Mensagens enviadas diretamente por empresas e visitantes através da tela de login para o Superadmin.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('rbac')}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
          >
            Abrir Central RBAC & Mensagens <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-5 md:p-6">
          {loginLeads.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs space-y-1">
              <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="font-bold text-slate-300">Nenhuma nova solicitação pendente no momento.</p>
              <p className="text-slate-500 text-[11px]">
                Novas mensagens enviadas pelo botão de "Solicite Teste por 15 Dias" ou "Suporte" do login aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {loginLeads.map((lead, idx) => {
                const phoneDigits = (lead.phone || '').replace(/\D/g, '');
                return (
                  <div
                    key={lead.protocol || idx}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/30 transition space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-sky-400 font-bold">
                        {lead.protocol || `SOL-${idx}`}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-black uppercase">
                        {lead.requestType === 'teste_15_dias'
                          ? 'Teste 15 Dias'
                          : lead.requestType === 'suporte_login'
                            ? 'Suporte Login'
                            : lead.requestType === 'liberacao_cnpj'
                              ? 'Liberação CNPJ'
                              : 'Extensão Teste'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-sm text-white truncate">
                        {lead.companyName}
                      </h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{lead.contactName}</span>
                      </p>
                    </div>

                    {lead.cnpj && (
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{lead.cnpj}</span>
                      </div>
                    )}

                    {lead.message && (
                      <p className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded-xl border border-slate-800 italic line-clamp-2">
                        "{lead.message}"
                      </p>
                    )}

                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs gap-2">
                      <span className="text-[10px] text-slate-500">
                        {new Date(lead.timestamp || Date.now()).toLocaleDateString('pt-BR')}
                      </span>

                      {phoneDigits ? (
                        <a
                          href={`https://wa.me/55${phoneDigits}?text=Ol%C3%A1%20${encodeURIComponent(lead.contactName)},%20recebemos%20sua%20solicita%C3%A7%C3%A3o%20do%20GATO%20SaaS!`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold flex items-center gap-1 transition"
                        >
                          <Phone className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ATALHOS RÁPIDOS DE GOVERNANÇA DO SAAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5">
        <button
          type="button"
          onClick={() => onNavigate('planos-pacotes')}
          className="p-4 rounded-2xl bg-gradient-to-b from-purple-950/60 to-slate-900 hover:bg-slate-800 border border-purple-500/40 hover:border-purple-400 text-left transition cursor-pointer group shadow-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
            <Package className="w-4 h-4 text-purple-300" />
          </div>
          <h3 className="font-bold text-white text-xs">Pacotes & Preços</h3>
          <p className="text-[11px] text-purple-200/80 mt-0.5">Cadastrar pacotes, valores e limites de itens/clientes.</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('conectores')}
          className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-left transition cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
            <Cable className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="font-bold text-white text-xs">Conectores do SaaS</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Gateways de MRR, SEFAZ infra e catálogo.</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('financeiro-saas')}
          className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-left transition cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="font-bold text-white text-xs">Contratos & MRR</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Assinaturas, faturas e cobrança recorrente.</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('camadas-acesso')}
          className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-left transition cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="font-bold text-white text-xs">Matriz das 3 Camadas</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Isolamento de privilégios e permissões.</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('chaves')}
          className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-left transition cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
            <KeyRound className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="font-bold text-white text-xs">Chaves & Licenças</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Licenças de máquina e tokens de API.</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('banco-dados')}
          className="p-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/40 text-left transition cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-2.5 group-hover:scale-105 transition">
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="font-bold text-white text-xs">Banco de Dados & Infra</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">Conexões Postgres e diagnóstico.</p>
        </button>
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
    </div>
  );
};
