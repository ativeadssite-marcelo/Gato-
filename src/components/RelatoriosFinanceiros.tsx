import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  Download, 
  Printer, 
  Percent, 
  ArrowUpRight, 
  Layers,
  ShoppingBag,
  Building2
} from 'lucide-react';
import { Order, Product } from '../types';

interface RelatoriosFinanceirosProps {
  orders: Order[];
  products: Product[];
}

export const RelatoriosFinanceiros: React.FC<RelatoriosFinanceirosProps> = ({
  orders,
  products,
}) => {
  // Financial math calculations based on real orders
  const grossRevenue = orders.reduce((acc, o) => acc + o.totalAmount, 0) + 14280.00; // adding baseline history
  const totalTaxes = grossRevenue * 0.125; // 12.5% effective tax
  const netRevenue = grossRevenue - totalTaxes;

  // CMV (Cost of Goods Sold)
  const cmv = grossRevenue * 0.52; // 52% cost
  const marketplaceCommissions = 1680.00; // Commissions paid to ML, Shopee, Amazon
  const shippingFreightCost = 840.00;

  const grossProfit = netRevenue - cmv - marketplaceCommissions - shippingFreightCost;
  const netProfitMargin = (grossProfit / grossRevenue) * 100;

  // Channel Breakdown
  const channelData = [
    { name: 'Balcão Físico (Loja)', revenue: 8450.00, share: 44, margin: 41.2, color: 'bg-sky-600' },
    { name: 'Mercado Livre', revenue: 5620.00, share: 29, margin: 28.5, color: 'bg-amber-500' },
    { name: 'Shopee Brasil', revenue: 3200.00, share: 17, margin: 32.0, color: 'bg-orange-500' },
    { name: 'Amazon Marketplace', revenue: 1980.00, share: 10, margin: 29.8, color: 'bg-slate-800' },
  ];

  // Category Breakdown
  const categoryData = [
    { category: 'Linha Leve (Carros & Utilitários)', revenue: 'R$ 9.850,00', share: 51, itemsSold: 42 },
    { category: 'Motos & Duas Rodas', revenue: 'R$ 3.820,00', share: 20, itemsSold: 35 },
    { category: 'Linha Pesada (Caminhões & Ônibus)', revenue: 'R$ 3.480,00', share: 18, itemsSold: 12 },
    { category: 'Linha Agrícola & Tratores', revenue: 'R$ 2.100,00', share: 11, itemsSold: 6 },
  ];

  return (
    <div className="space-y-6" id="view-relatorios-financeiros">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4 text-sky-600" />
            <span>Relatórios Financeiros, DRE & Margem por Canal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">
            Indicadores de Desempenho & Rentabilidade
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Acompanhe o DRE consolidado com receitas brutas, impostos (ICMS/ST), CMV de peças, comissões de marketplace e margem líquida por canal de vendas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir DRE</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Receita Bruta Total</span>
          <p className="text-2xl font-black font-mono text-sky-950 mt-1">
            R$ {grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +18.4% vs mês anterior
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Custo de Peças (CMV)</span>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1">
            R$ {cmv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-500 block mt-1">
            52.0% da receita bruta
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
          <span className="text-[10px] font-bold text-slate-500 uppercase block">Comissões de Marketplaces</span>
          <p className="text-2xl font-black font-mono text-amber-700 mt-1">
            R$ {marketplaceCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-500 block mt-1">
            Mercado Livre, Shopee & Amazon
          </span>
        </div>

        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-200 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-800 uppercase block">Lucro Líquido Real</span>
          <p className="text-2xl font-black font-mono text-emerald-700 mt-1">
            R$ {grossProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-emerald-800 font-extrabold flex items-center gap-1 mt-1">
            <Percent className="w-3 h-3" /> Margem líquida de {netProfitMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* DRE GERENCIAL & MARGEM POR CANAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* DRE Table (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900">
              Demonstração do Resultado do Exercício (DRE Gerencial)
            </h2>
            <span className="text-[10px] font-mono text-slate-500">Mês Corrente</span>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-1.5 font-bold text-slate-900">
              <span>(+) Receita Operacional Bruta de Vendas</span>
              <span className="font-mono">R$ {grossRevenue.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-1.5 text-rose-700 font-medium">
              <span className="pl-3">(-) Deduções da Receita & Impostos (ICMS, ST, PIS/COFINS)</span>
              <span className="font-mono">-R$ {totalTaxes.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-1.5 font-extrabold text-sky-950 bg-sky-50 px-2 rounded">
              <span>(=) Receita Operacional Líquida</span>
              <span className="font-mono">R$ {netRevenue.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-1.5 text-rose-700 font-medium">
              <span className="pl-3">(-) Custo das Mercadorias Vendidas (CMV)</span>
              <span className="font-mono">-R$ {cmv.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-1.5 text-rose-700 font-medium">
              <span className="pl-3">(-) Comissões e Taxas de Plataformas de Venda</span>
              <span className="font-mono">-R$ {marketplaceCommissions.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-1.5 text-rose-700 font-medium">
              <span className="pl-3">(-) Frete e Logística de Envio</span>
              <span className="font-mono">-R$ {shippingFreightCost.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-2 font-black text-sm text-emerald-800 bg-emerald-50 px-3 rounded-xl border border-emerald-200">
              <span>(=) LUCRO OPERACIONAL LÍQUIDO</span>
              <span className="font-mono">R$ {grossProfit.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Profit Margin Per Channel Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-black text-slate-900">
              Rentabilidade & Margem por Canal
            </h2>
            <span className="text-[10px] text-slate-500 font-semibold">Comparativo</span>
          </div>

          <div className="space-y-3 text-xs">
            {channelData.map((ch) => (
              <div key={ch.name} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${ch.color}`} />
                    <span className="font-bold text-slate-900">{ch.name}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    R$ {ch.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${ch.color}`} style={{ width: `${ch.share}%` }} />
                </div>

                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>{ch.share}% do faturamento</span>
                  <span className="font-bold text-emerald-700">Margem líquida: {ch.margin}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Segment Performance */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-slate-900">
          Vendas por Segmento Automotivo
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {categoryData.map((cat, idx) => (
            <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">{cat.category}</span>
              <p className="text-base font-black font-mono text-slate-900">{cat.revenue}</p>
              <div className="flex justify-between text-[10px] text-slate-600 pt-1">
                <span>{cat.share}% do mix</span>
                <span>{cat.itemsSold} peças vendidas</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
