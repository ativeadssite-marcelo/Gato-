import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  ShieldCheck, 
  Store, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  Info,
  Menu,
  Download,
  Database,
  User,
  LogOut,
  Building2,
  ChevronDown,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  ShoppingCart,
  KeyRound,
  Camera
} from 'lucide-react';
import { GatoBrand } from './GatoBrand';
import { PushNotification, UserSession, CompanyProfile } from '../types';
import { INITIAL_BRANCHES } from '../data/initialData';
import { apiFetch } from '../services/apiClient';
import marceloAvatar from '../assets/images/marcelo_avatar_1789396180527.jpg';

interface HeaderProps {
  notifications: PushNotification[];
  onMarkNotificationRead: (id: string) => void;
  onOpenQuickQuote: () => void;
  onToggleMobileMenu: () => void;
  activeStore: string;
  onChangeStore: (store: string) => void;
  onNavigate: (view: string) => void;
  userSession: UserSession | null;
  companyProfile?: CompanyProfile | null;
  branches?: BranchUnit[];
  onOpenLogin: () => void;
  onOpenTrocaFilial: () => void;
  onLogout: () => void;
  onOpenChangePassword?: () => void;
  onOpenEditProfilePhoto?: () => void;
  globalSearchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  notifications,
  onMarkNotificationRead,
  onOpenQuickQuote,
  onToggleMobileMenu,
  activeStore,
  onChangeStore,
  onNavigate,
  userSession,
  companyProfile,
  branches,
  onOpenLogin,
  onOpenTrocaFilial,
  onLogout,
  onOpenChangePassword,
  onOpenEditProfilePhoto,
}) => {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  const [dbStatus, setDbStatus] = useState<{ connected: boolean; latencyMs?: number; projectRef?: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {
      console.warn('Fullscreen error:', e);
    }
  };

  const fallbackHeaderBranch: BranchUnit = {
    id: userSession?.branchId || '',
    name: userSession?.branchName || 'Sede / Matriz Principal',
    cdCode: userSession?.cdCode || 'CD-01',
    cdName: userSession?.cdName || 'Centro de Distribuição Principal',
    uf: userSession?.branchUf || 'SP',
    city: 'São Paulo',
    cnpj: '',
    ie: '',
    address: '',
    sefazCode: '35',
    isMatriz: true,
    icmsInterno: 18,
    status: 'ativa',
  };

  const activeBranch: BranchUnit =
    (branches && branches.find(b => b.id === activeStore)) ||
    branches?.[0] ||
    fallbackHeaderBranch;

  useEffect(() => {
    apiFetch('/api/db/status')
      .then(res => res.json())
      .then(data => {
        setDbStatus({
          connected: !!data.connected,
          latencyMs: data.latencyMs,
          projectRef: data.projectRef || 'tfyocjdozttclxgipexu',
        });
      })
      .catch(() => {
        setDbStatus({ connected: false });
      });
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#EBEBEA]" id="gato-app-header">
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-10 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle, Brand & Whale Loans Style Ticker */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            id="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg bg-[#F4F4F3] border border-[#E5E5E4] text-[#14151B] hover:bg-[#E7E7E6] transition"
            aria-label="Abrir Menu"
          >
            <Menu className="w-5 h-5 text-[#14151B]" />
          </button>

          <div className="cursor-pointer lg:hidden" onClick={() => onNavigate('dashboard')}>
            <GatoBrand 
              size="md" 
              variant="light"
              showSubtitle={false} 
              customLogoUrl={companyProfile?.logoUrl}
              tradeName={companyProfile?.tradeName}
            />
          </div>

          {/* Whale Loans Left Ticker Pill (e.g. "⊙ 1 HUMP = $3.43") */}
          <button
            type="button"
            id="header-company-trade-name-btn"
            onClick={() => onNavigate('empresa-filiais')}
            className="flex items-center gap-2 text-xs font-semibold text-[#14151B] hover:opacity-80 transition cursor-pointer"
            title="Clique para gerenciar dados da Empresa & Filiais"
          >
            <span className="w-5 h-5 rounded-full border border-[#14151B] flex items-center justify-center text-[10px] font-bold text-[#14151B] shrink-0">
              ⊙
            </span>
            <span className="truncate max-w-[180px] sm:max-w-[280px] tracking-tight">
              {companyProfile?.tradeName || 'GATO SaaS'} = <span className="font-bold">{activeBranch.isMatriz ? 'Matriz Ativa' : activeBranch.name}</span>
            </span>
            {companyProfile?.isTrial && (
              <span className="text-[10px] font-bold bg-[#14151B] text-white px-2 py-0.5 rounded-md">
                {companyProfile.trialDaysRemaining}d Trial
              </span>
            )}
          </button>
        </div>

        {/* Right: Whale Loans "Connect Wallet" Solid Obsidian Button + Square Icon Button */}
        <div className="flex items-center space-x-2.5">
          {/* Branch Switcher (Clean Monochrome Pill) */}
          <button
            type="button"
            id="header-branch-cd-selector"
            onClick={onOpenTrocaFilial}
            className="hidden sm:flex items-center gap-1.5 py-2 px-3.5 rounded-lg bg-[#F4F4F3] hover:bg-[#E7E7E6] border border-[#E5E5E4] text-[#14151B] transition cursor-pointer text-xs font-semibold"
            title="Alternar Loja / Filial"
          >
            <Store className="w-3.5 h-3.5 text-[#14151B] shrink-0" />
            <span>
              {activeBranch.isMatriz ? 'Loja Matriz' : activeBranch.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
          </button>

          {/* Primary Solid Obsidian Action Button (Matches "Connect Wallet" in reference) */}
          <div className="relative flex items-center gap-2" ref={userMenuRef}>
            {!userSession ? (
              <button
                type="button"
                id="header-btn-direct-login"
                onClick={onOpenLogin}
                className="px-5 py-2 rounded-lg bg-[#14151B] hover:bg-[#272935] text-white font-semibold text-xs transition flex items-center gap-2 cursor-pointer"
                title="Acessar Sistema com Senha / 3 Camadas"
              >
                <span>Conectar Conta</span>
              </button>
            ) : (
              <button
                type="button"
                id="header-user-session-btn"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="px-4 py-2 rounded-lg bg-[#14151B] hover:bg-[#272935] text-white font-semibold text-xs transition flex items-center gap-2 cursor-pointer"
                title={`${userSession.name} (${userSession.roleLabel})`}
              >
                <span className="w-2 h-2 rounded-full bg-[#DDF2E8] shrink-0" />
                <span className="font-mono tracking-tight">
                  {userSession.name?.split(' ')[0] || 'Admin'} • {userSession.roleLabel?.split(' ')[0] || 'SaaS'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
              </button>
            )}

            {/* Dropdown Menu when clicked */}
            {showUserMenu && userSession && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-[#EBEBEF] p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Identity Header */}
                <div className="p-2.5 bg-[#F6F6F5] rounded-lg border border-[#EBEBEA] flex items-center gap-3 mb-2">
                  <div className="relative group/menuavatar shrink-0">
                    {userSession.avatarUrl ? (
                      <img 
                        src={userSession.avatarUrl} 
                        alt={userSession.name} 
                        className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm ring-2 ring-sky-500/30"
                      />
                    ) : (
                      <div className="w-11 h-11 bg-[#0C4A6E] rounded-full flex items-center justify-center text-white font-black text-sm border-2 border-white shadow-sm">
                        {userSession.avatarInitials}
                      </div>
                    )}
                    {onOpenEditProfilePhoto && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenEditProfilePhoto();
                        }}
                        className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-orange-600 hover:bg-orange-700 text-white rounded-full flex items-center justify-center shadow-md transition cursor-pointer"
                        title="Trocar Foto do Perfil"
                      >
                        <Camera className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-slate-900 truncate">{userSession.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{userSession.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-[#0284C7] text-white rounded">
                        {userSession.roleLabel}
                      </span>
                      {onOpenEditProfilePhoto && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            onOpenEditProfilePhoto();
                          }}
                          className="text-[10px] text-orange-600 hover:text-orange-700 font-bold hover:underline cursor-pointer"
                        >
                          Trocar foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Profile Details */}
                {companyProfile && (
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 mb-2 text-xs">
                    <div className="flex items-center justify-between text-[10px] text-amber-900 font-bold uppercase">
                      <span className="flex items-center gap-1">
                        <Store className="w-3 h-3 text-amber-600" />
                        Empresa Fantasia:
                      </span>
                      {companyProfile.isTrial && (
                        <span className="bg-amber-400 text-slate-950 px-1 rounded font-black">{companyProfile.trialDaysRemaining}d Teste</span>
                      )}
                    </div>
                    <p className="font-black text-slate-900 text-xs truncate mt-0.5">{companyProfile.tradeName}</p>
                    <p className="text-[10px] text-slate-500 truncate">{companyProfile.corporateName}</p>
                  </div>
                )}

                {userSession.isSaasScope ? (
                  <div className="px-2.5 py-2 bg-[#F0F0F0] text-[#111111] rounded-xl mb-2 text-xs space-y-1 border border-[#D4D4D4]">
                    <div className="flex items-center justify-between text-[10px] text-[#262626] font-bold uppercase">
                      <span>Plataforma SaaS Central:</span>
                      <span className="bg-[#262626] text-white px-1.5 py-0.5 rounded font-black">Camada 1</span>
                    </div>
                    <p className="font-bold text-[#111111] text-xs truncate">Super Admin — Gestão Global</p>
                    <p className="text-[10px] text-[#333333] pt-0.5">Gerencia contratos, planos e clientes. Dados operacionais e senhas isolados.</p>
                  </div>
                ) : (
                  /* Active CD Details */
                  <div className="px-2.5 py-2 bg-[#F0F0F0] text-[#111111] rounded-xl mb-2 text-xs space-y-1 border border-[#D4D4D4]">
                    <div className="flex items-center justify-between text-[10px] text-[#262626] font-bold uppercase">
                      <span>CD de Venda Ativo:</span>
                      <span className="bg-[#262626] text-white px-1.5 py-0.5 rounded">{activeBranch.uf}</span>
                    </div>
                    <p className="font-bold text-[#111111] text-xs truncate">{activeBranch.name}</p>
                    <div className="flex items-center justify-between text-[10px] text-[#333333] pt-0.5">
                      <span>SEFAZ-{activeBranch.uf}</span>
                      <span className="text-emerald-800 font-bold">ICMS Interno: {activeBranch.icmsInterno}%</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-1 text-xs">
                  {!userSession.isSaasScope && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenTrocaFilial();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-sky-50 hover:text-[#0C4A6E] font-bold flex items-center gap-2 transition cursor-pointer"
                    >
                      <Building2 className="w-4 h-4 text-[#0284C7]" />
                      <span>Alternar Filial / Estado do CD</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('empresa-filiais');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-amber-50 hover:text-amber-900 font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Store className="w-4 h-4 text-amber-600" />
                    <span>Gerenciar Empresa & Filiais</span>
                  </button>

                  <button
                    type="button"
                    id="header-user-menu-download-logo-btn"
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('empresa-filiais');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-sky-50 hover:text-sky-900 font-bold flex items-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-sky-600" />
                    <span>Baixar Logo & Personalização</span>
                  </button>

                  {onOpenEditProfilePhoto && (
                    <button
                      type="button"
                      id="header-user-menu-change-photo-btn"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenEditProfilePhoto();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-orange-50 hover:text-orange-900 font-bold flex items-center gap-2 transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-orange-600" />
                      <span>Trocar Foto do Perfil</span>
                    </button>
                  )}
                  {onOpenChangePassword && (
                    <button
                      type="button"
                      id="header-user-menu-change-pw-btn"
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenChangePassword();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-sky-50 hover:text-sky-900 font-bold flex items-center gap-2 transition cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-amber-500" />
                      <span>Alterar Minha Senha</span>
                    </button>
                  )}

                  <button
                    type="button"
                    id="header-user-menu-login-btn"
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenLogin();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-medium flex items-center gap-2 transition cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Trocar Usuário / Página de Login</span>
                  </button>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        onLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 font-bold flex items-center gap-2 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Encerrar Sessão (Sair)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Whale Loans Right Square Soft-Gray Icon Button (Notifications) */}
          <div className="relative">
            <button
              type="button"
              id="notifications-toggle-btn"
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-lg bg-[#F4F4F3] hover:bg-[#E7E7E6] border border-[#E5E5E4] text-[#14151B] transition focus:outline-none cursor-pointer"
              aria-label="Notificações"
            >
              <Bell className="w-4 h-4 text-[#14151B]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#14151B] rounded-full ring-2 ring-white" />
              )}
            </button>

            {showNotifs && (
              <div 
                id="notifications-dropdown-menu"
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#EBEBEF] p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#F1F1F3]">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-[#14151B]" />
                    <span className="text-xs font-bold text-[#14151B]">Avisos e Notificações</span>
                  </div>
                  <span className="text-[11px] text-[#71717A] font-medium">
                    {unreadCount} pendente{unreadCount === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#F1F1F3] my-1">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`py-2.5 px-2 flex items-start gap-2.5 transition rounded-lg ${notif.read ? 'opacity-60 bg-transparent' : 'bg-[#F6F6F5]'}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        <Info className="w-4 h-4 text-[#14151B]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#14151B] truncate">{notif.title}</p>
                          <span className="text-[10px] text-[#71717A] whitespace-nowrap">{notif.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-[#71717A] mt-0.5 leading-snug">{notif.message}</p>
                        {!notif.read && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationRead(notif.id)}
                            className="text-[10px] font-semibold text-[#14151B] hover:underline mt-1"
                          >
                            Marcar como lida
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#F1F1F3] flex items-center justify-between text-[11px]">
                  <button 
                    type="button" 
                    onClick={() => notifications.forEach(n => onMarkNotificationRead(n.id))}
                    className="text-[#14151B] hover:underline font-semibold"
                  >
                    Limpar todas
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setShowNotifs(false); onNavigate('configuracoes'); }}
                    className="text-[#71717A] hover:text-[#14151B]"
                  >
                    Configurar alertas
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

