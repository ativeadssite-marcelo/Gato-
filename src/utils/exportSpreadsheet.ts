/**
 * Utilitário de Exportação de Relatórios em Planilha (Excel / CSV)
 * Formato padrão brasileiro com delimitador ponto-e-vírgula (;) e codificação UTF-8 com BOM
 * para abertura direta no Microsoft Excel, LibreOffice Calc e Google Planilhas sem caracteres corrompidos.
 */

import { Order, Product, FinancialPayable, FinancialReceivable, CompanyProfile } from '../types';

/**
 * Escapa células de CSV para padrão RFC 4180 / Excel
 */
export function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Formata números no padrão monetário brasileiro para planilhas
 */
export function formatCurrencyCell(val: number): string {
  return Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Realiza o download do arquivo CSV no navegador
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  // UTF-8 BOM (\uFEFF) garante que o Excel abra com acentos corretos em português
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Gera Cabeçalho Corporativo Padrão para as Planilhas
 */
function buildCorporateHeader(title: string, companyProfile?: CompanyProfile | null): string[] {
  const companyName = companyProfile?.tradeName || companyProfile?.corporateName || 'GATO Auto Peças & Distribuidora';
  const cnpj = companyProfile?.cnpj || '12.345.678/0001-90';
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return [
    `# ========================================================`,
    `# RELATÓRIO EXECUTIVO - GATO ERP AUTO PEÇAS`,
    `# Empresa: ${companyName}`,
    `# CNPJ: ${cnpj}`,
    `# Relatório: ${title}`,
    `# Data de Emissão: ${dateStr}`,
    `# ========================================================`,
    ``
  ];
}

/**
 * 1. Exporta Demonstração do Resultado do Exercício (DRE Gerencial)
 */
export function exportDreSpreadsheet(dreData: {
  grossRevenue: number;
  totalTaxes: number;
  netRevenue: number;
  cmv: number;
  marketplaceCommissions: number;
  shippingFreightCost: number;
  grossProfit: number;
  netProfitMargin: number;
}, companyProfile?: CompanyProfile | null): void {
  const lines: string[] = buildCorporateHeader('Demonstração do Resultado do Exercício (DRE Gerencial)', companyProfile);

  // Cabeçalhos de Coluna
  lines.push(['Conta / Rubrica', 'Descrição Contábil', 'Classificação', 'Valor (R$)', '% sobre Receita Bruta'].map(escapeCsvCell).join(';'));

  const items = [
    { conta: '1.01', desc: '(+) Receita Operacional Bruta de Vendas', tipo: 'Receita', val: dreData.grossRevenue, pct: 100 },
    { conta: '1.02', desc: '(-) Deduções & Impostos Fiscais (ICMS / ST / PIS / COFINS)', tipo: 'Dedução', val: -dreData.totalTaxes, pct: (dreData.totalTaxes / dreData.grossRevenue) * 100 },
    { conta: '1.03', desc: '(=) RECEITA OPERACIONAL LÍQUIDA', tipo: 'Subtotal', val: dreData.netRevenue, pct: (dreData.netRevenue / dreData.grossRevenue) * 100 },
    { conta: '2.01', desc: '(-) Custo das Mercadorias Vendidas (CMV de Peças)', tipo: 'Custo', val: -dreData.cmv, pct: (dreData.cmv / dreData.grossRevenue) * 100 },
    { conta: '2.02', desc: '(-) Comissões e Taxas de Marketplaces (ML, Shopee, Amazon)', tipo: 'Despesa Operacional', val: -dreData.marketplaceCommissions, pct: (dreData.marketplaceCommissions / dreData.grossRevenue) * 100 },
    { conta: '2.03', desc: '(-) Frete e Logística de Envio de Mercadorias', tipo: 'Despesa Logística', val: -dreData.shippingFreightCost, pct: (dreData.shippingFreightCost / dreData.grossRevenue) * 100 },
    { conta: '3.01', desc: '(=) LUCRO OPERACIONAL LÍQUIDO (RESULTADO DO EXERCÍCIO)', tipo: 'Resultado Final', val: dreData.grossProfit, pct: dreData.netProfitMargin },
  ];

  items.forEach(it => {
    lines.push([
      it.conta,
      it.desc,
      it.tipo,
      formatCurrencyCell(it.val),
      `${it.pct.toFixed(2)}%`
    ].map(escapeCsvCell).join(';'));
  });

  const filename = `relatorio_dre_gerencial_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsvFile(filename, lines.join('\r\n'));
}

/**
 * 2. Exporta Relatório de Vendas & Pedidos Detalhados
 */
export function exportOrdersSpreadsheet(orders: Order[], companyProfile?: CompanyProfile | null): void {
  const lines: string[] = buildCorporateHeader('Relatório Detalhado de Vendas e Pedidos', companyProfile);

  // Cabeçalho das colunas
  const headers = [
    'Número do Pedido',
    'Data/Hora',
    'Canal de Venda',
    'Nome do Cliente',
    'CPF / CNPJ',
    'Tipo de Cliente',
    'Cidade de Destino',
    'Status',
    'Qtd Itens',
    'Itens / Peças Vendidas',
    'Forma de Pagamento',
    'Custo Total das Peças (R$)',
    'Taxa / Comissão do Canal (R$)',
    'Lucro Estimado (R$)',
    'Margem Realizada (%)',
    'Transportadora',
    'NF-e Emitida',
    'Valor Total do Pedido (R$)'
  ];
  lines.push(headers.map(escapeCsvCell).join(';'));

  orders.forEach(ord => {
    const itemsDescription = (ord.items || [])
      .map(it => `${it.quantity || 1}x ${it.productName || it.name || it.code || 'Peça'} (R$ ${formatCurrencyCell(it.finalUnitPrice || it.unitPrice || 0)})`)
      .join(' | ');

    const row = [
      ord.orderNumber || ord.id,
      ord.createdAt ? new Date(ord.createdAt).toLocaleString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      (ord.channel || 'balcao').toUpperCase(),
      ord.customerName || 'Cliente Balcão',
      ord.customerDocument || 'Consumidor Final',
      (ord.customerType || 'balcao').toUpperCase(),
      ord.shippingCity || 'Balcão Matriz',
      (ord.status || 'Concluído').toUpperCase(),
      ord.items?.length || 0,
      itemsDescription,
      ord.paymentMethod || 'Dinheiro / PIX',
      formatCurrencyCell(ord.costAmount || 0),
      formatCurrencyCell(ord.channelFee || 0),
      formatCurrencyCell(ord.profitAmount || 0),
      `${(ord.marginPercent || 0).toFixed(1)}%`,
      ord.carrier || 'Retirada Balcão',
      ord.nfeIssued ? (ord.nfeNumber ? `Sim (Nº ${ord.nfeNumber})` : 'Sim') : 'Não Emitida',
      formatCurrencyCell(ord.totalAmount || 0),
    ];
    lines.push(row.map(escapeCsvCell).join(';'));
  });

  const filename = `relatorio_vendas_pedidos_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsvFile(filename, lines.join('\r\n'));
}

/**
 * 3. Exporta Relatório de Rentabilidade & Margem por Canal de Venda
 */
export function exportChannelsSpreadsheet(channelData: Array<{
  name: string;
  revenue: number;
  share: number;
  margin: number;
}>, companyProfile?: CompanyProfile | null): void {
  const lines: string[] = buildCorporateHeader('Rentabilidade e Margem Líquida por Canal de Vendas', companyProfile);

  const headers = [
    'Canal de Vendas',
    'Faturamento Bruto (R$)',
    'Participação nas Vendas (%)',
    'Margem Líquida Realizada (%)',
    'Lucro Estimado no Canal (R$)'
  ];
  lines.push(headers.map(escapeCsvCell).join(';'));

  channelData.forEach(ch => {
    const profitEstimated = ch.revenue * (ch.margin / 100);
    const row = [
      ch.name,
      formatCurrencyCell(ch.revenue),
      `${ch.share.toFixed(1)}%`,
      `${ch.margin.toFixed(1)}%`,
      formatCurrencyCell(profitEstimated)
    ];
    lines.push(row.map(escapeCsvCell).join(';'));
  });

  const filename = `relatorio_rentabilidade_canais_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsvFile(filename, lines.join('\r\n'));
}

/**
 * 4. Exporta Relatório de Posição de Estoque & Curva de Peças
 */
export function exportStockSpreadsheet(products: Product[], companyProfile?: CompanyProfile | null): void {
  const lines: string[] = buildCorporateHeader('Posição Físico-Financeira de Estoque e Peças', companyProfile);

  const headers = [
    'Código (SKU)',
    'Código OEM / Original',
    'Código de Barras (EAN)',
    'Descrição da Peça',
    'Marca / Fabricante',
    'Categoria',
    'Localização (Corredor/Prat/Gav)',
    'Estoque Físico Atual (Un)',
    'Estoque Mínimo (Un)',
    'Situação Estoque',
    'Custo Unitário (R$)',
    'Preço de Venda (R$)',
    'Markup Praticado (%)',
    'Margem Bruta Unitária (%)',
    'Valor Total em Estoque a Custo (R$)',
    'Valor Total em Estoque a Venda (R$)'
  ];
  lines.push(headers.map(escapeCsvCell).join(';'));

  products.forEach(p => {
    const isLow = p.stock <= p.minStock;
    const isZero = p.stock <= 0;
    const situacao = isZero ? 'ZERADO (CRÍTICO)' : isLow ? 'ABAIXO DO MÍNIMO' : 'NORMAL';
    const loc = p.location ? `${p.location.corridor}-${p.location.shelf}-${p.location.box}` : 'Geral';
    const totalCusto = (p.stock || 0) * (p.unitCost || 0);
    const totalVenda = (p.stock || 0) * (p.sellingPrice || 0);
    const margemBruta = p.sellingPrice > 0 ? ((p.sellingPrice - p.unitCost) / p.sellingPrice) * 100 : 0;

    const row = [
      p.code || p.id,
      p.oemCode || 'N/A',
      p.barcode || 'N/A',
      p.name,
      p.brand || 'Original',
      p.category || 'Auto',
      loc,
      p.stock || 0,
      p.minStock || 0,
      situacao,
      formatCurrencyCell(p.unitCost || 0),
      formatCurrencyCell(p.sellingPrice || 0),
      `${(p.markupPercent || 0).toFixed(1)}%`,
      `${margemBruta.toFixed(1)}%`,
      formatCurrencyCell(totalCusto),
      formatCurrencyCell(totalVenda)
    ];
    lines.push(row.map(escapeCsvCell).join(';'));
  });

  const filename = `relatorio_estoque_pecas_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsvFile(filename, lines.join('\r\n'));
}

/**
 * 5. Exporta Relatório Financeiro de Contas a Pagar e Receber
 */
export function exportFinancialBillsSpreadsheet(
  payables: FinancialPayable[] = [],
  receivables: FinancialReceivable[] = [],
  companyProfile?: CompanyProfile | null
): void {
  const lines: string[] = buildCorporateHeader('Fluxo de Contas a Pagar e a Receber', companyProfile);

  const headers = [
    'Tipo de Registro',
    'Nº Documento / Título',
    'Descrição / Histórico',
    'Favorecido / Cliente / Fornecedor',
    'Data de Emissão',
    'Data de Vencimento',
    'Data de Pagamento/Baixa',
    'Valor Previsto (R$)',
    'Valor Pago/Recebido (R$)',
    'Status Atual'
  ];
  lines.push(headers.map(escapeCsvCell).join(';'));

  // Contas a Pagar
  payables.forEach(p => {
    lines.push([
      'CONTAS A PAGAR',
      p.documentNumber || p.id,
      p.description,
      p.supplierName || 'Fornecedor',
      p.issueDate || 'N/I',
      p.dueDate || 'N/I',
      p.paidDate || 'Pendente',
      formatCurrencyCell(p.amount || 0),
      formatCurrencyCell(p.paidAmount || 0),
      (p.status || 'pendente').toUpperCase()
    ].map(escapeCsvCell).join(';'));
  });

  // Contas a Receber
  receivables.forEach(r => {
    lines.push([
      'CONTAS A RECEBER',
      r.originId || r.id,
      r.description,
      r.customerName || 'Cliente',
      r.issueDate || 'N/I',
      r.dueDate || 'N/I',
      r.receivedDate || 'Pendente',
      formatCurrencyCell(r.amount || 0),
      formatCurrencyCell(r.receivedAmount || 0),
      (r.status || 'pendente').toUpperCase()
    ].map(escapeCsvCell).join(';'));
  });

  const filename = `relatorio_contas_financeiras_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsvFile(filename, lines.join('\r\n'));
}

/**
 * 6. Exporta Pacote Consolidado Geral Completo
 */
export function exportConsolidatedReportSpreadsheet(options: {
  dreData: {
    grossRevenue: number;
    totalTaxes: number;
    netRevenue: number;
    cmv: number;
    marketplaceCommissions: number;
    shippingFreightCost: number;
    grossProfit: number;
    netProfitMargin: number;
  };
  channelData: Array<{ name: string; revenue: number; share: number; margin: number }>;
  categoryData: Array<{ category: string; revenue: string; share: number; itemsSold: number }>;
  orders: Order[];
  products: Product[];
  payables?: FinancialPayable[];
  receivables?: FinancialReceivable[];
  companyProfile?: CompanyProfile | null;
}): void {
  const lines: string[] = buildCorporateHeader('Pacote Consolidado Geral de Desempenho e Finanças', options.companyProfile);

  // SEÇÃO 1: DRE GERENCIAL
  lines.push(`### SEÇÃO 1: DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)`);
  lines.push(['Rubrica', 'Descrição', 'Valor (R$)', '% s/ Receita Bruta'].map(escapeCsvCell).join(';'));
  lines.push(['1.01', 'Receita Bruta Total', formatCurrencyCell(options.dreData.grossRevenue), '100.00%'].map(escapeCsvCell).join(';'));
  lines.push(['1.02', 'Deduções & Tributos (ICMS/ST/PIS/COFINS)', formatCurrencyCell(-options.dreData.totalTaxes), `${((options.dreData.totalTaxes / options.dreData.grossRevenue) * 100).toFixed(2)}%`].map(escapeCsvCell).join(';'));
  lines.push(['1.03', 'Receita Operacional Líquida', formatCurrencyCell(options.dreData.netRevenue), `${((options.dreData.netRevenue / options.dreData.grossRevenue) * 100).toFixed(2)}%`].map(escapeCsvCell).join(';'));
  lines.push(['2.01', 'Custo Mercadorias Vendidas (CMV)', formatCurrencyCell(-options.dreData.cmv), `${((options.dreData.cmv / options.dreData.grossRevenue) * 100).toFixed(2)}%`].map(escapeCsvCell).join(';'));
  lines.push(['2.02', 'Taxas e Comissões Marketplaces', formatCurrencyCell(-options.dreData.marketplaceCommissions), `${((options.dreData.marketplaceCommissions / options.dreData.grossRevenue) * 100).toFixed(2)}%`].map(escapeCsvCell).join(';'));
  lines.push(['2.03', 'Custos de Frete & Envio', formatCurrencyCell(-options.dreData.shippingFreightCost), `${((options.dreData.shippingFreightCost / options.dreData.grossRevenue) * 100).toFixed(2)}%`].map(escapeCsvCell).join(';'));
  lines.push(['3.01', 'LUCRO OPERACIONAL LÍQUIDO', formatCurrencyCell(options.dreData.grossProfit), `${options.dreData.netProfitMargin.toFixed(2)}%`].map(escapeCsvCell).join(';'));
  lines.push('');

  // SEÇÃO 2: CANAIS DE VENDA
  lines.push(`### SEÇÃO 2: RENTABILIDADE POR CANAL DE VENDA`);
  lines.push(['Canal', 'Faturamento (R$)', 'Share (%)', 'Margem Líquida (%)', 'Lucro Estimado (R$)'].map(escapeCsvCell).join(';'));
  options.channelData.forEach(c => {
    lines.push([
      c.name,
      formatCurrencyCell(c.revenue),
      `${c.share}%`,
      `${c.margin}%`,
      formatCurrencyCell(c.revenue * (c.margin / 100))
    ].map(escapeCsvCell).join(';'));
  });
  lines.push('');

  // SEÇÃO 3: SEGMENTOS AUTOMOTIVOS
  lines.push(`### SEÇÃO 3: VENDAS POR SEGMENTO AUTOMOTIVO`);
  lines.push(['Segmento', 'Faturamento Estimado', 'Share (%)', 'Peças Vendidas'].map(escapeCsvCell).join(';'));
  options.categoryData.forEach(cat => {
    lines.push([
      cat.category,
      cat.revenue,
      `${cat.share}%`,
      cat.itemsSold
    ].map(escapeCsvCell).join(';'));
  });
  lines.push('');

  // SEÇÃO 4: RESUMO DE ESTOQUE
  const totalStockItems = options.products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalStockCostVal = options.products.reduce((acc, p) => acc + (p.stock || 0) * (p.unitCost || 0), 0);
  const totalStockSaleVal = options.products.reduce((acc, p) => acc + (p.stock || 0) * (p.sellingPrice || 0), 0);
  lines.push(`### SEÇÃO 4: RESUMO GERAL DE ESTOQUE`);
  lines.push(['Indicador de Estoque', 'Valor'].map(escapeCsvCell).join(';'));
  lines.push(['Total de SKUs Cadastrados', options.products.length].map(escapeCsvCell).join(';'));
  lines.push(['Total de Unidades Físicas em Estoque', totalStockItems].map(escapeCsvCell).join(';'));
  lines.push(['Valor Total do Estoque a Custo', `R$ ${formatCurrencyCell(totalStockCostVal)}`].map(escapeCsvCell).join(';'));
  lines.push(['Valor Total do Estoque a Preço de Venda', `R$ ${formatCurrencyCell(totalStockSaleVal)}`].map(escapeCsvCell).join(';'));
  lines.push(['Potencial de Margem Bruta Total', `R$ ${formatCurrencyCell(totalStockSaleVal - totalStockCostVal)}`].map(escapeCsvCell).join(';'));

  const filename = `relatorio_geral_consolidado_${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsvFile(filename, lines.join('\r\n'));
}
