// =========================================================================
// ORDEM DE SERVIÇO — formulário de abertura/edição (peças + mão de obra)
// =========================================================================
// A OS nasce em 'Orcamento' e o ciclo de vida (aprovar, executar, fechar,
// reabrir, cancelar) é feito na LISTA — aqui só se monta o conteúdo. Isso
// mantém a tela de status com um caminho único e testável
// (`src/utils/serviceOrder.ts`).
//
// Os totais são RECALCULADOS a cada mudança (nunca lidos do que estava salvo):
// peça ou hora alterada com total guardado à parte vira número que não fecha.
// =========================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Wrench, Package, X, DollarSign, Percent, User, Building2, ShieldCheck, Scale } from 'lucide-react';
import type {
  Customer,
  Product,
  ServiceLaborItem,
  ServiceOrder,
  ServiceOrderItem,
} from '../types';
import { calcularTotaisOs } from '../utils/serviceOrder';

interface OrdemServicoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** OS em edição; ausente ou null = nova. */
  os?: ServiceOrder | null;
  /** Número sugerido para a OS nova (ex.: OS-2026-005). */
  proximoId: string;
  customers: Customer[];
  products: Product[];
  branchId: string;
  onSave: (os: ServiceOrder) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

function osEmBranco(proximoId: string, branchId: string): ServiceOrder {
  return {
    id: proximoId,
    dateOpened: new Date().toISOString().slice(0, 10),
    status: 'Orcamento',
    customerId: '',
    customerName: '',
    customerDocument: '',
    customerPhone: '',
    vehiclePlate: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: new Date().getFullYear(),
    vehicleKm: 0,
    mechanicAssigned: '',
    mechanicCommissionPercent: 40, // Padrão oficina: 40% sobre serviços
    mechanicCommissionAmount: 0,
    sellerAssigned: '',
    sellerCommissionPercent: 2.5,  // Padrão balcão: 2.5% sobre peças
    sellerCommissionAmount: 0,
    workshopName: '',
    workshopPartsCommissionPercent: 0,
    workshopPartsCommissionAmount: 0,
    problemReported: '',
    parts: [],
    labor: [],
    partsTotal: 0,
    laborTotal: 0,
    discount: 0,
    totalAmount: 0,
    warrantyDays: 90, // Padrão legal CDC
    branchId,
  };
}

export const OrdemServicoModal: React.FC<OrdemServicoModalProps> = ({
  isOpen,
  onClose,
  os,
  proximoId,
  customers,
  products,
  branchId,
  onSave,
  onShowNotification,
}) => {
  const [draft, setDraft] = useState<ServiceOrder>(() => osEmBranco(proximoId, branchId));

  // Recarrega o rascunho quando o modal abre (OS em edição ou uma nova).
  useEffect(() => {
    if (!isOpen) return;
    setDraft(os ? { ...os, parts: [...os.parts], labor: [...os.labor] } : osEmBranco(proximoId, branchId));
  }, [isOpen, os?.id, proximoId, branchId]);

  const totais = useMemo(
    () =>
      calcularTotaisOs({
        parts: draft.parts,
        labor: draft.labor,
        discount: draft.discount,
        sellerCommissionPercent: draft.sellerCommissionPercent,
        mechanicCommissionPercent: draft.mechanicCommissionPercent,
        workshopPartsCommissionPercent: draft.workshopPartsCommissionPercent,
      }),
    [
      draft.parts,
      draft.labor,
      draft.discount,
      draft.sellerCommissionPercent,
      draft.mechanicCommissionPercent,
      draft.workshopPartsCommissionPercent,
    ]
  );

  if (!isOpen) return null;

  const alterar = <K extends keyof ServiceOrder>(campo: K, valor: ServiceOrder[K]) =>
    setDraft((d) => ({ ...d, [campo]: valor }));

  const selecionarCliente = (customerId: string) => {
    const cliente = customers.find((c) => c.id === customerId);
    setDraft((d) => ({
      ...d,
      customerId,
      customerName: cliente?.name || '',
      customerDocument: cliente?.document || '',
      customerPhone: cliente?.phone || '',
      customerEmail: cliente?.email,
    }));
  };

  const adicionarPeca = () => {
    const produto = products.find((p) => p.active !== false);
    if (!produto) {
      onShowNotification('Sem produto cadastrado', 'Cadastre um produto antes de incluir peças na OS.', 'warning');
      return;
    }
    const item: ServiceOrderItem = {
      productId: produto.id,
      productCode: produto.code,
      productName: produto.name,
      brand: produto.brand,
      quantity: 1,
      unitPrice: produto.sellingPrice,
      costPrice: produto.unitCost,
      total: produto.sellingPrice,
    };
    setDraft((d) => ({ ...d, parts: [...d.parts, item] }));
  };

  const alterarPeca = (index: number, patch: Partial<ServiceOrderItem>) => {
    setDraft((d) => {
      const parts = d.parts.map((item, i) => {
        if (i !== index) return item;
        const atualizado = { ...item, ...patch };
        return { ...atualizado, total: atualizado.quantity * atualizado.unitPrice };
      });
      return { ...d, parts };
    });
  };

  const trocarProdutoDaPeca = (index: number, productId: string) => {
    const produto = products.find((p) => p.id === productId);
    if (!produto) return;
    alterarPeca(index, {
      productId: produto.id,
      productCode: produto.code,
      productName: produto.name,
      brand: produto.brand,
      unitPrice: produto.sellingPrice,
      costPrice: produto.unitCost,
    });
  };

  const removerPeca = (index: number) =>
    setDraft((d) => ({ ...d, parts: d.parts.filter((_, i) => i !== index) }));

  const adicionarMaoDeObra = () =>
    setDraft((d) => ({
      ...d,
      labor: [
        ...d.labor,
        { id: `mo-${Date.now()}`, description: '', hours: 1, price: 0, mechanicName: d.mechanicAssigned } as ServiceLaborItem,
      ],
    }));

  const alterarMaoDeObra = (index: number, patch: Partial<ServiceLaborItem>) =>
    setDraft((d) => ({ ...d, labor: d.labor.map((item, i) => (i === index ? { ...item, ...patch } : item)) }));

  const removerMaoDeObra = (index: number) =>
    setDraft((d) => ({ ...d, labor: d.labor.filter((_, i) => i !== index) }));

  const salvar = () => {
    if (!draft.customerId) {
      onShowNotification('Cliente obrigatório', 'Selecione o cliente da ordem de serviço.', 'warning');
      return;
    }
    if (!draft.vehiclePlate.trim() || !draft.problemReported.trim()) {
      onShowNotification('Faltam dados da OS', 'Informe a placa do veículo e o defeito relatado.', 'warning');
      return;
    }
    onSave({ ...draft, ...totais });
  };

  const produtosDisponiveis = products.filter((p) => p.active !== false);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 sticky top-0 bg-white z-10">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {os ? 'Editar ordem de serviço' : 'Nova ordem de serviço'}
            </span>
            <h2 className="text-base font-black text-slate-900 font-mono">{draft.id}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Cliente, Vendedor e Oficina */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Cliente *</label>
              <select
                value={draft.customerId}
                onChange={(e) => selecionarCliente(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white font-medium"
              >
                <option value="">Selecione o cliente…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-[#0284C7]" /> Vendedor (Peças)
                </span>
              </label>
              <input
                type="text"
                value={draft.sellerAssigned || ''}
                onChange={(e) => alterar('sellerAssigned', e.target.value)}
                placeholder="Nome do consultor/vendedor"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                <span className="flex items-center gap-1">
                  <Wrench className="w-3 h-3 text-amber-600" /> Mecânico / Oficina
                </span>
              </label>
              <input
                type="text"
                value={draft.mechanicAssigned}
                onChange={(e) => alterar('mechanicAssigned', e.target.value)}
                placeholder="Mecânico ou Oficina executora"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Dados do Veículo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Placa *</label>
              <input
                type="text"
                value={draft.vehiclePlate}
                onChange={(e) => alterar('vehiclePlate', e.target.value.toUpperCase())}
                placeholder="ABC-1D23"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Marca / Modelo</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={draft.vehicleBrand}
                  onChange={(e) => alterar('vehicleBrand', e.target.value)}
                  placeholder="Marca (ex: Scania / Toyota)"
                  className="w-1/3 px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
                <input
                  type="text"
                  value={draft.vehicleModel}
                  onChange={(e) => alterar('vehicleModel', e.target.value)}
                  placeholder="Modelo (ex: R450 / Hilux)"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Ano</label>
                <input
                  type="number"
                  value={draft.vehicleYear}
                  onChange={(e) => alterar('vehicleYear', Number(e.target.value) || 0)}
                  className="w-full px-2 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">KM</label>
                <input
                  type="number"
                  value={draft.vehicleKm}
                  onChange={(e) => alterar('vehicleKm', Number(e.target.value) || 0)}
                  className="w-full px-2 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Motor</label>
              <input
                type="text"
                value={draft.vehicleMotor || ''}
                onChange={(e) => alterar('vehicleMotor', e.target.value)}
                placeholder="1.0 / OM-352"
                className="w-full px-2 py-2 border border-slate-300 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Defeito relatado pelo cliente *</label>
              <textarea
                rows={3}
                value={draft.problemReported}
                onChange={(e) => alterar('problemReported', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs resize-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Diagnóstico técnico</label>
              <textarea
                rows={3}
                value={draft.technicalDiagnosis || ''}
                onChange={(e) => alterar('technicalDiagnosis', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs resize-none"
              />
            </div>
          </div>

          {/* Peças */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-b border-slate-200">
              <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase">
                <Package className="w-3.5 h-3.5 text-sky-600" />
                Peças ({draft.parts.length})
              </span>
              <button
                type="button"
                onClick={adicionarPeca}
                className="flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:bg-sky-50 px-2 py-1 rounded cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Adicionar peça
              </button>
            </div>
            {draft.parts.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-slate-400 italic">Nenhuma peça na OS.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {draft.parts.map((item, index) => (
                  <div key={`${item.productId}-${index}`} className="flex items-center gap-2 px-3 py-2">
                    <select
                      value={item.productId}
                      onChange={(e) => trocarProdutoDaPeca(index, e.target.value)}
                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-white"
                    >
                      {!produtosDisponiveis.some((p) => p.id === item.productId) && (
                        <option value={item.productId}>{item.productCode} — {item.productName}</option>
                      )}
                      {produtosDisponiveis.map((p) => (
                        <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => alterarPeca(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] text-center"
                      title="Quantidade"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => alterarPeca(index, { unitPrice: Number(e.target.value) || 0 })}
                      className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] text-right"
                      title="Valor unitário"
                    />
                    <span className="w-24 text-right font-mono text-[11px] font-bold text-slate-800">
                      R$ {item.total.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removerPeca(index)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      title="Remover peça"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mão de obra */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-b border-slate-200">
              <span className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase">
                <Wrench className="w-3.5 h-3.5 text-amber-600" />
                Mão de obra ({draft.labor.length})
              </span>
              <button
                type="button"
                onClick={adicionarMaoDeObra}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:bg-amber-50 px-2 py-1 rounded cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Adicionar serviço
              </button>
            </div>
            {draft.labor.length === 0 ? (
              <p className="px-3 py-3 text-[11px] text-slate-400 italic">Nenhum serviço lançado.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {draft.labor.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => alterarMaoDeObra(index, { description: e.target.value })}
                      placeholder="Descrição do serviço"
                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px]"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={item.hours ?? 0}
                      onChange={(e) => alterarMaoDeObra(index, { hours: Number(e.target.value) || 0 })}
                      className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] text-center"
                      title="Horas"
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.price}
                      onChange={(e) => alterarMaoDeObra(index, { price: Number(e.target.value) || 0 })}
                      className="w-24 px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] text-right"
                      title="Valor do serviço"
                    />
                    <button
                      type="button"
                      onClick={() => removerMaoDeObra(index)}
                      className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      title="Remover serviço"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Definição de Comissões (Vendedor de Peças & Oficina / Mecânico) */}
          <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black text-indigo-950 uppercase tracking-tight">
                <DollarSign className="w-4 h-4 text-indigo-600" />
                Comissões Definidas pela Empresa Contratante
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                Repasse Automático
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Comissão Vendedor */}
              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#0284C7]" />
                    Comissão Vendedor (Peças)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#0284C7]">
                    R$ {totais.sellerCommissionAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={draft.sellerCommissionPercent ?? 2.5}
                    onChange={(e) => alterar('sellerCommissionPercent', Number(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-bold text-center"
                  />
                  <span className="text-[11px] text-slate-500 font-semibold">% sobre R$ {totais.partsTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Comissão Mecânico / Executor */}
              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    Comissão Mecânico (Serviços)
                  </span>
                  <span className="text-[10px] font-mono font-bold text-amber-700">
                    R$ {totais.mechanicCommissionAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={draft.mechanicCommissionPercent ?? 40}
                    onChange={(e) => alterar('mechanicCommissionPercent', Number(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-bold text-center"
                  />
                  <span className="text-[11px] text-slate-500 font-semibold">% sobre R$ {totais.laborTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Comissão Oficina Parceira (Peças) */}
              <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    Comissão Oficina Parceira
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-700">
                    R$ {totais.workshopPartsCommissionAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={draft.workshopPartsCommissionPercent ?? 0}
                    onChange={(e) => alterar('workshopPartsCommissionPercent', Number(e.target.value) || 0)}
                    className="w-20 px-2 py-1 text-xs border border-slate-300 rounded font-bold text-center"
                  />
                  <span className="text-[11px] text-slate-500 font-semibold">% sobre peças da OS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Totais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Peças</span>
              <span className="font-mono text-sm font-bold text-slate-800">R$ {totais.partsTotal.toFixed(2)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Mão de obra</span>
              <span className="font-mono text-sm font-bold text-slate-800">R$ {totais.laborTotal.toFixed(2)}</span>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase">Desconto</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={draft.discount}
                onChange={(e) => alterar('discount', Number(e.target.value) || 0)}
                className="w-full px-2 py-1 border border-slate-300 rounded-lg text-xs text-right"
              />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-slate-500 uppercase">Total Geral</span>
              <span className="font-mono text-base font-black text-emerald-700">R$ {totais.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 p-5 sticky bottom-0 bg-white">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-[11px] text-slate-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-[#0284C7]" />
              Garantia Legal CDC:
              <input
                type="number"
                min={0}
                value={draft.warrantyDays ?? 90}
                onChange={(e) => alterar('warrantyDays', Number(e.target.value) || 0)}
                className="w-16 px-2 py-1 border border-slate-300 rounded text-xs text-right font-bold"
              />
              <span className="text-[10px] text-slate-500">dias (Lei 8.078/90)</span>
            </label>
            <span className="text-[10px] bg-sky-50 text-sky-800 px-2 py-0.5 rounded border border-sky-200 font-medium hidden md:inline-block">
              Cobertura obrigatória de 90 dias para autopeças duráveis
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              className="px-5 py-2.5 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
            >
              {os ? 'Salvar Alterações' : 'Abrir Ordem de Serviço'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
