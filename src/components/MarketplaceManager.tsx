import React, { useState } from 'react';
import { 
  Share2, 
  RefreshCw, 
  Webhook, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Sliders, 
  Globe, 
  Zap, 
  Copy, 
  Code2, 
  Clock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { MarketplaceSetting, Product } from '../types';
import { INITIAL_MARKETPLACES } from '../data/initialData';

interface MarketplaceManagerProps {
  marketplaces: MarketplaceSetting[];
  products: Product[];
  onUpdateMarketplaces: (updated: MarketplaceSetting[]) => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

interface WebhookLog {
  id: string;
  channel: string;
  event: string;
  timestamp: string;
  status: '200 OK' | '400 Bad Request';
  payloadSummary: string;
}

export const MarketplaceManager: React.FC<MarketplaceManagerProps> = ({
  marketplaces,
  products,
  onUpdateMarketplaces,
  onShowNotification,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<string>('mercadolivre');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  // Webhook simulator state
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([
    {
      id: 'wh-1',
      channel: 'mercadolivre',
      event: 'orders/v1/created',
      timestamp: 'Hoje, às 09:15:02',
      status: '200 OK',
      payloadSummary: 'Pedido #MLB9418290 criado para o anúncio COF-GP30123 (Amortecedor Gol). Estoque subtraído.',
    },
    {
      id: 'wh-2',
      channel: 'shopee',
      event: 'items/v2/inventory_updated',
      timestamp: 'Hoje, às 11:20:18',
      status: '200 OK',
      payloadSummary: 'Sincronização de saldo: 22 unidades atualizadas para o item DID-KIT520VX3 (Kit Relação CG 160).',
    },
    {
      id: 'wh-3',
      channel: 'amazon',
      event: 'fba/v0/price_match',
      timestamp: 'Hoje, às 12:00:10',
      status: '200 OK',
      payloadSummary: 'Regra de precificação dinâmica validada: Multiplicador 1.22x aplicado com sucesso.',
    }
  ]);

  const activeChannelConfig = marketplaces.find(m => m.channel === selectedChannel) || marketplaces[0] || INITIAL_MARKETPLACES[0];

  // Update channel parameters
  const handleUpdateActiveChannel = (field: keyof MarketplaceSetting, value: any) => {
    const updated = marketplaces.map((m) => {
      if (m.channel === activeChannelConfig.channel) {
        return { ...m, [field]: value };
      }
      return m;
    });
    onUpdateMarketplaces(updated);
  };

  // Trigger Real-time Bi-directional Synchronization
  const handleSyncAllChannels = async () => {
    setIsSyncing(true);
    setLastSyncResult(null);

    // Simulate API calls to Mercado Livre, Shopee and Amazon APIs
    setTimeout(() => {
      setIsSyncing(false);
      const timestamp = new Date().toLocaleTimeString('pt-BR');
      setLastSyncResult(`Sincronização concluída com sucesso às ${timestamp}! ${products.length} anúncios atualizados.`);

      const updated = marketplaces.map(m => ({ ...m, lastSyncAt: `Hoje às ${timestamp}` }));
      onUpdateMarketplaces(updated);

      onShowNotification(
        'Canais de Venda Sincronizados!',
        `Preços com multiplicadores de taxas e saldos de estoque atualizados no Mercado Livre, Shopee e Amazon.`,
        'success'
      );
    }, 1200);
  };

  // Simulate incoming Webhook event
  const handleSimulateWebhook = async (eventType: string) => {
    const newLog: WebhookLog = {
      id: `wh-${Date.now()}`,
      channel: activeChannelConfig.channel,
      event: eventType,
      timestamp: `Agora mesmo (${new Date().toLocaleTimeString('pt-BR')})`,
      status: '200 OK',
      payloadSummary: `Webhook disparado com sucesso: evento ${eventType} recebido para loja ${activeChannelConfig.name}. Preços e estoque recalculados.`,
    };

    setWebhookLogs([newLog, ...webhookLogs]);

    try {
      await fetch('/api/marketplaces/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: activeChannelConfig.channel,
          event: eventType,
          payload: { timestamp: new Date().toISOString(), status: 'synced' },
        }),
      });
    } catch (err) {
      console.warn('Webhook simulation server call failed, handled locally:', err);
    }

    onShowNotification(
      'Webhook Processado!',
      `Evento '${eventType}' simulado com resposta 200 OK.`,
      'info'
    );
  };

  // Reference product price preview across channels
  const refProduct = products[0]; // Amortecedor Gol
  const baseCost = refProduct ? refProduct.unitCost + refProduct.transportCost : 192.50;
  const balcaoPrice = refProduct ? refProduct.sellingPrice : 320.00;
  
  // Specific channel calculated price to maintain net profit
  const calculateChannelSellingPrice = (channel: MarketplaceSetting) => {
    const targetNetMargin = 0.35; // 35%
    // price = (baseCost + channel.fixedFee + channel.freeShippingCost) / (1 - (channel.commissionPercent / 100) - targetNetMargin)
    const factor = 1 - (channel.commissionPercent / 100) - targetNetMargin;
    const price = (baseCost + channel.fixedFee + channel.freeShippingCost) / (factor > 0 ? factor : 0.5);
    return Math.max(balcaoPrice * channel.priceMultiplier, price);
  };

  return (
    <div className="space-y-6" id="view-marketplaces">
      {/* Top Banner - Clean Minimalism */}
      <div className="bg-white rounded-2xl p-5 border border-sky-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0284C7] font-bold text-xs uppercase tracking-wider mb-1">
            <Share2 className="w-4 h-4 text-[#0284C7]" />
            <span>Módulo 6: Gerenciador de Marketplaces & Webhooks</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 font-['Outfit'] tracking-tight">
            Custos Diferenciados, APIs & Automação em Tempo Real
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Configure comissões, taxas fixas e frete embutido para cada canal (Mercado Livre, Shopee, Amazon).
            Sincronize estoque e preços via API e receba webhooks automáticos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-sync-all-marketplaces"
            onClick={handleSyncAllChannels}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Estoque & Preços'}</span>
          </button>
        </div>
      </div>

      {lastSyncResult && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{lastSyncResult}</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-mono">Latência: 74ms • HTTP 200</span>
        </div>
      )}

      {/* Channel Switcher Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {marketplaces.map((m) => {
          const isSelected = m.channel === selectedChannel;
          return (
            <div
              key={m.channel}
              onClick={() => setSelectedChannel(m.channel)}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                isSelected 
                  ? 'bg-sky-50/70 border-[#0284C7] shadow-sm' 
                  : 'bg-white border-slate-200 hover:border-sky-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">{m.name}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${m.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </div>
                <div className="mt-2 space-y-0.5 text-xs text-slate-600">
                  <p>Comissão: <strong className="text-slate-900">{m.commissionPercent}%</strong></p>
                  <p>Taxa Fixa: <strong className="text-slate-900">R$ {m.fixedFee.toFixed(2)}</strong></p>
                  <p>Markup Canal: <strong className="text-amber-600 font-bold">{m.priceMultiplier}x</strong></p>
                </div>
              </div>

              <div className="pt-3 mt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                <span>Sync: {m.lastSyncAt}</span>
                <span className="text-sky-700 font-bold">Editar ➔</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Channel Details & Comparison Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Channel Cost Settings (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-sky-700" />
              <h2 className="text-sm font-extrabold text-slate-900">
                Parâmetros Financeiros: {activeChannelConfig.name}
              </h2>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs font-bold text-slate-700">Canal Ativo</span>
              <input
                type="checkbox"
                checked={activeChannelConfig.enabled}
                onChange={(e) => handleUpdateActiveChannel('enabled', e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {/* Comissão do Marketplace */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Comissão da Plataforma (%)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  value={activeChannelConfig.commissionPercent}
                  onChange={(e) => handleUpdateActiveChannel('commissionPercent', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 text-center"
                />
                <span className="text-xs font-bold text-slate-500">%</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Ex: ML 16.5%, Shopee 14%</span>
            </div>

            {/* Taxa Fixa por Pedido */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Taxa Fixa por Venda (R$)
              </label>
              <input
                type="number"
                step="0.5"
                value={activeChannelConfig.fixedFee}
                onChange={(e) => handleUpdateActiveChannel('fixedFee', parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 text-center"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Custo por anúncio / etiqueta</span>
            </div>

            {/* Custo de Frete Grátis Obrigatório */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Frete Médio Embutido (R$)
              </label>
              <input
                type="number"
                step="0.5"
                value={activeChannelConfig.freeShippingCost}
                onChange={(e) => handleUpdateActiveChannel('freeShippingCost', parseFloat(e.target.value) || 0)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 text-center"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Para anúncios com frete grátis</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            {/* Multiplicador de Preço */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Multiplicador Automático de Preço (vs. Balcão)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="1.0"
                  max="2.5"
                  value={activeChannelConfig.priceMultiplier}
                  onChange={(e) => handleUpdateActiveChannel('priceMultiplier', parseFloat(e.target.value) || 1)}
                  className="w-28 p-2 bg-white border border-slate-300 rounded-lg font-black text-amber-700 text-center text-sm"
                />
                <span className="text-xs text-slate-600">
                  (Ex: 1.25x = +25% sobre o preço do balcão para cobrir taxas do canal)
                </span>
              </div>
            </div>

            {/* Automações */}
            <div className="space-y-2 bg-sky-50/50 p-3 rounded-xl border border-sky-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={activeChannelConfig.autoSyncStock}
                  onChange={(e) => handleUpdateActiveChannel('autoSyncStock', e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span>Sincronizar Estoque Automaticamente a cada Venda</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={activeChannelConfig.autoSyncPrice}
                  onChange={(e) => handleUpdateActiveChannel('autoSyncPrice', e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded"
                />
                <span>Repassar aumentos de custo para os anúncios da plataforma</span>
              </label>
            </div>
          </div>

          {/* SIMULATION CARD: Compare Prices on this item */}
          <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-amber-400 block">
              Simulação de Preço de Venda na Prática: {refProduct?.name}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <span className="text-[9px] text-slate-400 block uppercase">Preço Balcão</span>
                <span className="font-mono font-bold text-sm text-white">R$ {balcaoPrice.toFixed(2)}</span>
                <span className="text-[9px] text-slate-400 block">0% comissão</span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <span className="text-[9px] text-slate-400 block uppercase">Preço no Canal</span>
                <span className="font-mono font-bold text-sm text-amber-400">
                  R$ {(balcaoPrice * activeChannelConfig.priceMultiplier).toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-400 block">+{((activeChannelConfig.priceMultiplier - 1) * 100).toFixed(0)}% markup</span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <span className="text-[9px] text-slate-400 block uppercase">Taxas do Canal</span>
                <span className="font-mono font-bold text-sm text-rose-400">
                  -R$ {((balcaoPrice * activeChannelConfig.priceMultiplier) * (activeChannelConfig.commissionPercent / 100) + activeChannelConfig.fixedFee).toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-400 block">Comissão + Taxa</span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded-lg">
                <span className="text-[9px] text-slate-400 block uppercase">Lucro Líquido Real</span>
                <span className="font-mono font-bold text-sm text-emerald-400">
                  R$ {((balcaoPrice * activeChannelConfig.priceMultiplier) * (1 - activeChannelConfig.commissionPercent / 100) - activeChannelConfig.fixedFee - baseCost).toFixed(2)}
                </span>
                <span className="text-[9px] text-emerald-300 block font-semibold">Margem protegida</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: API, Webhooks & Logs (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* API & Webhook Configuration */}
          <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-amber-500" />
                <h3 className="font-extrabold text-slate-900">
                  Endpoint de Webhook & Chave de API
                </h3>
              </div>
              <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                Conectado
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                URL de Webhook Cadastrada no Marketplace:
              </label>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-2 rounded-lg">
                <span className="font-mono text-[11px] text-slate-800 truncate flex-1">
                  {activeChannelConfig.webhookUrl}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeChannelConfig.webhookUrl);
                    onShowNotification('Copiado!', 'URL do Webhook copiada para a área de transferência.', 'info');
                  }}
                  className="p-1 text-slate-500 hover:text-slate-800"
                  title="Copiar URL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Chave de API / Token de Integração:
              </label>
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-2 rounded-lg">
                <span className="font-mono text-[11px] text-slate-800 truncate flex-1">
                  {activeChannelConfig.apiKeyMasked}
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">Válida</span>
              </div>
            </div>

            {/* Interactive Webhook Simulator Buttons */}
            <div className="pt-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1.5">
                Simular Disparo de Webhook da Plataforma:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSimulateWebhook('orders/v1/new_sale')}
                  className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-900 rounded-lg text-xs font-bold border border-sky-200 flex items-center justify-center gap-1 transition active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Simular Nova Venda</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSimulateWebhook('stock/v2/delta_sync')}
                  className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-900 rounded-lg text-xs font-bold border border-sky-200 flex items-center justify-center gap-1 transition active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                  <span>Simular Saldo Estoque</span>
                </button>
              </div>
            </div>
          </div>

          {/* Webhook Activity Stream / Log */}
          <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-700" />
                <h3 className="font-extrabold text-slate-900 text-xs">
                  Histórico de Webhooks em Tempo Real
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Últimos eventos</span>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {webhookLogs.map((log) => (
                <div key={log.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-black bg-sky-900 text-white px-1.5 py-0.2 rounded uppercase">
                        {log.channel}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-slate-800 truncate max-w-[150px]">
                        {log.event}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      {log.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">{log.payloadSummary}</p>
                  <span className="text-[9px] text-slate-400 block text-right">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
