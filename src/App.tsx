import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { XmlNfeImport } from './components/XmlNfeImport';
import { BalcaoCotacao } from './components/BalcaoCotacao';
import { CaixaView } from './components/CaixaView';
import { EstoqueManager } from './components/EstoqueManager';
import { EmissaoNfe } from './components/EmissaoNfe';
import { MarketplaceManager } from './components/MarketplaceManager';
import { SuporteChatIA } from './components/SuporteChatIA';
import { ConfiguracoesSaaS } from './components/ConfiguracoesSaaS';
import { ClientesOrcamentos } from './components/ClientesOrcamentos';
import { GestaoFrotaVeiculos } from './components/GestaoFrotaVeiculos';
import { ConsultaAplicacaoPecas } from './components/ConsultaAplicacaoPecas';
import { EmpresaFiliaisManager } from './components/EmpresaFiliaisManager';
import { LoginArea } from './components/LoginArea';
import { LoginPage } from './components/LoginPage';
import { AlterarSenhaModal } from './components/AlterarSenhaModal';
import { TrocaFilialCdModal } from './components/TrocaFilialCdModal';
import { FinanceiroCompleto } from './components/FinanceiroCompleto';
import { OrdemServicoManager } from './components/OrdemServicoManager';
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
import { SaasAdminDashboard } from './components/SaasAdminDashboard';
import { GestaoPacotesPlanos } from './components/GestaoPacotesPlanos';
import { SaasConnectorsManager } from './components/SaasConnectorsManager';
import { CatalogIsolationNotice } from './components/CatalogIsolationNotice';
import { EquipeAcessos } from './components/EquipeAcessos';
import { ChavesIntegracoes } from './components/ChavesIntegracoes';
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
import {
  loadTenantEntities,
  isAccessDeniedError,
  isDatabaseNotConfiguredError,
  createProduct,
  createQuote,
  updateQuote as updateQuoteInApi,
  type EntityLoadResult,
} from './services/entityApi';
import { seedList, loadEntityState, persistEntityState } from './utils/seedMode';
import { fetchServerSession, logoutSession, buildUserSession } from './utils/sessionService';
import type { SubscriptionStatus, TenantSubscription } from './types/billing';

const TENANT_CATALOG_VIEWS = [
  'consulta-pecas',
  'consulta-aplicacao',
  'caminhao',
  'caminhoes',
  'estoque',
  'catalogo-web',
  'cotacao',
  'caixa',
  'frota',
  'xml-import',
  'nfe-venda',
  'ordem-servico',
  'fornecedores',
  'orcamentos',
  'clientes',
  'clientes-orcamentos',
  'leads-marketing',
  'marketing',
  'leads',
  'financeiro',
  'relatorios',
  'empresa-filiais',
];

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
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Global Application State: SEMPRE abre no login, NUNCA na página sem autenticação
  const [currentView, setCurrentView] = useState<string>(() => {
    if (!hasSessionToken()) {
      return 'login';
    }

    let isRequestedAdminRoute = false;
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      isRequestedAdminRoute = (
        path === '/admin' ||
        path.startsWith('/admin/') ||
        path === '/superadmin' ||
        path.startsWith('/superadmin/') ||
        hash === '#admin' ||
        hash === '#superadmin'
      );
    }

    try {
      const saved = localStorage.getItem('gato_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.id && parsed?.email) {
          if (parsed?.isSaasScope) return 'saas-dashboard';
          if (isRequestedAdminRoute) {
            if (parsed?.role === 'admin' || parsed?.role === 'administrador') {
              return 'admin';
            }
          }
          return 'dashboard';
        }
      }
    } catch {
      /* noop */
    }

    return 'login';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      const branchList = loadEntityState('gato_branches', INITIAL_BRANCHES);
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

  // Toda navegação de view passa por aqui — aplica a política de acesso e isolamento das Camadas.
  const handleSelectView = (view: string) => {
    // Sem sessão autenticada: redireciona sempre para o login
    if (!userSession) {
      setCurrentView('login');
      return;
    }

    // Isolamento da CAMADA 1: O catálogo do cliente NUNCA fica visível ao Super Admin.
    // Cada contrato gera dados 100% separados para cada cliente.
    if (userSession?.isSaasScope) {
      const clientCatalogAndOperationalViews = [
        'consulta-pecas', 'catalogo-web', 'catalogo-digital', 'consulta-aplicacao',
        'caminhao', 'caminhoes', 'estoque', 'xml-import', 'nfe-venda', 'cotacao',
        'balcao', 'caixa', 'frota', 'ordem-servico', 'financeiro', 'relatorios',
        'orcamentos', 'clientes-orcamentos', 'clientes', 'leads-marketing', 'marketing',
        'leads', 'fornecedores', 'empresa-filiais', 'configuracoes'
      ];
      if (clientCatalogAndOperationalViews.includes(view)) {
        showNotification(
          'Catálogo Blindado por Contrato (LGPD)',
          'O catálogo do cliente nunca fica visível ao Super Admin. Os produtos, estoques e dados operacionais pertencem exclusivamente à Empresa Contratante (Camada 2).',
          'info'
        );
        setCurrentView('saas-dashboard');
        return;
      }
      if (view === 'dashboard') {
        setCurrentView('saas-dashboard');
        return;
      }
      setCurrentView(view);
      return;
    }

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

  // Sincroniza a URL do navegador com a view atual (/admin, /superadmin, /login ou /)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSaasOrAdminView =
        isRestrictedView(currentView) ||
        currentView === 'saas-dashboard' ||
        (userSession?.isSaasScope && currentView === 'dashboard');
      const isLoginView = currentView === 'login';
      const path = window.location.pathname.toLowerCase();

      if (isSaasOrAdminView) {
        // Mantém a rota /admin (ou /superadmin se o usuário entrou explicitamente por ela)
        if (path !== '/admin' && path !== '/superadmin') {
          window.history.pushState({}, '', '/admin');
        }
      } else if (isLoginView) {
        if (path !== '/admin' && path !== '/superadmin' && path !== '/login') {
          window.history.pushState({}, '', '/login');
        }
      } else if (path === '/admin' || path === '/superadmin' || path === '/login') {
        window.history.pushState({}, '', '/');
      }
    }
  }, [currentView, userSession?.isSaasScope]);

  // Suporte a navegação por URL / histórico do navegador (popstate)
  useEffect(() => {
    const handleLocationChange = () => {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const isAdm = (
        path === '/admin' ||
        path.startsWith('/admin/') ||
        path === '/superadmin' ||
        path.startsWith('/superadmin/') ||
        hash === '#admin' ||
        hash === '#superadmin'
      );

      if (isAdm) {
        if (userSession?.isSaasScope) {
          setCurrentView('saas-dashboard');
        } else if (userSession?.role === 'admin' || userSession?.role === 'administrador') {
          setCurrentView('admin');
        } else {
          setCurrentView('login');
        }
      } else if (path === '/login' || hash === '#login') {
        setCurrentView('login');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [userSession]);

  // Multi-branch state with persistence
  const [branches, setBranches] = useState<BranchUnit[]>(() =>
    loadEntityState('gato_branches', INITIAL_BRANCHES)
  );

  const handleUpdateBranches = (newBranches: BranchUnit[]) => {
    setBranches(newBranches);
    persistEntityState('gato_branches', newBranches);
  };

  const [activeStore, setActiveStore] = useState(() => {
    try {
      const savedStore = localStorage.getItem('gato_active_store');
      if (savedStore && !['matriz-ms', 'filial-sp', 'filial-sc', 'filial-mt', 'filial-pr'].includes(savedStore)) {
        return savedStore;
      }
    } catch (e) {
      console.warn(e);
    }
    return '';
  });

  const fallbackCleanBranch: BranchUnit = {
    id: 'matriz-principal',
    name: 'Sede / Matriz Principal',
    cdCode: 'CD-01',
    cdName: 'Centro de Distribuição Principal',
    uf: 'SP',
    city: 'São Paulo',
    cnpj: '',
    ie: '',
    address: '',
    sefazCode: '35',
    isMatriz: true,
    icmsInterno: 18,
    status: 'ativa',
  };
  const activeBranch = branches.find(b => b.id === activeStore) || branches[0] || fallbackCleanBranch;

  // Entities State
  // `seedList`/`loadEntityState` devolvem lista vazia no modo base limpa (VITE_USE_SEED=false);
  // sem a variável, o comportamento é exatamente o de antes.
  const [products, setProducts] = useState<Product[]>(() => seedList(INITIAL_PRODUCTS));
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadEntityState('gato_customers', INITIAL_CUSTOMERS)
  );

  useEffect(() => {
    persistEntityState('gato_customers', customers);
  }, [customers]);

  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    loadEntityState('gato_suppliers', INITIAL_SUPPLIERS)
  );

  useEffect(() => {
    persistEntityState('gato_suppliers', suppliers);
  }, [suppliers]);
  const [marketplaces, setMarketplaces] = useState<MarketplaceSetting[]>(() => seedList(INITIAL_MARKETPLACES));
  const [orders, setOrders] = useState<Order[]>(() => seedList(INITIAL_ORDERS));
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(() => seedList(INITIAL_INVOICES));
  const [quotes, setQuotes] = useState<Quote[]>(() => seedList(INITIAL_QUOTES));
  const [notifications, setNotifications] = useState<PushNotification[]>(() => seedList(INITIAL_NOTIFICATIONS));
  const [payables, setPayables] = useState<FinancialPayable[]>(() => seedList(INITIAL_PAYABLES));
  const [receivables, setReceivables] = useState<FinancialReceivable[]>(() => seedList(INITIAL_RECEIVABLES));
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>(() => seedList(INITIAL_BANK_TRANSACTIONS));
  const [mdfeRecords, setMdfeRecords] = useState<MdfeRecord[]>(() => seedList(INITIAL_MDFE));
  const [selectedCustomerForQuote, setSelectedCustomerForQuote] = useState<Customer | null>(null);
  /**
   * Orçamento que o usuário mandou ALTERAR na tela de Orçamentos. Fica aqui
   * enquanto o balcão edita; o balcão avisa quando consumir, e o App limpa.
   */
  const [quoteBeingEdited, setQuoteBeingEdited] = useState<Quote | null>(null);
  const [selectedVehicleForQuote, setSelectedVehicleForQuote] = useState<VehicleFleetItem | null>(null);
  const [selectedProductForQuote, setSelectedProductForQuote] = useState<Product | null>(null);
  const [lastIssuedInvoiceId, setLastIssuedInvoiceId] = useState<string | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>(() =>
    loadEntityState('gato_service_orders', INITIAL_SERVICE_ORDERS)
  );

  const handleUpdateServiceOrders = (orders: ServiceOrder[]) => {
    setServiceOrders(orders);
    persistEntityState('gato_service_orders', orders);
  };

  // Marketing Leads & CRM WhatsApp database
  const [marketingLeads, setMarketingLeads] = useState<MarketingLead[]>(() =>
    loadEntityState('gato_marketing_leads', INITIAL_MARKETING_LEADS)
  );

  const handleUpdateMarketingLeads = (newLeads: MarketingLead[]) => {
    setMarketingLeads(newLeads);
    persistEntityState('gato_marketing_leads', newLeads);
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

  // -----------------------------------------------------------------------
  // ENTIDADES REAIS DO TENANT (08/10/2026)
  // -----------------------------------------------------------------------
  // Com sessão verificada, as quatro listas passam a vir do banco. Três regras:
  //  - o banco VENCE o seed, inclusive quando devolve lista vazia — é o que faz
  //    a empresa nova aparecer vazia de verdade (o dado de demonstração sai da
  //    tela quando existe banco; ver §3.19 da handoff);
  //  - servidor SEM banco (503) mantém o seed: é o modo dev/demo de sempre;
  //  - falha inesperada avisa e mantém o que está em tela (403/401 são silêncio
  //    de propósito: papel sem o recurso, ou sessão caindo — o apiClient já
  //    cuida do logout).
  // Depende do ID do usuário, não do objeto de sessão: trocar de filial
  // reconstrói a sessão com a mesma identidade e não deve recarregar tudo.
  /** Aplica o resultado de uma carga às quatro listas (e avisa o que falhou). */
  const applyEntityLoad = (result: EntityLoadResult) => {
    if (result.products) setProducts(result.products);
    if (result.customers) setCustomers(result.customers);
    if (result.suppliers) setSuppliers(result.suppliers);
    if (result.quotes) setQuotes(result.quotes);

    const ENTITY_LABELS = {
      products: 'produtos',
      customers: 'clientes',
      suppliers: 'fornecedores',
      quotes: 'orçamentos',
    } as const;
    const failures = result.failures.filter(
      (f) => !isDatabaseNotConfiguredError(f.error) && !isAccessDeniedError(f.error)
    );
    if (failures.length > 0) {
      showNotification(
        'Falha ao carregar dados',
        `Não foi possível carregar do banco: ${failures.map((f) => ENTITY_LABELS[f.entity]).join(', ')}. A tela pode estar desatualizada.`,
        'warning'
      );
    }
  };

  /**
   * Recarrega as quatro listas do banco. É chamado depois de cada escrita
   * (cadastro de produto, cliente ou orçamento) para a tela refletir o que foi
   * realmente gravado — inclusive o id e o saldo, que só o banco conhece.
   */
  const reloadEntities = async () => {
    applyEntityLoad(await loadTenantEntities());
  };

  useEffect(() => {
    if (!userSession?.id) return;
    if (userSession.isSaasScope) {
      // O catálogo do cliente NUNCA fica visível ao Super Admin
      setProducts([]);
      setCustomers([]);
      setSuppliers([]);
      setQuotes([]);
      setOrders([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await loadTenantEntities();
      if (cancelled) return;
      applyEntityLoad(result);
    })();
    return () => {
      cancelled = true;
    };
  }, [userSession?.id, userSession?.isSaasScope]);

  // Handlers for products
  const handleAddNewProduct = (newProd: Product) => {
    // Local primeiro — o balcão não para se a gravação falhar — e, com banco
    // configurado, grava e recarrega para a lista trazer o id e o saldo reais.
    setProducts(prev => [newProd, ...prev]);
    void (async () => {
      try {
        await createProduct(newProd);
        await reloadEntities();
      } catch (error) {
        if (isDatabaseNotConfiguredError(error)) return; // dev sem banco: segue local
        showNotification(
          'Produto não gravado no banco',
          error instanceof Error ? error.message : 'Falha ao gravar o produto.',
          'warning'
        );
      }
    })();
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

    // Orçamento NOVO vai para o banco; um que já veio de lá (id `bud_…`) só tem
    // o estado local atualizado — alterar orçamento gravado exige o PUT, que é
    // o próximo passo do plano (item "alterar orçamento").
    const jaEstaNoBanco = newQuote.id.startsWith('bud_');
    if (jaEstaNoBanco) return;
    void (async () => {
      try {
        await createQuote(newQuote, customers);
        await reloadEntities();
      } catch (error) {
        if (isDatabaseNotConfiguredError(error)) return; // dev sem banco: segue local
        showNotification(
          'Orçamento não gravado no banco',
          error instanceof Error ? error.message : 'Falha ao gravar o orçamento.',
          'warning'
        );
      }
    })();
  };

  /**
   * Manda um orçamento salvo para o balcão, em modo de alteração.
   * O balcão hidrata o carrinho e, ao salvar, grava por cima (PUT) em vez de
   * criar outro DAV.
   */
  const handleEditQuote = (quote: Quote) => {
    setQuoteBeingEdited(quote);
    setCurrentView('cotacao');
  };

  /**
   * Grava a alteração de um orçamento que já existe: local primeiro (a tela não
   * perde a edição se o banco falhar), depois o PUT e a recarga das listas.
   */
  const handleUpdateQuote = (quote: Quote) => {
    setQuotes(prev => prev.map(q => q.id === quote.id ? quote : q));
    showNotification('Orçamento Alterado!', `${quote.quoteNumber} (${quote.customerName}) atualizado.`, 'success');

    if (!quote.id.startsWith('bud_')) return; // demonstração: não está no banco
    void (async () => {
      try {
        await updateQuoteInApi(quote, customers);
        await reloadEntities();
      } catch (error) {
        if (isDatabaseNotConfiguredError(error)) return; // dev sem banco: segue local
        showNotification(
          'Alteração não gravada no banco',
          error instanceof Error ? error.message : 'Falha ao gravar a alteração do orçamento.',
          'warning'
        );
      }
    })();
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
    setPendingRestrictedView(null);
    setUserSession(session);
    setActiveStore(session.branchId);
    setIsLoginModalOpen(false);
    if (newCompany) {
      setCompanyProfile(newCompany);
    }
    if (session.isSaasScope) {
      grantAdminUnlock(session);
      setAdminUnlocked(true);
      // O catálogo do cliente nunca fica visível ao superadmin
      setProducts([]);
      setCustomers([]);
      setSuppliers([]);
      setQuotes([]);
      setOrders([]);
      setCurrentView('saas-dashboard');
      showNotification(
        `Super Admin SaaS Autenticado: ${session.name}`,
        'Camada 1 — Dono do SaaS: Gestão de clientes, planos e contratos de assinatura. Catálogo de clientes isolado.',
        'success'
      );
    } else {
      setAdminUnlocked(false);
      setCurrentView('dashboard');
      showNotification(
        newCompany ? `Empresa Cadastrada: ${newCompany.tradeName}!` : `Sessão Autenticada: ${session.name}`,
        `Bem-vindo ao GATO SaaS! Filial ativa: ${session.cdCode} • ${session.branchName} (${session.branchUf})`,
        'success'
      );
    }
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
    const targetBranch = branches.find(b => b.id === branchId) || branches[0] || fallbackCleanBranch;
    if (userSession && targetBranch) {
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

  // Abre a tela de login
  const handleOpenLogin = () => {
    setCurrentView('login');
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (!path.includes('login') && !path.includes('admin')) {
        window.history.pushState({}, '', '/login');
      }
    }
  };

  // Fecha a tela de login e volta ao sistema
  const handleCloseLogin = () => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/login' || path.startsWith('/admin') || path.startsWith('/superadmin') || window.location.hash.includes('login') || window.location.hash.includes('admin')) {
        window.history.pushState({}, '', '/');
      }
    }
    setIsLoginModalOpen(false);
    if (userSession) {
      if (userSession.isSaasScope) {
        setCurrentView('saas-dashboard');
      } else if (userSession.role === 'admin' || userSession.role === 'administrador') {
        setCurrentView('admin');
      } else {
        setCurrentView('dashboard');
      }
    } else {
      setCurrentView('login');
    }
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
            if (session.isSaasScope) {
              setCurrentView('saas-dashboard');
            } else if (session.role === 'admin' || session.role === 'administrador') {
              setCurrentView('admin');
            } else {
              setCurrentView('dashboard');
            }
          }}
          onBackToApp={handleCloseLogin}
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
        branches={branches}
        onOpenLogin={handleOpenLogin}
        onOpenTrocaFilial={() => setIsTrocaFilialOpen(true)}
        onLogout={handleLogout}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
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
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
          lowStockCount={lowStockCount}
          userSession={userSession}
          companyProfile={companyProfile}
          activeBranch={activeBranch}
          onOpenTrocaFilial={() => setIsTrocaFilialOpen(true)}
          onOpenLogin={handleOpenLogin}
        />

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 min-w-0 pb-12">
          {/* Bloqueio LGPD & Isolamento Multi-Tenant: Catálogo e Dados Comerciais do Cliente NUNCA visíveis ao Super Admin */}
          {userSession?.isSaasScope && TENANT_CATALOG_VIEWS.includes(currentView) && (
            <CatalogIsolationNotice
              viewName={currentView}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}

          {!userSession?.isSaasScope && currentView === 'consulta-pecas' && (
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

          {(currentView === 'saas-dashboard' || (userSession?.isSaasScope && currentView === 'dashboard')) && (
            <SaasAdminDashboard
              onNavigate={(v) => setCurrentView(v)}
              onShowNotification={showNotification}
            />
          )}

          {(!userSession?.isSaasScope && currentView === 'dashboard') && (
            <DashboardOverview
              products={products}
              orders={orders}
              invoices={invoices}
              branches={branches}
              onNavigate={(v) => setCurrentView(v)}
              onSelectProductForQuote={(p) => {
                setSelectedProductForQuote(p);
                setCurrentView('cotacao');
              }}
            />
          )}

          {!userSession?.isSaasScope && currentView === 'cotacao' && (
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
              onReloadEntities={reloadEntities}
              initialQuote={quoteBeingEdited}
              onUpdateQuote={handleUpdateQuote}
              onEditQuoteConsumed={() => setQuoteBeingEdited(null)}
              onNavigateToFleet={() => setCurrentView('frota')}
              onNavigateToPartsApplication={() => setCurrentView('consulta-aplicacao')}
              onNavigateToNfe={() => setCurrentView('nfe-venda')}
              onShowNotification={showNotification}
            />
          )}

          {!userSession?.isSaasScope && currentView === 'caixa' && (
            <CaixaView companyProfile={companyProfile} onShowNotification={showNotification} />
          )}

          {!userSession?.isSaasScope && currentView === 'frota' && (
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

          {!userSession?.isSaasScope && (currentView === 'consulta-aplicacao' || currentView === 'caminhao' || currentView === 'caminhoes') && (
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

          {!userSession?.isSaasScope && currentView === 'xml-import' && (
            <XmlNfeImport
              products={products}
              existingProducts={products}
              onAddNewProduct={handleAddNewProduct}
              onUpdateProductStock={handleUpdateProductStock}
              onReloadEntities={reloadEntities}
              onImportComplete={(updatedProds, newInvs) => {
                setProducts(updatedProds);
                setInvoices(prev => [...newInvs, ...prev]);
              }}
              onShowNotification={showNotification}
            />
          )}

          {!userSession?.isSaasScope && currentView === 'estoque' && (
            <EstoqueManager
              products={products}
              userSession={userSession}
              onUpdateProducts={setProducts}
              onAddNewProduct={handleAddNewProduct}
              onReloadEntities={reloadEntities}
              onShowNotification={showNotification}
              onSelectForQuote={(p) => {
                setSelectedProductForQuote(p);
                setCurrentView('cotacao');
              }}
              customers={customers}
            />
          )}

          {!userSession?.isSaasScope && currentView === 'catalogo-web' && (
            <CatalogoDigitalWeb
              products={products}
              companyProfile={companyProfile}
              activeBranch={activeBranch}
              onShowNotification={showNotification}
            />
          )}

          {!userSession?.isSaasScope && currentView === 'nfe-venda' && (
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

          {!userSession?.isSaasScope && currentView === 'ordem-servico' && (
            <OrdemServicoManager
              serviceOrders={serviceOrders}
              onUpdateServiceOrders={handleUpdateServiceOrders}
              onShowNotification={showNotification}
              customers={customers}
              products={products}
              branchId={activeBranch.id}
            />
          )}

          {!userSession?.isSaasScope && (currentView === 'financeiro' || currentView === 'relatorios') && (
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

          {!userSession?.isSaasScope && currentView === 'empresa-filiais' && (
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

          {!userSession?.isSaasScope && (currentView === 'orcamentos' || currentView === 'clientes-orcamentos' || currentView === 'clientes' || currentView === 'leads-marketing' || currentView === 'marketing' || currentView === 'leads') && (
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
              onReloadEntities={reloadEntities}
              onEditQuote={handleEditQuote}
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

          {!userSession?.isSaasScope && currentView === 'fornecedores' && (
            <FornecedoresManager
              suppliers={suppliers}
              products={products}
              onUpdateSuppliers={setSuppliers}
              onNavigateToXmlImport={() => setCurrentView('xml-import')}
              onShowNotification={showNotification}
            />
          )}

          {(currentView === 'conectores' || currentView === 'marketplaces') && (
            userSession?.isSaasScope ? (
              <SaasConnectorsManager
                onNavigate={(v) => setCurrentView(v)}
                onShowNotification={showNotification}
              />
            ) : (
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
            )
          )}

          {currentView === 'suporte-chat' && (
            <SuporteChatIA />
          )}

          {((adminUnlocked || userSession?.isSaasScope) && (currentView === 'admin' || currentView === 'admin-impostos')) && (
            <AdminImpostosFiscal
              companyProfile={companyProfile}
              branches={branches}
              products={products}
              onShowNotification={showNotification}
            />
          )}

          {((adminUnlocked || userSession?.isSaasScope) && (currentView === 'rbac' || currentView === 'admin-rbac' || currentView === 'governanca' || currentView === 'tenants' || currentView === 'seguranca')) && (
            <AdminRbacMultiTenant
              onNotify={(msg, type) => showNotification(msg, '', type === 'error' ? 'warning' : (type || 'info'))}
            />
          )}

          {/* Construtor flexível do admin do tenant. Deliberadamente SEM
              `adminUnlocked`: é uma view comum, não uma tela /superadmin —
              senão o tenant_admin (papel 'gerente' na UI) ficaria de fora. */}
          {currentView === 'equipe-acessos' && (
            <EquipeAcessos userSession={userSession} onShowNotification={showNotification} />
          )}

          {/* Chaves de API e licença de máquina. View comum (sem adminUnlocked):
              o admin do tenant precisa entrar sem senha master; o dono/SaaS entra
              pelo recurso `tenant_credentials`. */}
          {currentView === 'chaves' && (
            <ChavesIntegracoes userSession={userSession} onShowNotification={showNotification} />
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
              onReloadEntities={reloadEntities}
              onShowNotification={showNotification}
            />
          )}

          {currentView === 'assinatura' && (
            <AssinaturaFaturas onShowNotification={showNotification} />
          )}

          {((adminUnlocked || userSession?.isSaasScope) && currentView === 'financeiro-saas') && (
            <DashboardFinanceiroSaaS />
          )}

          {((adminUnlocked || userSession?.isSaasScope) && currentView === 'banco-dados') && (
            <ConfiguracaoBancoDados onShowNotification={showNotification} />
          )}

          {((adminUnlocked || userSession?.isSaasScope) && currentView === 'camadas-acesso') && (
            <CamadasAcesso onShowNotification={showNotification} />
          )}

          {((adminUnlocked || userSession?.isSaasScope) && (currentView === 'planos-pacotes' || currentView === 'pacotes')) && (
            <GestaoPacotesPlanos
              onNavigate={(v) => setCurrentView(v)}
              onShowNotification={showNotification}
            />
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

      {/* Modal de Alteração de Senha do Usuário (inclui primeiro acesso obrigatório) */}
      <AlterarSenhaModal
        isOpen={isChangePasswordOpen || !!userSession?.mustChangePassword}
        isFirstAccess={!!userSession?.mustChangePassword}
        onClose={() => {
          if (!userSession?.mustChangePassword) {
            setIsChangePasswordOpen(false);
          }
        }}
        onSuccess={() => {
          if (userSession) {
            const updated = { ...userSession, mustChangePassword: false };
            setUserSession(updated);
            try {
              localStorage.setItem('gato_user_session', JSON.stringify(updated));
            } catch {
              /* noop */
            }
          }
          setIsChangePasswordOpen(false);
        }}
        userEmail={userSession?.email || ''}
        onShowNotification={showNotification}
      />

      {/* Modal de Senha Master do Superadmin — telas administrativas restritas */}
      <MasterPasswordModal
        open={showMasterPasswordModal}
        viewLabel={
          pendingRestrictedView === 'rbac' || pendingRestrictedView === 'admin-rbac' || pendingRestrictedView === 'governanca' || pendingRestrictedView === 'tenants' || pendingRestrictedView === 'seguranca'
            ? 'Admin — Imposto e Governança'
            : pendingRestrictedView === 'planos-pacotes' || pendingRestrictedView === 'pacotes'
              ? 'Super Admin — Pacotes, Preços e Cotas'
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




