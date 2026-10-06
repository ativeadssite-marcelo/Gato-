import React from 'react';
import { ServiceOrder } from '../types';
import { Wrench, Search, Plus, ExternalLink } from 'lucide-react';

interface OrdemServicoManagerProps {
  serviceOrders: ServiceOrder[];
  onUpdateServiceOrders: (orders: ServiceOrder[]) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const OrdemServicoManager: React.FC<OrdemServicoManagerProps> = ({
  serviceOrders,
  onUpdateServiceOrders,
  onShowNotification
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-black">
              <Wrench className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Ordens de Serviço
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-black">
                  Oficina
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Gestão de serviços, diagnósticos e orçamentos
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            className="px-4 py-2.5 bg-[#0C4A6E] hover:bg-[#075985] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
            onClick={() => onShowNotification('Nova OS', 'Funcionalidade em desenvolvimento na Fase C.', 'info')}
          >
            <Plus className="w-4 h-4" />
            <span>Nova OS</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-black text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Nº OS</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Mecânico</th>
                <th className="px-4 py-3 text-right">Valor Total</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {serviceOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma ordem de serviço cadastrada.
                  </td>
                </tr>
              ) : (
                serviceOrders.map(os => (
                  <tr key={os.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 font-bold text-slate-900">{os.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-bold">{os.customerName}</div>
                      <div className="text-[10px] text-slate-500">{os.customerDocument}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold">{os.vehicleBrand} {os.vehicleModel}</div>
                      <div className="text-[10px] text-slate-500">Placa: {os.vehiclePlate}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                        {os.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{os.mechanicAssigned}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      R$ {os.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="p-1.5 text-slate-400 hover:text-sky-600 transition"
                        title="Ver Detalhes"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
