// =========================================================================
// TELA DE BLOQUEIO POR STATUS DA ASSINATURA — GATO SaaS
// =========================================================================
// Renderizada quando o tenant autenticado está com a assinatura expirada,
// suspensa ou cancelada (o middleware já bloqueia as APIs no servidor; esta
// tela é a contraparte de UX). Oferece reativação self-service para o
// administrador do tenant (papel com billing) e saída segura da sessão.
// =========================================================================

import { useState } from 'react';
import { AlertOctagon, CheckCircle2, Loader2, LogOut, RotateCcw } from 'lucide-react';
import { apiJson } from '../services/apiClient';
import type { SubscriptionStatus } from '../types/billing';

interface Props {
  status: Extract<SubscriptionStatus, 'expired' | 'suspended' | 'canceled'>;
  planName?: string;
  /** true quando o usuário pode assinar/reativar (admin do tenant). */
  canManageBilling: boolean;
  onLogout: () => void;
  onReactivated: () => void;
}

const COPY: Record<Props['status'], { title: string; message: string }> = {
  expired: {
    title: 'Sua assinatura expirou',
    message:
      'Seu período de teste chegou ao fim. Renove o plano para voltar a usar o GATO com todos os recursos.',
  },
  suspended: {
    title: 'Assinatura suspensa',
    message:
      'Sua assinatura está suspensa por pendência de pagamento. Regularize para liberar o acesso novamente.',
  },
  canceled: {
    title: 'Assinatura cancelada',
    message:
      'Sua assinatura foi cancelada. Reative o plano para voltar a usar o GATO.',
  },
};

export const SubscriptionBlockedScreen: React.FC<Props> = ({
  status,
  planName,
  canManageBilling,
  onLogout,
  onReactivated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[status];

  const handleReactivate = async () => {
    setLoading(true);
    setError(null);
    try {
      await apiJson<any>('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingType: 'PIX' }),
      });
      onReactivated();
    } catch (e: any) {
      setError(e?.message || 'Não foi possível reativar a assinatura. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-['Plus_Jakarta_Sans'] antialiased flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center shadow-2xl shadow-black/40">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
          <AlertOctagon className="w-7 h-7 text-rose-400" />
        </div>

        <h1 className="mt-6 text-2xl font-extrabold text-white">{copy.title}</h1>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">{copy.message}</p>

        {planName && (
          <p className="mt-4 text-xs uppercase tracking-wider text-slate-500">
            Plano: <span className="text-slate-300 font-semibold">{planName}</span>
          </p>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200 text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-3">
          {canManageBilling ? (
            <button
              onClick={handleReactivate}
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 px-4 py-3 text-sm font-semibold text-white hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 cursor-pointer transition-colors shadow-lg shadow-orange-600/25"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              {loading ? 'Reativando…' : 'Reativar assinatura (Pix)'}
            </button>
          ) : (
            <div className="rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 text-sm text-slate-300">
              <CheckCircle2 className="w-4 h-4 inline-block mr-1.5 text-slate-400" />
              Entre em contato com o administrador da sua empresa para reativar a
              conta.
            </div>
          )}

          <button
            onClick={onLogout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
};
