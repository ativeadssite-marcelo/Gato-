import React, { useState, useRef } from 'react';
import { 
  Plus, 
  X, 
  Car, 
  Tag, 
  Upload, 
  FileCode, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon, 
  DollarSign, 
  Layers, 
  FileText,
  Trash2,
  HelpCircle,
  Percent,
  Search,
  ArrowRight,
  Eye,
  Star,
  Paperclip,
  Maximize2,
  Zap,
  HardDrive
} from 'lucide-react';
import { Product, VehicleCategory, VehicleApplication, StateTaxConfig, ProductAttachment } from '../types';
import { STATE_TAX_TABLE, SAMPLE_NFE_XML } from '../data/initialData';
import { optimizeImageFile, optimizeImageDataUrl, formatImageSize } from '../utils/imageOptimizer';

export interface FormAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  tag: 'principal' | 'etiqueta' | 'detalhe' | 'aplicacao';
}

interface CadastroPecaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProduct: (product: Product) => void;
  initialCode?: string;
  initialName?: string;
  initialCategory?: VehicleCategory;
  fromXmlData?: {
    cProd?: string;
    xProd?: string;
    NCM?: string;
    CFOP?: string;
    vUnCom?: number;
    qCom?: number;
    vICMS?: number;
    vIPI?: number;
    cEAN?: string;
    supplierName?: string;
    supplierCnpj?: string;
  };
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const CadastroPecaModal: React.FC<CadastroPecaModalProps> = ({
  isOpen,
  onClose,
  onSaveProduct,
  initialCode = '',
  initialName = '',
  initialCategory = 'auto',
  fromXmlData,
  onShowNotification,
}) => {
  if (!isOpen) return null;

  // Mode: standard or guided "código não cadastrado"
  const [guidedMode, setGuidedMode] = useState<boolean>(!!fromXmlData || !!initialCode);
  const [xmlSourceSelected, setXmlSourceSelected] = useState<boolean>(!!fromXmlData);

  // Form core fields
  const [code, setCode] = useState(fromXmlData?.cProd || initialCode || '');
  const [oemCode, setOemCode] = useState(fromXmlData?.cEAN || '');
  const [name, setName] = useState(fromXmlData?.xProd || initialName || '');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<VehicleCategory>(initialCategory || 'auto');
  const [supplier, setSupplier] = useState(fromXmlData?.supplierName || 'Distribuidora Central');
  const [supplierCnpj, setSupplierCnpj] = useState(fromXmlData?.supplierCnpj || '02.987.654/0001-12');

  // Costs and margins
  const [unitCost, setUnitCost] = useState<number>(fromXmlData?.vUnCom || 50);
  const [transportCost, setTransportCost] = useState<number>(5);
  const [markupPercent, setMarkupPercent] = useState<number>(45);
  const [initialStock, setInitialStock] = useState<number>(fromXmlData?.qCom || 10);
  const [minStock, setMinStock] = useState<number>(3);

  // Warehouse location
  const [corridor, setCorridor] = useState('Corredor A');
  const [shelf, setShelf] = useState('Prateleira 01');
  const [box, setBox] = useState('G-01');

  // Taxes
  const [ncm, setNcm] = useState(fromXmlData?.NCM || '8708.80.00');
  const [cst, setCst] = useState('010');
  const [cfop, setCfop] = useState(fromXmlData?.CFOP || '5405');
  const [taxBaseIcms, setTaxBaseIcms] = useState<number>(fromXmlData?.vUnCom || 50);
  const [taxIpiPercent, setTaxIpiPercent] = useState<number>(fromXmlData?.vIPI ? 5 : 0);
  const [taxPisPercent, setTaxPisPercent] = useState<number>(1.65);
  const [taxCofinsPercent, setTaxCofinsPercent] = useState<number>(7.6);
  const [selectedUfTax, setSelectedUfTax] = useState<string>('SP');

  // Similar codes
  const [similarCodes, setSimilarCodes] = useState<string[]>(['SIM-' + (initialCode || '01')]);
  const [newSimilarInput, setNewSimilarInput] = useState('');

  // Photo & attachments state (up to 3 attachments)
  const [attachments, setAttachments] = useState<FormAttachment[]>([
    {
      id: 'att-1',
      name: 'foto_principal_catalogo.jpg',
      url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop&q=80',
      tag: 'principal',
      size: 245000,
    }
  ]);
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlTag, setUrlTag] = useState<FormAttachment['tag']>('principal');
  const [previewZoomUrl, setPreviewZoomUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isOptimizingImages, setIsOptimizingImages] = useState(false);
  const [imageOptimizationNotice, setImageOptimizationNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multiple vehicle applications
  const [applications, setApplications] = useState<VehicleApplication[]>([
    {
      id: `app-${Date.now()}`,
      brand: 'Volkswagen',
      vehicle: 'Gol / Voyage / Saveiro',
      yearRange: '2010-2022',
      engine: '1.0 / 1.6 8V',
      transmission: 'Manual 5M',
      traction: '4x2',
      airConditioning: true,
    }
  ]);

  // Calculated selling price
  const calculatedSellingPrice = (unitCost + transportCost) * (1 + markupPercent / 100);

  // Handle add similar code
  const handleAddSimilarCode = () => {
    if (!newSimilarInput.trim()) return;
    const clean = newSimilarInput.trim().toUpperCase();
    if (!similarCodes.includes(clean)) {
      setSimilarCodes([...similarCodes, clean]);
    }
    setNewSimilarInput('');
  };

  const handleRemoveSimilarCode = (codeToRemove: string) => {
    setSimilarCodes(similarCodes.filter(c => c !== codeToRemove));
  };

  // Handle vehicle applications
  const handleAddApplication = () => {
    const newApp: VehicleApplication = {
      id: `app-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      brand: 'Chevrolet',
      vehicle: 'Onix / Prisma',
      yearRange: '2013-2021',
      engine: '1.0 / 1.4 SPE/4',
      transmission: 'Manual / Automático',
      traction: '4x2',
      airConditioning: true,
    };
    setApplications([...applications, newApp]);
  };

  const handleUpdateApplication = (id: string, field: keyof VehicleApplication, value: any) => {
    setApplications(applications.map(app => {
      if (app.id === id) {
        return { ...app, [field]: value };
      }
      return app;
    }));
  };

  const handleRemoveApplication = (id: string) => {
    if (applications.length <= 1) {
      if (onShowNotification) {
        onShowNotification('Atenção', 'A peça precisa ter ao menos uma aplicação veicular vinculada.', 'warning');
      }
      return;
    }
    setApplications(applications.filter(app => app.id !== id));
  };

  // Add file helper enforcing maximum 3 attachments and smart WebP compression
  const addFiles = async (files: File[]) => {
    const remaining = 3 - attachments.length;
    if (remaining <= 0) {
      if (onShowNotification) {
        onShowNotification('Limite de Anexos', 'O cadastro permite no máximo 3 fotos por produto.', 'warning');
      }
      return;
    }

    const filesToAdd = files.slice(0, remaining);
    if (files.length > remaining && onShowNotification) {
      onShowNotification('Limite Atingido', `Apenas ${remaining} foto(s) foram adicionadas para respeitar o limite de 3 anexos.`, 'info');
    }

    setIsOptimizingImages(true);
    let totalOriginalBytes = 0;
    let totalOptimizedBytes = 0;

    try {
      for (let i = 0; i < filesToAdd.length; i++) {
        const file = filesToAdd[i];
        totalOriginalBytes += file.size;

        // Compressão inteligente para WebP (máx 1024px, 80% qualidade, sem metadados pesados de celular)
        const opt = await optimizeImageFile(file, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.80,
        });

        totalOptimizedBytes += opt.sizeBytes;

        setAttachments(prev => {
          if (prev.length >= 3) return prev;
          const nextIndex = prev.length;
          const autoTag: FormAttachment['tag'] = nextIndex === 0 ? 'principal' : nextIndex === 1 ? 'etiqueta' : 'detalhe';
          return [
            ...prev,
            {
              id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              name: opt.fileName,
              url: opt.dataUrl,
              size: opt.sizeBytes,
              tag: autoTag,
            }
          ];
        });
      }

      const reductionPct = totalOriginalBytes > 0 
        ? Math.round(((totalOriginalBytes - totalOptimizedBytes) / totalOriginalBytes) * 100) 
        : 0;

      const notice = `Otimizado WebP: ${formatImageSize(totalOriginalBytes)} ➔ ${formatImageSize(totalOptimizedBytes)} (-${reductionPct}% no banco)`;
      setImageOptimizationNotice(notice);

      if (onShowNotification) {
        onShowNotification(
          'Foto Otimizada para WebP',
          `${filesToAdd.length} foto(s) convertida(s) para WebP. Economia de ${reductionPct}% de espaço no banco!`,
          'success'
        );
      }
    } catch (err) {
      console.error('Falha na compressão da imagem:', err);
      // Fallback em caso de erro incomum
      filesToAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          setAttachments(prev => {
            if (prev.length >= 3) return prev;
            const nextIndex = prev.length;
            const autoTag: FormAttachment['tag'] = nextIndex === 0 ? 'principal' : nextIndex === 1 ? 'etiqueta' : 'detalhe';
            return [
              ...prev,
              {
                id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: file.name,
                url: result,
                size: file.size,
                tag: autoTag,
              }
            ];
          });
        };
        reader.readAsDataURL(file);
      });
    } finally {
      setIsOptimizingImages(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(Array.from(files));
      if (e.target) e.target.value = '';
    }
  };

  const handleAddUrlAttachment = async () => {
    if (!urlInput.trim()) return;
    if (attachments.length >= 3) {
      if (onShowNotification) {
        onShowNotification('Limite de Anexos', 'Limite máximo de 3 anexos de fotos já foi atingido.', 'warning');
      }
      return;
    }

    const nextIndex = attachments.length;
    const autoTag = urlTag || (nextIndex === 0 ? 'principal' : nextIndex === 1 ? 'etiqueta' : 'detalhe');
    const inputVal = urlInput.trim();

    // Se o link for uma dataURL Base64, comprime para WebP
    if (inputVal.startsWith('data:image')) {
      try {
        setIsOptimizingImages(true);
        const opt = await optimizeImageDataUrl(inputVal, {
          maxWidth: 1024,
          maxHeight: 1024,
          quality: 0.80,
          originalFileName: `foto_${nextIndex + 1}.jpg`,
        });

        const newAtt: FormAttachment = {
          id: `att-url-${Date.now()}`,
          name: opt.fileName,
          url: opt.dataUrl,
          size: opt.sizeBytes,
          tag: autoTag,
        };

        setAttachments(prev => [...prev, newAtt]);
        setUrlInput('');
        if (onShowNotification) {
          onShowNotification('Foto Otimizada', `Imagem convertida para WebP (${formatImageSize(opt.sizeBytes)}).`, 'success');
        }
        return;
      } catch (e) {
        console.warn('Fallback ao adicionar dataURL:', e);
      } finally {
        setIsOptimizingImages(false);
      }
    }

    const newAtt: FormAttachment = {
      id: `att-url-${Date.now()}`,
      name: `Foto ${nextIndex + 1} (Link Web)`,
      url: inputVal,
      tag: autoTag,
    };

    setAttachments(prev => [...prev, newAtt]);
    setUrlInput('');
    if (onShowNotification) {
      onShowNotification('Foto Vinculada', `Foto ${nextIndex + 1} de 3 anexada com sucesso.`, 'success');
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(prev => {
      const filtered = prev.filter(a => a.id !== id);
      if (filtered.length > 0 && !filtered.some(a => a.tag === 'principal')) {
        filtered[0] = { ...filtered[0], tag: 'principal' };
      }
      return filtered;
    });
  };

  const handleSetPrimary = (id: string) => {
    setAttachments(prev => {
      const target = prev.find(a => a.id === id);
      if (!target) return prev;
      const others = prev.filter(a => a.id !== id);
      return [
        { ...target, tag: 'principal' as const },
        ...others.map(o => o.tag === 'principal' ? { ...o, tag: 'detalhe' as const } : o)
      ];
    });
  };

  const handleUpdateTag = (id: string, newTag: FormAttachment['tag']) => {
    setAttachments(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, tag: newTag };
      }
      if (newTag === 'principal' && a.tag === 'principal') {
        return { ...a, tag: 'detalhe' };
      }
      return a;
    }));
  };

  // Extract from sample XML helper
  const handleExtractFromSampleXml = () => {
    // Simulate reading from XML
    setCode('VAL-826344');
    setName('KIT EMBREAGEM PLATO DISCO ROLAMENTO VALEO');
    setBrand('Valeo Clutches');
    setUnitCost(395.00);
    setTransportCost(18.00);
    setInitialStock(4);
    setNcm('87089300');
    setCfop('5102');
    setCst('000');
    setTaxBaseIcms(395.00);
    setTaxIpiPercent(5.0);
    setSupplier('Distribuidora de Autopeças Globo Ltda');
    setSupplierCnpj('02.987.654/0001-12');
    setSimilarCodes(['SACHS-6284', 'LUK-620312700', 'VAL-K8263']);
    setApplications([
      {
        id: `app-${Date.now()}`,
        brand: 'Renault',
        vehicle: 'Sandero / Logan / Duster',
        yearRange: '2014-2023',
        engine: '1.6 8V / 16V Hi-Flex',
        transmission: 'Manual 5M',
        traction: '4x2',
        airConditioning: true,
      }
    ]);
    setAttachments([
      {
        id: 'att-sample-1',
        name: 'plato_disco_valeo.jpg',
        url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop&q=80',
        tag: 'principal',
        size: 320000,
      },
      {
        id: 'att-sample-2',
        name: 'etiqueta_valeo_826344.jpg',
        url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&auto=format&fit=crop&q=80',
        tag: 'etiqueta',
        size: 190000,
      },
      {
        id: 'att-sample-3',
        name: 'rolamento_guia_desenho.jpg',
        url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600&auto=format&fit=crop&q=80',
        tag: 'detalhe',
        size: 210000,
      }
    ]);
    setXmlSourceSelected(true);
  };

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      if (onShowNotification) {
        onShowNotification('Campos Obrigatórios', 'Preencha o Código e a Descrição da Peça.', 'warning');
      }
      return;
    }

    const primaryImage = attachments[0]?.url || 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&auto=format&fit=crop&q=80';

    const newProduct: Product = {
      id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      code: code.trim().toUpperCase(),
      oemCode: oemCode.trim().toUpperCase() || code.trim().toUpperCase(),
      similarCodes: similarCodes.length > 0 ? similarCodes : [code.trim().toUpperCase()],
      barcode: oemCode.replace(/\D/g, '') || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
      name: name.trim(),
      brand: brand.trim() || 'Fabricante Homologado',
      category,
      supplier: supplier.trim() || 'Fornecedor Cadastrado',
      supplierCnpj: supplierCnpj.trim(),
      location: {
        corridor: corridor.trim() || 'Corredor A',
        shelf: shelf.trim() || 'Prateleira 01',
        box: box.trim() || 'G-01',
      },
      stock: Number(initialStock) || 0,
      minStock: Number(minStock) || 2,
      unitCost: Number(unitCost) || 0,
      transportCost: Number(transportCost) || 0,
      markupPercent: Number(markupPercent) || 40,
      sellingPrice: Number(calculatedSellingPrice.toFixed(2)),
      ncm: ncm.trim() || '8708.80.00',
      cst,
      cfop,
      taxBaseIcms: Number(taxBaseIcms) || Number(unitCost) || 0,
      taxIpiPercent: Number(taxIpiPercent) || 0,
      taxPisPercent: Number(taxPisPercent) || 1.65,
      taxCofinsPercent: Number(taxCofinsPercent) || 7.6,
      imageUrl: primaryImage,
      images: attachments.map(a => a.url),
      attachments: attachments.map(a => ({
        id: a.id,
        name: a.name,
        url: a.url,
        size: a.size,
        tag: a.tag,
      })),
      applications,
      updatedAt: new Date().toISOString(),
    };

    onSaveProduct(newProduct);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-sky-100 animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50/70 via-white to-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0C4A6E] text-white flex items-center justify-center font-bold shadow-sm">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-800 font-['Outfit']">
                  {guidedMode ? 'Fluxo Guiado: Cadastro de Peça & Código Não Cadastrado' : 'Cadastro Completo de Peça Automotiva'}
                </h2>
                {guidedMode && (
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Assistente Guiado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Aplicações veiculares, códigos cruzados, impostos por estado e locação física no armazém.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGuidedMode(!guidedMode)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition hidden sm:inline-flex"
            >
              {guidedMode ? 'Modo Padrão' : 'Código Não Cadastrado (Guiado)'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Guided banner if in guided mode */}
        {guidedMode && (
          <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-950 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Código não cadastrado detectado:</strong> Complete os dados faltantes (veículo, locação e tributação) para alimentar o estoque e autorizar NF-e.
              </span>
            </div>
            {!xmlSourceSelected && (
              <button
                type="button"
                onClick={handleExtractFromSampleXml}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 rounded-lg text-[11px] shadow-sm flex items-center gap-1 shrink-0 transition"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Extrair Dados do XML de Compra</span>
              </button>
            )}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 text-xs">
          
          {/* SECTION 1: DADOS GERAIS & IDENTIFICAÇÃO */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <Tag className="w-4 h-4 text-[#0284C7]" />
              <h3 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                1. Identificação da Peça & Fornecedor
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  Código Fabricante *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: COF-GP30123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg uppercase font-mono font-bold focus:bg-white focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  Código Original (OEM)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 5U0413031A"
                  value={oemCode}
                  onChange={(e) => setOemCode(e.target.value.toUpperCase())}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg uppercase font-mono focus:bg-white focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  Marca / Fabricante *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cofap, Bosch, Fras-le"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold focus:bg-white focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  Segmento de Veículo *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VehicleCategory)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold focus:bg-white focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                >
                  <option value="auto">Carros & Utilitários</option>
                  <option value="moto">Motos</option>
                  <option value="caminhao">Caminhões & Pesada</option>
                  <option value="agricola">Linha Agrícola & Tratores</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  Descrição Completa da Peça *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amortecedor Dianteiro Turbogás Gol G5 Voyage Pressurizado"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-bold focus:bg-white focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                  Fornecedor Principal
                </label>
                <input
                  type="text"
                  placeholder="Ex: Distribuidora Automotiva Paulista"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#0284C7] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: CUSTOS, MARKUP, PREÇO & ESTOQUE INICIAL */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                  2. Custos de Aquisição, Frete, Markup & Precificação
                </h3>
              </div>
              <div className="text-[11px] font-bold text-slate-600">
                Preço Calculado: <strong className="text-emerald-700 font-mono text-sm">R$ {calculatedSellingPrice.toFixed(2)}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">
                  Custo NF (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">
                  Frete Unit. (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={transportCost}
                  onChange={(e) => setTransportCost(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">
                  Markup (%) *
                </label>
                <input
                  type="number"
                  step="1"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center text-[#0284C7]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">
                  Qtd Inicial Estoque
                </label>
                <input
                  type="number"
                  step="1"
                  value={initialStock}
                  onChange={(e) => setInitialStock(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">
                  Estoque Mínimo
                </label>
                <input
                  type="number"
                  step="1"
                  value={minStock}
                  onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-center text-amber-700"
                />
              </div>
            </div>

            {/* Warehouse Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">
                  Corredor Físico
                </label>
                <input
                  type="text"
                  placeholder="Ex: Corredor A"
                  value={corridor}
                  onChange={(e) => setCorridor(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">
                  Prateleira
                </label>
                <input
                  type="text"
                  placeholder="Ex: Prateleira 02"
                  value={shelf}
                  onChange={(e) => setShelf(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1 text-[10px] uppercase">
                  Gaveta / Caixa
                </label>
                <input
                  type="text"
                  placeholder="Ex: G-14"
                  value={box}
                  onChange={(e) => setBox(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: IMPOSTOS CONFIGURÁVEIS & TRIBUTAÇÃO */}
          <div className="space-y-3 bg-sky-50/50 p-4 rounded-xl border border-sky-100">
            <div className="flex items-center justify-between pb-1 border-b border-sky-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0284C7]" />
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                  3. Impostos Configuráveis por Estado (ICMS, IPI, PIS, COFINS, NCM)
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Conformidade SEFAZ 4.00
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[10px] uppercase">
                  NCM (8 Dígitos) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="8708.80.00"
                  value={ncm}
                  onChange={(e) => setNcm(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[10px] uppercase">
                  CFOP Padrão
                </label>
                <input
                  type="text"
                  value={cfop}
                  onChange={(e) => setCfop(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[10px] uppercase">
                  CST / CSOSN
                </label>
                <select
                  value={cst}
                  onChange={(e) => setCst(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                >
                  <option value="000">000 - Tributada Integral</option>
                  <option value="010">010 - Com Cobrança ICMS-ST</option>
                  <option value="060">060 - ICMS Cobrado Anteriormente ST</option>
                  <option value="500">500 - Simples Nacional ST</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[10px] uppercase">
                  Alíquota IPI (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={taxIpiPercent}
                  onChange={(e) => setTaxIpiPercent(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-center"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[10px] uppercase">
                  PIS (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={taxPisPercent}
                  onChange={(e) => setTaxPisPercent(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-center"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 text-[10px] uppercase">
                  COFINS (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={taxCofinsPercent}
                  onChange={(e) => setTaxCofinsPercent(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-center"
                />
              </div>
            </div>

            {/* Quick State Tax Table preview */}
            <div className="mt-2 bg-white p-2.5 rounded-lg border border-sky-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1 text-slate-600 font-medium">
                <span>Alíquotas por Estado de Destino:</span>
                <select
                  value={selectedUfTax}
                  onChange={(e) => setSelectedUfTax(e.target.value)}
                  className="px-2 py-1 border border-slate-200 rounded font-bold text-[#0C4A6E]"
                >
                  {STATE_TAX_TABLE.map(t => (
                    <option key={t.uf} value={t.uf}>{t.uf} ({t.icmsAliquota}% ICMS, ST MVA {t.icmsStMva}%)</option>
                  ))}
                </select>
              </div>
              <div className="text-slate-500 font-mono text-[10px]">
                Base Cálculo ICMS cadastrada: R$ {taxBaseIcms.toFixed(2)}
              </div>
            </div>
          </div>

          {/* SECTION 4: MÚLTIPLAS APLICAÇÕES VEICULARES */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-[#0C4A6E]" />
                <h3 className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
                  4. Múltiplas Aplicações Veiculares ({applications.length})
                </h3>
              </div>
              <button
                type="button"
                id="btn-add-vehicle-application"
                onClick={handleAddApplication}
                className="flex items-center gap-1 px-3 py-1 bg-sky-50 text-[#0284C7] hover:bg-sky-100 rounded-lg font-bold transition text-xs border border-sky-200"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Aplicação Veicular</span>
              </button>
            </div>

            <div className="space-y-3">
              {applications.map((app, index) => (
                <div key={app.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 relative group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-slate-700 text-[11px] uppercase flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#0C4A6E] text-white flex items-center justify-center text-[10px]">
                        {index + 1}
                      </span>
                      Veículo Compatível
                    </span>
                    {applications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveApplication(app.id)}
                        className="text-rose-500 hover:text-rose-700 p-1 text-xs font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Montadora *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Volkswagen"
                        value={app.brand}
                        onChange={(e) => handleUpdateApplication(app.id, 'brand', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Modelo(s) *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Gol G5 / Voyage"
                        value={app.vehicle}
                        onChange={(e) => handleUpdateApplication(app.id, 'vehicle', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Anos de Fabricação
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 2008-2020"
                        value={app.yearRange}
                        onChange={(e) => handleUpdateApplication(app.id, 'yearRange', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Motorização
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 1.6 8V EA111"
                        value={app.engine}
                        onChange={(e) => handleUpdateApplication(app.id, 'engine', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Câmbio / Transmissão
                      </label>
                      <input
                        type="text"
                        placeholder="Manual 5M / Automático"
                        value={app.transmission}
                        onChange={(e) => handleUpdateApplication(app.id, 'transmission', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                        Tração
                      </label>
                      <select
                        value={app.traction}
                        onChange={(e) => handleUpdateApplication(app.id, 'traction', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium"
                      >
                        <option value="4x2">4x2 Dianteira / Traseira</option>
                        <option value="4x4">4x4 Integral / Reduzida</option>
                        <option value="6x2">6x2 Trucado</option>
                        <option value="6x4">6x4 Traçado</option>
                        <option value="8x4">8x4 Quatro Eixos</option>
                        <option value="Trilhos/Esteira">Trilhos / Esteiras Agrícolas</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between sm:justify-start gap-3 pt-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={app.airConditioning}
                          onChange={(e) => handleUpdateApplication(app.id, 'airConditioning', e.target.checked)}
                          className="w-4 h-4 rounded text-[#0284C7] focus:ring-[#0284C7]"
                        />
                        <span className="font-bold text-slate-700">Com Ar Condicionado</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5: CÓDIGOS SIMILARES */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-bold text-slate-800 text-[11px] uppercase">
                Códigos Similares / Cruzados (Intercambiabilidade)
              </label>
              <span className="text-[10px] text-slate-500 font-medium">
                {similarCodes.length} código(s) cadastrado(s)
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: HG33012, B4702 ou W712/52"
                value={newSimilarInput}
                onChange={(e) => setNewSimilarInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSimilarCode();
                  }
                }}
                className="flex-1 p-2 bg-white border border-slate-300 rounded-lg uppercase font-mono text-xs"
              />
              <button
                type="button"
                onClick={handleAddSimilarCode}
                className="px-3 py-2 bg-[#0C4A6E] text-white font-bold rounded-lg text-xs hover:bg-[#0C4A6E]/90 transition"
              >
                Adicionar Código
              </button>
            </div>

            {/* Tags of similar codes */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {similarCodes.map(sim => (
                <span
                  key={sim}
                  className="inline-flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded-md text-[11px] font-mono font-bold text-slate-700 shadow-xs"
                >
                  <span>{sim}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSimilarCode(sim)}
                    className="text-slate-400 hover:text-rose-600 ml-0.5 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* SECTION 6: FOTOS & ANEXOS DA PEÇA (MÁXIMO 3 ANEXOS) */}
          <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            
            {/* Header with counter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#0284C7]" />
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                    Fotos & Anexos do Produto
                  </h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    attachments.length === 3 
                      ? 'bg-amber-100 text-amber-800 border-amber-300' 
                      : 'bg-sky-100 text-sky-800 border-sky-200'
                  }`}>
                    {attachments.length} de 3 anexos
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <Zap className="w-3 h-3 text-emerald-600" />
                    Formato WebP Ultraleve
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cadastre até 3 fotos por peça (Foto frontal, Etiqueta/Código de Barras e Detalhe de encaixe).
                </p>
              </div>

              {/* Status indicator */}
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={attachments.length >= 3 || isOptimizingImages}
                />
                <button
                  type="button"
                  disabled={attachments.length >= 3 || isOptimizingImages}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                    attachments.length >= 3 || isOptimizingImages
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                      : 'bg-[#0284C7] hover:bg-[#0369a1] text-white cursor-pointer active:scale-95'
                  }`}
                >
                  <Upload className={`w-3.5 h-3.5 ${isOptimizingImages ? 'animate-bounce text-amber-300' : ''}`} />
                  <span>
                    {isOptimizingImages 
                      ? 'Comprimindo WebP...' 
                      : (attachments.length >= 3 ? 'Limite 3/3 Atingido' : 'Upload Fotos')}
                  </span>
                </button>
              </div>
            </div>

            {/* Smart WebP notice */}
            <div className="flex items-center justify-between flex-wrap gap-2 bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-xl text-[11px] text-emerald-950">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>
                  <strong>Compressão Inteligente:</strong> As imagens são redimensionadas para resolução ideal (máx 1024px) e salvas em <strong>WebP</strong> com descarte de EXIF/GPS, ocupando <strong>~95% menos espaço</strong> no banco.
                </span>
              </div>
              {imageOptimizationNotice && (
                <span className="font-mono font-bold text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">
                  {imageOptimizationNotice}
                </span>
              )}
            </div>

            {/* URL Input Bar (optional web links) */}
            {attachments.length < 3 && (
              <div className="flex flex-col sm:flex-row gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap flex items-center gap-1">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                  Link Web:
                </span>
                <input
                  type="text"
                  placeholder="Cole a URL da imagem (https://...)"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUrlAttachment();
                    }
                  }}
                  className="flex-1 p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
                <select
                  value={urlTag}
                  onChange={(e) => setUrlTag(e.target.value as FormAttachment['tag'])}
                  className="p-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
                >
                  <option value="principal">Foto Principal</option>
                  <option value="etiqueta">Etiqueta / OEM</option>
                  <option value="detalhe">Detalhe Técnico</option>
                  <option value="aplicacao">Aplicação</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddUrlAttachment}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition"
                >
                  Vincular
                </button>
              </div>
            )}

            {/* The 3 Slots Grid */}
            <div 
              className={`grid grid-cols-1 sm:grid-cols-3 gap-3 p-1 rounded-xl transition ${
                isDragOver ? 'bg-sky-50 ring-2 ring-sky-400' : ''
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  addFiles(Array.from(e.dataTransfer.files));
                }
              }}
            >
              {[0, 1, 2].map((slotIdx) => {
                const item = attachments[slotIdx];
                const slotTitle = slotIdx === 0 
                  ? 'Slot 1: Foto Principal' 
                  : slotIdx === 1 
                  ? 'Slot 2: Etiqueta / OEM' 
                  : 'Slot 3: Detalhe Técnico';

                if (item) {
                  const isPrimary = slotIdx === 0 || item.tag === 'principal';
                  return (
                    <div 
                      key={item.id}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col shadow-xs hover:shadow-sm transition"
                    >
                      {/* Image Thumbnail Header */}
                      <div className="relative h-32 bg-slate-100 flex items-center justify-center overflow-hidden group">
                        <img
                          src={item.url}
                          alt={item.name}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Overlay tags and zoom */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-xs ${
                            isPrimary 
                              ? 'bg-[#0284C7] text-white' 
                              : 'bg-slate-900/80 text-white'
                          }`}>
                            {slotTitle}
                          </span>
                        </div>

                        {/* Quick action buttons on hover */}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewZoomUrl(item.url)}
                            title="Visualizar em tamanho maior"
                            className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition shadow"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(item.id)}
                            title="Remover anexo"
                            className="p-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition shadow"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Card Content & Controls */}
                      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <p className="text-[11px] font-bold text-slate-800 truncate" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              <Zap className="w-2.5 h-2.5 text-emerald-600" />
                              {item.size ? `${formatImageSize(item.size)} (WebP)` : 'WebP Otimizado'}
                            </span>
                            <span className="font-semibold text-slate-600">Anexo {slotIdx + 1}/3</span>
                          </div>
                        </div>

                        {/* Tag selector and Primary toggle */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          <select
                            value={item.tag}
                            onChange={(e) => handleUpdateTag(item.id, e.target.value as FormAttachment['tag'])}
                            className="p-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-700"
                          >
                            <option value="principal">Foto Principal</option>
                            <option value="etiqueta">Etiqueta / OEM</option>
                            <option value="detalhe">Detalhe Técnico</option>
                            <option value="aplicacao">Aplicação</option>
                          </select>

                          {!isPrimary ? (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(item.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0284C7] hover:underline"
                              title="Tornar a foto principal do catálogo"
                            >
                              <Star className="w-3 h-3 fill-sky-400 text-sky-600" />
                              <span>Principal</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              <span>Principal</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Empty Slot Card
                return (
                  <div
                    key={`empty-slot-${slotIdx}`}
                    onClick={() => {
                      if (attachments.length < 3) {
                        fileInputRef.current?.click();
                      }
                    }}
                    className="border-2 border-dashed border-slate-300 hover:border-[#0284C7] bg-white/70 hover:bg-sky-50/50 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition min-h-[160px] group"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-sky-100 flex items-center justify-center text-slate-400 group-hover:text-[#0284C7] transition mb-2">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-[#0284C7]">
                      {slotTitle}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {slotIdx === 0 
                        ? 'Clique para adicionar foto do catálogo' 
                        : slotIdx === 1 
                        ? 'Foto do código de barras ou etiqueta' 
                        : 'Foto do conector ou encaixe'}
                    </span>
                    <span className="mt-2 text-[9px] font-bold uppercase tracking-wider text-[#0284C7] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      Disponível (+ anexo)
                    </span>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Footer actions inside form */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-slate-500 text-[11px]">
              * Campos obrigatórios para homologação cadastral no estoque.
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-confirm-save-product"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-black px-6 py-2.5 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Salvar Peça & Atualizar Estoque</span>
              </button>
            </div>
          </div>

        </form>

      </div>

      {/* Lightbox Modal for Attachment Zoom */}
      {previewZoomUrl && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewZoomUrl(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                Visualização do Anexo
              </span>
              <button
                type="button"
                onClick={() => setPreviewZoomUrl(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 bg-slate-100 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={previewZoomUrl}
                alt="Zoom anexo"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
