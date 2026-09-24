import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  HardDrive,
  RefreshCw,
  X,
  Copy,
  Check,
  ShieldAlert,
  AlertTriangle,
  Trash2,
  RotateCw,
  Unlink,
  Gauge,
  TriangleAlert,
} from 'lucide-react';
import type { UserSession } from '../types';
import type { TenantPermissionDefinition, TenantPermissionKey } from '../types/rbac';
import type { CredentialView } from '../types/credentials';
import { apiJson } from '../services/apiClient';
import { TenantPermissionMatrix } from './TenantPermissionMatrix';

/**
 * "Chaves & Integrações" — o contratante gera e gerencia as credenciais de
 * integração da própria empresa (chave de API + licença de máquina), e o
 * dono/SaaS pode ver e rotacionar em nome de um cliente, para suporte.
 *
 * O segredo aparece UMA VEZ, no modal de revelação, logo após gerar/rotacionar.
 * Não há como recuperá-lo depois — só rotacionar de novo.
 */

interface ChavesIntegracoesProps {
  userSession?: UserSession | null;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

interface CredentialsResponse {
  success: boolean;
  tenantId: string;
  tenantName: string;
  apiKey: CredentialView | null;
  license: CredentialView | null;
  catalog: TenantPermissionDefinition[];
  groups: Array<{ id: TenantPermissionDefinition['group']; name: string }>;
}

interface TenantOption {
  id: string;
  name: string;
}

/** Baseline sugerido ao gerar a chave: cobre a superfície inicial da API v1. */
const DEFAULT_CAPABILITIES: TenantPermissionKey[] = ['sales', 'customer_register', 'item_register'];

export const ChavesIntegracoes: React.FC<ChavesIntegracoesProps> = ({
  userSession,
  onShowNotification,
}) => {
  const [data, setData] = useState<CredentialsResponse | null>(null);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  /** Segredo exibido uma única vez, junto do que ele é. */
  const [reveal, setReveal] = useState<{ secret: string; label: string; isRotation: boolean } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [draftCapabilities, setDraftCapabilities] = useState<TenantPermissionKey[]>(DEFAULT_CAPABILITIES);
  const [draftLabel, setDraftLabel] = useState('');

  const isSaasScope = !!userSession?.isSaasScope;

  const notify = (title: string, message: string, type: 'success' | 'warning' | 'info' = 'success') =>
    onShowNotification?.(title, message, type);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2500);
  };

  // O dono/SaaS precisa escolher de qual cliente está cuidando.
  useEffect(() => {
    if (!isSaasScope) return;
    apiJson<{ success: boolean; tenants: TenantOption[] }>('/api/rbac/tenants')
      .then((res) => {
        if (!res.success) return;
        setTenants(res.tenants);
        setSelectedTenantId((current) => current || res.tenants[0]?.id || '');
      })
      .catch(() => notify('Falha ao listar clientes', 'Não foi possível carregar a carteira.', 'warning'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSaasScope, userSession?.id]);

  const load = async () => {
    if (isSaasScope && !selectedTenantId) return;
    try {
      setLoading(true);
      const query = isSaasScope ? `?tenantId=${encodeURIComponent(selectedTenantId)}` : '';
      const res = await apiJson<CredentialsResponse>(`/api/credentials${query}`);
      if (res.success) setData(res);
    } catch (err: any) {
      notify('Falha ao carregar credenciais', err?.message || 'Erro inesperado.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId, userSession?.id]);

  const targetQuery = isSaasScope && selectedTenantId ? { tenantId: selectedTenantId } : {};

  const issue = async (kind: 'api-key' | 'license-key', body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await apiJson<{ success: boolean; secret: string; message: string }>(
        `/api/credentials/${kind}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, ...targetQuery }),
        },
      );
      setReveal({
        secret: res.secret,
        label: kind === 'api-key' ? 'Chave de API' : 'Licença de máquina',
        isRotation: kind === 'api-key' ? !!data?.apiKey : !!data?.license,
      });
      setIsMatrixOpen(false);
      await load();
    } catch (err: any) {
      notify('Não foi possível gerar', err?.message || 'Erro inesperado.', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (kind: 'api-key' | 'license-key') => {
    setBusy(true);
    try {
      await apiJson(`/api/credentials/${kind}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetQuery),
      });
      notify('Credencial revogada', 'O acesso por essa credencial foi encerrado.');
      await load();
    } catch (err: any) {
      notify('Não foi possível revogar', err?.message || 'Erro inesperado.', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const unbindMachine = async () => {
    setBusy(true);
    try {
      await apiJson('/api/credentials/license-key/activation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetQuery),
      });
      notify('Máquina desvinculada', 'A licença pode ser ativada em outra máquina.');
      await load();
    } catch (err: any) {
      notify('Não foi possível desvincular', err?.message || 'Erro inesperado.', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const apiKey = data?.apiKey;
  const license = data?.license;

  const capabilityNames = useMemo(() => {
    const map = new Map<string, string>();
    (data?.catalog || []).forEach((p) => map.set(p.key, p.name));
    return map;
  }, [data?.catalog]);

  const usagePercent = apiKey?.apiUsage && apiKey.apiUsage.limit > 0
    ? Math.min(100, (apiKey.apiUsage.used / apiKey.apiUsage.limit) * 100)
    : 0;

  const Card: React.FC<{ children: React.ReactNode; icon: React.ReactNode; title: string; subtitle: string }> = ({
    children,
    icon,
    title,
    subtitle,
  }) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-400 shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );

  const StatusPill: React.FC<{ active: boolean }> = ({ active }) => (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
        active
          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
          : 'bg-slate-800 text-slate-400 border-slate-700'
      }`}
    >
      {active ? 'ATIVA' : 'REVOGADA'}
    </span>
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Cabeçalho */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 border border-indigo-500/40 rounded-xl text-indigo-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Chaves &amp; Integrações</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Credenciais para o seu ERP/PDV conversar com o GATO e para licenciar o aplicativo de máquina.
            </p>
          </div>
        </div>

        {isSaasScope && (
          <div>
            <label className="text-[11px] text-slate-400 block font-medium mb-1">Cliente</label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer min-w-[220px]"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex items-center justify-center gap-2 text-xs text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin" /> Carregando credenciais...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ---------------- CHAVE DE API ---------------- */}
          <Card
            icon={<KeyRound className="w-5 h-5" />}
            title="Chave de API"
            subtitle="Dá acesso à API de integração (/api/v1) para o seu ERP ou PDV."
          >
            {apiKey ? (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-slate-200 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
                    {apiKey.keyPrefix}…{apiKey.keyLast4}
                  </span>
                  <StatusPill active={apiKey.active} />
                </div>

                <div className="text-[11px] text-slate-400 space-y-0.5">
                  <p>
                    Rótulo: <span className="text-slate-300">{apiKey.label}</span>
                  </p>
                  <p>Criada em {apiKey.createdAt.slice(0, 10)}</p>
                  {apiKey.rotatedAt && <p>Rotacionada em {apiKey.rotatedAt.slice(0, 10)}</p>}
                  <p>
                    Último uso:{' '}
                    <span className="text-slate-300">
                      {apiKey.lastUsedAt ? apiKey.lastUsedAt.slice(0, 16).replace('T', ' ') : 'nunca usada'}
                    </span>
                  </p>
                </div>

                {/* Capacidades da chave */}
                <div>
                  <span className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                    Pode fazer ({apiKey.capabilities.length})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {apiKey.capabilities.map((c) => (
                      <span
                        key={c}
                        className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                      >
                        {capabilityNames.get(c) || c}
                      </span>
                    ))}
                    {apiKey.capabilities.length === 0 && (
                      <span className="text-[10px] text-amber-300">
                        Nenhuma capacidade: esta chave não consegue chamar nada.
                      </span>
                    )}
                  </div>
                </div>

                {/* Cota do dia */}
                {apiKey.apiUsage && (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-indigo-400" /> Cota de hoje
                      </span>
                      <span className="font-mono text-slate-400">
                        {apiKey.apiUsage.used.toLocaleString()} / {apiKey.apiUsage.limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          usagePercent >= 90 ? 'bg-amber-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${usagePercent}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1.5">
                      Renova automaticamente na virada do dia. Limite definido pelo plano.
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setDraftCapabilities(
                        apiKey.capabilities.length > 0 ? [...apiKey.capabilities] : DEFAULT_CAPABILITIES,
                      );
                      setDraftLabel(apiKey.label);
                      setIsMatrixOpen(true);
                    }}
                    disabled={busy}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> Rotacionar
                  </button>
                  <button
                    onClick={() => revoke('api-key')}
                    disabled={busy || !apiKey.active}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Revogar
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => {
                  setDraftCapabilities(DEFAULT_CAPABILITIES);
                  setDraftLabel('Integração ERP/PDV');
                  setIsMatrixOpen(true);
                }}
                disabled={busy}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Gerar chave de API
              </button>
            )}
          </Card>

          {/* ---------------- LICENÇA DE MÁQUINA ---------------- */}
          <Card
            icon={<HardDrive className="w-5 h-5" />}
            title="Licença de máquina"
            subtitle="Libera o aplicativo instalado em um posto. Uma máquina ativa por vez."
          >
            {license ? (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-slate-200 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
                    {license.keyPrefix}…{license.keyLast4}
                  </span>
                  <StatusPill active={license.active} />
                </div>

                {license.activation ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] space-y-0.5">
                    <span className="text-slate-300 font-semibold block">
                      {license.activation.machineLabel || 'Máquina sem rótulo'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 block break-all">
                      {license.activation.machineId}
                    </span>
                    <span className="text-slate-500 block">
                      Ativada em {license.activation.activatedAt.slice(0, 16).replace('T', ' ')}
                    </span>
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400">
                    {license.active
                      ? 'Nenhuma máquina ativada ainda. O aplicativo ativa ao informar esta licença.'
                      : 'Licença revogada. Gere uma nova para voltar a ativar.'}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => issue('license-key', {})}
                    disabled={busy}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3.5 h-3.5" /> {license.active ? 'Rotacionar' : 'Gerar nova'}
                  </button>
                  <button
                    onClick={unbindMachine}
                    disabled={busy || !license.activation}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5"
                    title="Libera o posto para ativar em outra máquina, sem trocar a licença"
                  >
                    <Unlink className="w-3.5 h-3.5" /> Desvincular máquina
                  </button>
                  <button
                    onClick={() => revoke('license-key')}
                    disabled={busy || !license.active}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Revogar
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => issue('license-key', {})}
                disabled={busy}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                Gerar licença de máquina
              </button>
            )}
          </Card>
        </div>
      )}

      {/* Nota honesta sobre o alcance do vínculo de máquina */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-start gap-2.5">
        <TriangleAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          O vínculo usa o identificador que o próprio aplicativo informa. Isso evita o uso em várias
          máquinas ao mesmo tempo no dia a dia, mas não é uma barreira à prova de adulteração — a
          proteção forte é a rotação e a revogação, que cortam o acesso na hora.
        </p>
      </div>

      {/* Modal: revelação única do segredo */}
      {reveal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                {reveal.isRotation ? 'Nova' : ''} {reveal.label} — copie agora
              </h3>
              <button onClick={() => setReveal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-[11px] text-amber-200 leading-relaxed">
                Este é o único momento em que o segredo aparece. Guarde-o em local seguro — depois só
                é possível rotacionar de novo
                {reveal.isRotation ? ', e o segredo anterior já não funciona' : ''}.
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-xl p-3">
              <code className="font-mono text-[11px] text-emerald-300 break-all flex-1">{reveal.secret}</code>
              <button
                onClick={() => handleCopy(reveal.secret, 'reveal')}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0"
              >
                {copied === 'reveal' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied === 'reveal' ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setReveal(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
              >
                Já guardei o segredo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: capacidades da chave (matriz compartilhada) */}
      {isMatrixOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-400" />
                {apiKey ? 'Rotacionar chave de API' : 'Gerar chave de API'}
              </h3>
              <button onClick={() => setIsMatrixOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {data && (
              <TenantPermissionMatrix
                catalog={data.catalog}
                groups={data.groups}
                selected={draftCapabilities}
                onChange={setDraftCapabilities}
                disabled={busy}
              />
            )}

            <div>
              <label className="text-slate-300 block font-semibold mb-1 text-xs">Rótulo da chave</label>
              <input
                type="text"
                value={draftLabel}
                onChange={(e) => setDraftLabel(e.target.value)}
                placeholder="Ex: Integração ERP"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsMatrixOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => issue('api-key', { capabilities: draftCapabilities, label: draftLabel })}
                disabled={busy || draftCapabilities.length === 0}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
              >
                {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {apiKey ? 'Rotacionar chave' : 'Gerar chave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
