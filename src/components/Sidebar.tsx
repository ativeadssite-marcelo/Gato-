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
  KeyRound
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
      label: 'Admin Impostos (/superadmin)',
      icon: ShieldCheck,
      aliases: ['admin', 'admin-impostos', 'impostos', 'tributos'],
      badge: 'RFB',
    },
    {
      id: 'rbac',
      label: 'Governança & RBAC',
      icon: Shield,
      aliases: ['rbac', 'admin-rbac', 'governanca', 'tenants', 'acesso', 'seguranca'],
      badge: 'Multi-Tenant',
    },
    {
      id: 'financeiro-saas',
      label: 'Financeiro SaaS',
      icon: DollarSign,
      aliases: ['financeiro-saas', 'mrr', 'churn'],
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
      aliases: ['camadas-acesso', 'acessos', 'permissoes'],
      badge: 'RBAC',
    },
    {
      id: 'equipe-acessos',
      label: 'Equipe & Acessos',
      icon: Users,
      aliases: ['equipe-acessos', 'equipe', 'acessos', 'usuarios', 'permissoes-equipe'],
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
      id: 'configuracoes',
      label: 'Configurações',
      icon: Settings,
      aliases: ['configuracoes', 'empresa-filiais'],
    },
    {
      id: 'assinatura',
      label: 'Assinatura & Faturas',
      icon: CreditCard,
      aliases: ['assinatura', 'faturas'],
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

  // Oculta itens restritos (Admin Impostos / Governança) de quem não é admin.
  // Sem admin: os campos nem ficam visíveis.
  const adminVisible = isElevatedAdmin(userSession);
  const visiblePrimaryNavItems = primaryNavItems.filter((item) => {
    // Telas administrativas só aparecem para admins elevados.
    if (!adminVisible && RESTRICTED_VIEWS.includes(item.id)) return false;
    // Itens exclusivos do admin do tenant (gestão da própria equipe).
    if (item.tenantAdminOnly && userSession?.roleCode !== 'tenant_admin') return false;
    // Demais itens seguem a permissão RBAC do papel (camada de acesso).
    return isMenuVisible(item.id, userSession);
  });
  const visibleSecondaryNavItems = secondaryNavItems.filter((item) => isMenuVisible(item.id, userSession));

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

      {/* Navigation Drawer */}
      <aside 
        id="gato-sidebar"
        className={`fixed lg:sticky top-0 lg:top-20 left-0 z-50 lg:z-10 h-full lg:h-[calc(100vh-6.5rem)] bg-slate-900/95 text-slate-200 flex flex-col border border-slate-800/80 shadow-2xl transition-all duration-300 ease-in-out lg:rounded-3xl overflow-hidden backdrop-blur-md ${
          isOpenMobile ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[76px]' : 'lg:w-64'}`}
      >
        {/* Sidebar Brand Header */}
        <div className={`p-4 flex items-center border-b border-slate-800/70 bg-gradient-to-b from-slate-900 to-slate-900/50 transition-all rounded-t-3xl ${
          isCollapsed ? 'justify-center' : 'justify-between'
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
              variant="dark"
              customLogoUrl={companyProfile?.logoUrl}
              tradeName={companyProfile?.tradeName}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Mobile close button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Primary Navigation Links */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-1.5 custom-scrollbar">
          {visiblePrimaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item);

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => handleSelect(item.id)}
                title={isCollapsed ? item.label : undefined}
                className={`w-full text-left flex items-center rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer relative ${
                  isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'
                } ${
                  isActive 
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg shadow-orange-600/25 font-semibold ring-1 ring-orange-400/30' 
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center' : 'gap-3.5'}`}>
                  <Icon className={`w-5 h-5 shrink-0 transition-transform ${isActive ? 'text-white scale-110' : 'text-slate-400'}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>

                {!isCollapsed && item.badge && (
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs ${
                    isActive ? 'bg-white text-[#EA580C]' : 'bg-[#EA580C] text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {/* Collapsed dot badge indicator */}
                {isCollapsed && item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#EA580C] ring-2 ring-slate-900 shadow-xs" />
                )}
              </button>
            );
          })}

          {/* Quick utility divider */}
          <div className="pt-2 pb-1 px-1">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-800 to-transparent rounded-full" />
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
                className={`w-full text-left flex items-center rounded-2xl text-xs font-medium transition-all duration-200 cursor-pointer relative ${
                  isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                } ${
                  isActive 
                    ? 'bg-slate-800 text-white font-semibold ring-1 ring-slate-700/60 shadow-xs' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }`}
              >
                <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                  <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-xs">
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-slate-900 shadow-xs" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Status matching Store & Operator */}
        <div className="p-3 border-t border-slate-800/70 bg-gradient-to-t from-slate-950 to-slate-900/60 text-xs space-y-2.5 rounded-b-3xl">
          {activeBranch && (
            <div 
              onClick={onOpenTrocaFilial}
              className={`p-2.5 bg-slate-900/80 hover:bg-slate-800/90 rounded-2xl border border-slate-800/80 hover:border-orange-500/40 flex items-center cursor-pointer transition-all duration-200 shadow-xs group ${
                isCollapsed ? 'justify-center' : 'justify-between'
              }`}
              title={isCollapsed ? `${activeBranch.name} (${activeBranch.uf}) - Trocar Loja` : 'Trocar Loja / CD Ativo'}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Store className="w-3.5 h-3.5 text-[#EA580C]" />
                </div>
                {!isCollapsed && (
                  <div className="truncate">
                    <p className="font-bold text-white text-xs truncate group-hover:text-orange-400 transition-colors">{activeBranch.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">SEFAZ {activeBranch.uf} • {activeBranch.cdCode}</p>
                  </div>
                )}
              </div>
              {!isCollapsed && <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />}
            </div>
          )}

          {!isCollapsed ? (
            <div className="flex items-center justify-between px-2 py-1 rounded-xl bg-slate-900/50 border border-slate-800/60 text-[11px] text-slate-400">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium text-slate-300">SEFAZ Online</span>
              </span>
              <span className="text-slate-400 font-medium">v2.6 Web</span>
            </div>
          ) : (
            <div className="flex justify-center py-1.5" title="SEFAZ Online v2.6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

