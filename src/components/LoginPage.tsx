import React, { useState } from 'react';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  AlertCircle, 
  ArrowRight,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import gatoLogoNova from '../assets/images/gato_logo_2026.png';
import { BranchUnit, UserSession, CompanyProfile } from '../types';
import { INITIAL_BRANCHES, AVAILABLE_USERS, AppUser } from '../data/initialData';
import { loginWithCredentials, getDemoLoginConfig } from '../utils/sessionService';

interface LoginPageProps {
  currentSession: UserSession | null;
  companyProfile?: CompanyProfile | null;
  branches?: BranchUnit[];
  onLoginSuccess: (session: UserSession, newCompany?: CompanyProfile) => void;
  onBackToApp?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  currentSession,
  branches,
  onLoginSuccess,
}) => {
  const availableBranches = branches && branches.length > 0 ? branches : INITIAL_BRANCHES;

  const [selectedUser] = useState<AppUser>(
    AVAILABLE_USERS.find(u => u.id === currentSession?.id) || AVAILABLE_USERS[0]
  );
  const [emailLogin, setEmailLogin] = useState('contato.ativeads@gmail.com');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    currentSession?.branchId || selectedUser.defaultBranchId || 'matriz-ms'
  );

  // Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeBranch = availableBranches.find(b => b.id === selectedBranchId) || availableBranches[0];

  // Executa o login direto com credenciais especificadas
  const executeLogin = async (emailToUse: string, passwordToUse: string, branchIdToUse?: string) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const targetBranchId = branchIdToUse || activeBranch.id;
      const result = await loginWithCredentials(
        emailToUse.trim(),
        passwordToUse,
        availableBranches,
        targetBranchId
      );

      try {
        localStorage.setItem('gato_user_session', JSON.stringify(result.session));
        localStorage.setItem('gato_active_store', result.session.branchId);
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }

      setIsLoading(false);
      onLoginSuccess(result.session);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Falha no login. Verifique suas credenciais.');
    }
  };

  const handleLoginExisting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailLogin.trim() || !passwordLogin.trim()) {
      setErrorMessage('Informe seu e-mail e senha corporativos.');
      return;
    }
    void executeLogin(emailLogin, passwordLogin);
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-['Plus_Jakarta_Sans'] selection:bg-[#0284C7] selection:text-white px-4 py-8" 
      id="gato-login-page"
    >
      {/* LOGO OFICIAL GATO */}
      <img 
        src={gatoLogoNova} 
        alt="GATO - Gestão de Estoque e Balcão" 
        className="w-full max-w-sm rounded-3xl border border-amber-500/30 shadow-[0_0_50px_-15px_rgba(249,115,22,0.4)] mb-6"
        id="img-logo-login-gato"
        referrerPolicy="no-referrer"
      />

      <div className="w-full max-w-2xl space-y-4">
        {typeof window !== 'undefined' && (window.location.pathname.toLowerCase().includes('/admin') || window.location.pathname.toLowerCase().includes('/superadmin') || window.location.hash.toLowerCase().includes('admin')) && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-2xl p-3.5 flex items-center gap-3 text-amber-200 text-xs shadow-lg animate-in fade-in duration-200">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <strong className="text-amber-100 font-bold block">Rota de Acesso Administrativo (/admin)</strong>
              <span>Autentique-se como <strong>Super Admin</strong> (Dono do SaaS) ou <strong>Administrador</strong> para acessar o painel de governança e controle.</span>
            </div>
          </div>
        )}

        {/* GUIA DAS 3 CAMADAS DE ACESSO */}
        <div className="bg-slate-900/90 backdrop-blur border border-purple-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-black text-white uppercase tracking-wider">
                Acesso de Demonstração — Selecione uma das 3 Camadas
              </h2>
            </div>
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Acesso Seguro & Auditado
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* CAMADA 1: SUPER ADMIN */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-purple-950/60 to-slate-950 border border-purple-500/50 flex flex-col justify-between hover:border-purple-400 transition">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-black uppercase text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">
                    Camada 1
                  </span>
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                </div>
                <div className="font-extrabold text-white text-xs">Super Admin (Dono)</div>
                <p className="text-[10px] text-purple-200/80 mt-1 leading-snug">
                  Gerencia contratos de assinaturas, planos, liberação de acesso e suporte. Não recebe estoque ou financeiro de clientes.
                </p>
                <div className="text-[10px] text-slate-400 font-mono mt-2 truncate">
                  contato.ativeads@gmail.com
                </div>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  const demoCfg = getDemoLoginConfig();
                  setEmailLogin('contato.ativeads@gmail.com');
                  setPasswordLogin('');
                  void executeLogin('contato.ativeads@gmail.com', demoCfg.password);
                }}
                className="mt-3 w-full py-2 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-[11px] shadow-md shadow-purple-600/30 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>Entrar como Dono</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* CAMADA 2: EMPRESA / CLIENTE */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-sky-950/60 to-slate-950 border border-sky-500/40 flex flex-col justify-between hover:border-sky-400 transition">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-black uppercase text-sky-300 bg-sky-500/20 px-1.5 py-0.5 rounded">
                    Camada 2
                  </span>
                  <Building2 className="w-4 h-4 text-sky-400" />
                </div>
                <div className="font-extrabold text-white text-xs">Empresa (Quem Assina)</div>
                <p className="text-[10px] text-sky-200/80 mt-1 leading-snug">
                  Painel da empresa contratante: gerencia o produto, colaboradores, permissões da equipe e faturamento próprio da loja.
                </p>
                <div className="text-[10px] text-slate-400 font-mono mt-2 truncate">
                  admin@gatoautopecas.com.br
                </div>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  const demoCfg = getDemoLoginConfig();
                  setEmailLogin('admin@gatoautopecas.com.br');
                  setPasswordLogin('');
                  void executeLogin('admin@gatoautopecas.com.br', demoCfg.password, 'matriz-ms');
                }}
                className="mt-3 w-full py-2 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-[11px] shadow-md shadow-sky-600/30 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>Entrar como Empresa</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* CAMADA 3: USUÁRIOS / COLABORADORES */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-emerald-950/60 to-slate-950 border border-emerald-500/40 flex flex-col justify-between hover:border-emerald-400 transition">
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                    Camada 3
                  </span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="font-extrabold text-white text-xs">Colaborador (Operação)</div>
                <p className="text-[10px] text-emerald-200/80 mt-1 leading-snug">
                  Vendedor ou operador de caixa: opera no balcão e PDV conforme permissões concedidas pela empresa.
                </p>
                <div className="text-[10px] text-slate-400 font-mono mt-2 truncate">
                  vendedor@gatoautopecas.com.br
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    const demoCfg = getDemoLoginConfig();
                    setEmailLogin('vendedor@gatoautopecas.com.br');
                    setPasswordLogin('');
                    void executeLogin('vendedor@gatoautopecas.com.br', demoCfg.password, 'matriz-ms');
                  }}
                  className="py-2 px-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] shadow-md shadow-emerald-600/30 transition cursor-pointer text-center disabled:opacity-50"
                >
                  Vendedor
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    const demoCfg = getDemoLoginConfig();
                    setEmailLogin('caixa@gatoautopecas.com.br');
                    setPasswordLogin('');
                    void executeLogin('caixa@gatoautopecas.com.br', demoCfg.password, 'matriz-ms');
                  }}
                  className="py-2 px-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold text-[10px] shadow-md shadow-emerald-700/30 transition cursor-pointer text-center disabled:opacity-50"
                >
                  Caixa PDV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* CARD DO FORMULÁRIO MANUAL */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl">
          <form onSubmit={handleLoginExisting} className="space-y-4" id="form-login-cliente">
            {errorMessage && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400" id="alert-login-error">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="input-email-login" className="text-xs font-bold text-slate-300 block mb-1">
                  E-mail Corporativo
                </label>
                <input
                  type="email"
                  id="input-email-login"
                  value={emailLogin}
                  onChange={(e) => setEmailLogin(e.target.value)}
                  placeholder="seu.email@empresa.com.br"
                  required
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="input-password-login" className="text-xs font-bold text-slate-300 block">
                    Senha de Acesso
                  </label>
                  <span className="text-[10px] text-slate-400 font-semibold bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                    Protegido LGPD
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="input-password-login"
                    value={passwordLogin}
                    onChange={(e) => setPasswordLogin(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#0284C7] focus:border-transparent font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-login-existing"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-[#0284C7] hover:opacity-95 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-purple-600/25 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Autenticando sessão...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      <p className="text-[10px] text-slate-500 mt-6 tracking-wide uppercase text-center">
        GATO SaaS • Camada 1: Super Admin • Camada 2: Empresa • Camada 3: Colaboradores
      </p>
    </div>
  );
};
