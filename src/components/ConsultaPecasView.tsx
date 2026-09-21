import React, { useState, useMemo, useEffect } from 'react';
import { 
  Home, 
  ChevronRight, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Check, 
  Copy, 
  ExternalLink, 
  Layers, 
  Star, 
  ShieldCheck, 
  Truck, 
  Info, 
  Car,
  Settings,
  ArrowRight,
  Sparkles,
  Search,
  Filter,
  SlidersHorizontal,
  Grid,
  List,
  Building2,
  PackageCheck,
  AlertCircle,
  ArrowLeft,
  Tag,
  Barcode,
  RefreshCw,
  FileText,
  X
} from 'lucide-react';
import brakeRotorImg from '../assets/images/brake_rotor_part_1789396161455.jpg';
import { Product, BranchUnit, CompanyProfile } from '../types';
import { INITIAL_PRODUCTS, INITIAL_BRANCHES } from '../data/initialData';

// Utilitários de busca automotiva resiliente (sem acentos, multi-tokens e normalização de códigos)
export function normalizeSearchString(val: string): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos (ó->o, ã->a, ç->c, etc.)
    .trim();
}

export function cleanCodeForSearch(val: string): string {
  if (!val) return '';
  return val.toLowerCase().replace(/[^a-z0-9]/g, '');
}

interface ConsultaPecasViewProps {
  products?: Product[];
  activeBranch?: BranchUnit;
  branches?: BranchUnit[];
  companyProfile?: CompanyProfile;
  initialSearchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onAddToCart?: (part: any, qty: number) => void;
  onAddToQuote?: (part: any) => void;
  onNavigateToView?: (view: string) => void;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export interface DetailedPartItem {
  id: string;
  name: string;
  brand: string;
  brandCode: string;
  oemCode: string;
  similarCodes: string[];
  barcode?: string;
  price: number;
  stock: number;
  minStock?: number;
  application: string;
  system: string;
  position: string;
  category?: string;
  imageUrl?: string;
  specs: {
    oem: string;
    fabricante: string;
    marca: string;
    diametro?: string;
    espessura?: string;
    furoCentral?: string;
    ncm: string;
    cst?: string;
    cfop?: string;
    garantia?: string;
    peso?: string;
    origem?: string;
  };
  applications: Array<{
    veiculo: string;
    ano: string;
    motor: string;
    versao: string;
    tracao?: string;
  }>;
  equivalentParts: Array<{
    brand: string;
    code: string;
    subCode: string;
    price: number;
    stock: number;
  }>;
}

// Peça padrão detalhada de alta fidelidade
const DEFAULT_FEATURED_PART: DetailedPartItem = {
  id: 'featured-disco-bosch',
  name: 'Disco de Freio Dianteiro',
  brand: 'BOSCH',
  brandCode: '0986479265',
  oemCode: '13502073',
  similarCodes: ['DF4205', 'PD/3123', 'MDFB-1234', 'BD5298'],
  barcode: '4047024867140',
  price: 289.90,
  stock: 5,
  minStock: 2,
  application: 'Chevrolet Onix 1.0 / 1.4 2013 - 2024',
  system: 'Freio',
  position: 'Dianteiro',
  category: 'auto',
  imageUrl: brakeRotorImg,
  specs: {
    oem: '13502073',
    fabricante: '0986479265',
    marca: 'BOSCH',
    diametro: '280 mm',
    espessura: '24 mm',
    furoCentral: '60 mm',
    ncm: '8708.30.90',
    cst: '00',
    cfop: '5102',
    garantia: '12 meses ou 20.000 km',
    peso: '6.450 kg',
    origem: 'Nacional (Fabricação Brasil)',
  },
  applications: [
    { veiculo: 'Chevrolet Onix 1.0', ano: '2013 - 2016', motor: '1.0 8V Flex', versao: 'LT / LS / Joy', tracao: '4x2' },
    { veiculo: 'Chevrolet Onix 1.4', ano: '2013 - 2020', motor: '1.4 8V Flex', versao: 'LT / LTZ', tracao: '4x2' },
    { veiculo: 'Chevrolet Prisma 1.0', ano: '2013 - 2019', motor: '1.0 8V Flex', versao: 'LT / Joy', tracao: '4x2' },
    { veiculo: 'Chevrolet Prisma 1.4', ano: '2013 - 2019', motor: '1.4 8V Flex', versao: 'LT / LTZ', tracao: '4x2' },
    { veiculo: 'Chevrolet Tracker 1.0 Turbo', ano: '2020 - 2024', motor: '1.0 12V Turbo Flex', versao: 'Premier / LTZ', tracao: '4x2' },
    { veiculo: 'Chevrolet Spin 1.8 8V', ano: '2013 - 2023', motor: '1.8 8V SPE/4 Flex', versao: 'Advantage / LTZ', tracao: '4x2' },
  ],
  equivalentParts: [
    {
      brand: 'TRW',
      code: 'DF4205',
      subCode: 'DF-DF4205',
      price: 285.90,
      stock: 3,
    },
    {
      brand: 'Fras-le',
      code: 'PD/3123',
      subCode: 'PD-3123',
      price: 248.90,
      stock: 8,
    },
    {
      brand: 'Marelli',
      code: 'MDFB-1234',
      subCode: 'MDFB-1234',
      price: 279.90,
      stock: 4,
    },
    {
      brand: 'Fremax',
      code: 'BD5298',
      subCode: 'BD-5298',
      price: 262.50,
      stock: 6,
    },
  ],
};

export const ConsultaPecasView: React.FC<ConsultaPecasViewProps> = ({
  products = INITIAL_PRODUCTS,
  activeBranch = INITIAL_BRANCHES[0],
  branches = INITIAL_BRANCHES,
  companyProfile,
  initialSearchQuery = '',
  onSearchQueryChange,
  onAddToCart,
  onAddToQuote,
  onNavigateToView,
  onShowNotification,
}) => {
  // Filtros de busca
  const [searchTerm, setSearchTerm] = useState<string>(initialSearchQuery);
  const [selectedSystem, setSelectedSystem] = useState<string>('todos');
  const [selectedBrand, setSelectedBrand] = useState<string>('todas');
  const [stockOnly, setStockOnly] = useState<boolean>(false);
  const [plateInput, setPlateInput] = useState<string>('');
  const [plateDetectedVehicle, setPlateDetectedVehicle] = useState<string | null>(null);

  // Sincronização externa (ex: busca global no topo do Header)
  useEffect(() => {
    if (initialSearchQuery !== undefined && initialSearchQuery !== searchTerm) {
      setSearchTerm(initialSearchQuery);
      if (initialSearchQuery.trim().length > 0) {
        setViewMode('catalogo');
      }
    }
  }, [initialSearchQuery]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    onSearchQueryChange?.(val);
    if (viewMode === 'detalhes' && val.trim().length > 0) {
      setViewMode('catalogo');
    }
  };

  // Modo de exibição: 'catalogo' (lista/cards) ou 'detalhes' (ficha técnica 1:1)
  const [viewMode, setViewMode] = useState<'catalogo' | 'detalhes'>('catalogo');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');

  // Peça ativa no detalhe técnico
  const [currentPart, setCurrentPart] = useState<DetailedPartItem>(DEFAULT_FEATURED_PART);

  // Estados da visão de detalhes
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedThumbnail, setSelectedThumbnail] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'aplicacoes' | 'descricao' | 'equivalentes' | 'filiais' | 'avaliacoes'>('aplicacoes');
  const [copiedOem, setCopiedOem] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Converte produtos gerais da loja para itens consultáveis
  const allCatalogParts: DetailedPartItem[] = useMemo(() => {
    const list: DetailedPartItem[] = [DEFAULT_FEATURED_PART];

    products.forEach((p) => {
      // Evita duplicar se já for o featured
      if (p.code === DEFAULT_FEATURED_PART.brandCode || p.oemCode === DEFAULT_FEATURED_PART.oemCode) {
        return;
      }

      // Inferência do sistema
      let inferredSystem = 'Motor & Filtros';
      const lowerName = (p.name || '').toLowerCase();
      if (lowerName.includes('freio') || lowerName.includes('disco') || lowerName.includes('pastilha') || lowerName.includes('lona')) {
        inferredSystem = 'Freio';
      } else if (lowerName.includes('amortecedor') || lowerName.includes('mola') || lowerName.includes('suspensao') || lowerName.includes('pivo')) {
        inferredSystem = 'Suspensão';
      } else if (lowerName.includes('filtro') || lowerName.includes('oleo') || lowerName.includes('combustivel')) {
        inferredSystem = 'Filtros';
      } else if (lowerName.includes('vela') || lowerName.includes('bobina') || lowerName.includes('eletric')) {
        inferredSystem = 'Elétrica';
      } else if (lowerName.includes('embreagem') || lowerName.includes('transmissao') || lowerName.includes('retentor')) {
        inferredSystem = 'Transmissão';
      }

      // Inferência de posição
      let inferredPosition = 'Não Aplicável';
      if (lowerName.includes('dianteir')) inferredPosition = 'Dianteiro';
      else if (lowerName.includes('traseir')) inferredPosition = 'Traseiro';

      // Aplicações formatadas
      const apps = (p.applications || []).map((app) => ({
        veiculo: `${app.brand} ${app.vehicle}`,
        ano: app.yearRange || 'Todos',
        motor: app.engine || 'Padrão',
        versao: 'Padrão',
        tracao: app.traction || '4x2',
      }));

      list.push({
        id: p.id,
        name: p.name,
        brand: p.brand || 'Original',
        brandCode: p.code,
        oemCode: p.oemCode || 'N/A',
        similarCodes: p.similarCodes || [],
        barcode: p.barcode,
        price: p.sellingPrice || 0,
        stock: p.stock || 0,
        minStock: p.minStock || 2,
        application: apps.length > 0 ? apps.map(a => a.veiculo).join(', ') : 'Universal / Linha Automotiva',
        system: inferredSystem,
        position: inferredPosition,
        category: p.category || 'auto',
        imageUrl: p.imageUrl || brakeRotorImg,
        specs: {
          oem: p.oemCode || 'N/A',
          fabricante: p.code,
          marca: p.brand || 'Original',
          diametro: 'Conforme OEM',
          espessura: 'Conforme OEM',
          furoCentral: 'Padrão Montadora',
          ncm: p.ncm || '8708.29.99',
          cst: p.cst || '00',
          cfop: p.cfop || '5102',
          garantia: '6 a 12 meses',
          peso: '1.250 kg',
          origem: 'Nacional',
        },
        applications: apps.length > 0 ? apps : [
          { veiculo: 'Compatibilidade Ampla', ano: 'Geral', motor: 'Padrão', versao: 'Todas', tracao: '4x2' }
        ],
        equivalentParts: (p.similarCodes || []).map((code, idx) => ({
          brand: idx % 2 === 0 ? 'TRW' : 'Fras-le',
          code: code,
          subCode: `REF-${code}`,
          price: (p.sellingPrice || 100) * 0.95,
          stock: 4,
        })),
      });
    });

    return list;
  }, [products]);

  // Lista de marcas disponíveis para filtro
  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    allCatalogParts.forEach((p) => {
      if (p.brand) brandsSet.add(p.brand);
    });
    return Array.from(brandsSet).sort();
  }, [allCatalogParts]);

  // Decodificação inteligente de Placa (Mercosul ou Antiga)
  const handlePlateChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    setPlateInput(clean);

    if (clean.length >= 7) {
      // Reconhecimento de placas conhecidas / simulação com frota brasileira
      if (clean.startsWith('BRA') || clean.includes('ONX') || clean.endsWith('19')) {
        setPlateDetectedVehicle('Chevrolet Onix 1.0 / 1.4 Flex (2013-2024)');
        handleSearchChange('Onix');
      } else if (clean.startsWith('ABC') || clean.includes('GOL') || clean.endsWith('05')) {
        setPlateDetectedVehicle('Volkswagen Gol G5 / G6 1.6 Flex (2010-2018)');
        handleSearchChange('Gol');
      } else if (clean.includes('COR') || clean.startsWith('TOY') || clean.endsWith('20')) {
        setPlateDetectedVehicle('Toyota Corolla 2.0 Dual VVT-i (2015-2023)');
        handleSearchChange('Corolla');
      } else if (clean.includes('HIL') || clean.endsWith('40') || clean.startsWith('HIL')) {
        setPlateDetectedVehicle('Toyota Hilux 2.8 Diesel 4x4 (2016-2024)');
        handleSearchChange('Hilux');
      } else if (clean.includes('STR') || clean.startsWith('FIA') || clean.endsWith('22')) {
        setPlateDetectedVehicle('Fiat Strada 1.3 Firefly Flex (2020-2024)');
        handleSearchChange('Strada');
      } else if (clean.includes('SCA') || clean.endsWith('45')) {
        setPlateDetectedVehicle('Scania R450 6x2 Linha Pesada Euro 5/6');
        handleSearchChange('Scania');
      } else {
        const hash = clean.charCodeAt(0) + clean.charCodeAt(3) + clean.charCodeAt(6);
        const sampleVehicles = [
          { name: 'Chevrolet Onix 1.0 Flex', search: 'Onix' },
          { name: 'Volkswagen Gol 1.6 Flex', search: 'Gol' },
          { name: 'Toyota Corolla 2.0 VVT-i', search: 'Corolla' },
          { name: 'Toyota Hilux 2.8 D-4D Diesel', search: 'Hilux' },
          { name: 'Fiat Strada 1.3 Firefly', search: 'Strada' },
        ];
        const picked = sampleVehicles[hash % sampleVehicles.length];
        setPlateDetectedVehicle(`${picked.name} (Placa ${clean})`);
        handleSearchChange(picked.search);
      }
      onShowNotification?.('Placa Identificada', `Filtro aplicado para o veículo correspondente à placa ${clean}`, 'info');
    } else {
      setPlateDetectedVehicle(null);
    }
  };

  const handleClearPlate = () => {
    setPlateInput('');
    setPlateDetectedVehicle(null);
    handleSearchChange('');
  };

  // Filtragem ultra-robusta e inteligente dos produtos
  const filteredParts = useMemo(() => {
    return allCatalogParts.filter((item) => {
      // 1. Filtro de busca por texto, código do fabricante, OEM, código de barras e aplicações
      if (searchTerm.trim()) {
        const normalizedQuery = normalizeSearchString(searchTerm);
        const cleanQueryCode = cleanCodeForSearch(searchTerm);

        // Substrings ou códigos exatos limpos
        const cleanBrandCode = cleanCodeForSearch(item.brandCode);
        const cleanOemCode = cleanCodeForSearch(item.oemCode);
        const cleanBarcode = cleanCodeForSearch(item.barcode || '');
        const cleanSimilars = item.similarCodes.map(s => cleanCodeForSearch(s));

        // Se o usuário digitou um código com 3+ caracteres alfanuméricos e bate direto em algum código:
        const matchesCodeDirectly = cleanQueryCode.length >= 3 && (
          cleanBrandCode.includes(cleanQueryCode) ||
          cleanOemCode.includes(cleanQueryCode) ||
          cleanBarcode.includes(cleanQueryCode) ||
          cleanSimilars.some(s => s.includes(cleanQueryCode))
        );

        if (!matchesCodeDirectly) {
          // Busca inteligente por múltiplos tokens independentes (sem acentos)
          const tokens = normalizedQuery.split(/[\s,./\-]+/).filter(t => t.length > 0);

          const appsText = item.applications.map(a => `${a.veiculo} ${a.ano} ${a.motor} ${a.versao} ${a.tracao || ''}`).join(' ');
          const equivalentsText = item.equivalentParts.map(eq => `${eq.brand} ${eq.code} ${eq.subCode}`).join(' ');
          const similarsText = item.similarCodes.join(' ');
          const specsText = `${item.specs.fabricante} ${item.specs.oem} ${item.specs.ncm} ${item.specs.marca || ''} ${item.specs.diametro || ''}`;

          const corpusNormalized = normalizeSearchString(`
            ${item.name} 
            ${item.brand} 
            ${item.brandCode} 
            ${item.oemCode} 
            ${similarsText} 
            ${item.barcode || ''} 
            ${item.application} 
            ${item.system} 
            ${item.position} 
            ${item.category || ''} 
            ${appsText} 
            ${equivalentsText} 
            ${specsText}
          `);

          // Todos os termos digitados devem estar presentes na ficha da peça ou em códigos limpos
          const allTokensMatch = tokens.every(token => {
            if (corpusNormalized.includes(token)) return true;
            const cleanToken = cleanCodeForSearch(token);
            if (cleanToken.length >= 2) {
              if (cleanBrandCode.includes(cleanToken) || cleanOemCode.includes(cleanToken) || cleanSimilars.some(s => s.includes(cleanToken))) {
                return true;
              }
            }
            return false;
          });

          if (!allTokensMatch) {
            return false;
          }
        }
      }

      // 2. Filtro de sistema
      if (selectedSystem !== 'todos') {
        const itemSys = normalizeSearchString(item.system);
        const itemName = normalizeSearchString(item.name);
        if (selectedSystem === 'freio' && !itemSys.includes('freio') && !itemName.includes('freio') && !itemName.includes('disco') && !itemName.includes('pastilha') && !itemName.includes('lona')) return false;
        if (selectedSystem === 'suspensao' && !itemSys.includes('suspens') && !itemName.includes('amortecedor') && !itemName.includes('mola') && !itemName.includes('suspens') && !itemName.includes('pivo')) return false;
        if (selectedSystem === 'filtros' && !itemSys.includes('filtro') && !itemName.includes('filtro') && !itemName.includes('oleo') && !itemName.includes('combustivel')) return false;
        if (selectedSystem === 'motor' && !itemSys.includes('motor') && !itemName.includes('motor') && !itemName.includes('vela') && !itemName.includes('bobina') && !itemName.includes('retentor') && !itemName.includes('valvula')) return false;
        if (selectedSystem === 'eletrica' && !itemSys.includes('eletric') && !itemName.includes('eletric') && !itemName.includes('vela') && !itemName.includes('bobina')) return false;
        if (selectedSystem === 'transmissao' && !itemSys.includes('transmiss') && !itemSys.includes('embreag') && !itemName.includes('embreag') && !itemName.includes('transmiss') && !itemName.includes('retentor')) return false;
      }

      // 3. Filtro de marca
      if (selectedBrand !== 'todas') {
        if (item.brand.toLowerCase() !== selectedBrand.toLowerCase()) {
          return false;
        }
      }

      // 4. Filtro de estoque
      if (stockOnly && item.stock <= 0) {
        return false;
      }

      return true;
    });
  }, [allCatalogParts, searchTerm, selectedSystem, selectedBrand, stockOnly]);

  // Ações de Detalhe
  const handleOpenPartDetails = (part: DetailedPartItem) => {
    setCurrentPart(part);
    setSelectedThumbnail(0);
    setQuantity(1);
    setViewMode('detalhes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCopyOem = (code?: string) => {
    const oem = code || currentPart.specs.oem;
    navigator.clipboard.writeText(oem);
    setCopiedOem(true);
    setTimeout(() => setCopiedOem(false), 2000);
    onShowNotification?.('Código OEM copiado', `Código ${oem} copiado para a área de transferência.`);
  };

  const handleAddToCart = (part: DetailedPartItem = currentPart, qty: number = quantity) => {
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1200);
    onAddToCart?.(part, qty);
    onShowNotification?.('Adicionado ao Carrinho', `${qty}x ${part.name} (${part.brand}) adicionado com sucesso!`, 'success');
  };

  const handleAddToQuote = (part: DetailedPartItem = currentPart) => {
    onAddToQuote?.(part);
    onShowNotification?.('Adicionado à Cotação', `${part.name} enviado para a Cotação de Balcão.`, 'info');
    onNavigateToView?.('cotacao');
  };

  const handleSelectEquivalent = (eq: typeof currentPart.equivalentParts[0]) => {
    setCurrentPart(prev => ({
      ...prev,
      brand: eq.brand,
      brandCode: eq.code,
      price: eq.price,
      stock: eq.stock,
      specs: {
        ...prev.specs,
        marca: eq.brand,
        fabricante: eq.code,
      }
    }));
    onShowNotification?.('Peça Selecionada', `Alternado para ${eq.brand} (${eq.code})`, 'info');
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedSystem('todos');
    setSelectedBrand('todas');
    setStockOnly(false);
    handleClearPlate();
  };

  // Cores de marcas de autopeças conhecidas
  const getBrandBadgeColor = (brand: string) => {
    const b = brand.toUpperCase();
    if (b.includes('BOSCH')) return 'bg-red-50 text-red-700 border-red-200';
    if (b.includes('COFAP')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (b.includes('FRAS')) return 'bg-amber-50 text-amber-800 border-amber-200';
    if (b.includes('TRW')) return 'bg-red-50 text-red-800 border-red-200';
    if (b.includes('MAHLE')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (b.includes('FREMAX')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200" id="consulta-pecas-view">
      
      {/* Top Banner & Context Bar - Projeto Estilo Oficial GATO */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 sm:p-7 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-[#EA580C]/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#EA580C] text-white flex items-center justify-center shadow-md">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Consulta de Peças & Catálogo Técnico
                  </h1>
                  <span className="bg-[#EA580C]/20 text-[#EA580C] border border-[#EA580C]/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    GATO ERP
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300">
                  Pesquise por código interno, código do fabricante, OEM original, referências cruzadas similares, aplicação veicular ou placa Mercosul.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-800/80 backdrop-blur-xs border border-slate-700/80 px-3.5 py-2 rounded-xl flex items-center gap-3">
              <div>
                <p className="text-[10px] text-slate-400 font-medium uppercase">Itens no Catálogo</p>
                <p className="text-base font-extrabold text-white">{allCatalogParts.length} peças</p>
              </div>
              <div className="w-px h-7 bg-slate-700" />
              <div>
                <p className="text-[10px] text-slate-400 font-medium uppercase">Filial Ativa</p>
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {activeBranch.cdCode} - {activeBranch.uf}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToView?.('consulta-aplicacao')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition cursor-pointer"
            >
              <Car className="w-4 h-4 text-[#EA580C]" />
              <span>Consulta por Frota & Veículos</span>
            </button>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setViewMode('catalogo')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              viewMode === 'catalogo'
                ? 'bg-[#EA580C] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Catálogo Geral ({filteredParts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('detalhes')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
              viewMode === 'detalhes'
                ? 'bg-[#EA580C] text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Ficha Técnica Detalhada: {currentPart.name}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE BUSCA INTELIGENTE & FILTROS MULTICRITÉRIO (SEMPRE ACESSÍVEL) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4" id="secao-busca-pecas">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          
          {/* Campo Principal de Busca por Código / Descrição */}
          <div className="md:col-span-8">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Busca Inteligente por Peça, Código ou Aplicação</span>
              {searchTerm && (
                <span className="text-[11px] font-semibold text-[#EA580C]">
                  {filteredParts.length} peça{filteredParts.length === 1 ? '' : 's'} encontrada{filteredParts.length === 1 ? '' : 's'}
                </span>
              )}
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                id="search-parts-input"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Ex: 0986479265, 13502073, GP30123, disco de freio, Onix, Gol, pastilha..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#EA580C] focus:bg-white focus:ring-2 focus:ring-[#EA580C]/15 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tags de Atalhos Rápidos para Pesquisa Direta */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Sugestões:</span>
              {[
                { label: 'Discos de Freio', query: 'disco' },
                { label: 'Pastilhas', query: 'pastilha' },
                { label: 'Amortecedores', query: 'amortecedor' },
                { label: 'Filtro de Óleo', query: 'filtro oleo' },
                { label: 'Velas Ignição', query: 'vela' },
                { label: 'Onix', query: 'Onix' },
                { label: 'Gol G5', query: 'Gol' },
                { label: 'Corolla', query: 'Corolla' },
                { label: 'Hilux', query: 'Hilux' },
                { label: 'Scania R450', query: 'Scania' },
                { label: 'Cofap GP30123', query: 'GP30123' },
                { label: 'Bosch 0986', query: '0986' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleSearchChange(item.query)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-full border transition cursor-pointer ${
                    normalizeSearchString(searchTerm) === normalizeSearchString(item.query)
                      ? 'bg-orange-100 border-[#EA580C] text-[#EA580C] font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 font-medium'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campo de Busca Rápida por Placa */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Pesquisa por Placa</span>
              <span className="text-[10px] text-[#EA580C] font-semibold">Mercosul / Antiga</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-2.5 w-5 h-3.5 bg-blue-700 rounded-2xs flex items-center justify-center text-[7px] font-bold text-white tracking-widest pointer-events-none">
                BR
              </div>
              <input
                type="text"
                id="search-plate-input"
                value={plateInput}
                onChange={(e) => handlePlateChange(e.target.value)}
                placeholder="BRA2E19 ou ABC1234"
                maxLength={8}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs sm:text-sm font-mono font-bold text-slate-800 uppercase placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-[#EA580C] focus:bg-white focus:ring-2 focus:ring-[#EA580C]/15 transition"
              />
              {plateInput && (
                <button
                  type="button"
                  onClick={handleClearPlate}
                  className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="Limpar placa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Digite 7 caracteres para cruzar a frota brasileira e filtrar peças compatíveis.
            </p>
          </div>
        </div>

        {/* Aviso de Placa Decodificada */}
        {plateDetectedVehicle && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-orange-900">
              <Car className="w-4 h-4 text-[#EA580C] shrink-0" />
              <span><strong>Veículo Reconhecido pela Placa {plateInput}:</strong> {plateDetectedVehicle}</span>
            </div>
            <button
              type="button"
              onClick={handleClearPlate}
              className="text-orange-700 hover:text-orange-900 font-bold underline cursor-pointer"
            >
              Limpar Placa
            </button>
          </div>
        )}

        {/* Filtros em Linha: Sistemas, Marcas, Estoque e Layout */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          
          {/* Pills de Sistema */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'todos', label: 'Todos os Sistemas' },
              { id: 'freio', label: 'Freios' },
              { id: 'suspensao', label: 'Suspensão' },
              { id: 'motor', label: 'Motor' },
              { id: 'filtros', label: 'Filtros' },
              { id: 'eletrica', label: 'Elétrica' },
              { id: 'transmissao', label: 'Transmissão' },
            ].map((sys) => (
              <button
                key={sys.id}
                type="button"
                onClick={() => setSelectedSystem(sys.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedSystem === sys.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sys.label}
              </button>
            ))}
          </div>

          {/* Filtros Auxiliares (Marcas, Apenas em Estoque, Reset e Layout) */}
          <div className="flex items-center gap-2.5">
            {/* Select de Marcas */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#EA580C]"
            >
              <option value="todas">Todas as Marcas</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Checkbox Apenas em Estoque */}
            <label className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer select-none bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
              <input
                type="checkbox"
                checked={stockOnly}
                onChange={(e) => setStockOnly(e.target.checked)}
                className="accent-[#EA580C] rounded"
              />
              <span>Com Estoque</span>
            </label>

            {/* Reset Filters */}
            {(searchTerm || selectedSystem !== 'todos' || selectedBrand !== 'todas' || stockOnly || plateInput) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-[#EA580C] font-semibold flex items-center gap-1 p-1 cursor-pointer"
                title="Limpar todos os filtros"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}

            {/* Toggle Grade / Tabela */}
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <button
                type="button"
                onClick={() => setViewLayout('grid')}
                className={`p-1.5 transition cursor-pointer ${
                  viewLayout === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Visualização em Grade"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewLayout('table')}
                className={`p-1.5 transition cursor-pointer ${
                  viewLayout === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Visualização em Tabela"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Status de Busca Ativa */}
        {searchTerm && (
          <div className="flex items-center justify-between bg-orange-50/70 border border-orange-200/80 rounded-xl px-3.5 py-2 text-xs">
            <div className="flex items-center gap-2 text-slate-800">
              <Search className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>
                Filtrando por: <strong className="text-[#EA580C]">"{searchTerm}"</strong> — <strong className="text-slate-900">{filteredParts.length}</strong> peça{filteredParts.length === 1 ? '' : 's'} localizada{filteredParts.length === 1 ? '' : 's'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              className="text-[#EA580C] hover:text-[#D94606] font-bold text-xs underline cursor-pointer"
            >
              Remover filtro
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: CATÁLOGO GERAL */}
      {/* ========================================================================= */}
      {viewMode === 'catalogo' && (
        <div className="space-y-6">

          {/* Grid de Resultados */}
          {filteredParts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Nenhuma peça encontrada</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                Tente buscar por outro código do fabricante, OEM original, nome da peça ou verifique os filtros selecionados.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-[#EA580C] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#D94606] transition"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          ) : viewLayout === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredParts.map((part) => (
                <div
                  key={part.id}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {/* Top: Foto & Badges */}
                  <div className="p-4 relative bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${getBrandBadgeColor(part.brand)}`}>
                        {part.brand}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        part.stock > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {part.stock > 0 ? `${part.stock} un. em estoque` : 'Sob Encomenda'}
                      </span>
                    </div>

                    {/* Foto da Peça */}
                    <div 
                      onClick={() => handleOpenPartDetails(part)}
                      className="h-44 flex items-center justify-center p-2 cursor-pointer relative overflow-hidden"
                    >
                      <img
                        src={part.imageUrl || brakeRotorImg}
                        alt={part.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
                      />
                    </div>
                  </div>

                  {/* Body: Informações da Peça */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Códigos */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-1">
                        <span>Cód: <strong className="text-slate-800">{part.brandCode}</strong></span>
                        {part.oemCode && part.oemCode !== 'N/A' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyOem(part.oemCode);
                            }}
                            className="flex items-center gap-1 text-slate-500 hover:text-[#EA580C] transition"
                            title="Copiar Código OEM"
                          >
                            <span>OEM: {part.oemCode}</span>
                            <Copy className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Título da Peça */}
                      <h3 
                        onClick={() => handleOpenPartDetails(part)}
                        className="text-sm font-black text-slate-900 line-clamp-2 hover:text-[#EA580C] transition cursor-pointer leading-tight"
                      >
                        {part.name}
                      </h3>

                      {/* Aplicação Resumida */}
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 flex items-start gap-1">
                        <Car className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{part.application}</span>
                      </p>
                    </div>

                    {/* Preço e Ações */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-baseline justify-between mb-3">
                        <div>
                          <span className="text-xs text-slate-400">À vista</span>
                          <p className="text-xl font-black text-[#EA580C] leading-none">
                            R$ {part.price.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          3x de R$ {(part.price / 3).toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      {/* Botões */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPartDetails(part)}
                          className="w-full py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>Detalhes</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAddToQuote(part)}
                          className="w-full py-2 px-2.5 bg-[#EA580C] hover:bg-[#D94606] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-98"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Cotação</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Visualização em Tabela Compacta de Balcão */
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Peça / Descrição</th>
                      <th className="py-3 px-4">Marca</th>
                      <th className="py-3 px-4">Código Fabricante</th>
                      <th className="py-3 px-4">Código OEM</th>
                      <th className="py-3 px-4">Aplicação Principal</th>
                      <th className="py-3 px-4 text-center">Estoque</th>
                      <th className="py-3 px-4 text-right">Preço</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredParts.map((part) => (
                      <tr key={part.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                              <img src={part.imageUrl || brakeRotorImg} alt={part.name} className="max-h-full max-w-full object-contain" />
                            </div>
                            <div>
                              <button
                                type="button"
                                onClick={() => handleOpenPartDetails(part)}
                                className="font-bold text-slate-900 hover:text-[#EA580C] text-left transition cursor-pointer"
                              >
                                {part.name}
                              </button>
                              <p className="text-[10px] text-slate-400">{part.system}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBrandBadgeColor(part.brand)}`}>
                            {part.brand}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          {part.brandCode}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {part.oemCode || '-'}
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                          {part.application}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                            part.stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {part.stock} un.
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900">
                          R$ {part.price.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenPartDetails(part)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                              title="Ver ficha técnica completa"
                            >
                              Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddToQuote(part)}
                              className="px-2.5 py-1.5 bg-[#EA580C] hover:bg-[#D94606] text-white font-bold rounded-lg shadow-2xs transition"
                              title="Adicionar à cotação"
                            >
                              Cotar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: FICHA TÉCNICA DETALHADA DA PEÇA (Layout Especialista 1:1) */}
      {/* ========================================================================= */}
      {viewMode === 'detalhes' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Breadcrumbs & Voltar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 px-4 rounded-xl border border-slate-200/80 shadow-2xs">
            <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
              <button 
                onClick={() => onNavigateToView?.('dashboard')}
                className="flex items-center gap-1.5 hover:text-slate-900 transition cursor-pointer"
              >
                <Home className="w-4 h-4 text-slate-400" />
                <span>Início</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button 
                onClick={() => setViewMode('catalogo')}
                className="hover:text-slate-900 transition cursor-pointer"
              >
                Consulta de Peças
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-800 font-semibold truncate max-w-xs">
                {currentPart.name}
              </span>
            </nav>

            <button
              type="button"
              onClick={() => setViewMode('catalogo')}
              className="text-xs font-bold text-slate-700 hover:text-[#EA580C] flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Catálogo de Peças</span>
            </button>
          </div>

          {/* Main Top Section: 3-Column Layout 1:1 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            
            {/* Col 1: Galeria de Imagens da Peça (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
              {/* Badge de estoque top-left */}
              <div className="flex items-center justify-between">
                <span className="bg-[#EA580C] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs">
                  {currentPart.stock > 0 ? 'Em estoque' : 'Sob Encomenda'}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  Foto Real / Catálogo
                </span>
              </div>

              {/* Imagem Principal */}
              <div className="py-6 flex items-center justify-center relative min-h-[260px]">
                <img 
                  src={currentPart.imageUrl || brakeRotorImg} 
                  alt={currentPart.name} 
                  className={`max-h-64 object-contain transition-all duration-300 ${
                    selectedThumbnail === 0 
                      ? 'scale-100' 
                      : selectedThumbnail === 1 
                        ? 'rotate-45 scale-95' 
                        : selectedThumbnail === 2 
                          ? '-rotate-30 scale-95' 
                          : 'brightness-110 scale-100'
                  }`}
                />
              </div>

              {/* Faixa de Miniaturas (4 ângulos) */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedThumbnail(idx)}
                    className={`h-16 rounded-xl border flex items-center justify-center overflow-hidden bg-slate-50/60 p-1.5 transition cursor-pointer ${
                      selectedThumbnail === idx 
                        ? 'border-[#EA580C] ring-2 ring-[#EA580C]/20 bg-white shadow-2xs' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img 
                      src={currentPart.imageUrl || brakeRotorImg} 
                      alt={`Ângulo ${idx + 1}`} 
                      className={`max-h-full object-contain ${
                        idx === 1 ? 'rotate-45 scale-90' : idx === 2 ? '-rotate-30 scale-90' : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Col 2: Informações Comerciais & Compra (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between min-h-full">
              <div>
                {/* Logo da Marca */}
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px] font-black">
                    {currentPart.brand.charAt(0)}
                  </div>
                  <span className="text-red-600 font-extrabold tracking-tight text-base font-['Outfit']">
                    {currentPart.brand}
                  </span>
                </div>

                {/* Título do Produto */}
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1 leading-tight">
                  {currentPart.name}
                </h1>

                {/* Subtítulo / Código */}
                <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-1">
                  {currentPart.brand} - {currentPart.brandCode}
                </p>

                {/* Destaques Técnicos Rápidos */}
                <div className="mt-5 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
                    <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    </div>
                    <span>
                      <strong className="text-slate-900 font-semibold">Aplicação:</strong> {currentPart.application}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
                    <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    </div>
                    <span>
                      <strong className="text-slate-900 font-semibold">Sistema:</strong> {currentPart.system}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700">
                    <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    </div>
                    <span>
                      <strong className="text-slate-900 font-semibold">Posição:</strong> {currentPart.position}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloco de Preço & Compra */}
              <div className="pt-6 mt-6 border-t border-slate-100">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-3xl sm:text-4xl font-black text-[#EA580C] tracking-tight">
                      R$ {currentPart.price.toFixed(2).replace('.', ',')}
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      à vista no Pix / Dinheiro
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 font-bold">Em estoque</span>
                    <span className="text-slate-900 font-bold ml-1">{currentPart.stock} un.</span>
                  </div>
                </div>

                {/* Seletor de Quantidade e Botão do Carrinho */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shrink-0 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3 py-3 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-slate-900 text-sm">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3 py-3 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    id="btn-add-to-cart-view"
                    onClick={() => handleAddToCart(currentPart, quantity)}
                    className={`flex-1 bg-[#EA580C] hover:bg-[#D94606] text-white font-bold py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 text-sm sm:text-base ${
                      addedAnimation ? 'ring-4 ring-orange-300 scale-98' : ''
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    <span>Adicionar ao carrinho</span>
                  </button>
                </div>

                {/* Botão Secundário Cotação */}
                <button
                  type="button"
                  id="btn-add-to-quote-view"
                  onClick={() => handleAddToQuote(currentPart)}
                  className="w-full mt-3 py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm border border-slate-200 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Adicionar à cotação de balcão</span>
                </button>
              </div>
            </div>

            {/* Col 3: Painéis Laterais Técnicos & Equivalentes (3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              
              {/* Card de Informações Técnicas */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3.5 tracking-tight flex items-center justify-between">
                  <span>Informações técnicas</span>
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                </h3>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Código Original (OEM)</span>
                    <button 
                      onClick={() => handleCopyOem()}
                      className="flex items-center gap-1 font-semibold text-slate-800 hover:text-[#EA580C] transition cursor-pointer"
                      title="Copiar Código OEM"
                    >
                      <span>{currentPart.specs.oem}</span>
                      {copiedOem ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Código Fabricante</span>
                    <span className="font-semibold text-slate-800">{currentPart.specs.fabricante}</span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Marca</span>
                    <span className="font-semibold text-slate-800">{currentPart.specs.marca}</span>
                  </div>

                  {currentPart.specs.diametro && (
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Diâmetro Externo</span>
                      <span className="font-semibold text-slate-800">{currentPart.specs.diametro}</span>
                    </div>
                  )}

                  {currentPart.specs.espessura && (
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Espessura</span>
                      <span className="font-semibold text-slate-800">{currentPart.specs.espessura}</span>
                    </div>
                  )}

                  {currentPart.specs.furoCentral && (
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Furo Central</span>
                      <span className="font-semibold text-slate-800">{currentPart.specs.furoCentral}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">NCM</span>
                    <span className="font-semibold text-slate-800">{currentPart.specs.ncm}</span>
                  </div>
                </div>
              </div>

              {/* Card de Peças Equivalentes / Conversão */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 mb-3.5 tracking-tight flex items-center justify-between">
                  <span>Peças equivalentes</span>
                  <span className="text-[10px] font-bold text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded-full">
                    {currentPart.equivalentParts.length} similares
                  </span>
                </h3>

                <div className="space-y-3">
                  {currentPart.equivalentParts.map((eq, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200 cursor-pointer group"
                      onClick={() => handleSelectEquivalent(eq)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                          <img src={brakeRotorImg} alt={eq.brand} className="max-h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate group-hover:text-[#EA580C] transition">
                            {eq.brand}
                          </p>
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {eq.code}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {eq.subCode}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-slate-900">
                          R$ {eq.price.toFixed(2).replace('.', ',')}
                        </p>
                        <span className="text-[10px] text-slate-400 group-hover:text-[#EA580C] font-medium transition flex items-center gap-0.5 justify-end">
                          Selecionar
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Lower Section: Abas de Aplicação, Descrição, Ficha e Filiais */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Barra de Abas */}
            <div className="flex items-center border-b border-slate-200 px-6 gap-6 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('aplicacoes')}
                className={`py-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'aplicacoes'
                    ? 'border-[#EA580C] text-[#EA580C]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
                <span>Aplicações em Veículos ({currentPart.applications.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('descricao')}
                className={`py-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'descricao'
                    ? 'border-[#EA580C] text-[#EA580C]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Ficha Técnica & Material</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('filiais')}
                className={`py-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'filiais'
                    ? 'border-[#EA580C] text-[#EA580C]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4 inline-block mr-1" />
                <span>Estoque por Filial / CD</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('avaliacoes')}
                className={`py-4 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
                  activeTab === 'avaliacoes'
                    ? 'border-[#EA580C] text-[#EA580C]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>Avaliações & Oficinas</span>
              </button>
            </div>

            {/* Conteúdo das Abas */}
            {/* Aba 1: Aplicações */}
            {activeTab === 'aplicacoes' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-6">Veículo / Modelo</th>
                      <th className="py-3 px-6">Ano de Fabricação</th>
                      <th className="py-3 px-6">Motorização</th>
                      <th className="py-3 px-6">Versão</th>
                      <th className="py-3 px-6">Tração</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {currentPart.applications.map((app, index) => (
                      <tr key={index} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-6 font-bold text-slate-900">
                          {app.veiculo}
                        </td>
                        <td className="py-3 px-6 text-slate-600">
                          {app.ano}
                        </td>
                        <td className="py-3 px-6 text-slate-600 font-medium">
                          {app.motor}
                        </td>
                        <td className="py-3 px-6 text-slate-600">
                          {app.versao}
                        </td>
                        <td className="py-3 px-6 text-slate-600">
                          {app.tracao || '4x2'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Aba 2: Ficha Técnica & Descrição */}
            {activeTab === 'descricao' && (
              <div className="p-6 text-xs sm:text-sm text-slate-600 leading-relaxed space-y-4">
                <p>
                  O <strong>{currentPart.name} {currentPart.brand} ({currentPart.brandCode})</strong> é fabricado em conformidade estrita com as normas das montadoras originais, utilizando liga especial de ferro fundido de alto carbono (G3000) e tecnologia de dissipação térmica avançada.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
                      <span>Certificação Inmetro</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Homologado e testado sob cargas térmicas extremas.</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-[#EA580C]" />
                      <span>Balanceamento OE</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Zero trepidação no pedal e resposta imediata na frenagem.</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-[#EA580C]" />
                      <span>Garantia de Fábrica</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">{currentPart.specs.garantia || '12 meses ou 20.000 km'}.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Aba 3: Estoque por Filial / CD */}
            {activeTab === 'filiais' && (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {branches.map((b, idx) => (
                    <div 
                      key={b.id} 
                      className={`p-4 rounded-xl border flex flex-col justify-between ${
                        b.id === activeBranch.id
                          ? 'border-[#EA580C] bg-orange-50/20 shadow-2xs'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {b.cdCode}
                          </span>
                          {b.id === activeBranch.id && (
                            <span className="text-[10px] font-bold text-[#EA580C] bg-orange-100/70 px-2 py-0.5 rounded-full">
                              Filial Atual
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{b.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{b.city} - {b.uf}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Disponível:</span>
                        <span className="text-sm font-black text-slate-900">
                          {idx === 0 ? currentPart.stock : Math.max(1, currentPart.stock - idx * 2)} un.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aba 4: Avaliações */}
            {activeTab === 'avaliacoes' && (
              <div className="p-6 space-y-4 text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="font-bold text-slate-900">4.9 de 5 estrelas</span>
                  <span className="text-slate-400">• 42 avaliações de mecânicas e frotas</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Oficina & Auto Center Bandeirantes</span>
                    <span className="text-slate-400 text-[11px]">Ontem</span>
                  </div>
                  <p className="text-slate-600 mt-1">Peça com encaixe perfeito, acabamento usinado de alta precisão e sem vibrações.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
