// =========================================================================
// DASHBOARD FINANCEIRO SaaS — Super Admin
// =========================================================================
// MRR, ARR, Churn, Inadimplência e Trials ativos, calculados a partir das
// assinaturas e faturas reais (API /api/billing/admin/*). Restrito à equipe
// da plataforma com permissão de billing (super_admin / saas_financeiro).
// =========================================================================

import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  Sparkles,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { apiJson } from '../services/apiClient';
import type { Invoice, TenantSubscription } from '../types/billing';

interface PlanInfo {
  id: string;
  name: string;
  priceMonthly: number;
}

function formatBrl(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

const STATUS_LABEL: Record<string, string> = {
  trial: 'Trial',
  active: 'Ativa',
  past_due: 'Em atraso',
  suspended: 'Suspensa',
  canceled: 'Cancelada',
  expired: 'Expirada',
};

export const DashboardFinanceiroSaaS: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<TenantSubscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [subs, invs, planRes] = await Promise.all([
          apiJson<{ success: boolean; subscriptions: TenantSubscription[] }>('/api/billing/admin/subscriptions'),
          apiJson<{ success: boolean; invoices: Invoice[] }>('/api/billing/admin/invoices'),
          apiJson<{ success: boolean; plans: PlanInfo[] }>('/api/rbac/plans'),
        ]);
        setSubscriptions(subs.subscriptions || []);
        setInvoices(invs.invoices || []);
        setPlans(planRes.plans || []);
      } catch (e: any) {
        setError(e?.message || 'Sem permissão ou falha ao carregar o financeiro SaaS.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const metrics = useMemo(() => {
    const priceOf = (planId: string) => plans.find((p) => p.id === planId)?.priceMonthly ?? 0;

    const active = subscriptions.filter((s) => s.status === 'active');
    const mrr = active.reduce((acc, s) => acc + priceOf(s.planId), 0);
    const arr = mrr * 12;
    const churn = subscriptions.filter((s) => s.status === 'canceled').length;
    const churnRate = subscriptions.length > 0 ? (churn / subscriptions.length) * 100 : 0;
    const inadimplentes = subscriptions.filter((s) => s.status === 'past_due').length;
    const overdueInvoices = invoices.filter((i) => i.status === 'overdue').length;
    const trials = subscriptions.filter((s) => s.status === 'trial').length;

    return { mrr, arr, churn, churnRate, inadimplentes, overdueInvoices, trials };
  }, [subscriptions, invoices, plans]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando financeiro SaaS…
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-200 text-sm flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" /> {error}
      </div>
    );
  }

  const kpis = [
    { label: 'MRR', value: formatBrl(metrics.mrr), icon: DollarSign, tone: 'text-emerald-400' },
    { label: 'ARR', value: formatBrl(metrics.arr), icon: TrendingUp, tone: 'text-sky-400' },
    { label: 'Churn', value: `${metrics.churn} (${metrics.churnRate.toFixed(1)}%)`, icon: Users, tone: 'text-rose-400' },
    { label: 'Inadimplência', value: `${metrics.inadimplentes} ass. · ${metrics.overdueInvoices} faturas`, icon: AlertTriangle, tone: 'text-amber-400' },
    { label: 'Trials ativos', value: `${metrics.trials}`, icon: Sparkles, tone: 'text-violet-400' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Financeiro SaaS</h2>
          <p className="text-sm text-slate-400">MRR, Churn, Inadimplência e Trials do portfólio de tenants.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide">
                <Icon className={`w-4 h-4 ${k.tone}`} /> {k.label}
              </div>
              <p className="text-xl font-bold text-white mt-2 truncate">{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* Assinaturas */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">Assinaturas</h3>
          <span className="text-xs text-slate-500">{subscriptions.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                <th className="px-5 py-3 font-semibold">Tenant</th>
                <th className="px-5 py-3 font-semibold">Plano</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Gateway</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {subscriptions.map((s) => (
                <tr key={s.id} className="text-slate-300">
                  <td className="px-5 py-3 font-medium text-white">{s.tenantId === 'system' ? 'SaaS' : s.planName.split(' ')[0] + ' · ' + s.tenantId.slice(-6)}</td>
                  <td className="px-5 py-3">{s.planName}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      s.status === 'active' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : s.status === 'trial' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : s.status === 'past_due' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                    }`}>
                      {STATUS_LABEL[s.status] || s.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{s.gateway || '—'}</td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-500">Nenhuma assinatura registrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
