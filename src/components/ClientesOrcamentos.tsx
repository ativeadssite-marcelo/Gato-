import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ArrowRight, 
  Percent, 
  Building2, 
  Car, 
  Truck, 
  ShieldCheck, 
  Phone, 
  Mail, 
  MapPin, 
  Printer, 
  Share2, 
  Edit3, 
  AlertCircle,
  Eye,
  Check,
  RotateCcw,
  MessageCircle,
  ExternalLink,
  LayoutGrid,
  Table as TableIcon,
  CreditCard,
  UserCheck,
  Ban,
  Download
} from 'lucide-react';
import { Customer, CustomerType, CustomerDiscountPolicy, Quote, QuoteStatus, Product, MarketingLead, CompanyProfile } from '../types';
import { DEFAULT_DISCOUNT_POLICIES } from '../data/initialData';
import { downloadLogoFormat } from '../utils/logoDownloadKit';
import { CustomerModal } from './CustomerModal';
import { CustomerDetailModal } from './CustomerDetailModal';
import { CupomFiscalModal } from './CupomFiscalModal';
import { MarketingLeadsTab } from './MarketingLeadsTab';
import { syncQuoteToMarketingLead } from '../utils/quoteMarketingSync';

interface ClientesOrcamentosProps {
  initialTab?: 'orcamentos' | 'clientes' | 'politicas' | 'leads_marketing';
  customers: Customer[];
  quotes: Quote[];
  products: Product[];
  leads?: MarketingLead[];
  companyProfile?: CompanyProfile | null;
  onUpdateCustomers: (customers: Customer[]) => void;
  onUpdateQuotes: (quotes: Quote[]) => void;
  onUpdateLeads?: (leads: MarketingLead[]) => void;
  onConvertQuoteToSale: (quote: Quote) => void;
  onNavigateToQuoteWithCustomer?: (customer: Customer) => void;
  onTabChange?: (tab: 'orcamentos' | 'clientes' | 'politicas' | 'leads_marketing') => void;
  onShowNotification: (title: string, message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const ClientesOrcamentos: React.FC<ClientesOrcamentosProps> = ({
  initialTab = 'orcamentos',
  customers,
  quotes,
  products,
  leads = [],
  companyProfile,
  onUpdateCustomers,
  onUpdateQuotes,
  onUpdateLeads,
  onConvertQuoteToSale,
  onNavigateToQuoteWithCustomer,
  onTabChange,
  onShowNotification,
}) => {
  // Tabs: 'orcamentos' | 'clientes' | 'politicas' | 'leads_marketing'
  const [activeTab, setActiveTab] = useState<'orcamentos' | 'clientes' | 'politicas' | 'leads_marketing'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabSelect = (tab: 'orcamentos' | 'clientes' | 'politicas' | 'leads_marketing') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Search and filters
  const [searchQuoteTerm, setSearchQuoteTerm] = useState('');
  const [selectedQuoteStatus, setSelectedQuoteStatus] = useState<string>('all');
  const [searchCustomerTerm, setSearchCustomerTerm] = useState('');
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>('all');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<string>('all');
  const [customerViewMode, setCustomerViewMode] = useState<'grid' | 'table'>('table');

  // Customer Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [viewingCustomerDetail, setViewingCustomerDetail] = useState<Customer | null>(null);

  // Selected customer for detail drawer or modal
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  // Selected quote for detail modal
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);

  // Cupom Fiscal & WhatsApp state
  const [cupomQuote, setCupomQuote] = useState<Quote | null>(null);
  const [isCupomModalOpen, setIsCupomModalOpen] = useState(false);

  const handleOpenCupomForQuote = (q: Quote) => {
    setCupomQuote(q);
    setIsCupomModalOpen(true);
  };

  // Discount policies state (configurable)
  const [policies, setPolicies] = useState<CustomerDiscountPolicy[]>(DEFAULT_DISCOUNT_POLICIES);
  const [editingPolicy, setEditingPolicy] = useState<CustomerDiscountPolicy | null>(null);

  // Filtered quotes
  const filteredQuotes = quotes.filter(q => {
    const term = searchQuoteTerm.toLowerCase();
    const matchesSearch = 
      q.quoteNumber.toLowerCase().includes(term) ||
      q.customerName.toLowerCase().includes(term) ||
      q.customerDocument.includes(term) ||
      q.items.some(it => it.productName.toLowerCase().includes(term) || it.productCode.toLowerCase().includes(term));
    const matchesStatus = selectedQuoteStatus === 'all' || q.status === selectedQuoteStatus;
    return matchesSearch && matchesStatus;
  });

  // Filtered customers
  const filteredCustomers = customers.filter(c => {
    const term = searchCustomerTerm.toLowerCase();
    const matchesSearch = 
      c.name.toLowerCase().includes(term) ||
      (c.fantasyName && c.fantasyName.toLowerCase().includes(term)) ||
      c.document.includes(term) ||
      (c.ie && c.ie.toLowerCase().includes(term)) ||
      c.phone.includes(term) ||
      (c.whatsapp && c.whatsapp.includes(term)) ||
      c.city.toLowerCase().includes(term)

    const matchesType = selectedCustomerType === 'all' || c.type === selectedCustomerType;
    const matchesStatus = customerStatusFilter === 'all' || (c.status || 'ativo') === customerStatusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Format currency
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Helper type badge
  const renderCustomerTypeBadge = (type: CustomerType) => {
    switch (type) {
      case 'frotista':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
            <Truck className="w-3 h-3" />
            Frotista & Transportadora
          </span>
        );
      case 'mecanica':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
            <Building2 className="w-3 h-3" />
            Oficina Mecânica
          </span>
        );
      case 'cliente_fiel':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
            <ShieldCheck className="w-3 h-3" />
            Cliente Fiel
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
            <Car className="w-3 h-3" />
            Consumidor Final
          </span>
        );
    }
  };

  // Status badge for quote
  const renderQuoteStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'Convertido':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-300 px-2.5 py-0.5 rounded-full font-black text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Convertido em Venda (NF-e)
          </span>
        );
      case 'Aprovado':
        return (
          <span className="inline-flex items-center gap-1 bg-sky-50 text-[#0284C7] border border-sky-300 px-2.5 py-0.5 rounded-full font-black text-[11px]">
            <Check className="w-3 h-3 text-[#0284C7]" />
            Aprovado pelo Cliente
          </span>
        );
      case 'Recusado':
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
            <XCircle className="w-3 h-3 text-rose-500" />
            Recusado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
            <Clock className="w-3 h-3 text-amber-600" />
            Pendente no Balcão
          </span>
        );
    }
  };

  // Convert quote to sale handler
  const handleConvertQuote = (quote: Quote) => {
    if (quote.status === 'Convertido') {
      onShowNotification('Aviso', 'Este orçamento já foi convertido em venda e faturado.', 'info');
      return;
    }
    onConvertQuoteToSale(quote);
  };

  // Update quote status
  const handleSetQuoteStatus = (quoteId: string, newStatus: QuoteStatus) => {
    const updated = quotes.map(q => q.id === quoteId ? { ...q, status: newStatus } : q);
    onUpdateQuotes(updated);
    onShowNotification(
      'Status do Orçamento Atualizado',
      `Orçamento marcado como ${newStatus}.`,
      'info'
    );
  };

  // Open New Customer Modal
  const handleOpenNewCustomer = () => {
    setCustomerToEdit(null);
    setIsCustomerModalOpen(true);
  };

  // Open Edit Customer Modal
  const handleOpenEditCustomer = (cust: Customer) => {
    setCustomerToEdit(cust);
    setIsCustomerModalOpen(true);
  };

  // Open Customer Detail 360 Modal
  const handleOpenCustomerDetail = (cust: Customer) => {
    setViewingCustomerDetail(cust);
  };

  // Save Customer (Create or Update)
  const handleSaveCustomer = (savedCustomer: Customer) => {
    const existingIndex = customers.findIndex(c => c.id === savedCustomer.id);
    let updated: Customer[];
    if (existingIndex >= 0) {
      updated = [...customers];
      updated[existingIndex] = savedCustomer;
      onShowNotification(
        'Cliente Atualizado!',
        `Os dados de ${savedCustomer.name} foram atualizados com sucesso.`,
        'success'
      );
    } else {
      updated = [savedCustomer, ...customers];
      onShowNotification(
        'Cliente Cadastrado!',
        `${savedCustomer.name} adicionado com política de desconto de ${savedCustomer.discountRate}%.`,
        'success'
      );
    }
    onUpdateCustomers(updated);
    setIsCustomerModalOpen(false);
    setCustomerToEdit(null);
  };

  // Delete Customer
  const handleDeleteCustomer = (customerId: string) => {
    const cust = customers.find(c => c.id === customerId);
    const updated = customers.filter(c => c.id !== customerId);
    onUpdateCustomers(updated);
    if (viewingCustomerDetail?.id === customerId) {
      setViewingCustomerDetail(null);
    }
    onShowNotification(
      'Cliente Removido',
      `O cadastro de ${cust?.name || 'cliente'} foi excluído com sucesso.`,
      'info'
    );
  };

  // Update policy
  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;

    setPolicies(policies.map(p => p.type === editingPolicy.type ? editingPolicy : p));
    setEditingPolicy(null);
    onShowNotification(
      'Política de Desconto Atualizada!',
      `Nível ${editingPolicy.label} agora possui ${editingPolicy.defaultDiscountPercent}% de desconto padrão.`,
      'success'
    );
  };

  return (
    <div className="space-y-6" id="view-clientes-orcamentos">
      
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-sky-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[#0284C7] font-bold text-xs uppercase tracking-wider mb-1">
            <Users className="w-4 h-4 text-[#0284C7]" />
            <span>Gestão Comercial: Orçamentos, Clientes & Níveis de Desconto</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 font-['Outfit'] tracking-tight">
            Orçamentos & Relacionamento de Clientes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Cotações rápidas com políticas de desconto por perfil (Consumidor, Cliente Fiel, Mecânica e Frotista), histórico completo e conversão em venda com NF-e e baixa automática no estoque.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenNewCustomer}
            id="btn-open-new-customer"
            className="flex items-center gap-2 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-orange-400" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl p-1.5 border border-sky-50 shadow-xs flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleTabSelect('orcamentos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'orcamentos' 
              ? 'bg-[#0C4A6E] text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Histórico de Orçamentos ({quotes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('clientes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'clientes' 
              ? 'bg-[#0C4A6E] text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cadastro de Clientes ({customers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('politicas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'politicas' 
              ? 'bg-[#0C4A6E] text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>Políticas de Desconto por Nível</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabSelect('leads_marketing')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'leads_marketing' 
              ? 'bg-emerald-700 text-white shadow-xs' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageCircle className="w-4 h-4 text-emerald-400" />
          <span>Leads & Marketing WhatsApp ({leads.length})</span>
        </button>
      </div>

      {/* TAB 1: HISTÓRICO DE ORÇAMENTOS */}
      {activeTab === 'orcamentos' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-sky-50 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar por número do orçamento, nome do cliente, CPF/CNPJ ou peça cotada..."
                value={searchQuoteTerm}
                onChange={(e) => setSearchQuoteTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white text-slate-900"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs">
              {['all', 'Pendente', 'Aprovado', 'Convertido', 'Recusado'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedQuoteStatus(st)}
                  className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition ${
                    selectedQuoteStatus === st
                      ? 'bg-[#0284C7] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'all' ? 'Todos' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Quotes List Table */}
          <div className="bg-white rounded-2xl border border-sky-50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Cotação & Data</th>
                    <th className="py-3 px-4">Cliente / Perfil</th>
                    <th className="py-3 px-4 text-center">Itens</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Desconto</th>
                    <th className="py-3 px-4 text-right">Total Final</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Nenhum orçamento encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredQuotes.map((quote) => (
                      <tr key={quote.id} className="hover:bg-sky-50/40 transition">
                        <td className="py-3 px-4">
                          <div className="font-mono font-black text-[#0C4A6E]">
                            {quote.quoteNumber}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(quote.createdAt).toLocaleDateString('pt-BR')} • Válido até {new Date(quote.validUntil).toLocaleDateString('pt-BR')}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{quote.customerName}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-400">{quote.customerDocument}</span>
                            {renderCustomerTypeBadge(quote.customerType)}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <span className="inline-block bg-slate-100 px-2 py-0.5 rounded-full font-bold font-mono text-slate-700">
                            {quote.items.length} un
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {formatBRL(quote.subtotalAmount)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-emerald-600 font-bold">
                          - {formatBRL(quote.discountAmount)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-black text-slate-900 text-sm">
                            {formatBRL(quote.totalAmount)}
                          </span>
                          <div className="text-[10px] text-slate-400">
                            ICMS: {formatBRL(quote.taxAmount)}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {renderQuoteStatusBadge(quote.status)}
                          {quote.convertedNfeNumber && (
                            <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                              NF-e: {quote.convertedNfeNumber}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenCupomForQuote(quote)}
                              className="flex items-center gap-1 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              title="Emitir Orçamento Estilo Cupom Fiscal (80mm)"
                            >
                              <Printer className="w-3.5 h-3.5 text-orange-600" />
                              <span className="hidden lg:inline">Cupom</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenCupomForQuote(quote)}
                              className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              title="Enviar Orçamento para o WhatsApp do Cliente"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden lg:inline">WhatsApp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setViewingQuote(quote)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                              title="Visualizar Detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {quote.status !== 'Convertido' && (
                              <button
                                type="button"
                                onClick={() => handleConvertQuote(quote)}
                                className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg text-[11px] shadow-xs transition active:scale-95 cursor-pointer"
                                title="Faturar, Dar Baixa no Estoque e Emitir NF-e"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Converter em Venda (NF-e)</span>
                              </button>
                            )}

                            {quote.status === 'Pendente' && (
                              <button
                                type="button"
                                onClick={() => handleSetQuoteStatus(quote.id, 'Aprovado')}
                                className="p-1.5 text-[#0284C7] hover:bg-sky-50 rounded-lg transition"
                                title="Marcar como Aprovado"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CADASTRO E GESTÃO DE CLIENTES */}
      {activeTab === 'clientes' && (
        <div className="space-y-4">
          
          {/* Executive KPI Summary for Customers */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Clientes</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{customers.length}</div>
              <span className="text-[10px] text-slate-400">Base cadastrada</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Clientes Ativos</span>
              <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">
                {customers.filter(c => (c.status || 'ativo') === 'ativo').length}
              </div>
              <span className="text-[10px] text-emerald-800">Aptos para faturar</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-2xs">
              <span className="text-[10px] font-bold text-orange-800 uppercase block">Oficinas Mecânicas</span>
              <div className="text-xl font-black text-[#EA580C] font-mono mt-0.5">
                {customers.filter(c => c.type === 'mecanica').length}
              </div>
              <span className="text-[10px] text-[#EA580C]">Parceiros VIP</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-2xs">
              <span className="text-[10px] font-bold text-purple-800 uppercase block">Frotistas / Cargas</span>
              <div className="text-xl font-black text-purple-700 font-mono mt-0.5">
                {customers.filter(c => c.type === 'frotista').length}
              </div>
              <span className="text-[10px] text-purple-800">Linha pesada</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-sky-100 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-[#0C4A6E] uppercase block">Limite Concedido</span>
              <div className="text-base font-black text-[#0C4A6E] font-mono mt-1 truncate">
                {formatBRL(customers.reduce((acc, c) => acc + (c.creditLimit || 0), 0))}
              </div>
              <span className="text-[10px] text-[#0C4A6E]">Crédito a prazo</span>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-sky-50 shadow-sm flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nome, fantasia, CPF/CNPJ, IE, telefone, cidade..."
                  value={searchCustomerTerm}
                  onChange={(e) => setSearchCustomerTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:bg-white text-slate-900"
                />
              </div>

              {/* View Mode Toggle and Add Button */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCustomerViewMode('grid')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      customerViewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Visualização em Cards"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerViewMode('table')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      customerViewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Visualização em Tabela"
                  >
                    <TableIcon className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleOpenNewCustomer}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-orange-400" />
                  <span>Novo Cliente</span>
                </button>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" /> Tipo:
                </span>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'consumidor', label: 'Consumidor' },
                  { id: 'cliente_fiel', label: 'Cliente Fiel' },
                  { id: 'mecanica', label: 'Oficinas' },
                  { id: 'frotista', label: 'Frotistas' },
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedCustomerType(t.id)}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition ${
                      selectedCustomerType === t.id ? 'bg-[#0284C7] text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Status filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Status:</span>
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'ativo', label: 'Ativos' },
                  { id: 'bloqueado', label: 'Bloqueados' },
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setCustomerStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                      customerStatusFilter === st.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* CUSTOMERS CONTENT: GRID VIEW */}
          {customerViewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-sky-50 shadow-sm p-6 space-y-3">
                  <Users className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="font-bold text-slate-700 text-sm">Nenhum cliente encontrado</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Tente ajustar seus termos de busca ou cadastre um novo cliente agora mesmo.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenNewCustomer}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0C4A6E] text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    <Plus className="w-4 h-4 text-orange-400" />
                    <span>Cadastrar Primeiro Cliente</span>
                  </button>
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const customerQuotes = quotes.filter(q => q.customerId === c.id || q.customerDocument === c.document);
                  const cleanPhone = c.whatsapp ? c.whatsapp.replace(/\D/g, '') : c.phone ? c.phone.replace(/\D/g, '') : '';
                  const isBlocked = c.status === 'bloqueado';

                  return (
                    <div 
                      key={c.id} 
                      className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between hover:border-[#0284C7] transition ${
                        isBlocked ? 'border-rose-200 bg-rose-50/20' : 'border-sky-50'
                      }`}
                    >
                      <div className="space-y-3">
                        
                        {/* Header card: Name, Badge and Status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-sm text-[#0C4A6E] shrink-0 border border-slate-200">
                              {c.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-extrabold text-slate-800 text-sm leading-tight hover:text-[#0284C7] transition cursor-pointer"
                                  onClick={() => handleOpenCustomerDetail(c)}
                                >
                                  {c.name}
                                </h3>
                                {isBlocked && (
                                  <span className="bg-rose-100 text-rose-700 text-[9px] font-bold px-1.5 py-0.2 rounded-sm uppercase">
                                    Bloqueado
                                  </span>
                                )}
                              </div>
                              {c.fantasyName && (
                                <p className="text-[11px] font-bold text-orange-600 mt-0.5 truncate max-w-[200px]">
                                  {c.fantasyName}
                                </p>
                              )}
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                {c.document} {c.ie ? `• IE: ${c.ie}` : ''}
                              </p>
                            </div>
                          </div>

                          <div>{renderCustomerTypeBadge(c.type)}</div>
                        </div>

                        {/* Contacts and Address */}
                        <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono">{c.phone || 'Sem telefone'}</span>
                            </div>

                            {cleanPhone && (
                              <a
                                href={`https://wa.me/55${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition"
                                title="Abrir WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{c.email || 'E-mail não cadastrado'}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">
                              {c.address ? `${c.address}, ` : ''}{c.city} - {c.uf}
                            </span>
                          </div>
                        </div>

                        {/* Policy and stats */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Desconto Fixo</span>
                            <span className="text-sm font-black text-emerald-700 font-mono">{c.discountRate}% OFF</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Limite Crédito</span>
                            <span className="text-xs font-bold text-slate-800 font-mono">
                              {formatBRL(c.creditLimit || 2000)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Orçamentos</span>
                            <span className="text-sm font-black text-[#0C4A6E] font-mono">{customerQuotes.length} reg.</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Actions */}
                      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenCustomerDetail(c)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#0284C7] rounded-lg text-xs font-bold transition cursor-pointer"
                            title="Ver Ficha Completa do Cliente"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ficha 360°</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditCustomer(c)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                            title="Editar Janela do Cliente"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        </div>

                        {onNavigateToQuoteWithCustomer && (
                          <button
                            type="button"
                            onClick={() => onNavigateToQuoteWithCustomer(c)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-bold rounded-lg text-xs shadow-xs transition active:scale-95 cursor-pointer"
                          >
                            <span>Nova Cotação</span>
                            <ArrowRight className="w-3 h-3 text-orange-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* CUSTOMERS CONTENT: TABLE VIEW */}
          {customerViewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-sky-50 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 pl-4">Cliente / Razão Social</th>
                      <th className="p-3">Documento & Contato</th>
                      <th className="p-3">Perfil & Nível</th>
                      <th className="p-3 text-center">Desconto</th>
                      <th className="p-3 text-right">Limite Crédito</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right pr-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          Nenhum cliente encontrado com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c) => {
                        const isBlocked = c.status === 'bloqueado';
                        return (
                          <tr key={c.id} className="hover:bg-sky-50/30 transition">
                            <td className="p-3 pl-4">
                              <div 
                                className="font-extrabold text-slate-900 hover:text-[#0284C7] cursor-pointer"
                                onClick={() => handleOpenCustomerDetail(c)}
                              >
                                {c.name}
                              </div>
                              {c.fantasyName && (
                                <div className="text-[11px] text-orange-600 font-bold">{c.fantasyName}</div>
                              )}
                              <div className="text-[11px] text-slate-400">{c.city} - {c.uf}</div>
                            </td>

                            <td className="p-3 font-mono text-[11px]">
                              <div>{c.document}</div>
                              <div className="text-slate-500 font-sans">{c.phone || c.whatsapp || '-'}</div>
                            </td>

                            <td className="p-3">
                              {renderCustomerTypeBadge(c.type)}
                            </td>

                            <td className="p-3 text-center font-mono font-bold text-emerald-700">
                              {c.discountRate}% OFF
                            </td>

                            <td className="p-3 text-right font-mono font-bold text-slate-800">
                              {formatBRL(c.creditLimit || 2000)}
                            </td>

                            <td className="p-3 text-center">
                              {isBlocked ? (
                                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  Bloqueado
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                  Ativo
                                </span>
                              )}
                            </td>

                            <td className="p-3 pr-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCustomerDetail(c)}
                                  className="p-1.5 text-[#0284C7] hover:bg-sky-50 rounded-lg transition cursor-pointer"
                                  title="Ver Ficha 360°"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCustomer(c)}
                                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title="Editar Janela do Cliente"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                {onNavigateToQuoteWithCustomer && (
                                  <button
                                    type="button"
                                    onClick={() => onNavigateToQuoteWithCustomer(c)}
                                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                    title="Nova Cotação"
                                  >
                                    <ArrowRight className="w-4 h-4" />
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
          )}
        </div>
      )}

      {/* TAB 3: POLÍTICAS DE DESCONTO POR NÍVEL */}
      {activeTab === 'politicas' && (
        <div className="space-y-4">
          <div className="bg-sky-50/70 p-4 rounded-2xl border border-sky-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#0284C7] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600">
              <h4 className="font-bold text-slate-800 text-sm">Políticas de Desconto no Balcão</h4>
              <p className="mt-0.5">
                Defina o percentual de desconto concedido automaticamente a cada categoria de cliente ao abrir um orçamento. A taxa pode ser ajustada individualmente na cotação caso o vendedor possua alçada comercial.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {policies.map((pol) => (
              <div 
                key={pol.type}
                className="bg-white rounded-2xl p-5 border border-sky-50 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    {renderCustomerTypeBadge(pol.type)}
                    <span className="text-xl font-black text-[#0C4A6E] font-mono">
                      {pol.defaultDiscountPercent}%
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm mb-1">{pol.label}</h3>
                  <p className="text-xs text-slate-500">{pol.description}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingPolicy(pol)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 hover:border-[#0284C7] rounded-lg text-xs font-bold text-slate-700 hover:text-[#0284C7] transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Configurar Alíquota</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: LEADS & MARKETING CRM */}
      {activeTab === 'leads_marketing' && (
        <MarketingLeadsTab
          leads={leads}
          companyProfile={companyProfile}
          onUpdateLeads={(newLeads) => {
            onUpdateLeads?.(newLeads);
          }}
          onOpenQuoteCupom={(quoteNumber) => {
            const found = quotes.find(q => q.quoteNumber === quoteNumber);
            if (found) {
              handleOpenCupomForQuote(found);
            } else {
              onShowNotification('Orçamento Localizado', `Buscando dados do DAV ${quoteNumber}...`, 'info');
            }
          }}
          onShowNotification={onShowNotification}
        />
      )}

      {/* JANELA DO CLIENTE (CADASTRO E EDIÇÃO AVANÇADA COM ABAS, CNPJ/CEP & VEÍCULOS) */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setCustomerToEdit(null);
        }}
        customerToEdit={customerToEdit}
        policies={policies}
        onSaveCustomer={handleSaveCustomer}
        onDeleteCustomer={handleDeleteCustomer}
        onShowNotification={onShowNotification}
      />

      {/* FICHA 360° DO CLIENTE (HISTÓRICO, CRÉDITO, VEÍCULOS E WHATSAPP) */}
      <CustomerDetailModal
        isOpen={Boolean(viewingCustomerDetail)}
        onClose={() => setViewingCustomerDetail(null)}
        customer={viewingCustomerDetail}
        quotes={quotes}
        onEditCustomer={(cust) => {
          setViewingCustomerDetail(null);
          handleOpenEditCustomer(cust);
        }}
        onNavigateToQuote={onNavigateToQuoteWithCustomer}
        onConvertQuote={handleConvertQuote}
        onShowNotification={onShowNotification}
      />

      {/* MODAL: CONFIGURAR ALÍQUOTA DE POLÍTICA */}
      {editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-sky-100 space-y-4">
            <h3 className="font-extrabold text-slate-800 text-base">
              Ajustar Política: {editingPolicy.label}
            </h3>
            <form onSubmit={handleSavePolicy} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Percentual de Desconto Padrão (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={editingPolicy.defaultDiscountPercent}
                  onChange={(e) => setEditingPolicy({ 
                    ...editingPolicy, 
                    defaultDiscountPercent: parseFloat(e.target.value) || 0 
                  })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono font-bold text-lg text-center text-[#0284C7]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descrição do Nível
                </label>
                <textarea
                  rows={3}
                  value={editingPolicy.description}
                  onChange={(e) => setEditingPolicy({ 
                    ...editingPolicy, 
                    description: e.target.value 
                  })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0C4A6E] hover:bg-[#0C4A6E]/90 text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Política
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DE COTAÇÕES POR CLIENTE */}
      {selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl border border-sky-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">
                  Histórico de Orçamentos: {selectedCustomerForHistory.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {selectedCustomerForHistory.document} • {selectedCustomerForHistory.discountRate}% desconto configurado
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForHistory(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 text-xs">
              {quotes.filter(q => q.customerId === selectedCustomerForHistory.id || q.customerDocument === selectedCustomerForHistory.document).length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Nenhum orçamento registrado para este cliente ainda.
                </div>
              ) : (
                quotes.filter(q => q.customerId === selectedCustomerForHistory.id || q.customerDocument === selectedCustomerForHistory.document).map(q => (
                  <div key={q.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#0C4A6E]">{q.quoteNumber}</span>
                        {renderQuoteStatusBadge(q.status)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        {q.items.length} peça(s) cotada(s) • Criado em {new Date(q.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="font-mono font-black text-slate-900 text-sm">
                          {formatBRL(q.totalAmount)}
                        </span>
                        <div className="text-[10px] text-emerald-600 font-mono">
                          Desc: {formatBRL(q.discountAmount)}
                        </div>
                      </div>

                      {q.status !== 'Convertido' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerForHistory(null);
                            handleConvertQuote(q);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs"
                        >
                          Faturar NF-e
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomerForHistory(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VISUALIZAR DETALHES DO ORÇAMENTO (LAYOUT PRONTO PARA IMPRESSÃO/WHATSAPP) */}
      {viewingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl border border-sky-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-800 text-base">
                    Orçamento Comercial: {viewingQuote.quoteNumber}
                  </h3>
                  {renderQuoteStatusBadge(viewingQuote.status)}
                </div>
                <p className="text-xs text-slate-500">
                  Cliente: <strong>{viewingQuote.customerName}</strong> ({viewingQuote.customerDocument})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingQuote(null)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quote details list */}
            <div className="overflow-y-auto space-y-2 flex-1 text-xs">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="py-2 px-3">Item / Código</th>
                      <th className="py-2 px-3 text-center">Qtd</th>
                      <th className="py-2 px-3 text-right">Unitário</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {viewingQuote.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-800">{it.productName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{it.productCode} • {it.locationStr}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatBRL(it.finalUnitPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">{formatBRL(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals box */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal da Tabela:</span>
                  <span className="font-mono">{formatBRL(viewingQuote.subtotalAmount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Desconto Concedido:</span>
                  <span className="font-mono">- {formatBRL(viewingQuote.discountAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Estimativa Tributária ICMS:</span>
                  <span className="font-mono">{formatBRL(viewingQuote.taxAmount)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-900 font-black text-sm">
                  <span>Valor Total da Cotação:</span>
                  <span className="font-mono text-base text-[#0C4A6E]">{formatBRL(viewingQuote.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const q = viewingQuote;
                    setViewingQuote(null);
                    handleOpenCupomForQuote(q);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                  title="Emitir Cupom Fiscal Térmico 80mm"
                >
                  <Printer className="w-4 h-4 text-orange-200" />
                  <span>Cupom Fiscal (80mm)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const q = viewingQuote;
                    setViewingQuote(null);
                    handleOpenCupomForQuote(q);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                  title="Enviar Orçamento para o WhatsApp do Cliente"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-200" />
                  <span>Enviar WhatsApp & CRM</span>
                </button>

                {companyProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      downloadLogoFormat(companyProfile, 'banner');
                      onShowNotification?.('Download Concluído', 'Cabeçalho da empresa baixado para personalização do orçamento.', 'success');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-sky-700 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                    title="Baixar Banner com Logo da Empresa para Personalizar Orçamento"
                  >
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>Baixar Logo / Banner</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingQuote(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700 text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Fechar
                </button>
                {viewingQuote.status !== 'Convertido' && (
                  <button
                    type="button"
                    onClick={() => {
                      const q = viewingQuote;
                      setViewingQuote(null);
                      handleConvertQuote(q);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    Converter em Venda & Emitir NF-e
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUPOM FISCAL TÉRMICO E DISPARO WHATSAPP */}
      <CupomFiscalModal
        isOpen={isCupomModalOpen}
        onClose={() => setIsCupomModalOpen(false)}
        quote={cupomQuote}
        onQuoteSentWhatsapp={(updatedQuote) => {
          const updatedQuotes = quotes.map(q => q.id === updatedQuote.id ? updatedQuote : q);
          onUpdateQuotes(updatedQuotes);
          if (onUpdateLeads) {
            const { updatedLeads } = syncQuoteToMarketingLead(updatedQuote, leads);
            onUpdateLeads(updatedLeads);
          }
        }}
        onShowNotification={onShowNotification}
      />

    </div>
  );
};
