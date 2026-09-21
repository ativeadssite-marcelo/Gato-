import { Quote, MarketingLead } from '../types';

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
 * Converte uma cotação/orçamento em formato texto idêntico ao de impressora térmica (Cupom 80mm).
 */
export function generateCupomFiscalText(
  quote: Quote,
  company: CompanyReceiptInfo = DEFAULT_COMPANY_RECEIPT_INFO
): string {
  const line = '------------------------------------------------';
  const doubleLine = '================================================';
  const dateStr = new Date(quote.createdAt).toLocaleDateString('pt-BR');
  const timeStr = new Date(quote.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let text = '';
  text += `${company.name}\n`;
  text += `${company.fantasyName}\n`;
  text += `CNPJ: ${company.cnpj}  IE: ${company.ie}\n`;
  text += `${company.address} - ${company.city}/${company.uf}\n`;
  text += `Fone: ${company.phone} | WhatsApp: ${company.whatsapp}\n`;
  text += `${doubleLine}\n`;
  text += `   DOCUMENTO AUXILIAR DE ORÇAMENTO / COTAÇÃO   \n`;
  text += `        NÃO POSSUI VALOR FISCAL (DAV)          \n`;
  text += `${doubleLine}\n`;
  text += `ORÇAMENTO Nº: ${quote.quoteNumber}\n`;
  text += `EMISSÃO: ${dateStr} às ${timeStr}\n`;
  text += `VALIDADE: Até ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('pt-BR') : '15 dias'} (sujeito à variação)\n`;
  text += `VENDEDOR: ${quote.sellerName || 'Balcão / Televendas'}\n`;
  text += `${line}\n`;
  text += `CLIENTE: ${quote.customerName}\n`;
  text += `DOC: ${quote.customerDocument} | UF: ${quote.customerUf || 'MS'}\n`;
  if (quote.customerPhone || quote.customerWhatsapp) {
    text += `CONTATO: ${quote.customerWhatsapp || quote.customerPhone}\n`;
  }
  if (quote.vehicleModel || quote.vehiclePlate) {
    text += `VEÍCULO: ${quote.vehicleModel || 'Universal'} | PLACA: ${quote.vehiclePlate || 'Não Informada'}\n`;
  }
  text += `${line}\n`;
  text += `ITEM  CÓDIGO    DESCRIÇÃO                QTD  UN   VALOR\n`;
  text += `${line}\n`;

  quote.items.forEach((item, index) => {
    const idx = String(index + 1).padStart(2, '0');
    const code = (item.productCode || 'PEC').padEnd(8, ' ').slice(0, 8);
    const name = item.productName.padEnd(22, ' ').slice(0, 22);
    const qty = String(item.quantity).padStart(3, ' ');
    const total = `R$ ${item.total.toFixed(2)}`.padStart(10, ' ');
    text += `${idx}   ${code} ${name} ${qty} un ${total}\n`;
  });

  text += `${line}\n`;
  text += `SUBTOTAL ITENS:                 R$ ${quote.subtotalAmount.toFixed(2).padStart(10, ' ')}\n`;
  if (quote.discountAmount > 0) {
    text += `DESCONTO CONCEDIDO:            -R$ ${quote.discountAmount.toFixed(2).padStart(10, ' ')}\n`;
  }
  text += `${doubleLine}\n`;
  text += `VALOR TOTAL A PAGAR:            R$ ${quote.totalAmount.toFixed(2).padStart(10, ' ')}\n`;
  text += `${doubleLine}\n`;

  text += `FORMA DE PAGAMENTO SUGERIDA:\n`;
  text += `* ${quote.paymentCondition || 'À Vista / Pix (5% desc.) / Cartão até 6x s/ juros'}\n`;
  text += `* Chave Pix (CNPJ): ${company.cnpj}\n`;
  text += `${line}\n`;
  text += `OBSERVAÇÕES & TERMOS DE GARANTIA:\n`;
  text += `- Garantia legal de 90 dias conforme CDC.\n`;
  text += `- Preços válidos mediante disponibilidade no estoque.\n`;
  text += `- Para efetivar o pedido, envie uma foto deste cupom\n`;
  text += `  ou responda nosso WhatsApp: ${company.whatsapp}\n`;
  text += `${doubleLine}\n`;
  text += `         OBRIGADO PELA PREFERÊNCIA!          \n`;
  text += `       GATO - Gestão e Autopeças Total        \n`;
  text += `\n\n\n`;

  return text;
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
