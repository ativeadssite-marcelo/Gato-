// =========================================================================
// ASSINATURA & FATURAS — Painel do Tenant
// =========================================================================
// Consome as APIs de billing (/api/billing/*) para exibir o plano, o status da
// assinatura e a lista de faturas, além de permitir assinar (converter trial)
// e cancelar. A identidade e o tenant vêm do token de sessão (servidor).
// =========================================================================

import { useEffect, useState } from 'react';
import {
  CreditCard,
  ReceiptText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  CalendarClock,
  Link as LinkIcon,
  Ban,
} from 'lucide-react';
import { apiJson } from '../services/apiClient';
import type { Invoice, TenantSubscription } from '../types/billing';

interface Props {
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

const STATUS_LABEL: Record<string, string> = {
  trial: 'Teste grátis',
  active: 'Ativa',
  past_due: 'Em atraso',
  suspended: 'Suspensa',
  canceled: 'Cancelada',
  expired: 'Expirada',
};

const STATUS_COLOR: Record<string, string> = {
  trial: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  past_due: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  suspended: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  canceled: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  expired: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
};

function formatBrl(v: number): string {
  return `R$ ${v.toFixed(2).replace('.', ',')}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const AssinaturaFaturas: React.FC<Props> = ({ onShowNotification }) => {
  const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sub, invs] = await Promise.all([
        apiJson<{ success: boolean; subscription: TenantSubscription | null }>('/api/billing/subscription'),
        apiJson<{ success: boolean; invoices: Invoice[] }>('/api/billing/invoices'),
      ]);
      setSubscription(sub.subscription);
      setInvoices(invs.invoices || []);
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar os dados de assinatura.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubscribe = async () => {
    setActionLoading('subscribe');
    try {
      const res = await apiJson<any>('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingType: 'PIX' }),
      });
      onShowNotification?.('Assinatura ativada', res.message || 'Assinatura criada com sucesso.', 'success');
      await load();
    } catch (e: any) {
      onShowNotification?.('Falha na assinatura', e?.message || 'Não foi possível concluir.', 'warning');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancelar a assinatura? O acesso será bloqueado ao fim do ciclo.')) return;
    setActionLoading('cancel');
    try {
      const res = await apiJson<any>('/api/billing/cancel', { method: 'POST' });
      onShowNotification?.('Assinatura cancelada', res.message || 'Assinatura cancelada.', 'info');
      await load();
    } catch (e: any) {
      onShowNotification?.('Falha no cancelamento', e?.message || 'Não foi possível cancelar.', 'warning');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando assinatura…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Assinatura & Faturas</h2>
          <p className="text-sm text-slate-400">Plano, status e cobranças da sua conta GATO.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}

      {/* Cartão da assinatura */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">Plano atual</p>
            <p className="text-2xl font-bold text-white mt-1">
              {subscription?.planName || 'GATO Starter (Essencial)'}
            </p>
          </div>
          {subscription?.status && (
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${STATUS_COLOR[subscription.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'}`}>
              {STATUS_LABEL[subscription.status] || subscription.status}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {subscription?.trialEndsAt && (
            <div className="flex items-center gap-2 text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
              <Sparkles className="w-4 h-4 shrink-0" /> Teste grátis até {formatDate(subscription.trialEndsAt)}
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 border border-slate-700/40 rounded-xl px-3 py-2.5">
            <CalendarClock className="w-4 h-4 shrink-0 text-slate-400" /> Próxima cobrança: {formatDate(subscription?.currentPeriodEndsAt)}
          </div>
        </div>

        {subscription?.status === 'trial' || subscription?.status === 'expired' ? (
          <button
            onClick={handleSubscribe}
            disabled={actionLoading === 'subscribe'}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 cursor-pointer transition-colors shadow-lg shadow-orange-600/25"
          >
            {actionLoading === 'subscribe' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Ativar assinatura (Pix)
          </button>
        ) : (
          subscription?.status === 'active' && (
            <button
              onClick={handleCancel}
              disabled={actionLoading === 'cancel'}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-60 cursor-pointer transition-colors"
            >
              {actionLoading === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
              Cancelar assinatura
            </button>
          )
        )}
      </div>

      {/* Faturas */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center gap-2">
          <ReceiptText className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-white">Faturas</h3>
          <span className="text-xs text-slate-500 ml-1">({invoices.length})</span>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">Nenhuma fatura emitida até o momento.</div>
        ) : (
          <ul className="divide-y divide-slate-800/70">
            {invoices.map((inv) => (
              <li key={inv.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-white font-semibold">{formatBrl(inv.amount)}</p>
                  <p className="text-xs text-slate-500">
                    Vencimento {formatDate(inv.dueDate)} · {inv.currency}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    inv.status === 'paid' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : inv.status === 'overdue' ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    {inv.status === 'paid' ? 'Paga' : inv.status === 'overdue' ? 'Vencida' : 'Em aberto'}
                  </span>
                  {inv.paymentLink && (
                    <a
                      href={inv.paymentLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-orange-400 hover:text-orange-300"
                    >
                      <LinkIcon className="w-3.5 h-3.5" /> Pagar
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
