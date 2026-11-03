import React, { useMemo } from 'react';
import { 
  FileCode2, 
  Calculator, 
  TrendingUp, 
  DollarSign,
  Wrench,
  Info
} from 'lucide-react';
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
  branches,
  onNavigate,
  onSelectProductForQuote,
}) => {
  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);
  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);
  const stockValue = products.reduce((acc, p) => acc + p.stock * (p.sellingPrice || 0), 0);

  const kpis = useMemo(() => {
    const baseRevenueFromOrders = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
    const dailyRevenue =
      baseRevenueFromOrders > 0 ? baseRevenueFromOrders + demoAddon(7820.0) : demoAddon(18450.0);

    const piecesCountFromOrders = orders.reduce((acc, o) => {
      return acc + (o.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
    }, 0);
    const totalPiecesSold = piecesCountFromOrders > 0 ? piecesCountFromOrders + demoAddon(64) : demoAddon(148);

    const ordersCount = Math.max(orders.length, 1) + demoAddon(26);
    const averageTicket = dailyRevenue / ordersCount;
    const averageMargin = demoAddon(38.6);

    return {
      dailyRevenue,
      totalPiecesSold,
      averageTicket,
      averageMargin,
      ordersCount,
    };
  }, [orders]);

  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 text-[#14151B]" id="view-dashboard-overview">
      {/* TOP HEADER ROW + DARK OBSIDIAN EARNINGS PILL (Matches "Single Stake (3,3)" + "$0.00 Your Earnings / Day" Pill) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#14151B] tracking-tight">
            Operação & Estoque (3,3)
          </h1>
          <p className="text-xs text-[#71717A] mt-1 flex items-center gap-1.5">
            <span>◷</span>
            <span>Sincronização SEFAZ & Balcão em tempo real • Autopeças, Moto & Linha Pesada</span>
          </p>
        </div>

        {/* Right: Dark Obsidian Daily Revenue Pill Card */}
        <div className="whale-card-obsidian px-6 py-4 rounded-xl flex items-center justify-between gap-8 min-w-[290px] sm:min-w-[350px]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight">
              R$ {kpis.dailyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <span className="text-xs text-[#9CA3AF] font-medium whitespace-nowrap">
            Seu Faturamento / Dia
          </span>
        </div>
      </div>

      {/* TWO-COLUMN SPLIT: LEFT WHITE ACTION CARD + RIGHT OBSIDIAN STACKED METRICS CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (6 cols): Light White Card ("STAKE / UNSTAKE" + CTA + 5 Key-Value Rows) */}
        <div className="lg:col-span-6 whale-card-light p-6 flex flex-col justify-between space-y-5">
          {/* Segmented Gray Tab Bar */}
          <div className="grid grid-cols-2 bg-[#F4F4F5] p-1 rounded-lg">
            <button
              type="button"
              id="dash-btn-open-quote"
              onClick={() => onNavigate('cotacao')}
              className="py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-white text-[#14151B] shadow-2xs transition cursor-pointer"
            >
              COTAÇÃO BALCÃO
            </button>
            <button
              type="button"
              id="dash-btn-import-xml"
              onClick={() => onNavigate('xml-import')}
              className="py-2 text-xs font-bold uppercase tracking-wider rounded-md text-[#71717A] hover:text-[#14151B] transition cursor-pointer"
            >
              IMPORTAR XML
            </button>
          </div>

          {/* Quick Action Input / Shortcut Box with MAX-style button */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#F6F6F5] border border-[#E4E4E7] rounded-lg">
            <span className="text-xs text-[#71717A] truncate">
              Atalho rápido de operação fiscal e oficina
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onNavigate('xml-import')}
                className="px-2.5 py-1 rounded bg-white border border-[#E4E4E7] text-[10px] font-bold uppercase text-[#14151B] hover:bg-[#F4F4F5] transition cursor-pointer flex items-center gap-1"
              >
                <FileCode2 className="w-3 h-3" />
                <span>XML</span>
              </button>
              <button
                type="button"
                id="dash-btn-open-os"
                onClick={() => onNavigate('ordem-servico')}
                className="px-2.5 py-1 rounded bg-white border border-[#E4E4E7] text-[10px] font-bold uppercase text-[#14151B] hover:bg-[#F4F4F5] transition cursor-pointer flex items-center gap-1"
              >
                <Wrench className="w-3 h-3" />
                <span>O.S.</span>
              </button>
            </div>
          </div>

          {/* Full-Width Solid Obsidian CTA Button */}
          <button
            type="button"
            onClick={() => onNavigate('cotacao')}
            className="w-full py-3.5 rounded-lg bg-[#14151B] hover:bg-[#272935] text-white font-semibold text-xs tracking-wide transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Calculator className="w-4 h-4 text-white" />
            <span>Nova Cotação Rápida de Balcão</span>
          </button>

          {/* 5 Clean Key-Value Summary Rows below CTA */}
          <div className="pt-2 space-y-2.5 text-xs border-t border-[#F1F1F3]">
            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Seu Saldo em Estoque (Unidades):</span>
              <span className="font-bold text-[#14151B] font-mono">{totalStockUnits.toLocaleString('pt-BR')} un</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Peças Vendidas Hoje:</span>
              <span className="font-bold text-[#14151B] font-mono">{kpis.totalPiecesSold} un (R$ {kpis.dailyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Ticket Médio por Pedido:</span>
              <span className="font-bold text-[#14151B] font-mono">R$ {kpis.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Pedidos Faturados no Dia:</span>
              <span className="font-bold text-[#14151B] font-mono">{kpis.ordersCount} pedidos</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#71717A]">Itens com Estoque Crítico:</span>
              <span className="font-bold text-[#14151B] font-mono">{lowStockProducts.length} itens</span>
            </div>
          </div>
        </div>

        {/* Right Column (6 cols): Dark Obsidian Stacked Metrics Card (3 Rows + Mint-Sage ↗ Badge) */}
        <div className="lg:col-span-6 whale-card-obsidian p-6 sm:p-7 rounded-xl flex flex-col justify-between divide-y divide-white/10">
          {/* Row 1: APY / Margem Média */}
          <div className="pb-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#9CA3AF] font-medium block">
                Margem Média Realizada (Markup)
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-white mt-1 font-mono tracking-tight">
                {kpis.averageMargin}%
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold shrink-0">
              %
            </div>
          </div>

          {/* Row 2: Total Value Deposited + Mint-Sage Circular Badge (#DDF2E8 with ↗) */}
          <div className="py-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#9CA3AF] font-medium block">
                Valor Total Depositado em Estoque
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-white mt-1 font-mono tracking-tight">
                R$ {USE_SEED_DATA
                  ? '482.903,20'
                  : stockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('estoque')}
              title="Abrir Gestão de Estoque"
              className="whale-badge-mint w-9 h-9 rounded-full bg-[#DDF2E8] text-[#14151B] flex items-center justify-center font-bold text-sm hover:scale-105 transition cursor-pointer shrink-0"
            >
              ↗
            </button>
          </div>

          {/* Row 3: Current Index / Giro & Impostos */}
          <div className="pt-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#9CA3AF] font-medium block">
                Índice Tributário (PIS/COFINS Autopeças)
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-white mt-1 font-mono tracking-tight">
                CST 04 Monofásico
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* BOND (4,4) STYLE TABLE: ALERTA DE REPOSIÇÃO & ESTOQUE CRÍTICO */}
      <div className="whale-card-light p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-[#14151B]">
              Reposição & Giro Rápido ({lowStockProducts.length})
            </h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              Saldo de Estoque Ativo: <span className="font-bold text-[#14151B] font-mono">R$ {USE_SEED_DATA ? '482.903,20' : stockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('estoque')}
              className="whale-btn-outline px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Abrir Estoque Completo
            </button>
            <button
              type="button"
              onClick={() => onNavigate('pedidos')}
              className="px-4 py-2 rounded-lg bg-[#14151B] hover:bg-[#272935] text-white text-xs font-semibold transition cursor-pointer"
            >
              Ver Pedidos ({orders.length})
            </button>
          </div>
        </div>

        {/* Bond (4,4) Table with Solid Obsidian Header Bar */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#14151B] text-white text-[11px] font-semibold">
              <tr>
                <th className="px-5 py-3.5 rounded-l-lg">Peça / SKU</th>
                <th className="px-5 py-3.5">Preço Venda</th>
                <th className="px-5 py-3.5">Saldo Atual</th>
                <th className="px-5 py-3.5">Locação Física</th>
                <th className="px-5 py-3.5">Marca</th>
                <th className="px-5 py-3.5 text-right rounded-r-lg">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F1F3]">
              {lowStockProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-[#FAFAFA] transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center font-mono font-bold text-[#14151B] text-[10px] shrink-0">
                        {prod.brand?.slice(0, 2).toUpperCase() || 'PC'}
                      </div>
                      <div>
                        <div className="font-bold text-[#14151B] text-xs">{prod.name}</div>
                        <div className="text-[11px] text-[#71717A] font-mono">{prod.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono font-semibold text-[#14151B]">
                    R$ {(prod.sellingPrice || 0).toFixed(2)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono font-bold text-[#14151B]">
                      {prod.stock} un <span className="text-[#71717A] font-normal">(mín: {prod.minStock})</span>
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#14151B] font-mono text-[11px]">
                    {prod.location.corridor} • {prod.location.shelf} • {prod.location.box}
                  </td>
                  <td className="px-5 py-4 font-semibold text-[#71717A]">
                    {prod.brand}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProductForQuote(prod);
                        onNavigate('cotacao');
                      }}
                      className="whale-btn-outline px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer"
                    >
                      Cotar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Light-Gray "ⓘ Importante" Callout Box (Matches Bond (4,4) Reference) */}
        <div className="p-4 rounded-xl bg-[#F7F7F8] border border-[#EBEBEF] space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#14151B]">
            <Info className="w-3.5 h-3.5 text-[#14151B]" />
            <span>Importante — Controle Automático de Baixa & Reposição via XML</span>
          </div>
          <p className="text-[11px] text-[#71717A] leading-relaxed pl-5">
            As novas entradas via XML de compra atualizam automaticamente o saldo físico, o preço médio ponderado e o vínculo tributário NCM/CEST. Últimos pedidos integrados hoje: {recentOrders.length} registrados.
          </p>
        </div>
      </div>

      {/* RELATÓRIO VISUAL DE VOLUME DE VENDAS POR FILIAL */}
      <VisualReportsOverview
        products={products}
        orders={orders}
        branches={branches}
        onNavigate={onNavigate}
      />
    </div>
  );
};
