import React, { useState } from 'react';
import { 
  Truck, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  FileText, 
  MapPin, 
  Package, 
  AlertCircle,
  ExternalLink,
  Printer,
  ChevronRight
} from 'lucide-react';
import { Order, OrderStatus, SalesChannel } from '../types';

interface PedidosLogisticaProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const PedidosLogistica: React.FC<PedidosLogisticaProps> = ({
  orders,
  onUpdateOrderStatus,
  onShowNotification,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(orders[0] || null);

  const filteredOrders = orders.filter((o) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (o.customerName || '').toLowerCase().includes(term) ||
      (o.id || '').toLowerCase().includes(term) ||
      (o.trackingCode && o.trackingCode.toLowerCase().includes(term)) ||
      o.items.some(i => 
        ((i.productName || (i as any).name || '').toLowerCase().includes(term)) || 
        ((i.productCode || (i as any).code || '').toLowerCase().includes(term))
      );

    const matchesChannel = channelFilter === 'all' || o.channel === channelFilter;
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

    return matchesSearch && matchesChannel && matchesStatus;
  });

  const getChannelBadge = (channel: SalesChannel) => {
    switch (channel) {
      case 'mercadolivre':
        return <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded text-[10px]">Mercado Livre</span>;
      case 'shopee':
        return <span className="bg-orange-100 text-orange-900 border border-orange-300 font-bold px-2 py-0.5 rounded text-[10px]">Shopee</span>;
      case 'amazon':
        return <span className="bg-slate-800 text-white font-bold px-2 py-0.5 rounded text-[10px]">Amazon</span>;
      case 'balcao':
      default:
        return <span className="bg-sky-100 text-sky-900 border border-sky-300 font-bold px-2 py-0.5 rounded text-[10px]">Balcão Físico</span>;
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Entregue':
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Entregue</span>;
      case 'Enviado':
        return <span className="bg-sky-100 text-sky-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1"><Truck className="w-3 h-3" /> Em Trânsito</span>;
      case 'Em Separação':
        return <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full text-[10px] flex items-center gap-1"><Package className="w-3 h-3" /> Em Separação</span>;
      case 'Pago':
        return <span className="bg-blue-100 text-blue-900 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Aguardando Separação</span>;
      default:
        return <span className="bg-slate-100 text-slate-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">{status}</span>;
    }
  };

  const handleAdvanceStatus = (order: Order) => {
    let next: OrderStatus = 'Entregue';
    if (order.status === 'Pago' || order.status === 'Pendente') next = 'Em Separação';
    else if (order.status === 'Em Separação') next = 'Enviado';
    else if (order.status === 'Enviado') next = 'Entregue';

    onUpdateOrderStatus(order.id, next);
    setSelectedOrder({ ...order, status: next });
    onShowNotification(
      'Status do Pedido Atualizado!',
      `Pedido #${order.id} avançado para o estágio '${next.toUpperCase()}'.`,
      'success'
    );
  };

  return (
    <div className="space-y-6" id="view-pedidos-logistica">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Truck className="w-4 h-4 text-sky-600" />
            <span>Central Unificada de Pedidos & Logística de Envio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">
            Painel Central de Vendas & Rastreamento
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Gestão multicanal de pedidos do Balcão, Mercado Livre, Shopee e Amazon. Rastreamento de fretes (Correios, Jadlog, Loggi) e separação de peças no galpão.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Romaneio de Carga</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-sky-100 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pesquisar por cliente, código de rastreio, peça ou número do pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
          >
            <option value="all">Todos os Canais</option>
            <option value="balcao">Balcão</option>
            <option value="mercadolivre">Mercado Livre</option>
            <option value="shopee">Shopee</option>
            <option value="amazon">Amazon</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
          >
            <option value="all">Todos os Status</option>
            <option value="pago">Aguardando Separação</option>
            <option value="separado">Separado no Galpão</option>
            <option value="enviado">Em Trânsito / Enviado</option>
            <option value="entregue">Entregue</option>
          </select>
        </div>
      </div>

      {/* Orders Grid: List + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Orders Table (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-4">ID Pedido / Canal</th>
                  <th className="p-3.5">Cliente</th>
                  <th className="p-3.5">Itens</th>
                  <th className="p-3.5 text-right">Valor</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center pr-4">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Nenhum pedido encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isSelected = selectedOrder?.id === order.id;
                    return (
                      <tr
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className={`hover:bg-sky-50/50 transition cursor-pointer ${isSelected ? 'bg-sky-50/80 font-semibold' : ''}`}
                      >
                        <td className="p-3.5 pl-4 align-middle">
                          <div className="font-mono font-black text-sky-950">#{order.id}</div>
                          <div className="mt-1">{getChannelBadge(order.channel)}</div>
                        </td>

                        <td className="p-3.5 align-middle">
                          <p className="font-extrabold text-slate-900 truncate max-w-[130px]">{order.customerName}</p>
                          <span className="text-[10px] text-slate-500 block">{order.shippingCity}</span>
                        </td>

                        <td className="p-3.5 align-middle">
                          <span className="text-xs font-bold text-slate-800">
                            {order.items.reduce((acc, it) => acc + it.quantity, 0)} peça(s)
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                            {order.items[0]?.productName || (order.items[0] as any)?.name || 'Peça diversa'}
                          </span>
                        </td>

                        <td className="p-3.5 align-middle text-right font-mono font-black text-slate-900">
                          R$ {order.totalAmount.toFixed(2)}
                        </td>

                        <td className="p-3.5 align-middle text-center">
                          {getStatusBadge(order.status)}
                        </td>

                        <td className="p-3.5 pr-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleAdvanceStatus(order)}
                            className="p-1.5 rounded-lg bg-sky-100 text-sky-800 hover:bg-sky-200 text-[10px] font-bold"
                            title="Avançar Estágio"
                          >
                            Avançar ➔
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Order Detail & Live Tracking Timeline (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedOrder ? (
            <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-slate-900">
                      Pedido #{selectedOrder.id}
                    </span>
                    {getChannelBadge(selectedOrder.channel)}
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Data: {new Date(selectedOrder.createdAt).toLocaleDateString('pt-BR')} às {new Date(selectedOrder.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-sm font-black font-mono text-emerald-700 block">
                    R$ {selectedOrder.totalAmount.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500">{selectedOrder.paymentMethod}</span>
                </div>
              </div>

              {/* Live Logistics Timeline */}
              <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sky-950 uppercase flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-sky-600" />
                    <span>Rastreamento Logístico ({selectedOrder.carrier || 'Loggi'})</span>
                  </span>
                  <span className="font-mono text-[10px] font-bold bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                    {selectedOrder.trackingCode || 'AGUARDANDO_ETIQUETA'}
                  </span>
                </div>

                {/* Progress bar steps */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">✓</div>
                    <div>
                      <p className="font-bold text-slate-900">Pedido Realizado & Pago</p>
                      <span className="text-[10px] text-slate-500">NF-e #{selectedOrder.nfeNumber || 'Pendente'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      selectedOrder.status === 'Em Separação' || selectedOrder.status === 'Enviado' || selectedOrder.status === 'Entregue'
                        ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {selectedOrder.status === 'Em Separação' || selectedOrder.status === 'Enviado' || selectedOrder.status === 'Entregue' ? '✓' : '2'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Separado no Estoque (Galpão)</p>
                      <span className="text-[10px] text-slate-500">Peças conferidas na prateleira</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      selectedOrder.status === 'Enviado' || selectedOrder.status === 'Entregue'
                        ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {selectedOrder.status === 'Enviado' || selectedOrder.status === 'Entregue' ? '✓' : '3'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Despachado / Em Trânsito</p>
                      <span className="text-[10px] text-slate-500">Com a transportadora {selectedOrder.carrier}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      selectedOrder.status === 'Entregue'
                        ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {selectedOrder.status === 'Entregue' ? '✓' : '4'}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Entregue ao Destinatário</p>
                      <span className="text-[10px] text-slate-500">{selectedOrder.shippingCity}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items in Order with Location to pick in warehouse */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Itens a Separar no Galpão:
                </span>
                {selectedOrder.items.map((it, idx) => {
                  const pCode = it.productCode || (it as any).code || 'REF-GATO';
                  const pName = it.productName || (it as any).name || 'Peça Automotiva';
                  const pLocation = it.locationStr || (it as any).location || 'Estoque Central (Corredor A)';
                  const pPrice = typeof it.finalUnitPrice === 'number'
                    ? it.finalUnitPrice
                    : typeof (it as any).unitPrice === 'number'
                      ? (it as any).unitPrice
                      : typeof (it as any).total === 'number' && it.quantity > 0
                        ? (it as any).total / it.quantity
                        : 0;

                  return (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold bg-white text-sky-900 px-1.5 py-0.5 rounded border border-slate-200">
                            {pCode}
                          </span>
                          <span className="font-bold text-slate-800">{pName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-amber-800 font-bold">
                          <MapPin className="w-3 h-3 text-amber-600" />
                          <span>Locação: {pLocation}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-slate-900">{it.quantity}x</span>
                        <span className="text-[10px] text-slate-500 block">R$ {pPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus(selectedOrder)}
                  className="flex-1 bg-sky-950 hover:bg-sky-900 text-white font-bold text-xs py-2.5 rounded-xl shadow transition active:scale-95"
                >
                  Avançar Status do Pedido
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-sky-100 shadow-sm text-center text-slate-400 text-xs">
              Selecione um pedido para visualizar os detalhes logísticos e romaneio de separação.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
