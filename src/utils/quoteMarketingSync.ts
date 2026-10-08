import { Quote, MarketingLead, Product } from '../types';

export interface CompanyReceiptInfo {
  name: string;
  fantasyName: string;
  cnpj: string;
  ie: string;
  address: string;
  city: string;
  uf: string;
  phone: string;
  whatsapp: string;
}

export const DEFAULT_COMPANY_RECEIPT_INFO: CompanyReceiptInfo = {
  name: 'GATO COMÉRCIO E DISTRIBUIÇÃO DE AUTOPEÇAS LTDA',
  fantasyName: 'GATO AUTOPEÇAS & DISTRIBUIDORA',
  cnpj: '12.345.678/0001-90',
  ie: '28.901.234-5',
  address: 'Av. Afonso Pena, 4500 - Amambai',
  city: 'Campo Grande',
  uf: 'MS',
  phone: '(67) 3345-9821',
  whatsapp: '(67) 99988-7766',
};

/**
 * Largura útil da bobina térmica de 80mm.
 *
 * O papel tem 80mm, mas a área imprimível real das impressoras ESC/POS (Epson, Elgin,
 * Bematech, Daruma) é de 72mm, o que dá 48 colunas na fonte A. Texto mais largo que isso
 * tem a última coluna cortada pelo cabeçote — por isso toda linha deste arquivo é
 * construída dentro deste limite e o teste `server/orcamento/orcamento.test.ts` trava isso.
 */
export const CUPOM_WIDTH = 48;

const HR = '-'.repeat(CUPOM_WIDTH);
const HR_DUPLA = '='.repeat(CUPOM_WIDTH);

/** Centraliza um texto nas 48 colunas do cupom. */
function centralizar(texto: string): string {
  const t = texto.slice(0, CUPOM_WIDTH);
  const margem = Math.max(0, Math.floor((CUPOM_WIDTH - t.length) / 2));
  return ' '.repeat(margem) + t;
}

/** Quebra um texto em linhas de no máximo `largura` colunas, sem cortar palavras. */
function quebrarLinhas(texto: string, largura = CUPOM_WIDTH): string[] {
  const palavras = String(texto ?? '').trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [''];

  const linhas: string[] = [];
  let atual = '';
  for (const palavra of palavras) {
    if (atual === '') {
      atual = palavra;
    } else if (atual.length + 1 + palavra.length <= largura) {
      atual += ` ${palavra}`;
    } else {
      linhas.push(atual);
      atual = palavra;
    }
  }
  linhas.push(atual);

  // Palavra única maior que a largura (ex.: chassi, código longo): corta em pedaços.
  return linhas.flatMap((l) => (l.length <= largura ? [l] : l.match(new RegExp(`.{1,${largura}}`, 'g')) || [l]));
}

/**
 * Empilha um texto aplicando recuo nas linhas de continuação, para que uma lista com
 * marcador não deixe a segunda linha colada na margem esquerda do cupom.
 */
function empilharComRecuo(linhas: string[], texto: string, recuo: string): void {
  const partes = quebrarLinhas(texto, CUPOM_WIDTH - recuo.length);
  linhas.push(partes[0]);
  partes.slice(1).forEach((parte) => linhas.push(`${recuo}${parte}`.slice(0, CUPOM_WIDTH)));
}

/** Monta uma linha de 48 colunas com o rótulo à esquerda e o valor alinhado à direita. */
function linhaRotuloValor(rotulo: string, valor: string): string {
  const v = valor.slice(0, CUPOM_WIDTH);
  const r = rotulo.slice(0, Math.max(0, CUPOM_WIDTH - v.length - 1));
  const espacos = Math.max(1, CUPOM_WIDTH - r.length - v.length);
  return (r + ' '.repeat(espacos) + v).slice(0, CUPOM_WIDTH);
}

/** Formata um número no padrão brasileiro (1.234,56). */
function formatBRL(valor: number): string {
  const n = Number.isFinite(valor) ? valor : 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Formata uma data em dd/mm/aaaa; devolve o fallback quando a data é inválida. */
function formatarData(valor: string, fallback = '15 dias'): string {
  if (!valor) return fallback;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? fallback : data.toLocaleDateString('pt-BR');
}

/** Escapa texto que será injetado em HTML — nome de cliente não pode virar marcação. */
export function escapeHtml(texto: string): string {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Converte uma cotação/orçamento em texto idêntico ao de impressora térmica (cupom 80mm).
 *
 * Toda linha respeita as 48 colunas de `CUPOM_WIDTH`. Cada item ocupa duas linhas — descrição
 * em cima, quantidade e valor embaixo — para não truncar o nome da peça, que é o que mais
 * importa para quem está no balcão.
 */
export function generateCupomFiscalText(
  quote: Quote,
  company: CompanyReceiptInfo = DEFAULT_COMPANY_RECEIPT_INFO
): string {
  const dateStr = new Date(quote.createdAt).toLocaleDateString('pt-BR');
  const timeStr = new Date(quote.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const linhas: string[] = [];

  // Cabeçalho da empresa
  quebrarLinhas(company.name).forEach((l) => linhas.push(centralizar(l)));
  quebrarLinhas(company.fantasyName).forEach((l) => linhas.push(centralizar(l)));
  quebrarLinhas(`CNPJ: ${company.cnpj}  IE: ${company.ie}`).forEach((l) => linhas.push(centralizar(l)));
  quebrarLinhas(`${company.address} - ${company.city}/${company.uf}`).forEach((l) => linhas.push(centralizar(l)));
  quebrarLinhas(`Fone: ${company.phone} | WhatsApp: ${company.whatsapp}`).forEach((l) => linhas.push(centralizar(l)));

  linhas.push(HR_DUPLA);
  linhas.push(centralizar('DOCUMENTO AUXILIAR DE ORÇAMENTO / COTAÇÃO'));
  linhas.push(centralizar('NÃO POSSUI VALOR FISCAL (DAV)'));
  linhas.push(HR_DUPLA);

  // Identificação do orçamento
  quebrarLinhas(`ORÇAMENTO Nº: ${quote.quoteNumber}`).forEach((l) => linhas.push(l));
  linhas.push(`EMISSÃO: ${dateStr} às ${timeStr}`.slice(0, CUPOM_WIDTH));
  quebrarLinhas(`VALIDADE: Até ${formatarData(quote.validUntil)} (sujeito à variação)`).forEach((l) => linhas.push(l));
  quebrarLinhas(`VENDEDOR: ${quote.sellerName || 'Balcão / Televendas'}`).forEach((l) => linhas.push(l));

  linhas.push(HR);

  // Cliente
  quebrarLinhas(`CLIENTE: ${quote.customerName || 'Não informado'}`).forEach((l) => linhas.push(l));
  quebrarLinhas(`DOC: ${quote.customerDocument || 'Não informado'} | UF: ${quote.customerUf || 'MS'}`).forEach((l) => linhas.push(l));
  if (quote.customerPhone || quote.customerWhatsapp) {
    quebrarLinhas(`CONTATO: ${quote.customerWhatsapp || quote.customerPhone}`).forEach((l) => linhas.push(l));
  }
  if (quote.vehicleModel || quote.vehiclePlate) {
    quebrarLinhas(`VEÍCULO: ${quote.vehicleModel || 'Universal'} | PLACA: ${quote.vehiclePlate || 'Não Informada'}`)
      .forEach((l) => linhas.push(l));
  }

  linhas.push(HR);

  // Cabeçalho da tabela — as larguras casam com as colunas usadas nos itens abaixo.
  linhas.push((`#`.padEnd(2) + ' ' + 'CÓDIGO'.padEnd(8) + ' ' + 'DESCRIÇÃO').slice(0, CUPOM_WIDTH));
  linhas.push(HR);

  const larguraDescricao = CUPOM_WIDTH - 2 - 1 - 8 - 1; // 36 colunas
  const recuoDescricao = ' '.repeat(2 + 1 + 8 + 1);      // 12 colunas

  (quote.items || []).forEach((item, index) => {
    const idx = String(index + 1).padStart(2, ' ');
    const code = (item.productCode || 'PEC').slice(0, 8).padEnd(8, ' ');

    const descricao = quebrarLinhas(item.productName || 'Item sem descrição', larguraDescricao);
    linhas.push(`${idx} ${code} ${descricao[0]}`.slice(0, CUPOM_WIDTH));
    descricao.slice(1).forEach((extra) => linhas.push(`${recuoDescricao}${extra}`.slice(0, CUPOM_WIDTH)));

    const esquerda = `${item.quantity} UN x R$ ${formatBRL(item.finalUnitPrice)}`;
    const direita = `R$ ${formatBRL(item.total)}`;
    const espacos = Math.max(1, CUPOM_WIDTH - 9 - esquerda.length - direita.length);
    linhas.push((' '.repeat(9) + esquerda + ' '.repeat(espacos) + direita).slice(0, CUPOM_WIDTH));
  });

  linhas.push(HR);
  linhas.push(linhaRotuloValor('SUBTOTAL ITENS:', `R$ ${formatBRL(quote.subtotalAmount)}`));
  if (quote.discountAmount > 0) {
    linhas.push(linhaRotuloValor('DESCONTO CONCEDIDO:', `-R$ ${formatBRL(quote.discountAmount)}`));
  }
  linhas.push(HR_DUPLA);
  linhas.push(linhaRotuloValor('VALOR TOTAL A PAGAR:', `R$ ${formatBRL(quote.totalAmount)}`));
  linhas.push(HR_DUPLA);

  // Condições comerciais — sem emoji nem caracteres que a fonte da térmica não imprima.
  linhas.push('FORMA DE PAGAMENTO SUGERIDA:');
  empilharComRecuo(linhas, `* ${quote.paymentCondition || 'À Vista / Pix (5% desc.) / Cartão até 6x s/ juros'}`, '  ');
  linhas.push(`* Chave Pix (CNPJ): ${company.cnpj}`.slice(0, CUPOM_WIDTH));

  linhas.push(HR);
  linhas.push('OBSERVAÇÕES & TERMOS DE GARANTIA:');
  empilharComRecuo(linhas, '- Garantia legal de 90 dias conforme CDC.', '  ');
  empilharComRecuo(linhas, '- Preços válidos mediante disponibilidade no estoque.', '  ');
  empilharComRecuo(linhas, `- Para efetivar o pedido, envie uma foto deste cupom ou responda nosso WhatsApp: ${company.whatsapp}`, '  ');

  linhas.push(HR_DUPLA);
  linhas.push(centralizar('OBRIGADO PELA PREFERÊNCIA!'));
  linhas.push(centralizar('GATO - Gestão e Autopeças Total'));
  linhas.push(centralizar('Documento sem valor fiscal'));
  linhas.push('');
  linhas.push('');
  linhas.push('');

  return linhas.join('\n');
}

/**
 * Resumo curto do orçamento, para colar em WhatsApp, e-mail ou bloco de notas.
 * Cinco linhas: número, cliente, quantidade de itens, total e validade.
 */
export function buildOrcamentoResumo(quote: Quote): string {
  const quantidadeItens = (quote.items || []).length;
  return [
    `ORÇAMENTO Nº: ${quote.quoteNumber}`,
    `Cliente: ${quote.customerName || 'Não informado'}`,
    `Itens: ${quantidadeItens}`,
    `Total: R$ ${formatBRL(quote.totalAmount)}`,
    `Validade: ${formatarData(quote.validUntil)}`,
  ].join('\n');
}

/**
 * Documento HTML completo do orçamento para a janela de impressão térmica.
 *
 * É o que permite imprimir SEM imprimir o app inteiro: a janela é aberta por
 * `printHtmlDocument` e contém apenas este HTML.
 *
 * - `<meta charset="utf-8">` é obrigatório, senão os acentos saem corrompidos.
 * - `font-size: 9px` em fonte monoespaçada dá ~1,43mm por caractere, então as 48 colunas
 *   ocupam ~68,6mm — com folga dentro dos 72mm imprimíveis. A 10px daria 76,2mm e cortaria.
 * - `@page { margin: 0 }` é o que suprime cabeçalho e rodapé do navegador (URL, data, "1/1").
 */
export function buildOrcamentoThermalHtml(
  quote: Quote,
  company: CompanyReceiptInfo = DEFAULT_COMPANY_RECEIPT_INFO
): string {
  const texto = generateCupomFiscalText(quote, company);
  const titulo = `Orçamento ${quote.quoteNumber}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(titulo)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { padding: 2mm 0 8mm; text-align: center; }
  pre {
    display: inline-block;
    margin: 0;
    text-align: left;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9px;
    line-height: 1.35;
    letter-spacing: 0;
    white-space: pre;
    overflow: visible;
    color: #000;
  }
</style>
</head>
<body><pre>${escapeHtml(texto)}</pre></body>
</html>`;
}

/**
 * Documento do orçamento em TABELA (A4 paisagem) — o modelo de "pedido" que o
 * balcão reconhece: uma linha por peça, ICMS por item e o rodapé de totais.
 *
 * Complementa `buildOrcamentoThermalHtml` (cupom 80mm), **não substitui**: a
 * térmica continua no balcão e a tabela é para quem tem impressora A4.
 *
 * Duas regras que valem a pena entender:
 * - a coluna EQUIVALÊNCIA sai de `Product.similarCodes` (o cadastro já tem o
 *   campo e nenhuma impressão o usava); item de produto não cadastrado sai com
 *   a coluna vazia, sem quebrar o documento;
 * - o ICMS por item é DERIVADO da alíquota que o próprio orçamento carrega
 *   (`taxAmount` ÷ soma dos itens × total do item). Orçamento sem informação
 *   fiscal (ex.: vindo do banco) imprime R$ 0,00 — não inventamos imposto.
 */
export function buildOrcamentoTabelaHtml(
  quote: Quote,
  company: CompanyReceiptInfo = DEFAULT_COMPANY_RECEIPT_INFO,
  products: Product[] = []
): string {
  const itens = quote.items || [];
  const somaItens = itens.reduce((acc, item) => acc + (Number(item.total) || 0), 0);
  const aliquota = somaItens > 0 && quote.taxAmount > 0 ? quote.taxAmount / somaItens : 0;
  const produtoPorId = new Map(products.map((produto) => [produto.id, produto]));

  const linhasItens = itens.length
    ? itens
        .map((item, index) => {
          const equivalentes = produtoPorId.get(item.productId)?.similarCodes?.join(', ') || '';
          const icmsItem = (Number(item.total) || 0) * aliquota;
          return `
      <tr>
        <td class="centro">${String(index + 1).padStart(3, '0')}</td>
        <td class="mono">${escapeHtml(item.productCode)}</td>
        <td>${escapeHtml(item.brand)}</td>
        <td class="descricao">${escapeHtml(item.productName)}</td>
        <td class="num">${item.quantity}</td>
        <td class="equivalencia mono">${escapeHtml(equivalentes)}</td>
        <td class="num">R$ ${formatBRL(item.finalUnitPrice)}</td>
        <td class="num">R$ ${formatBRL(icmsItem)}</td>
        <td class="num destaque">R$ ${formatBRL(item.total)}</td>
      </tr>`;
        })
        .join('')
    : `
      <tr>
        <td colspan="9" class="centro vazio">Nenhum item informado.</td>
      </tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Orçamento ${escapeHtml(quote.quoteNumber)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.35; color: #000; }
  .mono { font-family: 'Consolas', 'Courier New', monospace; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 6px; }
  .empresa .nome { font-size: 12px; font-weight: bold; }
  .doc-info { text-align: right; white-space: nowrap; }
  .doc-info .titulo { font-size: 13px; font-weight: bold; }
  .aviso { font-size: 8px; font-weight: bold; text-transform: uppercase; }
  .linha-info { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 3px; }
  .pagamento { font-weight: bold; margin: 5px 0 6px; }
  table.itens { width: 100%; border-collapse: collapse; }
  table.itens th, table.itens td { border: 1px solid #000; padding: 3px 4px; vertical-align: top; }
  table.itens th { background: #ececec; font-size: 8.5px; text-transform: uppercase; text-align: left; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  td.centro, th.centro { text-align: center; }
  .descricao { font-size: 9.5px; }
  .equivalencia { font-size: 8.5px; word-break: break-word; }
  .destaque { font-weight: bold; }
  .vazio { font-style: italic; padding: 8px; }
  table.rodape { width: 100%; border-collapse: collapse; margin-top: 6px; }
  table.rodape td { border: 1px solid #000; padding: 3px 4px; vertical-align: top; }
  table.rodape .rotulo { font-size: 8.5px; text-transform: uppercase; text-align: right; white-space: nowrap; }
  table.rodape .obs { width: 45%; font-size: 9px; }
  .assinatura { margin-top: 18px; display: flex; justify-content: space-between; gap: 24px; }
  .assinatura div { flex: 1; border-top: 1px solid #000; padding-top: 3px; text-align: center; font-size: 8.5px; }
</style>
</head>
<body>
<header>
  <div class="empresa">
    <div class="nome">${escapeHtml(company.name)}</div>
    <div>${escapeHtml(company.fantasyName)}</div>
    <div>CNPJ: ${escapeHtml(company.cnpj)} &nbsp; IE: ${escapeHtml(company.ie)}</div>
    <div>${escapeHtml(company.address)} — ${escapeHtml(company.city)}/${escapeHtml(company.uf)}</div>
    <div>Fone: ${escapeHtml(company.phone)} &nbsp; WhatsApp: ${escapeHtml(company.whatsapp)}</div>
  </div>
  <div class="doc-info">
    <div class="titulo">ORÇAMENTO Nº ${escapeHtml(quote.quoteNumber)}</div>
    <div>Emissão: ${escapeHtml(formatarData(quote.createdAt, '-'))}</div>
    <div>Validade: ${escapeHtml(formatarData(quote.validUntil))}</div>
    <div class="aviso">Documento auxiliar de venda (DAV) — sem valor fiscal</div>
  </div>
</header>

<div class="linha-info">
  <span><strong>Cliente:</strong> ${escapeHtml(quote.customerName || 'Não informado')}</span>
  <span><strong>Documento:</strong> ${escapeHtml(quote.customerDocument || '-')}</span>
  <span><strong>Cidade/UF:</strong> ${escapeHtml(quote.customerCity || '-')}/${escapeHtml(quote.customerUf || '-')}</span>
  <span><strong>Telefone:</strong> ${escapeHtml(quote.customerPhone || '-')}</span>
</div>
<div class="linha-info">
  <span><strong>Veículo:</strong> ${escapeHtml(quote.vehicleModel || '-')}</span>
  <span><strong>Placa:</strong> ${escapeHtml(quote.vehiclePlate || '-')}</span>
  <span><strong>Vendedor:</strong> ${escapeHtml(quote.sellerName || 'Balcão')}</span>
</div>
<div class="pagamento">Condição de pagamento: ${escapeHtml(quote.paymentCondition || 'A combinar')}</div>

<table class="itens">
  <colgroup>
    <col style="width: 5%" />
    <col style="width: 10%" />
    <col style="width: 9%" />
    <col style="width: 30%" />
    <col style="width: 6%" />
    <col style="width: 12%" />
    <col style="width: 9%" />
    <col style="width: 9%" />
    <col style="width: 10%" />
  </colgroup>
  <thead>
    <tr>
      <th class="centro">Item</th>
      <th>Código</th>
      <th>Fabricante</th>
      <th>Descrição do Item</th>
      <th class="num">Quantidade</th>
      <th>Equivalência</th>
      <th class="num">Preço do Item</th>
      <th class="num">ICMS do Item</th>
      <th class="num">Preço Total</th>
    </tr>
  </thead>
  <tbody>${linhasItens}
  </tbody>
</table>

<table class="rodape">
  <tr>
    <td rowspan="2" class="obs"><strong>Observação:</strong> ${escapeHtml(quote.notes || '')}</td>
    <td class="rotulo">Valor do ICMS</td>
    <td class="rotulo">Outras Despesas</td>
    <td class="rotulo">Valor Total:</td>
  </tr>
  <tr>
    <td class="num">R$ ${formatBRL(quote.taxAmount)}</td>
    <td class="num">R$ ${formatBRL(0)}</td>
    <td class="num destaque">R$ ${formatBRL(quote.totalAmount)}</td>
  </tr>
</table>

<div class="assinatura">
  <div>${escapeHtml(company.fantasyName)}</div>
  <div>${escapeHtml(quote.customerName || 'Cliente')}</div>
</div>
</body>
</html>`;
}

/**
 * Gera mensagem formatada com emojis e resumo das peças para envio no WhatsApp do cliente
 */
export function buildQuoteWhatsappMessage(
  quote: Quote,
  company: CompanyReceiptInfo = DEFAULT_COMPANY_RECEIPT_INFO
): string {
  const validadeDate = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('pt-BR') : '15 dias';
  const firstName = quote.customerName.split(' ')[0] || 'Cliente';

  let msg = `Olá, *${firstName}*! Tudo bem? 🚗💨\n\n`;
  msg += `Aqui é da equipe *${company.fantasyName}*.\n`;
  msg += `Conforme solicitado, segue o seu *Orçamento Estilo Cupom Comercial*:\n\n`;
  msg += `📋 *Orçamento Nº:* \`${quote.quoteNumber}\`\n`;
  if (quote.vehicleModel || quote.vehiclePlate) {
    msg += `🚘 *Veículo:* ${quote.vehicleModel || ''} ${quote.vehiclePlate ? `(${quote.vehiclePlate})` : ''}\n`;
  }
  msg += `📅 *Validade:* ${validadeDate}\n\n`;
  msg += `📦 *Itens Cotados:*\n`;

  quote.items.forEach((item, index) => {
    msg += `${index + 1}. *${item.productName}* (${item.brand})\n`;
    msg += `   └ Cód: \`${item.productCode}\` | ${item.quantity} un x R$ ${item.finalUnitPrice.toFixed(2)} = *R$ ${item.total.toFixed(2)}*\n`;
  });

  msg += `\n`;
  if (quote.discountAmount > 0) {
    msg += `🏷️ *Subtotal:* R$ ${quote.subtotalAmount.toFixed(2)}\n`;
    msg += `🎉 *Desconto Aplicado:* -R$ ${quote.discountAmount.toFixed(2)}\n`;
  }
  msg += `💰 *VALOR TOTAL: R$ ${quote.totalAmount.toFixed(2)}*\n\n`;

  msg += `💳 *Condições de Pagamento:*\n`;
  msg += `• *Pix:* 5% de desconto à vista (Chave CNPJ: ${company.cnpj})\n`;
  msg += `• *Cartão:* Até 6x sem juros no balcão ou link de pagamento\n`;
  msg += `• *Boleto / Faturado:* Sob aprovação cadastral\n\n`;

  msg += `Podemos reservar estas peças para você ou agendar a entrega/retirada? 🛠️\n`;
  msg += `Qualquer dúvida, é só responder esta mensagem!\n\n`;
  msg += `_Atenciosamente,_\n`;
  msg += `*${company.fantasyName}* • Fone: ${company.phone}`;

  return msg;
}

/**
 * Limpa número de telefone e abre WhatsApp via link nativo wa.me
 */
export function sendWhatsappMessage(phoneOrWhatsapp: string, text: string): boolean {
  const digitsOnly = phoneOrWhatsapp.replace(/\D/g, '');
  if (!digitsOnly) return false;

  // Add Brazil country code 55 if not present
  const fullPhone = digitsOnly.startsWith('55') && digitsOnly.length >= 12 ? digitsOnly : `55${digitsOnly}`;
  const encoded = encodeURIComponent(text);
  const url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encoded}`;

  window.open(url, '_blank');
  return true;
}

/**
 * Sincroniza uma cotação com a base de dados de Leads & Marketing
 */
export function syncQuoteToMarketingLead(
  quote: Quote,
  existingLeads: MarketingLead[]
): { updatedLeads: MarketingLead[]; leadCreatedOrUpdated: MarketingLead; isNew: boolean } {
  const customerWhatsapp = quote.customerWhatsapp || quote.customerPhone || '';
  const cleanPhone = customerWhatsapp.replace(/\D/g, '');
  const doc = quote.customerDocument.replace(/\D/g, '');

  // Detect auto categories from quote items
  const categoriesSet = new Set<string>();
  const tagsSet = new Set<string>();

  tagsSet.add('Cotação Balcão');
  if (quote.totalAmount > 1000) tagsSet.add('Ticket Alto');
  if (quote.customerType === 'mecanica') tagsSet.add('Oficina Mecânica');
  if (quote.customerType === 'frotista') tagsSet.add('Frotista');

  quote.items.forEach(it => {
    const nameLower = (it.productName + ' ' + it.productCode).toLowerCase();
    if (nameLower.includes('freio') || nameLower.includes('pastilha') || nameLower.includes('disco')) {
      categoriesSet.add('Freios');
      tagsSet.add('Linha Freio');
    }
    if (nameLower.includes('amortecedor') || nameLower.includes('suspens') || nameLower.includes('bieleta') || nameLower.includes('mola')) {
      categoriesSet.add('Suspensão');
      tagsSet.add('Linha Suspensão');
    }
    if (nameLower.includes('oleo') || nameLower.includes('filtro') || nameLower.includes('lubrificante')) {
      categoriesSet.add('Filtros e Óleo');
      tagsSet.add('Revisão e Troca de Óleo');
    }
    if (nameLower.includes('embreagem') || nameLower.includes('plato') || nameLower.includes('disco embreagem')) {
      categoriesSet.add('Embreagem');
      tagsSet.add('Transmissão');
    }
    if (nameLower.includes('bateria') || nameLower.includes('farol') || nameLower.includes('lampada') || nameLower.includes('alternador')) {
      categoriesSet.add('Elétrica');
      tagsSet.add('Linha Elétrica');
    }
    if (nameLower.includes('pneu') || nameLower.includes('camara')) {
      categoriesSet.add('Pneus');
    }
  });

  if (quote.vehicleModel) {
    tagsSet.add(quote.vehicleModel.split(' ')[0]); // Ex: "Gol", "Hilux", "Corolla"
  }

  // Check if lead already exists by phone or doc or customerId
  const existingIndex = existingLeads.findIndex(l => {
    if (cleanPhone && l.whatsapp.replace(/\D/g, '') === cleanPhone) return true;
    if (doc && l.document?.replace(/\D/g, '') === doc) return true;
    if (quote.customerId && l.customerId === quote.customerId) return true;
    return false;
  });

  const quotedItemsSummary = quote.items.map(it => `${it.quantity}x ${it.productName}`).join(', ');

  let updatedLead: MarketingLead;

  if (existingIndex >= 0) {
    const current = existingLeads[existingIndex];
    const mergedTags = Array.from(new Set([...current.tags, ...Array.from(tagsSet)]));
    const mergedCategories = Array.from(new Set([...current.quotedCategories, ...Array.from(categoriesSet)]));

    updatedLead = {
      ...current,
      name: quote.customerName || current.name,
      whatsapp: customerWhatsapp || current.whatsapp,
      phone: quote.customerPhone || current.phone,
      email: quote.customerEmail || current.email,
      document: quote.customerDocument || current.document,
      vehicleModel: quote.vehicleModel || current.vehicleModel,
      vehiclePlate: quote.vehiclePlate || current.vehiclePlate,
      lastQuoteId: quote.id,
      lastQuoteNumber: quote.quoteNumber,
      lastQuoteAmount: quote.totalAmount,
      lastQuotedAt: quote.createdAt,
      quotedCategories: mergedCategories.length > 0 ? mergedCategories : current.quotedCategories,
      quotedItemsSummary,
      status: quote.status === 'Convertido' ? 'convertido' : (current.status === 'convertido' ? 'oportunidade_remarketing' : 'cotado'),
      tags: mergedTags,
      optInMarketing: true,
    };

    const newLeads = [...existingLeads];
    newLeads[existingIndex] = updatedLead;
    return { updatedLeads: newLeads, leadCreatedOrUpdated: updatedLead, isNew: false };
  } else {
    updatedLead = {
      id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerId: quote.customerId,
      name: quote.customerName,
      whatsapp: customerWhatsapp,
      phone: quote.customerPhone,
      email: quote.customerEmail,
      document: quote.customerDocument,
      city: quote.customerCity || 'São Paulo',
      uf: quote.customerUf || 'SP',
      vehicleModel: quote.vehicleModel,
      vehiclePlate: quote.vehiclePlate,
      lastQuoteId: quote.id,
      lastQuoteNumber: quote.quoteNumber,
      lastQuoteAmount: quote.totalAmount,
      lastQuotedAt: quote.createdAt,
      quotedCategories: Array.from(categoriesSet),
      quotedItemsSummary,
      status: quote.status === 'Convertido' ? 'convertido' : 'cotado',
      optInMarketing: true,
      tags: Array.from(tagsSet),
      whatsappSentCount: quote.whatsappSentAt ? 1 : 0,
    };

    return { updatedLeads: [updatedLead, ...existingLeads], leadCreatedOrUpdated: updatedLead, isNew: true };
  }
}

/**
 * Exporta base de leads capturados das cotações para formato CSV
 */
export function exportMarketingLeadsToCSV(leads: MarketingLead[]): void {
  const headers = [
    'Nome do Cliente',
    'WhatsApp / Telefone',
    'Email',
    'CPF / CNPJ',
    'Veículo Cotado',
    'Placa',
    'Último Orçamento',
    'Valor Cotado (R$)',
    'Data da Cotação',
    'Categorias de Interesse',
    'Status do Lead',
    'Tags de Marketing',
    'Permite Marketing'
  ];

  const rows = leads.map(l => [
    `"${l.name.replace(/"/g, '""')}"`,
    `"${l.whatsapp || l.phone || ''}"`,
    `"${l.email || ''}"`,
    `"${l.document || ''}"`,
    `"${l.vehicleModel || ''}"`,
    `"${l.vehiclePlate || ''}"`,
    `"${l.lastQuoteNumber}"`,
    `"${l.lastQuoteAmount.toFixed(2)}"`,
    `"${new Date(l.lastQuotedAt).toLocaleDateString('pt-BR')}"`,
    `"${l.quotedCategories.join('; ')}"`,
    `"${l.status}"`,
    `"${l.tags.join('; ')}"`,
    `"${l.optInMarketing ? 'SIM' : 'NÃO'}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `leads_campanhas_whatsapp_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
