import React, { useState } from 'react';
import { 
  Boxes, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MapPin, 
  Car, 
  AlertTriangle, 
  Tag, 
  CheckCircle2, 
  Edit3, 
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  Image as ImageIcon,
  Camera,
  Maximize2,
  X,
  Star,
  Printer,
  Barcode,
  ClipboardCheck,
  Truck,
  Cable,
  Zap
} from 'lucide-react';
import { Product, VehicleCategory, UserSession, PhysicalInventoryItem } from '../types';
import { CadastroPecaModal } from './CadastroPecaModal';
import { formatImageSize } from '../utils/imageOptimizer';

interface EstoqueManagerProps {
  products: Product[];
  userSession?: UserSession | null;
  onUpdateProducts: (products: Product[]) => void;
  onAddNewProduct?: (product: Product) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
  onSelectForQuote?: (product: Product) => void;
}

export const EstoqueManager: React.FC<EstoqueManagerProps> = ({
  products,
  userSession,
  onUpdateProducts,
  onAddNewProduct,
  onShowNotification,
  onSelectForQuote,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [filterExternalStockOnly, setFilterExternalStockOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCadastroModalOpen, setIsCadastroModalOpen] = useState(false);
  const [previewZoomUrl, setPreviewZoomUrl] = useState<string | null>(null);

  // Modal Impressão de Etiquetas
  const [isEtiquetasModalOpen, setIsEtiquetasModalOpen] = useState(false);
  const [selectedEtiquetaProduct, setSelectedEtiquetaProduct] = useState<Product | null>(products[0] || null);
  const [etiquetaTipo, setEtiquetaTipo] = useState<'gondola' | 'adesiva'>('gondola');
  const [etiquetaCopias, setEtiquetaCopias] = useState(4);

  // Modal Inventário Físico & Balanço
  const [isInventarioModalOpen, setIsInventarioModalOpen] = useState(false);
  const [inventoryItems, setInventoryItems] = useState<PhysicalInventoryItem[]>([]);
  const [barcodeSearchInput, setBarcodeSearchInput] = useState('');

  // Inicializar inventário com produtos atuais
  const handleOpenInventario = () => {
    const items: PhysicalInventoryItem[] = products.map((p) => ({
      productId: p.id,
      code: p.code,
      oemCode: p.oemCode,
      barcode: p.barcode || '7891234560001',
      name: p.name,
      brand: p.brand,
      location: `${p.location.corridor} / ${p.location.shelf} / ${p.location.box}`,
      systemStock: p.stock,
      countedStock: p.stock,
      diff: 0,
      costPrice: p.unitCost,
      status: 'pendente',
    }));
    setInventoryItems(items);
    setIsInventarioModalOpen(true);
  };

  // Bipar produto no inventário
  const handleBiparInventario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeSearchInput.trim()) return;
    const query = barcodeSearchInput.trim().toLowerCase();

    setInventoryItems((prev) =>
      prev.map((item) => {
        if (
          item.barcode.toLowerCase() === query ||
          item.code.toLowerCase() === query ||
          item.oemCode.toLowerCase() === query
        ) {
          const newCounted = item.countedStock + 1;
          const diff = newCounted - item.systemStock;
          return {
            ...item,
            countedStock: newCounted,
            diff,
            status: diff === 0 ? 'conferido' : 'divergente',
            lastCountedAt: new Date().toLocaleTimeString('pt-BR'),
          };
        }
        return item;
      })
    );

    setBarcodeSearchInput('');
    onShowNotification('Item Bipado', `Contagem atualizada para o código ${query}.`, 'info');
  };

  // Alterar contagem direta
  const handleUpdateCountedStock = (productId: string, val: number) => {
    setInventoryItems((prev) =>
      prev.map((item) => {
        if (item.productId === productId) {
          const countedStock = Math.max(0, val);
          const diff = countedStock - item.systemStock;
          return {
            ...item,
            countedStock,
            diff,
            status: diff === 0 ? 'conferido' : 'divergente',
          };
        }
        return item;
      })
    );
  };

  // Aplicar Ajustes de Estoque do Inventário
  const handleApplyInventoryAdjustments = () => {
    const updatedProducts = products.map((p) => {
      const inv = inventoryItems.find((item) => item.productId === p.id);
      if (inv && inv.diff !== 0) {
        return {
          ...p,
          stock: inv.countedStock,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    onUpdateProducts(updatedProducts);
    setIsInventarioModalOpen(false);
    onShowNotification(
      'Inventário Aplicado',
      'Os estoques de todas as peças foram sincronizados com as contagens apuradas.',
      'success'
    );
  };

  // Stock movement modal state (Entrada / Saída)
  const [movementModal, setMovementModal] = useState<{
    isOpen: boolean;
    product: Product | null;
    type: 'entrada' | 'saida';
    quantity: number;
    reason: string;
    responsible: string;
  }>({
    isOpen: false,
    product: null,
    type: 'entrada',
    quantity: 1,
    reason: 'Reposição de compra local',
    responsible: 'Operador de Balcão',
  });

  // Filter products
  const filteredProducts = products.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (p.name && p.name.toLowerCase().includes(term)) ||
      (p.code && p.code.toLowerCase().includes(term)) ||
      (p.oemCode && p.oemCode.toLowerCase().includes(term)) ||
      (p.brand && p.brand.toLowerCase().includes(term)) ||
      (p.location?.corridor && p.location.corridor.toLowerCase().includes(term)) ||
      (p.location?.box && p.location.box.toLowerCase().includes(term)) ||
      (p.similarCodes && p.similarCodes.some(s => s && s.toLowerCase().includes(term))) ||
      (p.applications && p.applications.some(a => 
        (a.vehicle && a.vehicle.toLowerCase().includes(term)) || 
        (a.brand && a.brand.toLowerCase().includes(term))
      ));

    const matchesCategory = selectedCategory === 'all' || 
      p.category === selectedCategory ||
      (selectedCategory === 'caminhao' && (p.category === 'pesada' || p.category === 'caminhoes' || p.name?.toLowerCase().includes('caminh') || p.name?.toLowerCase().includes('pesada')));
    const centralStock = p.stockCentral !== undefined ? p.stockCentral : p.stock;
    const matchesLowStock = !filterLowStockOnly || centralStock <= p.minStock;
    const hasExternalStock = (p.stockExternal?.total || 0) > 0 || (p.stockExternal?.meliFull || 0) > 0 || (p.stockExternal?.amazonFba || 0) > 0;
    const matchesExternal = !filterExternalStockOnly || hasExternalStock;

    return matchesSearch && matchesCategory && matchesLowStock && matchesExternal;
  });

  // Handle stock movement execution
  const handleConfirmMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementModal.product) return;

    const prod = movementModal.product;
    const qty = movementModal.quantity;
    const currentCentral = prod.stockCentral !== undefined ? prod.stockCentral : prod.stock;

    if (movementModal.type === 'saida' && currentCentral < qty) {
      onShowNotification('Estoque Insuficiente', `Quantidade de saída (${qty}) é maior do que o estoque disponível no CD Central (${currentCentral} un).`, 'warning');
      return;
    }

    const newCentral = movementModal.type === 'entrada' ? currentCentral + qty : currentCentral - qty;
    const extTotal = prod.stockExternal?.total || 0;

    const updatedList = products.map((p) => {
      if (p.id === prod.id) {
        return {
          ...p,
          stockCentral: newCentral,
          stock: newCentral + extTotal,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    onUpdateProducts(updatedList);
    setMovementModal({ ...movementModal, isOpen: false });

    onShowNotification(
      `Movimentação de Estoque Registrada!`,
      `${movementModal.type === 'entrada' ? 'Entrada (+)' : 'Saída (-)'} de ${qty} un da peça ${prod.code}. Novo saldo Central: ${newCentral} un. Motivo: ${movementModal.reason}`,
      'success'
    );
  };

  const totalStockUnits = products.reduce((acc, p) => acc + (p.stockCentral !== undefined ? p.stockCentral : p.stock), 0);
  const totalExternalUnits = products.reduce((acc, p) => acc + (p.stockExternal?.total || 0), 0);
  const totalStockValue = products.reduce((acc, p) => acc + p.stock * p.unitCost, 0);
  const lowStockCount = products.filter((p) => (p.stockCentral !== undefined ? p.stockCentral : p.stock) <= p.minStock).length;

  return (
    <div className="space-y-6" id="view-estoque-manager">
      {/* Header Banner - Clean Minimalism */}
      <div className="bg-white rounded-2xl p-5 border border-sky-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0284C7] font-bold text-xs uppercase tracking-wider mb-1">
            <Boxes className="w-4 h-4 text-[#0284C7]" />
            <span>Módulo 2: Gestão de Estoque & Locação Física</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 font-['Outfit'] tracking-tight">
            Controle de Peças: Carro, Moto, Pesada & Agrícola
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Locação física detalhada (Corredor, Prateleira, Gaveta), alertas de reposição, entradas/saídas com motivo e catálogo de similares.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-orange-50/80 border border-orange-200/80 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] font-bold text-orange-900 uppercase block">Estoque Central</span>
            <span className="text-sm font-black text-orange-950 font-mono">{totalStockUnits} un</span>
          </div>
          {totalExternalUnits > 0 && (
            <div className="bg-purple-50/80 border border-purple-200/80 px-3 py-1.5 rounded-xl text-center">
              <span className="text-[10px] font-bold text-purple-900 uppercase block">Estoque Externo</span>
              <span className="text-sm font-black text-purple-950 font-mono">{totalExternalUnits} un (Full/FBA)</span>
            </div>
          )}
          <div className="bg-emerald-50/70 border border-emerald-100 px-3 py-1.5 rounded-xl text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Valor em Custo</span>
            <span className="text-sm font-black text-emerald-700 font-mono">
              R$ {totalStockValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </span>
          </div>
          {lowStockCount > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 px-3 py-1.5 rounded-xl text-center">
              <span className="text-[10px] font-bold text-[#F59E0B] uppercase block">Estoque Crítico</span>
              <span className="text-sm font-black text-[#F59E0B] font-mono">{lowStockCount} peças</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-sky-50 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-sky-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="estoque-search-input"
              placeholder="Filtrar por código, OEM, similar (Bosch, Cofap), veículo (Gol, Scania) ou locação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 font-medium"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                selectedCategory === 'all' 
                  ? 'bg-sky-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('auto')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                selectedCategory === 'auto' 
                  ? 'bg-sky-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Carros & Vans
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('moto')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                selectedCategory === 'moto' 
                  ? 'bg-sky-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Motos
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('caminhao')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                selectedCategory === 'caminhao' 
                  ? 'bg-sky-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Caminhões (Pesada)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('agricola')}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                selectedCategory === 'agricola' 
                  ? 'bg-sky-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Agrícola & Tratores
            </button>

            {/* Low stock toggle */}
            <button
              type="button"
              onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                filterLowStockOnly 
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400' 
                  : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Abaixo do Mínimo</span>
            </button>

            {/* Filter External Stock Only (Full / FBA) */}
            <button
              type="button"
              onClick={() => setFilterExternalStockOnly(!filterExternalStockOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition cursor-pointer ${
                filterExternalStockOnly 
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-xs' 
                  : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5 text-purple-700" />
              <span>Estoque Externo (Full/FBA)</span>
            </button>

            {/* Imprimir Etiquetas de Código de Barras */}
            <button
              type="button"
              onClick={() => setIsEtiquetasModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition active:scale-95 cursor-pointer whitespace-nowrap ml-auto"
            >
              <Barcode className="w-4 h-4 text-sky-600" />
              <span>Etiquetas de Código de Barras</span>
            </button>

            {/* Inventário Físico & Balanço */}
            <button
              type="button"
              onClick={handleOpenInventario}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold rounded-lg text-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <ClipboardCheck className="w-4 h-4 text-indigo-600" />
              <span>Inventário & Balanço</span>
            </button>

            {/* Direct Cadastrar Peça Action */}
            <button
              type="button"
              onClick={() => setIsCadastroModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-bold rounded-lg text-xs shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Cadastrar Peça (+3 Fotos)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">Foto & Código / OEM</th>
                <th className="p-3.5">Descrição da Peça</th>
                <th className="p-3.5">Locação no Galpão</th>
                <th className="p-3.5">Aplicação Principal</th>
                <th className="p-3.5 text-center">Estoque Central / Externo</th>
                <th className="p-3.5 text-right">Custo / Venda</th>
                <th className="p-3.5 text-center pr-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Nenhuma peça encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isLow = product.stock <= product.minStock;
                  const totalPhotos = (product.attachments?.length || product.images?.length || (product.imageUrl ? 1 : 0));
                  return (
                    <tr 
                      key={product.id}
                      className="hover:bg-sky-50/40 transition group cursor-pointer"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {/* Code / Brand / Photo Thumbnail */}
                      <td className="p-3.5 pl-4 align-middle">
                        <div className="flex items-center gap-2.5">
                          {/* Thumbnail with photo count */}
                          <div 
                            className="relative w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 group/photo cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (product.imageUrl) {
                                setPreviewZoomUrl(product.imageUrl);
                              } else {
                                setSelectedProduct(product);
                              }
                            }}
                            title="Clique para ampliar foto da peça"
                          >
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name} 
                                className="w-full h-full object-cover transition group-hover/photo:scale-110" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                            )}
                            {totalPhotos > 1 && (
                              <span className="absolute bottom-0 right-0 bg-[#0C4A6E] text-white text-[8px] font-black px-1 rounded-tl shadow-xs">
                                +{totalPhotos - 1}
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-sky-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                                {product.code}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                              OEM: {product.oemCode} • {product.brand}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Name */}
                      <td className="p-3.5 align-middle">
                        <p className="font-extrabold text-slate-900 leading-tight">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <span className="uppercase font-semibold text-sky-700">NCM: {product.ncm}</span>
                          <span>•</span>
                          <span>{product.category.toUpperCase()}</span>
                        </div>
                      </td>

                      {/* Location: Corridor / Shelf / Box */}
                      <td className="p-3.5 align-middle">
                        <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-950 font-bold px-2 py-1 rounded-lg">
                          <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{product.location.corridor} • {product.location.shelf} • {product.location.box}</span>
                        </div>
                      </td>

                      {/* Application */}
                      <td className="p-3.5 align-middle">
                        <div className="max-w-xs truncate text-[11px] font-semibold text-slate-700">
                          {product.applications[0]?.vehicle || 'Universal'} ({product.applications[0]?.brand})
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {product.applications[0]?.engine} • {product.applications[0]?.airConditioning ? 'Com Ar' : 'Sem Ar'}
                        </div>
                      </td>

                      {/* Stock / Min (Central vs. Externo Full/FBA) */}
                      <td className="p-3.5 align-middle text-center">
                        {(() => {
                          const central = product.stockCentral !== undefined ? product.stockCentral : product.stock;
                          const extMeli = product.stockExternal?.meliFull || 0;
                          const extAmazon = product.stockExternal?.amazonFba || 0;
                          const extShopee = product.stockExternal?.shopeeExternal || 0;
                          const extTotal = product.stockExternal?.total !== undefined ? product.stockExternal.total : (extMeli + extAmazon + extShopee);
                          const total = central + extTotal;
                          const isCentralLow = central <= product.minStock;

                          return (
                            <div className="inline-flex flex-col items-center gap-1">
                              {/* Central Stock */}
                              <div className="flex items-center gap-1">
                                <span className={`font-mono text-xs font-black px-2 py-0.5 rounded-full ${
                                  isCentralLow 
                                    ? 'bg-rose-100 text-rose-800 animate-pulse' 
                                    : 'bg-orange-100 text-orange-900 border border-orange-200/60'
                                }`} title="Estoque Central (CD Matriz / Balcão)">
                                  {central} un CD
                                </span>
                              </div>

                              {/* External Stock (Meli Full / Amazon FBA) */}
                              {extTotal > 0 && (
                                <div 
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-800 text-[10px] font-bold font-mono"
                                  title={`Mercado Livre Full: ${extMeli} un | Amazon FBA: ${extAmazon} un | Shopee Hub: ${extShopee} un`}
                                >
                                  <Truck className="w-2.5 h-2.5 text-purple-600" />
                                  <span>+{extTotal} Full/FBA</span>
                                </div>
                              )}

                              <span className="text-[10px] text-slate-400 font-medium">
                                Total: <strong className="text-slate-700">{total} un</strong> • Mín: {product.minStock}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Cost / Sale Price */}
                      <td className="p-3.5 align-middle text-right">
                        <p className="font-mono text-xs font-black text-slate-900">
                          R$ {product.sellingPrice.toFixed(2)}
                        </p>
                        <span className="font-mono text-[10px] text-slate-500 block">
                          Custo: R$ {product.unitCost.toFixed(2)}
                        </span>
                      </td>

                      {/* Actions: Quick Movement Entrada / Saida */}
                      <td className="p-3.5 pr-4 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Entrada Button */}
                          <button
                            type="button"
                            onClick={() => setMovementModal({
                              isOpen: true,
                              product,
                              type: 'entrada',
                              quantity: 1,
                              reason: 'Reposição de estoque / Compra',
                              responsible: 'Operador Balcão',
                            })}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            title="Dar Entrada no Estoque"
                          >
                            <ArrowDownLeft className="w-4 h-4" />
                          </button>

                          {/* Saída Button */}
                          <button
                            type="button"
                            onClick={() => setMovementModal({
                              isOpen: true,
                              product,
                              type: 'saida',
                              quantity: 1,
                              reason: 'Venda de Balcão / Aplicação na Oficina',
                              responsible: 'Operador Balcão',
                            })}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                            title="Dar Saída no Estoque"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>

                          {/* Quick Quote trigger */}
                          {onSelectForQuote && (
                            <button
                              type="button"
                              onClick={() => onSelectForQuote(product)}
                              className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition font-bold"
                              title="Cotar no Balcão"
                            >
                              <Tag className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: MOVIMENTAÇÃO DE ENTRADA / SAÍDA */}
      {movementModal.isOpen && movementModal.product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-sky-100 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {movementModal.type === 'entrada' ? (
                  <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="text-base font-black text-slate-900">
                  {movementModal.type === 'entrada' ? 'Entrada Manual no Estoque' : 'Saída Manual do Estoque'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMovementModal({ ...movementModal, isOpen: false })}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <span className="font-mono font-bold text-sky-900 block">{movementModal.product.code}</span>
              <p className="font-extrabold text-slate-800 mt-0.5">{movementModal.product.name}</p>
              <div className="flex justify-between text-slate-500 mt-1">
                <span>Saldo Atual: <strong>{movementModal.product.stock} un</strong></span>
                <span>Locação: <strong>{movementModal.product.location.corridor}/{movementModal.product.location.box}</strong></span>
              </div>
            </div>

            <form onSubmit={handleConfirmMovement} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Quantidade a {movementModal.type === 'entrada' ? 'Adicionar (+)' : 'Subtrair (-)'} *
                </label>
                <input
                  type="number"
                  min="1"
                  max={movementModal.type === 'saida' ? movementModal.product.stock : 9999}
                  required
                  value={movementModal.quantity}
                  onChange={(e) => setMovementModal({ ...movementModal, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-center font-black text-base focus:ring-2 focus:ring-sky-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Motivo da Movimentação *
                </label>
                <select
                  value={movementModal.reason}
                  onChange={(e) => setMovementModal({ ...movementModal, reason: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                >
                  {movementModal.type === 'entrada' ? (
                    <>
                      <option value="Compra local avulsa sem NF">Compra local avulsa sem NF</option>
                      <option value="Devolução de cliente">Devolução de cliente</option>
                      <option value="Ajuste de inventário físico (+)">Ajuste de inventário físico (+)</option>
                      <option value="Transferência entre filiais">Transferência entre filiais</option>
                    </>
                  ) : (
                    <>
                      <option value="Venda Balcão">Venda Balcão</option>
                      <option value="Aplicação direta na oficina">Aplicação direta na oficina</option>
                      <option value="Peça danificada / Quebra / Avaria">Peça danificada / Quebra / Avaria</option>
                      <option value="Devolução ao Fornecedor">Devolução ao Fornecedor</option>
                      <option value="Ajuste de inventário físico (-)">Ajuste de inventário físico (-)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Responsável / Operador
                </label>
                <input
                  type="text"
                  value={movementModal.responsible}
                  onChange={(e) => setMovementModal({ ...movementModal, responsible: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setMovementModal({ ...movementModal, isOpen: false })}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-black rounded-xl shadow transition active:scale-95 ${
                    movementModal.type === 'entrada' 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirmar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER FOR SELECTED PART */}
      {selectedProduct && (
        <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 bg-white rounded-xl border border-sky-200 overflow-hidden shrink-0 flex items-center justify-center">
                {selectedProduct.imageUrl ? (
                  <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <Car className="w-8 h-8 text-sky-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-sky-600 text-white px-2 py-0.5 rounded">
                    {selectedProduct.code}
                  </span>
                  <span className="text-xs font-bold text-slate-700">OEM: {selectedProduct.oemCode}</span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    {selectedProduct.brand}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1">{selectedProduct.name}</h3>
                {userSession && (userSession.role === 'admin' || userSession.role === 'gerente') && (
                  <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">🔒 Gestão</span>
                    <span>Fornecedor: <strong>{selectedProduct.supplier}</strong> {selectedProduct.supplierCnpj && `(${selectedProduct.supplierCnpj})`}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
            >
              ✕
            </button>
          </div>

          {/* Applications list */}
          <div className="bg-white p-3.5 rounded-xl border border-sky-200 space-y-2 text-xs">
            <span className="font-extrabold text-sky-950 uppercase text-[10px] block">
              Aplicações Veiculares Detalhadas (Variações)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {(selectedProduct.applications && selectedProduct.applications.length > 0) ? (
                selectedProduct.applications.map((app) => (
                  <div key={app.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                    <p className="font-bold text-slate-900">{app.brand} {app.vehicle} ({app.yearRange})</p>
                    <p className="text-[11px] text-slate-600">
                      Motor: {app.engine} • Câmbio: {app.transmission}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                      <span className="bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-bold">Tração: {app.traction}</span>
                      <span className={`px-1.5 py-0.2 rounded font-bold ${app.airConditioning ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                        {app.airConditioning ? 'Com Ar Condicionado' : 'Sem Ar'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic text-xs py-2 col-span-2">
                  Nenhuma aplicação veicular cadastrada para esta peça.
                </p>
              )}
            </div>
          </div>

          {/* Gallery of up to 3 photos / attachments */}
          <div className="bg-white p-3.5 rounded-xl border border-sky-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-sky-950 uppercase text-[10px] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-600" />
                Fotos & Anexos Cadastrados (Até 3 Anexos)
              </span>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Zap className="w-2.5 h-2.5 text-emerald-600" />
                  WebP Otimizado
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  {(selectedProduct.attachments?.length || selectedProduct.images?.length || (selectedProduct.imageUrl ? 1 : 0))} anexo(s)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              {[0, 1, 2].map((idx) => {
                const att = selectedProduct.attachments?.[idx];
                const imgUrl = att?.url || selectedProduct.images?.[idx] || (idx === 0 ? selectedProduct.imageUrl : null);
                const slotTitle = idx === 0 
                  ? 'Slot 1: Foto Principal' 
                  : idx === 1 
                  ? 'Slot 2: Etiqueta / OEM' 
                  : 'Slot 3: Detalhe Técnico';
                const tagLabel = att?.tag === 'principal' 
                  ? 'Principal' 
                  : att?.tag === 'etiqueta' 
                  ? 'Etiqueta / OEM' 
                  : att?.tag === 'detalhe' 
                  ? 'Detalhe Técnico' 
                  : att?.tag === 'aplicacao' 
                  ? 'Aplicação' 
                  : (idx === 0 ? 'Principal' : `Anexo ${idx + 1}`);

                if (imgUrl) {
                  const isWebp = imgUrl.startsWith('data:image/webp') || att?.name?.toLowerCase().endsWith('.webp') || imgUrl.includes('.webp');
                  return (
                    <div 
                      key={idx}
                      className="group relative rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex flex-col cursor-pointer shadow-xs hover:shadow-md transition"
                      onClick={() => setPreviewZoomUrl(imgUrl)}
                    >
                      <div className="relative h-28 bg-slate-100 flex items-center justify-center overflow-hidden">
                        <img 
                          src={imgUrl} 
                          alt={`${selectedProduct.name} - ${slotTitle}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                          <span className="bg-[#0C4A6E] text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded shadow-xs">
                            {tagLabel}
                          </span>
                          {isWebp && (
                            <span className="bg-emerald-600 text-white text-[8px] font-black uppercase px-1 py-0.5 rounded shadow-xs">
                              WebP
                            </span>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <span className="p-1.5 bg-white rounded-lg text-slate-800 shadow">
                            <Maximize2 className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                      <div className="p-2 bg-white flex items-center justify-between text-[10px]">
                        <div className="truncate pr-1">
                          <span className="font-bold text-slate-700 truncate block">{att?.name || slotTitle}</span>
                          {att?.size ? (
                            <span className="text-[9px] text-emerald-600 font-semibold">{formatImageSize(att.size)}</span>
                          ) : (
                            <span className="text-[9px] text-slate-400">Armazenamento ultraleve</span>
                          )}
                        </div>
                        <span className="text-sky-600 font-bold hover:underline flex items-center gap-0.5 shrink-0">
                          Ampliar
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={idx}
                    className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 flex flex-col items-center justify-center text-center text-slate-400 min-h-[120px]"
                  >
                    <ImageIcon className="w-5 h-5 mb-1 text-slate-300" />
                    <span className="text-[11px] font-bold text-slate-500">{slotTitle}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Sem anexo cadastrado</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Cadastro Completo de Peça com Fotos */}
      <CadastroPecaModal
        isOpen={isCadastroModalOpen}
        onClose={() => setIsCadastroModalOpen(false)}
        onShowNotification={onShowNotification}
        onSaveProduct={(p) => {
          if (onAddNewProduct) {
            onAddNewProduct(p);
          } else {
            onUpdateProducts([p, ...products]);
          }
          setSelectedProduct(p);
          onShowNotification(
            'Peça Cadastrada com Sucesso!',
            `${p.code} - ${p.name} cadastrado com ${p.attachments?.length || 1} anexo(s).`,
            'success'
          );
        }}
      />

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
                Visualização da Foto / Anexo da Peça
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
                alt="Foto ampliada"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: IMPRESSÃO DE ETIQUETAS DE CÓDIGO DE BARRAS */}
      {/* ======================================================== */}
      {isEtiquetasModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-sky-50 text-[#0284C7] flex items-center justify-center font-bold">
                  <Printer className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Gerador & Impressor de Etiquetas</h3>
                  <p className="text-xs text-slate-500">Impressão térmica (Zebra/Argox) ou padrão gôndola de prateleira</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEtiquetasModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Configurações da Etiqueta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Selecione a Peça</label>
                <select
                  value={selectedEtiquetaProduct?.id || ''}
                  onChange={(e) => {
                    const p = products.find((prod) => prod.id === e.target.value);
                    setSelectedEtiquetaProduct(p || null);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name.slice(0, 32)}...
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Modelo da Etiqueta</label>
                <select
                  value={etiquetaTipo}
                  onChange={(e) => setEtiquetaTipo(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  <option value="gondola">Gôndola / Prateleira (Preço Grande)</option>
                  <option value="adesiva">Adesiva de Peça (Compacta)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Qtd. de Etiquetas</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={etiquetaCopias}
                  onChange={(e) => setEtiquetaCopias(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                />
              </div>
            </div>

            {/* Preview Visual das Etiquetas */}
            {selectedEtiquetaProduct && (
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block">
                  Pré-visualização da Etiqueta:
                </span>
                <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 flex flex-wrap gap-3 justify-center">
                  {Array.from({ length: Math.min(etiquetaCopias, 4) }).map((_, i) => (
                    <div
                      key={i}
                      className={`bg-white border-2 border-dashed border-slate-300 rounded-lg p-3 shadow-xs flex flex-col justify-between ${
                        etiquetaTipo === 'gondola' ? 'w-64 h-36' : 'w-52 h-28'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                          <span>{selectedEtiquetaProduct.brand.toUpperCase()}</span>
                          <span className="text-[9px] bg-slate-100 px-1 py-0.2 rounded">
                            {selectedEtiquetaProduct.location.corridor}-{selectedEtiquetaProduct.location.box}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-900 text-xs line-clamp-2 leading-tight mt-0.5">
                          {selectedEtiquetaProduct.name}
                        </h4>
                        <p className="text-[10px] text-slate-600 font-mono">
                          Cód: <strong>{selectedEtiquetaProduct.code}</strong> | OEM: {selectedEtiquetaProduct.oemCode}
                        </p>
                      </div>

                      <div className="mt-2 flex items-end justify-between border-t border-slate-100 pt-1">
                        {/* Simulação Gráfica do Código de Barras */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-[1.5px] h-6">
                            {[2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 2].map((w, idx) => (
                              <div
                                key={idx}
                                className="bg-black h-full"
                                style={{ width: `${w}px` }}
                              />
                            ))}
                          </div>
                          <span className="text-[8px] font-mono text-slate-600 tracking-wider block">
                            {selectedEtiquetaProduct.barcode || '7891234567890'}
                          </span>
                        </div>

                        {etiquetaTipo === 'gondola' && (
                          <div className="text-right">
                            <span className="text-[8px] text-slate-400 block font-semibold">PREÇO</span>
                            <span className="text-sm font-black text-slate-950">
                              R$ {selectedEtiquetaProduct.sellingPrice.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ações de Impressão */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="text-xs text-slate-500">
                Total de {etiquetaCopias} etiqueta(s) configurada(s) para impressão térmica.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEtiquetasModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    onShowNotification('Impressão Enviada', `Imprimindo ${etiquetaCopias} etiquetas para a impressora configurada.`, 'success');
                  }}
                  className="px-5 py-2 bg-[#0C4A6E] hover:bg-[#075985] text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Etiquetas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: INVENTÁRIO FÍSICO & BALANÇO DE ESTOQUE */}
      {/* ======================================================== */}
      {isInventarioModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[92vh] flex flex-col justify-between">
            <div className="space-y-4">
              {/* Header do Inventário */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    <ClipboardCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Inventário Físico & Balanço de Peças
                    </h3>
                    <p className="text-xs text-slate-500">
                      Conferência cega e automática via leitor de código de barras com apuração de divergências
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInventarioModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Barra de Bipagem Rápida */}
              <form onSubmit={handleBiparInventario} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    value={barcodeSearchInput}
                    onChange={(e) => setBarcodeSearchInput(e.target.value)}
                    placeholder="Bipe o código de barras ou digite o código/OEM da peça para somar +1 contagem..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Registrar Bip</span>
                </button>
              </form>

              {/* Tabela de Contagem */}
              <div className="overflow-y-auto max-h-[48vh] border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3">Código / Peça</th>
                      <th className="px-3 py-3">Localização</th>
                      <th className="px-3 py-3 text-center">Estoque Sistema</th>
                      <th className="px-3 py-3 text-center">Contagem Física</th>
                      <th className="px-3 py-3 text-center">Divergência</th>
                      <th className="px-3 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {inventoryItems.map((item) => {
                      const hasDiff = item.diff !== 0;
                      return (
                        <tr key={item.productId} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-2.5">
                            <strong className="text-slate-900 block font-bold truncate max-w-xs">{item.name}</strong>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Cód: {item.code} | OEM: {item.oemCode} | {item.barcode}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {item.location}
                          </td>
                          <td className="px-3 py-2.5 text-center font-bold text-slate-700">
                            {item.systemStock} un
                          </td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateCountedStock(item.productId, item.countedStock - 1)}
                                className="w-5 h-5 rounded-sm bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={item.countedStock}
                                onChange={(e) => handleUpdateCountedStock(item.productId, parseInt(e.target.value) || 0)}
                                className="w-12 text-center py-0.5 border border-slate-200 rounded-md font-black text-slate-900 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateCountedStock(item.productId, item.countedStock + 1)}
                                className="w-5 h-5 rounded-sm bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center font-black">
                            {item.diff === 0 ? (
                              <span className="text-slate-400">0</span>
                            ) : item.diff > 0 ? (
                              <span className="text-emerald-600">+{item.diff} (Sobra)</span>
                            ) : (
                              <span className="text-rose-600">{item.diff} (Falta)</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {hasDiff ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                                DIVERGENTE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                                CONFERIDO
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rodapé e Botão de Aplicar Ajuste */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <div className="text-xs text-slate-600">
                Divergências apuradas:{' '}
                <strong>
                  {inventoryItems.filter((i) => i.diff !== 0).length} produto(s) com diferença
                </strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsInventarioModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplyInventoryAdjustments}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ajustar Estoque Automaticamente</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
