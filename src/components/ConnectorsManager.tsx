import React, { useState } from 'react';
import { apiFetch } from '../services/apiClient';
import {
  Cable,
  Globe,
  DollarSign,
  Share2,
  Boxes,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  Send,
  Plus,
  Key,
  ExternalLink,
  ShieldCheck,
  Truck,
  Building2,
  Search,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  CreditCard,
  QrCode,
  Zap,
  Info,
  Layers,
  FileCode,
  Code
} from 'lucide-react';
import {
  Product,
  Order,
  MarketplaceSetting,
  EcommerceConnectorConfig,
  BankGatewayConfig,
  StockTransferOrder,
  ConnectorWebhookEvent,
  SalesChannel
} from '../types';
import {
  INITIAL_ECOMMERCE_CONNECTORS,
  INITIAL_BANK_GATEWAYS,
  INITIAL_STOCK_TRANSFERS,
  INITIAL_CONNECTOR_EVENTS
} from '../data/initialData';

interface ConnectorsManagerProps {
  products: Product[];
  orders: Order[];
  marketplaces: MarketplaceSetting[];
  onUpdateProducts: (products: Product[]) => void;
  onUpdateMarketplaces: (marketplaces: MarketplaceSetting[]) => void;
  onShowNotification: (notification: any) => void;
}

export const ConnectorsManager: React.FC<ConnectorsManagerProps> = ({
  products,
  orders,
  marketplaces,
  onUpdateProducts,
  onUpdateMarketplaces,
  onShowNotification,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'ecommerce' | 'banking' | 'multichannel_stock' | 'webhook_logs'>('overview');

  // Connectors State
  const [ecommerceConnectors, setEcommerceConnectors] = useState<EcommerceConnectorConfig[]>(INITIAL_ECOMMERCE_CONNECTORS);
  const [bankGateways, setBankGateways] = useState<BankGatewayConfig[]>(INITIAL_BANK_GATEWAYS);
  const [stockTransfers, setStockTransfers] = useState<StockTransferOrder[]>(INITIAL_STOCK_TRANSFERS);
  const [webhookEvents, setWebhookEvents] = useState<ConnectorWebhookEvent[]>(INITIAL_CONNECTOR_EVENTS);

  // Modals & Simulators
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedProductForTransfer, setSelectedProductForTransfer] = useState<Product | null>(null);
  const [transferQty, setTransferQty] = useState<number>(1);
  const [transferDestination, setTransferDestination] = useState<'meli_full' | 'amazon_fba' | 'shopee_external'>('meli_full');

  // E-commerce Order Simulation Modal
  const [isOrderSimModalOpen, setIsOrderSimModalOpen] = useState(false);
  const [simSelectedProduct, setSimSelectedProduct] = useState<Product>(products[0] || {} as Product);
  const [simQuantity, setSimQuantity] = useState<number>(1);
  const [simPlatform, setSimPlatform] = useState<string>('landingpage_gato');
  const [isProcessingSim, setIsProcessingSim] = useState(false);

  // Bank Pix Simulation Modal
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [selectedBankForPix, setSelectedBankForPix] = useState<BankGatewayConfig>(bankGateways[0]);
  const [pixAmount, setPixAmount] = useState<number>(389.90);
  const [isPixSettled, setIsPixSettled] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Code Snippet Modal for Landing Page
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState(false);

  // Multi-channel Stock Search & Filter
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [stockFilterCategory, setStockFilterCategory] = useState<string>('all');
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
    onShowNotification({
      title: 'Copiado para Área de Transferência',
      message: `${label} copiado com sucesso.`,
      type: 'info',
    });
  };

  // Helper calculation for stock totals
  const getCentralStock = (p: Product) => (p.stockCentral !== undefined ? p.stockCentral : p.stock);
  const getExternalMeli = (p: Product) => p.stockExternal?.meliFull || 0;
  const getExternalAmazon = (p: Product) => p.stockExternal?.amazonFba || 0;
  const getExternalShopee = (p: Product) => p.stockExternal?.shopeeExternal || 0;
  const getExternalTotal = (p: Product) => (p.stockExternal?.total !== undefined ? p.stockExternal.total : (getExternalMeli(p) + getExternalAmazon(p) + getExternalShopee(p)));
  const getIntegratedTotal = (p: Product) => getCentralStock(p) + getExternalTotal(p);

  // Handle Transfer from Central to External Stock
  const handleExecuteTransfer = () => {
    if (!selectedProductForTransfer) return;
    const currentCentral = getCentralStock(selectedProductForTransfer);

    if (transferQty > currentCentral) {
      onShowNotification({
        title: 'Saldo Insuficiente no CD Central',
        message: `Você tentou transferir ${transferQty} un, mas o estoque central possui apenas ${currentCentral} un.`,
        type: 'warning',
      });
      return;
    }

    const nfeRemessa = `000.${Math.floor(Math.random() * 899 + 100)}.${Math.floor(Math.random() * 899 + 100)}`;
    const newCentral = currentCentral - transferQty;

    const currentExt = selectedProductForTransfer.stockExternal || { meliFull: 0, amazonFba: 0, shopeeExternal: 0, total: 0 };
    let newMeli = currentExt.meliFull || 0;
    let newAmazon = currentExt.amazonFba || 0;
    let newShopee = currentExt.shopeeExternal || 0;

    if (transferDestination === 'meli_full') newMeli += transferQty;
    if (transferDestination === 'amazon_fba') newAmazon += transferQty;
    if (transferDestination === 'shopee_external') newShopee += transferQty;

    const updatedExt = {
      ...currentExt,
      meliFull: newMeli,
      amazonFba: newAmazon,
      shopeeExternal: newShopee,
      total: newMeli + newAmazon + newShopee,
    };

    const updatedProducts = products.map((p) => {
      if (p.id === selectedProductForTransfer.id) {
        return {
          ...p,
          stockCentral: newCentral,
          stockExternal: updatedExt,
          stock: newCentral + updatedExt.total,
        };
      }
      return p;
    });

    onUpdateProducts(updatedProducts);

    const destinationLabels: Record<string, string> = {
      meli_full: 'Mercado Livre Full (CD Cajamar)',
      amazon_fba: 'Amazon FBA Prime',
      shopee_external: 'Shopee Xpress Hub',
    };

    const newTransfer: StockTransferOrder = {
      id: `trf-${Date.now().toString().slice(-4)}`,
      productId: selectedProductForTransfer.id,
      productCode: selectedProductForTransfer.code,
      productName: selectedProductForTransfer.name,
      fromLocation: 'central',
      toLocation: transferDestination,
      quantity: transferQty,
      reason: `Remessa para ${destinationLabels[transferDestination]} para despacho em tempo recorde`,
      trackingDocument: `NF-e ${nfeRemessa} - CFOP 5905 (Remessa Depósito Fechado)`,
      status: 'concluida',
      createdAt: new Date().toISOString(),
    };

    setStockTransfers([newTransfer, ...stockTransfers]);

    // Add webhook event
    const newEv: ConnectorWebhookEvent = {
      id: `ev-${Date.now().toString().slice(-4)}`,
      source: transferDestination === 'meli_full' ? 'mercadolivre' : transferDestination === 'amazon_fba' ? 'amazon' : 'shopee',
      eventType: 'stock/transfer_completed',
      summary: `Remessa de ${transferQty} un para ${destinationLabels[transferDestination]}`,
      rawPayloadSummary: `NF-e ${nfeRemessa}. Baixa no Estoque Central (-${transferQty}) e Crédito no Estoque Externo (+${transferQty}).`,
      status: 'processed',
      stockDeductedFrom: 'central',
      quantityDeducted: transferQty,
      timestamp: 'Agora mesmo',
    };
    setWebhookEvents([newEv, ...webhookEvents]);

    setIsTransferModalOpen(false);
    onShowNotification({
      title: 'Transferência de Estoque Concluída',
      message: `${transferQty} un transferidas com sucesso para ${destinationLabels[transferDestination]}. NF-e ${nfeRemessa} emitida.`,
      type: 'success',
    });
  };

  // Simulate Order from E-commerce or Landing Page (Deducting from Central Stock)
  const handleSimulateEcommerceOrder = async () => {
    setIsProcessingSim(true);
    const prod = simSelectedProduct;
    const currentCentral = getCentralStock(prod);

    if (simQuantity > currentCentral) {
      setIsProcessingSim(false);
      onShowNotification({
        title: 'Estoque Central Indisponível',
        message: `A landing page/e-commerce tentou comprar ${simQuantity} un, mas o estoque central possui apenas ${currentCentral} un. Venda bloqueada para evitar furo!`,
        type: 'error',
      });
      return;
    }

    try {
      const response = await apiFetch('/api/connectors/ecommerce/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: simPlatform,
          apiKey: 'gato_pub_live_test_key',
          customer: { name: 'Comprador Online Vitrine' },
          items: [
            {
              code: prod.code,
              name: prod.name,
              quantity: simQuantity,
              unitPrice: prod.sellingPrice,
            }
          ],
          totalAmount: prod.sellingPrice * simQuantity,
        }),
      });

      const data = await response.json();

      // Deduct from Central Stock in local state
      const newCentral = currentCentral - simQuantity;
      const currentExt = prod.stockExternal || { meliFull: 0, amazonFba: 0, shopeeExternal: 0, total: 0 };
      const updatedProducts = products.map((p) => {
        if (p.id === prod.id) {
          return {
            ...p,
            stockCentral: newCentral,
            stock: newCentral + currentExt.total,
          };
        }
        return p;
      });
      onUpdateProducts(updatedProducts);

      // Increment orders count on the connector
      setEcommerceConnectors((prev) =>
        prev.map((c) => {
          if (c.platform === simPlatform || (simPlatform === 'landingpage_gato' && c.platform === 'landingpage_gato')) {
            return {
              ...c,
              ordersReceivedCount: c.ordersReceivedCount + 1,
              lastOrderAt: 'Agora mesmo',
            };
          }
          return c;
        })
      );

      // Add to Webhook logs
      const newEv: ConnectorWebhookEvent = {
        id: `ev-${Date.now().toString().slice(-4)}`,
        source: 'ecommerce',
        eventType: 'orders/v1/new_purchase',
        summary: `Pedido ${data.orderId || '#LP-NOVO'} via ${simPlatform === 'landingpage_gato' ? 'Landing Page GATO' : 'E-commerce'}`,
        rawPayloadSummary: `Item: ${prod.code} (${simQuantity} un) • R$ ${(prod.sellingPrice * simQuantity).toFixed(2)}. Baixa efetuada no ESTOQUE CENTRAL (Novo saldo: ${newCentral} un). Saldo replicado aos marketplaces.`,
        status: 'processed',
        stockDeductedFrom: 'central',
        quantityDeducted: simQuantity,
        timestamp: 'Agora mesmo',
      };
      setWebhookEvents([newEv, ...webhookEvents]);

      setIsProcessingSim(false);
      setIsOrderSimModalOpen(false);

      onShowNotification({
        title: 'Pedido Recebido da Loja / Landing Page!',
        message: `Baixa imediata de ${simQuantity} un realizada no ESTOQUE CENTRAL. Saldo restante: ${newCentral} un. Broadcast disparado aos Marketplaces.`,
        type: 'success',
      });
    } catch (err) {
      setIsProcessingSim(false);
      onShowNotification({
        title: 'Erro ao processar simulação',
        message: 'Falha na comunicação com o backend de conectores.',
        type: 'error',
      });
    }
  };

  // Simulate Instant Pix Settlement & Bank Reconciliation
  const handleSimulatePixSettlement = async () => {
    try {
      const response = await apiFetch('/api/connectors/bank/pix/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gateway: selectedBankForPix.gateway,
          amount: pixAmount,
          orderId: `DAV-${Math.floor(Math.random() * 8999 + 1000)}`,
        }),
      });

      const resData = await response.json();
      setIsPixSettled(true);

      // Update gateway stats
      setBankGateways((prev) =>
        prev.map((g) => {
          if (g.id === selectedBankForPix.id) {
            return {
              ...g,
              lastWebhookAt: 'Agora mesmo',
              totalSettledAmount: (g.totalSettledAmount || 0) + pixAmount,
            };
          }
          return g;
        })
      );

      // Add to Webhook events
      const newEv: ConnectorWebhookEvent = {
        id: `ev-${Date.now().toString().slice(-4)}`,
        source: 'bank_gateway',
        eventType: 'pix/payment_received_webhook',
        summary: `Pix Liquidado via ${selectedBankForPix.name} - R$ ${pixAmount.toFixed(2)}`,
        rawPayloadSummary: `EndToEndId: ${resData.endToEndId} • Pagador: Cliente Teste • Baixa automática realizada no Caixa e no Contas a Receber.`,
        status: 'processed',
        stockDeductedFrom: 'none',
        timestamp: 'Agora mesmo',
      };
      setWebhookEvents([newEv, ...webhookEvents]);

      onShowNotification({
        title: 'Pix Liquidado com Sucesso!',
        message: `O banco ${selectedBankForPix.name} confirmou o recebimento. Venda conciliada e caixa atualizado automaticamente.`,
        type: 'success',
      });
    } catch (err) {
      onShowNotification({
        title: 'Erro ao simular Pix',
        message: 'Não foi possível confirmar o pagamento bancário.',
        type: 'error',
      });
    }
  };

  // Trigger Full Stock Sync across all channels
  const handleSyncAllStock = () => {
    setIsSyncingAll(true);
    setTimeout(() => {
      setIsSyncingAll(false);
      onShowNotification({
        title: 'Estoque Multi-Canal Sincronizado',
        message: 'Saldos do Estoque Central e Estoques Externos (Meli Full, Amazon FBA, Shopee) equalizados em tempo real.',
        type: 'success',
      });
    }, 1200);
  };

  // Filtered Products for Multi-Channel Stock Grid
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(stockSearchTerm.toLowerCase()) ||
      (p.oemCode && p.oemCode.toLowerCase().includes(stockSearchTerm.toLowerCase()));

    if (stockFilterCategory === 'all') return matchesSearch;
    if (stockFilterCategory === 'external_only') return matchesSearch && getExternalTotal(p) > 0;
    if (stockFilterCategory === 'central_low') return matchesSearch && getCentralStock(p) <= p.minStock;
    return matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/2 bottom-0 w-80 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 text-xs font-black uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5 text-sky-400" />
                Camada 2 — Empresa / Cliente Contratante
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Contas Bancárias & Vendas 100% Privadas (Sigilo LGPD)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Conectores Comerciais, Gateway Bancário & Marketplaces
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl leading-relaxed">
              Gestão de estoque em tempo real com segregação inteligente entre <strong>Estoque Central (CD Matriz/Balcão)</strong> e <strong>Estoque Externo (Mercado Livre Full & Amazon FBA)</strong>, emissão de PIX dinâmico e conciliação bancária própria da sua empresa.
            </p>
            <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-sky-500/20 text-xs text-sky-200/90 flex items-start gap-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Privacidade e Sigilo Garantidos pelo Contrato SaaS:</strong> Suas contas bancárias, credenciais de gateways (PIX, boletos) e tokens de vendedores em marketplaces são restritos à sua empresa. O Super Admin da plataforma não tem acesso nem visualização aos seus dados de faturamento ou senhas.
              </span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-sync-all-channels"
              onClick={handleSyncAllStock}
              disabled={isSyncingAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-100 text-xs font-bold border border-slate-600/60 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-indigo-400 ${isSyncingAll ? 'animate-spin' : ''}`} />
              {isSyncingAll ? 'Sincronizando...' : 'Sincronizar Todos'}
            </button>

            <button
              id="btn-open-simulate-order"
              onClick={() => {
                // Sem produto cadastrado o modal de simulação estoura em `simSelectedProduct.id`.
                if (products.length === 0) {
                  onShowNotification({
                    title: 'Nenhum produto cadastrado',
                    message: 'Cadastre um produto antes de simular um pedido.',
                    type: 'warning',
                  });
                  return;
                }
                setSimSelectedProduct(products[0]);
                setSimQuantity(1);
                setIsOrderSimModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-950/30 transition-all active:scale-95 cursor-pointer"
            >
              <Globe className="w-4 h-4" />
              Simular Pedido Landing Page
            </button>

            <button
              id="btn-open-pix-simulation"
              onClick={() => {
                setIsPixSettled(false);
                setIsPixModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/30 transition-all active:scale-95 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              Get Bancário / Testar Pix
            </button>
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto mt-6 pt-4 border-t border-slate-700/60 no-scrollbar">
          <button
            id="tab-btn-overview"
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Visão Geral & Hub
          </button>

          <button
            id="tab-btn-ecommerce"
            onClick={() => setActiveTab('ecommerce')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ecommerce'
                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4 text-orange-600" />
            E-commerce & Landing Page
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-black">
              {ecommerceConnectors.filter((c) => c.enabled).length}
            </span>
          </button>

          <button
            id="tab-btn-banking"
            onClick={() => setActiveTab('banking')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'banking'
                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Get Bancário & Pix
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black">
              {bankGateways.filter((g) => g.enabled).length}
            </span>
          </button>

          <button
            id="tab-btn-multichannel"
            onClick={() => setActiveTab('multichannel_stock')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'multichannel_stock'
                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Boxes className="w-4 h-4 text-indigo-600" />
            Estoque Central vs. Externo (Full/FBA)
          </button>

          <button
            id="tab-btn-webhooks"
            onClick={() => setActiveTab('webhook_logs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'webhook_logs'
                ? 'bg-white text-slate-900 shadow-md font-extrabold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-slate-400" />
            Webhooks & Baixas em Tempo Real
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-200 font-mono">
              {webhookEvents.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: VISÃO GERAL & HUB DE CONECTORES                                    */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: E-commerce & Landing Pages */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-commerce / Landing</span>
                <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200/60 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-orange-600" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-3">3 Lojas Ativas</p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                73 pedidos recebidos no mês
              </div>
              <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
                Baixa automática no Estoque Central ativada
              </p>
            </div>

            {/* Card 2: Get Bancário */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Get Bancário (Pix)</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-3">R$ 76.571,40</p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                <Zap className="w-3.5 h-3.5" />
                Conciliação instantânea (SPI / Pix)
              </div>
              <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
                Mercado Pago, Inter, BB & Asaas conectados
              </p>
            </div>

            {/* Card 3: Marketplaces */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Marketplaces</span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center">
                  <Share2 className="w-4 h-4 text-indigo-600" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-3">Meli, Shopee, Amazon</p>
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mt-1">
                <RefreshCw className="w-3.5 h-3.5" />
                Sincronismo bi-direcional ativo
              </div>
              <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
                Prevenção anti-overselling em tempo real
              </p>
            </div>

            {/* Card 4: Estoque Externo Full / FBA */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estoque Externo</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center">
                  <Boxes className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 mt-3">37 Unidades Full</p>
              <div className="flex items-center gap-1.5 text-xs text-purple-600 font-semibold mt-1">
                <Truck className="w-3.5 h-3.5" />
                Meli Full Cajamar + Amazon FBA
              </div>
              <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
                Vendas Full não consom estoque do balcão!
              </p>
            </div>
          </div>

          {/* Architecture Diagram: How Multi-channel Stock Works */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Regras de Baixa em Tempo Real & Segregação de Estoque
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Como o sistema GATO protege sua operação contra furos de estoque e divergências fiscais
                </p>
              </div>
              <button
                onClick={() => setActiveTab('multichannel_stock')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                Ver Grade de Estoques Multi-Canal
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-orange-950 uppercase tracking-wide">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                  Venda Balcão / Landing Page
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Dá baixa <strong>imediata no Estoque Central (Matriz)</strong> e dispara um broadcast de webhook para Mercado Livre, Shopee e Amazon recalcularem o saldo disponível, impedindo venda de peças sem estoque.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-950 uppercase tracking-wide">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                  Venda Mercado Livre Full / Amazon FBA
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  A mercadoria já está no galpão logístico do marketplace. A baixa ocorre <strong>apenas no Estoque Externo do canal</strong>, mantendo o seu Estoque Central intacto para os clientes físicos e balcão!
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wide">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  Venda Marketplace Coleta / Correios (FBM)
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  O caminhão da Shopee ou do Mercado Envios coleta na sua loja. Dá baixa no <strong>Estoque Central</strong> e emite a etiqueta de envio com código de rastreio automático.
                </p>
              </div>
            </div>
          </div>

          {/* Connected Channels Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* E-commerce & Landing Page Mini-List */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-orange-600" />
                  Canais E-commerce & Landing Page
                </h3>
                <button
                  onClick={() => setActiveTab('ecommerce')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
                >
                  Gerenciar
                </button>
              </div>

              <div className="space-y-3">
                {ecommerceConnectors.map((connector) => (
                  <div
                    key={connector.id}
                    className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 font-black text-xs flex items-center justify-center shrink-0">
                        {connector.platform.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">{connector.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{connector.storeUrl}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        connector.status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {connector.status === 'connected' ? 'Conectado' : 'Pendente'}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{connector.ordersReceivedCount} pedidos</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bank Gateways Mini-List */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Gateways Bancários & Pix Ativos
                </h3>
                <button
                  onClick={() => setActiveTab('banking')}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  Configurar
                </button>
              </div>

              <div className="space-y-3">
                {bankGateways.slice(0, 4).map((gateway) => (
                  <div
                    key={gateway.id}
                    className="p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/70 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center shrink-0">
                        PIX
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">{gateway.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">Chave: {gateway.pixKey}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {gateway.status === 'active' ? 'Operando' : 'Homologação'}
                      </span>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {gateway.totalSettledAmount ? `R$ ${gateway.totalSettledAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Pronto'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: E-COMMERCE & LANDING PAGE                                          */}
      {/* ========================================================================= */}
      {activeTab === 'ecommerce' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-orange-600" />
                Conectores para Loja Virtual & Landing Page Própria
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Integre seu site institucional, landing page de anúncios ou plataforma de e-commerce com baixa instantânea no Estoque Central
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSnippetModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
              >
                <Code className="w-4 h-4 text-slate-600" />
                Gerar Snippet / Código para Landing Page
              </button>

              <button
                onClick={() => {
                  // Sem produto cadastrado o modal de simulação estoura em `simSelectedProduct.id`.
                  if (products.length === 0) {
                    onShowNotification({
                      title: 'Nenhum produto cadastrado',
                      message: 'Cadastre um produto antes de simular um pedido.',
                      type: 'warning',
                    });
                    return;
                  }
                  setSimSelectedProduct(products[0]);
                  setSimQuantity(1);
                  setIsOrderSimModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Simular Pedido do Site
              </button>
            </div>
          </div>

          {/* Connectors Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ecommerceConnectors.map((connector) => (
              <div
                key={connector.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4 hover:border-orange-500/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center font-black text-sm text-orange-600">
                      {connector.platform === 'landingpage_gato' ? 'LP' : connector.platform.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{connector.name}</h3>
                      <a
                        href={connector.storeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-indigo-600 hover:underline inline-flex items-center gap-1"
                      >
                        {connector.storeUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                    connector.status === 'connected' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {connector.status === 'connected' ? 'Conectado' : 'Aguardando'}
                  </span>
                </div>

                {/* Credentials & Webhook Details */}
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Public API Key:</span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-800 font-bold">
                      <span>{connector.publicKey}</span>
                      <button
                        onClick={() => handleCopy(connector.publicKey, 'Chave Pública')}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                        title="Copiar"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Endpoint de Pedidos:</span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-800 truncate max-w-[200px]">
                      <span className="truncate">{connector.webhookEndpoint}</span>
                      <button
                        onClick={() => handleCopy(connector.webhookEndpoint, 'Endpoint Webhook')}
                        className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer shrink-0"
                        title="Copiar"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[11px]">
                    <span className="text-slate-500">Último Ping:</span>
                    <span className="text-slate-700 font-semibold">{connector.lastPingAt}</span>
                  </div>
                </div>

                {/* Configuration Toggles */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold text-slate-700">Baixa no Estoque Central:</span>
                  </div>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Ativada (Tempo Real)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: GET BANCÁRIO & PIX DINÂMICO                                        */}
      {/* ========================================================================= */}
      {activeTab === 'banking' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Get Bancário: Gateways de Pagamento & Conciliação Automática
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Receba pagamentos via PIX dinâmico com QR Code, boletos registrados e liquide vendas instantaneamente no sistema GATO
              </p>
            </div>

            <button
              onClick={() => {
                setIsPixSettled(false);
                setIsPixModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              Testar Cobrança Pix com QR Code
            </button>
          </div>

          {/* Gateways Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {bankGateways.map((gateway) => (
              <div
                key={gateway.id}
                className={`bg-white rounded-2xl p-5 border shadow-xs space-y-4 transition-all ${
                  gateway.enabled ? 'border-slate-200/80 hover:border-emerald-500/50' : 'border-slate-200/40 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-black text-xs">
                      PIX
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">{gateway.name}</h3>
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">Chave {gateway.pixKeyType}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    gateway.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {gateway.status === 'active' ? 'Ativo' : 'Teste'}
                  </span>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Chave PIX:</span>
                    <span className="font-mono text-[11px] font-bold text-slate-800 truncate max-w-[150px]">{gateway.pixKey}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Taxa Pix:</span>
                    <span className="font-bold text-emerald-700">
                      {gateway.feePercent === 0 ? '0% Grátis' : `${gateway.feePercent}%`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Conciliação Auto:</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Instantânea
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-[11px]">
                    <span className="text-slate-500">Total Liquidado:</span>
                    <span className="font-mono font-bold text-slate-900">
                      R$ {(gateway.totalSettledAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setSelectedBankForPix(gateway);
                      setIsPixSettled(false);
                      setIsPixModalOpen(true);
                    }}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                    Gerar Pix de Teste
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ESTOQUE CENTRAL VS. EXTERNO (MERCADO LIVRE FULL, AMAZON FBA)       */}
      {/* ========================================================================= */}
      {activeTab === 'multichannel_stock' && (
        <div className="space-y-6">
          {/* Header with Explanation and Search */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-indigo-600" />
                  Gestão em Tempo Real: Estoque Central vs. Estoque Externo (Full/FBA)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Identifique claramente onde está cada item. Vendas nos CDs Full/FBA dão baixa no estoque externo, preservando o estoque central do balcão!
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedProductForTransfer(products[0]);
                    setTransferQty(1);
                    setTransferDestination('meli_full');
                    setIsTransferModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Nova Remessa para Estoque Externo
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-slate-100">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por código da peça, nome do produto ou marca..."
                  value={stockSearchTerm}
                  onChange={(e) => setStockSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setStockFilterCategory('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    stockFilterCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({products.length})
                </button>
                <button
                  onClick={() => setStockFilterCategory('external_only')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    stockFilterCategory === 'external_only' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Com Estoque Externo (Full/FBA)
                </button>
                <button
                  onClick={() => setStockFilterCategory('central_low')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    stockFilterCategory === 'central_low' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Estoque Central Baixo
                </button>
              </div>
            </div>
          </div>

          {/* Multi-Channel Stock Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5 pl-4">Peça / Fabricante</th>
                    <th className="p-3.5 text-center bg-orange-50/40 border-x border-orange-100/60 text-orange-950">
                      Estoque Central (Matriz)
                    </th>
                    <th className="p-3.5 text-center text-amber-900">Meli Full</th>
                    <th className="p-3.5 text-center text-indigo-900">Amazon FBA</th>
                    <th className="p-3.5 text-center text-slate-900">Shopee Ext</th>
                    <th className="p-3.5 text-center bg-indigo-50/40 text-indigo-950 font-black">
                      Total Integrado
                    </th>
                    <th className="p-3.5 text-right">Preço Balcão</th>
                    <th className="p-3.5 pr-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => {
                    const central = getCentralStock(product);
                    const meli = getExternalMeli(product);
                    const amazon = getExternalAmazon(product);
                    const shopee = getExternalShopee(product);
                    const totalExt = getExternalTotal(product);
                    const totalIntegrated = getIntegratedTotal(product);
                    const isCentralLow = central <= product.minStock;

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Product Info */}
                        <td className="p-3.5 pl-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <Boxes className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate max-w-xs">{product.name}</p>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span className="font-mono font-bold text-slate-700">{product.code}</span>
                                <span>•</span>
                                <span>{product.brand}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Central Stock (Matriz / Balcao) */}
                        <td className="p-3.5 text-center bg-orange-50/20 border-x border-orange-100/40">
                          <div className="inline-flex flex-col items-center">
                            <span className={`font-mono text-xs font-black px-2.5 py-0.5 rounded-full ${
                              isCentralLow ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-orange-100 text-orange-800'
                            }`}>
                              {central} un
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">Min: {product.minStock} un</span>
                          </div>
                        </td>

                        {/* Mercado Livre Full */}
                        <td className="p-3.5 text-center">
                          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                            meli > 0 ? 'bg-amber-100 text-amber-900' : 'text-slate-400'
                          }`}>
                            {meli > 0 ? `${meli} un` : '-'}
                          </span>
                        </td>

                        {/* Amazon FBA */}
                        <td className="p-3.5 text-center">
                          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                            amazon > 0 ? 'bg-indigo-100 text-indigo-900' : 'text-slate-400'
                          }`}>
                            {amazon > 0 ? `${amazon} un` : '-'}
                          </span>
                        </td>

                        {/* Shopee External */}
                        <td className="p-3.5 text-center">
                          <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                            shopee > 0 ? 'bg-orange-100 text-orange-900' : 'text-slate-400'
                          }`}>
                            {shopee > 0 ? `${shopee} un` : '-'}
                          </span>
                        </td>

                        {/* Total Integrated */}
                        <td className="p-3.5 text-center bg-indigo-50/20">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono text-xs font-black text-slate-900 px-2 py-0.5 rounded-md bg-white border border-slate-200">
                              {totalIntegrated} un
                            </span>
                            {totalExt > 0 && (
                              <span className="text-[10px] text-indigo-600 font-semibold mt-0.5">
                                ({totalExt} em Full/FBA)
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Sale Price */}
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          R$ {product.sellingPrice.toFixed(2)}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 pr-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedProductForTransfer(product);
                              setTransferQty(1);
                              setTransferDestination('meli_full');
                              setIsTransferModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Transferir para Mercado Livre Full ou Amazon FBA"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            Remessa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transfers History Section */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              Histórico de Remessas para Estoques Externos (Full / FBA)
            </h3>

            <div className="space-y-2.5">
              {stockTransfers.map((trf) => (
                <div
                  key={trf.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">
                        {trf.quantity} un • {trf.productName} ({trf.productCode})
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Origem: CD Central Matriz → Destino: {trf.toLocation === 'meli_full' ? 'Mercado Livre Full' : trf.toLocation === 'amazon_fba' ? 'Amazon FBA' : 'Shopee Hub'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <span className="text-[11px] font-mono text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
                      {trf.trackingDocument}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      Concluída
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LOG DE WEBHOOKS & BAIXAS EM TEMPO REAL                             */}
      {/* ========================================================================= */}
      {activeTab === 'webhook_logs' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-700" />
                Monitor de Webhooks & Auditoria de Baixas de Estoque
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Rastreamento em tempo real de cada evento recebido via API: vendas de balcão, e-commerce, liquidações PIX e despachos Full/FBA
              </p>
            </div>

            <span className="text-xs text-slate-500 font-semibold">
              Total de eventos registrados: <strong>{webhookEvents.length}</strong>
            </span>
          </div>

          <div className="space-y-3">
            {webhookEvents.map((ev) => {
              const isCentral = ev.stockDeductedFrom === 'central';
              const isExternal = ev.stockDeductedFrom === 'meli_full' || ev.stockDeductedFrom === 'amazon_fba' || ev.stockDeductedFrom === 'shopee_external';

              return (
                <div
                  key={ev.id}
                  className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs space-y-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        ev.source === 'ecommerce' ? 'bg-orange-500' :
                        ev.source === 'bank_gateway' ? 'bg-emerald-500' :
                        ev.source === 'mercadolivre' ? 'bg-amber-500' : 'bg-indigo-500'
                      }`} />
                      <span className="text-xs font-bold text-slate-900">{ev.summary}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {ev.eventType}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCentral && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                          Baixa: Estoque Central (-{ev.quantityDeducted} un)
                        </span>
                      )}
                      {isExternal && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          Baixa: Estoque Externo ({ev.stockDeductedFrom?.toUpperCase()})
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium">{ev.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono leading-relaxed">
                    {ev.rawPayloadSummary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TRANSFERÊNCIA DE ESTOQUE (CENTRAL -> EXTERNO FULL/FBA)          */}
      {/* ========================================================================= */}
      {isTransferModalOpen && selectedProductForTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Remessa para Estoque Externo</h3>
                  <p className="text-xs text-slate-500">Transfira saldo da matriz para Mercado Livre Full ou Amazon FBA</p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {/* Selected Product Card */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {selectedProductForTransfer.imageUrl ? (
                  <img
                    src={selectedProductForTransfer.imageUrl}
                    alt={selectedProductForTransfer.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Boxes className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{selectedProductForTransfer.name}</p>
                <p className="text-[11px] text-slate-500">
                  Código: <span className="font-mono font-bold text-slate-800">{selectedProductForTransfer.code}</span> • Saldo Central:{' '}
                  <strong className="text-orange-700">{getCentralStock(selectedProductForTransfer)} un</strong>
                </p>
              </div>
            </div>

            {/* Destination Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Destino do Estoque Externo:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTransferDestination('meli_full')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    transferDestination === 'meli_full'
                      ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold ring-2 ring-amber-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs'
                  }`}
                >
                  <p className="text-xs font-bold">Meli Full</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">CD Cajamar</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTransferDestination('amazon_fba')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    transferDestination === 'amazon_fba'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-950 font-bold ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs'
                  }`}
                >
                  <p className="text-xs font-bold">Amazon FBA</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Prime Hub</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTransferDestination('shopee_external')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    transferDestination === 'shopee_external'
                      ? 'border-orange-500 bg-orange-50 text-orange-950 font-bold ring-2 ring-orange-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs'
                  }`}
                >
                  <p className="text-xs font-bold">Shopee Hub</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Xpress Log</p>
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Quantidade a Transferir:</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={getCentralStock(selectedProductForTransfer)}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-xs text-slate-500">
                  Máximo: {getCentralStock(selectedProductForTransfer)} un
                </span>
              </div>
            </div>

            {/* Fiscal Document Info */}
            <div className="p-3 rounded-xl bg-slate-100 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Emissão Fiscal Automática
              </div>
              <p>O sistema gerará a NF-e de Remessa para Depósito Fechado com CFOP 5905 (ou 6905 interestadual) sem débito de imposto.</p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteTransfer}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Confirmar Remessa & Ajustar Saldos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SIMULADOR DE PEDIDO E-COMMERCE / LANDING PAGE                   */}
      {/* ========================================================================= */}
      {isOrderSimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Simulador de Pedido Online</h3>
                  <p className="text-xs text-slate-500">Teste uma venda vinda da Landing Page e veja a baixa no Estoque Central</p>
                </div>
              </div>
              <button
                onClick={() => setIsOrderSimModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {/* Platform Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Origem do Pedido:</label>
              <select
                value={simPlatform}
                onChange={(e) => setSimPlatform(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="landingpage_gato">Landing Page Própria GATO Autopeças (Vitrine Web)</option>
                <option value="woocommerce">Loja Virtual WooCommerce</option>
                <option value="shopify">Shopify Autopeças Brasil</option>
                <option value="nuvemshop">Nuvemshop Peças Pronta Entrega</option>
              </select>
            </div>

            {/* Product Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Produto Vendido:</label>
              <select
                value={simSelectedProduct.id}
                onChange={(e) => {
                  const found = products.find((p) => p.id === e.target.value);
                  if (found) setSimSelectedProduct(found);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {products.slice(0, 10).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) - Saldo Central: {getCentralStock(p)} un - R$ {p.sellingPrice.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Quantidade:</label>
              <input
                type="number"
                min={1}
                max={getCentralStock(simSelectedProduct)}
                value={simQuantity}
                onChange={(e) => setSimQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500">
                Valor Total: <strong className="text-slate-900">R$ {(simSelectedProduct.sellingPrice * simQuantity).toFixed(2)}</strong>
              </p>
            </div>

            {/* Warning Box */}
            <div className="p-3.5 rounded-2xl bg-orange-50/80 border border-orange-200/80 text-xs text-orange-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-orange-600" />
                Impacto em Tempo Real:
              </p>
              <p className="text-[11px] leading-relaxed">
                Ao disparar este pedido, o sistema dará baixa imediata de <strong>{simQuantity} un</strong> no <strong>Estoque Central</strong> e notificará via webhook o Mercado Livre, Shopee e Amazon para recalcular a disponibilidade.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsOrderSimModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessingSim}
                onClick={handleSimulateEcommerceOrder}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessingSim ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Disparar Pedido & Baixar Estoque
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TESTADOR DE GET BANCÁRIO & PIX DINÂMICO                         */}
      {/* ========================================================================= */}
      {isPixModalOpen && selectedBankForPix && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Get Bancário: Pix Dinâmico</h3>
                  <p className="text-xs text-slate-500">{selectedBankForPix.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsPixModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            {/* QR Code & Status Display */}
            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              <div className="w-48 h-48 rounded-2xl bg-white p-3 border-2 border-emerald-500/40 shadow-inner flex items-center justify-center relative">
                {/* SVG Mock QR Code */}
                <svg className="w-full h-full text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                  <path d="M10 10h30v30h-30z M15 15v20h20v-20z M20 20h10v10h-10z" />
                  <path d="M60 10h30v30h-30z M65 15v20h20v-20z M70 20h10v10h-10z" />
                  <path d="M10 60h30v30h-30z M15 65v20h20v-20z M20 70h10v10h-10z" />
                  <circle cx="50" cy="50" r="10" fill="#059669" />
                  <rect x="45" y="15" width="10" height="25" fill="#0f172a" />
                  <rect x="15" y="45" width="25" height="10" fill="#0f172a" />
                  <rect x="60" y="60" width="15" height="15" fill="#0f172a" />
                  <rect x="80" y="75" width="10" height="15" fill="#0f172a" />
                </svg>

                {isPixSettled && (
                  <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center text-white space-y-2 animate-in fade-in zoom-in-95">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                    <p className="font-black text-sm">PAGAMENTO LIQUIDADO!</p>
                    <p className="text-[11px] text-emerald-200">Venda conciliada no caixa</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-2xl font-black text-slate-900">R$ {pixAmount.toFixed(2)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Beneficiário: GATO Autopeças & Distribuidora LTDA</p>
              </div>
            </div>

            {/* Copia e Cola EMV String */}
            <div className="space-y-1 text-left">
              <label className="text-[11px] font-bold text-slate-600">Código Pix Copia e Cola:</label>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                <span className="truncate text-slate-700">00020126580014br.gov.bcb.pix0136{selectedBankForPix.pixKey}5204000053039865405389.905802BR...</span>
                <button
                  onClick={() => handleCopy('00020126580014br.gov.bcb.pix0136' + selectedBankForPix.pixKey, 'Pix Copia e Cola')}
                  className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer shrink-0"
                  title="Copiar Código Pix"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Simulation Action */}
            <div className="pt-2">
              {!isPixSettled ? (
                <button
                  type="button"
                  onClick={handleSimulatePixSettlement}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  Simular Confirmação do Banco (Webhook SPI)
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPixModalOpen(false)}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Fechar Testador
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: SNIPPET DE INTEGRAÇÃO PARA LANDING PAGE                         */}
      {/* ========================================================================= */}
      {isSnippetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Snippet para Landing Page</h3>
                  <p className="text-xs text-slate-500">Cole este código no seu site/landing page para conectar ao estoque central</p>
                </div>
              </div>
              <button
                onClick={() => setIsSnippetModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Adicione este widget em qualquer página HTML, WordPress, Elementor ou Webflow para permitir que os clientes busquem autopeças por placa ou código OEM e comprem com baixa automática no seu Estoque Central:
            </p>

            {/* Code Box */}
            <div className="relative">
              <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
{`<!-- GATO AutoPeças: Widget de Consulta e Baixa de Estoque Central -->
<div id="gato-pecas-widget" 
     data-store-id="empresa-001" 
     data-api-key="gato_pub_live_79a210d8e"
     data-theme="modern-orange"></div>
<script src="https://api.gato.com.br/v1/widget.js" async></script>`}
              </pre>

              <button
                onClick={() => handleCopy(`<div id="gato-pecas-widget" data-store-id="empresa-001" data-api-key="gato_pub_live_79a210d8e"></div><script src="https://api.gato.com.br/v1/widget.js" async></script>`, 'Código HTML')}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar Código
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-bold text-slate-900">Endpoints RESTful disponíveis:</p>
              <p className="font-mono text-[11px] text-indigo-700">POST /api/connectors/ecommerce/order (Criação de Pedido)</p>
              <p className="font-mono text-[11px] text-indigo-700">GET /api/connectors/ecommerce/catalog (Consulta de Peças e Saldo Central)</p>
              <p className="font-mono text-[11px] text-indigo-700">POST /api/connectors/bank/webhook (Notificação Bancária Pix/Boleto)</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsSnippetModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
