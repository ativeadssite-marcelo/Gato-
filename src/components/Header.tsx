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
  ShoppingCart
} from 'lucide-react';
import { GatoBrand } from './GatoBrand';
import { PushNotification, UserSession, CompanyProfile } from '../types';
import { INITIAL_BRANCHES } from '../data/initialData';
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
  onOpenLogin: () => void;
  onOpenTrocaFilial: () => void;
  onLogout: () => void;
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
  onOpenLogin,
  onOpenTrocaFilial,
  onLogout,
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

  const activeBranch = INITIAL_BRANCHES.find(b => b.id === activeStore) || INITIAL_BRANCHES[0];

  useEffect(() => {
    fetch('/api/db/status')
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
    <header className="sticky top-0 z-30 bg-white border-b border-sky-100 shadow-xs" id="gato-app-header">
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-10 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="mobile-menu-btn"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-sky-50 transition"
            aria-label="Abrir Menu"
          >
            <Menu className="w-5 h-5 text-[#0C4A6E]" />
          </button>

          <div className="cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <GatoBrand size="md" showSubtitle={true} />
          </div>

          {/* Destaque do Nome Fantasia da Empresa Cadastrada */}
          {companyProfile && (
            <button
              type="button"
              id="header-company-trade-name-btn"
              onClick={() => onNavigate('empresa-filiais')}
              className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-slate-800 transition cursor-pointer text-left shadow-2xs group"
              title="Clique para gerenciar dados da Empresa & Filiais"
            >
              <div className="p-1 bg-amber-500 text-slate-950 rounded-md group-hover:scale-105 transition">
                <Store className="w-3 h-3" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900 truncate max-w-[150px] xl:max-w-[210px]">
                    {companyProfile.tradeName}
                  </span>
                  {companyProfile.isTrial && (
                    <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1 rounded uppercase shrink-0">
                      {companyProfile.trialDaysRemaining}d Teste
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 block truncate">
                  {companyProfile.segment || 'Autopeças'}
                </span>
              </div>
            </button>
          )}
        </div>

        {/* Right: Loja Matriz, Bell, and User Profile matching screenshot */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Loja Matriz: 🛒 Loja Matriz ▾ */}
          <button
            type="button"
            id="header-branch-cd-selector"
            onClick={onOpenTrocaFilial}
            className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl hover:bg-slate-100 text-slate-700 transition cursor-pointer text-xs font-semibold"
            title="Alternar Loja / Filial"
          >
            <ShoppingCart className="w-4 h-4 text-slate-700 shrink-0" />
            <span className="hidden sm:inline">
              {activeBranch.isMatriz ? 'Loja Matriz' : activeBranch.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </button>

          {/* Notifications Trigger */}
          <div className="relative">
            <button
              type="button"
              id="notifications-toggle-btn"
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition focus:outline-none cursor-pointer"
              aria-label="Notificações"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EA580C] rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifs && (
              <div 
                id="notifications-dropdown-menu"
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-sky-100 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-900">Avisos e Notificações Push</span>
                  </div>
                  <span className="text-[11px] text-sky-700 font-medium">
                    {unreadCount} pendente{unreadCount === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 my-1">
                  {notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`py-2.5 px-2 flex items-start gap-2.5 transition rounded-lg ${notif.read ? 'opacity-60 bg-transparent' : 'bg-sky-50/60'}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.type === 'critical' || notif.type === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : notif.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Info className="w-4 h-4 text-sky-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-900 truncate">{notif.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">{notif.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{notif.message}</p>
                        {!notif.read && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationRead(notif.id)}
                            className="text-[10px] font-semibold text-sky-700 hover:text-sky-900 mt-1"
                          >
                            Marcar como lida
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <button 
                    type="button" 
                    onClick={() => notifications.forEach(n => onMarkNotificationRead(n.id))}
                    className="text-sky-700 hover:underline font-medium"
                  >
                    Limpar todas
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setShowNotifs(false); onNavigate('configuracoes'); }}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Configurar alertas
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile matching screenshot */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              id="header-user-session-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-1 sm:pl-2 hover:opacity-90 transition cursor-pointer text-left"
            >
              <img 
                src={marceloAvatar} 
                alt="Marcelo" 
                className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0" 
              />
              <div className="hidden sm:block leading-tight text-left">
                <p className="text-xs font-bold text-slate-900 leading-tight">
                  {userSession?.name?.split(' ')[0] || 'Marcelo'}
                </p>
                <p className="text-[10px] text-slate-500 font-normal leading-tight">
                  {userSession?.roleLabel || 'Vendedor'}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {/* Dropdown Menu when clicked */}
            {showUserMenu && userSession && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Identity Header */}
                <div className="p-2.5 bg-sky-50/80 rounded-xl border border-sky-100 flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#0C4A6E] rounded-full flex items-center justify-center text-white font-black text-sm">
                    {userSession.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-slate-900 truncate">{userSession.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{userSession.email}</p>
                    <span className="inline-block mt-0.5 text-[9px] font-black uppercase px-1.5 py-0.2 bg-[#0284C7] text-white rounded">
                      {userSession.roleLabel}
                    </span>
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

                {/* Active CD Details */}
                <div className="px-2.5 py-2 bg-slate-900 text-white rounded-xl mb-2 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-sky-400 font-bold uppercase">
                    <span>CD de Venda Ativo:</span>
                    <span className="bg-sky-700/80 text-white px-1 rounded">{activeBranch.uf}</span>
                  </div>
                  <p className="font-bold text-white text-xs truncate">{activeBranch.name}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>SEFAZ-{activeBranch.uf}</span>
                    <span className="text-emerald-400 font-bold">ICMS Interno: {activeBranch.icmsInterno}%</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-1 text-xs">
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
                    onClick={() => {
                      setShowUserMenu(false);
                      onNavigate('login');
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-medium flex items-center gap-2 transition cursor-pointer"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Ir para Página de Login</span>
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

        </div>
      </div>
    </header>
  );
};

