import React, { useState } from 'react';
import { 
  FileDown, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  MapPin, 
  Car, 
  Layers, 
  DollarSign, 
  RotateCcw,
  Tag,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { Product, XmlInvoiceHeader, XmlItemParsed, VehicleApplication, VehicleCategory } from '../types';
import { SAMPLE_NFE_XML } from '../data/initialData';

interface XmlNfeImportProps {
  products?: Product[];
  existingProducts?: Product[];
  onImportComplete?: (updatedProducts: Product[], newInvoices: any[]) => void;
  onAddNewProduct?: (newProd: Product) => void;
  onUpdateProductStock?: (productId: string, quantityToAdd: number) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const XmlNfeImport: React.FC<XmlNfeImportProps> = ({
  products,
  existingProducts,
  onImportComplete,
  onAddNewProduct,
  onUpdateProductStock,
  onShowNotification,
}) => {
  const activeProducts = products || existingProducts || [];
  const [xmlInput, setXmlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedHeader, setParsedHeader] = useState<XmlInvoiceHeader | null>(null);
  const [parsedItems, setParsedItems] = useState<XmlItemParsed[]>([]);
  
  // Active workflow sequence state
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [processingSummary, setProcessingSummary] = useState<{
    registeredAdded: number;
    newRegistered: number;
    totalUnits: number;
    totalCost: number;
  } | null>(null);

  // Unregistered item wizard form state
  const [wizardData, setWizardData] = useState<{
    category: VehicleCategory;
    brand: string;
    vehicle: string;
    yearRange: string;
    engine: string;
    transmission: string;
    traction: '4x2' | '4x4' | '6x2' | '6x4' | '8x4' | 'Trilhos/Esteira';
    airConditioning: boolean;
    similarCodes: string;
    corridor: string;
    shelf: string;
    box: string;
    markupPercent: number;
    transportCost: number;
    notes: string;
  }>({
    category: 'auto',
    brand: '',
    vehicle: '',
    yearRange: '2015-2024',
    engine: '1.0 / 1.6 Flex',
    transmission: 'Manual 5M',
    traction: '4x2',
    airConditioning: true,
    similarCodes: '',
    corridor: 'Corredor A',
    shelf: 'Prateleira 01',
    box: 'G-01',
    markupPercent: 50,
    transportCost: 5.0,
    notes: '',
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestionText, setAiSuggestionText] = useState<string | null>(null);

  // Load sample XML button handler
  const handleLoadSample = () => {
    setXmlInput(SAMPLE_NFE_XML);
    handleParseXml(SAMPLE_NFE_XML);
  };

  // Process and parse the XML
  const handleParseXml = async (contentToParse?: string) => {
    const content = contentToParse || xmlInput;
    if (!content.trim()) {
      onShowNotification('Conteúdo Vazio', 'Por favor, cole ou carregue o conteúdo de um arquivo XML de NF-e.', 'warning');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/xml/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ xmlContent: content }),
      });

      if (!response.ok) {
        throw new Error('Falha ao processar o XML no servidor.');
      }

      const data = await response.json();
      setParsedHeader(data.header);

      // Check which items are already registered in the system
      const checkedItems: XmlItemParsed[] = data.items.map((item: any) => {
        const existing = activeProducts.find(
          (p) => 
            p.code.toUpperCase() === item.cProd.toUpperCase() || 
            (p.barcode && item.cEAN && p.barcode === item.cEAN)
        );
        return {
          ...item,
          isRegistered: !!existing,
          existingProductId: existing ? existing.id : undefined,
        };
      });

      setParsedItems(checkedItems);
      setProcessingSummary(null);

      // Set the first item to process if any exists
      if (checkedItems.length > 0) {
        setActiveItemIndex(0);
        prepareWizardForItem(checkedItems[0]);
      }

      onShowNotification(
        'XML de Compra Lido com Sucesso!',
        `NF-e #${data.header.nNF} contém ${checkedItems.length} itens prontos para conferência e locação em estoque.`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      onShowNotification('Erro na Leitura do XML', err.message || 'Falha ao processar arquivo XML', 'warning');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper when switching to an item
  const prepareWizardForItem = (item: XmlItemParsed) => {
    setAiSuggestionText(null);
    if (!item.isRegistered) {
      // Pre-fill guess based on product description
      const desc = item.xProd.toUpperCase();
      let guessCategory: VehicleCategory = 'auto';
      if (desc.includes('MOTO') || desc.includes('TITAN') || desc.includes('HONDA') || desc.includes('YAMAHA')) {
        guessCategory = 'moto';
      } else if (desc.includes('SCANIA') || desc.includes('VOLVO') || desc.includes('PESADA') || desc.includes('CAMINHAO')) {
        guessCategory = 'caminhao';
      } else if (desc.includes('TRATOR') || desc.includes('AGRI') || desc.includes('DEERE') || desc.includes('VALTRA')) {
        guessCategory = 'agricola';
      }

      setWizardData({
        category: guessCategory,
        brand: desc.includes('ONIX') ? 'Chevrolet' : desc.includes('GOL') ? 'Volkswagen' : desc.includes('TOYOTA') ? 'Toyota' : 'Universal / Multimarcas',
        vehicle: desc.includes('ONIX') ? 'Onix / Prisma' : desc.includes('GOL') ? 'Gol / Voyage' : desc.includes('TITAN') ? 'CG 160 Titan' : 'Diversos',
        yearRange: '2016-2024',
        engine: '1.0 / 1.4 Flex',
        transmission: 'Manual 5M',
        traction: '4x2',
        airConditioning: true,
        similarCodes: '',
        corridor: 'Corredor B',
        shelf: 'Prateleira 02',
        box: 'G-10',
        markupPercent: 50,
        transportCost: 4.50,
        notes: `Importado via NF-e XML #${parsedHeader?.nNF || ''}`,
      });
    }
  };

  // Call Gemini AI Assistant to deduce full vehicle application for the item
  const handleAskAiForPart = async (item: XmlItemParsed) => {
    setAiLoading(true);
    setAiSuggestionText(null);
    try {
      const response = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Qual é a aplicação veicular exata, montadora, motores e similares para este item de autopeças?`,
          contextType: 'xml_application_suggest',
          partData: {
            cProd: item.cProd,
            xProd: item.xProd,
            NCM: item.NCM,
            vUnCom: item.vUnCom,
          },
        }),
      });

      const data = await response.json();
      setAiSuggestionText(data.response);

      // Simple heuristic fill from AI response if words match
      const respUpper = data.response.toUpperCase();
      if (respUpper.includes('VOLKSWAGEN') || respUpper.includes('VW')) {
        setWizardData(prev => ({ ...prev, brand: 'Volkswagen', vehicle: 'Gol / Fox / Polo' }));
      } else if (respUpper.includes('CHEVROLET') || respUpper.includes('GM')) {
        setWizardData(prev => ({ ...prev, brand: 'Chevrolet', vehicle: 'Onix / Prisma / Cobalt' }));
      } else if (respUpper.includes('SCANIA')) {
        setWizardData(prev => ({ ...prev, brand: 'Scania', vehicle: 'Série R / S', category: 'caminhao' }));
      } else if (respUpper.includes('JOHN DEERE')) {
        setWizardData(prev => ({ ...prev, brand: 'John Deere', vehicle: 'Tratores 6J / 6M', category: 'agricola' }));
      }

      onShowNotification('IA GATO Concluída', 'Sugestão de aplicação veicular gerada com sucesso!', 'info');
    } catch (err) {
      console.error(err);
      setAiSuggestionText('Dica GATO: Verifique o catálogo do fabricante pelo código ' + item.cProd);
    } finally {
      setAiLoading(false);
    }
  };

  // Advance to next item in sequence or conclude
  const handleConfirmCurrentItem = () => {
    if (activeItemIndex === null) return;
    const currentItem = parsedItems[activeItemIndex];

    let updatedProducts = [...activeProducts];

    if (currentItem.isRegistered && currentItem.existingProductId) {
      // 1. CÓDIGO CADASTRADO: Subir para locação, somar estoque e configurar base de impostos!
      updatedProducts = updatedProducts.map((prod) => {
        if (prod.id === currentItem.existingProductId) {
          const newStock = prod.stock + currentItem.qCom;
          return {
            ...prod,
            stock: newStock,
            unitCost: currentItem.vUnCom,
            taxBaseIcms: currentItem.vICMS ? currentItem.vICMS : prod.taxBaseIcms,
            updatedAt: new Date().toISOString(),
          };
        }
        return prod;
      });

      if (onUpdateProductStock && currentItem.existingProductId) {
        onUpdateProductStock(currentItem.existingProductId, currentItem.qCom);
      }

      onShowNotification(
        'Estoque Atualizado!',
        `+${currentItem.qCom} un de '${currentItem.xProd}' somadas ao estoque na locação existente.`,
        'success'
      );
    } else {
      // 2. CÓDIGO NÃO CADASTRADO: Cadastra com dados do XML + wizard de aplicação veicular!
      const newApp: VehicleApplication = {
        id: `app-${Date.now()}`,
        brand: wizardData.brand || 'Multimarcas',
        vehicle: wizardData.vehicle || 'Geral',
        yearRange: wizardData.yearRange,
        engine: wizardData.engine,
        transmission: wizardData.transmission,
        traction: wizardData.traction,
        airConditioning: wizardData.airConditioning,
      };

      const calculatedSellingPrice = 
        (currentItem.vUnCom + wizardData.transportCost) * (1 + wizardData.markupPercent / 100);

      const similarArray = wizardData.similarCodes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const newProduct: Product = {
        id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: currentItem.cProd,
        oemCode: currentItem.cEAN || currentItem.cProd,
        similarCodes: similarArray.length > 0 ? similarArray : ['SIM-' + currentItem.cProd],
        barcode: currentItem.cEAN || '',
        name: currentItem.xProd,
        brand: wizardData.brand || 'Fabricante Nacional',
        category: wizardData.category,
        supplier: parsedHeader?.emitenteNome || 'Fornecedor XML',
        supplierCnpj: parsedHeader?.emitenteCNPJ,
        location: {
          corridor: wizardData.corridor,
          shelf: wizardData.shelf,
          box: wizardData.box,
        },
        stock: currentItem.qCom,
        minStock: 4,
        unitCost: currentItem.vUnCom,
        transportCost: wizardData.transportCost,
        markupPercent: wizardData.markupPercent,
        sellingPrice: parseFloat(calculatedSellingPrice.toFixed(2)),
        ncm: currentItem.NCM,
        cst: '000',
        cfop: currentItem.CFOP || '5102',
        taxBaseIcms: currentItem.vProd,
        applications: [newApp],
        notes: wizardData.notes,
        updatedAt: new Date().toISOString(),
      };

      updatedProducts.push(newProduct);

      if (onAddNewProduct) {
        onAddNewProduct(newProduct);
      }

      onShowNotification(
        'Nova Peça Cadastrada!',
        `Item '${currentItem.xProd}' cadastrado na locação ${wizardData.corridor}/${wizardData.shelf}/${wizardData.box} com aplicação veicular completa.`,
        'success'
      );
    }

    // Move to next item or finish
    const nextIndex = activeItemIndex + 1;
    if (nextIndex < parsedItems.length) {
      setActiveItemIndex(nextIndex);
      prepareWizardForItem(parsedItems[nextIndex]);
    } else {
      // Completed all items in the XML invoice!
      setActiveItemIndex(null);
      const totalUnits = parsedItems.reduce((acc, it) => acc + it.qCom, 0);
      const totalCost = parsedItems.reduce((acc, it) => acc + it.vProd, 0);

      setProcessingSummary({
        registeredAdded: parsedItems.filter(i => i.isRegistered).length,
        newRegistered: parsedItems.filter(i => !i.isRegistered).length,
        totalUnits,
        totalCost,
      });

      // Pass updated products to parent state
      if (onImportComplete) {
        onImportComplete(updatedProducts, [
          {
            id: `inv-xml-${Date.now()}`,
            type: 'compra',
            number: parsedHeader?.nNF || '000.000',
            series: parsedHeader?.serie || '1',
            accessKey: parsedHeader?.chaveAcesso || '',
            issuedAt: parsedHeader?.dhEmi || new Date().toISOString(),
            partyName: parsedHeader?.emitenteNome || 'Fornecedor',
            partyDocument: parsedHeader?.emitenteCNPJ || '',
            totalProducts: parsedHeader?.vTotalProd || totalCost,
            totalTaxes: (parsedHeader?.vNF || totalCost) * 0.18,
            totalAmount: parsedHeader?.vNF || totalCost,
            itemsCount: parsedItems.length,
            sefazStatus: 'Autorizada',
            danfeProtocol: `PROTO-${Date.now().toString().slice(-8)}`,
          }
        ]);
      }
    }
  };

  const currentItem = activeItemIndex !== null ? parsedItems[activeItemIndex] : null;
  const existingProductMatch = currentItem?.existingProductId 
    ? activeProducts.find(p => p.id === currentItem.existingProductId)
    : null;

  return (
    <div className="space-y-6" id="view-xml-nfe-import">
      {/* Top Banner - Clean Minimalism Deep Blue & Amber Accent */}
      <div className="bg-[#0C4A6E] text-white p-5 sm:p-6 rounded-2xl shadow-sm border border-[#0C4A6E] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#F59E0B] font-bold text-xs uppercase tracking-wider mb-1">
            <FileDown className="w-4 h-4" />
            <span>Módulo 3: Baixa de NF de Compra por XML</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-['Outfit'] tracking-tight">
            Sequência Inteligente de Importação & Locação
          </h1>
          <p className="text-xs sm:text-sm text-sky-100/80 mt-1 max-w-2xl">
            Códigos já cadastrados sobem direto para a locação e somam ao estoque com base de impostos.
            Itens não cadastrados abrem o assistente de aplicação veicular (ano, motor, câmbio, tração e ar condicionado).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-load-sample-xml"
            onClick={handleLoadSample}
            className="flex items-center gap-2 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>Carregar XML de Teste (NF 78491)</span>
          </button>
        </div>
      </div>

      {/* XML Input or File Upload Area */}
      {!parsedHeader && (
        <div className="bg-white rounded-2xl p-6 border border-sky-50 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center">
              <span className="w-2 h-4 bg-[#0284C7] rounded mr-2 inline-block" />
              <span>Colar ou Fazer Upload do XML da NF-e (Layout 4.00)</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium">Aceita XML de qualquer fornecedor de autopeças</span>
          </div>

          <div className="relative">
            <textarea
              id="xml-input-textarea"
              rows={7}
              value={xmlInput}
              onChange={(e) => setXmlInput(e.target.value)}
              placeholder="Cole aqui o conteúdo do arquivo .xml da NF-e de compra (<nfeProc> ou <NFe>)..."
              className="w-full font-mono text-xs p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-slate-500">
              Dica: Clique no botão <strong className="text-[#0C4A6E]">"Carregar XML de Teste"</strong> no topo para experimentar imediatamente o fluxo de peças cadastradas e não cadastradas.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-process-xml"
                onClick={() => handleParseXml()}
                disabled={isProcessing || !xmlInput.trim()}
                className="flex items-center gap-2 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm transition cursor-pointer"
              >
                {isProcessing ? 'Processando XML...' : 'Processar Sequência do XML'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* When XML is Parsed: Header Summary & Step-by-Step Sequence */}
      {parsedHeader && (
        <div className="space-y-6">
          {/* NF-e Header Badge */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-sky-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-800">
                <FileDown className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-800 uppercase">NF-e de Compra</span>
                  <span className="font-mono text-xs font-black bg-sky-100 text-sky-900 px-2 py-0.5 rounded">
                    Nº {parsedHeader.nNF} • Série {parsedHeader.serie}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {parsedHeader.emitenteNome}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  CNPJ Fornecedor: {parsedHeader.emitenteCNPJ} • UF: {parsedHeader.emitenteUF}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-500 block">Total dos Produtos</span>
                <span className="text-base font-black text-slate-900">
                  R$ {parsedHeader.vTotalProd.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setParsedHeader(null);
                  setParsedItems([]);
                  setActiveItemIndex(null);
                  setProcessingSummary(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                title="Carregar outro XML"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sequence Progress Bar */}
          {activeItemIndex !== null && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-sky-950">
                <span>Item {activeItemIndex + 1} de {parsedItems.length} da NF-e</span>
                <span className="text-sky-600 font-normal">
                  ({parsedItems.filter((_, idx) => idx < activeItemIndex).length} concluídos)
                </span>
              </div>
              <div className="w-48 bg-sky-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${((activeItemIndex + 1) / parsedItems.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* ACTIVE ITEM PROCESSING CARD */}
          {currentItem && (
            <div className="bg-white rounded-2xl border-2 border-sky-500/40 shadow-md p-6 space-y-6">
              {/* Item Info Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                      Cód. XML: {currentItem.cProd}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      NCM: {currentItem.NCM} • CFOP: {currentItem.CFOP}
                    </span>
                    {currentItem.isRegistered ? (
                      <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Código já cadastrado
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        Código NÃO cadastrado (Necessário Wizard)
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1">
                    {currentItem.xProd}
                  </h2>
                </div>

                <div className="flex items-center gap-6 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Qtd Faturada</span>
                    <span className="text-base font-black text-sky-900">
                      {currentItem.qCom} {currentItem.uCom}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Custo Unitário</span>
                    <span className="text-base font-black text-emerald-700">
                      R$ {currentItem.vUnCom.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Total Item</span>
                    <span className="text-base font-black text-slate-900">
                      R$ {currentItem.vProd.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* BRANCH 1: CÓDIGO CADASTRADO */}
              {currentItem.isRegistered && existingProductMatch && (
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-sm font-extrabold text-emerald-950">
                        Subida Automática para Locação Física & Soma ao Estoque
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                      Estoque Atual: {existingProductMatch.stock} un ➔ Ficará com {existingProductMatch.stock + currentItem.qCom} un
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Location Card */}
                    <div className="bg-white p-3 rounded-lg border border-emerald-200 flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Locação Cadastrada</span>
                        <p className="text-xs font-extrabold text-slate-900">
                          {existingProductMatch.location.corridor} • {existingProductMatch.location.shelf} • {existingProductMatch.location.box}
                        </p>
                        <span className="text-[10px] text-emerald-700">Subir direto para esta gaveta</span>
                      </div>
                    </div>

                    {/* Tax Base */}
                    <div className="bg-white p-3 rounded-lg border border-emerald-200 flex items-start gap-2.5">
                      <DollarSign className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Base de Impostos XML</span>
                        <p className="text-xs font-extrabold text-slate-900">
                          ICMS Crédito: R$ {(currentItem.vICMS || 0).toFixed(2)} (18%)
                        </p>
                        <span className="text-[10px] text-slate-500">Configurado para compensação fiscal</span>
                      </div>
                    </div>

                    {/* Applications */}
                    <div className="bg-white p-3 rounded-lg border border-emerald-200 flex items-start gap-2.5">
                      <Car className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Aplicação Registrada</span>
                        <p className="text-xs font-extrabold text-slate-900 truncate">
                          {existingProductMatch.applications[0]?.vehicle || 'Veículo Padrão'}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {existingProductMatch.applications[0]?.engine}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      id="btn-confirm-registered-item"
                      onClick={handleConfirmCurrentItem}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow transition active:scale-95"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirmar Locação e Somar ao Estoque (+{currentItem.qCom} un)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* BRANCH 2: CÓDIGO NÃO CADASTRADO (WIZARD DE PERGUNTAS DE APLICAÇÃO VEICULAR) */}
              {!currentItem.isRegistered && (
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-5 h-5 text-amber-600" />
                      <h3 className="text-sm font-extrabold text-amber-950">
                        Wizard de Cadastro de Aplicação Veicular & Locação
                      </h3>
                    </div>

                    {/* AI Assist Button */}
                    <button
                      type="button"
                      id="btn-ask-gemini-application"
                      onClick={() => handleAskAiForPart(currentItem)}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xs transition active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      <span>{aiLoading ? 'Consultando IA...' : 'Preencher com IA do GATO'}</span>
                    </button>
                  </div>

                  {/* AI Suggestion Box */}
                  {aiSuggestionText && (
                    <div className="bg-white p-3 rounded-lg border border-sky-300 text-xs text-slate-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-sky-800 font-bold text-[11px]">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Sugestão Técnica do Assistente GATO:</span>
                      </div>
                      <p className="text-[11px] whitespace-pre-line text-slate-700">
                        {aiSuggestionText}
                      </p>
                    </div>
                  )}

                  {/* Wizard Form Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    {/* Categoria */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Categoria Veicular *
                      </label>
                      <select
                        id="wizard-category-select"
                        value={wizardData.category}
                        onChange={(e) => setWizardData({ ...wizardData, category: e.target.value as VehicleCategory })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="auto">Automóveis e Utilitários</option>
                        <option value="moto">Motos e Scooters</option>
                        <option value="caminhao">Caminhões e Ônibus (Pesada)</option>
                        <option value="agricola">Linha Agrícola e Tratores</option>
                      </select>
                    </div>

                    {/* Marca do Veículo */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Marca da Montadora *
                      </label>
                      <input
                        type="text"
                        id="wizard-brand-input"
                        placeholder="Ex: Volkswagen, Scania, Honda"
                        value={wizardData.brand}
                        onChange={(e) => setWizardData({ ...wizardData, brand: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Modelos de Veículos */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Veículos Compatíveis *
                      </label>
                      <input
                        type="text"
                        id="wizard-vehicle-input"
                        placeholder="Ex: Gol G5, Voyage, Saveiro"
                        value={wizardData.vehicle}
                        onChange={(e) => setWizardData({ ...wizardData, vehicle: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Faixa de Anos */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Faixa de Anos *
                      </label>
                      <input
                        type="text"
                        id="wizard-year-input"
                        placeholder="Ex: 2012-2020"
                        value={wizardData.yearRange}
                        onChange={(e) => setWizardData({ ...wizardData, yearRange: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Motor */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Motorização *
                      </label>
                      <input
                        type="text"
                        id="wizard-engine-input"
                        placeholder="Ex: 1.6 8V EA111 / DC13"
                        value={wizardData.engine}
                        onChange={(e) => setWizardData({ ...wizardData, engine: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Câmbio */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tipo de Câmbio *
                      </label>
                      <input
                        type="text"
                        id="wizard-transmission-input"
                        placeholder="Ex: Manual 5M / I-Shift / CVT"
                        value={wizardData.transmission}
                        onChange={(e) => setWizardData({ ...wizardData, transmission: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Tração */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tração *
                      </label>
                      <select
                        id="wizard-traction-select"
                        value={wizardData.traction}
                        onChange={(e) => setWizardData({ ...wizardData, traction: e.target.value as any })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="4x2">4x2 Dianteira / Traseira</option>
                        <option value="4x4">4x4 Integral / Reduzida</option>
                        <option value="6x2">6x2 Trucado</option>
                        <option value="6x4">6x4 Traçado</option>
                        <option value="8x4">8x4 Bi-trem</option>
                        <option value="Trilhos/Esteira">Trilhos / Esteira Agrícola</option>
                      </select>
                    </div>

                    {/* Com Ar ou Sem Ar */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Ar Condicionado *
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => setWizardData({ ...wizardData, airConditioning: true })}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                            wizardData.airConditioning 
                              ? 'bg-sky-600 text-white border-sky-600' 
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Com Ar (C/AC)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWizardData({ ...wizardData, airConditioning: false })}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                            !wizardData.airConditioning 
                              ? 'bg-sky-600 text-white border-sky-600' 
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          Sem Ar (S/AC)
                        </button>
                      </div>
                    </div>

                    {/* Códigos Similares */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Códigos Similares / Cruzados (separados por vírgula)
                      </label>
                      <input
                        type="text"
                        id="wizard-similar-codes"
                        placeholder="Ex: BOS-9864, MAHLE-LX200, NAK-1234"
                        value={wizardData.similarCodes}
                        onChange={(e) => setWizardData({ ...wizardData, similarCodes: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Locação Física Inicial */}
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Locação Física no Estoque (Corredor / Prateleira / Gaveta) *
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          placeholder="Corredor A"
                          value={wizardData.corridor}
                          onChange={(e) => setWizardData({ ...wizardData, corridor: e.target.value })}
                          className="p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        />
                        <input
                          type="text"
                          placeholder="Prateleira 01"
                          value={wizardData.shelf}
                          onChange={(e) => setWizardData({ ...wizardData, shelf: e.target.value })}
                          className="p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        />
                        <input
                          type="text"
                          placeholder="Gaveta 01"
                          value={wizardData.box}
                          onChange={(e) => setWizardData({ ...wizardData, box: e.target.value })}
                          className="p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        />
                      </div>
                    </div>

                    {/* Markup e Preço de Venda Sugerido */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Markup Desejado (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={wizardData.markupPercent}
                        onChange={(e) => setWizardData({ ...wizardData, markupPercent: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Custo Transporte/Un (R$)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={wizardData.transportCost}
                        onChange={(e) => setWizardData({ ...wizardData, transportCost: parseFloat(e.target.value) || 0 })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-center justify-between bg-white p-2.5 rounded-lg border border-amber-300">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Preço de Venda Calculado</span>
                        <p className="text-base font-black text-amber-700">
                          R$ {((currentItem.vUnCom + wizardData.transportCost) * (1 + wizardData.markupPercent / 100)).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-slate-500">
                        Custo R$ {currentItem.vUnCom.toFixed(2)} + Frete R$ {wizardData.transportCost.toFixed(2)} + Markup {wizardData.markupPercent}%
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      id="btn-complete-unregistered-wizard"
                      onClick={handleConfirmCurrentItem}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-6 py-2.5 rounded-xl shadow transition active:scale-95"
                    >
                      <span>Cadastrar Peça com Aplicação & Subir para Locação</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FINAL SUMMARY SCREEN */}
          {processingSummary && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 shadow-sm animate-in fade-in duration-200">
              <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-emerald-950">
                Sequência do XML de Compra Concluída com Sucesso!
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Todos os itens foram processados, locados no estoque físico com suas respectivas gavetas e com bases tributárias integradas.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-left pt-2">
                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Peças Já Cadastradas</span>
                  <p className="text-base font-extrabold text-slate-900">{processingSummary.registeredAdded} itens</p>
                  <span className="text-[10px] text-emerald-600 font-semibold">Estoque somado direto</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Novas Peças Cadastradas</span>
                  <p className="text-base font-extrabold text-amber-700">{processingSummary.newRegistered} itens</p>
                  <span className="text-[10px] text-slate-500">Com wizard veicular</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total de Unidades</span>
                  <p className="text-base font-extrabold text-sky-900">{processingSummary.totalUnits} un</p>
                  <span className="text-[10px] text-slate-500">Locadas no galpão</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Custo Total Compra</span>
                  <p className="text-base font-extrabold text-slate-900">
                    R$ {processingSummary.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-slate-500">NF-e #{parsedHeader.nNF}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setParsedHeader(null);
                    setParsedItems([]);
                    setProcessingSummary(null);
                  }}
                  className="bg-sky-950 hover:bg-sky-900 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow"
                >
                  Importar Outra Nota Fiscal (XML)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
