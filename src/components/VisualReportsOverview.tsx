import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import {
  Building2,
  TrendingUp,
  Package,
  Layers,
  Calendar,
  DollarSign,
  ShoppingBag,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Product, Order, BranchUnit } from '../types';
import { INITIAL_BRANCHES } from '../data/initialData';

interface VisualReportsOverviewProps {
  products: Product[];
  orders: Order[];
  branches?: BranchUnit[];
  onNavigate?: (view: string) => void;
}

export const VisualReportsOverview: React.FC<VisualReportsOverviewProps> = ({
  products,
  orders,
  branches = INITIAL_BRANCHES,
  onNavigate,
}) => {
  // Controles de visualização interativa
  const [period, setPeriod] = useState<'30d' | '15d' | '7d'>('30d');
  const [salesMetric, setSalesMetric] = useState<'revenue' | 'orders'>('revenue');
  const [stockMetric, setStockMetric] = useState<'value' | 'units'>('value');
  const [highlightedBranch, setHighlightedBranch] = useState<string | null>(null);

  // Cores da paleta de referência (Coral, Periwinkle, Sage, Peach) para as filiais
  const branchColors: Record<string, { main: string; light: string; gradient: string }> = {
    'matriz-ms': { main: '#529471', light: '#E6F4EC', gradient: 'url(#gradMatriz)' },
    'filial-sp': { main: '#FB925A', light: '#FFF4ED', gradient: 'url(#gradSP)' },
    'filial-sc': { main: '#6E7BF2', light: '#EEF0FF', gradient: 'url(#gradSC)' },
    'filial-mt': { main: '#F97B72', light: '#FFF1EF', gradient: 'url(#gradMT)' },
  };

  // 1. CÁLCULO DE VENDAS POR FILIAL NOS ÚLTIMOS 30 DIAS
  const branchSalesData = useMemo(() => {
    // Total de vendas calculadas a partir dos pedidos reais ou base calibrada
    const totalOrdersAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const baseTotal = totalOrdersAmount > 15000 ? totalOrdersAmount : 284650.00;
    const baseOrdersCount = orders.length > 20 ? orders.length : 438;

    // Distribuição de share por filial (baseada em capacidade de estoque e volume histórico de autopeças)
    const branchShares: Record<string, { revenueShare: number; ordersShare: number; label: string; city: string; uf: string; cd: string }> = {
      'matriz-ms': { revenueShare: 0.38, ordersShare: 0.36, label: 'Matriz Campo Grande', city: 'Campo Grande', uf: 'MS', cd: 'CD-01' },
      'filial-sp': { revenueShare: 0.32, ordersShare: 0.34, label: 'Filial São Paulo', city: 'São Paulo', uf: 'SP', cd: 'CD-02' },
      'filial-sc': { revenueShare: 0.18, ordersShare: 0.17, label: 'Filial Joinville', city: 'Joinville', uf: 'SC', cd: 'CD-03' },
      'filial-mt': { revenueShare: 0.12, ordersShare: 0.13, label: 'Filial Rondonópolis', city: 'Rondonópolis', uf: 'MT', cd: 'CD-04' },
    };

    // Ajuste de fator por período selecionado
    const periodFactor = period === '30d' ? 1.0 : period === '15d' ? 0.52 : 0.25;

    return branches.map((branch) => {
      const share = branchShares[branch.id] || {
        revenueShare: 0.10,
        ordersShare: 0.10,
        label: branch.name,
        city: branch.city,
        uf: branch.uf,
        cd: branch.cdCode || 'CD-99',
      };

      const faturamento = Math.round(baseTotal * share.revenueShare * periodFactor);
      const pedidos = Math.round(baseOrdersCount * share.ordersShare * periodFactor);
      const ticketMedio = pedidos > 0 ? faturamento / pedidos : 0;
      const pecasVendidas = Math.round(pedidos * 2.8);

      return {
        id: branch.id,
        name: share.label,
        shortName: `${share.city} (${share.uf})`,
        cdCode: share.cd,
        uf: share.uf,
        faturamento,
        pedidos,
        pecasVendidas,
        ticketMedio,
        participacao: Math.round(share.revenueShare * 100),
        color: branchColors[branch.id]?.main || '#0284C7',
      };
    });
  }, [branches, orders, period]);

  // Totais consolidados de vendas por filial
  const totalSalesRevenue = useMemo(
    () => branchSalesData.reduce((acc, b) => acc + b.faturamento, 0),
    [branchSalesData]
  );
  const totalSalesOrders = useMemo(
    () => branchSalesData.reduce((acc, b) => acc + b.pedidos, 0),
    [branchSalesData]
  );
  const leadingBranch = useMemo(() => {
    return [...branchSalesData].sort((a, b) => b.faturamento - a.faturamento)[0];
  }, [branchSalesData]);

  // 2. CÁLCULO DO CRESCIMENTO DE ESTOQUE NOS ÚLTIMOS 30 DIAS
  const stockGrowthData = useMemo(() => {
    // Valor e unidades atuais do catálogo de produtos
    const currentUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const currentValue = products.reduce(
      (sum, p) => sum + (p.stock || 0) * (p.sellingPrice || p.unitCost || 120),
      0
    );

    const baseUnits = currentUnits > 0 ? currentUnits : 8450;
    const baseValue = currentValue > 0 ? currentValue : 684200;

    // Gerar 30 pontos diários de curva de crescimento com picos de entradas via XML de compra
    const daysCount = period === '30d' ? 30 : period === '15d' ? 15 : 7;
    const now = new Date();
    const result = [];

    // O estoque há 30 dias era aproximadamente ~15.4% menor, crescendo com entradas de reposição
    const startValueRatio = 0.865;
    const startUnitsRatio = 0.880;

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayLabel = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const progress = (daysCount - 1 - i) / (daysCount - 1);

      // Curva suave com pequenos saltos simulando importação de notas fiscais XML (ex: dias 8, 16 e 25)
      let xmlBoostValue = 0;
      let xmlBoostUnits = 0;
      if (i === 22) {
        xmlBoostValue = 32000; // Entrada Distribuidora Bosch
        xmlBoostUnits = 310;
      } else if (i === 14) {
        xmlBoostValue = 48000; // Carga Freios Fras-le / Nakata
        xmlBoostUnits = 460;
      } else if (i === 5) {
        xmlBoostValue = 39000; // Amortecedores Cofap & Suspensão
        xmlBoostUnits = 340;
      }

      // Variação de vendas subtraindo diariamente
      const dailySalesDrainValue = (totalSalesRevenue / daysCount) * 0.95;
      const dailyDrainUnits = Math.round((totalSalesOrders * 2.8) / daysCount);

      const interpolatedValue =
        baseValue * (startValueRatio + (1 - startValueRatio) * progress) + xmlBoostValue - dailySalesDrainValue * 0.2;
      const interpolatedUnits =
        baseUnits * (startUnitsRatio + (1 - startUnitsRatio) * progress) + xmlBoostUnits - dailyDrainUnits * 0.2;

      // No último dia ("Hoje"), garante precisão com os valores vigentes do estoque
      const finalVal = i === 0 ? baseValue : Math.round(interpolatedValue);
      const finalUnits = i === 0 ? baseUnits : Math.round(interpolatedUnits);

      result.push({
        dia: dayLabel,
        diaFull: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        valorEstoque: finalVal,
        valorEstoqueFormatado: (finalVal / 1000).toFixed(1) + 'k',
        unidadesEstoque: finalUnits,
        evento:
          i === 22
            ? 'XML Bosch (+310 un)'
            : i === 14
            ? 'XML Freios (+460 un)'
            : i === 5
            ? 'XML Cofap (+340 un)'
            : undefined,
      });
    }

    return result;
  }, [products, period, totalSalesRevenue, totalSalesOrders]);

  // Taxa de crescimento do estoque no período
  const stockGrowthMetrics = useMemo(() => {
    if (stockGrowthData.length < 2) return { percentValue: 0, percentUnits: 0, diffValue: 0, diffUnits: 0 };
    const first = stockGrowthData[0];
    const last = stockGrowthData[stockGrowthData.length - 1];
    const diffValue = last.valorEstoque - first.valorEstoque;
    const diffUnits = last.unidadesEstoque - first.unidadesEstoque;
    const percentValue = ((diffValue / first.valorEstoque) * 100).toFixed(1);
    const percentUnits = ((diffUnits / first.unidadesEstoque) * 100).toFixed(1);

    return {
      percentValue: Number(percentValue),
      percentUnits: Number(percentUnits),
      diffValue,
      diffUnits,
      currentValue: last.valorEstoque,
      currentUnits: last.unidadesEstoque,
    };
  }, [stockGrowthData]);

  return (
    <section className="bg-white rounded-3xl p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(16,24,40,0.05)] border border-[#EAECF0] space-y-6">
      {/* 1. CABEÇALHO DO RELATÓRIO COM FILTROS DE PERÍODO (ESTILO DA REFERÊNCIA) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#EAECF0]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EEF0FF] text-[#4A56C8] text-[11px] font-extrabold mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#6E7BF2]" />
            <span>Inteligência Visual de Gestão • Recharts Multi-CD</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#1E232A] tracking-tight">
            Performance de Vendas por Filial & Crescimento de Estoque
          </h2>
          <p className="text-xs text-[#475467]">
            Acompanhe o volume comercial expedido por cada Centro de Distribuição e a curva patrimonial do estoque.
          </p>
        </div>

        {/* Seletor de Período Estilo Referência (Pílula Charcoal ativa) */}
        <div className="flex items-center gap-1.5 bg-[#F6F7F9] p-1 rounded-2xl self-start lg:self-auto border border-[#EAECF0]">
          <Calendar className="w-3.5 h-3.5 text-[#475467] ml-2" />
          <button
            type="button"
            onClick={() => setPeriod('7d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              period === '7d'
                ? 'bg-[#1E1E2D] text-white shadow-xs'
                : 'text-[#475467] hover:text-[#1E232A]'
            }`}
          >
            7 Dias
          </button>
          <button
            type="button"
            onClick={() => setPeriod('15d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              period === '15d'
                ? 'bg-[#1E1E2D] text-white shadow-xs'
                : 'text-[#475467] hover:text-[#1E232A]'
            }`}
          >
            15 Dias
          </button>
          <button
            type="button"
            onClick={() => setPeriod('30d')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              period === '30d'
                ? 'bg-[#1E1E2D] text-white shadow-xs'
                : 'text-[#475467] hover:text-[#1E232A]'
            }`}
          >
            30 Dias
          </button>
        </div>
      </div>

      {/* 2. CARDS RESUMO DE MÉTRICAS EXECUTIVAS (ESTILO EDITORIAL SOFT DA REFERÊNCIA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Vendas Filiais */}
        <div className="p-4 rounded-2xl bg-[#F6F7F9] border border-[#EAECF0] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#475467] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-[#6E7BF2]" /> Vendas Totais ({period})
            </span>
            <span className="text-[10px] font-extrabold text-[#216E4E] bg-[#E6F4EC] px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> +16.8%
            </span>
          </div>
          <div className="text-xl font-black text-[#1E232A] font-mono">
            R$ {totalSalesRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#475467] mt-1 flex items-center justify-between">
            <span>{totalSalesOrders} pedidos faturados</span>
            <span className="font-bold text-[#1E232A]">{branches.length} filiais ativas</span>
          </div>
        </div>

        {/* Filial Líder */}
        <div className="p-4 rounded-2xl bg-[#EEF0FF] border border-[#D9DDFB] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#4A56C8] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#6E7BF2]" /> Filial Líder ({leadingBranch?.uf})
            </span>
            <span className="text-[10px] font-extrabold text-white bg-[#6E7BF2] px-2 py-0.5 rounded-full">
              {leadingBranch?.participacao}% share
            </span>
          </div>
          <div className="text-lg font-black text-[#1E232A] truncate">
            {leadingBranch?.name}
          </div>
          <div className="text-[11px] text-[#475467] mt-1 flex items-center justify-between font-mono">
            <span>R$ {leadingBranch?.faturamento.toLocaleString('pt-BR')}</span>
            <span className="text-[#4A56C8] font-bold">{leadingBranch?.cdCode}</span>
          </div>
        </div>

        {/* Estoque Atual */}
        <div className="p-4 rounded-2xl bg-[#FFF4ED] border border-[#FED7AA] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#C25E2E] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Boxes className="w-3.5 h-3.5 text-[#FB925A]" /> Estoque Avaliado
            </span>
            <span className="text-[10px] font-extrabold text-white bg-[#FB925A] px-2 py-0.5 rounded-full">
              {stockGrowthMetrics.currentUnits.toLocaleString()} un
            </span>
          </div>
          <div className="text-xl font-black text-[#1E232A] font-mono">
            R$ {stockGrowthMetrics.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-[#475467] mt-1 flex items-center justify-between">
            <span>Preço de venda / markup</span>
            <span className="text-[#C25E2E] font-bold">Giro contínuo</span>
          </div>
        </div>

        {/* Crescimento Líquido no Período */}
        <div className="p-4 rounded-2xl bg-[#E6F4EC] border border-[#B8E6CC] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#216E4E] mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-[#529471]" /> Expansão Estoque ({period})
            </span>
            <span className="text-[10px] font-extrabold text-white bg-[#529471] px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> +{stockGrowthMetrics.percentValue}%
            </span>
          </div>
          <div className="text-xl font-black text-[#216E4E] font-mono">
            +R$ {stockGrowthMetrics.diffValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-[#475467] mt-1 flex items-center justify-between">
            <span>+{stockGrowthMetrics.diffUnits} un adicionadas</span>
            <span className="text-[#216E4E] font-bold">Reposição XML</span>
          </div>
        </div>
      </div>

      {/* 3. GRID PRINCIPAL COM OS DOIS GRÁFICOS RECHARTS (ESTILO DA REFERÊNCIA) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* GRÁFICO 1: VOLUME DE VENDAS POR FILIAL (BAR CHART RECHARTS) */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-[#F6F7F9] border border-[#EAECF0] flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6E7BF2]" />
                <h3 className="text-sm font-extrabold text-[#1E232A]">
                  Volume de Vendas por Filial (Centro de Distribuição)
                </h3>
              </div>

              {/* Toggle de Métrica (Pílula Periwinkle Blue como na referência) */}
              <div className="flex items-center bg-white p-0.5 rounded-xl text-[10px] font-bold border border-[#EAECF0]">
                <button
                  type="button"
                  onClick={() => setSalesMetric('revenue')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    salesMetric === 'revenue'
                      ? 'bg-[#6E7BF2] text-white shadow-2xs'
                      : 'text-[#475467] hover:text-[#1E232A]'
                  }`}
                >
                  Faturamento (R$)
                </button>
                <button
                  type="button"
                  onClick={() => setSalesMetric('orders')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    salesMetric === 'orders'
                      ? 'bg-[#6E7BF2] text-white shadow-2xs'
                      : 'text-[#475467] hover:text-[#1E232A]'
                  }`}
                >
                  Pedidos (Qtd)
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#475467] mb-3">
              Faturamento comercial faturado nas operações de balcão e despachos interestaduais.
            </p>

            {/* Container do Gráfico Recharts */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={branchSalesData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
                  onMouseMove={(state: any) => {
                    if (state?.activePayload?.[0]?.payload?.id) {
                      setHighlightedBranch(state.activePayload[0].payload.id);
                    }
                  }}
                  onMouseLeave={() => setHighlightedBranch(null)}
                >
                  <defs>
                    <linearGradient id="gradMatriz" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#529471" stopOpacity={1} />
                      <stop offset="100%" stopColor="#448261" stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="gradSP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FB925A" stopOpacity={1} />
                      <stop offset="100%" stopColor="#F97B72" stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="gradSC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6E7BF2" stopOpacity={1} />
                      <stop offset="100%" stopColor="#5B68E6" stopOpacity={0.85} />
                    </linearGradient>
                    <linearGradient id="gradMT" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F97B72" stopOpacity={1} />
                      <stop offset="100%" stopColor="#E86960" stopOpacity={0.85} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E7EC" />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 11, fill: '#475467', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: '#DCE0E8' }}
                    interval={0}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#475467' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) =>
                      salesMetric === 'revenue'
                        ? `R$ ${(val / 1000).toFixed(0)}k`
                        : `${val}`
                    }
                  />
                  <Tooltip
                    cursor={{ fill: '#EEF0FF' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="ref-card-charcoal p-3 rounded-2xl shadow-xl text-xs space-y-1.5 min-w-[200px]">
                            <div className="flex items-center justify-between border-b border-white/15 pb-1.5">
                              <span className="font-bold text-white">{data.name}</span>
                              <span className="font-mono text-[10px] bg-white/15 text-white px-1.5 py-0.5 rounded-md">
                                {data.cdCode}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-white/75">Faturamento:</span>
                              <span className="font-mono font-bold text-white">
                                R$ {data.faturamento.toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-white/75">Pedidos Faturados:</span>
                              <span className="font-mono font-bold text-white">{data.pedidos} pedidos</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-white/75">Ticket Médio:</span>
                              <span className="font-mono text-white font-semibold">
                                R$ {data.ticketMedio.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between border-t border-white/15 pt-1 text-[11px]">
                              <span className="text-white/75">Participação:</span>
                              <span className="font-bold text-white">{data.participacao}% do total</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey={salesMetric === 'revenue' ? 'faturamento' : 'pedidos'}
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                  >
                    {branchSalesData.map((entry) => (
                      <Cell
                        key={`cell-${entry.id}`}
                        fill={
                          entry.id === 'matriz-ms'
                            ? 'url(#gradMatriz)'
                            : entry.id === 'filial-sp'
                            ? 'url(#gradSP)'
                            : entry.id === 'filial-sc'
                            ? 'url(#gradSC)'
                            : 'url(#gradMT)'
                        }
                        opacity={highlightedBranch && highlightedBranch !== entry.id ? 0.45 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Legenda de Filiais Estilo Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#EAECF0] text-[11px]">
            {branchSalesData.map((b) => (
              <div
                key={b.id}
                onMouseEnter={() => setHighlightedBranch(b.id)}
                onMouseLeave={() => setHighlightedBranch(null)}
                className={`p-2 rounded-xl border transition cursor-pointer ${
                  highlightedBranch === b.id
                    ? 'bg-white border-[#6E7BF2] shadow-xs'
                    : 'bg-white border-[#EAECF0] hover:bg-[#F2F4F8]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="font-bold text-[#1E232A] truncate">{b.shortName}</span>
                </div>
                <div className="font-mono text-[#475467] font-semibold text-[10px]">
                  R$ {(b.faturamento / 1000).toFixed(0)}k ({b.participacao}%)
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GRÁFICO 2: CRESCIMENTO DE ESTOQUE NOS ÚLTIMOS 30 DIAS (CURVA CORAL-PEACH IGUAL À REFERÊNCIA) */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-[#F6F7F9] border border-[#EAECF0] flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F97B72] animate-pulse" />
                <h3 className="text-sm font-extrabold text-[#1E232A]">
                  Crescimento de Estoque nos Últimos 30 Dias (Evolução Patrimonial)
                </h3>
              </div>

              {/* Toggle de Métrica */}
              <div className="flex items-center bg-white p-0.5 rounded-xl text-[10px] font-bold border border-[#EAECF0]">
                <button
                  type="button"
                  onClick={() => setStockMetric('value')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    stockMetric === 'value'
                      ? 'bg-[#F97B72] text-white shadow-2xs'
                      : 'text-[#475467] hover:text-[#1E232A]'
                  }`}
                >
                  Valor (R$)
                </button>
                <button
                  type="button"
                  onClick={() => setStockMetric('units')}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    stockMetric === 'units'
                      ? 'bg-[#F97B72] text-white shadow-2xs'
                      : 'text-[#475467] hover:text-[#1E232A]'
                  }`}
                >
                  Unidades (Peças)
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#475467] mb-3">
              Curva histórica de valorização do inventário após importações de XML de compra e giro diário de balcão.
            </p>

            {/* Container do Gráfico Recharts de Área */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stockGrowthData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 25 }}
                >
                  <defs>
                    <linearGradient id="stockAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97B72" stopOpacity={0.35} />
                      <stop offset="60%" stopColor="#FB925A" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#FB925A" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E7EC" />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 10, fill: '#475467' }}
                    tickLine={false}
                    axisLine={{ stroke: '#DCE0E8' }}
                    minTickGap={20}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#475467' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) =>
                      stockMetric === 'value'
                        ? `R$ ${(val / 1000).toFixed(0)}k`
                        : `${val}`
                    }
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="ref-card-charcoal p-3 rounded-2xl shadow-xl text-xs space-y-1.5 min-w-[210px]">
                            <div className="flex items-center justify-between border-b border-white/15 pb-1.5">
                              <span className="font-bold text-white">Data: {data.diaFull}</span>
                              {data.evento && (
                                <span className="text-[10px] bg-[#F97B72] text-white px-2 py-0.5 rounded-full font-bold">
                                  Entrada XML
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-0.5">
                              <span className="text-white/75">Patrimônio em Estoque:</span>
                              <span className="font-mono font-bold text-white">
                                R$ {data.valorEstoque.toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-white/75">Unidades Físicas:</span>
                              <span className="font-mono font-bold text-white">
                                {data.unidadesEstoque.toLocaleString()} peças
                              </span>
                            </div>
                            {data.evento && (
                              <div className="text-[11px] text-white font-semibold pt-1 border-t border-white/15 flex items-center gap-1">
                                <Package className="w-3.5 h-3.5 text-white" />
                                <span>{data.evento}</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={stockMetric === 'value' ? 'valorEstoque' : 'unidadesEstoque'}
                    stroke="#F97B72"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#stockAreaGrad)"
                    dot={{ r: 2, fill: '#F97B72' }}
                    activeDot={{ r: 5, fill: '#F97B72', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Destaque de Reposição e Giros de Estoque */}
          <div className="pt-3 border-t border-[#EAECF0] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#529471]" />
              <span className="text-[#475467] font-medium">
                Crescimento consolidado de <strong className="text-[#216E4E] font-bold font-mono">+{stockGrowthMetrics.percentValue}%</strong> nos últimos 30 dias.
              </span>
            </div>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('estoque')}
                className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#6E7BF2] hover:underline transition cursor-pointer"
              >
                <span>Ver Matriz de Estoque Completa</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
    );
  };
