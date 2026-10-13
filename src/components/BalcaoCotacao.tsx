import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Printer,
  Edit3,
  FileText,
  DollarSign, 
  User, 
  Car, 
  MapPin, 
  Tag, 
  ShoppingBag, 
  ChevronRight, 
  Image as ImageIcon, 
  Save, 
  CheckCircle2, 
  Building2, 
  Camera, 
  Maximize2, 
  X,
  AlertTriangle,
  ShoppingCart,
  SlidersHorizontal,
  ChevronDown,
  Clock,
  ArrowRight,
  Calculator,
  Layers,
  Sparkles,
  Check,
  MessageCircle,
  Copy
} from 'lucide-react';
import { Product, Customer, QuoteItem, CustomerType, StateTaxConfig, Quote, BranchUnit, UserSession, VehicleFleetItem, VehicleFleetSegment } from '../types';
import { STATE_TAX_TABLE, INITIAL_BRANCHES } from '../data/initialData';
import {
  BRAZILIAN_FLEET_DATABASE,
  getDistinctFleetMakes,
  getDistinctFleetSegments,
  getMakesBySegment,
  getModelsBySegmentAndMake,
  getModelsByFleetMake,
  getIndividualFleetVehicleModels,
  getAvailableYearsForSelection,
  getEnginesForSelection,
  queryPartsByVehicleApplication
} from '../data/fleetDatabase';
import { CadastroPecaModal } from './CadastroPecaModal';
import { CupomFiscalModal } from './CupomFiscalModal';
import { ImprimirOrcamentoSeletor } from './ImprimirOrcamentoSeletor';
import {
  buildOrcamentoResumo,
} from '../utils/quoteMarketingSync';
import { copyTextToClipboard } from '../utils/clipboard';

interface VehicleData {
  plate: string;
  model: string;
  year: string;
  engine: string;
  chassis: string;
  km: string;
}

interface BalcaoCotacaoProps {
  products: Product[];
  customers: Customer[];
  initialCustomer?: Customer | null;
  initialFleetVehicle?: VehicleFleetItem | null;
  initialProduct?: Product | null;
  activeStore?: string;
  userSession?: UserSession | null;
  onSelectStore?: (storeId: string) => void;
  onAddNewProduct: (product: Product) => void;
  onEmitNfeFromQuote: (quoteData: any) => void;
  onSaveQuote?: (quote: Quote) => void;
  /** Recarrega as listas do banco depois de uma escrita (cadastro de produto). */
  onReloadEntities?: () => Promise<void>;
  /** Orçamento que veio de "Alterar" na tela de Orçamentos — hidrata o carrinho. */
  initialQuote?: Quote | null;
  /** Grava a alteração de um orçamento já existente (PUT, não cria outro). */
  onUpdateQuote?: (quote: Quote) => void;
  /** Chamado depois de consumir o `initialQuote`, para o App limpar o estado. */
  onEditQuoteConsumed?: () => void;
  onNavigateToFleet?: () => void;
  onNavigateToPartsApplication?: () => void;
  onNavigateToNfe?: () => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const BalcaoCotacao: React.FC<BalcaoCotacaoProps> = ({
  products,
  customers,
  initialCustomer,
  initialFleetVehicle,
  initialProduct,
  activeStore = 'matriz-ms',
  userSession,
  onSelectStore,
  onAddNewProduct,
  onEmitNfeFromQuote,
  onSaveQuote,
  onReloadEntities,
  initialQuote,
  onUpdateQuote,
  onEditQuoteConsumed,
  onNavigateToFleet,
  onNavigateToPartsApplication,
  onNavigateToNfe,
  onShowNotification,
}) => {
  // Search & Filter State (as shown in the POS screenshot)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('Todos os grupos');
  const [plateFilter, setPlateFilter] = useState<string>('');
  
  // Selected Product for Preview (Defaults to row 29 - RETENTOR CUBO TRASEIRO 1113 if available, or first item)
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    const ret1113 = products.find(p => p.name.includes('RETENTOR CUBO TRASEIRO 1113') || p.code === '29');
    return ret1113 ? ret1113.id : products[0]?.id || '';
  });

  // Client Selection State
  const defaultCustomer = useMemo(() => {
    return initialCustomer || 
      customers.find(c => c.name.includes('MARQUES TRANSPORTES')) || 
      customers[0] || {
        id: 'cust-marques',
        name: 'MARQUES TRANSPORTES LTDA',
        type: 'frotista' as CustomerType,
        document: '08.492.119/0001-72',
        phone: '(67) 3384-9000',
        email: 'frotas@marquestransportes.com.br',
        city: 'Campo Grande',
        uf: 'MS',
        discountRate: 20,
        address: 'Av. Gury Marques, 4520 - Campo Grande/MS',
        creditLimit: 120000.00,
        createdAt: '2026-01-05T08:00:00Z',
      };
  }, [initialCustomer, customers]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(defaultCustomer.id);
  const currentCustomer = customers.find(c => c.id === selectedCustomerId) || defaultCustomer;

  // Vehicle data state
  const [vehicleData, setVehicleData] = useState<VehicleData>({
    plate: 'ABC-1234',
    model: 'MB 1113 / 1313 Caçamba',
    year: '1984',
    engine: 'OM-352 Diesel',
    chassis: '9BM345012KB12984',
    km: '384.200',
  });

  // Sync with selected fleet vehicle if passed from Fleet Management Grid
  useEffect(() => {
    if (initialFleetVehicle) {
      setVehicleData({
        plate: initialFleetVehicle.veiculo,
        model: `${initialFleetVehicle.montadora} ${initialFleetVehicle.modelo}`,
        year: String(initialFleetVehicle.ano),
        engine: initialFleetVehicle.motor || '',
        chassis: initialFleetVehicle.chassi || initialFleetVehicle.veiculo,
        km: initialFleetVehicle.kmAtual ? String(initialFleetVehicle.kmAtual) : '0',
      });
      setPlateFilter(initialFleetVehicle.veiculo);
      setSearchTerm(initialFleetVehicle.modelo);
    }
  }, [initialFleetVehicle]);

  // Seller operator
  const sellerName = userSession?.name || 'CLAUDIMAR';

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<string>('Dinheiro');

  // Origin Branch & Tax Destination
  const [selectedOriginBranchId, setSelectedOriginBranchId] = useState<string>(activeStore || 'matriz-ms');
  const activeBranch = INITIAL_BRANCHES.find(b => b.id === selectedOriginBranchId) || INITIAL_BRANCHES[0];
  const originUf = activeBranch.uf; // 'MS' by default
  const [selectedUf, setSelectedUf] = useState<string>(currentCustomer.uf || 'MS');
  const [selectedCustomerType, setSelectedCustomerType] = useState<CustomerType>(currentCustomer.type || 'frotista');

  // Pricing overrides & quantity for preview
  const [markupOverride, setMarkupOverride] = useState<number>(54);
  const [transportCostOverride, setTransportCostOverride] = useState<number>(5.50);
  const [additionalDiscount, setAdditionalDiscount] = useState<number>(0);
  const [quoteQuantity, setQuoteQuantity] = useState<number>(1);

  // Quote / DAV Cart Items
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [quoteFreightCost, setQuoteFreightCost] = useState<number>(0);

  // Modals & Panels
  const [showTrocarClienteModal, setShowTrocarClienteModal] = useState(false);
  const [showDadosVeiculoModal, setShowDadosVeiculoModal] = useState(false);
  const [showPendenciasModal, setShowPendenciasModal] = useState(false);
  const [showDocumentoDavModal, setShowDocumentoDavModal] = useState(false);
  const [showNewPartModal, setShowNewPartModal] = useState(false);
  const [showFiscalConfigPanel, setShowFiscalConfigPanel] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showFaturamentoModal, setShowFaturamentoModal] = useState(false);
  const [showQuickVehicleModal, setShowQuickVehicleModal] = useState(false);
  const [photoZoomUrl, setPhotoZoomUrl] = useState<string | null>(null);

  // Quick Vehicle Application Filter State inside Balcão
  // Segmento é o primeiro nível da cascata (o balcão pensa "é caminhão ou é
  // carro?" antes de "qual montadora?"). Os segmentos vêm do DADO.
  const [quickSegment, setQuickSegment] = useState<VehicleFleetSegment | 'todos'>('todos');
  const [quickMake, setQuickMake] = useState<string>('');
  const [quickVehicleName, setQuickVehicleName] = useState<string>('');
  const [quickModelId, setQuickModelId] = useState<string>('');
  const [quickYear, setQuickYear] = useState<string>('');
  const [quickEngine, setQuickEngine] = useState<string>('');
  const [quickSearchTerm, setQuickSearchTerm] = useState<string>('');
  const [showVehicleApplicationFilters, setShowVehicleApplicationFilters] = useState(true);

  const quickSegmentsList = useMemo(() => getDistinctFleetSegments(), []);
  const quickMakesList = useMemo(() => getMakesBySegment(quickSegment), [quickSegment]);
  const quickModelsList = useMemo(() => {
    if (!quickMake) return [];
    return getModelsBySegmentAndMake(quickSegment, quickMake);
  }, [quickSegment, quickMake]);
  const quickVehicleOptions = useMemo(
    () => quickModelsList.flatMap((model) =>
      getIndividualFleetVehicleModels(model).map((vehicleName) => ({
        key: `${model.id}::${vehicleName}`,
        vehicleName,
        model,
      }))
    ),
    [quickModelsList]
  );
  const quickVehiclesList = useMemo(
    () => [...new Set(quickVehicleOptions.map((option) => option.vehicleName))]
      .sort((a, b) => a.localeCompare(b)),
    [quickVehicleOptions]
  );
  const quickVehicleModelOptions = useMemo(
    () => [...new Map(
      quickVehicleOptions
        .filter((option) => option.vehicleName === quickVehicleName)
        .map((option) => [option.model.id, option.model])
    ).values()],
    [quickVehicleOptions, quickVehicleName]
  );
  const quickYearsList = useMemo(() => {
    return getAvailableYearsForSelection(quickModelId);
  }, [quickModelId]);
  const quickEnginesList = useMemo(() => {
    return getEnginesForSelection(quickModelId);
  }, [quickModelId]);
  const vehicleApplicationFilterActive = Boolean(
    quickMake || quickVehicleName || quickModelId || quickYear || quickEngine || quickSegment !== 'todos'
  );
  const vehicleApplicationProductIds = useMemo(() => {
    if (!vehicleApplicationFilterActive) return null;

    const makesToSearch = quickMake
      ? [quickMake]
      : getMakesBySegment(quickSegment);
    const matches = makesToSearch.flatMap((montadora) =>
      queryPartsByVehicleApplication(products, {
        montadora,
        modeloId: quickModelId,
        modeloTexto: quickVehicleName,
        ano: quickYear ? parseInt(quickYear, 10) : undefined,
        motor: quickEngine,
        sistema: 'todos',
      })
    );
    return new Set(matches.map((match) => match.product.id));
  }, [products, quickMake, quickVehicleName, quickModelId, quickYear, quickEngine, quickSegment, vehicleApplicationFilterActive]);
  const quickCompatibleParts = useMemo(() => {
    if (!vehicleApplicationFilterActive && !quickSearchTerm.trim()) {
      return products.slice(0, 10);
    }
    const makesToSearch = quickMake
      ? [quickMake]
      : quickSegment !== 'todos'
        ? getMakesBySegment(quickSegment)
        : [''];
    const matches = makesToSearch.flatMap((montadora) =>
      queryPartsByVehicleApplication(products, {
        montadora,
        modeloId: quickModelId,
        modeloTexto: quickVehicleName,
        ano: quickYear ? parseInt(quickYear, 10) : undefined,
        motor: quickEngine,
        sistema: 'todos',
        termoBusca: quickSearchTerm,
      })
    );
    const uniqueMatches = new Map(matches.map((match) => [match.product.id, match]));
    return [...uniqueMatches.values()]
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((match) => match.product)
      .slice(0, 20);
  }, [products, quickMake, quickVehicleName, quickModelId, quickYear, quickEngine, quickSegment, quickSearchTerm, vehicleApplicationFilterActive]);

  const clearVehicleApplicationFilters = () => {
    setQuickSegment('todos');
    setQuickMake('');
    setQuickVehicleName('');
    setQuickModelId('');
    setQuickYear('');
    setQuickEngine('');
    setQuickSearchTerm('');
  };

  // Pending DAV mock list
  const [pendingDavs, setPendingDavs] = useState<{ id: string; number: string; client: string; items: number; total: number; time: string }[]>([
    { id: 'dav-01', number: 'DAV-4891', client: 'MARQUES TRANSPORTES LTDA', items: 2, total: 226.12, time: '14:20' },
    { id: 'dav-02', number: 'DAV-4889', client: 'MECANICA PANTANAL', items: 1, total: 320.00, time: '11:45' },
    { id: 'dav-03', number: 'DAV-4885', client: 'AUTO ELETRICA DO GORDO', items: 4, total: 840.50, time: '09:15' },
  ]);

  // Orçamento / Cupom & WhatsApp Modal State
  const [cupomQuote, setCupomQuote] = useState<Quote | null>(null);
  const [isCupomModalOpen, setIsCupomModalOpen] = useState<boolean>(false);

  // Número do DAV corrente — alimenta o modal DOCUMENTO e a impressão do orçamento.
  // Fica `null` enquanto nada foi salvo (aí o documento sai como pré-visualização).
  const [currentDavNumber, setCurrentDavNumber] = useState<string | null>(null);
  /**
   * Orçamento salvo que está sendo ALTERADO no balcão (veio de "Alterar" na tela
   * de Orçamentos). Enquanto ele existe, salvar grava por cima — mesmo id e
   * mesmo número — em vez de criar outro DAV.
   */
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  // Hidrata o carrinho com o orçamento que veio para alteração. O cliente só é
  // trocado se ele existir na lista atual: se o cadastro saiu da lista, o
  // vínculo do banco permanece (o PUT não mexe em cliente sem cliente novo).
  useEffect(() => {
    if (!initialQuote) return;
    setEditingQuote(initialQuote);
    setQuoteItems(initialQuote.items || []);
    setCurrentDavNumber(initialQuote.quoteNumber);
    if (initialQuote.paymentCondition) setPaymentMethod(initialQuote.paymentCondition);
    if (customers.some((c) => c.id === initialQuote.customerId)) {
      setSelectedCustomerId(initialQuote.customerId);
    }
    setVehicleData((v) => ({
      ...v,
      plate: initialQuote.vehiclePlate || v.plate,
      model: initialQuote.vehicleModel || v.model,
    }));
    onShowNotification(
      'Orçamento em Alteração',
      `${initialQuote.quoteNumber} carregado no balcão. Salvar grava por cima do orçamento atual.`,
      'info'
    );
    if (onEditQuoteConsumed) onEditQuoteConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuote?.id]);
  const [copiedDavSummary, setCopiedDavSummary] = useState(false);

  // Sync with initialCustomer or activeStore if updated from outside
  useEffect(() => {
    if (initialCustomer) {
      setSelectedCustomerId(initialCustomer.id);
      setSelectedUf(initialCustomer.uf || 'MS');
      setSelectedCustomerType(initialCustomer.type || 'consumidor');
    }
  }, [initialCustomer]);

  // Sync with initialProduct if navigated from Consulta & Aplicação de Peças
  useEffect(() => {
    if (initialProduct) {
      setSelectedProductId(initialProduct.id);
      onShowNotification(
        'Item Vinculado no Balcão',
        `Peça ${initialProduct.code} - ${initialProduct.name} pronta para o orçamento.`,
        'info'
      );
    }
  }, [initialProduct]);

  useEffect(() => {
    if (activeStore) {
      setSelectedOriginBranchId(activeStore);
    }
  }, [activeStore]);

  // Active Product calculation
  const activeProduct = useMemo(() => {
    return products.find(p => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  useEffect(() => {
    if (activeProduct) {
      setMarkupOverride(activeProduct.markupPercent || 50);
      setTransportCostOverride(activeProduct.transportCost || 5);
      setQuoteQuantity(1);
    }
  }, [activeProduct?.id]);

  // State Tax & Pricing Logic
  const stateTax = STATE_TAX_TABLE.find(t => t.uf === selectedUf) || STATE_TAX_TABLE[0];
  const unitCost = activeProduct ? activeProduct.unitCost : 100;
  const transportCost = transportCostOverride;
  const totalBaseCost = unitCost + transportCost;
  const subtotalWithMarkup = totalBaseCost * (1 + markupOverride / 100);

  const isInterstate = selectedUf !== originUf;
  const stateTaxFactor = isInterstate ? 1 + (stateTax.difalAliquota / 100) : 1;
  const priceBeforeDiscount = subtotalWithMarkup * stateTaxFactor;

  const customerDiscountTier = 
    currentCustomer && currentCustomer.discountRate !== undefined && currentCustomer.discountRate > 0
      ? currentCustomer.discountRate
      : selectedCustomerType === 'frotista'
        ? 22
        : selectedCustomerType === 'mecanica'
          ? 15
          : selectedCustomerType === 'cliente_fiel'
            ? 8
            : 0;

  const totalDiscountPercent = Math.min(60, customerDiscountTier + additionalDiscount);
  const discountAmount = priceBeforeDiscount * (totalDiscountPercent / 100);
  const finalUnitPrice = activeProduct?.sellingPrice 
    ? activeProduct.sellingPrice 
    : Math.max(unitCost * 1.05, priceBeforeDiscount - discountAmount);

  // Filtered Products based on Search Input, Group and Plate
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Produto inativado não se vende: sai do balcão (segue no histórico).
      if (p.active === false) return false;
      if (vehicleApplicationProductIds && !vehicleApplicationProductIds.has(p.id)) return false;
      const term = searchTerm.trim().toLowerCase();
      const matchesTerm = !term || (
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        p.oemCode.toLowerCase().includes(term) ||
        p.brand.toLowerCase().includes(term) ||
        p.similarCodes?.some(s => s.toLowerCase().includes(term)) ||
        p.applications.some(a => 
          a.vehicle.toLowerCase().includes(term) || 
          a.brand.toLowerCase().includes(term) ||
          a.engine.toLowerCase().includes(term)
        )
      );

      const matchesGroup = selectedGroup === 'Todos os grupos' || 
        (selectedGroup === 'Retentores & Vedação' && (p.name.toLowerCase().includes('retentor') || p.category === 'caminhao')) ||
        (selectedGroup === 'Rolamentos' && p.name.toLowerCase().includes('rolamento')) ||
        (selectedGroup === 'Suspensão' && (p.name.toLowerCase().includes('amortecedor') || p.name.toLowerCase().includes('mola'))) ||
        (selectedGroup === 'Filtros' && p.name.toLowerCase().includes('filtro')) ||
        (selectedGroup === 'Motor' && (p.name.toLowerCase().includes('valvula') || p.name.toLowerCase().includes('motor')));

      const matchesPlate = !plateFilter.trim() || 
        p.applications.some(a => a.vehicle.toLowerCase().includes(vehicleData.model.toLowerCase().split(' ')[0]));

      return matchesTerm && matchesGroup && matchesPlate;
    });
  }, [products, searchTerm, selectedGroup, plateFilter, vehicleData.model, vehicleApplicationProductIds]);

  // Cart Calculations
  const quoteSubtotal = quoteItems.reduce((acc, it) => acc + it.total, 0);
  const quoteTotal = quoteSubtotal + quoteFreightCost;

  // Add selected item to DAV
  const handleAddToDav = (productToAdd?: Product, qty = quoteQuantity) => {
    const prod = productToAdd || activeProduct;
    if (!prod) return;

    const unitPrice = prod.sellingPrice || finalUnitPrice;
    const locationString = `${prod.location.corridor}-${prod.location.shelf}-${prod.location.box}`;

    const existingIndex = quoteItems.findIndex(it => it.productId === prod.id);
    if (existingIndex >= 0) {
      const updated = [...quoteItems];
      updated[existingIndex].quantity += qty;
      updated[existingIndex].total = parseFloat((updated[existingIndex].quantity * updated[existingIndex].finalUnitPrice).toFixed(2));
      setQuoteItems(updated);
    } else {
      const newItem: QuoteItem = {
        productId: prod.id,
        productName: prod.name,
        productCode: prod.code,
        brand: prod.brand,
        quantity: qty,
        costPrice: prod.unitCost,
        basePrice: unitPrice,
        discountPercent: totalDiscountPercent,
        finalUnitPrice: parseFloat(unitPrice.toFixed(2)),
        total: parseFloat((unitPrice * qty).toFixed(2)),
        locationStr: locationString,
      };
      setQuoteItems(prev => [...prev, newItem]);
    }

    onShowNotification(
      'Item Adicionado ao DAV',
      `${qty}x ${prod.name} incluído a R$ ${unitPrice.toFixed(2)}`,
      'success'
    );
  };

  const handleRemoveItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const handleResetDav = () => {
    if (quoteItems.length > 0) {
      if (window.confirm('Deseja realmente iniciar um Novo DAV e limpar os itens atuais?')) {
        setQuoteItems([]);
        setQuoteFreightCost(0);
        onShowNotification('Novo DAV Iniciado', 'Carrinho de atendimento balcão reiniciado.', 'info');
      }
    } else {
      onShowNotification('Novo DAV Pronto', 'Atendimento pronto para novas peças.', 'info');
    }
  };

  /**
   * Monta o `Quote` do DAV a partir do estado atual do balcão.
   * Centraliza a montagem que antes estava duplicada em `handleSaveDav` e `handleEmitCupomFiscal`.
   */
  const buildDavQuote = (numero: string, status: Quote['status']): Quote => ({
    id: `quot-${Date.now()}`,
    quoteNumber: numero,
    customerId: currentCustomer.id,
    customerName: currentCustomer.name,
    customerDocument: currentCustomer.document,
    customerType: selectedCustomerType,
    customerUf: selectedUf,
    customerPhone: currentCustomer.phone,
    customerWhatsapp: currentCustomer.whatsapp || currentCustomer.phone,
    customerEmail: currentCustomer.email,
    vehicleModel: vehicleData.model || undefined,
    vehiclePlate: vehicleData.plate || undefined,
    sellerName,
    paymentCondition: paymentMethod,
    items: quoteItems,
    subtotalAmount: parseFloat(quoteSubtotal.toFixed(2)),
    discountAmount: parseFloat(((quoteSubtotal * (totalDiscountPercent / 100))).toFixed(2)),
    totalAmount: parseFloat(quoteTotal.toFixed(2)),
    taxAmount: parseFloat((quoteTotal * (stateTax.icmsAliquota / 100)).toFixed(2)),
    status,
    validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    notes: `Vendedor: ${sellerName} • Veículo: ${vehicleData.plate} (${vehicleData.model}) • Pagamento: ${paymentMethod}`,
  });

  // A impressão do DAV saiu daqui para o `ImprimirOrcamentoSeletor`: o mesmo
  // botão oferece o cupom térmico (80mm) e a tabela A4, e a guarda de
  // "orçamento vazio" e o aviso de pop-up bloqueado vivem num lugar só.

  /** Copia o resumo curto do DAV corrente (número, cliente, itens, total e validade). */
  const handleCopyOrcamentoResumo = () => {
    if (quoteItems.length === 0) {
      onShowNotification('Orçamento Vazio', 'Adicione pelo menos um item antes de copiar.', 'warning');
      return;
    }

    void copyTextToClipboard(
      buildOrcamentoResumo(buildDavQuote(currentDavNumber ?? 'PRÉ-VISUALIZAÇÃO', 'Pendente'))
    ).then((ok) => {
      if (!ok) {
        onShowNotification('Não foi possível copiar', 'Use a impressão do orçamento para obter o resumo.', 'warning');
        return;
      }
      setCopiedDavSummary(true);
      setTimeout(() => setCopiedDavSummary(false), 2500);
      onShowNotification(
        'Resumo Copiado!',
        'Número, cliente, quantidade de itens, total e validade na área de transferência.',
        'success'
      );
    });
  };

  const handleSaveDav = (status: 'Pendente' | 'Aprovado' = 'Pendente') => {
    if (quoteItems.length === 0) {
      onShowNotification('DAV Vazio', 'Adicione pelo menos um item antes de salvar.', 'warning');
      return;
    }

    const davNumber = editingQuote
      ? editingQuote.quoteNumber
      : `DAV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newQuote = editingQuote
      ? { ...buildDavQuote(davNumber, status), id: editingQuote.id }
      : buildDavQuote(davNumber, status);
    setCurrentDavNumber(davNumber);

    if (editingQuote && onUpdateQuote) {
      // Alterar um orçamento que já existe: mantém id e número, troca o conteúdo.
      onUpdateQuote(newQuote);
      setEditingQuote(null);
    } else if (onSaveQuote) {
      onSaveQuote(newQuote);
    }

    if (!editingQuote) {
      setPendingDavs(prev => [
        {
          id: newQuote.id,
          number: newQuote.quoteNumber,
          client: currentCustomer.name,
          items: quoteItems.length,
          total: quoteTotal,
          time: new Date().toLocaleTimeString().slice(0, 5),
        },
        ...prev
      ]);
    }

    onShowNotification(
      editingQuote ? 'Orçamento Alterado!' : 'DAV Registrado com Sucesso!',
      `${davNumber} ${editingQuote ? 'atualizado' : `salvo para ${currentCustomer.name}`}.`,
      'success'
    );
  };

  const handleEmitCupomFiscal = (existingDav?: { id: string; number: string; client: string; total: number }) => {
    if (existingDav) {
      const q: Quote = {
        id: existingDav.id,
        quoteNumber: existingDav.number,
        customerId: currentCustomer.id,
        customerName: existingDav.client,
        customerDocument: currentCustomer.document,
        customerType: selectedCustomerType,
        customerUf: selectedUf,
        customerPhone: currentCustomer.phone,
        customerWhatsapp: currentCustomer.whatsapp || currentCustomer.phone,
        customerEmail: currentCustomer.email,
        vehicleModel: vehicleData.model || undefined,
        vehiclePlate: vehicleData.plate || undefined,
        sellerName,
        paymentCondition: paymentMethod,
        items: quoteItems.length > 0 ? quoteItems : [
          {
            productId: 'p-1',
            productName: 'Kit de Peças e Componentes Automotivos',
            productCode: 'PEC-BALCAO',
            brand: 'Original / Reposição',
            quantity: 1,
            costPrice: existingDav.total * 0.65,
            basePrice: existingDav.total,
            discountPercent: 0,
            finalUnitPrice: existingDav.total,
            total: existingDav.total,
            locationStr: 'Balcão Central'
          }
        ],
        subtotalAmount: existingDav.total,
        discountAmount: 0,
        totalAmount: existingDav.total,
        taxAmount: parseFloat((existingDav.total * 0.17).toFixed(2)),
        status: 'Pendente',
        validUntil: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        notes: `DAV ${existingDav.number} recuperado para emissão do orçamento e envio WhatsApp.`
      };

      setCurrentDavNumber(existingDav.number);
      setCupomQuote(q);
      setIsCupomModalOpen(true);
      return;
    }

    if (quoteItems.length === 0) {
      onShowNotification('Cotação Vazia', 'Adicione itens à cotação antes de gerar o orçamento.', 'warning');
      return;
    }

    const davNumber = `DAV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newQuote = buildDavQuote(davNumber, 'Pendente');
    setCurrentDavNumber(davNumber);

    if (onSaveQuote) {
      onSaveQuote(newQuote);
    }

    setPendingDavs(prev => [
      {
        id: newQuote.id,
        number: newQuote.quoteNumber,
        client: currentCustomer.name,
        items: quoteItems.length,
        total: quoteTotal,
        time: new Date().toLocaleTimeString().slice(0, 5),
      },
      ...prev
    ]);

    setCupomQuote(newQuote);
    setIsCupomModalOpen(true);

    onShowNotification(
      'Orçamento Gerado!',
      `${davNumber} pronto para impressão térmica 80mm, cópia do resumo e envio WhatsApp. Lead indexado para campanhas!`,
      'success'
    );
  };

  const handleEmitNfe = () => {
    if (quoteItems.length === 0) {
      onShowNotification('DAV Vazio', 'Inclua ao menos um produto para emitir a NF-e.', 'warning');
      return;
    }

    onEmitNfeFromQuote({
      customer: currentCustomer,
      items: quoteItems,
      totalAmount: quoteTotal,
      channel: 'balcao',
      paymentMethod,
      vehicle: vehicleData,
      seller: sellerName,
    });
  };

  return (
    <div className="space-y-3 font-['Plus_Jakarta_Sans'] text-slate-800" id="view-pesquisa-venda">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER BAR: Logo / Cliente / Trocar / Dados Veículo / Vendedor / Pagamento / Ações */}
      {/* ========================================================================= */}
      <header className="bg-[#0F172A] text-white rounded-xl px-4 py-2.5 shadow-md flex flex-wrap items-center justify-between gap-3 border border-slate-800">
        {/* Left: Logo & Cliente */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Logo icon */}
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center font-black text-white text-xs shadow-sm">
            GA
          </div>

          {/* Client identifier */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente:</span>
            <div className="bg-slate-800/90 text-white font-extrabold text-xs px-2.5 py-1 rounded border border-slate-700 max-w-[240px] sm:max-w-[320px] truncate" title={currentCustomer.name}>
              {currentCustomer.name.toUpperCase()}
            </div>

            {/* Trocar Cliente Button */}
            <button
              type="button"
              id="btn-trocar-cliente"
              onClick={() => setShowTrocarClienteModal(true)}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-bold px-2.5 py-1 rounded border border-slate-700 transition cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>TROCAR</span>
            </button>

            {/* Dados Veículo Button */}
            <button
              type="button"
              id="btn-dados-veiculo"
              onClick={() => setShowDadosVeiculoModal(true)}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-bold px-2.5 py-1 rounded border border-slate-700 transition cursor-pointer"
            >
              <Car className="w-3.5 h-3.5 text-sky-400" />
              <span>DADOS VEÍCULO</span>
            </button>

            {/* Aplicação de Peça Rápida (Frota 1995-2027) */}
            <button
              type="button"
              id="btn-quick-aplicacao-veicular"
              onClick={() => setShowQuickVehicleModal(true)}
              className="flex items-center gap-1.5 bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 hover:text-white text-[11px] font-bold px-2.5 py-1 rounded border border-indigo-700/70 transition cursor-pointer shadow-xs"
              title="Consultar catálogo de aplicação veicular de 1995 a 2027"
            >
              <Car className="w-3.5 h-3.5 text-indigo-400" />
              <span>APLICAÇÃO DE PEÇA</span>
            </button>
          </div>
        </div>

        {/* Center: Vendedor */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Vendedor:</span>
          <span className="text-xs font-black text-white bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700 uppercase tracking-wide">
            {sellerName}
          </span>
        </div>

        {/* Right: Forma de Pagamento / Pendências / Documento / Novo DAV */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Forma de Pagamento Pill */}
          <div className="bg-slate-900 border border-slate-700 px-3 py-1 rounded flex items-center gap-2 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Forma de Pagamento:</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
            >
              <option value="Dinheiro" className="bg-slate-900 text-white">Dinheiro - R$ {quoteTotal.toFixed(2)}</option>
              <option value="Pix" className="bg-slate-900 text-white">Pix - R$ {quoteTotal.toFixed(2)}</option>
              <option value="Cartão de Crédito" className="bg-slate-900 text-white">Cartão de Crédito - R$ {quoteTotal.toFixed(2)}</option>
              <option value="Boleto Faturado" className="bg-slate-900 text-white">Boleto Faturado - R$ {quoteTotal.toFixed(2)}</option>
            </select>
          </div>

          {/* Pendências Button */}
          <button
            type="button"
            id="btn-pendencias-dav"
            onClick={() => setShowPendenciasModal(true)}
            className="flex items-center gap-1.5 text-rose-300 hover:text-rose-200 border border-rose-500/40 hover:bg-rose-500/10 px-2.5 py-1 rounded text-[11px] font-extrabold uppercase transition cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>PENDÊNCIAS ({pendingDavs.length})</span>
          </button>

          {/* Alteração em andamento: salvar grava por cima deste orçamento */}
          {editingQuote && (
            <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-400/50 px-2.5 py-1 rounded text-[11px] font-extrabold uppercase text-amber-200">
              <Edit3 className="w-3.5 h-3.5" />
              <span>Alterando {editingQuote.quoteNumber}</span>
              <button
                type="button"
                onClick={() => {
                  setEditingQuote(null);
                  setQuoteItems([]);
                  setCurrentDavNumber(null);
                  onShowNotification('Alteração Cancelada', 'O balcão voltou a criar um orçamento novo.', 'info');
                }}
                className="ml-1 text-amber-100 hover:text-white underline cursor-pointer"
                title="Desistir da alteração e voltar a criar um orçamento novo"
              >
                cancelar
              </button>
            </div>
          )}

          {/* Documento Button */}
          <button
            type="button"
            id="btn-documento-dav"
            onClick={() => setShowDocumentoDavModal(true)}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1 rounded text-[11px] font-bold border border-slate-700 transition cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-slate-300" />
            <span>DOCUMENTO</span>
          </button>

          {/* Novo DAV Button */}
          <button
            type="button"
            id="btn-novo-dav"
            onClick={handleResetDav}
            className="bg-sky-600 hover:bg-sky-500 text-white font-black text-xs px-3 py-1 rounded shadow-sm transition active:scale-95 cursor-pointer"
          >
            Novo DAV
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SEARCH & FILTER TOOLBAR: Input / Grupo / Placa / Ações Rápidas */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl p-2.5 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Search Input (instant query) */}
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="input-pesquisa-rapida"
            placeholder="Pesquise por código, descrição, marca, ref. fábrica ou aplicação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-slate-900 font-bold"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Grupo Dropdown */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase">GRUPO:</span>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
          >
            <option value="Todos os grupos">Todos os grupos</option>
            <option value="Retentores & Vedação">Retentores & Vedação</option>
            <option value="Rolamentos">Rolamentos</option>
            <option value="Suspensão">Suspensão & Molas</option>
            <option value="Filtros">Filtros & Lubrificantes</option>
            <option value="Motor">Motor & Injeção</option>
          </select>
        </div>

        {/* Placa Input */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase">PLACA:</span>
          <input
            type="text"
            placeholder="ABC-1234"
            value={plateFilter}
            onChange={(e) => setPlateFilter(e.target.value.toUpperCase())}
            className="w-24 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 text-center uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Action Icon Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Search Trigger button (Dark blue) */}
          <button
            type="button"
            id="btn-trigger-search"
            onClick={() => onShowNotification('Busca Atualizada', `${filteredProducts.length} itens encontrados.`, 'info')}
            className="w-8 h-8 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white flex items-center justify-center transition cursor-pointer"
            title="Atualizar pesquisa"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Config / Fiscal Settings button */}
          <button
            type="button"
            id="btn-toggle-fiscal-config"
            onClick={() => setShowFiscalConfigPanel(!showFiscalConfigPanel)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition cursor-pointer ${
              showFiscalConfigPanel 
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Configurações fiscais (Origem CD, UF Destino, Impostos)"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <button
            type="button"
            id="btn-toggle-vehicle-filter"
            onClick={() => setShowVehicleApplicationFilters((visible) => !visible)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center border transition cursor-pointer ${
              showVehicleApplicationFilters
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="Mostrar ou ocultar filtros por veículo"
            aria-label="Mostrar ou ocultar filtros por veículo"
            aria-expanded={showVehicleApplicationFilters}
          >
            <Car className="w-4 h-4" />
          </button>

          {/* Vehicle / Clear button (Red) */}
          <button
            type="button"
            id="btn-reset-filters"
            onClick={() => {
              setSearchTerm('');
              setSelectedGroup('Todos os grupos');
              setPlateFilter('');
              clearVehicleApplicationFilters();
            }}
            className="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition cursor-pointer"
            title="Limpar filtros"
          >
            <Car className="w-4 h-4" />
          </button>

          {/* Quick link to Fleet Grid */}
          {onNavigateToFleet && (
            <button
              type="button"
              id="btn-ir-para-frota"
              onClick={onNavigateToFleet}
              className="h-8 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer"
              title="Abrir Grade de Gestão de Frota"
            >
              <Car className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Frota</span>
            </button>
          )}

          {/* Quick link to Parts Application (1995-2027) */}
          {onNavigateToPartsApplication && (
            <button
              type="button"
              id="btn-ir-para-aplicacao"
              onClick={onNavigateToPartsApplication}
              className="h-8 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
              title="Consultar Catálogo de Aplicação de Peças (Frota Brasil 1995 a 2027)"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-200" />
              <span className="hidden sm:inline">Aplicação (1995-2027)</span>
            </button>
          )}

          {/* Cart / DAV button (Orange) */}
          <button
            type="button"
            id="btn-open-cart-drawer"
            onClick={() => setShowCartDrawer(!showCartDrawer)}
            className="relative h-8 px-3 rounded-lg bg-[#F59E0B] hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            title="Ver itens do DAV"
          >
            <ShoppingCart className="w-4 h-4 fill-slate-950" />
            <span>{quoteItems.length}</span>
            {quoteItems.length > 0 && (
              <span className="hidden sm:inline font-mono text-[11px] ml-0.5">
                (R$ {quoteTotal.toFixed(2)})
              </span>
            )}
          </button>
        </div>
      </div>

      {showVehicleApplicationFilters && (
        <div
          className="bg-white rounded-xl px-3.5 py-3 border border-slate-200 shadow-xs"
          aria-label="Pesquisa por aplicação veicular"
        >
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
            <div>
              <label htmlFor="venda-filtro-montadora" className="block text-[11px] font-semibold text-slate-800 mb-1.5">
                Montadora
              </label>
              <select
                id="venda-filtro-montadora"
                value={quickMake}
                onChange={(e) => {
                  setQuickMake(e.target.value);
                  setQuickVehicleName('');
                  setQuickModelId('');
                  setQuickYear('');
                  setQuickEngine('');
                }}
                className="w-full h-[42px] bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Selecione</option>
                {quickMakesList.map((make) => (
                  <option key={make} value={make}>{make}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="venda-filtro-veiculo" className="block text-[11px] font-semibold text-slate-800 mb-1.5">
                Veículo
              </label>
              <select
                id="venda-filtro-veiculo"
                value={quickVehicleName}
                onChange={(e) => {
                  const vehicleName = e.target.value;
                  const vehicleModels = quickVehicleOptions
                    .filter((option) => option.vehicleName === vehicleName)
                    .map((option) => option.model);
                  setQuickVehicleName(vehicleName);
                  setQuickModelId(vehicleModels.length === 1 ? vehicleModels[0].id : '');
                  setQuickYear('');
                  setQuickEngine('');
                }}
                disabled={!quickMake}
                className="w-full h-[42px] bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Selecione</option>
                {quickVehiclesList.map((vehicle) => (
                  <option key={vehicle} value={vehicle}>{vehicle}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="venda-filtro-ano" className="block text-[11px] font-semibold text-slate-800 mb-1.5">
                Ano
              </label>
              <select
                id="venda-filtro-ano"
                value={quickYear}
                onChange={(e) => setQuickYear(e.target.value)}
                disabled={!quickModelId}
                className="w-full h-[42px] bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3.5 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Selecione</option>
                {quickYearsList.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="venda-filtro-motor" className="block text-[11px] font-semibold text-slate-800 mb-1.5">
                Motor
              </label>
              <select
                id="venda-filtro-motor"
                value={quickEngine}
                onChange={(e) => setQuickEngine(e.target.value)}
                disabled={!quickModelId}
                className="w-full h-[42px] bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3.5 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Selecione</option>
                {quickEnginesList.map((engine) => (
                  <option key={engine} value={engine}>{engine}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="venda-filtro-modelo" className="block text-[11px] font-semibold text-slate-800 mb-1.5">
                Modelo
              </label>
              <select
                id="venda-filtro-modelo"
                value={quickModelId}
                onChange={(e) => {
                  setQuickModelId(e.target.value);
                  setQuickYear('');
                  setQuickEngine('');
                }}
                disabled={!quickVehicleName}
                className="w-full h-[42px] bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3.5 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Selecione</option>
                {quickVehicleModelOptions.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.geracaoFase}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-1 pb-0.5">
              <button
                type="button"
                onClick={clearVehicleApplicationFilters}
                className="w-9 h-9 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                title="Limpar filtros de aplicação"
                aria-label="Limpar filtros de aplicação"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowVehicleApplicationFilters(false)}
                className="w-9 h-9 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
                title="Fechar filtros de aplicação"
                aria-label="Fechar filtros de aplicação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Veículo Selecionado da Frota Banner */}
      {initialFleetVehicle && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-3.5 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-sky-900 flex items-center gap-1.5">
              <Car className="w-4 h-4 text-sky-600" />
              <span>Veículo da Frota:</span>
            </span>
            <span className="font-black text-slate-900">
              {initialFleetVehicle.montadora} {initialFleetVehicle.modelo}
            </span>
            <span className="px-2 py-0.5 bg-white border border-sky-300 rounded font-mono font-bold text-sky-800 text-[11px] shadow-2xs">
              {initialFleetVehicle.veiculo}
            </span>
            <span className="text-slate-600 font-medium">
              Ano: <strong className="text-slate-800">{initialFleetVehicle.ano}</strong>
              {initialFleetVehicle.motor ? ` • Motor: ${initialFleetVehicle.motor}` : ''}
            </span>
          </div>

          {onNavigateToFleet && (
            <button
              type="button"
              onClick={onNavigateToFleet}
              className="text-[11px] font-bold text-sky-700 hover:text-sky-950 flex items-center gap-1 cursor-pointer self-end sm:self-auto"
            >
              <span>Trocar ou Consultar Frota</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXPANDABLE FISCAL ROUTING PANEL (Quando acionado no botão de engrenagem) */}
      {/* ========================================================================= */}
      {showFiscalConfigPanel && (
        <div className="bg-sky-50/90 border border-sky-200 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200 pb-2">
            <span className="text-xs font-black text-sky-950 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-sky-700" />
              <span>Roteamento Fiscal & Expansão de Filiais (MS, SP, SC, MT, PR)</span>
            </span>
            <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded border border-sky-300">
              CD Atual: {activeBranch.cdCode} • {activeBranch.name} ({activeBranch.uf})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {/* CD Origem */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">CD de Expedição:</label>
              <select
                value={selectedOriginBranchId}
                onChange={(e) => {
                  setSelectedOriginBranchId(e.target.value);
                  if (onSelectStore) onSelectStore(e.target.value);
                }}
                className="w-full p-1.5 bg-white border border-slate-300 rounded font-bold text-xs"
              >
                {INITIAL_BRANCHES.map(b => (
                  <option key={b.id} value={b.id}>{b.cdCode} - {b.name} ({b.uf})</option>
                ))}
              </select>
            </div>

            {/* UF Destino */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Estado Destino (UF):</label>
              <select
                value={selectedUf}
                onChange={(e) => setSelectedUf(e.target.value)}
                className="w-full p-1.5 bg-white border border-slate-300 rounded font-bold text-xs"
              >
                {STATE_TAX_TABLE.map(t => (
                  <option key={t.uf} value={t.uf}>{t.uf} - ICMS {t.icmsAliquota}% {t.uf === originUf ? '(Interno)' : `(DIFAL ${t.difalAliquota}%)`}</option>
                ))}
              </select>
            </div>

            {/* Perfil Cliente */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Perfil do Cliente:</label>
              <select
                value={selectedCustomerType}
                onChange={(e) => setSelectedCustomerType(e.target.value as CustomerType)}
                className="w-full p-1.5 bg-white border border-slate-300 rounded font-bold text-xs"
              >
                <option value="consumidor">Consumidor (0%)</option>
                <option value="cliente_fiel">Cliente Fiel (-8%)</option>
                <option value="mecanica">Mecânica Parceira (-15%)</option>
                <option value="frotista">Frotista / Empresa (-20%)</option>
              </select>
            </div>

            {/* Nova Peça Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setShowNewPartModal(true)}
                className="w-full flex items-center justify-center gap-1.5 bg-[#0C4A6E] hover:bg-sky-950 text-white font-bold text-xs p-1.5 rounded shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Cadastrar Nova Peça</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE: Left Table (72%) | Right Product Preview (28%) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT: TABLE OF PRODUCTS (Dark Navy Header, No Fornecedor Column) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          {/* Table Header Counter */}
          <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
              <span>👥 Produtos</span>
              <span className="font-semibold text-slate-500">{filteredProducts.length} itens</span>
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Clique em uma linha para selecionar • Duplo clique para adicionar ao DAV
            </span>
          </div>

          {/* Table Element */}
          <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0F172A] text-white uppercase text-[10px] font-black tracking-wider sticky top-0 z-10 shadow-xs">
                <tr>
                  <th className="py-2.5 px-3 w-16 text-center">CÓDIGO</th>
                  <th className="py-2.5 px-3">DESCRIÇÃO</th>
                  <th className="py-2.5 px-3 w-28">MARCA</th>
                  <th className="py-2.5 px-3 w-36">REF. FÁBRICA</th>
                  <th className="py-2.5 px-3">APLICAÇÃO</th>
                  <th className="py-2.5 px-3 w-20 text-right">ESTOQUE</th>
                  <th className="py-2.5 px-3 w-24 text-right">PREÇO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      Nenhuma peça encontrada com o termo "{searchTerm}".
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((prod) => {
                    const isSelected = prod.id === selectedProductId;
                    const isOutOfStock = prod.stock <= 0;
                    const applicationSummary = prod.applications && prod.applications.length > 0 
                      ? `${prod.applications[0].brand} ${prod.applications[0].vehicle}`
                      : 'Multimarcas / Universal';

                    return (
                      <tr
                        key={prod.id}
                        onClick={() => setSelectedProductId(prod.id)}
                        onDoubleClick={() => handleAddToDav(prod, 1)}
                        className={`transition cursor-pointer select-none ${
                          isSelected 
                            ? 'bg-slate-200/90 text-slate-950 font-semibold' 
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        {/* Código */}
                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-900">
                          {prod.code}
                        </td>

                        {/* Descrição */}
                        <td className="py-2 px-3 font-extrabold uppercase truncate max-w-[220px]" title={prod.name}>
                          {prod.name}
                        </td>

                        {/* Marca */}
                        <td className="py-2 px-3 font-bold uppercase text-slate-700">
                          {prod.brand}
                        </td>

                        {/* Ref. Fábrica */}
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600 truncate max-w-[140px]" title={prod.oemCode}>
                          {prod.oemCode}
                        </td>

                        {/* Aplicação */}
                        <td className="py-2 px-3 text-[11px] text-slate-600 truncate max-w-[180px]" title={applicationSummary}>
                          {applicationSummary}
                        </td>

                        {/* Estoque (se <= 0 destaca em vermelho conforme print) */}
                        <td className={`py-2 px-3 text-right font-mono font-bold text-xs ${
                          isOutOfStock ? 'text-rose-600' : 'text-slate-800'
                        }`}>
                          {prod.stock.toFixed(2).replace('.', ',')}
                        </td>

                        {/* Preço */}
                        <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900">
                          R$ {prod.sellingPrice.toFixed(2).replace('.', ',')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT: SELECTED PRODUCT PREVIEW PANEL (Imagem / Specs / Preço / Adicionar) */}
        {/* ----------------------------------------------------------------------- */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-4 flex flex-col gap-3.5 sticky top-4">
          {activeProduct ? (
            <>
              {/* Image Box (Imagem não disponível ou Foto com Zoom) */}
              <div 
                className="w-full aspect-4/3 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col items-center justify-center relative group cursor-pointer"
                onClick={() => activeProduct.imageUrl && setPhotoZoomUrl(activeProduct.imageUrl)}
              >
                {activeProduct.imageUrl ? (
                  <>
                    <img 
                      src={activeProduct.imageUrl} 
                      alt={activeProduct.name} 
                      className="w-full h-full object-cover transition group-hover:scale-105"
                      referrerPolicy="no-referrer" 
                    />
                    <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="p-1.5 bg-white text-slate-800 rounded-lg shadow-sm">
                        <Maximize2 className="w-4 h-4" />
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-slate-300 select-none">
                    <Camera className="w-14 h-14 stroke-1 mb-1 text-slate-300" />
                    <span className="text-xs font-semibold text-slate-400">imagem não disponível</span>
                  </div>
                )}
              </div>

              {/* Product Title */}
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase leading-snug">
                  {activeProduct.name}
                </h3>

                {/* Brand chip */}
                <div className="flex items-center gap-1 text-xs text-slate-600 font-bold mt-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeProduct.brand.toUpperCase()}</span>
                </div>
              </div>

              {/* Key-Value Details List (NO SUPPLIER!) */}
              <div className="border-t border-slate-100 pt-2 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-start justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Aplicação:</span>
                  <span className="font-medium text-slate-800 text-right max-w-[190px] truncate" title={activeProduct.applications?.[0]?.vehicle}>
                    {activeProduct.applications?.[0] 
                      ? `${activeProduct.applications[0].brand} ${activeProduct.applications[0].vehicle}` 
                      : 'Universal'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Referência:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {activeProduct.oemCode || activeProduct.code}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Marca:</span>
                  <span className="font-bold text-slate-800">
                    {activeProduct.brand}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Grupo:</span>
                  <span className="font-medium text-slate-800">
                    {activeProduct.category === 'caminhao' ? 'Retentores / Linha Pesada' : 'Autopeças'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Localização:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {activeProduct.location.corridor}-{activeProduct.location.shelf}-{activeProduct.location.box}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Estoque:</span>
                  <span className={`font-bold ${activeProduct.stock <= 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {activeProduct.stock.toFixed(2).replace('.', ',')} unidades
                  </span>
                </div>
              </div>

              {/* Quantity Stepper & Prominent Price Box / Add to DAV Button */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500">Qtd:</span>
                  <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuoteQuantity(Math.max(1, quoteQuantity - 1))}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 font-mono font-bold text-xs min-w-[28px] text-center">
                      {quoteQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuoteQuantity(quoteQuantity + 1)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Big Price Button */}
                <button
                  type="button"
                  id="btn-adicionar-dav-item"
                  onClick={() => handleAddToDav(activeProduct, quoteQuantity)}
                  className="w-full bg-[#E2E8F0] hover:bg-[#CBD5E1] active:bg-slate-300 text-slate-900 font-black text-xl py-3 rounded-xl transition flex flex-col items-center justify-center cursor-pointer shadow-xs"
                >
                  <span className="tracking-tight">
                    R$ {(activeProduct.sellingPrice * quoteQuantity).toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider -mt-0.5">
                    Adicionar ao DAV ({quoteQuantity} un)
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Nenhuma peça selecionada.
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DRAWER / BOTTOM BAR: DAV ATIVO COM ITENS, TOTAIS E FATURAMENTO */}
      {/* ========================================================================= */}
      {quoteItems.length > 0 && (
        <div className="bg-[#0F172A] text-white rounded-xl p-3.5 shadow-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-200">
          {/* Summary info */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#F59E0B] text-slate-950 flex items-center justify-center font-black">
                {quoteItems.length}
              </span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Itens no DAV:</span>
                <p className="text-xs font-bold text-white">
                  {quoteItems.map(it => `${it.quantity}x ${it.productCode}`).join(' • ')}
                </p>
              </div>
            </div>

            <div className="border-l border-slate-700 pl-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total do DAV:</span>
              <p className="text-base font-black font-mono text-emerald-400">
                R$ {quoteTotal.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          {/* Quick Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-drawer-ver-itens"
              onClick={() => setShowCartDrawer(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition border border-slate-700 cursor-pointer"
            >
              Ver Detalhes ({quoteItems.length})
            </button>

            <button
              type="button"
              id="btn-drawer-salvar-dav"
              onClick={() => handleSaveDav('Pendente')}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition border border-slate-700 cursor-pointer"
            >
              <Save className="w-4 h-4 text-sky-400" />
              <span>Salvar DAV</span>
            </button>

            <button
              type="button"
              id="btn-drawer-cupom-whatsapp"
              onClick={() => handleEmitCupomFiscal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-lg transition shadow-xs active:scale-95 cursor-pointer"
              title="Imprimir o orçamento (térmica 80mm), copiar o resumo ou enviar por WhatsApp"
            >
              <Printer className="w-4 h-4 text-orange-200" />
              <span>Orçamento</span>
            </button>

            <button
              type="button"
              id="btn-drawer-faturar-nfe"
              onClick={() => {
                if (quoteItems.length === 0) {
                  onShowNotification('DAV Vazio', 'Adicione pelo menos um item antes de avançar para a emissão de NF-e.', 'warning');
                  return;
                }
                setShowFaturamentoModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-lg transition shadow-sm active:scale-95 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Faturar & Emitir NF-e</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TROCAR CLIENTE */}
      {/* ========================================================================= */}
      {showTrocarClienteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Selecionar Cliente para Atendimento</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTrocarClienteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {customers.map((c) => {
                const isCurrent = c.id === currentCustomer.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setSelectedUf(c.uf || 'MS');
                      setSelectedCustomerType(c.type || 'consumidor');
                      setShowTrocarClienteModal(false);
                      onShowNotification('Cliente Atualizado', `Atendimento vinculado a ${c.name}`, 'info');
                    }}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 cursor-pointer transition ${
                      isCurrent 
                        ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-200' 
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{c.name}</span>
                        <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                          {c.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Doc: {c.document} • {c.city}/{c.uf} • Desconto de Tabela: {c.discountRate || 0}%
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DADOS DO VEÍCULO */}
      {/* ========================================================================= */}
      {showDadosVeiculoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Dados do Veículo (Atendimento)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDadosVeiculoModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Placa:</label>
                <input
                  type="text"
                  value={vehicleData.plate}
                  onChange={(e) => setVehicleData({ ...vehicleData, plate: e.target.value.toUpperCase() })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Ano Modelo:</label>
                <input
                  type="text"
                  value={vehicleData.year}
                  onChange={(e) => setVehicleData({ ...vehicleData, year: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Veículo / Modelo:</label>
                <input
                  type="text"
                  value={vehicleData.model}
                  onChange={(e) => setVehicleData({ ...vehicleData, model: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Motorização:</label>
                <input
                  type="text"
                  value={vehicleData.engine}
                  onChange={(e) => setVehicleData({ ...vehicleData, engine: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Quilometragem (KM):</label>
                <input
                  type="text"
                  value={vehicleData.km}
                  onChange={(e) => setVehicleData({ ...vehicleData, km: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Número do Chassi:</label>
                <input
                  type="text"
                  value={vehicleData.chassis}
                  onChange={(e) => setVehicleData({ ...vehicleData, chassis: e.target.value.toUpperCase() })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 text-[11px]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowDadosVeiculoModal(false);
                  onShowNotification('Veículo Salvo', `Placa ${vehicleData.plate} registrada no DAV.`, 'success');
                }}
                className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl transition"
              >
                Confirmar Dados do Veículo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PENDÊNCIAS DE DAV */}
      {/* ========================================================================= */}
      {showPendenciasModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-extrabold text-slate-900">Documentos Auxiliares de Venda Pendentes</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPendenciasModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {pendingDavs.map((dav) => (
                <div
                  key={dav.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-black text-slate-900">{dav.number}</span>
                    <p className="font-bold text-slate-800 mt-0.5">{dav.client}</p>
                    <span className="text-[11px] text-slate-500">{dav.items} itens • Aberto às {dav.time}</span>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className="font-mono font-extrabold text-slate-900">R$ {dav.total.toFixed(2)}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPendenciasModal(false);
                          handleEmitCupomFiscal(dav);
                        }}
                        className="text-[11px] font-bold text-orange-700 hover:text-orange-900 bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded border border-orange-200 cursor-pointer flex items-center gap-1 transition"
                        title="Ver Cupom Fiscal Térmico & Enviar WhatsApp"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Cupom</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPendenciasModal(false);
                          onShowNotification('DAV Recuperado', `${dav.number} carregado no balcão.`, 'info');
                        }}
                        className="text-[11px] font-bold text-sky-600 hover:text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 cursor-pointer"
                      >
                        Abrir DAV
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DOCUMENTO DAV (Visualização / Impressão) */}
      {/* ========================================================================= */}
      {showDocumentoDavModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Documento Auxiliar de Venda</span>
                <h2 className="text-base font-black text-slate-900 font-mono">{currentDavNumber ?? 'PRÉ-VISUALIZAÇÃO'}</h2>
              </div>
              <div className="flex items-center gap-2">
                <ImprimirOrcamentoSeletor
                  quote={buildDavQuote(currentDavNumber ?? 'S/N (pré-visualização)', 'Pendente')}
                  products={products}
                  onShowNotification={onShowNotification}
                  className="flex items-center gap-1.5 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
                  label="Imprimir Orçamento"
                />
                <button
                  type="button"
                  onClick={handleCopyOrcamentoResumo}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer"
                  title="Copiar resumo: número, cliente, itens, total e validade"
                >
                  {copiedDavSummary ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedDavSummary ? 'Resumo Copiado!' : 'Copiar Resumo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDocumentoDavModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cabeçalho do DAV */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Empresa Emitente</span>
                <strong className="text-slate-800">{activeBranch.name}</strong>
                <p className="text-[10px] text-slate-500">{activeBranch.city}/{activeBranch.uf} • CNPJ: {activeBranch.cnpj}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Cliente</span>
                <strong className="text-slate-800">{currentCustomer.name}</strong>
                <p className="text-[10px] text-slate-500">Doc: {currentCustomer.document}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Veículo / Vendedor</span>
                <strong className="text-slate-800">{vehicleData.plate} ({vehicleData.model})</strong>
                <p className="text-[10px] text-slate-500">Operador: {sellerName}</p>
              </div>
            </div>

            {/* Itens do DAV */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                  <tr>
                    <th className="p-2">Cód</th>
                    <th className="p-2">Descrição da Peça</th>
                    <th className="p-2">Marca</th>
                    <th className="p-2 text-center">Qtd</th>
                    <th className="p-2 text-right">Unitário</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quoteItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">Nenhum item inserido no DAV.</td>
                    </tr>
                  ) : (
                    quoteItems.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-mono font-bold">{it.productCode}</td>
                        <td className="p-2 font-semibold text-slate-900">{it.productName}</td>
                        <td className="p-2 text-slate-600">{it.brand}</td>
                        <td className="p-2 text-center font-mono">{it.quantity}</td>
                        <td className="p-2 text-right font-mono">R$ {it.finalUnitPrice.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono font-bold">R$ {it.total.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Totais */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500">Forma de Pagamento: </span>
                <strong className="text-slate-800">{paymentMethod}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-xs">Valor Total a Pagar: </span>
                <strong className="text-base font-mono font-black text-emerald-700">R$ {quoteTotal.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: DETALHES DO CARRINHO / DAV */}
      {/* ========================================================================= */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-extrabold text-slate-900">Itens no Atendimento Balcão ({quoteItems.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCartDrawer(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {quoteItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhum item adicionado ao DAV ainda.
                </div>
              ) : (
                quoteItems.map((it, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-[10px] font-bold bg-white px-1.5 py-0.5 rounded border">
                        {it.productCode}
                      </span>
                      <strong className="block text-slate-900 mt-0.5">{it.productName}</strong>
                      <span className="text-[10px] text-slate-500">
                        {it.quantity}x R$ {it.finalUnitPrice.toFixed(2)} • Marca: {it.brand} • Loc: {it.locationStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-extrabold text-slate-900">R$ {it.total.toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm font-black">
              <span>Total do DAV:</span>
              <span className="font-mono text-emerald-600 text-base">R$ {quoteTotal.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  handleSaveDav('Pendente');
                  setShowCartDrawer(false);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Salvar DAV Pendente
              </button>

              <button
                type="button"
                onClick={() => {
                  if (quoteItems.length === 0) {
                    onShowNotification('Orçamento Vazio', 'Adicione pelo menos um item antes de gerar o orçamento.', 'warning');
                    return;
                  }
                  setShowCartDrawer(false);
                  handleEmitCupomFiscal();
                }}
                className="w-full flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white font-black text-xs py-2.5 rounded-xl transition cursor-pointer"
                title="Imprimir o orçamento, copiar o resumo ou enviar por WhatsApp"
              >
                <Printer className="w-3.5 h-3.5 text-orange-200" />
                <span>Orçamento</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (quoteItems.length === 0) {
                    onShowNotification('DAV Vazio', 'Adicione pelo menos um item antes de faturar.', 'warning');
                    return;
                  }
                  setShowFaturamentoModal(true);
                  setShowCartDrawer(false);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Faturar & Emitir NF-e
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CADASTRO COMPLETO DE PEÇA */}
      {/* ========================================================================= */}
      <CadastroPecaModal
        isOpen={showNewPartModal}
        onClose={() => setShowNewPartModal(false)}
        onShowNotification={onShowNotification}
        onSaveProduct={(p) => {
          onAddNewProduct(p);
          setSelectedProductId(p.id);
          onShowNotification('Peça Cadastrada', `${p.name} adicionada ao estoque.`, 'success');
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL 7: PHOTO LIGHTBOX ZOOM */}
      {/* ========================================================================= */}
      {photoZoomUrl && (
        <div 
          className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPhotoZoomUrl(null)}
        >
          <div className="relative max-w-2xl bg-white rounded-2xl p-2 overflow-hidden shadow-2xl border border-slate-700">
            <button
              type="button"
              onClick={() => setPhotoZoomUrl(null)}
              className="absolute top-3 right-3 p-1 bg-slate-900/80 text-white rounded-full hover:bg-slate-900 transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={photoZoomUrl} 
              alt="Ampliação da Peça" 
              className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
              referrerPolicy="no-referrer" 
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: CONFERÊNCIA FISCAL, FATURAMENTO & EMISSÃO SEFAZ (PASSO 3) */}
      {/* ========================================================================= */}
      {showFaturamentoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full tracking-wider flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Passo 3 de 3 • Faturamento Fiscal SEFAZ
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                    Origem: {activeBranch.name} ({originUf})
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Conferência da Venda & Emissão de NF-e
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFaturamentoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid: Cliente & Veículo Vinculado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Card Cliente */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                  <span>Destinatário</span>
                  <span className="text-indigo-600 font-mono">ICMS: {stateTax.icmsAliquota}%</span>
                </div>
                <strong className="block text-slate-900 text-sm truncate">{currentCustomer.name}</strong>
                <p className="font-mono text-slate-600 text-[11px]">{currentCustomer.document}</p>
                <p className="text-slate-500 text-[11px]">
                  {currentCustomer.city || 'Campo Grande'} / {selectedUf} • Regime: {selectedCustomerType.toUpperCase()}
                </p>
              </div>

              {/* Card Veículo e Garantia Legal */}
              <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-indigo-700 uppercase">
                  <span className="flex items-center gap-1">
                    <Car className="w-3.5 h-3.5" />
                    Veículo Vinculado
                  </span>
                  <span className="bg-indigo-200 text-indigo-800 text-[9px] font-black px-1.5 py-0.2 rounded font-mono">
                    {vehicleData.plate || 'SEM PLACA'}
                  </span>
                </div>
                <strong className="block text-indigo-950 text-sm truncate">
                  {vehicleData.model || 'Veículo Padrão'}
                </strong>
                <p className="text-indigo-900 text-[11px]">
                  Ano: {vehicleData.year || 'N/I'} • Motor: {vehicleData.engine || 'Padrão'} • KM: {vehicleData.km || 'N/I'}
                </p>
                <p className="text-[10px] text-emerald-800 font-bold">
                  ✓ Garantia Legal de 90 dias assegurada (Art. 26, CDC).
                </p>
              </div>
            </div>

            {/* Tabela Resumo dos Itens */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Peças Faturadas ({quoteItems.length} itens)</span>
                <span>Subtotal Itens: R$ {quoteSubtotal.toFixed(2)}</span>
              </div>
              <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 text-xs">
                {quoteItems.map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                        {item.productCode}
                      </span>
                      <div>
                        <strong className="block text-slate-800 text-xs">{item.productName}</strong>
                        <span className="text-[10px] text-slate-500">
                          {item.quantity}x R$ {item.finalUnitPrice.toFixed(2)} • Marca: {item.brand}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      R$ {item.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Forma de Pagamento e Resumo Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center pt-2">
              {/* Forma de Pagamento Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Forma de Pagamento para Emissão da NF-e:
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto Faturado'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`p-2 rounded-lg font-bold border transition text-center cursor-pointer ${
                        paymentMethod === m 
                          ? 'bg-sky-50 border-sky-500 text-sky-900 ring-1 ring-sky-400' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Totalizador */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal Produtos:</span>
                  <span className="font-mono">R$ {quoteSubtotal.toFixed(2)}</span>
                </div>
                {quoteFreightCost > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Frete / Entrega:</span>
                    <span className="font-mono">+ R$ {quoteFreightCost.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>ICMS Destacado ({stateTax.icmsAliquota}%):</span>
                  <span className="font-mono">R$ {(quoteTotal * (stateTax.icmsAliquota / 100)).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black">
                  <span className="text-white">Total da Nota Fiscal:</span>
                  <span className="text-emerald-400 font-mono text-lg">R$ {quoteTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowFaturamentoModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Voltar e Ajustar Balcão
              </button>

              <button
                type="button"
                id="btn-confirmar-transmissao-nfe"
                onClick={() => {
                  setShowFaturamentoModal(false);
                  handleEmitNfe();
                }}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Autorizar & Emitir NF-e na SEFAZ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: CONSULTA RÁPIDA DE APLICAÇÃO VEICULAR (FROTA 1995-2027) */}
      {/* ========================================================================= */}
      {showQuickVehicleModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-black text-[10px] uppercase">
                      Passo 1: Aplicação
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Frota Comercializada no Brasil • 1995 a 2027 ({BRAZILIAN_FLEET_DATABASE.length} modelos)
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">
                    Consulta Rápida de Aplicação Veicular & Peças
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickVehicleModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Filter Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Segmento:</label>
                <select
                  id="quick-segmento"
                  value={quickSegment}
                  onChange={(e) => {
                    // Trocar o segmento recomeça a cascata: a montadora escolhida
                    // pode não existir no segmento novo.
                    setQuickSegment(e.target.value as VehicleFleetSegment | 'todos');
                    setQuickMake('');
                    setQuickVehicleName('');
                    setQuickModelId('');
                    setQuickYear('');
                    setQuickEngine('');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-sky-500"
                >
                  <option value="todos">Todos os Segmentos</option>
                  {quickSegmentsList.map((segmento) => (
                    <option key={segmento} value={segmento}>{segmento}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Montadora:</label>
                <select
                  value={quickMake}
                  onChange={(e) => {
                    setQuickMake(e.target.value);
                    setQuickVehicleName('');
                    setQuickModelId('');
                    setQuickYear('');
                    setQuickEngine('');
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-sky-500"
                >
                  <option value="">Todas as Montadoras</option>
                  {quickMakesList.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Modelo:</label>
                <select
                  value={quickVehicleOptions.find(
                    (option) => option.model.id === quickModelId && option.vehicleName === quickVehicleName
                  )?.key || ''}
                  onChange={(e) => {
                    const selectedOption = quickVehicleOptions.find((option) => option.key === e.target.value);
                    setQuickModelId(selectedOption?.model.id || '');
                    setQuickVehicleName(selectedOption?.vehicleName || '');
                    setQuickYear('');
                    setQuickEngine('');
                  }}
                  disabled={!quickMake}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-sky-500"
                >
                  <option value="">Todos os Modelos</option>
                  {quickVehicleOptions.map(({ key, model, vehicleName }) => (
                    <option key={key} value={key}>{vehicleName} ({model.geracaoFase})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ano:</label>
                <select
                  value={quickYear}
                  onChange={(e) => setQuickYear(e.target.value)}
                  disabled={!quickModelId}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-sky-500"
                >
                  <option value="">Todos os Anos</option>
                  {quickYearsList.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Motor:</label>
                <select
                  value={quickEngine}
                  onChange={(e) => setQuickEngine(e.target.value)}
                  disabled={!quickModelId}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:outline-sky-500"
                >
                  <option value="">Todos os Motores</option>
                  {quickEnginesList.map(eng => (
                    <option key={eng} value={eng}>{eng}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Free search filter inside modal */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por código, nome da peça, OEM ou código similar..."
                value={quickSearchTerm}
                onChange={(e) => setQuickSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:outline-indigo-500"
              />
            </div>

            {/* Results List */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Peças Compatíveis em Estoque ({quickCompatibleParts.length} encontradas)</span>
                <span className="text-[11px] text-slate-500 font-normal">Clique para adicionar direto ao DAV do balcão</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {quickCompatibleParts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Nenhuma peça compatível encontrada com os filtros selecionados.
                  </div>
                ) : (
                  quickCompatibleParts.map((item) => {
                    const selectedModelObj = BRAZILIAN_FLEET_DATABASE.find(m => m.id === quickModelId);
                    return (
                      <div key={item.id} className="p-3 hover:bg-indigo-50/40 flex items-center justify-between gap-4 transition">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                              {item.code}
                            </span>
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {item.name}
                            </span>
                            <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 rounded font-semibold">
                              {item.brand}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                            <span>OEM: <strong className="font-mono">{item.oemCode || 'N/A'}</strong></span>
                            <span>Estoque: <strong className={item.stock > 0 ? 'text-emerald-700' : 'text-rose-600'}>{item.stock} un</strong></span>
                            <span>Loc: <strong className="font-mono">{item.location.corridor}-{item.location.shelf}-{item.location.box}</strong></span>
                            {item.applications && item.applications[0] && (
                              <span className="truncate max-w-[200px] text-slate-600">
                                Aplicação: {item.applications[0].vehicle || item.applications[0].brand} ({item.applications[0].yearRange})
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-black font-mono text-slate-900">
                            R$ {item.sellingPrice.toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              if (selectedModelObj) {
                                setVehicleData(prev => ({
                                  ...prev,
                                  model: `${selectedModelObj.montadora} ${selectedModelObj.modelo}`,
                                  year: quickYear || String(selectedModelObj.anoInicio),
                                  engine: quickEngine || selectedModelObj.motores[0] || prev.engine,
                                }));
                              }
                              setSelectedProductId(item.id);
                              handleAddToDav(item, 1);
                              onShowNotification(
                                'Peça Adicionada ao Balcão!',
                                `${item.code} - ${item.name} incluído no DAV com veículo atualizado.`,
                                'success'
                              );
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Lançar no DAV</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Bottom Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              {onNavigateToPartsApplication && (
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickVehicleModal(false);
                    onNavigateToPartsApplication();
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Abrir Tela Completa de Consulta & Aplicação de Peças</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowQuickVehicleModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Concluir Seleção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUPOM FISCAL TÉRMICO & ENVIO WHATSAPP */}
      <CupomFiscalModal
        key={cupomQuote?.id ?? 'vazio'}
        isOpen={isCupomModalOpen}
        onClose={() => setIsCupomModalOpen(false)}
        quote={cupomQuote}
        products={products}
        onQuoteSentWhatsapp={(updatedQuote) => {
          if (onSaveQuote) onSaveQuote(updatedQuote);
        }}
        onShowNotification={onShowNotification}
      />
    </div>
  );
};
