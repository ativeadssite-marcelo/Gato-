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
import { Product, Order, InvoiceRecord, BranchUnit } from '../types';
import { demoAddon, USE_SEED_DATA } from '../utils/seedMode';
import { VisualReportsOverview } from './VisualReportsOverview';

interface DashboardOverviewProps {
  products: Product[];
  orders: Order[];
  invoices: InvoiceRecord[];
  branches?: BranchUnit[];
  onNavigate: (view: any) => void;
  onSelectProductForQuote: (product: Product) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  products,
  orders,
  invoices,
  branches,
  onNavigate,
  onSelectProductForQuote,
}) => {
  const lowStockProducts = products.filter(p => p.stock <= p.minStock);
  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);
  // Valor do estoque a preço de venda — é o que substitui o número fixo da demonstração
  // quando o modo base limpa está ligado.
  const stockValue = products.reduce((acc, p) => acc + p.stock * (p.sellingPrice || 0), 0);

  // Cálculos dinâmicos dos Indicadores Chave de Desempenho (KPIs)
  const kpis = useMemo(() => {
    // 1. Faturamento do Dia
    const baseRevenueFromOrders = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const dailyRevenue =
      baseRevenueFromOrders > 0 ? baseRevenueFromOrders + demoAddon(7820.00) : demoAddon(18450.00);

    // 2. Quantidade de Peças Vendidas
    const piecesCountFromOrders = orders.reduce((acc, o) => {
      return acc + (o.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
    }, 0);
    const totalPiecesSold = piecesCountFromOrders > 0 ? piecesCountFromOrders + demoAddon(64) : demoAddon(148);

    // 3. Ticket Médio de Vendas
    const ordersCount = Math.max(orders.length, 1) + demoAddon(26);
    const averageTicket = dailyRevenue / ordersCount;

    // 4. Margem Média Realizada
    const averageMargin = demoAddon(38.6);

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
      {/* Hero Welcome Banner — Estilo Editorial Soft da Referência (Card Branco + Destaque Coral/Peach) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EAECF0] shadow-[0_4px_20px_-2px_rgba(16,24,40,0.05)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#1E232A] tracking-tight">
              Controle Total: Autopeças, Moto, Caminhão & Agrícola
            </h1>
            <p className="text-xs text-[#475467] mt-0.5">
              Gestão integrada de estoque, XML de compra, cotação rápida por UF e emissão fiscal.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F97B72] text-white text-[11px] font-extrabold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>GATO SaaS • Tempo Real</span>
          </span>
        </div>

        {/* Inner Coral-Peach Highlight Banner (como o card superior da imagem de referência) */}
        <div className="ref-banner-coral rounded-2xl p-5 sm:p-6 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider">
                Operação de Balcão & Estoque
              </span>
              <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                R$ {kpis.dailyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-white/90 leading-relaxed">
                Importação sequencial de XML de compra, cotação rápida com impostos por UF e margens por perfil de cliente, emissão de NF-e e sincronização multi-loja.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
              <button
                type="button"
                id="dash-btn-import-xml"
                onClick={() => onNavigate('xml-import')}
                className="flex items-center justify-center gap-2 bg-[#1E1E2D] hover:bg-[#11111A] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <FileCode2 className="w-4 h-4 text-white" />
                <span>Importar XML de Compra</span>
              </button>

              <button
                type="button"
                id="dash-btn-open-quote"
                onClick={() => onNavigate('cotacao')}
                className="flex items-center justify-center gap-2 bg-[#6E7BF2] hover:bg-[#5B68E6] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-white" />
                <span>Nova Cotação de Balcão</span>
              </button>

              <button
                type="button"
                id="dash-btn-open-os"
                onClick={() => onNavigate('ordem-servico')}
                className="flex items-center justify-center gap-2 bg-[#529471] hover:bg-[#448261] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Wrench className="w-4 h-4 text-white" />
                <span>Ordem de Serviço (Oficina)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI METRICS STRIP — PALETA DA REFERÊNCIA (SAGE GREEN, CORAL PEACH, PERIWINKLE BLUE, WHITE CARD) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#529471] animate-pulse" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#1E232A]">
              Indicadores Chave de Desempenho (KPIs do Dia)
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-[#475467]">
            Atualizado em tempo real
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* KPI 1: Card Sage Green (#529471) igual à referência */}
          <div className="ref-card-sage p-5 rounded-3xl flex flex-col justify-between transition-transform hover:-translate-y-0.5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/90 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-white" /> Faturamento do Dia
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +14.8%
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mt-2 font-mono">
                R$ {kpis.dailyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-white/85 mt-0.5">
                {kpis.ordersCount} pedidos faturados hoje
              </p>
            </div>

            <div className="h-14 mt-3 w-full -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpis.hourlyRevenueData} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E1E2D', 
                      borderColor: '#2E2E42', 
                      borderRadius: '10px', 
                      color: '#FFFFFF', 
                      fontSize: '10px',
                      padding: '4px 8px' 
                    }}
                    formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, 'Faturamento']}
                    labelFormatter={(label) => `Horário: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="#FFFFFF" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#revenueGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-[10px]">
              <span className="text-white/85">Meta diária: R$ 15.000,00</span>
              <span className="text-white font-extrabold">
                {USE_SEED_DATA ? '123% atingida' : `${Math.round((kpis.dailyRevenue / 15000) * 100)}% atingida`}
              </span>
            </div>
          </div>

          {/* KPI 2: Card Coral-Peach (#FB925A) igual à referência */}
          <div className="ref-card-peach p-5 rounded-3xl flex flex-col justify-between transition-transform hover:-translate-y-0.5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/90 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-white" /> Peças Vendidas
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold flex items-center gap-0.5">
                  <Boxes className="w-3 h-3" /> Hoje
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mt-2 font-mono">
                {kpis.totalPiecesSold} <span className="text-sm font-semibold text-white/90">unidades</span>
              </h3>
              <p className="text-[11px] text-white/85 mt-0.5">
                Saídas de balcão e marketplaces
              </p>
            </div>

            <div className="h-14 mt-3 w-full -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpis.piecesSoldTrend} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E1E2D', 
                      borderColor: '#2E2E42', 
                      borderRadius: '10px', 
                      color: '#FFFFFF', 
                      fontSize: '10px',
                      padding: '4px 8px' 
                    }}
                    formatter={(val: any) => [`${val} un`, 'Peças Vendidas']}
                    labelFormatter={(label) => `Dia: ${label}`}
                  />
                  <Bar 
                    dataKey="qtd" 
                    fill="#FFFFFF" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-[10px]">
              <span className="text-white/85">Total em estoque: {totalStockUnits.toLocaleString()} un</span>
              <span className="text-white font-extrabold font-mono">Giro rápido</span>
            </div>
          </div>

          {/* KPI 3: Card Periwinkle Blue (#6E7BF2) igual à referência */}
          <div className="ref-card-blue p-5 rounded-3xl flex flex-col justify-between transition-transform hover:-translate-y-0.5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/90 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-white" /> Ticket Médio
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +6.4%
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mt-2 font-mono">
                R$ {kpis.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[11px] text-white/85 mt-0.5">
                Valor médio por pedido faturado
              </p>
            </div>

            <div className="h-14 mt-3 w-full -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpis.ticketTrendData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E1E2D', 
                      borderColor: '#2E2E42', 
                      borderRadius: '10px', 
                      color: '#FFFFFF', 
                      fontSize: '10px',
                      padding: '4px 8px' 
                    }}
                    formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, 'Ticket Médio']}
                    labelFormatter={(label) => `Período: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ticket" 
                    stroke="#FFFFFF" 
                    strokeWidth={2.5} 
                    dot={{ r: 2, fill: '#FFFFFF' }} 
                    activeDot={{ r: 4, fill: '#FFFFFF' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-[10px]">
              <span className="text-white/85">Balcão: R$ 435,00</span>
              <span className="text-white/95 font-bold">Mkt: R$ 260,00</span>
            </div>
          </div>

          {/* KPI 4: Card Charcoal Dark (#1E1E2D) igual aos cards escuros de destaque da referência */}
          <div className="ref-card-charcoal p-5 rounded-3xl flex flex-col justify-between transition-transform hover:-translate-y-0.5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/90 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Percent className="w-3.5 h-3.5 text-[#F97B72]" /> Margem Média
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#F97B72] text-white text-[10px] font-extrabold">
                  Markup Ativo
                </span>
              </div>
              <h3 className="text-2xl font-black text-white mt-2 font-mono">
                {kpis.averageMargin}%
              </h3>
              <p className="text-[11px] text-white/80 mt-0.5">
                Estoque ativo: R$ {USE_SEED_DATA
                  ? '482.903,20'
                  : stockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="h-14 mt-3 w-full -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kpis.marginTrendData} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97B72" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#F97B72" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E1E2D', 
                      borderColor: '#2E2E42', 
                      borderRadius: '10px', 
                      color: '#FFFFFF', 
                      fontSize: '10px',
                      padding: '4px 8px' 
                    }}
                    formatter={(val: any) => [`${val}%`, 'Margem Bruta']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="margem" 
                    stroke="#F97B72" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#marginGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 pt-2 border-t border-white/15 flex items-center justify-between text-[10px]">
              <span className="text-white/80">PIS/COFINS Monofásico</span>
              <span className="text-white font-extrabold">CST 04 Alíq. Zero</span>
            </div>
          </div>
        </div>
      </div>

      {/* RELATÓRIO VISUAL: VOLUME DE VENDAS POR FILIAL & CRESCIMENTO DE ESTOQUE (30 DIAS) */}
      <VisualReportsOverview
        products={products}
        orders={orders}
        branches={branches}
        onNavigate={onNavigate}
      />

      {/* Main Grid: Low Stock Alert & Recent Orders with Balanced Modern Corners */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Low Stock Items & Picking Locations (6 Cols) */}
        <div className="lg:col-span-6 bg-white rounded-lg p-5 shadow-xs border border-slate-200 border-t-2 border-t-[#F59E0B] flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center">
              <span className="w-2 h-4 bg-[#F59E0B] rounded-sm mr-2 inline-block" />
              <h2 className="text-sm font-bold text-slate-800">
                Alerta de Reposição & Locação de Estoque
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
              {lowStockProducts.length} itens críticos
            </span>
          </div>

          <div className="space-y-2.5">
            {lowStockProducts.map((prod) => (
              <div 
                key={prod.id} 
                className="p-3 bg-slate-50/80 hover:bg-sky-50/50 border border-slate-200 rounded-md flex items-center justify-between gap-3 text-xs transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold bg-white text-slate-900 px-1.5 py-0.5 rounded-sm border border-slate-300">
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
                  <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-sm border border-rose-300">
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
        <div className="lg:col-span-6 bg-white rounded-lg p-5 shadow-xs border border-slate-200 border-t-2 border-t-[#0284C7] flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center">
              <span className="w-2 h-4 bg-[#0284C7] rounded-sm mr-2 inline-block" />
              <h2 className="text-sm font-bold text-slate-800">
                Últimos Pedidos dos Canais Integrados
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('cotacao')}
                className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-md uppercase hover:bg-emerald-700 transition cursor-pointer"
              >
                Nova Venda
              </button>
              <button
                type="button"
                onClick={() => onNavigate('pedidos')}
                className="px-2.5 py-1 bg-sky-50 text-[#0284C7] text-[10px] font-bold rounded-md uppercase hover:bg-sky-100 border border-sky-200 transition cursor-pointer"
              >
                Ver todos ({orders.length})
              </button>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            {recentOrders.map((ord) => (
              <div 
                key={ord.id} 
                className="p-3 bg-slate-50/80 hover:bg-sky-50/50 border border-slate-200 rounded-md flex items-center justify-between gap-2 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">#{ord.id}</span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded-sm bg-white border border-slate-300 text-slate-700">
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
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm inline-block mt-0.5 border border-emerald-200">
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
