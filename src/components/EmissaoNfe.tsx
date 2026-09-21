import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Barcode, 
  QrCode, 
  Building2, 
  Plus,
  RotateCcw,
  Eye,
  ShieldCheck,
  Zap,
  ChevronRight,
  ArrowRight,
  Car,
  Check,
  Receipt,
  Truck,
  FileSpreadsheet
} from 'lucide-react';
import { InvoiceRecord, Product, Customer, CompanyProfile, BranchUnit, MdfeRecord } from '../types';
import { INITIAL_BRANCHES } from '../data/initialData';
import { NfceManager } from './NfceManager';
import { MdfeManager } from './MdfeManager';
import { SpedFiscalManager } from './SpedFiscalManager';

interface EmissaoNfeProps {
  invoices: InvoiceRecord[];
  products: Product[];
  customers: Customer[];
  companyProfile?: CompanyProfile;
  branches?: BranchUnit[];
  activeStore?: string;
  lastIssuedInvoiceId?: string | null;
  mdfeRecords?: MdfeRecord[];
  onUpdateMdfeRecords?: (records: MdfeRecord[]) => void;
  onClearLastIssuedInvoice?: () => void;
  onNavigateToQuote?: () => void;
  onNavigateToPartsApplication?: () => void;
  onAddNewInvoice: (invoice: InvoiceRecord) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const EmissaoNfe: React.FC<EmissaoNfeProps> = ({
  invoices,
  products,
  customers,
  companyProfile,
  branches,
  activeStore = 'matriz-ms',
  lastIssuedInvoiceId,
  mdfeRecords,
  onUpdateMdfeRecords,
  onClearLastIssuedInvoice,
  onNavigateToQuote,
  onNavigateToPartsApplication,
  onAddNewInvoice,
  onShowNotification,
}) => {
  const currentBranch = (branches && branches.find(b => b.id === activeStore)) || INITIAL_BRANCHES.find(b => b.id === activeStore) || INITIAL_BRANCHES[0];
  const sefazCode = currentBranch.sefazCode; // '50' for MS
  const emitterCorporateName = companyProfile?.corporateName || 'PANTANAL DISTRIBUIDORA DE AUTOPECAS LTDA';
  const emitterTradeName = companyProfile?.tradeName || currentBranch.name;

  const [activeTab, setActiveTab] = useState<'venda' | 'compra' | 'nfce' | 'mdfe' | 'sped'>('venda');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(invoices[0] || null);
  const [showDanfeModal, setShowDanfeModal] = useState(false);
  const [showNewNfeModal, setShowNewNfeModal] = useState(false);

  // Auto-select and open DANFE modal if an invoice was just issued from Balcão/Cotação
  useEffect(() => {
    if (lastIssuedInvoiceId) {
      const inv = invoices.find(i => i.id === lastIssuedInvoiceId);
      if (inv) {
        setSelectedInvoice(inv);
        setShowDanfeModal(true);
      }
    }
  }, [lastIssuedInvoiceId, invoices]);

  // New Sale NF-e Form State
  const [newNfeForm, setNewNfeForm] = useState({
    customerId: customers[0]?.id || '',
    productId: products[0]?.id || '',
    quantity: 1,
    naturezaOperacao: 'Venda de mercadoria adquirida de terceiros (Operação Interna MS ➔ MS)',
    modalidadeFrete: '0 - Contratação do Frete por conta do Remetente (CIF)',
  });

  const filteredInvoices = invoices.filter(inv => inv.type === activeTab);

  // Generate realistic 44-digit Brazilian NF-e access key with current branch SEFAZ code (MS: 50)
  const generateAccessKey = () => {
    const uf = sefazCode; // '50' for MS
    const aamm = '2609'; // 2026-09
    const cnpj = currentBranch.cnpj.replace(/\D/g, '').padEnd(14, '0');
    const mod = '55';
    const serie = '001';
    const num = Math.floor(100000000 + Math.random() * 900000000).toString();
    const tpEmis = '1';
    const cNF = Math.floor(10000000 + Math.random() * 90000000).toString();
    const dv = Math.floor(Math.random() * 10).toString();
    return `${uf}${aamm}${cnpj}${mod}${serie}${num.slice(0, 9)}${tpEmis}${cNF.slice(0, 8)}${dv}`;
  };

  const handleEmitSaleNfe = (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find(c => c.id === newNfeForm.customerId) || customers[0];
    const product = products.find(p => p.id === newNfeForm.productId) || products[0];

    const isInternal = (customer.uf || 'MS') === currentBranch.uf;
    const icmsTaxRate = isInternal ? 0.17 : 0.18; // 17% MS internal
    const totalProd = product.sellingPrice * newNfeForm.quantity;
    const totalTaxes = totalProd * icmsTaxRate;
    const newKey = generateAccessKey();
    const newNumber = (124990 + invoices.length).toString();

    const createdInvoice: InvoiceRecord = {
      id: `inv-venda-${Date.now()}`,
      type: 'venda',
      number: `000.${newNumber.slice(0, 3)}.${newNumber.slice(3)}`,
      series: '1',
      accessKey: newKey,
      issuedAt: new Date().toISOString(),
      partyName: customer.name,
      partyDocument: customer.document,
      totalProducts: totalProd,
      totalTaxes: totalTaxes,
      totalAmount: totalProd,
      itemsCount: 1,
      sefazStatus: 'Autorizada',
      danfeProtocol: `1${sefazCode}260${Math.floor(100000000 + Math.random() * 900000000)}`,
      channel: 'balcao',
    };

    onAddNewInvoice(createdInvoice);
    setSelectedInvoice(createdInvoice);
    setShowNewNfeModal(false);
    setShowDanfeModal(true);

    onShowNotification(
      'NF-e de Venda Autorizada na SEFAZ!',
      `Nota Fiscal nº ${createdInvoice.number} emitida para ${customer.name}. Chave: ${newKey.slice(0, 16)}...`,
      'success'
    );
  };

  const handleDownloadXml = (invoice: InvoiceRecord) => {
    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${invoice.accessKey}" versao="4.00">
      <ide>
        <cUF>35</cUF>
        <cNF>09812734</cNF>
        <natOp>VENDA DE MERCADORIA</natOp>
        <mod>55</mod>
        <serie>${invoice.series}</serie>
        <nNF>${invoice.number.replace(/\D/g, '')}</nNF>
        <dhEmi>${invoice.issuedAt}</dhEmi>
        <tpNF>${invoice.type === 'venda' ? '1' : '0'}</tpNF>
      </ide>
      <emit>
        <CNPJ>${currentBranch.cnpj.replace(/\D/g, '')}</CNPJ>
        <xNome>${emitterCorporateName.toUpperCase()}</xNome>
        <xFant>${emitterTradeName.toUpperCase()}</xFant>
        <IE>${currentBranch.ie.replace(/\D/g, '')}</IE>
        <UF>${currentBranch.uf}</UF>
      </emit>
      <dest>
        <CNPJ>${invoice.partyDocument.replace(/\D/g, '')}</CNPJ>
        <xNome>${invoice.partyName}</xNome>
        <UF>SP</UF>
      </dest>
      <total>
        <ICMSTot>
          <vProd>${invoice.totalProducts.toFixed(2)}</vProd>
          <vNF>${invoice.totalAmount.toFixed(2)}</vNF>
        </ICMSTot>
      </total>
    </infNFe>
    <protNFe versao="4.00">
      <infProt>
        <tpAmb>1</tpAmb>
        <verAplic>SP_NFE_PL_009</verAplic>
        <chNFe>${invoice.accessKey}</chNFe>
        <dhRecbto>${invoice.issuedAt}</dhRecbto>
        <nProt>${invoice.danfeProtocol}</nProt>
        <cStat>100</cStat>
        <xMotivo>Autorizado o uso da NF-e</xMotivo>
      </infProt>
    </protNFe>
  </NFe>
</nfeProc>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NFe_${invoice.accessKey}.xml`;
    a.click();
    URL.revokeObjectURL(url);

    onShowNotification('Download Iniciado', `Arquivo XML da NF-e nº ${invoice.number} gerado para download.`, 'info');
  };

  return (
    <div className="space-y-6" id="view-emissao-nfe">
      {/* Sequential Sales Stepper */}
      <div className="bg-white rounded-2xl border border-sky-100 p-3 shadow-xs flex items-center justify-between gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-black uppercase text-sky-800 tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Fluxo Sequencial de Venda:
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold">
          <button
            type="button"
            onClick={onNavigateToPartsApplication}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
            title="Ir para Consulta de Aplicação Veicular"
          >
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">1</span>
            <span>Aplicação Veicular</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

          <button
            type="button"
            onClick={onNavigateToQuote}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
            title="Ir para Cotação e Balcão"
          >
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-black">2</span>
            <span>Cotação & Balcão (DAV)</span>
          </button>

          <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">3</span>
            <span>Faturamento & Emissão de NF-e</span>
            <span className="text-[10px] text-emerald-800 bg-emerald-200/70 px-1.5 py-0.5 rounded font-bold">Autorizada</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToQuote && (
            <button
              type="button"
              onClick={onNavigateToQuote}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <span>+ Nova Cotação Balcão</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner when triggered from Balcão */}
      {lastIssuedInvoiceId && selectedInvoice && selectedInvoice.id === lastIssuedInvoiceId && (
        <div className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-2xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-2 py-0.5 rounded">
                  Faturamento de Balcão Concluído com Sucesso
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  NF-e Nº {selectedInvoice.number} • Série {selectedInvoice.series}
                </span>
              </div>
              <p className="text-xs text-emerald-950 font-medium mt-0.5">
                A nota fiscal para <strong>{selectedInvoice.partyName}</strong> foi autorizada na SEFAZ-{currentBranch.uf}. 
                {selectedInvoice.vehicleInfo?.model && ` Peças vinculadas ao veículo ${selectedInvoice.vehicleInfo.model} (${selectedInvoice.vehicleInfo.plate || 'Sem placa'}).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDanfeModal(true)}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Visualizar DANFE</span>
            </button>
            {onClearLastIssuedInvoice && (
              <button
                type="button"
                onClick={onClearLastIssuedInvoice}
                className="p-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                title="Fechar aviso"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-700 font-bold text-xs uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4 text-sky-600" />
            <span>Módulo 1: Emissão de NF de Venda & Controle Fiscal</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 font-['Outfit'] tracking-tight">
            Emissão Automática de NF-e e NFC-e
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">
            Emissão em contingência ou normal autorizada na SEFAZ, chave de 44 dígitos com código de barras, impressão de DANFE e baixa de XML.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-open-new-nfe-modal"
            onClick={() => setShowNewNfeModal(true)}
            className="flex items-center gap-2 bg-sky-950 hover:bg-sky-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Emitir Nova NF-e de Venda</span>
          </button>
        </div>
      </div>

      {/* Tabs: Vendas vs Compras vs NFC-e vs MDF-e vs SPED */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 gap-2">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('venda')}
            className={`pb-3 px-3 sm:px-4 text-xs font-extrabold transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'venda' 
                ? 'border-sky-600 text-sky-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            NF-e Venda (Mod. 55)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('compra')}
            className={`pb-3 px-3 sm:px-4 text-xs font-extrabold transition border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'compra' 
                ? 'border-sky-600 text-sky-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            NF-e Entrada (XML)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('nfce')}
            className={`pb-3 px-3 sm:px-4 text-xs font-extrabold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'nfce' 
                ? 'border-emerald-600 text-emerald-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-3.5 h-3.5 text-emerald-600" />
            <span>NFC-e Balcão (Mod. 65)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mdfe')}
            className={`pb-3 px-3 sm:px-4 text-xs font-extrabold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'mdfe' 
                ? 'border-indigo-600 text-indigo-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            <span>MDF-e Carga (Mod. 58)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sped')}
            className={`pb-3 px-3 sm:px-4 text-xs font-extrabold transition border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sped' 
                ? 'border-sky-600 text-sky-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-600" />
            <span>SPED Fiscal (EFD)</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-semibold pr-2 pb-2 sm:pb-0">
          SEFAZ {currentBranch.uf}: <strong className="text-emerald-700">Online 100%</strong>
        </span>
      </div>

      {/* Conteúdo dinâmico das Abas Fiscais */}
      {activeTab === 'nfce' && (
        <NfceManager
          products={products}
          activeBranch={currentBranch}
          companyProfile={companyProfile}
          onShowNotification={onShowNotification}
        />
      )}

      {activeTab === 'mdfe' && (
        <MdfeManager
          invoices={invoices}
          activeBranch={currentBranch}
          companyProfile={companyProfile}
          mdfeRecords={mdfeRecords}
          onUpdateMdfeRecords={onUpdateMdfeRecords}
          onShowNotification={onShowNotification}
        />
      )}

      {activeTab === 'sped' && (
        <SpedFiscalManager
          invoices={invoices}
          products={products}
          activeBranch={currentBranch}
          companyProfile={companyProfile}
          onShowNotification={onShowNotification}
        />
      )}

      {(activeTab === 'venda' || activeTab === 'compra') && (
        /* Invoices List Table */
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-3.5 pl-4">Número / Série</th>
                  <th className="p-3.5">Chave de Acesso (44 Dígitos)</th>
                  <th className="p-3.5">{activeTab === 'venda' ? 'Cliente Destinatário' : 'Fornecedor Emitente'}</th>
                  <th className="p-3.5">Data de Emissão</th>
                  <th className="p-3.5 text-right">Valor da NF</th>
                  <th className="p-3.5 text-center">Status SEFAZ</th>
                  <th className="p-3.5 text-center pr-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Nenhuma nota fiscal registrada nesta aba.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-sky-50/40 transition">
                      <td className="p-3.5 pl-4 align-middle">
                        <span className="font-mono font-bold text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                          {inv.number}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Série {inv.series}</span>
                      </td>

                      <td className="p-3.5 align-middle">
                        <span className="font-mono text-[10px] text-slate-600 truncate block max-w-xs" title={inv.accessKey}>
                          {inv.accessKey.slice(0, 4)} {inv.accessKey.slice(4, 8)} ... {inv.accessKey.slice(-8)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Prot: {inv.danfeProtocol}</span>
                      </td>

                      <td className="p-3.5 align-middle">
                        <p className="font-extrabold text-slate-900">{inv.partyName}</p>
                        <span className="text-[10px] text-slate-500 font-mono">{inv.partyDocument}</span>
                      </td>

                      <td className="p-3.5 align-middle text-slate-600">
                        {new Date(inv.issuedAt).toLocaleDateString('pt-BR')} às {new Date(inv.issuedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="p-3.5 align-middle text-right font-mono font-black text-slate-900">
                        R$ {inv.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-3.5 align-middle text-center">
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {inv.sefazStatus}
                        </span>
                      </td>

                      <td className="p-3.5 pr-4 align-middle text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setShowDanfeModal(true);
                            }}
                            className="flex items-center gap-1 p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold"
                            title="Visualizar DANFE"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>DANFE</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadXml(inv)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                            title="Baixar Arquivo XML"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DANFE MODAL VIEWER */}
      {showDanfeModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-sky-100 space-y-5 animate-in fade-in duration-150">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-700" />
                <h3 className="text-base font-black text-slate-900">
                  Documento Auxiliar da Nota Fiscal Eletrônica (DANFE)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir DANFE</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadXml(selectedInvoice)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar XML</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDanfeModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Realistic Printable Brazilian DANFE Layout */}
            <div className="border-2 border-slate-900 p-4 rounded-lg font-sans text-xs space-y-3 bg-white text-slate-950">
              {/* Top Row: Issuer info + DANFE block + Barcode block */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 border-b border-slate-900 pb-3">
                <div className="md:col-span-5 space-y-1">
                  <h2 className="text-base font-black tracking-tight uppercase">{emitterTradeName}</h2>
                  <p className="text-[11px] font-bold text-slate-800">{emitterCorporateName}</p>
                  <p className="text-[10px] leading-snug text-slate-600">
                    Comercialização de Peças Automotivas, Motopeças e Serviços<br />
                    {currentBranch.address}<br />
                    CNPJ: <strong>{currentBranch.cnpj}</strong> • IE: <strong>{currentBranch.ie}</strong> • SEFAZ-{currentBranch.uf} ({currentBranch.isMatriz ? 'MATRIZ' : 'FILIAL'})
                  </p>
                  <span className="inline-block text-[9px] text-slate-400 font-mono">
                    Emitido via Sistema GATO ERP
                  </span>
                </div>

                <div className="md:col-span-3 text-center border-x border-slate-900 px-2 flex flex-col justify-center">
                  <span className="font-black text-sm uppercase block">DANFE</span>
                  <span className="text-[9px] block">Documento Auxiliar da Nota Fiscal Eletrônica</span>
                  <div className="my-1 text-[10px] font-bold">
                    0 - Entrada<br />
                    1 - Saída: <strong className="border border-slate-900 px-1 text-xs">1</strong>
                  </div>
                  <span className="font-mono text-xs font-black">Nº {selectedInvoice.number}</span>
                  <span className="text-[10px]">SÉRIE: {selectedInvoice.series}</span>
                </div>

                <div className="md:col-span-4 flex flex-col justify-center items-center text-center">
                  {/* Simulated Code 128 Barcode */}
                  <div className="w-full flex items-center justify-center py-1">
                    <div className="h-10 w-full bg-slate-900 flex items-center justify-around px-1">
                      {Array.from({ length: 44 }).map((_, i) => (
                        <div key={i} className={`h-full ${i % 3 === 0 ? 'w-1 bg-white' : i % 2 === 0 ? 'w-0.5 bg-white' : 'w-1.5 bg-slate-900'}`} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase block mt-1">Chave de Acesso</span>
                  <span className="font-mono text-[9px] font-black break-all tracking-wider">
                    {selectedInvoice.accessKey}
                  </span>
                  <span className="text-[9px] text-slate-700 mt-0.5">
                    Protocolo: {selectedInvoice.danfeProtocol}
                  </span>
                </div>
              </div>

              {/* Destinatário */}
              <div className="border border-slate-900 p-2 rounded">
                <span className="text-[9px] font-black uppercase block text-slate-600">Destinatário / Remetente</span>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div>
                    <span className="text-[9px] text-slate-500 block">Nome / Razão Social:</span>
                    <strong className="text-xs">{selectedInvoice.partyName}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">CNPJ / CPF:</span>
                    <strong className="text-xs font-mono">{selectedInvoice.partyDocument}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Data de Emissão:</span>
                    <strong className="text-xs">{new Date(selectedInvoice.issuedAt).toLocaleDateString('pt-BR')}</strong>
                  </div>
                </div>
              </div>

              {/* Cálculo do Imposto */}
              <div className="border border-slate-900 p-2 rounded">
                <span className="text-[9px] font-black uppercase block text-slate-600">Cálculo do Imposto</span>
                <div className="grid grid-cols-4 gap-2 mt-1 font-mono text-center">
                  <div className="bg-slate-50 p-1 border border-slate-200">
                    <span className="text-[8px] text-slate-500 block uppercase font-sans">Base Cálculo ICMS</span>
                    <strong>R$ {selectedInvoice.totalProducts.toFixed(2)}</strong>
                  </div>
                  <div className="bg-slate-50 p-1 border border-slate-200">
                    <span className="text-[8px] text-slate-500 block uppercase font-sans">Valor do ICMS (18%)</span>
                    <strong>R$ {selectedInvoice.totalTaxes.toFixed(2)}</strong>
                  </div>
                  <div className="bg-slate-50 p-1 border border-slate-200">
                    <span className="text-[8px] text-slate-500 block uppercase font-sans">Total dos Produtos</span>
                    <strong>R$ {selectedInvoice.totalProducts.toFixed(2)}</strong>
                  </div>
                  <div className="bg-slate-100 p-1 border border-slate-300 font-extrabold text-sky-950">
                    <span className="text-[8px] text-slate-700 block uppercase font-sans">Total da Nota</span>
                    <strong>R$ {selectedInvoice.totalAmount.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {/* Dados dos Produtos / Serviços */}
              <div className="border border-slate-900 rounded overflow-hidden">
                <div className="bg-slate-100 px-2 py-1 border-b border-slate-900 flex justify-between items-center text-[9px] font-black uppercase text-slate-700">
                  <span>Dados dos Produtos / Serviços (Peças Automotivas)</span>
                  <span>{selectedInvoice.itemsList?.length || selectedInvoice.itemsCount || 1} item(ns)</span>
                </div>
                <table className="w-full text-left text-[10px] font-mono">
                  <thead className="bg-slate-50 border-b border-slate-300 text-[9px] font-bold text-slate-700 uppercase">
                    <tr>
                      <th className="p-1.5 w-24">CÓDIGO</th>
                      <th className="p-1.5 font-sans">DESCRIÇÃO DO PRODUTO</th>
                      <th className="p-1.5 w-16 text-center">NCM</th>
                      <th className="p-1.5 w-14 text-center">CST</th>
                      <th className="p-1.5 w-12 text-center">QTD</th>
                      <th className="p-1.5 w-24 text-right">V. UNIT</th>
                      <th className="p-1.5 w-24 text-right">V. TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedInvoice.itemsList && selectedInvoice.itemsList.length > 0 ? (
                      selectedInvoice.itemsList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-1.5 font-bold text-slate-900">{item.code}</td>
                          <td className="p-1.5 font-sans font-semibold uppercase text-slate-900">{item.name}</td>
                          <td className="p-1.5 text-center text-slate-600">8708.29.99</td>
                          <td className="p-1.5 text-center text-slate-600">010</td>
                          <td className="p-1.5 text-center font-bold">{item.quantity}</td>
                          <td className="p-1.5 text-right">R$ {item.unitPrice.toFixed(2)}</td>
                          <td className="p-1.5 text-right font-black">R$ {item.total.toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-1.5 font-bold">PECA-DIV</td>
                        <td className="p-1.5 font-sans font-semibold">PEÇAS E COMPONENTES AUTOMOTIVOS - REFERÊNCIA BALCÃO</td>
                        <td className="p-1.5 text-center text-slate-600">8708.29.99</td>
                        <td className="p-1.5 text-center text-slate-600">010</td>
                        <td className="p-1.5 text-center font-bold">{selectedInvoice.itemsCount || 1}</td>
                        <td className="p-1.5 text-right">R$ {(selectedInvoice.totalProducts / (selectedInvoice.itemsCount || 1)).toFixed(2)}</td>
                        <td className="p-1.5 text-right font-black">R$ {selectedInvoice.totalProducts.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Dados Adicionais / SEFAZ */}
              <div className="border border-slate-900 p-2 rounded text-[10px] space-y-1">
                <span className="font-black uppercase text-slate-600 block text-[9px]">Informações Complementares</span>
                <p>
                  DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL / REGIME NORMAL COM TRIBUTAÇÃO DIFERENCIADA DE AUTOPEÇAS.
                  TRIBUTAÇÃO COM SUBSTITUIÇÃO TRIBUTÁRIA (ICMS-ST) CONFORME CONVÊNIO ICMS Nº 142/2018.
                </p>

                {selectedInvoice.vehicleInfo && (
                  <div className="bg-slate-50 p-2 rounded border border-slate-300 font-sans space-y-0.5 mt-1 text-[10px]">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <span className="bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded uppercase font-mono">Veículo Vinculado</span>
                      <span>{selectedInvoice.vehicleInfo.model || 'Multimarcas'}</span>
                      {selectedInvoice.vehicleInfo.plate && (
                        <span className="font-mono font-black text-sky-900 bg-sky-100 px-1.5 rounded">
                          Placa: {selectedInvoice.vehicleInfo.plate}
                        </span>
                      )}
                      {selectedInvoice.vehicleInfo.year && (
                        <span className="text-slate-600">Ano: {selectedInvoice.vehicleInfo.year}</span>
                      )}
                      {selectedInvoice.vehicleInfo.engine && (
                        <span className="text-slate-600">• Motor: {selectedInvoice.vehicleInfo.engine}</span>
                      )}
                      {selectedInvoice.vehicleInfo.km && (
                        <span className="text-slate-600">• KM: {selectedInvoice.vehicleInfo.km}</span>
                      )}
                    </div>
                    <p className="text-[9px] text-emerald-800 font-bold">
                      ✓ Cobertura de Garantia Legal de 90 dias assegurada pelo Artigo 26 da Lei 8.078/1990 (Código de Defesa do Consumidor) para peças e componentes aplicados.
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 font-mono font-bold text-slate-700 text-[9px] flex-wrap gap-2">
                  <span>AUTORIZADA NA SEFAZ COM SUCESSO</span>
                  <span>CANAL: {selectedInvoice.channel ? selectedInvoice.channel.toUpperCase() : 'BALCÃO'}</span>
                  {selectedInvoice.quoteNumber && (
                    <span>ORIGEM: {selectedInvoice.quoteNumber}</span>
                  )}
                  {selectedInvoice.paymentMethod && (
                    <span>PAGAMENTO: {selectedInvoice.paymentMethod.toUpperCase()}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EMITIR NOVA NF-E DE VENDA */}
      {showNewNfeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-sky-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">
                  Emissão Direta de NF-e de Venda
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewNfeModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEmitSaleNfe} className="space-y-4 text-xs">
              <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-200 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Origem da Emissão</span>
                  <strong className="text-slate-900">{currentBranch.name}</strong>
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
                  SEFAZ-{currentBranch.uf} ({currentBranch.sefazCode})
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Cliente Destinatário *
                </label>
                <select
                  required
                  value={newNfeForm.customerId}
                  onChange={(e) => setNewNfeForm({ ...newNfeForm, customerId: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.document} - {c.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Item / Peça a Faturar *
                </label>
                <select
                  required
                  value={newNfeForm.productId}
                  onChange={(e) => setNewNfeForm({ ...newNfeForm, productId: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name} (R$ {p.sellingPrice.toFixed(2)}) - Saldo: {p.stock} un
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Quantidade Faturada
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newNfeForm.quantity}
                    onChange={(e) => setNewNfeForm({ ...newNfeForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-center font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Série da NF-e
                  </label>
                  <input
                    type="text"
                    disabled
                    value="1 (Emissão Normal)"
                    className="w-full p-2 bg-slate-100 border border-slate-300 rounded-lg font-bold text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Natureza da Operação
                </label>
                <input
                  type="text"
                  value={newNfeForm.naturezaOperacao}
                  onChange={(e) => setNewNfeForm({ ...newNfeForm, naturezaOperacao: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="bg-sky-50 p-3 rounded-xl border border-sky-200 text-slate-700 text-xs flex items-center justify-between">
                <span>Certificado Digital A1: <strong className="text-emerald-700 font-bold">Válido até 2027</strong></span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewNfeModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-confirm-emit-nfe"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow transition active:scale-95"
                >
                  Autorizar NF-e na SEFAZ & Ver DANFE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
