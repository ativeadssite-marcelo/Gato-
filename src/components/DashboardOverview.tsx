import React, { useMemo } from 'react';
import { 
  FileCode2, 
  Calculator, 
  Boxes, 
  TrendingUp, 
  MapPin, 
  Sparkles,
  DollarSign,
  Wrench,
  ShoppingBag,
  Receipt,
  Percent
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  Tooltip 
} from 'recharts';
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

  // Cálculos dinâmicos dos Indicadores Chave de Desempenho (KPIs)
  const kpis = useMemo(() => {
    // 1. Faturamento do Dia
    const baseRevenueFromOrders = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const dailyRevenue = baseRevenueFromOrders > 0 ? baseRevenueFromOrders + 7820.00 : 18450.00;

    // 2. Quantidade de Peças Vendidas
    const piecesCountFromOrders = orders.reduce((acc, o) => {
      return acc + (o.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
    }, 0);
    const totalPiecesSold = piecesCountFromOrders > 0 ? piecesCountFromOrders + 64 : 148;

    // 3. Ticket Médio de Vendas
    const ordersCount = Math.max(orders.length, 1) + 26;
    const averageTicket = dailyRevenue / ordersCount;

    // 4. Margem Média Realizada
    const averageMargin = 38.6;

    // Dados para os micro-gráficos Recharts
    const hourlyRevenueData = [
      { hora: '08h', valor: Math.round(dailyRevenue * 0.08) },
      { hora: '10h', valor: Math.round(dailyRevenue * 0.18) },
      { hora: '12h', valor: Math.round(dailyRevenue * 0.14) },
      { hora: '14h', valor: Math.round(dailyRevenue * 0.28) },
      { hora: '16h', valor: Math.round(dailyRevenue * 0.20) },
      { hora: '18h', valor: Math.round(dailyRevenue * 0.12) },
    ];

    const piecesSoldTrend = [
      { dia: 'Seg', qtd: Math.round(totalPiecesSold * 0.75) },
      { dia: 'Ter', qtd: Math.round(totalPiecesSold * 0.88) },
      { dia: 'Qua', qtd: Math.round(totalPiecesSold * 0.82) },
      { dia: 'Qui', qtd: Math.round(totalPiecesSold * 1.05) },
      { dia: 'Sex', qtd: Math.round(totalPiecesSold * 1.15) },
      { dia: 'Sáb', qtd: Math.round(totalPiecesSold * 0.65) },
      { dia: 'Hoje', qtd: totalPiecesSold },
    ];

    const ticketTrendData = [
      { periodo: 'D-6', ticket: Math.round(averageTicket * 0.90) },
      { periodo: 'D-5', ticket: Math.round(averageTicket * 0.94) },
      { periodo: 'D-4', ticket: Math.round(averageTicket * 0.92) },
      { periodo: 'D-3', ticket: Math.round(averageTicket * 1.04) },
      { periodo: 'D-2', ticket: Math.round(averageTicket * 0.98) },
      { periodo: 'D-1', ticket: Math.round(averageTicket * 1.02) },
      { periodo: 'Hoje', ticket: Math.round(averageTicket) },
    ];

    const marginTrendData = [
      { ponto: 'P1', margem: 36.5 },
      { ponto: 'P2', margem: 37.8 },
      { ponto: 'P3', margem: 37.2 },
      { ponto: 'P4', margem: 38.9 },
      { ponto: 'P5', margem: 38.4 },
      { ponto: 'Hoje', margem: averageMargin },
    ];

    return {
      dailyRevenue,
      totalPiecesSold,
      averageTicket,
      averageMargin,
      ordersCount,
      hourlyRevenueData,
      piecesSoldTrend,
      ticketTrendData,
      marginTrendData,
    };
  }, [orders]);

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
              className="flex items-center justify-center gap-2 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-3 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
            >
              <FileCode2 className="w-4 h-4 fill-slate-950" />
              <span>Importar XML de Compra</span>
            </button>

            <button
              type="button"
              id="dash-btn-open-quote"
              onClick={() => onNavigate('cotacao')}
              className="flex items-center justify-center gap-2 bg-[#0284C7] hover:bg-[#0284C7]/90 text-white font-bold text-xs px-5 py-3 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-white" />
              <span>Nova Cotação de Balcão</span>
            </button>

            <button
              type="button"
              id="dash-btn-open-os"
              onClick={() => onNavigate('ordem-servico')}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-3 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-white" />
              <span>Ordem de Serviço (Oficina)</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRICS STRIP COM GRÁFICOS RECHARTS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Indicadores Chave de Desempenho (KPIs do Dia)
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Atualizado em tempo real
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* KPI 1: Faturamento do Dia (com AreaChart Recharts) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 border-b-4 border-b-[#0284C7] flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#0284C7]" /> Faturamento do Dia
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +14.8%
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-2 font-mono">
                R$ {kpis.dailyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {kpis.ordersCount} pedidos faturados hoje
              </p>
            </div>

            {/* Micro Gráfico Recharts de Evolução por Hora */}
            <div className="h-14 mt-3 w-full -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpis.hourlyRevenueData} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284C7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0284C7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F172A', 
                      borderColor: '#1E293B', 
                      borderRadius: '8px', 
                      color: '#F8FAFC', 
                      fontSize: '10px',
                      padding: '4px 8px' 
                    }}
                    formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, 'Faturamento']}
                    labelFormatter={(label) => `Horário: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#0284C7" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#revenueGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Meta diária: R$ 15.000,00</span>
              <span className="text-emerald-600 font-bold">123% atingida</span>
            </div>
          </div>

          {/* KPI 2: Quantidade de Peças Vendidas (com BarChart Recharts) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 border-b-4 border-b-[#F59E0B] flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#F59E0B]" /> Peças Vendidas
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200/60 flex items-center gap-0.5">
                  <Boxes className="w-3 h-3" /> Hoje
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-2 font-mono">
                {kpis.totalPiecesSold} <span className="text-sm font-semibold text-slate-500">unidades</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Saídas de balcão e marketplaces
              </p>
            </div>

            {/* Micro Gráfico Recharts de Volume Semanal */}
            <div className="h-14 mt-3 w-full -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.piecesSoldTrend} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F172A', 
                      borderColor: '#1E293B', 
                      borderRadius: '8px', 
                      color: '#F8FAFC', 
                      fontSize: '10px',
                      padding: '4px 8px' 
                    }}
                    formatter={(val: any) => [`${val} un`, 'Peças Vendidas']}
                    labelFormatter={(label) => `Dia: ${label}`}
                  />
                  <Bar 
                    dataKey="qtd" 
                    fill="#F59E0B" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Total em estoque: {totalStockUnits.toLocaleString()} un</span>
              <span className="text-amber-600 font-bold font-mono">Giro rápido</span>
            </div>
          </div>

          {/* KPI 3: Ticket Médio de Vendas (com LineChart Recharts) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 border-b-4 border-b-indigo-600 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-indigo-600" /> Ticket Médio
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200/60 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +6.4%
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-2 font-mono">
                R$ {kpis.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Valor médio por pedido faturado
              </p>
            </div>

            {/* Micro Gráfico Recharts de Linha com Curva Suave */}
            <div className="h-14 mt-3 w-full -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpis.ticketTrendData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F172A', 
                      borderColor: '#1E293B', 
                      borderRadius: '8px', 
                      color: '#F8FAFC', 
                      fontSize: '10px',
                      padding: '4px 8px' 
                    }}
                    formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Ticket Médio']}
                    labelFormatter={(label) => `Período: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ticket" 
                    stroke="#4F46E5" 
                    strokeWidth={2.5} 
                    dot={{ r: 2, fill: '#4F46E5' }} 
                    activeDot={{ r: 4, fill: '#6366F1' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Balcão: R$ 435,00</span>
              <span className="text-slate-400">Mkt: R$ 260,00</span>
            </div>
          </div>

          {/* KPI 4: Margem Média & Valor em Estoque */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 border-b-4 border-b-emerald-500 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-emerald-600" /> Margem Média
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60">
                  Markup Ativo
                </span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 mt-2 font-mono">
                {kpis.averageMargin}%
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Estoque ativo: R$ 482.903,20
              </p>
            </div>

            {/* Micro Gráfico Recharts de Margem */}
            <div className="h-14 mt-3 w-full -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpis.marginTrendData} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0F172A', 
                      borderColor: '#1E293B', 
                      borderRadius: '8px', 
                      color: '#F8FAFC', 
                      fontSize: '10px',
                      padding: '4px 8px' 
                    }}
                    formatter={(val: any) => [`${val}%`, 'Margem Bruta']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="margem" 
                    stroke="#10B981" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#marginGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">PIS/COFINS Monofásico</span>
              <span className="text-emerald-600 font-bold">CST 04 Alíq. Zero</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Low Stock Alert & Recent Orders with Clean Minimalist Table Styling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Low Stock Items & Picking Locations (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
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
                    className="text-[10px] font-bold text-[#0284C7] hover:text-[#0C4A6E] underline cursor-pointer"
                  >
                    Cotar no Balcão
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Recent Multi-Channel Orders (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
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
                className="px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded uppercase hover:bg-emerald-600 transition cursor-pointer"
              >
                Nova Venda
              </button>
              <button
                type="button"
                onClick={() => onNavigate('pedidos')}
                className="px-2.5 py-1 bg-sky-50 text-[#0284C7] text-[10px] font-bold rounded uppercase hover:bg-sky-100 transition cursor-pointer"
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
                    {ord.items.length} item(ns) • {ord.shippingCity || 'Balcão Matriz'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-mono font-black text-slate-900 block">
                    R$ {(ord.totalAmount || ord.total || 0).toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-0.5 border border-emerald-100">
                    {(ord.status || 'Pago').toUpperCase()}
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
