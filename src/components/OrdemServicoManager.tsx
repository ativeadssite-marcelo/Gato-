// =========================================================================
// ORDEM DE SERVIÇO (OS) — oficina / centro automotivo
// =========================================================================
// Antes esta tela era um esqueleto: "Nova OS" respondia "em desenvolvimento",
// "Ver Detalhes" era um botão sem onClick e não havia fechar, reabrir nem
// cancelar. O modelo de dados (`ServiceOrder`) já estava pronto e completo.
//
// O ciclo de vida é COERENTE aqui: as ações oferecidas em cada linha saem de
// `OS_TRANSICOES` (src/utils/serviceOrder.ts) — a tela não inventa caminhos, e
// a mesma regra tem teste. Cancelar é o "excluir" do sistema: a OS vira
// 'Cancelada' e permanece no histórico, com confirmação DIGITADA do número.
//
// Persistência: ainda é o localStorage do navegador (via App), como as demais
// entidades sem tabela — mover para o banco é o próximo passo.
// =========================================================================

import React, { useMemo, useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Ban,
  CheckCircle2,
  RotateCcw,
  Play,
  Package,
  Pencil,
  ShieldCheck,
  DollarSign,
  Percent,
  User,
  Building2,
  Scale
} from 'lucide-react';
import type { Customer, Product, ServiceOrder, ServiceOrderStatus } from '../types';
import { OrdemServicoModal } from './OrdemServicoModal';
import { GarantiaPecaModal } from './GarantiaPecaModal';
import { calcularTotaisOs, OS_STATUS_LABEL, podeTransicionarOs, proximoNumeroOs } from '../utils/serviceOrder';

interface OrdemServicoManagerProps {
  serviceOrders: ServiceOrder[];
  onUpdateServiceOrders: (orders: ServiceOrder[]) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
  customers?: Customer[];
  products?: Product[];
  branchId?: string;
}

const CORES_STATUS: Record<ServiceOrderStatus, string> = {
  Orcamento: 'bg-amber-50 text-amber-800 border-amber-300',
  Aprovada: 'bg-sky-50 text-sky-800 border-sky-300',
  'Em Execucao': 'bg-indigo-50 text-indigo-800 border-indigo-300',
  'Aguardando Pecas': 'bg-orange-50 text-orange-800 border-orange-300',
  Finalizada: 'bg-emerald-50 text-emerald-800 border-emerald-300',
  Faturada: 'bg-slate-100 text-slate-700 border-slate-300',
  Cancelada: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const OrdemServicoManager: React.FC<OrdemServicoManagerProps> = ({
  serviceOrders,
  onUpdateServiceOrders,
  onShowNotification,
  customers = [],
  products = [],
  branchId = 'matriz-ms',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceOrderStatus | 'todas'>('todas');
  const [modalAberto, setModalAberto] = useState(false);
  const [osEmEdicao, setOsEmEdicao] = useState<ServiceOrder | null>(null);
  const [cancelarAlvo, setCancelarAlvo] = useState<ServiceOrder | null>(null);
  const [cancelarConfirmacao, setCancelarConfirmacao] = useState('');
  const [garantiaAlvo, setGarantiaAlvo] = useState<{ os: ServiceOrder; product: Product | null } | null>(null);

  const proximoId = useMemo(() => proximoNumeroOs(serviceOrders), [serviceOrders]);

  // Resumo Financeiro & Comissões para o Contratante
  const resumoFinanceiro = useMemo(() => {
    return serviceOrders.reduce(
      (acc, os) => {
        if (os.status === 'Cancelada') return acc;
        const totais = calcularTotaisOs(os);
        acc.totalGeral += totais.totalAmount;
        acc.totalPecas += totais.partsTotal;
        acc.totalMaoDeObra += totais.laborTotal;
        acc.comissoesVendedores += totais.sellerCommissionAmount;
        acc.comissoesMecanicos += totais.mechanicCommissionAmount;
        acc.comissoesOficinas += totais.workshopPartsCommissionAmount;
        if (os.status === 'Finalizada' || os.status === 'Faturada') {
          acc.garantiasAtivas += 1;
        }
        return acc;
      },
      {
        totalGeral: 0,
        totalPecas: 0,
        totalMaoDeObra: 0,
        comissoesVendedores: 0,
        comissoesMecanicos: 0,
        comissoesOficinas: 0,
        garantiasAtivas: 0,
      }
    );
  }, [serviceOrders]);

  const lista = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    return serviceOrders.filter((os) => {
      if (statusFilter !== 'todas' && os.status !== statusFilter) return false;
      if (!termo) return true;
      return (
        os.id.toLowerCase().includes(termo) ||
        os.customerName.toLowerCase().includes(termo) ||
        os.vehiclePlate.toLowerCase().includes(termo) ||
        os.vehicleModel.toLowerCase().includes(termo)
      );
    });
  }, [serviceOrders, searchTerm, statusFilter]);

  const abrirNova = () => {
    setOsEmEdicao(null);
    setModalAberto(true);
  };

  const abrirEdicao = (os: ServiceOrder) => {
    setOsEmEdicao(os);
    setModalAberto(true);
  };

  const salvarOs = (os: ServiceOrder) => {
    const existe = serviceOrders.some((item) => item.id === os.id);
    const atualizadas = existe
      ? serviceOrders.map((item) => (item.id === os.id ? os : item))
      : [os, ...serviceOrders];
    onUpdateServiceOrders(atualizadas);
    setModalAberto(false);
    setOsEmEdicao(null);
    onShowNotification(
      existe ? 'OS Atualizada' : 'OS Aberta',
      `${os.id} — ${os.customerName} (${os.vehiclePlate}). Total: R$ ${os.totalAmount.toFixed(2)}.`,
      'success'
    );
  };

  /** Muda o status respeitando o ciclo de vida; recusa o que não é permitido. */
  const mudarStatus = (os: ServiceOrder, novo: ServiceOrderStatus, mensagem: string) => {
    if (!podeTransicionarOs(os.status, novo)) {
      onShowNotification(
        'Transição não permitida',
        `Uma OS ${OS_STATUS_LABEL[os.status]} não pode ir para ${OS_STATUS_LABEL[novo]}.`,
        'warning'
      );
      return;
    }
    const atualizada: ServiceOrder = {
      ...os,
      status: novo,
      dateFinished: novo === 'Finalizada' ? new Date().toISOString().slice(0, 10) : os.dateFinished,
    };
    onUpdateServiceOrders(serviceOrders.map((item) => (item.id === os.id ? atualizada : item)));
    onShowNotification(`${os.id} — ${OS_STATUS_LABEL[novo]}`, mensagem, 'success');
  };

  const confirmarCancelamento = () => {
    if (!cancelarAlvo) return;
    const os = cancelarAlvo;
    setCancelarAlvo(null);
    setCancelarConfirmacao('');
    mudarStatus(os, 'Cancelada', 'A OS saiu da lista de trabalho. O histórico permanece.');
  };

  return (
    <div className="space-y-4">
      {/* Painel do Contratante: Definição e Resumo de Comissões & Garantias CDC */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[#0284C7] font-bold text-xs uppercase tracking-wider mb-1">
              <Wrench className="w-4 h-4 text-[#0284C7]" />
              <span>Gestão de Oficina &amp; Venda de Peças em OS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">
              Ordens de Serviço, Comissões &amp; Garantia de Peças
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Definição de comissão para vendedor e oficina parceira na venda de peças, mão de obra mecânica e emissão de laudo de garantia (CDC Brasil).
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNova}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap self-start md:self-auto"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Nova Ordem de Serviço</span>
          </button>
        </div>

        {/* KPIs de Comissões e Garantias para o Cliente Contratante */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-sky-50/70 border border-sky-100 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-sky-800 uppercase block flex items-center gap-1">
              <User className="w-3 h-3 text-[#0284C7]" />
              Comissão Vendedor (Peças)
            </span>
            <span className="text-base font-black text-sky-950 font-mono mt-0.5 block">
              R$ {resumoFinanceiro.comissoesVendedores.toFixed(2)}
            </span>
            <span className="text-[10px] text-sky-700">Repasse sobre peças em OS</span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block flex items-center gap-1">
              <Building2 className="w-3 h-3 text-emerald-600" />
              Comissão Oficina Parceira
            </span>
            <span className="text-base font-black text-emerald-950 font-mono mt-0.5 block">
              R$ {resumoFinanceiro.comissoesOficinas.toFixed(2)}
            </span>
            <span className="text-[10px] text-emerald-700">Bonificação por venda de peças</span>
          </div>

          <div className="bg-amber-50/70 border border-amber-100 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-amber-800 uppercase block flex items-center gap-1">
              <Wrench className="w-3 h-3 text-amber-600" />
              Comissão Mecânico
            </span>
            <span className="text-base font-black text-amber-950 font-mono mt-0.5 block">
              R$ {resumoFinanceiro.comissoesMecanicos.toFixed(2)}
            </span>
            <span className="text-[10px] text-amber-700">Sobre serviços prestados</span>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-xl">
            <span className="text-[10px] font-bold text-indigo-800 uppercase block flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-600" />
              Garantias Ativas CDC
            </span>
            <span className="text-base font-black text-indigo-950 font-mono mt-0.5 block">
              {resumoFinanceiro.garantiasAtivas} OS
            </span>
            <span className="text-[10px] text-indigo-700">Lei 8.078/90 (Art. 26 &amp; 50)</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase block flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-slate-600" />
              Faturamento Total OS
            </span>
            <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
              R$ {resumoFinanceiro.totalGeral.toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-500">Peças: R$ {resumoFinanceiro.totalPecas.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Barra de filtros e ações */}
      <div className="bg-white rounded-2xl p-4 border border-sky-50 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filtrar por número da OS, cliente, placa ou modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ServiceOrderStatus | 'todas')}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
        >
          <option value="todas">Todos os status</option>
          {(Object.keys(OS_STATUS_LABEL) as ServiceOrderStatus[]).map((status) => (
            <option key={status} value={status}>{OS_STATUS_LABEL[status]}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={abrirNova}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Nova OS</span>
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-sky-50 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase">
              <th className="p-3.5">Nº OS</th>
              <th className="p-3.5">Cliente</th>
              <th className="p-3.5">Veículo</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5">Mecânico</th>
              <th className="p-3.5 text-right">Valor Total</th>
              <th className="p-3.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {lista.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-400 italic">
                  Nenhuma ordem de serviço {statusFilter !== 'todas' ? `em ${OS_STATUS_LABEL[statusFilter]}` : 'cadastrada'}.
                </td>
              </tr>
            )}
            {lista.map((os) => {
              const totais = calcularTotaisOs(os);
              return (
                <tr key={os.id} className={os.status === 'Cancelada' ? 'opacity-60' : ''}>
                  <td className="p-3.5 font-mono font-bold text-slate-900">{os.id}</td>
                  <td className="p-3.5">
                    <span className="font-bold text-slate-800 block">{os.customerName || '—'}</span>
                    <span className="text-[10px] text-slate-400">{os.customerPhone}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-mono font-bold text-slate-700 block">{os.vehiclePlate}</span>
                    <span className="text-[10px] text-slate-500">{os.vehicleBrand} {os.vehicleModel}</span>
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full border font-bold text-[11px] ${CORES_STATUS[os.status]}`}>
                      {OS_STATUS_LABEL[os.status]}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-600">{os.mechanicAssigned || '—'}</td>
                  <td className="p-3.5 text-right font-mono font-black text-slate-900">
                    R$ {totais.totalAmount.toFixed(2)}
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => abrirEdicao(os)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="Abrir a OS: peças, mão de obra e dados do veículo"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {podeTransicionarOs(os.status, 'Aprovada') && (
                        <button
                          type="button"
                          onClick={() => mudarStatus(os, 'Aprovada', 'Orçamento aprovado pelo cliente.')}
                          className="p-1.5 text-sky-700 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                          title="Aprovar o orçamento do cliente"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}

                      {podeTransicionarOs(os.status, 'Em Execucao') && (
                        <button
                          type="button"
                          onClick={() =>
                            mudarStatus(
                              os,
                              'Em Execucao',
                              os.status === 'Finalizada' ? 'OS reaberta para retrabalho.' : 'Serviço iniciado na oficina.'
                            )
                          }
                          className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title={os.status === 'Finalizada' ? 'Reabrir a OS (retrabalho)' : 'Iniciar a execução do serviço'}
                        >
                          {os.status === 'Finalizada' ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                      )}

                      {podeTransicionarOs(os.status, 'Aguardando Pecas') && (
                        <button
                          type="button"
                          onClick={() => mudarStatus(os, 'Aguardando Pecas', 'OS parada aguardando a chegada da peça.')}
                          className="p-1.5 text-orange-700 hover:bg-orange-50 rounded-lg transition cursor-pointer"
                          title="Marcar como aguardando peça"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                      )}

                      {podeTransicionarOs(os.status, 'Finalizada') && (
                        <button
                          type="button"
                          onClick={() => mudarStatus(os, 'Finalizada', 'Serviço concluído e veículo liberado.')}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-[11px] transition active:scale-95 cursor-pointer"
                          title="Fechar a OS (serviço concluído)"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Fechar</span>
                        </button>
                      )}

                      {/* Emissão de Garantia de Peças CDC */}
                      <button
                        type="button"
                        onClick={() => {
                          const firstPart = os.parts[0];
                          const matchedProduct = firstPart ? products.find((p) => p.id === firstPart.productId) || null : null;
                          setGarantiaAlvo({ os, product: matchedProduct });
                        }}
                        className="p-1.5 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                        title="Emitir Certificado & Laudo de Garantia CDC das Peças"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>

                      {podeTransicionarOs(os.status, 'Cancelada') && (
                        <button
                          type="button"
                          onClick={() => {
                            setCancelarAlvo(os);
                            setCancelarConfirmacao('');
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Cancelar a OS (sai da lista; o histórico permanece)"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Formulário de abertura/edição */}
      <OrdemServicoModal
        isOpen={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setOsEmEdicao(null);
        }}
        os={osEmEdicao}
        proximoId={proximoId}
        customers={customers}
        products={products}
        branchId={branchId}
        onSave={salvarOs}
        onShowNotification={onShowNotification}
      />

      {/* Confirmação DIGITADA do cancelamento */}
      {cancelarAlvo && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Cancelar ordem de serviço</span>
                <h3 className="text-sm font-black text-slate-900 font-mono">{cancelarAlvo.id}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {cancelarAlvo.customerName} • {cancelarAlvo.vehiclePlate}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 space-y-1">
              <p>A OS <strong>sai da lista de trabalho</strong> da oficina.</p>
              <p>Ela <strong>não é apagada</strong>: continua no histórico do cliente.</p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Para confirmar, digite o número <span className="font-mono text-slate-900">{cancelarAlvo.id}</span>:
              </label>
              <input
                type="text"
                value={cancelarConfirmacao}
                onChange={(e) => setCancelarConfirmacao(e.target.value)}
                placeholder={cancelarAlvo.id}
                autoFocus
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCancelarAlvo(null);
                  setCancelarConfirmacao('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cancelarConfirmacao.trim() !== cancelarAlvo.id}
                onClick={confirmarCancelamento}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-md transition cursor-pointer"
              >
                Cancelar OS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Emissão de Garantia de Peças (Normas CDC Brasil) */}
      {garantiaAlvo && (
        <GarantiaPecaModal
          isOpen={Boolean(garantiaAlvo)}
          onClose={() => setGarantiaAlvo(null)}
          product={garantiaAlvo.product}
          products={products}
          customers={customers}
          initialPlate={garantiaAlvo.os.vehiclePlate}
          initialCustomerName={garantiaAlvo.os.customerName}
          initialCustomerDoc={garantiaAlvo.os.customerDocument}
          onShowNotification={onShowNotification}
        />
      )}
    </div>
  );
};
