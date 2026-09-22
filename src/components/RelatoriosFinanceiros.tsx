import React, { useState } from 'react';
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
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Filter,
  X,
  FileText,
  Boxes,
  Receipt,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { 
  Order, 
  Product, 
  Customer, 
  InvoiceRecord, 
  FinancialPayable, 
  FinancialReceivable, 
  CompanyProfile 
} from '../types';
import { 
  exportDreSpreadsheet, 
  exportOrdersSpreadsheet, 
  exportChannelsSpreadsheet, 
  exportStockSpreadsheet, 
  exportFinancialBillsSpreadsheet, 
  exportConsolidatedReportSpreadsheet 
} from '../utils/exportSpreadsheet';

interface RelatoriosFinanceirosProps {
  orders: Order[];
  products: Product[];
  customers?: Customer[];
  invoices?: InvoiceRecord[];
  payables?: FinancialPayable[];
  receivables?: FinancialReceivable[];
  companyProfile?: CompanyProfile | null;
}

export const RelatoriosFinanceiros: React.FC<RelatoriosFinanceirosProps> = ({
  orders,
  products,
  customers = [],
  invoices = [],
  payables = [],
  receivables = [],
  companyProfile = null,
}) => {
  // Modal de Exportação de Planilhas
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'mes_atual' | 'ultimos_30' | 'ultimos_7' | 'todos'>('mes_atual');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showExportNotification = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => {
      setNotificationMsg(null);
    }, 4500);
  };

  // Cálculos matemáticos financeiros baseados em pedidos
  const grossRevenue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0) + 14280.00;
  const totalTaxes = grossRevenue * 0.125; // 12.5% de impostos médios
  const netRevenue = grossRevenue - totalTaxes;

  // CMV (Custo das Mercadorias Vendidas)
  const cmv = grossRevenue * 0.52;
  const marketplaceCommissions = 1680.00;
  const shippingFreightCost = 840.00;

  const grossProfit = netRevenue - cmv - marketplaceCommissions - shippingFreightCost;
  const netProfitMargin = (grossProfit / grossRevenue) * 100;

  // Dados consolidados do DRE
  const dreData = {
    grossRevenue,
    totalTaxes,
    netRevenue,
    cmv,
    marketplaceCommissions,
    shippingFreightCost,
    grossProfit,
    netProfitMargin,
  };

  // Rentabilidade por Canal
  const channelData = [
    { name: 'Balcão Físico (Loja Matriz)', revenue: 8450.00, share: 44, margin: 41.2, color: 'bg-sky-600' },
    { name: 'Mercado Livre', revenue: 5620.00, share: 29, margin: 28.5, color: 'bg-amber-500' },
    { name: 'Shopee Brasil', revenue: 3200.00, share: 17, margin: 32.0, color: 'bg-orange-500' },
    { name: 'Amazon Marketplace', revenue: 1980.00, share: 10, margin: 29.8, color: 'bg-slate-800' },
  ];

  // Dados por Segmento Automotivo
  const categoryData = [
    { category: 'Linha Leve (Carros & Utilitários)', revenue: 'R$ 9.850,00', share: 51, itemsSold: 42 },
    { category: 'Motos & Duas Rodas', revenue: 'R$ 3.820,00', share: 20, itemsSold: 35 },
    { category: 'Linha Pesada (Caminhões & Ônibus)', revenue: 'R$ 3.480,00', share: 18, itemsSold: 12 },
    { category: 'Linha Agrícola & Tratores', revenue: 'R$ 2.100,00', share: 11, itemsSold: 6 },
  ];

  // Handlers diretos de exportação
  const handleExportDre = () => {
    exportDreSpreadsheet(dreData, companyProfile);
    showExportNotification('Planilha DRE Gerencial exportada com sucesso (formato Excel / CSV)!');
  };

  const handleExportOrders = () => {
    exportOrdersSpreadsheet(orders, companyProfile);
    showExportNotification(`Planilha de Vendas com ${orders.length} pedidos exportada com sucesso!`);
  };

  const handleExportChannels = () => {
    exportChannelsSpreadsheet(channelData, companyProfile);
    showExportNotification('Planilha de Rentabilidade por Canal exportada com sucesso!');
  };

  const handleExportStock = () => {
    exportStockSpreadsheet(products, companyProfile);
    showExportNotification(`Planilha de Estoque com ${products.length} itens exportada com sucesso!`);
  };

  const handleExportFinancialBills = () => {
    exportFinancialBillsSpreadsheet(payables, receivables, companyProfile);
    showExportNotification('Planilha de Contas a Pagar e Receber exportada com sucesso!');
  };

  const handleExportConsolidated = () => {
    exportConsolidatedReportSpreadsheet({
      dreData,
      channelData,
      categoryData,
      orders,
      products,
      payables,
      receivables,
      companyProfile,
    });
    showExportNotification('Pacote Consolidado Geral exportado com sucesso (Excel / CSV)!');
  };

  return (
    <div className="space-y-6" id="view-relatorios-financeiros">
      {/* Toast Notification de Sucesso ao Exportar */}
      {notificationMsg && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-100">Exportação Concluída</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{notificationMsg}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setNotificationMsg(null)}
            className="text-slate-400 hover:text-white p-1 ml-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
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

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Botão de Destaque: Exportar em Planilha */}
          <button
            type="button"
            id="btn-open-export-modal"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Exportar em Planilha</span>
          </button>

          {/* Botão Imprimir */}
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir DRE</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm border-b-4 border-b-sky-600">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Receita Bruta Total</span>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1">
            R$ {grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3" /> +18.4% vs mês anterior
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm border-b-4 border-b-slate-600">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Custo de Peças (CMV)</span>
          <p className="text-2xl font-black font-mono text-slate-900 mt-1">
            R$ {cmv.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-500 block mt-1">
            52.0% da receita bruta
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm border-b-4 border-b-amber-500">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Comissões de Marketplaces</span>
          <p className="text-2xl font-black font-mono text-amber-700 mt-1">
            R$ {marketplaceCommissions.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-500 block mt-1">
            Mercado Livre, Shopee & Amazon
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm border-b-4 border-b-emerald-500">
          <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Lucro Líquido Real</span>
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
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Demonstração do Resultado do Exercício (DRE Gerencial)
              </h2>
              <span className="text-[10px] font-mono text-slate-500">Regime de Competência • Mês Corrente</span>
            </div>
            
            {/* Atalho de Exportação em Planilha da DRE */}
            <button
              type="button"
              id="btn-quick-export-dre"
              onClick={handleExportDre}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200 transition cursor-pointer"
              title="Baixar DRE em Planilha Excel / CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar DRE (.csv)</span>
            </button>
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
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Rentabilidade & Margem por Canal
              </h2>
              <span className="text-[10px] text-slate-500 font-semibold">Comparativo Balcão vs Canais</span>
            </div>

            {/* Atalho de Exportação em Planilha dos Canais */}
            <button
              type="button"
              id="btn-quick-export-channels"
              onClick={handleExportChannels}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition cursor-pointer"
              title="Baixar Rentabilidade por Canal em Planilha"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar (.csv)</span>
            </button>
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
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Vendas por Segmento Automotivo
            </h2>
            <span className="text-[10px] text-slate-500">Distribuição do mix de produtos comercializados</span>
          </div>

          <button
            type="button"
            id="btn-quick-export-stock"
            onClick={handleExportStock}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-200 transition cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5 text-slate-600" />
            <span>Exportar Estoque de Peças (.csv)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {categoryData.map((cat, idx) => (
            <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">{cat.category}</span>
              <p className="text-base font-black font-mono text-slate-900">{cat.revenue}</p>
              <div className="flex justify-between text-[10px] text-slate-600 pt-1">
                <span>{cat.share}% do mix</span>
                <span className="font-bold text-slate-800">{cat.itemsSold} peças vendidas</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL / CENTRAL DE EXPORTAÇÃO DE RELATÓRIOS EM PLANILHA */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Central de Exportação de Relatórios em Planilha
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gere planilhas no padrão Excel (.csv / .xlsx compatível) com delimitador ponto-e-vírgula (;) e codificação UTF-8 com BOM.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Filtro de Período */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">Período de Referência da Exportação:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'mes_atual', label: 'Mês Atual' },
                    { id: 'ultimos_30', label: 'Últimos 30 dias' },
                    { id: 'ultimos_7', label: 'Últimos 7 dias' },
                    { id: 'todos', label: 'Todos os Registros' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPeriod(p.id as any)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        selectedPeriod === p.id 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid de Opções de Planilhas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. DRE Gerencial */}
                <div className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all bg-white flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-sky-50 text-sky-700">
                        <BarChart3 className="w-5 h-5" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contábil</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-2">DRE Gerencial Completo</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Demonstração com Receita Bruta, Deduções e Impostos (ICMS/ST/PIS/COFINS), CMV de peças, taxas de canais e Lucro Operacional Líquido.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportDre();
                      setIsExportModalOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-xs active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Planilha DRE (.CSV)</span>
                  </button>
                </div>

                {/* 2. Vendas e Pedidos */}
                <div className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all bg-white flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                        <ShoppingBag className="w-5 h-5" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{orders.length} Pedidos</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-2">Vendas & Pedidos Faturados</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Relatório item a item com data, canal (Balcão, ML, Shopee, Amazon), cliente, itens vendidos, método de pagamento e valor total.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportOrders();
                      setIsExportModalOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-xs active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Planilha de Vendas (.CSV)</span>
                  </button>
                </div>

                {/* 3. Rentabilidade por Canal */}
                <div className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all bg-white flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                        <PieChart className="w-5 h-5" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Marketplaces</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-2">Rentabilidade por Canal</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Análise comparativa de margem líquida, percentual de faturamento e lucro estimado no Balcão, Mercado Livre, Shopee e Amazon.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportChannels();
                      setIsExportModalOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-xs active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Planilha de Canais (.CSV)</span>
                  </button>
                </div>

                {/* 4. Estoque e Curva de Peças */}
                <div className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all bg-white flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                        <Boxes className="w-5 h-5" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{products.length} SKUs</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-2">Posição de Estoque & Peças</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Código SKU, OEM, descrição, fabricante, localização de prateleira, quantidade, custo, preço de venda e valor total em estoque.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportStock();
                      setIsExportModalOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-xs active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Planilha de Estoque (.CSV)</span>
                  </button>
                </div>

                {/* 5. Contas Financeiras */}
                <div className="p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all bg-white flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                        <Receipt className="w-5 h-5" />
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fluxo de Caixa</span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-2">Contas a Pagar & Receber</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Relatório completo de títulos financeiros com datas de vencimento, pagador/recebedor, categorias e status de liquidação.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportFinancialBills();
                      setIsExportModalOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-xs active:scale-98"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Contas a Pagar/Receber (.CSV)</span>
                  </button>
                </div>

                {/* 6. Pacote Consolidado Completo */}
                <div className="p-5 rounded-2xl border-2 border-emerald-500/60 hover:shadow-lg transition-all bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="p-2 rounded-xl bg-emerald-600 text-white">
                        <Sparkles className="w-5 h-5" />
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                        Recomendado
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 mt-2">Pacote Geral Consolidado (Diretoria)</h4>
                    <p className="text-xs text-slate-600 mt-1">
                      Arquivo executivo consolidado com todas as seções: DRE, Rentabilidade por Canal, Segmentos de Venda e Resumo Geral de Estoque.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleExportConsolidated();
                      setIsExportModalOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-md active:scale-98"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Exportar Pacote Consolidado (.CSV)</span>
                  </button>
                </div>
              </div>

              {/* Informações de Compatibilidade */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Compatibilidade Total:</span> Os arquivos gerados utilizam o padrão brasileiro de planilhas (separador <code className="bg-slate-200 px-1 rounded text-slate-900 font-mono">;</code> e números decimais com vírgula). Eles são abertos diretamente no <strong>Microsoft Excel</strong>, <strong>Google Planilhas</strong> e <strong>LibreOffice Calc</strong> com acentuação e formatação preservadas.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
