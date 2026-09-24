import React from 'react';
import { Check, Sparkles, AlertTriangle } from 'lucide-react';
import type { TenantPermissionDefinition, TenantPermissionKey } from '../types/rbac';

/**
 * Matriz de capacidades operacionais do tenant — o "construtor flexível".
 *
 * Compartilhada entre a tela do admin do tenant (EquipeAcessos) e o modal de
 * usuários da governança SaaS (AdminRbacMultiTenant), para não duplicar os
 * grupos e os presets.
 *
 * O catálogo e os grupos vêm SEMPRE do servidor
 * (`GET /api/rbac/tenant-permissions`) — nada é fixado aqui.
 */

export interface TenantPermissionPreset {
  id: string;
  name: string;
  keys: TenantPermissionKey[];
}

/** Atalhos de preenchimento. Não substituem o catálogo: só marcam caixas. */
export const TENANT_PERMISSION_PRESETS: TenantPermissionPreset[] = [
  { id: 'vendedor', name: 'Vendedor', keys: ['sales', 'customer_register', 'invoicing'] },
  { id: 'caixa', name: 'Caixa', keys: ['sales', 'invoice_issuance', 'payment_machines'] },
  {
    id: 'estoque',
    name: 'Estoque',
    keys: ['stock_inbound', 'stock_picking', 'stock_location', 'item_register'],
  },
  {
    id: 'administrativo',
    name: 'Administrativo',
    keys: ['customer_register', 'invoicing', 'accounting_config'],
  },
  {
    id: 'gerente',
    name: 'Gerente',
    keys: [
      'sales',
      'customer_register',
      'invoicing',
      'invoice_issuance',
      'payment_machines',
      'stock_inbound',
      'stock_picking',
      'stock_location',
      'item_register',
      'accounting_config',
      'pricing_discounts',
      'margin_reports',
      'marketplace',
    ],
  },
  { id: 'nenhum', name: 'Limpar tudo', keys: [] },
];

interface TenantPermissionMatrixProps {
  catalog: TenantPermissionDefinition[];
  groups: Array<{ id: TenantPermissionDefinition['group']; name: string }>;
  selected: TenantPermissionKey[];
  onChange: (next: TenantPermissionKey[]) => void;
  disabled?: boolean;
}

export const TenantPermissionMatrix: React.FC<TenantPermissionMatrixProps> = ({
  catalog,
  groups,
  selected,
  onChange,
  disabled = false,
}) => {
  const selectedSet = new Set(selected);

  const toggle = (key: TenantPermissionKey) => {
    if (disabled) return;
    onChange(selectedSet.has(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  };

  const applyPreset = (preset: TenantPermissionPreset) => {
    if (disabled) return;
    onChange([...preset.keys]);
  };

  const isPresetActive = (preset: TenantPermissionPreset) =>
    preset.keys.length === selected.length && preset.keys.every((k) => selectedSet.has(k));

  return (
    <div className="space-y-4">
      {/* Presets */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Atalhos de função
          </span>
          <span className="text-[11px] text-slate-500">
            {selected.length} de {catalog.length} capacidades
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TENANT_PERMISSION_PRESETS.map((preset) => {
            const active = isPresetActive(preset);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                disabled={disabled}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  active
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-indigo-500/60 hover:text-white'
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grupos de capacidades */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
        {groups.map((group) => {
          const items = catalog.filter((p) => p.group === group.id);
          if (items.length === 0) return null;
          return (
            <div key={group.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300 block mb-2">
                {group.name}
              </span>
              <div className="space-y-1.5">
                {items.map((permission) => {
                  const checked = selectedSet.has(permission.key);
                  return (
                    <label
                      key={permission.key}
                      className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? 'bg-indigo-950/40 border-indigo-500/50'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(permission.key)}
                        className="mt-0.5 w-3.5 h-3.5 accent-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="min-w-0">
                        <span
                          className={`text-xs font-semibold block ${
                            checked ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {permission.name}
                        </span>
                        <span className="text-[11px] text-slate-500 block">{permission.description}</span>
                      </span>
                      {checked && <Check className="w-3.5 h-3.5 text-indigo-400 ml-auto shrink-0 mt-0.5" />}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Aviso de consequência */}
      {selected.length === 0 && (
        <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span className="text-[11px] text-amber-200 leading-relaxed">
            Sem nenhuma capacidade marcada, o usuário fica apenas com Início e Consulta de Peças no
            menu. As demais telas operacionais somem.
          </span>
        </div>
      )}
    </div>
  );
};
