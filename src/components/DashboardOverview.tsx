import React from 'react';
import { 
  FileCode2, 
  Calculator, 
  Boxes, 
  FileText, 
  Share2, 
  Truck, 
  TrendingUp, 
  AlertTriangle, 
  ArrowUpRight, 
  MapPin, 
  CheckCircle2, 
  Sparkles,
  DollarSign,
  Plus,
  Wrench
} from 'lucide-react';
import { Product, Order, InvoiceRecord } from '../types';

interface DashboardOverviewProps {
  products: Product[];
  orders: Order[];
  invoices: InvoiceRecord[];
  onNavigate: (view: any) => void;
  onSelectProductForQuote: (product: Product) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  products,
  orders,
  invoices,
  onNavigate,
  onSelectProductForQuote,
}) => {
  const lowStockProducts = products.filter(p => p.stock <= p.minStock);
  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const totalRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0) + 14280.00;
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6" id="view-dashboard-overview">
      {/* Hero Welcome Banner - Clean Minimalism Deep Blue with Amber Accent */}
      <div className="bg-[#0C4A6E] text-white rounded-2xl p-6 sm:p-7 border border-[#0C4A6E] shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 text-sky-200 border border-white/10 px-3 py-1 rounded-full text-[11px] font-bold">
              <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>GATO • Gestão Avançada de Autopeças & Balcão</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-['Outfit'] tracking-tight">
              Controle Total: Peças Automotivas, Moto, Caminhão & Agrícola
            </h1>
            <p className="text-xs sm:text-sm text-sky-100/80 leading-relaxed">
              Importação sequencial de XML de compra com cadastro guiado, cotação rápida com impostos por UF e margens por perfil de cliente, emissão de NF-e e sincronização multi-loja.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0">
            <button
              type="button"
              id="dash-btn-import-xml"
              onClick={() => onNavigate('xml-import')}
              className="flex items-center justify-center gap-2 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-3 rounded-lg shadow-sm transition active:scale-95"
            >
              <FileCode2 className="w-4 h-4 fill-slate-950" />
              <span>Importar XML de Compra</span>
            </button>

            <button
              type="button"
              id="dash-btn-open-quote"
              onClick={() => onNavigate('cotacao')}
              className="flex items-center justify-center gap-2 bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-bold text-xs px-5 py-3 rounded-lg shadow-sm transition active:scale-95"
            >
              <Calculator className="w-4 h-4 text-white" />
              <span>Nova Cotação de Balcão</span>
            </button>

            <button
              type="button"
              id="dash-btn-open-os"
              onClick={() => onNavigate('ordem-servico')}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-3 rounded-lg shadow-sm transition active:scale-95"
            >
              <Wrench className="w-4 h-4 text-white" />
              <span>Ordem de Serviço (Oficina)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metrics Strip - Signature Clean Minimalism Border-b-4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Valor em Estoque (#0284C7 bottom accent) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-sky-50 border-b-4 border-b-[#0284C7]">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Valor em Estoque</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1 font-mono">
            R$ 482.903,20
          </h3>
          <div className="mt-2 text-[10px] text-emerald-600 font-bold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +12% vs mês anterior
          </div>
        </div>

        {/* Metric 2: Vendas Canais Hoje (#F59E0B bottom accent) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-sky-50 border-b-4 border-b-[#F59E0B]">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vendas Canais (Hoje)</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1 font-mono">
            R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </h3>
          <div className="mt-2 flex items-center space-x-2">
            <span className="px-1.5 py-0.5 bg-amber-50 text-[#F59E0B] rounded text-[9px] font-bold border border-amber-200/50">ML: 42</span>
            <span className="px-1.5 py-0.5 bg-sky-50 text-[#0284C7] rounded text-[9px] font-bold border border-sky-200/50">AMZ: 12</span>
            <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[9px] font-bold border border-orange-200/50">SHP: 18</span>
          </div>
        </div>

        {/* Metric 3: Pendentes XML (#0C4A6E bottom accent) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-sky-50 border-b-4 border-b-[#0C4A6E]">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pendentes XML</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1 font-mono">
            07 Notas
          </h3>
          <div 
            onClick={() => onNavigate('xml-import')}
            className="mt-2 text-[10px] text-[#0284C7] font-bold underline cursor-pointer hover:text-[#0C4A6E]"
          >
            Processar Importação ➔
          </div>
        </div>

        {/* Metric 4: Margem Média (emerald-500 bottom accent) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-sky-50 border-b-4 border-b-emerald-500">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Margem Média</p>
          <h3 className="text-2xl font-black text-slate-800 mt-1 font-mono">
            38.4%
          </h3>
          <div className="mt-2 text-[10px] text-emerald-600 font-bold italic">
            Markup configurado por cliente
          </div>
        </div>
      </div>

      {/* Main Grid: Low Stock Alert & Recent Orders with Clean Minimalist Table Styling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Low Stock Items & Picking Locations (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 shadow-sm border border-sky-50 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sky-100">
            <div className="flex items-center">
              <span className="w-2 h-4 bg-[#F59E0B] rounded mr-2 inline-block" />
              <h2 className="text-sm font-bold text-slate-800">
                Alerta de Reposição & Locação de Estoque
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">
              {lowStockProducts.length} itens críticos
            </span>
          </div>

          <div className="space-y-2.5">
            {lowStockProducts.map((prod) => (
              <div 
                key={prod.id} 
                className="p-3 bg-slate-50/70 hover:bg-sky-50/50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 text-xs transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold bg-white text-slate-900 px-1.5 py-0.5 rounded border border-slate-200">
                      {prod.code}
                    </span>
                    <span className="text-[10px] font-bold text-[#0C4A6E]">{prod.brand}</span>
                  </div>
                  <p className="font-bold text-slate-800 truncate mt-0.5">{prod.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                    <span className="text-slate-600 font-semibold flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-[#0284C7]" />
                      {prod.location.corridor} • {prod.location.shelf} • {prod.location.box}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    {prod.stock} un (mín: {prod.minStock})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProductForQuote(prod);
                      onNavigate('cotacao');
                    }}
                    className="text-[10px] font-bold text-[#0284C7] hover:text-[#0C4A6E] underline"
                  >
                    Cotar no Balcão
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Multi-Channel Orders (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 shadow-sm border border-sky-50 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sky-100">
            <div className="flex items-center">
              <span className="w-2 h-4 bg-[#0284C7] rounded mr-2 inline-block" />
              <h2 className="text-sm font-bold text-slate-800">
                Últimos Pedidos dos Canais Integrados
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('cotacao')}
                className="px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded uppercase hover:bg-emerald-600 transition"
              >
                Nova Venda
              </button>
              <button
                type="button"
                onClick={() => onNavigate('pedidos')}
                className="px-2.5 py-1 bg-sky-50 text-[#0284C7] text-[10px] font-bold rounded uppercase hover:bg-sky-100 transition"
              >
                Ver todos ({orders.length})
              </button>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            {recentOrders.map((ord) => (
              <div 
                key={ord.id} 
                className="p-3 bg-slate-50/70 hover:bg-sky-50/50 border border-slate-100 rounded-xl flex items-center justify-between gap-2 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">#{ord.id}</span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-700">
                      {ord.channel}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 mt-0.5">{ord.customerName}</p>
                  <span className="text-[10px] text-slate-400">
                    {ord.items.length} item(ns) • {ord.shippingCity}
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-mono font-black text-slate-900 block">
                    R$ {ord.totalAmount.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-emerald-100">
                    {ord.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
