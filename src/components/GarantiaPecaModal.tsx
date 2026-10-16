import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  FileText,
  Printer,
  X,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  User,
  Car,
  Package,
  QrCode,
  Sparkles,
  Info,
  Scale
} from 'lucide-react';
import type { Product, Customer, PartWarrantyCertificate, UserSession } from '../types';

interface GarantiaPecaModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  products?: Product[];
  customers?: Customer[];
  userSession?: UserSession | null;
  initialPlate?: string;
  initialCustomerName?: string;
  initialCustomerDoc?: string;
  onSaveCertificate?: (cert: PartWarrantyCertificate) => void;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const GarantiaPecaModal: React.FC<GarantiaPecaModalProps> = ({
  isOpen,
  onClose,
  product: initialProduct,
  products = [],
  customers = [],
  userSession,
  initialPlate = '',
  initialCustomerName = '',
  initialCustomerDoc = '',
  onSaveCertificate,
  onShowNotification,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProduct?.id || products[0]?.id || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Dados do Cliente
  const [customerName, setCustomerName] = useState(initialCustomerName || '');
  const [customerDoc, setCustomerDoc] = useState(initialCustomerDoc || '');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Dados do Veículo & Instalação
  const [vehiclePlate, setVehiclePlate] = useState(initialPlate);
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleKm, setVehicleKm] = useState<number>(0);
  const [installerWorkshop, setInstallerWorkshop] = useState('');
  
  // Dados da Peça & Lote
  const [batchNumber, setBatchNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [technicalObservations, setTechnicalObservations] = useState('');

  // Regras de Garantia (Normas Brasileiras - CDC)
  const [legalWarrantyDays] = useState(90); // Art. 26 CDC (Legal Obrigatória)
  const [contractualMonths, setContractualMonths] = useState<number>(9); // 9 meses complementares = 12 meses totais
  const [isPrintMode, setIsPrintMode] = useState(false);

  // Produto selecionado
  const activeProduct = useMemo(() => {
    if (initialProduct && initialProduct.id === selectedProductId) return initialProduct;
    return products.find(p => p.id === selectedProductId) || initialProduct || null;
  }, [initialProduct, products, selectedProductId]);

  // Protocolo Único Gerado
  const protocolNumber = useMemo(() => {
    const year = new Date().getFullYear();
    const hash = Math.floor(1000 + Math.random() * 9000);
    const prodPart = activeProduct ? activeProduct.code.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) : 'PEC';
    return `GAR-${year}-${prodPart}-${hash}`;
  }, [activeProduct]);

  // Cálculo de Datas
  const dates = useMemo(() => {
    const today = new Date();
    const issueDateStr = today.toISOString().slice(0, 10);
    
    // Total de dias: 90 dias legais + (meses contratuais * 30.5)
    const additionalDays = Math.round(contractualMonths * 30.5);
    const totalDays = legalWarrantyDays + additionalDays;
    
    const expDate = new Date(today);
    expDate.setDate(expDate.getDate() + totalDays);
    const expirationDateStr = expDate.toISOString().slice(0, 10);

    return {
      issueDate: issueDateStr,
      issueFormatted: today.toLocaleDateString('pt-BR'),
      expirationDate: expirationDateStr,
      expirationFormatted: expDate.toLocaleDateString('pt-BR'),
      totalDays,
    };
  }, [legalWarrantyDays, contractualMonths]);

  if (!isOpen) return null;

  // Imagem prioritária da peça
  const displayImage = customImageUrl || activeProduct?.imageUrl || activeProduct?.images?.[0] || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=600';

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    const cust = customers.find(c => c.id === id);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerDoc(cust.document || '');
      setCustomerPhone(cust.phone || cust.whatsapp || '');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmIssue = () => {
    if (!activeProduct) {
      onShowNotification?.('Selecione uma peça', 'É necessário definir o produto para emitir a garantia.', 'warning');
      return;
    }
    if (!customerName.trim()) {
      onShowNotification?.('Informe o cliente', 'O nome do cliente é obrigatório para o termo de garantia.', 'warning');
      return;
    }

    const cert: PartWarrantyCertificate = {
      id: `cert-${Date.now()}`,
      protocolNumber,
      productId: activeProduct.id,
      productCode: activeProduct.code,
      productName: activeProduct.name,
      productBrand: activeProduct.brand,
      ncm: activeProduct.ncm,
      batchNumber: batchNumber || 'LOTE-PADRAO-BR',
      imageUrl: displayImage,
      invoiceNumber: invoiceNumber || 'NF-e Balcão',
      customerName,
      customerDocument: customerDoc || 'Não informado',
      customerPhone,
      vehiclePlate: vehiclePlate.toUpperCase(),
      vehicleModel,
      vehicleKmAtInstall: vehicleKm,
      installerWorkshop: installerWorkshop || 'Oficina Própria / Credenciada',
      issueDate: dates.issueDate,
      legalWarrantyDays,
      contractualWarrantyDays: dates.totalDays - legalWarrantyDays,
      totalWarrantyDays: dates.totalDays,
      expirationDate: dates.expirationDate,
      status: 'ativa',
      termsAccepted: true,
      technicalObservations,
      branchId: userSession?.tenantId || 'matriz-ms',
      issuedByUserName: userSession?.name || 'Responsável pelo Estoque',
      createdAt: new Date().toISOString(),
    };

    onSaveCertificate?.(cert);
    onShowNotification?.(
      'Garantia Emitida com Sucesso',
      `Protocolo ${protocolNumber} registrado com validade até ${dates.expirationFormatted}.`,
      'success'
    );
    setIsPrintMode(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      {/* Container Principal */}
      <div className="bg-white rounded-lg max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        
        {/* Cabeçalho do Modal */}
        <div className="bg-[#0C4A6E] text-white p-4 sm:p-5 flex items-center justify-between border-b border-[#0C4A6E] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-md font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-sm">
                  Estoque &amp; Assistência Técnica
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-300">
                  CDC LEI 8.078/90
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight font-['Outfit']">
                Emissão de Certificado &amp; Laudo de Garantia de Peças
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-sky-200 hover:text-white hover:bg-white/10 rounded-md transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo com Abas (Configuração vs Prévia para Impressão) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Barra de alternância rápida */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPrintMode(false)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                  !isPrintMode
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                1. Parâmetros da Garantia &amp; Dados
              </button>
              <button
                type="button"
                onClick={() => setIsPrintMode(true)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer ${
                  isPrintMode
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                2. Visualizar Relatório / Certificado Oficial
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-sm border border-slate-300">
                Protocolo: <strong className="text-slate-900">{protocolNumber}</strong>
              </span>
            </div>
          </div>

          {!isPrintMode ? (
            /* =========================================================================
               FORMULÁRIO DE EMISSÃO DA GARANTIA
               ========================================================================= */
            <div className="space-y-6 text-xs">
              {/* Alerta de Conformidade com Normas Brasileiras */}
              <div className="bg-sky-50 border border-sky-200 rounded-md p-3.5 flex items-start gap-3">
                <Scale className="w-5 h-5 text-[#0284C7] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sky-950 text-xs">
                    Conformidade com o Código de Defesa do Consumidor (Brasil)
                  </h4>
                  <p className="text-[11px] text-sky-800 leading-relaxed">
                    Este laudo cumpre o <strong>Art. 26 da Lei nº 8.078/1990</strong> (Garantia Legal Obrigatória de 90 dias para autopeças duráveis) acrescido da <strong>Garantia Contratual Complementar (Art. 50)</strong>. Inclui rastreabilidade fotográfica da peça e termo de responsabilidade técnica de instalação.
                  </p>
                </div>
              </div>

              {/* Grid 1: Peça Selecionada + Foto */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-slate-50 border border-slate-200 rounded-md p-4">
                {/* Imagem do Produto */}
                <div className="md:col-span-4 flex flex-col items-center justify-center bg-white p-3 border border-slate-200 rounded-md shadow-2xs">
                  <div className="w-full h-40 bg-slate-100 rounded-md overflow-hidden flex items-center justify-center relative border border-slate-200">
                    <img
                      src={displayImage}
                      alt={activeProduct?.name || 'Peça'}
                      className="w-full h-full object-contain p-2"
                    />
                    <span className="absolute bottom-1 right-1 bg-slate-950/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                      Foto Evidência
                    </span>
                  </div>
                  <div className="w-full mt-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">
                      URL Foto Real da Peça / Lote
                    </label>
                    <input
                      type="text"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="Cole o link da foto ou deixe o padrão"
                      className="w-full px-2 py-1 text-[11px] border border-slate-300 rounded-sm bg-white"
                    />
                  </div>
                </div>

                {/* Dados da Peça */}
                <div className="md:col-span-8 space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Peça do Estoque *
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-xs font-semibold text-slate-900"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.code}] {p.name} • {p.brand} (Estoque: {p.stock} un)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Fabricante / Marca</span>
                      <span className="font-bold text-slate-800">{activeProduct?.brand || 'N/D'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Código Fabricante</span>
                      <span className="font-mono font-bold text-slate-800">{activeProduct?.code || 'N/D'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">NCM Fiscal</span>
                      <span className="font-mono text-slate-600">{activeProduct?.ncm || '8708.29.99'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Lote / Número de Série Gravado
                      </label>
                      <input
                        type="text"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        placeholder="Ex: LOTE-2026-X892 / SERIE 4920"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                        Nota Fiscal de Venda (NF-e / Cupom)
                      </label>
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="Ex: NF-e 004.821 Série 1"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2: Prazos e Condições Legais */}
              <div className="border border-slate-200 rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#0284C7]" />
                    Prazos de Garantia (Regulamentação Brasileira)
                  </h3>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-sm border border-emerald-200">
                    Vigência Total: {dates.totalDays} dias ({Math.round(dates.totalDays / 30)} meses)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Garantia Legal CDC */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">
                      1. Garantia Legal (Obrigatória)
                    </span>
                    <div className="text-lg font-black text-amber-950 mt-1 font-mono">
                      90 Dias
                    </div>
                    <span className="text-[10px] text-amber-700 mt-0.5 block">
                      CDC Art. 26, II (Produtos duráveis)
                    </span>
                  </div>

                  {/* Garantia Contratual Complementar */}
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-md">
                    <label className="text-[10px] font-bold text-sky-800 uppercase block">
                      2. Garantia Adicional do Fabricante
                    </label>
                    <select
                      value={contractualMonths}
                      onChange={(e) => setContractualMonths(Number(e.target.value))}
                      className="mt-1 w-full px-2 py-1 bg-white border border-sky-300 rounded text-xs font-bold text-sky-950"
                    >
                      <option value={0}>Sem adicional (apenas os 90 dias legais)</option>
                      <option value={3}>+ 3 meses adicionais (Total 6 meses)</option>
                      <option value={9}>+ 9 meses adicionais (Total 12 meses / 1 Ano)</option>
                      <option value={21}>+ 21 meses adicionais (Total 24 meses / 2 Anos)</option>
                    </select>
                    <span className="text-[10px] text-sky-700 mt-1 block">
                      CDC Art. 50 (Termo complementar)
                    </span>
                  </div>

                  {/* Vencimento Final */}
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                      Data Limite de Cobertura
                    </span>
                    <div className="text-lg font-black text-emerald-950 mt-1 font-mono">
                      {dates.expirationFormatted}
                    </div>
                    <span className="text-[10px] text-emerald-700 mt-0.5 block">
                      Emitido em: {dates.issueFormatted}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid 3: Dados do Cliente & Veículo / Aplicação */}
              <div className="border border-slate-200 rounded-md p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#0284C7]" />
                  Identificação do Comprador &amp; Veículo Instalado
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Cliente / Comprador *
                    </label>
                    {customers.length > 0 ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Nome Completo / Razão Social"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white"
                        />
                        <select
                          value={selectedCustomerId}
                          onChange={(e) => handleSelectCustomer(e.target.value)}
                          className="w-full text-[10px] text-slate-500 border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50"
                        >
                          <option value="">Ou selecione da carteira…</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Nome do cliente"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white"
                      />
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      CPF / CNPJ
                    </label>
                    <input
                      type="text"
                      value={customerDoc}
                      onChange={(e) => setCustomerDoc(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="(67) 99999-0000"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Placa do Veículo
                    </label>
                    <input
                      type="text"
                      value={vehiclePlate}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      placeholder="ABC-1234 / MERCOSUL"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Modelo do Veículo
                    </label>
                    <input
                      type="text"
                      value={vehicleModel}
                      onChange={(e) => setVehicleModel(e.target.value)}
                      placeholder="Ex: Scania R450 / Hilux 2.8"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      KM na Instalação
                    </label>
                    <input
                      type="number"
                      value={vehicleKm || ''}
                      onChange={(e) => setVehicleKm(Number(e.target.value) || 0)}
                      placeholder="Ex: 85000"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-mono bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Oficina Instaladora
                    </label>
                    <input
                      type="text"
                      value={installerWorkshop}
                      onChange={(e) => setInstallerWorkshop(e.target.value)}
                      placeholder="Nome da oficina mecânica"
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Observações Técnicas */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Observações Técnicas / Condições Especiais de Montagem
                </label>
                <textarea
                  rows={2}
                  value={technicalObservations}
                  onChange={(e) => setTechnicalObservations(e.target.value)}
                  placeholder="Ex: Obrigatória substituição do filtro de óleo e sangria completa do sistema de freio conforme recomendação técnica da montadora."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs bg-white resize-none"
                />
              </div>
            </div>
          ) : (
            /* =========================================================================
               RELATÓRIO / LAUDO OFICIAL DE GARANTIA (ESTILO DOCUMENTO BRASIL)
               ========================================================================= */
            <div id="print-warranty-certificate" className="bg-white border-2 border-slate-800 rounded-md p-6 sm:p-8 space-y-6 text-slate-900 font-sans shadow-sm">
              
              {/* Cabeçalho do Laudo / Certificado */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b-2 border-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-950 text-white flex items-center justify-center rounded-md font-black text-xl">
                    GATO
                  </div>
                  <div>
                    <h1 className="text-lg font-black uppercase tracking-tight text-slate-950">
                      Termo &amp; Certificado de Garantia de Autopeças
                    </h1>
                    <p className="text-xs font-semibold text-slate-600">
                      Em conformidade com a Lei Federal nº 8.078/1990 (Código de Defesa do Consumidor)
                    </p>
                    <p className="text-[10px] text-slate-500">
                      GATO Gestão de Estoque &amp; Balcão • Filial: {userSession?.tenantId || 'Matriz'}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-300 sm:pl-4">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Protocolo de Segurança</div>
                  <div className="text-sm font-black font-mono text-[#0C4A6E] bg-sky-50 px-2 py-0.5 rounded border border-sky-300">
                    {protocolNumber}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                    Emitido em: {dates.issueFormatted}
                  </div>
                </div>
              </div>

              {/* Informações da Peça com Foto em Destaque */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 p-4 bg-slate-50 border border-slate-300 rounded-md">
                <div className="sm:col-span-3 flex flex-col items-center justify-center bg-white p-2 border border-slate-300 rounded">
                  <img
                    src={displayImage}
                    alt={activeProduct?.name}
                    className="max-h-28 w-full object-contain"
                  />
                  <span className="text-[9px] text-slate-500 font-mono mt-1 text-center">
                    Registro Visual da Peça
                  </span>
                </div>

                <div className="sm:col-span-9 space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Componente / Peça</span>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      {activeProduct?.name}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Código</span>
                      <span className="font-mono font-bold text-slate-900">{activeProduct?.code}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Fabricante</span>
                      <span className="font-bold text-slate-900">{activeProduct?.brand}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Lote / Série</span>
                      <span className="font-mono text-slate-800">{batchNumber || 'PADRAO-FABRICA'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Nota Fiscal / Venda</span>
                      <span className="font-mono text-slate-800">{invoiceNumber || 'Balcão GATO'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vigência & Prazos Legais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 border border-slate-300 rounded bg-white">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Garantia Legal (Art. 26 CDC)</span>
                  <span className="text-sm font-black font-mono text-slate-900">90 Dias Corridos</span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Obrigatória por lei para produtos duráveis.</p>
                </div>
                <div className="p-3 border border-slate-300 rounded bg-white">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">2. Garantia Complementar</span>
                  <span className="text-sm font-black font-mono text-slate-900">
                    +{contractualMonths} Meses Adicionais
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Garantia contratual do fabricante (Art. 50 CDC).</p>
                </div>
                <div className="p-3 border border-slate-300 rounded bg-white">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Vencimento da Cobertura</span>
                  <span className="text-sm font-black font-mono text-emerald-800">
                    {dates.expirationFormatted}
                  </span>
                  <p className="text-[10px] text-slate-500 mt-0.5">Prazo total vigente de {dates.totalDays} dias.</p>
                </div>
              </div>

              {/* Dados do Cliente e Veículo */}
              <div className="border border-slate-300 rounded p-3.5 text-xs space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Beneficiário / Cliente</span>
                    <span className="font-bold text-slate-900">{customerName || 'Consumidor Final'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">CPF / CNPJ</span>
                    <span className="font-mono text-slate-800">{customerDoc || 'Não Consta'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Telefone de Contato</span>
                    <span className="text-slate-800">{customerPhone || 'Não Consta'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-[11px]">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Placa</span>
                    <span className="font-mono font-bold text-slate-900">{vehiclePlate || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Veículo / Aplicação</span>
                    <span className="text-slate-800">{vehicleModel || 'Veículo Automotivo'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">KM Instalação</span>
                    <span className="font-mono text-slate-800">{vehicleKm ? `${vehicleKm} km` : 'Não registrado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Oficina / Instalador</span>
                    <span className="text-slate-800">{installerWorkshop || 'Oficina Credenciada'}</span>
                  </div>
                </div>
              </div>

              {/* Cláusulas e Condições de Perda de Garantia (Direito Brasileiro) */}
              <div className="bg-slate-50 border border-slate-300 rounded p-3 text-[10px] text-slate-700 space-y-1.5 leading-relaxed">
                <h4 className="font-bold text-slate-900 uppercase">Termos e Condições de Validade:</h4>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li><strong>Prazo de Reclamação:</strong> O prazo para reclamação de vícios de fácil constatação é de 90 dias a contar da entrega efetiva (CDC Art. 26).</li>
                  <li><strong>Instalação Técnica Especializada:</strong> A peça deve ser instalada conforme as especificações técnicas da montadora e normas ABNT aplicáveis, sob pena de perda de cobertura decorrente de mau assentamento ou montagem forçada.</li>
                  <li><strong>Hipóteses de Perda da Garantia:</strong> Perde-se a garantia em caso de colisão, modificação estrutural, adaptação em veículos não homologados, contaminação de fluidos, rompimento de lacres de segurança ou uso em competições.</li>
                  <li><strong>Procedimento de Análise:</strong> Havendo indício de defeito de fabricação, o componente deve ser encaminhado acompanhado deste certificado e da respectiva nota fiscal para laudo técnico do fabricante.</li>
                </ol>
              </div>

              {/* Assinaturas */}
              <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
                <div className="border-t border-slate-800 pt-2">
                  <span className="font-bold block text-slate-900">{userSession?.name || 'Responsável pelo Estoque'}</span>
                  <span className="text-[10px] text-slate-500">Controle de Qualidade &amp; Estoque</span>
                </div>
                <div className="border-t border-slate-800 pt-2">
                  <span className="font-bold block text-slate-900">{installerWorkshop || 'Oficina Mecânica'}</span>
                  <span className="text-[10px] text-slate-500">Técnico / Mecânico Instalador</span>
                </div>
                <div className="border-t border-slate-800 pt-2">
                  <span className="font-bold block text-slate-900">{customerName || 'Cliente / Comprador'}</span>
                  <span className="text-[10px] text-slate-500">Assinatura do Consumidor</span>
                </div>
              </div>

              {/* Rodapé de Autenticidade */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                <span>Certificado emitido digitalmente pelo Sistema GATO • ID: {protocolNumber}</span>
                <span>Validação física obrigatória com assinatura</span>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            {isPrintMode ? (
              <span>Pronto para impressão direta ou geração de PDF.</span>
            ) : (
              <span>Preencha os dados e confirme para registrar e emitir o certificado.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isPrintMode ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsPrintMode(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold border border-slate-300 transition cursor-pointer"
                >
                  Voltar para Edição
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold shadow-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Imprimir Relatório de Garantia
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 rounded-md text-xs font-bold border border-slate-300 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmIssue}
                  className="px-5 py-2 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white rounded-md text-xs font-black shadow-xs flex items-center gap-2 transition cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" /> Confirmar &amp; Gerar Certificado
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
