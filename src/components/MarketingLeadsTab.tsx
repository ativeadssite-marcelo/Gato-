import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  Download,
  MessageCircle,
  Car,
  Tag,
  DollarSign,
  TrendingUp,
  Clock,
  Send,
  ExternalLink,
  Plus,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { MarketingLead, MarketingLeadStatus, Quote, CompanyProfile } from '../types';
import { exportMarketingLeadsToCSV, sendWhatsappMessage } from '../utils/quoteMarketingSync';

interface MarketingLeadsTabProps {
  leads: MarketingLead[];
  companyProfile?: CompanyProfile | null;
  onUpdateLeads: (leads: MarketingLead[]) => void;
  onOpenQuoteCupom?: (quoteNumber: string) => void;
  onShowNotification?: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const MarketingLeadsTab: React.FC<MarketingLeadsTabProps> = ({
  leads,
  companyProfile,
  onUpdateLeads,
  onOpenQuoteCupom,
  onShowNotification
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('all');

  const companyBrandName = companyProfile?.tradeName || 'GATO Autopeças';

  // Remarketing Campaign Modal
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [selectedLeadForDirectMsg, setSelectedLeadForDirectMsg] = useState<MarketingLead | null>(null);
  const [campaignTemplateType, setCampaignTemplateType] = useState<'desconto' | 'validade' | 'revisao'>('desconto');
  const [customCampaignMessage, setCustomCampaignMessage] = useState('');

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Extract unique vehicles & categories for filtering
  const allVehicles = Array.from(new Set(leads.map(l => l.vehicleModel?.split(' ')[0]).filter(Boolean))) as string[];
  const allCategories = ['Freios', 'Suspensão', 'Filtros e Óleo', 'Embreagem', 'Elétrica', 'Pneus'];

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      lead.name.toLowerCase().includes(term) ||
      lead.whatsapp.toLowerCase().includes(term) ||
      (lead.document && lead.document.includes(term)) ||
      (lead.vehicleModel && lead.vehicleModel.toLowerCase().includes(term)) ||
      (lead.vehiclePlate && lead.vehiclePlate.toLowerCase().includes(term)) ||
      lead.lastQuoteNumber.toLowerCase().includes(term) ||
      lead.tags.some(t => t.toLowerCase().includes(term));

    const matchesCategory =
      selectedCategoryFilter === 'all' ||
      lead.quotedCategories.includes(selectedCategoryFilter) ||
      lead.tags.some(t => t.toLowerCase().includes(selectedCategoryFilter.toLowerCase()));

    const matchesStatus =
      selectedStatusFilter === 'all' || lead.status === selectedStatusFilter;

    const matchesVehicle =
      selectedVehicleFilter === 'all' ||
      (lead.vehicleModel && lead.vehicleModel.toLowerCase().includes(selectedVehicleFilter.toLowerCase()));

    return matchesSearch && matchesCategory && matchesStatus && matchesVehicle;
  });

  // KPIs
  const totalLeadsCount = leads.length;
  const totalQuotedPipeline = leads.reduce((acc, l) => acc + l.lastQuoteAmount, 0);
  const convertedLeadsCount = leads.filter(l => l.status === 'convertido').length;
  const conversionRate = totalLeadsCount > 0 ? ((convertedLeadsCount / totalLeadsCount) * 100).toFixed(1) : '0';
  const whatsappReadyCount = leads.filter(l => Boolean(l.whatsapp?.replace(/\D/g, ''))).length;

  const handleExportCSV = () => {
    if (leads.length === 0) {
      onShowNotification?.('Base Vazia', 'Nenhum lead encontrado para exportar.', 'warning');
      return;
    }
    exportMarketingLeadsToCSV(filteredLeads);
    onShowNotification?.('Planilha Gerada!', 'Base de leads exportada em formato CSV para campanhas de marketing.', 'success');
  };

  const handleOpenLeadWhatsapp = (lead: MarketingLead) => {
    setSelectedLeadForDirectMsg(lead);
    const firstName = lead.name.split(' ')[0] || 'Cliente';
    const vehicle = lead.vehicleModel || 'seu veículo';
    
    let defaultText = '';
    if (campaignTemplateType === 'desconto') {
      defaultText = `Olá, *${firstName}*! Tudo bem? 🚗💨\n\nAqui é da *${companyBrandName}*!\nNotamos que você realizou uma cotação para o *${vehicle}* (Orçamento: \`${lead.lastQuoteNumber}\`).\n\nConseguimos uma condição especial de *5% de desconto extra* ou parcelamento facilitado caso você feche hoje mesmo! 💥\n\nPodemos separar os itens para retirada ou entrega? 🛠️`;
    } else if (campaignTemplateType === 'validade') {
      defaultText = `Olá, *${firstName}*! Tudo bem?\n\nPassando para avisar que a cotação \`${lead.lastQuoteNumber}\` para o *${vehicle}* no valor de *${formatBRL(lead.lastQuoteAmount)}* está próxima do vencimento da tabela.\n\nQuer garantir o preço e a disponibilidade das peças antes de sofrer reajuste de fábrica? 📦`;
    } else {
      defaultText = `Olá, *${firstName}*! Tudo bem? 🛠️\n\nAqui é da *${companyBrandName}*! Vimos que você cotou peças para o seu *${vehicle}*.\n\nEstamos com uma campanha especial para a linha de ${lead.quotedCategories[0] || 'peças automotivas'}. Precisa de suporte técnico ou de um orçamento complementar?`;
    }

    setCustomCampaignMessage(defaultText);
    setIsCampaignModalOpen(true);
  };

  const handleSendCampaignMessage = () => {
    if (!selectedLeadForDirectMsg) return;
    const phone = selectedLeadForDirectMsg.whatsapp || selectedLeadForDirectMsg.phone || '';
    if (!phone) {
      onShowNotification?.('WhatsApp Ausente', 'Este lead não possui telefone válido cadastrado.', 'warning');
      return;
    }

    const ok = sendWhatsappMessage(phone, customCampaignMessage);
    if (ok) {
      // update lead contacted count
      const updated = leads.map(l => {
        if (l.id === selectedLeadForDirectMsg.id) {
          return {
            ...l,
            whatsappSentCount: (l.whatsappSentCount || 0) + 1,
            lastContactedAt: new Date().toISOString(),
            status: l.status === 'cotado' ? 'em_negociacao' : l.status
          };
        }
        return l;
      });
      onUpdateLeads(updated);
      setIsCampaignModalOpen(false);
      onShowNotification?.(
        'Mensagem Encaminhada!',
        `Conversa de marketing aberta no WhatsApp de ${selectedLeadForDirectMsg.name}.`,
        'success'
      );
    }
  };

  const handleUpdateStatus = (leadId: string, newStatus: MarketingLeadStatus) => {
    const updated = leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l);
    onUpdateLeads(updated);
    onShowNotification?.('Status Atualizado', `Lead atualizado para "${newStatus}".`, 'info');
  };

  const renderStatusBadge = (status: MarketingLeadStatus) => {
    switch (status) {
      case 'novo_lead':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">Novo Lead</span>;
      case 'cotado':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">Cotado (Aguardando)</span>;
      case 'em_negociacao':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">Em Negociação</span>;
      case 'convertido':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">Convertido em Venda</span>;
      case 'oportunidade_remarketing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-200">Remarketing</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4" id="view-marketing-leads">
      
      {/* Top Banner explaining the Database sync */}
      <div className="bg-gradient-to-r from-emerald-900 via-[#0C4A6E] to-slate-900 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
              CRM & Base de Cotações
            </span>
            <h3 className="font-black text-base sm:text-lg">
              Banco de Dados para Campanhas de Marketing via WhatsApp
            </h3>
          </div>
          <p className="text-xs text-slate-200 max-w-2xl leading-relaxed">
            Cada cotação ou orçamento gerado no balcão indexa o cliente, telefone com WhatsApp, veículo e categorias de peças cotadas. Use esta base para disparar ofertas segmentadas, lembretes de revisão e remarketing para fechar negócios parados!
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Base (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Leads de Cotação</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{totalLeadsCount}</div>
          <span className="text-[10px] text-emerald-700 font-medium">{whatsappReadyCount} com WhatsApp ativo</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Potencial em Cotações</span>
          <div className="text-xl font-black text-[#0C4A6E] font-mono mt-0.5">{formatBRL(totalQuotedPipeline)}</div>
          <span className="text-[10px] text-slate-400">Total cotado no balcão</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase block">Convertidos em Venda</span>
          <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">{convertedLeadsCount}</div>
          <span className="text-[10px] text-emerald-800">Orçamentos faturados</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-2xs">
          <span className="text-[10px] font-bold text-orange-700 uppercase block">Taxa de Conversão</span>
          <div className="text-xl font-black text-[#EA580C] font-mono mt-0.5">{conversionRate}%</div>
          <span className="text-[10px] text-slate-400">Meta: 35%+</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-sky-50 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar lead por nome, WhatsApp, veículo (Gol, Hilux), placa, orçamento ou tags (#Freio, #TicketAlto)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            {/* Status Filter */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todos os Status</option>
              <option value="cotado">Cotado (Aguardando Retorno)</option>
              <option value="em_negociacao">Em Negociação</option>
              <option value="oportunidade_remarketing">Oportunidade de Remarketing</option>
              <option value="convertido">Convertido em Venda</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Todas as Categorias</option>
              {allCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Vehicle Chips */}
        {allVehicles.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Filtrar Veículo:</span>
            <button
              type="button"
              onClick={() => setSelectedVehicleFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedVehicleFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({leads.length})
            </button>
            {allVehicles.map(veh => (
              <button
                key={veh}
                type="button"
                onClick={() => setSelectedVehicleFilter(veh)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  selectedVehicleFilter === veh
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {veh}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                <th className="py-3.5 px-4">Cliente / Contato</th>
                <th className="py-3.5 px-4">Veículo Cotado</th>
                <th className="py-3.5 px-4">Último Orçamento</th>
                <th className="py-3.5 px-4">Interesse & Tags</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Ações de Marketing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">Nenhum lead encontrado para estes filtros.</p>
                    <p className="text-[11px]">Faça novas cotações no Balcão para alimentar sua base automaticamente.</p>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition group">
                    
                    {/* Customer Name & Phone */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="font-black text-slate-900 text-xs">{lead.name}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-mono font-bold mt-0.5">
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>{lead.whatsapp || lead.phone || 'Sem telefone'}</span>
                      </div>
                      {lead.document && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Doc: {lead.document}
                        </span>
                      )}
                    </td>

                    {/* Vehicle */}
                    <td className="py-3.5 px-4 align-middle">
                      {lead.vehicleModel ? (
                        <div>
                          <div className="flex items-center gap-1 font-bold text-slate-800 text-[11px]">
                            <Car className="w-3.5 h-3.5 text-orange-600" />
                            <span>{lead.vehicleModel}</span>
                          </div>
                          {lead.vehiclePlate && (
                            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200 mt-0.5 inline-block">
                              {lead.vehiclePlate}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Não informado</span>
                      )}
                    </td>

                    {/* Last Quote */}
                    <td className="py-3.5 px-4 align-middle">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenQuoteCupom?.(lead.lastQuoteNumber)}
                          className="font-mono font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded border border-sky-200 transition cursor-pointer"
                          title="Abrir Cupom Fiscal deste orçamento"
                        >
                          {lead.lastQuoteNumber}
                        </button>
                      </div>
                      <div className="font-mono font-black text-xs text-[#0C4A6E] mt-0.5">
                        {formatBRL(lead.lastQuoteAmount)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(lead.lastQuotedAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>

                    {/* Tags & Categories */}
                    <td className="py-3.5 px-4 align-middle max-w-xs">
                      <div className="flex flex-wrap gap-1">
                        {lead.quotedCategories.map(cat => (
                          <span key={cat} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[9px] font-bold">
                            {cat}
                          </span>
                        ))}
                        {lead.tags.slice(0, 3).map(t => (
                          <span key={t} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-medium">
                            #{t}
                          </span>
                        ))}
                      </div>
                      {lead.quotedItemsSummary && (
                        <p className="text-[10px] text-slate-500 truncate mt-1 max-w-[220px]" title={lead.quotedItemsSummary}>
                          {lead.quotedItemsSummary}
                        </p>
                      )}
                    </td>

                    {/* Status Dropdown */}
                    <td className="py-3.5 px-4 align-middle text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        {renderStatusBadge(lead.status)}
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateStatus(lead.id, e.target.value as MarketingLeadStatus)}
                          className="text-[9px] font-bold text-slate-500 bg-transparent border-0 hover:underline cursor-pointer focus:outline-none"
                        >
                          <option value="novo_lead">Novo Lead</option>
                          <option value="cotado">Cotado</option>
                          <option value="em_negociacao">Negociando</option>
                          <option value="oportunidade_remarketing">Remarketing</option>
                          <option value="convertido">Convertido</option>
                        </select>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 align-middle text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenLeadWhatsapp(lead)}
                          className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-xs transition active:scale-95 cursor-pointer"
                          title="Disparar mensagem no WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenQuoteCupom?.(lead.lastQuoteNumber)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                          title="Ver Cupom do Orçamento"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {lead.whatsappSentCount ? (
                        <span className="text-[9px] text-slate-400 block mt-1">
                          {lead.whatsappSentCount} contato(s) realizado(s)
                        </span>
                      ) : null}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: DISPARO DE CAMPANHA / REMARKETING NO WHATSAPP */}
      {isCampaignModalOpen && selectedLeadForDirectMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Disparo de Remarketing WhatsApp
                  </h3>
                  <p className="text-xs text-slate-500">
                    Lead: <strong>{selectedLeadForDirectMsg.name}</strong> • {selectedLeadForDirectMsg.whatsapp}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCampaignModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Modelo de Abordagem:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCampaignTemplateType('desconto');
                    const firstName = selectedLeadForDirectMsg.name.split(' ')[0];
                    setCustomCampaignMessage(
                      `Olá, *${firstName}*! Tudo bem? 🚗💨\n\nAqui é da *${companyBrandName}*!\nNotamos que você realizou uma cotação para o *${selectedLeadForDirectMsg.vehicleModel || 'seu veículo'}* (Orçamento: \`${selectedLeadForDirectMsg.lastQuoteNumber}\`).\n\nConseguimos uma condição especial de *5% de desconto extra* ou parcelamento facilitado caso você feche hoje mesmo! 💥\n\nPodemos separar os itens para retirada ou entrega? 🛠️`
                    );
                  }}
                  className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                    campaignTemplateType === 'desconto'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  🎉 Cupom 5% Fechamento
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCampaignTemplateType('validade');
                    const firstName = selectedLeadForDirectMsg.name.split(' ')[0];
                    setCustomCampaignMessage(
                      `Olá, *${firstName}*! Tudo bem?\n\nPassando para avisar que a cotação \`${selectedLeadForDirectMsg.lastQuoteNumber}\` para o *${selectedLeadForDirectMsg.vehicleModel || 'seu veículo'}* no valor de *${formatBRL(selectedLeadForDirectMsg.lastQuoteAmount)}* está próxima do vencimento da tabela.\n\nQuer garantir o preço e a disponibilidade das peças antes de sofrer reajuste de fábrica? 📦`
                    );
                  }}
                  className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                    campaignTemplateType === 'validade'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  ⏳ Validade Cotação
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCampaignTemplateType('revisao');
                    const firstName = selectedLeadForDirectMsg.name.split(' ')[0];
                    setCustomCampaignMessage(
                      `Olá, *${firstName}*! Tudo bem? 🛠️\n\nAqui é da *${companyBrandName}*! Vimos que você cotou peças para o seu *${selectedLeadForDirectMsg.vehicleModel || 'seu veículo'}*.\n\nEstamos com uma campanha especial para a linha de ${selectedLeadForDirectMsg.quotedCategories[0] || 'peças automotivas'}. Precisa de suporte técnico ou de um orçamento complementar?`
                    );
                  }}
                  className={`p-2 rounded-xl text-center text-xs font-bold border transition cursor-pointer ${
                    campaignTemplateType === 'revisao'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  🔧 Revisão & Peças
                </button>
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Mensagem Personalizada:</label>
              <textarea
                rows={7}
                value={customCampaignMessage}
                onChange={(e) => setCustomCampaignMessage(e.target.value)}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800 leading-relaxed"
              />
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCampaignModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSendCampaignMessage}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Enviar para o WhatsApp</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
