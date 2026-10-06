import React, { useState } from 'react';
import {
  Printer,
  Share2,
  Copy,
  Check,
  X,
  FileText,
  Phone,
  Car,
  QrCode,
  ShieldCheck,
  Send,
  MessageCircle,
  ExternalLink,
  Download,
  Tag,
  AlertCircle
} from 'lucide-react';
import { Quote, MarketingLead, CompanyProfile } from '../types';
import {
  DEFAULT_COMPANY_RECEIPT_INFO,
  generateCupomFiscalText,
  buildQuoteWhatsappMessage,
  buildOrcamentoResumo,
  buildOrcamentoThermalHtml,
  sendWhatsappMessage,
  CompanyReceiptInfo
} from '../utils/quoteMarketingSync';
import { printHtmlDocument } from '../utils/printDocument';
import { copyTextToClipboard } from '../utils/clipboard';

// Shim para logoDownloadKit removido
async function downloadLogoFormat(_profile: CompanyProfile, _format: string): Promise<void> {
  // Placeholder
}

interface CupomFiscalModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote | null;
  companyInfo?: CompanyReceiptInfo;
  onQuoteSentWhatsapp?: (updatedQuote: Quote, targetWhatsapp: string) => void;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const CupomFiscalModal: React.FC<CupomFiscalModalProps> = ({
  isOpen,
  onClose,
  quote,
  companyInfo = DEFAULT_COMPANY_RECEIPT_INFO,
  onQuoteSentWhatsapp,
  onShowNotification
}) => {
  const [activeViewMode, setActiveViewMode] = useState<'cupom' | 'whatsapp' | 'txt'>('cupom');
  const [targetWhatsapp, setTargetWhatsapp] = useState<string>(
    quote?.customerWhatsapp || quote?.customerPhone || ''
  );
  const [customMessage, setCustomMessage] = useState<string>(() =>
    quote ? buildQuoteWhatsappMessage(quote, companyInfo) : ''
  );
  const [copiedText, setCopiedText] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // ⚠️ Este retorno precisa vir DEPOIS de todos os hooks. O modal é renderizado
  // incondicionalmente pelos pais, então retornar antes dos useState fazia o React encontrar
  // mais hooks do que no render anterior e lançar erro na primeira vez que o modal abria.
  if (!isOpen || !quote) return null;

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  /**
   * Imprime o orçamento numa janela própria (térmica 80mm). `window.print()` na página
   * imprimiria o app inteiro com o modal por cima — não há CSS de impressão no projeto.
   */
  const handlePrint = () => {
    const resultado = printHtmlDocument(buildOrcamentoThermalHtml(quote, companyInfo), {
      title: `Orçamento ${quote.quoteNumber}`,
    });

    if (!resultado.ok) {
      onShowNotification?.(
        'Pop-up bloqueado',
        'Autorize pop-ups neste site para imprimir o orçamento.',
        'warning'
      );
    }
  };

  const handleCopyReceiptText = () => {
    void copyTextToClipboard(generateCupomFiscalText(quote, companyInfo)).then((ok) => {
      if (!ok) {
        onShowNotification?.('Não foi possível copiar', 'Selecione o texto manualmente na aba Texto Puro.', 'warning');
        return;
      }
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
      onShowNotification?.('Copiado!', 'Texto do orçamento copiado para a área de transferência.', 'success');
    });
  };

  /** Copia o resumo curto: número, cliente, itens, total e validade. */
  const handleCopySummary = () => {
    void copyTextToClipboard(buildOrcamentoResumo(quote)).then((ok) => {
      if (!ok) {
        onShowNotification?.('Não foi possível copiar', 'Selecione o texto manualmente na aba Texto Puro.', 'warning');
        return;
      }
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
      onShowNotification?.(
        'Resumo Copiado!',
        'Número, cliente, quantidade de itens, total e validade na área de transferência.',
        'success'
      );
    });
  };

  const handleCopyWhatsappMsg = () => {
    void copyTextToClipboard(customMessage).then((ok) => {
      if (!ok) {
        onShowNotification?.('Não foi possível copiar', 'Copie a mensagem manualmente.', 'warning');
        return;
      }
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 2500);
      onShowNotification?.('Mensagem Copiada!', 'Texto para WhatsApp copiado.', 'success');
    });
  };

  const handleDownloadTxt = () => {
    const text = generateCupomFiscalText(quote, companyInfo);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orcamento_${quote.quoteNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowNotification?.('Download Concluído', `Arquivo orcamento_${quote.quoteNumber}.txt baixado.`, 'info');
  };

  const handleSendWhatsapp = () => {
    if (!targetWhatsapp.replace(/\D/g, '')) {
      onShowNotification?.('WhatsApp Inválido', 'Por favor, informe um número de WhatsApp com DDD para o envio.', 'warning');
      return;
    }

    setIsSending(true);
    const success = sendWhatsappMessage(targetWhatsapp, customMessage);

    if (success) {
      const updatedQuote: Quote = {
        ...quote,
        customerWhatsapp: targetWhatsapp,
        whatsappSentAt: new Date().toISOString()
      };

      onQuoteSentWhatsapp?.(updatedQuote, targetWhatsapp);

      onShowNotification?.(
        'WhatsApp Aberto com Sucesso!',
        `Orçamento encaminhado para ${targetWhatsapp}. O contato foi indexado no banco de leads para futuras campanhas de marketing!`,
        'success'
      );
    } else {
      onShowNotification?.('Erro no Envio', 'Não foi possível formatar o número informado.', 'warning');
    }

    setTimeout(() => setIsSending(false), 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-slate-100">
                  Orçamento
                </h3>
                <span className="text-[10px] font-mono font-bold bg-orange-500 text-slate-950 px-2 py-0.5 rounded-full">
                  {quote.quoteNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Cliente: <strong className="text-slate-200">{quote.customerName}</strong> • {quote.customerDocument}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Fechar janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Tabs & Marketing Lead Notice */}
        <div className="bg-slate-100/90 px-5 py-2.5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveViewMode('cupom')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeViewMode === 'cupom'
                  ? 'bg-[#0C4A6E] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Orçamento (80mm)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewMode('whatsapp')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeViewMode === 'whatsapp'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Enviar WhatsApp & CRM</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewMode('txt')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeViewMode === 'txt'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Texto Puro (TXT)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const compProfile: CompanyProfile = {
                  id: 'current',
                  corporateName: companyInfo.name,
                  tradeName: companyInfo.fantasyName,
                  cnpj: companyInfo.cnpj,
                  stateRegistration: companyInfo.ie,
                  address: companyInfo.address,
                  city: companyInfo.city,
                  uf: companyInfo.uf,
                  phone: companyInfo.whatsapp || companyInfo.phone,
                  email: '',
                  segment: 'Autopeças & Serviços',
                  isTrial: false,
                  trialDaysRemaining: 0,
                  planName: 'GATO Pro',
                  createdAt: new Date().toISOString(),
                };
                downloadLogoFormat(compProfile, 'banner');
                onShowNotification?.('Download Concluído', 'Cabeçalho e logotipo da empresa baixados para personalização do documento.', 'success');
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200"
              title="Baixar Logotipo e Cabeçalho da Empresa"
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>Baixar Logo / Cabeçalho</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Lead indexado no <strong>Banco de Dados de Marketing</strong></span>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          
          {/* VIEW 1: CUPOM FISCAL TÉRMICO (80mm) */}
          {activeViewMode === 'cupom' && (
            <div className="flex flex-col items-center">
              
              {/* Cupom Container with thermal paper styling */}
              <div
                id="thermal-receipt-container"
                className="w-full max-w-md bg-white border border-slate-300 shadow-md p-6 font-mono text-slate-800 text-xs rounded-sm relative"
                style={{
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  background: '#FCFDFD',
                  backgroundImage: 'radial-gradient(#00000008 1px, transparent 0)',
                  backgroundSize: '24px 24px'
                }}
              >
                {/* Paper Serration Accent Top */}
                <div className="absolute -top-1.5 left-0 right-0 h-1.5 bg-repeat-x flex items-center justify-between overflow-hidden opacity-40">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span key={i} className="inline-block w-2 h-2 bg-slate-300 rotate-45 -translate-y-1" />
                  ))}
                </div>

                {/* Company Fiscal Header */}
                <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-0.5">
                  <h4 className="font-black text-sm tracking-tight text-slate-900 uppercase">
                    {companyInfo.name}
                  </h4>
                  <p className="font-bold text-xs text-orange-600 uppercase">
                    {companyInfo.fantasyName}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    CNPJ: {companyInfo.cnpj} | IE: {companyInfo.ie}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    {companyInfo.address} - {companyInfo.city}/{companyInfo.uf}
                  </p>
                  <p className="text-[10px] text-slate-600">
                    Fone: {companyInfo.phone} | WhatsApp: {companyInfo.whatsapp}
                  </p>
                </div>

                {/* Document Subtitle */}
                <div className="py-2.5 text-center border-b border-dashed border-slate-400">
                  <span className="font-black text-xs block text-slate-900 tracking-wider">
                    DOCUMENTO AUXILIAR DE ORÇAMENTO (DAV)
                  </span>
                  <span className="text-[9px] text-slate-500 block uppercase">
                    NÃO É DOCUMENTO FISCAL • COTAÇÃO COMERCIAL
                  </span>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-slate-700">
                    <span>Nº: {quote.quoteNumber}</span>
                    <span>{new Date(quote.createdAt).toLocaleDateString('pt-BR')} {new Date(quote.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Customer and Vehicle Data */}
                <div className="py-2 text-[10px] border-b border-dashed border-slate-400 space-y-0.5">
                  <div>
                    <span className="font-bold">CLIENTE:</span> {quote.customerName}
                  </div>
                  <div>
                    <span className="font-bold">CPF/CNPJ:</span> {quote.customerDocument}
                  </div>
                  {quote.customerPhone && (
                    <div>
                      <span className="font-bold">FONE:</span> {quote.customerPhone}
                    </div>
                  )}
                  {quote.vehicleModel && (
                    <div className="text-orange-950 font-bold bg-orange-50/70 px-1.5 py-0.5 rounded mt-0.5">
                      VEÍCULO: {quote.vehicleModel} {quote.vehiclePlate ? `• PLACA: ${quote.vehiclePlate}` : ''}
                    </div>
                  )}
                  <div>
                    <span className="font-bold">VENDEDOR:</span> {quote.sellerName || 'Balcão / Televendas'}
                  </div>
                </div>

                {/* Items Table Format */}
                <div className="py-2.5 border-b border-dashed border-slate-400">
                  <div className="grid grid-cols-12 text-[10px] font-black border-b border-slate-300 pb-1 text-slate-900">
                    <span className="col-span-6">DESCRIÇÃO / CÓD</span>
                    <span className="col-span-2 text-center">QTD</span>
                    <span className="col-span-4 text-right">TOTAL</span>
                  </div>

                  <div className="divide-y divide-slate-100 py-1 space-y-1">
                    {quote.items.map((it, idx) => (
                      <div key={idx} className="pt-1 text-[10px]">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span className="truncate max-w-[200px]">{idx + 1}. {it.productName}</span>
                          <span>{formatBRL(it.total)}</span>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500">
                          <span>Cód: {it.productCode} • {it.brand}</span>
                          <span>{it.quantity} un x {formatBRL(it.finalUnitPrice)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals Section */}
                <div className="py-2.5 border-b border-dashed border-slate-400 text-xs space-y-1">
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>SUBTOTAL DOS ITENS:</span>
                    <span>{formatBRL(quote.subtotalAmount)}</span>
                  </div>

                  {quote.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold text-[11px]">
                      <span>DESCONTO CONCEDIDO:</span>
                      <span>-{formatBRL(quote.discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-black text-sm text-slate-950 pt-1 border-t border-slate-300">
                    <span>TOTAL A PAGAR:</span>
                    <span className="text-base text-[#0C4A6E]">{formatBRL(quote.totalAmount)}</span>
                  </div>
                </div>

                {/* Payment Condition & Pix Key */}
                <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px] space-y-1">
                  <div className="font-bold text-slate-800">
                    FORMA DE PAGAMENTO SUGERIDA:
                  </div>
                  <p className="text-slate-600">
                    {quote.paymentCondition || 'Pix à Vista (5% de desc.) / Cartão até 6x s/ juros'}
                  </p>
                  <div className="bg-slate-100 p-2 rounded border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 block">CHAVE PIX (CNPJ):</span>
                      <span className="font-mono font-bold text-slate-900">{companyInfo.cnpj}</span>
                    </div>
                    <QrCode className="w-7 h-7 text-slate-700" />
                  </div>
                </div>

                {/* Footer and Terms */}
                <div className="pt-3 text-center text-[9px] text-slate-500 space-y-1">
                  <p className="font-bold text-slate-700">
                    VALIDADE DA COTAÇÃO: {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('pt-BR') : '15 dias'}
                  </p>
                  <p>
                    Preços e estoque sujeitos a confirmação. Garantia legal de 90 dias conforme Art. 26 do CDC.
                  </p>
                  <p className="font-bold text-slate-800 uppercase tracking-widest pt-1">
                    OBRIGADO PELA PREFERÊNCIA!
                  </p>
                </div>

                {/* Paper Serration Accent Bottom */}
                <div className="absolute -bottom-1.5 left-0 right-0 h-1.5 bg-repeat-x flex items-center justify-between overflow-hidden opacity-40">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <span key={i} className="inline-block w-2 h-2 bg-slate-300 rotate-45 translate-y-1" />
                  ))}
                </div>
              </div>

              {/* Quick Actions under Cupom */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Orçamento (Térmica 80mm)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                  title="Copiar resumo: número, cliente, quantidade de itens, total e validade"
                >
                  {copiedSummary ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSummary ? 'Resumo Copiado!' : 'Copiar Orçamento (Resumo)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveViewMode('whatsapp')}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar para o WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReceiptText}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xs transition cursor-pointer"
                  title="Copiar o texto completo do orçamento"
                >
                  {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                  <span>{copiedText ? 'Copiado!' : 'Copiar Texto Completo'}</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: ENVIO PARA O WHATSAPP E MARKETING */}
          {activeViewMode === 'whatsapp' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              
              <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-emerald-950 text-xs sm:text-sm">
                    Envio Direto no WhatsApp & Captura para Campanhas de Marketing
                  </h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    O orçamento será enviado em formato comercial resumido. Ao disparar, o cliente é automaticamente salvo com tags no seu banco de dados de marketing para futuras ofertas e lembretes de revisão!
                  </p>
                </div>
              </div>

              {/* Recipient Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>WhatsApp do Cliente:</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={targetWhatsapp}
                    onChange={(e) => setTargetWhatsapp(e.target.value)}
                    placeholder="(XX) 9XXXX-XXXX"
                    className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-slate-900"
                  />
                  {quote.customerWhatsapp && targetWhatsapp !== quote.customerWhatsapp && (
                    <button
                      type="button"
                      onClick={() => setTargetWhatsapp(quote.customerWhatsapp || '')}
                      className="text-[11px] text-sky-700 hover:underline"
                    >
                      Restaurar Cadastrado
                    </button>
                  )}
                </div>
              </div>

              {/* Message Editor / Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Mensagem que será enviada:
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyWhatsappMsg}
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                    {copiedMsg ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedMsg ? 'Mensagem Copiada!' : 'Copiar Mensagem'}</span>
                  </button>
                </div>
                <textarea
                  rows={9}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800 leading-relaxed"
                />
              </div>

              {/* Marketing Tags Generated */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                  Tags automáticas adicionadas ao perfil de marketing deste cliente:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-bold text-[10px] border border-sky-200">
                    #Cotação Balcão
                  </span>
                  {quote.vehicleModel && (
                    <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-900 font-bold text-[10px] border border-orange-200">
                      #{quote.vehicleModel.split(' ')[0]}
                    </span>
                  )}
                  {quote.totalAmount > 1000 && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-200">
                      #Ticket Alto
                    </span>
                  )}
                  {quote.items.some(i => i.productName.toLowerCase().includes('freio') || i.productName.toLowerCase().includes('pastilha')) && (
                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold text-[10px] border border-purple-200">
                      #Linha Freio
                    </span>
                  )}
                  {quote.items.some(i => i.productName.toLowerCase().includes('amortecedor') || i.productName.toLowerCase().includes('suspens')) && (
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold text-[10px] border border-indigo-200">
                      #Linha Suspensão
                    </span>
                  )}
                  {quote.items.some(i => i.productName.toLowerCase().includes('oleo') || i.productName.toLowerCase().includes('filtro')) && (
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px] border border-emerald-200">
                      #Revisão e Troca de Óleo
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveViewMode('cupom')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  Voltar ao Orçamento
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsapp}
                  disabled={isSending}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSending ? 'Abrindo WhatsApp...' : 'Enviar para o WhatsApp & Salvar Lead'}</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: TEXTO PURO (TXT) PARA IMPRESSORAS SERIAIS */}
          {activeViewMode === 'txt' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    Texto Puro para Spooler Térmico / Impressoras Seriais
                  </h4>
                  <p className="text-xs text-slate-500">
                    Formato monospaçado 48 colunas padrão ESC/POS compatível com Daruma, Elgin, Bematech e Epson.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyReceiptText}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTxt}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar .TXT</span>
                  </button>
                </div>
              </div>

              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-[11px] font-mono overflow-x-auto leading-tight max-h-96">
                {generateCupomFiscalText(quote, companyInfo)}
              </pre>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Validade: <strong>{quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('pt-BR') : '15 dias'}</strong> • Total: <strong className="text-emerald-700 font-mono">{formatBRL(quote.totalAmount)}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
