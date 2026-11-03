import React, { useState, useEffect } from 'react';
import {
  Home,
  Search,
  Boxes,
  ClipboardList,
  FileText, 
  Users,
  Building2,
  TrendingUp,
  Settings,
  X,
  FileDown,
  Wrench,
  Sparkles,
  RefreshCw,
  Store,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Shield,
  Zap,
  Globe,
  Cable,
  MessageSquareShare,
  CreditCard,
  DollarSign,
  Database,
  Layers,
  KeyRound,
  Wallet,
  Package,
  LogIn,
  FolderLock,
  FileKey
} from 'lucide-react';
import { GatoBrand } from './GatoBrand';
import { UserSession, BranchUnit, CompanyProfile } from '../types';
import { isElevatedAdmin, RESTRICTED_VIEWS } from '../utils/accessControl';
import { isMenuVisible } from '../utils/menuAccess';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  unregisteredCount?: number;
  lowStockCount?: number;
  userSession?: UserSession | null;
  companyProfile?: CompanyProfile | null;
  activeBranch?: BranchUnit;
  onOpenTrocaFilial?: () => void;
  onOpenLogin?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
  unregisteredCount = 0,
  lowStockCount = 0,
  userSession,
  companyProfile,
  activeBranch,
  onOpenTrocaFilial,
  onOpenLogin,
  isCollapsed: externalIsCollapsed,
  onToggleCollapse: externalOnToggleCollapse,
}) => {
  const isCollapsed = externalIsCollapsed !== undefined ? externalIsCollapsed : false;
  // Primary items matching standard navigation with Início and Consulta de Peças
  const primaryNavItems = [
    {
      id: 'dashboard',
      label: 'Início',
      icon: Home,
      aliases: ['dashboard', 'home', 'inicio'],
    },
    {
      id: 'consulta-pecas',
      label: 'Consulta de Peças',
      icon: Search,
      aliases: ['consulta-pecas', 'consulta-aplicacao'],
    },
    {
      id: 'estoque',
      label: 'Estoque',
      icon: Boxes,
      badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
      aliases: ['estoque'],
    },
    {
      id: 'cotacao',
      label: 'Vendas',
      icon: ClipboardList,
      aliases: ['cotacao', 'nfe-venda'],
    },
    {
      id: 'caixa',
      label: 'Caixa',
      icon: Wallet,
      aliases: ['caixa', 'pdv', 'caixa-pdv'],
    },
    {
      id: 'orcamentos',
      label: 'Orçamentos',
      icon: FileText,
      aliases: ['orcamentos', 'clientes-orcamentos'],
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: Users,
      aliases: ['clientes'],
    },
    {
      id: 'leads-marketing',
      label: 'Marketing & WhatsApp',
      icon: MessageSquareShare,
      aliases: ['leads-marketing', 'marketing', 'leads'],
    },
    {
      id: 'fornecedores',
      label: 'Fornecedores',
      icon: Building2,
      aliases: ['fornecedores'],
    },
    {
      id: 'conectores',
      label: 'Conectores & Integrações',
      icon: Cable,
      aliases: ['conectores', 'marketplaces', 'ecommerce', 'integracoes'],
    },
    {
      id: 'relatorios',
      label: 'Relatórios',
      icon: TrendingUp,
      aliases: ['relatorios', 'financeiro'],
    },
    {
      id: 'admin',
      label: 'Admin Impostos (/admin)',
      icon: ShieldCheck,
      aliases: ['admin', 'admin-impostos', 'impostos', 'tributos'],
      badge: 'RFB',
    },
    {
      id: 'rbac',
      label: 'Governança & RBAC',
      icon: Shield,
      aliases: ['rbac', 'admin-rbac', 'governanca', 'tenants', 'acesso', 'acessos', 'seguranca'],
      badge: 'Multi-Tenant',
    },
    {
      id: 'financeiro-saas',
      label: 'Financeiro SaaS',
      icon: DollarSign,
      aliases: ['financeiro-saas', 'contratos', 'contrato', 'mrr', 'churn', 'assinaturas-saas'],
      badge: 'MRR',
    },
    {
      id: 'banco-dados',
      label: 'Banco de Dados',
      icon: Database,
      aliases: ['banco-dados', 'database', 'credenciais'],
      badge: 'DB',
    },
    {
      id: 'camadas-acesso',
      label: 'Camadas de Acesso',
      icon: Layers,
      aliases: ['camadas-acesso', 'camadas', 'camada', 'acessos', 'permissoes'],
      badge: 'RBAC',
    },
    {
      id: 'equipe-acessos',
      label: 'Equipe & Acessos',
      icon: Users,
      aliases: ['equipe-acessos', 'equipe', 'acesso', 'acessos', 'usuarios', 'permissoes-equipe'],
      // Só o admin do tenant define acessos da própria equipe. Não é view
      // restrita (não exige senha master) — ver RESTRICTED_VIEWS.
      tenantAdminOnly: true,
    },
    {
      id: 'chaves',
      label: 'Chaves & Integrações',
      icon: KeyRound,
      aliases: ['chaves', 'chaves-integracoes', 'api', 'licenca', 'integracao'],
    },
    {
      id: 'certificados',
      label: 'Certificados Digitais (A1/A3)',
      icon: FolderLock,
      aliases: ['certificados', 'certificados-digitais', 'pasta-certificados', 'certificado', 'a1', 'a3'],
      badge: 'Cofre',
    },
    {
      id: 'configuracoes',
      label: 'Configurações',
      icon: Settings,
      aliases: ['configuracoes', 'empresa-filiais'],
    },
    {
      id: 'assinatura',
      label: 'Assinatura & Contratos',
      icon: CreditCard,
      aliases: ['assinatura', 'contratos', 'contrato', 'faturas', 'meu-plano'],
    },
  ];

  // Secondary quick utilities
  const secondaryNavItems = [
    {
      id: 'xml-import',
      label: 'Baixar NF-e / XML',
      icon: FileDown,
      badge: unregisteredCount > 0 ? `${unregisteredCount}` : undefined,
    },
    {
      id: 'ordem-servico',
      label: 'Ordem de Serviço (OS)',
      icon: Wrench,
    },
  ];

  const handleSelect = (viewId: string) => {
    onSelectView(viewId);
    onCloseMobile();
  };

  const isSaas = !!userSession?.isSaasScope;

  const saasNavItems = [
    {
      id: 'saas-dashboard',
      label: 'Painel Central SaaS',
      icon: Home,
      aliases: ['saas-dashboard', 'dashboard', 'home', 'inicio'],
      badge: 'Camada 1',
    },
    {
      id: 'planos-pacotes',
      label: 'Pacotes & Planos (Valores & Cotas)',
      icon: Package,
      aliases: ['planos-pacotes', 'pacotes', 'planos', 'precos', 'cotas'],
      badge: 'Super Admin',
    },
    {
      id: 'financeiro-saas',
      label: 'Contratos & Assinaturas SaaS',
      icon: DollarSign,
      aliases: ['financeiro-saas', 'contratos', 'contrato', 'mrr', 'churn', 'assinaturas-saas'],
      badge: 'MRR',
    },
    {
      id: 'rbac',
      label: 'Empresas & Clientes (Tenants)',
      icon: Shield,
      aliases: ['rbac', 'admin-rbac', 'governanca', 'tenants', 'acesso', 'acessos', 'seguranca'],
      badge: 'Clientes',
    },
    {
      id: 'camadas-acesso',
      label: 'Camadas de Acesso (RBAC)',
      icon: Layers,
      aliases: ['camadas-acesso', 'camadas', 'camada', 'acessos', 'permissoes'],
      badge: '3 Camadas',
    },
    {
      id: 'chaves',
      label: 'Chaves & Licenças de Máquina',
      icon: KeyRound,
      aliases: ['chaves', 'chaves-integracoes', 'api', 'licenca', 'integracao'],
      badge: 'Licenças',
    },
    {
      id: 'certificados',
      label: 'Pastas de Certificados A1 & A3',
      icon: FolderLock,
      aliases: ['certificados', 'certificados-digitais', 'pasta-certificados', 'certificado', 'a1', 'a3'],
      badge: 'Cofres',
    },
    {
      id: 'conectores',
      label: 'Conectores do SaaS (Infra & Billing)',
      icon: Cable,
      aliases: ['conectores', 'marketplaces', 'ecommerce', 'integracoes'],
      badge: 'Camada 1',
    },
    {
      id: 'admin',
      label: 'Admin Fiscal Global',
      icon: ShieldCheck,
      aliases: ['admin', 'admin-impostos', 'impostos', 'tributos'],
      badge: 'RFB',
    },
    {
      id: 'banco-dados',
      label: 'Banco de Dados & Infra',
      icon: Database,
      aliases: ['banco-dados', 'database', 'credenciais'],
      badge: 'DB',
    },
  ];

  // Oculta itens restritos (Admin Impostos / Governança) de quem não é admin.
  // Sem admin: os campos nem ficam visíveis.
  const adminVisible = isElevatedAdmin(userSession);
  const visiblePrimaryNavItems = isSaas
    ? saasNavItems
    : primaryNavItems.filter((item) => {
        // Camadas de Acesso é explicativa da arquitetura multi-tenant de 3 camadas
        if (item.id === 'camadas-acesso') {
          return adminVisible || userSession?.roleCode === 'tenant_admin' || userSession?.role === 'gerente' || userSession?.role === 'admin';
        }
        // Telas de infra e governança exclusiva da Camada 1
        if (['financeiro-saas', 'banco-dados'].includes(item.id)) return false;
        if (['admin', 'rbac'].includes(item.id)) return adminVisible;
        // Telas administrativas do tenant só aparecem para admins elevados.
        if (!adminVisible && RESTRICTED_VIEWS.includes(item.id)) return false;
        // Itens exclusivos do admin do tenant (gestão da própria equipe).
        if (item.tenantAdminOnly && userSession?.roleCode !== 'tenant_admin' && !adminVisible) return false;
        // Demais itens seguem a permissão RBAC do papel (camada de acesso).
        return isMenuVisible(item.id, userSession);
      });
  const visibleSecondaryNavItems = isSaas
    ? []
    : secondaryNavItems.filter((item) => isMenuVisible(item.id, userSession));

  const isItemActive = (item: typeof primaryNavItems[0]) => {
    if (currentView === item.id) return true;
    if (item.aliases && item.aliases.includes(currentView)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-slate-950/70 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Navigation Drawer — Estilo Whale Loans Minimalist Monochrome (#F6F6F5 + #14151B) */}
      <aside 
        id="gato-sidebar"
        className={`fixed lg:sticky top-0 lg:top-20 left-0 z-50 lg:z-10 h-full lg:h-[calc(100vh-6.5rem)] bg-[#F6F6F5] text-[#14151B] flex flex-col border border-[#EBEBEA] transition-all duration-300 ease-in-out lg:rounded-2xl overflow-hidden ${
          isOpenMobile ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-64'}`}
      >
        {/* Sidebar Brand Header */}
        <div className={`px-4 py-4 flex items-center shrink-0 border-b border-[#EBEBEA] bg-[#F6F6F5] transition-all ${
          isCollapsed ? 'flex-col justify-center gap-2' : 'justify-between'
        }`}>
          <div 
            className="cursor-pointer overflow-hidden flex items-center transition-transform hover:scale-[1.01]" 
            onClick={() => handleSelect('dashboard')}
            title="GATO Auto Peças - Início"
          >
            <GatoBrand 
              size="md" 
              showSubtitle={!isCollapsed} 
              iconOnly={isCollapsed} 
              variant="light"
              customLogoUrl={companyProfile?.logoUrl}
              tradeName={companyProfile?.tradeName}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {externalOnToggleCollapse && (
              <button
                type="button"
                onClick={externalOnToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-[#52525B] hover:text-[#14151B] bg-white hover:bg-[#EBEBEA] border border-[#E4E4E7] cursor-pointer transition-colors"
                title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed
                  ? <ChevronRight className="w-4 h-4" />
                  : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
            {/* Mobile close button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-[#52525B] hover:text-[#14151B] bg-white hover:bg-[#EBEBEA] border border-[#E4E4E7] cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Primary Navigation Links — Minimalist Line Icons & Clean Typography (Whale Loans Style) */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-1 custom-scrollbar">
          {visiblePrimaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item);

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleSelect(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full text-left flex items-center rounded-xl text-[13px] transition-all duration-150 cursor-pointer relative group ${
                  isCollapsed ? 'lg:justify-center lg:p-2.5' : 'justify-between px-3.5 py-2.5'
                } ${
                  isActive 
                    ? 'bg-white text-[#14151B] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E4E4E7]' 
                    : 'text-[#52525B] font-medium hover:bg-[#EEEEEC] hover:text-[#14151B] border border-transparent'
                }`}
              >
                <div className={`flex items-center min-w-0 ${isCollapsed ? 'lg:justify-center' : 'gap-3'}`}>
                  <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-[#14151B] stroke-[2.2]' : 'text-[#52525B] group-hover:text-[#14151B] stroke-[1.75]'
                  }`} />
                  <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`${isCollapsed ? 'hidden lg:inline-flex' : 'inline-flex'} text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-[#14151B] text-white'
                      : 'bg-[#E4E4E7] text-[#14151B]'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {/* Collapsed dot badge indicator */}
                {isCollapsed && item.badge && (
                  <span className="hidden lg:block absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#14151B] ring-2 ring-[#F6F6F5]" />
                )}
              </button>
            );
          })}

          {/* Quick utility divider */}
          <div className="pt-2 pb-1 px-2">
            <div className="h-px bg-[#E4E4E7]" />
          </div>

          {visibleSecondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleSelect(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full text-left flex items-center rounded-xl text-xs transition-all duration-150 cursor-pointer relative group ${
                  isCollapsed ? 'lg:justify-center lg:p-2' : 'justify-between px-3.5 py-2'
                } ${
                  isActive 
                    ? 'bg-white text-[#14151B] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#E4E4E7]' 
                    : 'text-[#52525B] font-medium hover:bg-[#EEEEEC] hover:text-[#14151B] border border-transparent'
                }`}
              >
                <div className={`flex items-center min-w-0 ${isCollapsed ? 'lg:justify-center' : 'gap-3'}`}>
                  <Icon className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#14151B] stroke-[2.2]' : 'text-[#52525B] group-hover:text-[#14151B] stroke-[1.75]'
                  }`} />
                  <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`${isCollapsed ? 'hidden lg:inline-flex' : 'inline-flex'} text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    isActive ? 'bg-[#14151B] text-white' : 'bg-[#E4E4E7] text-[#14151B]'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge && (
                  <span className="hidden lg:block absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#14151B] ring-2 ring-[#F6F6F5]" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Status Footer (Whale Loans Minimal Footer Style) */}
        <div className="p-3 border-t border-[#EBEBEA] bg-[#F6F6F5] text-xs space-y-2">
          {onOpenLogin && (
            <button
              type="button"
              id="sidebar-btn-login"
              onClick={onOpenLogin}
              className={`w-full p-2.5 rounded-xl flex items-center transition-all duration-150 cursor-pointer ${
                isCollapsed ? 'justify-center' : 'justify-between'
              } bg-white hover:bg-[#14151B] hover:text-white border border-[#E4E4E7] text-[#14151B] group`}
              title={userSession ? `Sessão ativa: ${userSession.name} (${userSession.roleLabel}) — Trocar Usuário` : 'Fazer Login / Acessar as 3 Camadas'}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[#F4F4F5] text-[#14151B] group-hover:bg-white/15 group-hover:text-white">
                  <LogIn className="w-3.5 h-3.5" />
                </div>
                {!isCollapsed && (
                  <div className="truncate text-left">
                    <p className="font-bold text-xs text-[#14151B] group-hover:text-white truncate">
                      {userSession ? userSession.name.split(' ')[0] : 'Conectar Conta'}
                    </p>
                    <p className="text-[10px] text-[#71717A] group-hover:text-white/80 truncate">
                      {userSession ? userSession.roleLabel : 'Acessar 3 Camadas'}
                    </p>
                  </div>
                )}
              </div>
              {!isCollapsed && <ChevronRight className="w-3.5 h-3.5 text-[#71717A] group-hover:text-white shrink-0" />}
            </button>
          )}

          {!isCollapsed ? (
            <div className="flex items-center justify-between px-1.5 pt-1 text-[11px] text-[#52525B] font-semibold">
              <span className="flex items-center gap-1.5 text-[#14151B]">
                <span>✓ SEFAZ Verified</span>
              </span>
              <span className="text-[#71717A]">✓ GATO v2.6</span>
            </div>
          ) : (
            <div className="flex justify-center py-1" title="SEFAZ Verified • v2.6">
              <span className="w-2 h-2 rounded-full bg-[#14151B]" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
