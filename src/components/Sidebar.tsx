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

      {/* Navigation Drawer — Estilo Editorial Soft da Referência */}
      <aside 
        id="gato-sidebar"
        className={`fixed lg:sticky top-0 lg:top-20 left-0 z-50 lg:z-10 h-full lg:h-[calc(100vh-6.5rem)] bg-white text-[#1E232A] flex flex-col border border-[#EAECF0] shadow-[0_4px_20px_-2px_rgba(16,24,40,0.05)] transition-all duration-300 ease-in-out lg:rounded-3xl overflow-hidden ${
          isOpenMobile ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-64'}`}
      >
        {/* Sidebar Brand Header */}
        <div className={`p-3.5 flex items-center shrink-0 border-b border-[#F2F4F8] bg-white transition-all rounded-t-3xl ${
          isCollapsed ? 'flex-col justify-center gap-2' : 'justify-between'
        }`}>
          <div 
            className="cursor-pointer overflow-hidden flex items-center transition-transform hover:scale-[1.02]" 
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
                className="hidden lg:flex p-2 rounded-xl text-[#475467] hover:text-[#1E232A] bg-[#F6F7F9] hover:bg-[#EAECF0] border border-[#EAECF0] cursor-pointer transition-colors"
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
              className="lg:hidden p-2 rounded-xl text-[#475467] hover:text-[#1E232A] bg-[#F6F7F9] hover:bg-[#EAECF0] border border-[#EAECF0] cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Top Quick Pills (como no topo da Sidebar da imagem de referência: Mint + Coral) */}
        {!isCollapsed && activeBranch && (
          <div className="px-3.5 pt-2.5 pb-1 flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenTrocaFilial}
              className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-[#F4F6F9] hover:bg-[#EAECF0] transition cursor-pointer min-w-0 text-left"
              title="Trocar Filial / CD Ativo"
            >
              <span className="w-6 h-6 rounded-full bg-[#D1F4E0] text-[#216E4E] flex items-center justify-center shrink-0">
                <Store className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold text-[#1E232A] truncate">
                {activeBranch.name}
              </span>
            </button>
            <span className="px-2.5 py-1.5 rounded-xl bg-[#F97B72] text-white text-[10px] font-extrabold shrink-0 shadow-2xs">
              {activeBranch.uf}
            </span>
          </div>
        )}

        {/* Primary Navigation Links */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2.5 space-y-1 custom-scrollbar">
          {visiblePrimaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item);

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleSelect(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full text-left flex items-center rounded-2xl text-xs transition-all duration-200 cursor-pointer relative group ${
                  isCollapsed ? 'lg:justify-center lg:p-2.5' : 'justify-between px-3 py-2'
                } ${
                  isActive 
                    ? 'bg-[#F2F4F8] text-[#1E232A] font-extrabold' 
                    : 'text-[#344054] font-semibold hover:bg-[#F6F7F9] hover:text-[#1E232A]'
                }`}
              >
                <div className={`flex items-center min-w-0 ${isCollapsed ? 'lg:justify-center' : 'gap-3'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isActive
                      ? 'bg-[#F97B72] text-white shadow-xs'
                      : 'bg-[#F2F4F8] text-[#475467] group-hover:bg-[#E6E9EF] group-hover:text-[#1E232A]'
                  }`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  </span>
                  <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`${isCollapsed ? 'hidden lg:inline-flex' : 'inline-flex'} text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-[#F97B72] text-white'
                      : 'bg-[#F2F4F8] text-[#344054]'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {/* Collapsed dot badge indicator */}
                {isCollapsed && item.badge && (
                  <span className="hidden lg:block absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#F97B72] ring-2 ring-white shadow-xs" />
                )}
              </button>
            );
          })}

          {/* Quick utility divider */}
          <div className="pt-2 pb-1 px-2">
            <div className="h-px bg-[#EAECF0] rounded-full" />
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
                className={`w-full text-left flex items-center rounded-2xl text-xs transition-all duration-200 cursor-pointer relative group ${
                  isCollapsed ? 'lg:justify-center lg:p-2' : 'justify-between px-3 py-2'
                } ${
                  isActive 
                    ? 'bg-[#F2F4F8] text-[#1E232A] font-extrabold' 
                    : 'text-[#475467] font-semibold hover:bg-[#F6F7F9] hover:text-[#1E232A]'
                }`}
              >
                <div className={`flex items-center min-w-0 ${isCollapsed ? 'lg:justify-center' : 'gap-2.5'}`}>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isActive
                      ? 'bg-[#6E7BF2] text-white shadow-xs'
                      : 'bg-[#F2F4F8] text-[#475467] group-hover:bg-[#E6E9EF] group-hover:text-[#1E232A]'
                  }`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  </span>
                  <span className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`${isCollapsed ? 'hidden lg:inline-flex' : 'inline-flex'} text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF0FF] text-[#4A56C8]`}>
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge && (
                  <span className="hidden lg:block absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#6E7BF2] ring-2 ring-white shadow-xs" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Status Card (como o card inferior da Sidebar na referência) */}
        <div className="p-3 bg-white text-xs space-y-2 rounded-b-3xl">
          <div className="p-3 rounded-2xl bg-[#F6F7F9] border border-[#EAECF0] space-y-2">
            {/* Botão de Login / Trocar Conta */}
            {onOpenLogin && (
              <button
                type="button"
                id="sidebar-btn-login"
                onClick={onOpenLogin}
                className={`w-full p-2 rounded-xl flex items-center transition-all duration-200 cursor-pointer ${
                  isCollapsed ? 'justify-center' : 'justify-between'
                } bg-white hover:bg-[#EAECF0]/60 border border-[#EAECF0] text-[#1E232A] shadow-2xs`}
                title={userSession ? `Sessão ativa: ${userSession.name} (${userSession.roleLabel}) — Trocar Usuário` : 'Fazer Login / Acessar as 3 Camadas'}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[#F2F4F8] text-[#1E232A]">
                    <LogIn className="w-3.5 h-3.5" />
                  </div>
                  {!isCollapsed && (
                    <div className="truncate text-left">
                      <p className="font-extrabold text-xs text-[#1E232A] truncate">
                        {userSession ? userSession.name.split(' ')[0] : 'Fazer Login'}
                      </p>
                      <p className="text-[10px] font-medium text-[#475467] truncate">
                        {userSession ? userSession.roleLabel : 'Acessar 3 Camadas'}
                      </p>
                    </div>
                  )}
                </div>
                {!isCollapsed && <ChevronRight className="w-3.5 h-3.5 text-[#475467] shrink-0" />}
              </button>
            )}

            {!isCollapsed ? (
              <div className="flex items-center justify-between px-2 py-1 text-[11px] text-[#475467]">
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#529471] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#529471]"></span>
                  </span>
                  <span className="font-bold text-[#1E232A]">SEFAZ Online</span>
                </span>
                <span className="text-[#475467] font-semibold">v2.6 Web</span>
              </div>
            ) : (
              <div className="flex justify-center py-1" title="SEFAZ Online v2.6">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#529471] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#529471]"></span>
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
