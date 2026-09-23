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
      setData(res);
      if (!selectedCode && res.roles) {
        const first = Object.keys(res.roles)[0];
        setSelectedCode(first);
      }
    } catch (e: any) {
      onShowNotification?.('Falha ao carregar', e?.message || 'Não foi possível carregar as camadas.', 'warning');
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
    if (ov) for (const k of Object.keys(ov)) merged[k] = ov[k as PermissionResource];
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
      setData((prev) => (prev ? { ...prev, overrides: res.overrides } : prev));
      onShowNotification?.('Acessos atualizados', res.message || 'Camada atualizada com sucesso.', 'success');
    } catch (e: any) {
      onShowNotification?.('Falha ao salvar', e?.message || 'Não foi possível salvar.', 'warning');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    if (!selectedCode) return;
    setBusy(true);
    try {
      const res = await apiJson<any>(`/api/rbac/role-overrides/${selectedCode}`, { method: 'DELETE' });
      setData((prev) => (prev ? { ...prev, overrides: res.overrides } : prev));
      if (data?.roles?.[selectedCode]) {
        setDraft({ ...data.roles[selectedCode].permissions });
      }
      onShowNotification?.('Padrão restaurado', res.message || 'Camada voltou ao padrão.', 'info');
    } catch (e: any) {
      onShowNotification?.('Falha', e?.message || 'Não foi possível restaurar.', 'warning');
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
