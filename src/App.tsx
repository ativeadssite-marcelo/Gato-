import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { XmlNfeImport } from './components/XmlNfeImport';
import { BalcaoCotacao } from './components/BalcaoCotacao';
import { EstoqueManager } from './components/EstoqueManager';
import { EmissaoNfe } from './components/EmissaoNfe';
import { MarketplaceManager } from './components/MarketplaceManager';
import { PedidosLogistica } from './components/PedidosLogistica';
import { RelatoriosFinanceiros } from './components/RelatoriosFinanceiros';
import { SuporteChatIA } from './components/SuporteChatIA';
import { ConfiguracoesSaaS } from './components/ConfiguracoesSaaS';
import { ClientesOrcamentos } from './components/ClientesOrcamentos';
import { GestaoFrotaVeiculos } from './components/GestaoFrotaVeiculos';
import { ConsultaAplicacaoPecas } from './components/ConsultaAplicacaoPecas';
import { OrdemServicoManager } from './components/OrdemServicoManager';
import { EmpresaFiliaisManager } from './components/EmpresaFiliaisManager';
import { LoginArea } from './components/LoginArea';
import { LoginPage } from './components/LoginPage';
import { TrocaFilialCdModal } from './components/TrocaFilialCdModal';
import { FinanceiroCompleto } from './components/FinanceiroCompleto';
import { CatalogoDigitalWeb } from './components/CatalogoDigitalWeb';
import { ConsultaPecasView } from './components/ConsultaPecasView';
import { FornecedoresManager } from './components/FornecedoresManager';
import { ConnectorsManager } from './components/ConnectorsManager';
import { AdminImpostosFiscal } from './components/AdminImpostosFiscal';
import { AdminRbacMultiTenant } from './components/AdminRbacMultiTenant';
import { AssinaturaFaturas } from './components/AssinaturaFaturas';
import { DashboardFinanceiroSaaS } from './components/DashboardFinanceiroSaaS';
import { ConfiguracaoBancoDados } from './components/ConfiguracaoBancoDados';
import { CamadasAcesso } from './components/CamadasAcesso';
import { MasterPasswordModal } from './components/MasterPasswordModal';
import { SubscriptionBlockedScreen } from './components/SubscriptionBlockedScreen';
import {
  isElevatedAdmin,
  isRestrictedView,
  verifyMasterPassword,
  grantAdminUnlock,
  hasValidAdminUnlock,
  revokeAdminUnlock,
  RESTRICTED_VIEWS,
} from './utils/accessControl';

import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_SUPPLIERS,
  INITIAL_MARKETPLACES, 
  INITIAL_ORDERS, 
  INITIAL_INVOICES, 
  INITIAL_NOTIFICATIONS,
  INITIAL_QUOTES,
  INITIAL_BRANCHES,
  INITIAL_SERVICE_ORDERS,
  INITIAL_PAYABLES,
  INITIAL_RECEIVABLES,
  INITIAL_BANK_TRANSACTIONS,
  INITIAL_MDFE,
  AVAILABLE_USERS,
  DEFAULT_COMPANY_PROFILE,
  INITIAL_MARKETING_LEADS,
} from './data/initialData';
import { 
  Product, 
  Order, 
  Customer, 
  Supplier,
  InvoiceRecord, 
  MarketplaceSetting, 
  PushNotification, 
  OrderStatus, 
  Quote, 
  UserSession, 
  VehicleFleetItem, 
  CompanyProfile, 
  ServiceOrder, 
  BranchUnit,
  FinancialPayable,
  FinancialReceivable,
  BankTransaction,
  MdfeRecord,
  MarketingLead
} from './types';
import { syncQuoteToMarketingLead } from './utils/quoteMarketingSync';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { onUnauthorized, hasSessionToken, clearSessionToken, apiJson } from './services/apiClient';
import { fetchServerSession, logoutSession, buildUserSession } from './utils/sessionService';
import type { SubscriptionStatus, TenantSubscription } from './types/billing';

export default function App() {
  // Company Profile & Nome Fantasia State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => {
    try {
      const saved = localStorage.getItem('gato_company_profile');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read company profile from storage', e);
    }
    return DEFAULT_COMPANY_PROFILE;
  });

  const handleUpdateCompanyProfile = (newProfile: CompanyProfile) => {
    setCompanyProfile(newProfile);
    try {
      localStorage.setItem('gato_company_profile', JSON.stringify(newProfile));
    } catch (e) {
      console.warn('Could not save company profile', e);
    }
  };

  // Authentication & CD Session State
  const [userSession, setUserSession] = useState<UserSession | null>(() => {
    // SEGURANÇA: o estado local é apenas um espelho da sessão REAL.
    // Sem token de sessão assinado não existe sessão — o visitante começa no
    // login, em vez de herdar silenciosamente o perfil de outro usuário
    // (antes qualquer pessoa abria o app já "logada" como vendedor/admin).
    if (!hasSessionToken()) return null;
    try {
      const saved = localStorage.getItem('gato_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read user session from storage', e);
    }
    return null;
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isTrocaFilialOpen, setIsTrocaFilialOpen] = useState(false);

  // Global Application State
  const [currentView, setCurrentView] = useState<string>(() => {
    if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/superadmin') || window.location.hash === '#superadmin')) {
      return 'admin';
    }
    return 'consulta-pecas';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ===== Controle de acesso a telas administrativas restritas =====
  const [pendingRestrictedView, setPendingRestrictedView] = useState<string | null>(null);
  const [showMasterPasswordModal, setShowMasterPasswordModal] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(() => hasValidAdminUnlock(userSession));

  // ===== Enforcement de acesso por status da assinatura (espelho da regra server-side) =====
  // O middleware já bloqueia as APIs; aqui só refletimos o status para mostrar a
  // tela de reativação quando o tenant estiver expirado/suspenso/cancelado.
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [subscriptionPlanName, setSubscriptionPlanName] = useState<string>('');

  const refreshSubscriptionStatus = useCallback(async () => {
    if (!userSession || userSession.isSaasScope) {
      setSubscriptionStatus(null);
      setSubscriptionPlanName('');
      return;
    }
    try {
      const res = await apiJson<{ success: boolean; subscription: TenantSubscription | null }>('/api/billing/subscription');
      setSubscriptionStatus(res.subscription?.status ?? 'trial');
      setSubscriptionPlanName(res.subscription?.planName ?? '');
    } catch {
      // Falha ao consultar: não bloqueia a UI (a autoridade é o servidor).
      setSubscriptionStatus(null);
      setSubscriptionPlanName('');
    }
  }, [userSession]);

  useEffect(() => {
    void refreshSubscriptionStatus();
  }, [refreshSubscriptionStatus]);

  // ===== Verificação da sessão real contra o servidor =====
  // O espelho do localStorage nunca é autoridade: no mount confirmamos o token
  // com /api/auth/me e reconstruímos o papel/tenant a partir da resposta.
  useEffect(() => {
    if (!hasSessionToken()) {
      try {
        localStorage.removeItem('gato_user_session');
      } catch {
        /* noop */
      }
      return;
    }
    let cancelled = false;
    (async () => {
      const context = await fetchServerSession();
      if (cancelled) return;
      if (!context || !context.success) {
        clearSessionToken();
        try {
          localStorage.removeItem('gato_user_session');
        } catch {
          /* noop */
        }
        setUserSession(null);
        revokeAdminUnlock();
        setAdminUnlocked(false);
        return;
      }
      const branchList = (() => {
        try {
          const saved = localStorage.getItem('gato_branches');
          return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
        } catch {
          return INITIAL_BRANCHES;
        }
      })();
      const savedBranchId = (() => {
        try {
          return localStorage.getItem('gato_active_store') || undefined;
        } catch {
          return undefined;
        }
      })();
      const verifiedSession = buildUserSession(context.user, branchList, savedBranchId, context.role?.permissions, context.isSaasScope);
      setUserSession(verifiedSession);
      try {
        localStorage.setItem('gato_user_session', JSON.stringify(verifiedSession));
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sessão recusada pelo servidor (401): derruba o estado local e volta ao login.
  useEffect(() => {
    const dispose = onUnauthorized(() => {
      setUserSession(null);
      setAdminUnlocked(false);
      setPendingRestrictedView(null);
      revokeAdminUnlock();
      try {
        localStorage.removeItem('gato_user_session');
      } catch {
        /* noop */
      }
      setCurrentView('login');
      showNotification('Sessão Expirada', 'Sua sessão foi encerrada por segurança. Faça login novamente.', 'warning');
    });
    return dispose;
  }, []);

  // Toda navegação de view passa por aqui — aplica a política de acesso.
  const handleSelectView = (view: string) => {
    // Se o usuário saiu da área admin, derruba a elevação
    if (!isRestrictedView(view)) {
      if (pendingRestrictedView) setPendingRestrictedView(null);
    }

    if (isRestrictedView(view)) {
      // Sem papel de admin: nem tenta — nega silenciosamente (item nem aparece no menu)
      if (!isElevatedAdmin(userSession)) {
        showNotification('Acesso Negado', 'Área administrativa restrita a administradores.', 'warning');
        return;
      }
      // Admin, mas sem elevação válida: exige senha master
      if (!hasValidAdminUnlock(userSession)) {
        setPendingRestrictedView(view);
        setShowMasterPasswordModal(true);
        return;
      }
    }

    setCurrentView(view);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Toda view administrativa/SaaS mantém a rota /superadmin, não apenas
      // 'admin'/'admin-impostos' — evita "voltar" para / ao abrir Governança,
      // Financeiro SaaS, Banco de Dados ou Camadas de Acesso.
      const isAdminView = isRestrictedView(currentView);
      if (isAdminView && window.location.pathname !== '/superadmin') {
        window.history.pushState({}, '', '/superadmin');
      } else if (!isAdminView && window.location.pathname === '/superadmin') {
        window.history.pushState({}, '', '/');
      }
    }
  }, [currentView]);

  // Multi-branch state with persistence
  const [branches, setBranches] = useState<BranchUnit[]>(() => {
    try {
      const saved = localStorage.getItem('gato_branches');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read branches from storage', e);
    }
    return INITIAL_BRANCHES;
  });

  const handleUpdateBranches = (newBranches: BranchUnit[]) => {
    setBranches(newBranches);
    try {
      localStorage.setItem('gato_branches', JSON.stringify(newBranches));
    } catch (e) {
      console.warn('Could not save branches to storage', e);
    }
  };

  const [activeStore, setActiveStore] = useState(() => {
    try {
      const savedStore = localStorage.getItem('gato_active_store');
      if (savedStore) return savedStore;
    } catch (e) {
      console.warn(e);
    }
    return 'matriz-ms';
  });
  const activeBranch = branches.find(b => b.id === activeStore) || branches[0] || INITIAL_BRANCHES[0];

  // Entities State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const saved = localStorage.getItem('gato_customers');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Erro ao carregar clientes do localStorage', e);
    }
    return INITIAL_CUSTOMERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('gato_customers', JSON.stringify(customers));
    } catch (e) {
      console.warn('Erro ao salvar clientes no localStorage', e);
    }
  }, [customers]);

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem('gato_suppliers');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Erro ao carregar fornecedores do localStorage', e);
    }
    return INITIAL_SUPPLIERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('gato_suppliers', JSON.stringify(suppliers));
    } catch (e) {
      console.warn('Erro ao salvar fornecedores no localStorage', e);
    }
  }, [suppliers]);
  const [marketplaces, setMarketplaces] = useState<MarketplaceSetting[]>(INITIAL_MARKETPLACES);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(INITIAL_INVOICES);
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [notifications, setNotifications] = useState<PushNotification[]>(INITIAL_NOTIFICATIONS);
  const [payables, setPayables] = useState<FinancialPayable[]>(INITIAL_PAYABLES);
  const [receivables, setReceivables] = useState<FinancialReceivable[]>(INITIAL_RECEIVABLES);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(INITIAL_BANK_TRANSACTIONS);
  const [mdfeRecords, setMdfeRecords] = useState<MdfeRecord[]>(INITIAL_MDFE);
  const [selectedCustomerForQuote, setSelectedCustomerForQuote] = useState<Customer | null>(null);
  const [selectedVehicleForQuote, setSelectedVehicleForQuote] = useState<VehicleFleetItem | null>(null);
  const [selectedProductForQuote, setSelectedProductForQuote] = useState<Product | null>(null);
  const [lastIssuedInvoiceId, setLastIssuedInvoiceId] = useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>(() => {
    try {
      const saved = localStorage.getItem('gato_service_orders');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load service orders from localStorage', e);
    }
    return INITIAL_SERVICE_ORDERS;
  });

  const handleUpdateServiceOrders = (orders: ServiceOrder[]) => {
    setServiceOrders(orders);
    try {
      localStorage.setItem('gato_service_orders', JSON.stringify(orders));
    } catch (e) {
      console.warn('Could not save service orders to localStorage', e);
    }
  };

  // Marketing Leads & CRM WhatsApp database
  const [marketingLeads, setMarketingLeads] = useState<MarketingLead[]>(() => {
    try {
      const saved = localStorage.getItem('gato_marketing_leads');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load marketing leads from localStorage', e);
    }
    return INITIAL_MARKETING_LEADS;
  });

  const handleUpdateMarketingLeads = (newLeads: MarketingLead[]) => {
    setMarketingLeads(newLeads);
    try {
      localStorage.setItem('gato_marketing_leads', JSON.stringify(newLeads));
    } catch (e) {
      console.warn('Could not save marketing leads to localStorage', e);
    }
  };

  // Active Toast Notification Banner
  const [toast, setToast] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  const showNotification = (title: string, message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const newNotif: PushNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type: type === 'warning' ? 'warning' : type === 'info' ? 'info' : 'success',
      timestamp: 'Agora mesmo',
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);

    setToast({
      id: newNotif.id,
      title,
      message,
      type,
    });

    setTimeout(() => {
      setToast(current => (current?.id === newNotif.id ? null : current));
    }, 4500);
  };

  const handleMarkNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  // Handlers for products
  const handleAddNewProduct = (newProd: Product) => {
    setProducts(prev => [newProd, ...prev]);
  };

  const handleUpdateProductStock = (productId: string, quantityToAdd: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          stock: p.stock + quantityToAdd,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    }));
  };

  // Handlers for invoices
  const handleAddNewInvoice = (inv: InvoiceRecord) => {
    setInvoices(prev => [inv, ...prev]);
  };

  // Handlers for orders
  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  // Handler for converting a quote to sale and issuing NF-e
  const handleEmitNfeFromQuote = (quoteData: any) => {
    const sefazUf = activeBranch.sefazCode; // '50' for MS
    const cleanCnpj = activeBranch.cnpj.replace(/\D/g, '').padEnd(14, '0');
    const newNumber = (124995 + invoices.length).toString();
    const newKey = `${sefazUf}2609${cleanCnpj}55001000${newNumber}1829381920`;

    const isInternal = (quoteData.customer?.uf || 'MS') === activeBranch.uf;
    const taxRate = isInternal ? 0.17 : 0.18; // 17% MS internal ICMS

    const newInvoice: InvoiceRecord = {
      id: `inv-venda-${Date.now()}`,
      type: 'venda',
      number: `000.${newNumber.slice(0, 3)}.${newNumber.slice(3)}`,
      series: '1',
      accessKey: newKey,
      issuedAt: new Date().toISOString(),
      partyName: quoteData.customer.name,
      partyDocument: quoteData.customer.document,
      partyAddress: quoteData.customer.address || `${quoteData.customer.city || 'Campo Grande'}/${quoteData.customer.uf || 'MS'}`,
      totalProducts: quoteData.totalAmount,
      totalTaxes: quoteData.totalAmount * taxRate,
      totalAmount: quoteData.totalAmount,
      itemsCount: quoteData.items.length,
      sefazStatus: 'Autorizada',
      danfeProtocol: `1${sefazUf}260${Math.floor(100000000 + Math.random() * 900000000)}`,
      channel: 'balcao',
      vehicleInfo: quoteData.vehicle ? {
        plate: quoteData.vehicle.plate,
        model: quoteData.vehicle.model,
        year: quoteData.vehicle.year,
        engine: quoteData.vehicle.engine,
        km: quoteData.vehicle.km,
        chassis: quoteData.vehicle.chassis,
      } : undefined,
      itemsList: quoteData.items.map((it: any) => ({
        code: it.productCode,
        name: it.productName,
        quantity: it.quantity,
        unitPrice: it.finalUnitPrice,
        total: it.total,
      })),
      quoteNumber: quoteData.quoteNumber || `DAV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      paymentMethod: quoteData.paymentMethod || 'Dinheiro',
    };

    setInvoices(prev => [newInvoice, ...prev]);
    setLastIssuedInvoiceId(newInvoice.id);

    // Create corresponding order
    const newOrder: Order = {
      id: `ord-${Date.now().toString().slice(-4)}`,
      orderNumber: `PED-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      channel: 'balcao',
      customerName: quoteData.customer.name,
      customerDocument: quoteData.customer.document,
      customerType: quoteData.customer.type,
      items: quoteData.items.map((it: any) => ({
        code: it.productCode,
        name: it.productName,
        quantity: it.quantity,
        unitPrice: it.finalUnitPrice,
        costPrice: it.costPrice,
        total: it.total,
      })),
      totalAmount: quoteData.totalAmount,
      costAmount: quoteData.items.reduce((acc: number, it: any) => acc + it.costPrice * it.quantity, 0),
      profitAmount: quoteData.totalAmount * 0.35,
      marginPercent: 35.0,
      channelFee: 0,
      carrier: 'Retirada Balcão',
      trackingStatus: 'Pronto para Retirada',
      status: 'Pago',
      createdAt: new Date().toISOString(),
      nfeNumber: newInvoice.number,
      nfeKey: newInvoice.accessKey,
      nfeIssued: true,
    };

    setOrders(prev => [newOrder, ...prev]);

    // Deduct stock for each quoted item
    quoteData.items.forEach((it: any) => {
      handleUpdateProductStock(it.productId, -it.quantity);
    });

    setCurrentView('nfe-venda');
    showNotification(
      'Venda Faturada & NF-e Emitida!',
      `Nota fiscal nº ${newInvoice.number} emitida e saldo de estoque atualizado no galpão.`,
      'success'
    );
  };

  // Handler for saving a quote from BalcaoCotacao
  const handleSaveQuote = (newQuote: Quote) => {
    setQuotes(prev => {
      const exists = prev.some(q => q.id === newQuote.id);
      if (exists) {
        return prev.map(q => q.id === newQuote.id ? newQuote : q);
      }
      return [newQuote, ...prev];
    });

    // Auto-sync into Marketing Leads & CRM WhatsApp database
    const { updatedLeads, isNew } = syncQuoteToMarketingLead(newQuote, marketingLeads);
    handleUpdateMarketingLeads(updatedLeads);

    showNotification(
      'Orçamento Gravado!',
      `Orçamento ${newQuote.quoteNumber} (${newQuote.customerName}) salvo.${isNew ? ' Lead capturado para remarketing WhatsApp!' : ''}`,
      'success'
    );
  };

  // Handler for converting a quote to sale from ClientesOrcamentos
  const handleConvertQuoteToSale = (quote: Quote) => {
    const newNumber = (124995 + invoices.length).toString();
    const formattedNfe = `000.${newNumber.slice(0, 3)}.${newNumber.slice(3)}`;

    // Update quote status
    setQuotes(prev => prev.map(q => q.id === quote.id ? { 
      ...q, 
      status: 'Aprovado',
      convertedOrderId: `PED-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      convertedNfeNumber: formattedNfe,
    } : q));

    const matchedCustomer = customers.find(c => c.id === quote.customerId) || {
      id: quote.customerId,
      name: quote.customerName,
      document: quote.customerDocument,
      type: quote.customerType,
      discountRate: 0,
      creditLimit: 10000,
      outstandingBalance: 0,
      email: quote.customerEmail || '',
      phone: quote.customerPhone || '',
      city: activeBranch.city || 'Campo Grande',
      state: quote.customerUf || activeBranch.uf || 'MS',
    };

    handleEmitNfeFromQuote({
      customer: matchedCustomer,
      items: quote.items.map(it => ({
        productId: it.productId,
        productCode: it.productCode,
        productName: it.productName,
        quantity: it.quantity,
        costPrice: it.costPrice,
        finalUnitPrice: it.finalUnitPrice,
        total: it.total,
      })),
      totalAmount: quote.totalAmount,
      channel: 'balcao',
    });
  };

  // Handlers for Authentication & Branch/CD definition
  const handleLoginSuccess = (session: UserSession, newCompany?: CompanyProfile) => {
    // Nova sessão: revoga qualquer elevação anterior (senha master vale só por sessão)
    revokeAdminUnlock();
    setAdminUnlocked(false);
    setPendingRestrictedView(null);
    setUserSession(session);
    setActiveStore(session.branchId);
    setIsLoginModalOpen(false);
    if (newCompany) {
      setCompanyProfile(newCompany);
    }
    setCurrentView('dashboard');
    showNotification(
      newCompany ? `Empresa Cadastrada: ${newCompany.tradeName}!` : `Sessão Autenticada: ${session.name}`,
      `Bem-vindo ao GATO SaaS! Filial ativa: ${session.cdCode} • ${session.branchName} (${session.branchUf})`,
      'success'
    );
  };

  const handleLogout = () => {
    // Revoga o token no servidor (invalida a sessão para qualquer aba/ dispositivo).
    void logoutSession();
    setUserSession(null);
    setAdminUnlocked(false);
    setPendingRestrictedView(null);
    revokeAdminUnlock();
    try {
      localStorage.removeItem('gato_user_session');
    } catch (e) {
      console.warn(e);
    }
    setCurrentView('login');
    showNotification('Sessão Finalizada', 'Faça login e defina a filial do CD para continuar vendendo.', 'info');
  };

  const handleSelectBranch = (branchId: string) => {
    setActiveStore(branchId);
    const targetBranch = branches.find(b => b.id === branchId) || INITIAL_BRANCHES.find(b => b.id === branchId) || branches[0];
    if (userSession) {
      const updatedSession: UserSession = {
        ...userSession,
        branchId: targetBranch.id,
        branchUf: targetBranch.uf,
        branchName: targetBranch.name,
        cdName: targetBranch.cdName,
        cdCode: targetBranch.cdCode,
      };
      setUserSession(updatedSession);
      try {
        localStorage.setItem('gato_user_session', JSON.stringify(updatedSession));
        localStorage.setItem('gato_active_store', targetBranch.id);
      } catch (e) {
        console.warn(e);
      }
    }
    showNotification(
      'CD de Venda Atualizado!',
      `Operações redirecionadas para o ${targetBranch.cdCode} • ${targetBranch.city} (${targetBranch.uf}) - ICMS: ${targetBranch.icmsInterno}%`,
      'info'
    );
  };

  // Restore backup data
  const handleRestoreData = (backup: any) => {
    if (backup.products) setProducts(backup.products);
    if (backup.orders) setOrders(backup.orders);
    if (backup.customers) setCustomers(backup.customers);
    if (backup.invoices) setInvoices(backup.invoices);
  };

  // Helper count badges
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  // Helper to open the app directly with guaranteed session
  const handleOpenSystemDirectly = () => {
    if (!userSession) {
      // SEGURANÇA: sem sessão autenticada não há acesso direto ao sistema.
      // Antes, este atalho fabricava uma sessão de administrador no navegador.
      setCurrentView('login');
      setIsLoginModalOpen(true);
      return;
    }
    setCurrentView('dashboard');
  };

  // Dedicated Login Page View when explicitly requested
  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-slate-950 font-['Plus_Jakarta_Sans'] antialiased">
        {/* Global Toast Notification */}
        {toast && (
          <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-sky-500/30 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="mt-0.5 shrink-0">
              {toast.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              ) : toast.type === 'info' ? (
                <Info className="w-5 h-5 text-sky-400" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <h4 className="font-extrabold text-white">{toast.title}</h4>
              <p className="text-slate-300 mt-0.5 leading-snug">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <LoginPage
          currentSession={userSession}
          companyProfile={companyProfile}
          branches={branches}
          onLoginSuccess={(session, newComp) => {
            handleLoginSuccess(session, newComp);
            setCurrentView('dashboard');
          }}
          onBackToApp={handleOpenSystemDirectly}
        />
      </div>
    );
  }

  // Bloqueio de acesso: tenant expirado/suspenso/cancelado enxerga apenas a tela
  // de reativação (o escopo SaaS nunca é bloqueado).
  if (
    !userSession?.isSaasScope &&
    (subscriptionStatus === 'expired' ||
      subscriptionStatus === 'suspended' ||
      subscriptionStatus === 'canceled')
  ) {
    return (
      <SubscriptionBlockedScreen
        status={subscriptionStatus}
        planName={subscriptionPlanName}
        canManageBilling={userSession?.roleCode === 'tenant_admin'}
        onLogout={handleLogout}
        onReactivated={() => void refreshSubscriptionStatus()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-['Plus_Jakarta_Sans'] antialiased flex flex-col">
      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-950 text-white p-4 rounded-2xl shadow-2xl border border-sky-500/30 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="mt-0.5 shrink-0">
            {toast.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : toast.type === 'info' ? (
              <Info className="w-5 h-5 text-sky-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <h4 className="font-extrabold text-white">{toast.title}</h4>
            <p className="text-slate-300 mt-0.5 leading-snug">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <Header
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onOpenQuickQuote={() => setCurrentView('cotacao')}
        onToggleMobileMenu={() => setMobileMenuOpen(true)}
        activeStore={activeStore}
        onChangeStore={handleSelectBranch}
        onNavigate={(view) => setCurrentView(view)}
        userSession={userSession}
        companyProfile={companyProfile}
        onOpenLogin={() => setCurrentView('login')}
        onOpenTrocaFilial={() => setIsTrocaFilialOpen(true)}
        onLogout={handleLogout}
        globalSearchQuery={globalSearchQuery}
        onSearchChange={setGlobalSearchQuery}
        onSearchSubmit={(q) => {
          setGlobalSearchQuery(q);
          setCurrentView('consulta-pecas');
        }}
      />

      {/* Body Area with Sidebar + Content */}
      <div className="w-full px-3 sm:px-6 lg:px-8 2xl:px-10 py-5 flex-1 flex gap-5 sm:gap-6">
        {/* Sidebar Navigation */}
        <Sidebar
          currentView={currentView}
          onSelectView={handleSelectView}
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          lowStockCount={lowStockCount}
          userSession={userSession}
          companyProfile={companyProfile}
          activeBranch={activeBranch}
          onOpenTrocaFilial={() => setIsTrocaFilialOpen(true)}
          onOpenLogin={() => setCurrentView('login')}
        />

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 min-w-0 pb-12">
          {currentView === 'consulta-pecas' && (
            <ConsultaPecasView
              products={products}
              activeBranch={activeBranch}
              branches={branches}
              companyProfile={companyProfile}
              initialSearchQuery={globalSearchQuery}
              onSearchQueryChange={setGlobalSearchQuery}
              onAddToCart={(part, qty) => {
                showNotification('Adicionado ao Carrinho', `${qty}x ${part.name} adicionado com sucesso!`, 'success');
              }}
              onAddToQuote={(part) => {
                const foundExistingProduct = products.find(p => p.id === part.id || p.code === part.brandCode || p.code === part.code);
                if (foundExistingProduct) {
                  setSelectedProductForQuote(foundExistingProduct);
                } else {
                  setSelectedProductForQuote({
                    id: part.id || `p-consulta-${Date.now()}`,
                    code: part.brandCode || part.code || '0986479265',
                    barcode: part.barcode || '7891234567890',
                    oemCode: part.oemCode || '13502073',
                    similarCodes: part.similarCodes || ['DF4205', 'PD/3123'],
                    name: part.name,
                    brand: part.brand,
                    category: 'auto',
                    supplier: part.brand ? `Distribuidora ${part.brand}` : 'Distribuidora Oficial',
                    location: {
                      corridor: 'A',
                      shelf: '12',
                      box: '04',
                    },
                    stock: part.stock || 5,
                    minStock: 2,
                    unitCost: (part.price || 289.90) * 0.6,
                    transportCost: 10,
                    markupPercent: 60,
                    sellingPrice: part.price || 289.90,
                    ncm: part.specs?.ncm || '8708.30.90',
                    cst: '00',
                    cfop: '5102',
                    taxBaseIcms: part.price || 289.90,
                    applications: (part.applications || []).map((app: any, idx: number) => ({
                      id: `app-${idx}`,
                      brand: part.brand || 'Geral',
                      vehicle: app.veiculo || 'Universal',
                      yearRange: app.ano || 'Todos',
                      engine: app.motor || 'Geral',
                      transmission: 'Manual',
                      traction: '4x2',
                      airConditioning: true,
                    })),
                    updatedAt: new Date().toISOString(),
                  });
                }
                setCurrentView('cotacao');
              }}
              onNavigateToView={(view) => setCurrentView(view)}
              onShowNotification={showNotification}
            />
          )}

          {currentView === 'dashboard' && (
            <DashboardOverview
              products={products}
              orders={orders}
              invoices={invoices}
              onNavigate={(v) => setCurrentView(v)}
              onSelectProductForQuote={(p) => {
                setSelectedProductForQuote(p);
                setCurrentView('cotacao');
              }}
            />
          )}

          {currentView === 'cotacao' && (
            <BalcaoCotacao
              products={products}
              customers={customers}
              initialCustomer={selectedCustomerForQuote}
              initialFleetVehicle={selectedVehicleForQuote}
              initialProduct={selectedProductForQuote}
              activeStore={activeStore}
              userSession={userSession}
              onSelectStore={setActiveStore}
              onAddNewProduct={handleAddNewProduct}
              onEmitNfeFromQuote={handleEmitNfeFromQuote}
              onSaveQuote={handleSaveQuote}
              onNavigateToFleet={() => setCurrentView('frota')}
              onNavigateToPartsApplication={() => setCurrentView('consulta-aplicacao')}
              onNavigateToNfe={() => setCurrentView('nfe-venda')}
              onShowNotification={showNotification}
            />
          )}

          {currentView === 'frota' && (
            <GestaoFrotaVeiculos
              onSelectVehicleForQuote={(veh) => {
                setSelectedVehicleForQuote(veh);
                setCurrentView('cotacao');
              }}
              onNavigateToPartsApplication={(veh) => {
                if (veh) {
                  setSelectedVehicleForQuote(veh);
                }
                setCurrentView('consulta-aplicacao');
              }}
              onShowNotification={showNotification}
            />
          )}

          {(currentView === 'consulta-aplicacao' || currentView === 'caminhao' || currentView === 'caminhoes') && (
            <ConsultaAplicacaoPecas
              products={products}
              initialVehicle={selectedVehicleForQuote}
              initialSegment={currentView === 'caminhao' || currentView === 'caminhoes' ? 'Caminhão / Pesado' : undefined}
              onSelectProductForQuote={(prod, vehContext) => {
                if (vehContext) {
                  setSelectedVehicleForQuote({
                    id: `veh-ctx-${Date.now()}`,
                    montadora: vehContext.montadora,
                    modelo: vehContext.modelo,
                    veiculo: `${vehContext.montadora.toUpperCase().substring(0, 3)}-${vehContext.ano}`,
                    ano: parseInt(vehContext.ano, 10) || 2024,
                    motor: vehContext.motor,
                  });
                }
                setSelectedProductForQuote(prod);
                setCurrentView('cotacao');
              }}
              onNavigateToQuote={() => setCurrentView('cotacao')}
              onNavigateToNfe={() => setCurrentView('nfe-venda')}
              onShowNotification={showNotification}
              onNavigateToFleet={() => setCurrentView('frota')}
            />
          )}

          {currentView === 'ordem-servico' && (
            <OrdemServicoManager
              serviceOrders={serviceOrders}
              products={products}
              customers={customers}
              companyProfile={companyProfile}
              userSession={userSession}
              onUpdateServiceOrders={handleUpdateServiceOrders}
              onUpdateProductStock={(productId, quantitySold) => {
                handleUpdateProductStock(productId, -quantitySold);
              }}
              onShowNotification={showNotification}
            />
          )}

          {currentView === 'xml-import' && (
            <XmlNfeImport
              products={products}
              existingProducts={products}
              onAddNewProduct={handleAddNewProduct}
              onUpdateProductStock={handleUpdateProductStock}
              onImportComplete={(updatedProds, newInvs) => {
                setProducts(updatedProds);
                setInvoices(prev => [...newInvs, ...prev]);
              }}
              onShowNotification={showNotification}
            />
          )}

          {currentView === 'estoque' && (
            <EstoqueManager
              products={products}
              userSession={userSession}
              onUpdateProducts={setProducts}
              onAddNewProduct={handleAddNewProduct}
              onShowNotification={showNotification}
              onSelectForQuote={(p) => {
                setSelectedProductForQuote(p);
                setCurrentView('cotacao');
              }}
            />
          )}

          {currentView === 'catalogo-web' && (
            <CatalogoDigitalWeb
              products={products}
              companyProfile={companyProfile}
              activeBranch={activeBranch}
              onShowNotification={showNotification}
            />
          )}

          {currentView === 'nfe-venda' && (
            <EmissaoNfe
              invoices={invoices}
              products={products}
              customers={customers}
              companyProfile={companyProfile}
              branches={branches}
              activeStore={activeStore}
              lastIssuedInvoiceId={lastIssuedInvoiceId}
              mdfeRecords={mdfeRecords}
              onUpdateMdfeRecords={setMdfeRecords}
              onClearLastIssuedInvoice={() => setLastIssuedInvoiceId(null)}
              onNavigateToQuote={() => setCurrentView('cotacao')}
              onNavigateToPartsApplication={() => setCurrentView('consulta-aplicacao')}
              onAddNewInvoice={handleAddNewInvoice}
              onShowNotification={showNotification}
            />
          )}

          {currentView === 'financeiro' && (
            <FinanceiroCompleto
              payables={payables}
              receivables={receivables}
              bankTransactions={bankTransactions}
              companyProfile={companyProfile}
              branches={branches}
              activeStore={activeStore}
              products={products}
              orders={orders}
              serviceOrders={serviceOrders}
              onUpdatePayables={setPayables}
              onUpdateReceivables={setReceivables}
              onUpdateBankTransactions={setBankTransactions}
              onShowNotification={showNotification}
            />
          )}

          {currentView === 'empresa-filiais' && (
            <EmpresaFiliaisManager
              companyProfile={companyProfile}
              branches={branches}
              activeStore={activeStore}
              onUpdateCompanyProfile={handleUpdateCompanyProfile}
              onUpdateBranches={handleUpdateBranches}
              onSelectActiveStore={handleSelectBranch}
              onShowNotification={showNotification}
            />
          )}

          {(currentView === 'orcamentos' || currentView === 'clientes-orcamentos' || currentView === 'clientes' || currentView === 'leads-marketing' || currentView === 'marketing' || currentView === 'leads') && (
            <ClientesOrcamentos
              initialTab={
                currentView === 'clientes' 
                  ? 'clientes' 
                  : (currentView === 'leads-marketing' || currentView === 'marketing' || currentView === 'leads') 
                    ? 'leads_marketing' 
                    : 'orcamentos'
              }
              customers={customers}
              quotes={quotes}
              products={products}
              leads={marketingLeads}
              companyProfile={companyProfile}
              onUpdateCustomers={setCustomers}
              onUpdateQuotes={setQuotes}
              onUpdateLeads={handleUpdateMarketingLeads}
              onConvertQuoteToSale={handleConvertQuoteToSale}
              onNavigateToQuoteWithCustomer={(cust) => {
                setSelectedCustomerForQuote(cust);
                setCurrentView('cotacao');
              }}
              onTabChange={(tab) => {
                if (tab === 'clientes') setCurrentView('clientes');
                else if (tab === 'orcamentos') setCurrentView('orcamentos');
                else if (tab === 'leads_marketing') setCurrentView('leads-marketing');
              }}
              onShowNotification={showNotification}
            />
          )}

          {currentView === 'fornecedores' && (
            <FornecedoresManager
              suppliers={suppliers}
              products={products}
              onUpdateSuppliers={setSuppliers}
              onNavigateToXmlImport={() => setCurrentView('xml-import')}
              onShowNotification={showNotification}
            />
          )}

          {(currentView === 'conectores' || currentView === 'marketplaces') && (
            <ConnectorsManager
              products={products}
              orders={orders}
              marketplaces={marketplaces}
              onUpdateProducts={setProducts}
              onUpdateMarketplaces={setMarketplaces}
              onShowNotification={(notif: any) => {
                if (typeof notif === 'string') {
                  showNotification(notif, '');
                } else if (notif && notif.title) {
                  showNotification(notif.title, notif.message || '', notif.type === 'error' ? 'warning' : notif.type);
                }
              }}
            />
          )}

          {currentView === 'pedidos' && (
            <PedidosLogistica
              orders={orders}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onShowNotification={showNotification}
            />
          )}

          {currentView === 'relatorios' && (
            <RelatoriosFinanceiros
              orders={orders}
              products={products}
              customers={customers}
              invoices={invoices}
              payables={payables}
              receivables={receivables}
              companyProfile={companyProfile}
            />
          )}

          {currentView === 'suporte-chat' && (
            <SuporteChatIA />
          )}

          {(adminUnlocked && (currentView === 'admin' || currentView === 'admin-impostos')) && (
            <AdminImpostosFiscal
              companyProfile={companyProfile}
              branches={branches}
              products={products}
              onShowNotification={showNotification}
            />
          )}

          {(adminUnlocked && (currentView === 'rbac' || currentView === 'admin-rbac' || currentView === 'governanca' || currentView === 'tenants' || currentView === 'seguranca')) && (
            <AdminRbacMultiTenant
              onNotify={(msg, type) => showNotification(msg, '', type === 'error' ? 'warning' : (type || 'info'))}
            />
          )}

          {currentView === 'configuracoes' && (
            <ConfiguracoesSaaS
              products={products}
              orders={orders}
              customers={customers}
              invoices={invoices}
              companyProfile={companyProfile}
              branches={branches}
              activeStore={activeStore}
              onSelectActiveStore={handleSelectBranch}
              onNavigateToEmpresaFiliais={() => setCurrentView('empresa-filiais')}
              onUpdateCompanyProfile={handleUpdateCompanyProfile}
              onUpdateProducts={setProducts}
              onRestoreData={handleRestoreData}
              onShowNotification={showNotification}
            />
          )}

          {currentView === 'assinatura' && (
            <AssinaturaFaturas onShowNotification={showNotification} />
          )}

          {(adminUnlocked && currentView === 'financeiro-saas') && (
            <DashboardFinanceiroSaaS />
          )}

          {(adminUnlocked && currentView === 'banco-dados') && (
            <ConfiguracaoBancoDados onShowNotification={showNotification} />
          )}

          {(adminUnlocked && currentView === 'camadas-acesso') && (
            <CamadasAcesso onShowNotification={showNotification} />
          )}
        </main>
      </div>

      {/* Login & Branch / CD Definition Modal */}
      {isLoginModalOpen && (
        <LoginArea
          currentSession={userSession}
          companyProfile={companyProfile}
          branches={branches}
          onLoginSuccess={(session, newComp) => {
            handleLoginSuccess(session, newComp);
            setIsLoginModalOpen(false);
          }}
          onCancel={() => setIsLoginModalOpen(false)}
        />
      )}

      {/* Quick Switch Branch & CD for Sales Modal */}
      {isTrocaFilialOpen && (
        <TrocaFilialCdModal
          currentBranchId={activeStore}
          userSession={userSession}
          branches={branches}
          onSelectBranch={handleSelectBranch}
          onClose={() => setIsTrocaFilialOpen(false)}
        />
      )}

      {/* Modal de Senha Master do Superadmin — telas administrativas restritas */}
      <MasterPasswordModal
        open={showMasterPasswordModal}
        viewLabel={
          pendingRestrictedView === 'rbac' || pendingRestrictedView === 'admin-rbac' || pendingRestrictedView === 'governanca' || pendingRestrictedView === 'tenants' || pendingRestrictedView === 'seguranca'
            ? 'Admin — Imposto e Governança'
            : pendingRestrictedView === 'financeiro-saas'
              ? 'Financeiro SaaS — MRR & Churn'
              : pendingRestrictedView === 'banco-dados'
                ? 'Banco de Dados — Credenciais'
                : pendingRestrictedView === 'camadas-acesso'
                  ? 'Camadas de Acesso — Permissões por Papel'
                  : 'Admin — Impostos e Regras Fiscais'
        }
        onConfirm={async (password) => {
          // A senha master é conferida no SERVIDOR (nenhum segredo existe no bundle).
          const ok = await verifyMasterPassword(password, pendingRestrictedView || 'área restrita');
          if (ok) {
            grantAdminUnlock(userSession);
            setAdminUnlocked(true);
            if (pendingRestrictedView) {
              setCurrentView(pendingRestrictedView);
              setPendingRestrictedView(null);
            }
          }
          return ok;
        }}
        onClose={() => {
          setShowMasterPasswordModal(false);
          setPendingRestrictedView(null);
        }}
      />
    </div>
  );
}
